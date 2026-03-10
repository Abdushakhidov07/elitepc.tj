"""
Compatibility checking engine for the PC Configurator.

Checks all CompatibilityRule entries against a given PCConfiguration
and returns errors (hard constraints) and warnings (soft constraints).
"""

import logging
from decimal import Decimal

from apps.configurator.models import CompatibilityRule, ConfigurationItem
from apps.products.models import ProductSpecification

logger = logging.getLogger(__name__)

# Maps form-factor names to a size tier; smaller number = smaller board.
# A case that supports ATX also supports mATX and Mini-ITX, etc.
FORM_FACTOR_TIERS = {
    'Mini-ITX': 1,
    'mATX': 2,
    'Micro-ATX': 2,
    'ATX': 3,
    'E-ATX': 4,
}


def _get_spec_value(product, spec_name_query):
    """
    Return the specification value for *product* whose SpecificationName.name
    matches *spec_name_query* (case-insensitive).  Returns None when not found.
    """
    try:
        spec = ProductSpecification.objects.select_related('spec_name').get(
            product=product,
            spec_name__name__iexact=spec_name_query,
        )
        return spec.value
    except ProductSpecification.DoesNotExist:
        return None
    except ProductSpecification.MultipleObjectsReturned:
        # Shouldn't happen with unique_together, but be safe.
        spec = ProductSpecification.objects.select_related('spec_name').filter(
            product=product,
            spec_name__name__iexact=spec_name_query,
        ).first()
        return spec.value if spec else None


def _get_numeric_spec(product, spec_name_query, default=None):
    """Return a numeric specification value or *default*."""
    raw = _get_spec_value(product, spec_name_query)
    if raw is None:
        return default
    try:
        # Strip common suffixes such as " Вт", " мм", " ГБ"
        cleaned = raw.split()[0].replace(',', '.')
        return Decimal(cleaned)
    except Exception:
        return default


def _get_component(items, component_type):
    """Return the first product for a given component_type from the items queryset, or None."""
    item = items.filter(component_type=component_type).select_related('product').first()
    return item.product if item else None


def _get_component_item(items, component_type):
    """Return the ConfigurationItem for a given component_type, or None."""
    return items.filter(component_type=component_type).select_related('product').first()


# ---------------------------------------------------------------------------
# Individual rule checkers
# ---------------------------------------------------------------------------

def _check_socket_match(items, rule):
    """CPU socket must match motherboard socket."""
    cpu = _get_component(items, 'cpu')
    mobo = _get_component(items, 'motherboard')
    if not cpu or not mobo:
        return None  # Nothing to check yet

    cpu_socket = _get_spec_value(cpu, 'Сокет')
    mobo_socket = _get_spec_value(mobo, 'Сокет')

    if not cpu_socket or not mobo_socket:
        return None

    if cpu_socket.strip().lower() != mobo_socket.strip().lower():
        msg = rule.message_template or (
            f'Сокет процессора ({cpu_socket}) не совпадает '
            f'с сокетом материнской платы ({mobo_socket}).'
        )
        return msg
    return None


def _check_ram_type_match(items, rule):
    """RAM type (DDR4/DDR5) must match motherboard support."""
    ram = _get_component(items, 'ram')
    mobo = _get_component(items, 'motherboard')
    if not ram or not mobo:
        return None

    ram_type = _get_spec_value(ram, 'Тип')
    mobo_ram_type = _get_spec_value(mobo, 'Тип памяти')

    if not ram_type or not mobo_ram_type:
        return None

    if ram_type.strip().upper() not in mobo_ram_type.upper():
        msg = rule.message_template or (
            f'Тип оперативной памяти ({ram_type}) не поддерживается '
            f'материнской платой (поддержка: {mobo_ram_type}).'
        )
        return msg
    return None


def _check_ram_slots_limit(items, rule):
    """Number of RAM modules must not exceed motherboard slot count."""
    ram_item = _get_component_item(items, 'ram')
    mobo = _get_component(items, 'motherboard')
    if not ram_item or not mobo:
        return None

    mobo_slots = _get_numeric_spec(mobo, 'Кол-во слотов RAM')
    if mobo_slots is None:
        return None

    if ram_item.quantity > int(mobo_slots):
        msg = rule.message_template or (
            f'Количество модулей RAM ({ram_item.quantity}) превышает '
            f'количество слотов на материнской плате ({int(mobo_slots)}).'
        )
        return msg
    return None


