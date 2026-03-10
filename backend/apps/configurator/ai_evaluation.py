"""
AI-powered evaluation of PC configurations.

Sends the list of components and their specifications to an AI API
(OpenAI or Anthropic) and returns a structured evaluation with rating,
balance analysis, recommendations, and estimated gaming FPS.
"""

import json
import logging

from django.conf import settings

from apps.products.models import ProductSpecification

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------
# Prompt construction
# --------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are an expert PC hardware consultant. The user will give you a list of "
    "PC components with their specifications. Evaluate the build and respond "
    "STRICTLY in the following JSON format (no markdown, no extra text):\n"
    "{\n"
    '  "rating": <int 1-10>,\n'
    '  "comment": "<overall evaluation in Russian, 2-4 sentences>",\n'
    '  "balance_score": <int 1-10, how well-balanced the build is>,\n'
    '  "recommendations": ["<recommendation 1 in Russian>", ...],\n'
    '  "suitable_for": ["<use-case in Russian>", ...],\n'
    '  "estimated_fps": {"<game name>": "<resolution & FPS estimate>", ...}\n'
    "}\n"
    "Rules:\n"
    "- rating: 1 = terrible, 10 = perfect.\n"
    "- balance_score: 1 = severe bottleneck, 10 = perfectly balanced.\n"
    "- recommendations: 2-5 actionable suggestions.\n"
    "- suitable_for: e.g. 'Игровой ПК среднего уровня', 'Рабочая станция для 3D'.\n"
    "- estimated_fps: only if the build has a dedicated GPU; popular games at 1080p/1440p.\n"
    "- All text must be in Russian.\n"
)


def _build_components_description(configuration):
    """Build a human-readable text block describing all components and their specs."""
    lines = []
    items = (
        configuration.items
        .select_related('product', 'product__brand', 'product__category')
        .order_by('component_type')
    )

    for item in items:
        product = item.product
        header = (
            f"{item.get_component_type_display()}: "
            f"{product.name} "
            f"({product.brand.name if product.brand else 'N/A'}) "
            f"x{item.quantity}"
        )
        lines.append(header)

        specs = ProductSpecification.objects.filter(
            product=product,
        ).select_related('spec_name').order_by('spec_name__order')

        for spec in specs:
            unit = f' {spec.spec_name.unit}' if spec.spec_name.unit else ''
            lines.append(f"  - {spec.spec_name.name}: {spec.value}{unit}")

        lines.append('')  # blank line between components

    return '\n'.join(lines)


# --------------------------------------------------------------------------
# API callers
# --------------------------------------------------------------------------

def _call_openai(prompt_text):
    """Call the OpenAI ChatCompletion API and return the parsed JSON dict."""
    try:
        import openai
    except ImportError:
        logger.error('openai package is not installed.')
        return None

    api_key = getattr(settings, 'OPENAI_API_KEY', '')
    if not api_key:
        logger.warning('OPENAI_API_KEY is not set.')
        return None

    try:
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {'role': 'system', 'content': SYSTEM_PROMPT},
                {'role': 'user', 'content': prompt_text},
            ],
            temperature=0.4,
            max_tokens=1500,
        )
        content = response.choices[0].message.content.strip()
        # Strip possible markdown fences
        if content.startswith('```'):
            content = content.split('\n', 1)[1]
        if content.endswith('```'):
            content = content.rsplit('```', 1)[0]
        return json.loads(content)
    except Exception:
        logger.exception('OpenAI API call failed.')
        return None


def _call_anthropic(prompt_text):
    """Call the Anthropic Messages API and return the parsed JSON dict."""
    try:
        import anthropic
    except ImportError:
        logger.error('anthropic package is not installed.')
        return None

    api_key = getattr(settings, 'ANTHROPIC_API_KEY', '')
    if not api_key:
        logger.warning('ANTHROPIC_API_KEY is not set.')
        return None

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model='claude-sonnet-4-20250514',
            max_tokens=1500,
            system=SYSTEM_PROMPT,
            messages=[
                {'role': 'user', 'content': prompt_text},
            ],
        )
        content = response.content[0].text.strip()
        if content.startswith('```'):
            content = content.split('\n', 1)[1]
        if content.endswith('```'):
            content = content.rsplit('```', 1)[0]
        return json.loads(content)
    except Exception:
        logger.exception('Anthropic API call failed.')
        return None


# --------------------------------------------------------------------------
# Default fallback evaluation
# --------------------------------------------------------------------------

def _fallback_evaluation(configuration):
    """
    Return a basic evaluation when no AI API is available.
    This ensures the feature degrades gracefully.
    """
    items_count = configuration.items.count()
    if items_count == 0:
        return {
            'rating': 1,
            'comment': 'Конфигурация пуста. Добавьте компоненты для оценки.',
            'balance_score': 1,
            'recommendations': ['Добавьте хотя бы процессор, материнскую плату и оперативную память.'],
            'suitable_for': [],
            'estimated_fps': {},
        }

    # Simple heuristic: more components = higher base score
    base = min(items_count, 7)
    return {
        'rating': base,
        'comment': (
            'AI-оценка временно недоступна. '
            f'Конфигурация содержит {items_count} компонент(ов). '
            'Проверьте совместимость вручную.'
        ),
        'balance_score': None,
        'recommendations': [
            'Убедитесь, что мощность блока питания достаточна.',
            'Проверьте совместимость сокетов CPU и материнской платы.',
        ],
        'suitable_for': [],
        'estimated_fps': {},
    }


# --------------------------------------------------------------------------
# Public interface
# --------------------------------------------------------------------------

def evaluate_configuration(configuration):
    """
    Evaluate a PCConfiguration using an AI API.

    Tries OpenAI first, then Anthropic as fallback, then returns a basic
    heuristic evaluation if neither is available.

    Returns a dict with keys:
        rating (int), comment (str), balance_score (int|None),
        recommendations (list[str]), suitable_for (list[str]),
        estimated_fps (dict[str, str])
    """
    prompt_text = _build_components_description(configuration)

    if not prompt_text.strip():
        return _fallback_evaluation(configuration)

    # Try OpenAI first
    result = _call_openai(prompt_text)

    # Fallback to Anthropic
    if result is None:
        result = _call_anthropic(prompt_text)

    # Fallback to heuristic
    if result is None:
        return _fallback_evaluation(configuration)

    # Normalise the result to guarantee expected keys
    return {
        'rating': int(result.get('rating', 5)),
        'comment': result.get('comment', ''),
        'balance_score': result.get('balance_score'),
        'recommendations': result.get('recommendations', []),
        'suitable_for': result.get('suitable_for', []),
        'estimated_fps': result.get('estimated_fps', {}),
    }
