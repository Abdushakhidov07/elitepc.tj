"""
Management command to scrape product data and images from regard.ru.

Usage:
    python manage.py scrape_regard                           # Scrape all categories
    python manage.py scrape_regard --category cpu            # Scrape one category
    python manage.py scrape_regard --category gpu --max 10   # Limit products
    python manage.py scrape_regard --list-categories         # Show category map
    python manage.py scrape_regard --dry-run                 # Preview without saving
"""

import json
import os
import re
import time
import hashlib
import logging
from decimal import Decimal
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils.text import slugify as django_slugify

from apps.products.models import (
    Brand,
    Category,
    Product,
    ProductImage,
    ProductSpecification,
    SpecificationName,
)

logger = logging.getLogger(__name__)

BASE_URL = 'https://www.regard.ru'

# RUB -> TJS exchange rate (approximate).  Adjust as needed.
RUB_TO_TJS = Decimal('0.12')

# Regard category ID -> our local category slug
REGARD_CATEGORIES = {
    'cpu': {'regard_id': 1001, 'slug': 'processory', 'local_slug': 'cpu'},
    'motherboards': {'regard_id': 1000, 'slug': 'materinskie-platy', 'local_slug': 'motherboards'},
    'ram': {'regard_id': 1010, 'slug': 'operativnaya-pamyat', 'local_slug': 'ram'},
    'gpu': {'regard_id': 1013, 'slug': 'videokarty', 'local_slug': 'gpu'},
    'ssd': {'regard_id': 1015, 'slug': 'nakopiteli-ssd', 'local_slug': 'storage'},
    'hdd': {'regard_id': 1014, 'slug': 'zhestkie-diski-hdd', 'local_slug': 'storage'},
    'psu': {'regard_id': 1225, 'slug': 'bloki-pitaniya', 'local_slug': 'psu'},
    'cases': {'regard_id': 1032, 'slug': 'korpusa', 'local_slug': 'cases'},
    'coolers': {'regard_id': 5162, 'slug': 'kulery-dlya-processorov', 'local_slug': 'coolers'},
}

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/131.0.0.0 Safari/537.36'
    ),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
}


def transliterate(text: str) -> str:
    """Transliterate Cyrillic to Latin for slug generation."""
    mapping = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e',
        'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k',
        'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
        'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
        'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '',
        'э': 'e', 'ю': 'yu', 'я': 'ya',
    }
    result = []
    for ch in text.lower():
        result.append(mapping.get(ch, ch))
    return ''.join(result)


def make_slug(name: str) -> str:
    """Create a URL-safe slug from a product name."""
    latin = transliterate(name)
    slug = django_slugify(latin, allow_unicode=False)
    return slug[:490]  # keep under SlugField max_length


def parse_price(text: str) -> Decimal | None:
    """Extract numeric price from text like '30 670 ₽' or '30670.00'."""
    if not text:
        return None
    # Remove currency symbols, spaces, non-breaking spaces
    cleaned = re.sub(r'[₽\s\xa0]', '', text.strip())
    # Keep digits and dots/commas for decimals
    cleaned = re.sub(r'[^\d.,]', '', cleaned)
    # Normalize: if there's a comma used as decimal separator, replace with dot
    if ',' in cleaned and '.' not in cleaned:
        cleaned = cleaned.replace(',', '.')
    # If has decimals like "30670.00", parse directly
    if '.' in cleaned:
        try:
            return Decimal(cleaned)
        except Exception:
            pass
    # Otherwise parse as integer
    cleaned = re.sub(r'[^\d]', '', cleaned)
    if cleaned:
        return Decimal(cleaned)
    return None