def _check_form_factor_fit(items, rule):
    """Motherboard form-factor must fit in the selected case."""
    mobo = _get_component(items, 'motherboard')
    case = _get_component(items, 'case')
    if not mobo or not case:
        return None

    mobo_ff = _get_spec_value(mobo, 'Форм-фактор')
    case_ff = _get_spec_value(case, 'Форм-фактор поддержки')

    if not mobo_ff or not case_ff:
        return None

    mobo_tier = FORM_FACTOR_TIERS.get(mobo_ff.strip(), 0)
    # Case may support multiple form-factors (e.g. "ATX, mATX, Mini-ITX")
    max_case_tier = 0
    for ff_part in case_ff.split(','):
        tier = FORM_FACTOR_TIERS.get(ff_part.strip(), 0)
        if tier > max_case_tier:
            max_case_tier = tier

    if mobo_tier > max_case_tier and mobo_tier != 0 and max_case_tier != 0:
        msg = rule.message_template or (
            f'Форм-фактор материнской платы ({mobo_ff}) не помещается '
            f'в выбранный корпус (поддержка: {case_ff}).'
        )
        return msg
    return None


def _check_gpu_length_fit(items, rule):
    """GPU length must not exceed maximum supported by the case."""
    gpu = _get_component(items, 'gpu')
    case = _get_component(items, 'case')
    if not gpu or not case:
        return None

    gpu_length = _get_numeric_spec(gpu, 'Длина')
    case_max = _get_numeric_spec(case, 'Макс длина GPU')

    if gpu_length is None or case_max is None:
        return None

    if gpu_length > case_max:
        msg = rule.message_template or (
            f'Длина видеокарты ({gpu_length} мм) превышает максимально '
            f'допустимую длину GPU в корпусе ({case_max} мм).'
        )
        return msg
    return None


def _check_cooler_height_fit(items, rule):
    """Cooler height must not exceed maximum supported by the case."""
    cooler = _get_component(items, 'cooler')
    case = _get_component(items, 'case')
    if not cooler or not case:
        return None

    cooler_height = _get_numeric_spec(cooler, 'Высота')
    case_max = _get_numeric_spec(case, 'Макс высота кулера')

    if cooler_height is None or case_max is None:
        return None

    if cooler_height > case_max:
        msg = rule.message_template or (
            f'Высота кулера ({cooler_height} мм) превышает максимально '
            f'допустимую высоту в корпусе ({case_max} мм).'
        )
        return msg
    return None


def _check_psu_wattage(items, rule):
    """PSU wattage must be >= CPU TDP + GPU TDP + 100W headroom."""
    psu = _get_component(items, 'psu')
    if not psu:
        return None

    psu_watts = _get_numeric_spec(psu, 'Мощность')
    if psu_watts is None:
        return None

    total_tdp = Decimal('0')

    cpu = _get_component(items, 'cpu')
    if cpu:
        cpu_tdp = _get_numeric_spec(cpu, 'TDP')
        if cpu_tdp is not None:
            total_tdp += cpu_tdp

    gpu = _get_component(items, 'gpu')
    if gpu:
        gpu_tdp = _get_numeric_spec(gpu, 'TDP')
        if gpu_tdp is not None:
            total_tdp += gpu_tdp

    required = total_tdp + Decimal('100')

    if psu_watts < required:
        msg = rule.message_template or (
            f'Мощности блока питания ({psu_watts} Вт) может не хватить. '
            f'Рекомендуемая мощность: {required} Вт '
            f'(CPU TDP + GPU TDP + 100 Вт запас).'
        )
        return msg
    return None


