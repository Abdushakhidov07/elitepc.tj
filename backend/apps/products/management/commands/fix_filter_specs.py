"""
One-time command: remap scraped spec names to filterable spec names
and clean up &nbsp; HTML entities in values.

Usage:
    python manage.py fix_filter_specs
    python manage.py fix_filter_specs --dry-run
"""

import re
from django.core.management.base import BaseCommand
from apps.products.models import (
    Category, SpecificationName, ProductSpecification,
)

# Per-category mapping: scraped_name → filterable_name
# Only include mappings where names differ.
# Specs where scraped name == filterable name are handled automatically.
CATEGORY_MAPPINGS = {
    'cpu': {
        'Socket': 'Сокет',
        'Линейка': 'Серия',
        'Количество ядер': 'Кол-во ядер',
        'Тактовая частота': 'Базовая частота',           # MHz → GHz
        'Частота процессора в режиме Turbo': 'Турбо частота',  # MHz → GHz
        'Объём кэша L3': 'Кэш L3',                      # "24 Мб" → "24"
        'Типичное тепловыделение': 'TDP',                # "125 Вт" → "125"
        'Интегрированное графическое ядро': 'Встроенная графика',
    },
    'motherboards': {
        'Количество слотов памяти': 'Кол-во слотов RAM',
        'Версия Wi-Fi': 'Wi-Fi',
        'Версия Bluetooth': 'Bluetooth',
    },
    'ram': {
        'Тип памяти': 'Тип',
        'Объём памяти': 'Объём',                         # "16 Гб" → "16"
        'Тактовая частота': 'Частота',                   # "5600 МГц" → "5600"
        'Количество модулей в комплекте': 'Кол-во модулей',
    },
    'gpu': {
        'Производитель видеопроцессора': 'GPU',
        'Объём памяти': 'Объём видеопамяти',             # "16 Гб" → "16"
        'Шина памяти (разрядность)': 'Шина памяти',      # "128 бит" → "128"
    },
    'storage': {
        'Объём жёсткого диска': 'Объём',                 # HDD "500 Гб" → "500"
        'Объём накопителя': 'Объём',                     # SSD "2048 Гб" → "2048"
    },
    'psu': {
        'Сертификат 80 PLUS': 'Сертификат',
    },
    'cases': {
        'Форм-фактор': 'Форм-фактор поддержки',
        'Максимальная длина видеокарты': 'Макс длина GPU',    # "435 мм" → "435"
        'Максимальная высота кулера': 'Макс высота кулера',   # "175 мм" → "175"
        'Наличие окна на боковой стенке': 'Боковое окно',
    },
    'coolers': {
        'Socket': 'Совместимые сокеты',
        'Высота кулера': 'Высота',                       # "157 мм" → "157"
        'Уровень шума вентилятора': 'Уровень шума',      # "27 дБ" → "27"
    },
}

# Filterable specs that are "range" type and need numeric-only values.
# For these we extract only the first number.
RANGE_SPEC_NAMES = {
    'Кол-во ядер', 'Базовая частота', 'Турбо частота', 'Кэш L3', 'TDP',
    'Кол-во слотов RAM', 'Макс частота RAM', 'Макс объём RAM', 'Слоты M.2',
    'Объём', 'Частота',
    'Объём видеопамяти', 'Шина памяти', 'Длина',
    'Скорость чтения', 'Скорость записи',
    'Мощность',
    'Макс длина GPU', 'Макс высота кулера', 'Кол-во мест под вентиляторы',
    'TDP рассеивания', 'Высота', 'Уровень шума',
    'Диагональ', 'Частота обновления', 'Время отклика',
}

# Specs where incoming value is in MHz but the filter unit is GHz
MHZ_TO_GHZ_SPECS = {'Базовая частота', 'Турбо частота'}


def clean_value(raw: str, target_name: str) -> str:
    """
    Clean a spec value:
    - Replace &nbsp; HTML entity with a regular space
    - For range specs: extract the first integer/decimal number
    - For MHz→GHz specs: also divide by 1000
    """
    value = raw.replace('&nbsp;', ' ').strip()

    if target_name in RANGE_SPEC_NAMES:
        # Extract first number (int or float)
        m = re.search(r'[\d]+(?:[.,]\d+)?', value.replace('\xa0', ''))
        if m:
            num_str = m.group(0).replace(',', '.')
            try:
                num = float(num_str)
                if target_name in MHZ_TO_GHZ_SPECS:
                    # Convert MHz to GHz
                    num = round(num / 1000, 2)
                # Format: drop unnecessary decimal zeros
                if num == int(num):
                    return str(int(num))
                return str(num)
            except ValueError:
                pass

    return value


class Command(BaseCommand):
    help = 'Remap scraped spec names to filterable spec names and clean values'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without saving',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        if dry_run:
            self.stdout.write('DRY RUN — no changes will be saved\n')

        total_updated = 0
        total_cleaned = 0

        for cat_slug, mappings in CATEGORY_MAPPINGS.items():
            try:
                category = Category.objects.get(slug=cat_slug)
            except Category.DoesNotExist:
                self.stderr.write(f'Category not found: {cat_slug}')
                continue

            self.stdout.write(f'\n=== {category.name} ({cat_slug}) ===')

            for scraped_name, target_name in mappings.items():
                # Find the scraped SpecificationName
                scraped_sn = SpecificationName.objects.filter(
                    name=scraped_name, category=category
                ).first()
                if not scraped_sn:
                    self.stdout.write(f'  SKIP (not found): "{scraped_name}"')
                    continue

                # Find the filterable SpecificationName
                target_sn = SpecificationName.objects.filter(
                    name=target_name, category=category, is_filterable=True
                ).first()
                if not target_sn:
                    self.stdout.write(
                        f'  SKIP (target not filterable): "{scraped_name}" → "{target_name}"'
                    )
                    continue

                # Get all ProductSpecification records pointing to scraped_sn
                specs = ProductSpecification.objects.filter(spec_name=scraped_sn)
                count = specs.count()

                if count == 0:
                    self.stdout.write(
                        f'  SKIP (no products): "{scraped_name}" → "{target_name}"'
                    )
                    continue

                self.stdout.write(
                    f'  REMAP ({count} specs): "{scraped_name}" -> "{target_name}"'
                )

                if not dry_run:
                    for spec in specs:
                        new_value = clean_value(spec.value, target_name)
                        spec.spec_name = target_sn
                        spec.value = new_value
                        spec.save(update_fields=['spec_name', 'value'])

                    # Delete the now-unused scraped SpecificationName
                    scraped_sn.delete()

                total_updated += count

        # Also clean &nbsp; (with or without semicolon) in ALL filterable spec values
        self.stdout.write('\n=== Cleaning &nbsp; in filterable spec values ===')
        to_clean = [
            s for s in ProductSpecification.objects.filter(
                spec_name__is_filterable=True
            ).select_related('spec_name')
            if '&nbsp' in s.value or '\xa0' in s.value
        ]
        clean_count = len(to_clean)
        self.stdout.write(f'  Found {clean_count} values with &nbsp;')

        if not dry_run and clean_count > 0:
            for spec in to_clean:
                new_val = clean_value(spec.value, spec.spec_name.name)
                if new_val != spec.value:
                    spec.value = new_val
                    spec.save(update_fields=['value'])
            total_cleaned += clean_count

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDone! Remapped {total_updated} specs, cleaned {total_cleaned} values.'
            )
        )