class RegardScraper:
    """Scraper for regard.ru product pages."""

    def __init__(self, session: requests.Session | None = None, delay: float = 1.5):
        self.session = session or requests.Session()
        self.session.headers.update(HEADERS)
        self.delay = delay

    def _get(self, url: str, retries: int = 3) -> BeautifulSoup | None:
        """Fetch a URL and return parsed soup, with retry on 429."""
        for attempt in range(retries):
            try:
                resp = self.session.get(url, timeout=20)
                if resp.status_code == 429:
                    wait = self.delay * (2 ** (attempt + 1))  # 6s, 12s, 24s
                    logger.info('Rate limited (429). Waiting %.0fs before retry %d/%d...', wait, attempt + 1, retries)
                    time.sleep(wait)
                    continue
                resp.raise_for_status()
                time.sleep(self.delay)
                return BeautifulSoup(resp.text, 'lxml')
            except requests.RequestException as e:
                if attempt < retries - 1:
                    wait = self.delay * (2 ** (attempt + 1))
                    logger.info('Request failed. Waiting %.0fs before retry...', wait)
                    time.sleep(wait)
                else:
                    logger.warning('Failed to fetch %s: %s', url, e)
        return None

    def scrape_category_page(self, category_key: str, page: int = 1) -> list[dict]:
        """Scrape a single page of a category listing. Returns list of product stubs."""
        cat_info = REGARD_CATEGORIES[category_key]
        url = f"{BASE_URL}/catalog/{cat_info['regard_id']}/{cat_info['slug']}"
        if page > 1:
            url += f'?page={page}'

        soup = self._get(url)
        if not soup:
            return []

        products = []

        # Find all product links — regard uses <a> tags with href matching /product/
        for link in soup.find_all('a', href=re.compile(r'^/product/\d+')):
            href = link.get('href', '')
            product_id_match = re.search(r'/product/(\d+)/', href)
            if not product_id_match:
                continue

            regard_id = product_id_match.group(1)

            # Get product name from text content
            name = ''
            # Try h3, h2, or the link text
            name_el = link.find(['h3', 'h2', 'span'])
            if name_el:
                name = name_el.get_text(strip=True)
            if not name:
                name = link.get_text(strip=True)

            # Skip if name is too short or just a number
            if len(name) < 5:
                continue

            # Clean up name — remove trailing dots and duplicated text
            name = re.sub(r'\.{3,}', '', name).strip()

            # Get price from parent or sibling
            price_text = ''
            price_el = link.find(string=re.compile(r'\d[\d\s]*₽'))
            if price_el:
                price_text = price_el.strip()
            else:
                # Search in parent container
                parent = link.parent
                if parent:
                    price_match = re.search(r'([\d\s]+)\s*₽', parent.get_text())
                    if price_match:
                        price_text = price_match.group(0)

            # Get thumbnail image
            img = link.find('img')
            thumb_url = ''
            if img:
                src = img.get('src', '') or img.get('data-src', '')
                if src:
                    thumb_url = urljoin(BASE_URL, src)

            products.append({
                'regard_id': regard_id,
                'name': name,
                'url': urljoin(BASE_URL, href),
                'price_rub': parse_price(price_text),
                'thumb_url': thumb_url,
            })

        # Deduplicate by regard_id
        seen = set()
        unique = []
        for p in products:
            if p['regard_id'] not in seen:
                seen.add(p['regard_id'])
                unique.append(p)

        return unique

    def scrape_category(self, category_key: str, max_products: int = 50) -> list[dict]:
        """Scrape multiple pages of a category."""
        all_products = []
        page = 1
        while len(all_products) < max_products:
            logger.info('Scraping %s page %d ...', category_key, page)
            products = self.scrape_category_page(category_key, page)
            if not products:
                break
            all_products.extend(products)
            page += 1
            if len(products) < 10:
                break  # Likely last page

        return all_products[:max_products]

    def scrape_product_detail(self, product_url: str) -> dict:
        """Scrape a single product detail page using JSON-LD and CSS class selectors."""
        soup = self._get(product_url)
        if not soup:
            return {}

        result = {
            'specifications': {},
            'images': [],
            'description': '',
            'brand': '',
            'name': '',
            'price_rub': None,
        }

        # ---- 1. Extract JSON-LD structured data (most reliable) ----
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                data = json.loads(script.string or '{}')
            except (json.JSONDecodeError, TypeError):
                continue

            if not isinstance(data, dict) or data.get('@type') != 'Product':
                continue

            result['name'] = data.get('name', '')
            result['brand'] = (data.get('brand') or {}).get('name', '')

            # Images from JSON-LD
            imgs = data.get('image', [])
            if isinstance(imgs, str):
                imgs = [imgs]
            result['images'] = imgs

            # Price
            offers = data.get('offers', {})
            price_str = str(offers.get('price', ''))
            if price_str:
                result['price_rub'] = parse_price(price_str)

            # Description from JSON-LD
            desc = data.get('description', '')
            if desc:
                # Clean up <noindex> tags
                desc = re.sub(r'</?noindex>', '', desc)
                result['description'] = desc

            break  # Found the Product JSON-LD

        # ---- 2. Fallback: h1 for name ----
        if not result['name']:
            h1 = soup.find('h1')
            if h1:
                result['name'] = h1.get_text(strip=True)

        # ---- 3. Specifications from CSS class selectors ----
        # Regard uses: CharacteristicsItem_name__* for label,
        #              CharacteristicsItem_value__* for value
        for item_div in soup.find_all('div', class_=re.compile(r'CharacteristicsItem_item')):
            name_div = item_div.find('div', class_=re.compile(r'CharacteristicsItem_name'))
            value_div = item_div.find('div', class_=re.compile(r'CharacteristicsItem_value'))
            if name_div and value_div:
                # Clean the spec name: remove trailing dots
                key = re.sub(r'\.+$', '', name_div.get_text(strip=True)).strip()
                val = value_div.get_text(strip=True)
                # Clean up &nbsp; artifacts
                val = val.replace('\xa0', ' ').strip()
                if key and val and len(key) < 150 and len(val) < 400:
                    result['specifications'][key] = val

        # ---- 4. Fallback specs from short characteristics ----
        if not result['specifications']:
            short_wrap = soup.find('section', class_=re.compile(r'ShortCharacteristics'))
            if short_wrap:
                text = short_wrap.get_text(separator='\n')
                for line in text.split('\n'):
                    line = line.strip()
                    if ':' in line:
                        parts = line.split(':', 1)
                        key = parts[0].strip()
                        val = parts[1].strip()
                        if key and val:
                            result['specifications'][key] = val

        # ---- 5. Brand fallback ----
        if not result['brand']:
            brand = result['specifications'].get('Производитель', '')
            if not brand:
                name = result.get('name', '')
                known_brands = [
                    'AMD', 'Intel', 'NVIDIA', 'ASUS', 'MSI', 'Gigabyte', 'ASRock',
                    'Corsair', 'Kingston', 'Samsung', 'Western Digital', 'WD',
                    'Seagate', 'be quiet!', 'Cooler Master', 'NZXT', 'Deepcool',
                    'Noctua', 'Crucial', 'G.Skill', 'Thermaltake', 'Seasonic',
                    'Palit', 'Zotac', 'Sapphire', 'XFX', 'PowerColor',
                    'Arctic', 'Fractal Design', 'Lian Li', 'Phanteks',
                ]
                for b in known_brands:
                    if b.lower() in name.lower():
                        brand = b
                        break
            result['brand'] = brand

        return result

    def download_image(self, url: str) -> bytes | None:
        """Download an image and return its content."""
        try:
            resp = self.session.get(url, timeout=20)
            resp.raise_for_status()
            content_type = resp.headers.get('content-type', '')
            if 'image' in content_type or len(resp.content) > 1000:
                return resp.content
        except requests.RequestException as e:
            logger.warning('Failed to download image %s: %s', url, e)
        return None