def _check_cooler_socket_match(items, rule):
    """Cooler must support the CPU socket."""
    cooler = _get_component(items, 'cooler')
    cpu = _get_component(items, 'cpu')
    if not cooler or not cpu:
        return None

    cpu_socket = _get_spec_value(cpu, 'Сокет')
    cooler_sockets = _get_spec_value(cooler, 'Совместимые сокеты')

    if not cpu_socket or not cooler_sockets:
        return None

    # cooler_sockets is typically comma-separated: "LGA 1700, AM5, AM4"
    supported = [s.strip().lower() for s in cooler_sockets.split(',')]
    if cpu_socket.strip().lower() not in supported:
        msg = rule.message_template or (
            f'Кулер не поддерживает сокет процессора ({cpu_socket}). '
            f'Поддерживаемые сокеты: {cooler_sockets}.'
        )
        return msg
    return None


def _check_m2_slots_limit(items, rule):
    """Number of M.2 SSDs must not exceed motherboard M.2 slot count."""
    mobo = _get_component(items, 'motherboard')
    if not mobo:
        return None

    mobo_m2_slots = _get_numeric_spec(mobo, 'Слоты M.2')
    if mobo_m2_slots is None:
        return None

    # Count all SSD items whose product has form-factor M.2
    m2_count = 0
    ssd_items = items.filter(component_type='ssd').select_related('product')
    for ssd_item in ssd_items:
        ff = _get_spec_value(ssd_item.product, 'Форм-фактор')
        if ff and 'M.2' in ff:
            m2_count += ssd_item.quantity

    if m2_count > int(mobo_m2_slots):
        msg = rule.message_template or (
            f'Количество M.2 накопителей ({m2_count}) превышает '
            f'количество слотов M.2 на материнской плате ({int(mobo_m2_slots)}).'
        )
        return msg
    return None


def _check_ram_max_capacity(items, rule):
    """Total RAM capacity must not exceed motherboard maximum."""
    ram_item = _get_component_item(items, 'ram')
    mobo = _get_component(items, 'motherboard')
    if not ram_item or not mobo:
        return None

    mobo_max_ram = _get_numeric_spec(mobo, 'Макс объём RAM')
    if mobo_max_ram is None:
        return None

    ram_capacity = _get_numeric_spec(ram_item.product, 'Объём')
    if ram_capacity is None:
        return None

    total_ram = ram_capacity * ram_item.quantity
    if total_ram > mobo_max_ram:
        msg = rule.message_template or (
            f'Общий объём RAM ({total_ram} ГБ) превышает максимальный '
            f'поддерживаемый объём материнской платы ({int(mobo_max_ram)} ГБ).'
        )
        return msg
    return None


# Map rule_type strings to checker functions
RULE_CHECKERS = {
    'socket_match': _check_socket_match,
    'ram_type_match': _check_ram_type_match,
    'ram_slots_limit': _check_ram_slots_limit,
    'ram_max_capacity': _check_ram_max_capacity,
    'form_factor_fit': _check_form_factor_fit,
    'gpu_length_fit': _check_gpu_length_fit,
    'cooler_height_fit': _check_cooler_height_fit,
    'psu_wattage_check': _check_psu_wattage,
    'cooler_socket_match': _check_cooler_socket_match,
    'm2_slots_limit': _check_m2_slots_limit,
}


# ---------------------------------------------------------------------------
# Main public function
# ---------------------------------------------------------------------------

def check_compatibility(configuration):
    """
    Run all active CompatibilityRule checks against *configuration*.

    Returns a dict:
        {
            'is_compatible': bool,
            'errors': [str, ...],      # hard constraint violations
            'warnings': [str, ...],    # soft constraint warnings
        }
    """
    errors = []
    warnings = []

    items = configuration.items.select_related('product').all()
    if not items.exists():
        return {'is_compatible': True, 'errors': [], 'warnings': []}

    rules = CompatibilityRule.objects.all()

    for rule in rules:
        checker = RULE_CHECKERS.get(rule.rule_type)
        if checker is None:
            logger.warning('No checker implemented for rule type: %s', rule.rule_type)
            continue

        try:
            message = checker(items, rule)
        except Exception:
            logger.exception(
                'Error checking rule %s for configuration %s',
                rule.rule_type,
                configuration.pk,
            )
            continue

        if message:
            if rule.is_hard:
                errors.append(message)
            else:
                warnings.append(message)

    return {
        'is_compatible': len(errors) == 0,
        'errors': errors,
        'warnings': warnings,
    }