class Command(BaseCommand):
    help = 'Scrape products from regard.ru and import them into the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--category',
            type=str,
            help='Category key to scrape (cpu, gpu, ram, etc.)',
        )
        parser.add_argument(
            '--max',
            type=int,
            default=30,
            help='Maximum products per category (default: 30)',
        )
        parser.add_argument(
            '--max-pages',
            type=int,
            default=3,
            help='Maximum pages to scrape per category (default: 3)',
        )
        parser.add_argument(
            '--delay',
            type=float,
            default=1.5,
            help='Delay between requests in seconds (default: 1.5)',
        )
        parser.add_argument(
            '--rate',
            type=str,
            default='0.12',
            help='RUB to TJS exchange rate (default: 0.12)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview products without saving to DB',
        )
        parser.add_argument(
            '--no-images',
            action='store_true',
            help='Skip downloading images',
        )
        parser.add_argument(
            '--list-categories',
            action='store_true',
            help='Show available category keys and exit',
        )
        parser.add_argument(
            '--replace',
            action='store_true',
            help='Replace existing products (by regard_id in SKU)',
        )

    def handle(self, *args, **options):
        if options['list_categories']:
            self.stdout.write('\nAvailable categories:')
            for key, info in REGARD_CATEGORIES.items():
                self.stdout.write(
                    f'  {key:15s} -> regard: /catalog/{info["regard_id"]}/{info["slug"]}'
                    f'  (local: {info["local_slug"]})'
                )
            return

        global RUB_TO_TJS
        RUB_TO_TJS = Decimal(options['rate'])

        scraper = RegardScraper(delay=options['delay'])
        dry_run = options['dry_run']
        skip_images = options['no_images']
        replace = options['replace']
        max_products = options['max']

        categories_to_scrape = (
            [options['category']] if options['category']
            else list(REGARD_CATEGORIES.keys())
        )

        for cat_idx, cat_key in enumerate(categories_to_scrape):
            if cat_key not in REGARD_CATEGORIES:
                self.stderr.write(f'Unknown category: {cat_key}')
                continue

            # Wait between categories to avoid rate limiting
            if cat_idx > 0:
                wait = max(10, scraper.delay * 5)
                self.stdout.write(f'\nWaiting {wait:.0f}s before next category...')
                time.sleep(wait)

            self.stdout.write(f'\n{"="*60}')
            self.stdout.write(f'Scraping: {cat_key}')
            self.stdout.write(f'{"="*60}')

            # Get local category
            local_slug = REGARD_CATEGORIES[cat_key]['local_slug']
            local_category = Category.objects.filter(slug=local_slug).first()
            if not local_category:
                self.stderr.write(f'Local category "{local_slug}" not found! Skipping.')
                continue

            # Scrape product listing
            product_stubs = scraper.scrape_category(cat_key, max_products=max_products)
            self.stdout.write(f'Found {len(product_stubs)} products in listing')

            created_count = 0
            updated_count = 0
            skipped_count = 0

            for i, stub in enumerate(product_stubs):
                regard_id = stub['regard_id']
                sku = f'RG-{regard_id}'

                # Check if already exists
                existing = Product.objects.filter(sku=sku).first()
                if existing and not replace:
                    skipped_count += 1
                    self.stdout.write(f'  [{i+1}/{len(product_stubs)}] SKIP: {stub["name"][:60]}')
                    continue

                self.stdout.write(
                    f'  [{i+1}/{len(product_stubs)}] Scraping: {stub["name"][:60]}...'
                )

                # Scrape product detail page
                detail = scraper.scrape_product_detail(stub['url'])
                if not detail:
                    self.stdout.write(f'    WARN: Failed to scrape detail page')
                    continue

                name = detail.get('name') or stub['name']
                price_rub = detail.get('price_rub') or stub.get('price_rub')
                if not price_rub:
                    self.stdout.write(f'    WARN: No price found, skipping')
                    continue

                price_tjs = (price_rub * RUB_TO_TJS).quantize(Decimal('0.01'))
                brand_name = detail.get('brand', '')
                specs = detail.get('specifications', {})
                image_urls = detail.get('images', [])

                if dry_run:
                    self.stdout.write(f'    Name:   {name}')
                    self.stdout.write(f'    Price:  {price_rub} RUB -> {price_tjs} TJS')
                    self.stdout.write(f'    Brand:  {brand_name}')
                    self.stdout.write(f'    Specs:  {len(specs)} items')
                    self.stdout.write(f'    Images: {len(image_urls)}')
                    for k, v in list(specs.items())[:5]:
                        self.stdout.write(f'      {k}: {v}')
                    continue

                # Get or create brand
                brand = None
                if brand_name:
                    brand_slug = make_slug(brand_name)
                    # Try by name first, then by slug (case-insensitive)
                    brand = Brand.objects.filter(name__iexact=brand_name).first()
                    if not brand:
                        brand = Brand.objects.filter(slug=brand_slug).first()
                    if not brand:
                        brand = Brand.objects.create(
                            name=brand_name,
                            slug=brand_slug,
                            description='',
                        )

                # Generate slug
                slug = make_slug(name)
                # Ensure uniqueness
                if Product.objects.filter(slug=slug).exclude(sku=sku).exists():
                    slug = f'{slug}-{regard_id}'

                # Create short description from key specs
                short_desc = self._make_short_description(cat_key, specs)

                # Create or update product
                if existing:
                    product = existing
                    product.name = name
                    product.slug = slug
                    product.price = price_tjs
                    product.category = local_category
                    product.brand = brand
                    product.short_description = short_desc
                    product.description = detail.get('description', '')
                    product.stock_quantity = 10  # Default stock
                    product.is_active = True
                    product.save()
                    updated_count += 1
                    action = 'UPDATED'
                else:
                    product = Product.objects.create(
                        name=name,
                        slug=slug,
                        sku=sku,
                        category=local_category,
                        brand=brand,
                        price=price_tjs,
                        stock_quantity=10,
                        is_active=True,
                        short_description=short_desc,
                        description=detail.get('description', ''),
                    )
                    created_count += 1
                    action = 'CREATED'

                # Save specifications
                self._save_specs(product, local_category, specs)

                # Download and save images
                if not skip_images and image_urls:
                    self._save_images(product, image_urls, scraper)

                self.stdout.write(
                    f'    {action}: {name[:50]} | {price_tjs} TJS | '
                    f'{len(specs)} specs | {len(image_urls)} imgs'
                )

            self.stdout.write(
                f'\n  Summary for {cat_key}: '
                f'{created_count} created, {updated_count} updated, {skipped_count} skipped'
            )

        self.stdout.write(self.style.SUCCESS('\nDone!'))

    def _make_short_description(self, cat_key: str, specs: dict) -> str:
        """Generate a short description from key specs."""
        parts = []
        if cat_key == 'cpu':
            for key in ['Socket', 'Сокет', 'Количество ядер', 'Базовая частота', 'TDP']:
                if key in specs:
                    parts.append(specs[key])
        elif cat_key == 'gpu':
            for key in ['Объем видеопамяти', 'Тип видеопамяти', 'Базовая частота GPU']:
                if key in specs:
                    parts.append(specs[key])
        elif cat_key == 'ram':
            for key in ['Тип', 'Объем', 'Частота']:
                if key in specs:
                    parts.append(specs[key])
        elif cat_key in ('ssd', 'hdd'):
            for key in ['Объем', 'Форм-фактор', 'Интерфейс']:
                if key in specs:
                    parts.append(specs[key])
        elif cat_key == 'psu':
            for key in ['Мощность', 'Сертификат']:
                if key in specs:
                    parts.append(specs[key])
        elif cat_key == 'cases':
            for key in ['Форм-фактор', 'Типоразмер']:
                if key in specs:
                    parts.append(specs[key])
        elif cat_key == 'coolers':
            for key in ['Тип', 'Рассеиваемая мощность', 'Размер радиатора']:
                if key in specs:
                    parts.append(specs[key])

        return ', '.join(parts)[:500] if parts else ''

    def _save_specs(self, product: Product, category: Category, specs: dict):
        """Save specifications for a product."""
        # Clear existing specs for this product
        ProductSpecification.objects.filter(product=product).delete()

        for spec_key, spec_value in specs.items():
            if not spec_key or not spec_value:
                continue
            # Skip some irrelevant fields
            if spec_key.lower() in ('гарантия', 'id', 'артикул', 'код товара'):
                continue
            if len(spec_key) > 190 or len(spec_value) > 490:
                continue

            # Get or create SpecificationName
            # New specs from scraping are NOT filterable by default;
            # only manually curated specs (from seed_data) should be filterable.
            spec_name, _ = SpecificationName.objects.get_or_create(
                name=spec_key,
                category=category,
                defaults={
                    'unit': '',
                    'filter_type': 'checkbox',
                    'is_filterable': False,
                    'is_comparable': True,
                },
            )

            ProductSpecification.objects.create(
                product=product,
                spec_name=spec_name,
                value=spec_value,
            )

    def _save_images(self, product: Product, image_urls: list[str], scraper: RegardScraper):
        """Download and save product images."""
        # Clear existing images
        ProductImage.objects.filter(product=product).delete()

        media_dir = Path(settings.MEDIA_ROOT) / 'products'
        media_dir.mkdir(parents=True, exist_ok=True)

        for i, url in enumerate(image_urls[:5]):  # Max 5 images per product
            image_data = scraper.download_image(url)
            if not image_data:
                continue

            # Determine extension
            ext = '.jpg'
            if b'PNG' in image_data[:8]:
                ext = '.png'
            elif b'WEBP' in image_data[:12] or b'RIFF' in image_data[:4]:
                ext = '.webp'

            # Generate filename from URL hash
            url_hash = hashlib.md5(url.encode()).hexdigest()[:12]
            filename = f'regard_{product.sku}_{i}{ext}'

            # Save as main_image if first
            if i == 0:
                product.main_image.save(filename, ContentFile(image_data), save=True)

            # Save as ProductImage
            img_obj = ProductImage(
                product=product,
                alt_text=product.name,
                order=i,
                is_main=(i == 0),
            )
            img_obj.image.save(filename, ContentFile(image_data), save=True)

            time.sleep(0.5)  # Be polite
