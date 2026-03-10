"""
Management command to seed the Elite PC database with realistic data.

Usage:
    python manage.py seed_data

This command is idempotent - it clears existing data first, then recreates everything.
"""

import random
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.products.models import (
    Brand,
    Category,
    HeroSlide,
    Product,
    ProductSpecification,
    SiteSettings,
    SpecificationName,
)
from apps.users.models import User, UserProfile
from apps.configurator.models import (
    CompatibilityRule,
    ConfigurationItem,
    PCConfiguration,
)


class Command(BaseCommand):
    help = 'Seed the database with realistic PC components data for Elite PC store'

    def add_arguments(self, parser):
        parser.add_argument(
            '--with-scrape',
            action='store_true',
            help='After seeding, scrape real products from regard.ru and fix filter specs',
        )
        parser.add_argument(
            '--scrape-max',
            type=int,
            default=20,
            help='Max products per category when scraping (default: 20)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Clearing existing data...'))
        self._clear_data()

        self.stdout.write(self.style.MIGRATE_HEADING('=== Seeding Elite PC Database ==='))

        self.stdout.write('Creating brands...')
        brands = self._create_brands()
        self.stdout.write(self.style.SUCCESS(f'  Created {len(brands)} brands'))

        self.stdout.write('Creating categories...')
        categories = self._create_categories()
        self.stdout.write(self.style.SUCCESS(f'  Created {len(categories)} categories'))

        self.stdout.write('Creating specification names...')
        spec_names = self._create_specification_names(categories)
        self.stdout.write(self.style.SUCCESS(f'  Created {sum(len(v) for v in spec_names.values())} specification names'))

        self.stdout.write('Creating products...')
        products = self._create_products(categories, brands, spec_names)
        self.stdout.write(self.style.SUCCESS(f'  Created {len(products)} products'))

        self.stdout.write('Creating test users...')
        users = self._create_users()
        self.stdout.write(self.style.SUCCESS(f'  Created {len(users)} users'))

        self.stdout.write('Creating compatibility rules...')
        rules = self._create_compatibility_rules()
        self.stdout.write(self.style.SUCCESS(f'  Created {len(rules)} compatibility rules'))

        self.stdout.write('Creating preset configurations...')
        presets = self._create_preset_configurations(categories, products, users)
        self.stdout.write(self.style.SUCCESS(f'  Created {len(presets)} preset configurations'))

        self.stdout.write('Creating hero slides...')
        slides = self._create_hero_slides()
        self.stdout.write(self.style.SUCCESS(f'  Created {len(slides)} hero slides'))

        self.stdout.write('Creating site settings...')
        self._create_site_settings()
        self.stdout.write(self.style.SUCCESS('  Site settings ready'))

        total_specs = ProductSpecification.objects.count()
        self.stdout.write(self.style.MIGRATE_HEADING('=== Seeding Complete ==='))
        self.stdout.write(self.style.SUCCESS(
            f'Summary: {len(brands)} brands, {len(categories)} categories, '
            f'{len(products)} products, {total_specs} specifications, '
            f'{len(users)} users, {len(rules)} rules, {len(presets)} presets, '
            f'{len(slides)} hero slides'
        ))
        self.stdout.write('')
        self.stdout.write(self.style.MIGRATE_HEADING('=== Credentials ==='))
        self.stdout.write('  Admin:    admin / admin123456  (superuser)')
        self.stdout.write('  Manager:  manager / manager123456  (staff)')
        self.stdout.write('  Customer: customer / customer123456')
        self.stdout.write('')
        self.stdout.write(self.style.WARNING(
            'NOTE: Hero slides were created without images.\n'
            '  Add images via Django Admin -> Slides.\n'
            '  Until then, the static hero banner is shown on the homepage.'
        ))

        if options.get('with_scrape'):
            max_per = options.get('scrape_max', 20)
            self.stdout.write('')
            self.stdout.write(self.style.MIGRATE_HEADING('=== Running Scraper ==='))
            self.stdout.write(self.style.WARNING(
                f'Scraping real products from regard.ru (max {max_per} per category)...'
            ))
            from django.core.management import call_command
            call_command('scrape_regard', max=max_per)
            self.stdout.write('')
            self.stdout.write(self.style.MIGRATE_HEADING('=== Fixing Filter Specs ==='))
            call_command('fix_filter_specs')
            self.stdout.write(self.style.SUCCESS('Done! Real products loaded and filters fixed.'))

    # ------------------------------------------------------------------
    # Clear
    # ------------------------------------------------------------------

    def _clear_data(self):
        HeroSlide.objects.all().delete()
        ConfigurationItem.objects.all().delete()
        PCConfiguration.objects.all().delete()
        CompatibilityRule.objects.all().delete()
        ProductSpecification.objects.all().delete()
        Product.objects.all().delete()
        SpecificationName.objects.all().delete()
        Category.objects.all().delete()
        Brand.objects.all().delete()
        User.objects.filter(username__in=['admin', 'manager', 'customer']).delete()
        self.stdout.write(self.style.SUCCESS('  Data cleared.'))

    # ------------------------------------------------------------------
    # Brands
    # ------------------------------------------------------------------

    def _create_brands(self):
        brand_names = [
            'AMD', 'Intel', 'NVIDIA', 'ASUS', 'MSI', 'Gigabyte', 'ASRock',
            'Corsair', 'Kingston', 'G.Skill', 'Samsung', 'Western Digital',
            'Seagate', 'NZXT', 'be quiet!', 'Cooler Master', 'Deepcool',
            'Thermaltake', 'Acer', 'LG', 'Logitech', 'Razer',
        ]
        brands = {}
        for name in brand_names:
            slug = slugify(name, allow_unicode=True)
            if not slug:
                slug = name.lower().replace(' ', '-').replace('!', '').replace('.', '')
            brand = Brand.objects.create(name=name, slug=slug)
            brands[name] = brand
        return brands

    # ------------------------------------------------------------------
    # Categories
    # ------------------------------------------------------------------

    def _create_categories(self):
        cats_data = [
            ('Процессоры', 'cpu', 1),
            ('Материнские платы', 'motherboards', 2),
            ('Оперативная память', 'ram', 3),
            ('Видеокарты', 'gpu', 4),
            ('SSD/HDD', 'storage', 5),
            ('Блоки питания', 'psu', 6),
            ('Корпуса', 'cases', 7),
            ('Кулеры/СЖО', 'coolers', 8),
            ('Мониторы', 'monitors', 9),
            ('Периферия', 'peripherals', 10),
        ]
        categories = {}
        for name, slug, order in cats_data:
            cat = Category.objects.create(
                name=name, slug=slug, order=order, is_active=True,
                meta_title=f'{name} — купить в Elite PC',
                meta_description=f'{name} для компьютера. Магазин Elite PC, Таджикистан.',
            )
            categories[slug] = cat
        return categories

    # ------------------------------------------------------------------
    # Specification Names
    # ------------------------------------------------------------------

    def _create_specification_names(self, categories):
        specs_map = {
            'cpu': [
                ('Производитель', '', 'checkbox', True, True, 1),
                ('Серия', '', 'checkbox', True, True, 2),
                ('Модель', '', 'checkbox', False, True, 3),
                ('Сокет', '', 'checkbox', True, True, 4),
                ('Кол-во ядер', '', 'range', True, True, 5),
                ('Кол-во потоков', '', 'range', False, True, 6),
                ('Базовая частота', 'ГГц', 'range', True, True, 7),
                ('Турбо частота', 'ГГц', 'range', True, True, 8),
                ('Кэш L3', 'МБ', 'range', True, True, 9),
                ('TDP', 'Вт', 'range', True, True, 10),
                ('Встроенная графика', '', 'checkbox', True, True, 11),
                ('Техпроцесс', 'нм', 'range', False, True, 12),
            ],
            'motherboards': [
                ('Сокет', '', 'checkbox', True, True, 1),
                ('Чипсет', '', 'checkbox', True, True, 2),
                ('Форм-фактор', '', 'checkbox', True, True, 3),
                ('Кол-во слотов RAM', '', 'range', True, True, 4),
                ('Тип памяти', '', 'checkbox', True, True, 5),
                ('Макс частота RAM', 'МГц', 'range', True, True, 6),
                ('Макс объём RAM', 'ГБ', 'range', True, True, 7),
                ('Слоты M.2', '', 'range', True, True, 8),
                ('Слоты PCIe', '', 'range', False, True, 9),
                ('Wi-Fi', '', 'checkbox', True, True, 10),
                ('Bluetooth', '', 'checkbox', True, True, 11),
            ],
            'ram': [
                ('Тип', '', 'checkbox', True, True, 1),
                ('Объём', 'ГБ', 'range', True, True, 2),
                ('Частота', 'МГц', 'range', True, True, 3),
                ('Кол-во модулей', '', 'checkbox', True, True, 4),
                ('Тайминги', '', 'checkbox', False, True, 5),
                ('Радиатор', '', 'checkbox', True, True, 6),
                ('RGB', '', 'checkbox', True, True, 7),
            ],
            'gpu': [
                ('GPU', '', 'checkbox', True, True, 1),
                ('Объём видеопамяти', 'ГБ', 'range', True, True, 2),
                ('Тип памяти', '', 'checkbox', True, True, 3),
                ('Шина памяти', 'бит', 'range', True, True, 4),
                ('Базовая частота', 'МГц', 'range', False, True, 5),
                ('Boost частота', 'МГц', 'range', False, True, 6),
                ('TDP', 'Вт', 'range', True, True, 7),
                ('Доп. питание', '', 'checkbox', False, True, 8),
                ('Длина', 'мм', 'range', True, True, 9),
                ('Кол-во вентиляторов', '', 'checkbox', False, True, 10),
            ],
            'storage': [
                ('Тип', '', 'checkbox', True, True, 1),
                ('Форм-фактор', '', 'checkbox', True, True, 2),
                ('Интерфейс', '', 'checkbox', True, True, 3),
                ('Объём', 'ГБ', 'range', True, True, 4),
                ('Скорость чтения', 'МБ/с', 'range', True, True, 5),
                ('Скорость записи', 'МБ/с', 'range', True, True, 6),
            ],
            'psu': [
                ('Мощность', 'Вт', 'range', True, True, 1),
                ('Сертификат', '', 'checkbox', True, True, 2),
                ('Модульность', '', 'checkbox', True, True, 3),
                ('Форм-фактор', '', 'checkbox', True, True, 4),
                ('Длина', 'мм', 'range', False, True, 5),
                ('Вентилятор', 'мм', 'range', False, True, 6),
            ],
            'cases': [
                ('Форм-фактор поддержки', '', 'checkbox', True, True, 1),
                ('Макс длина GPU', 'мм', 'range', True, True, 2),
                ('Макс высота кулера', 'мм', 'range', True, True, 3),
                ('Кол-во мест под вентиляторы', '', 'range', True, True, 4),
                ('Боковое окно', '', 'checkbox', True, True, 5),
            ],
            'coolers': [
                ('Тип', '', 'checkbox', True, True, 1),
                ('Совместимые сокеты', '', 'checkbox', True, True, 2),
                ('TDP рассеивания', 'Вт', 'range', True, True, 3),
                ('Размер радиатора', 'мм', 'checkbox', True, True, 4),
                ('Высота', 'мм', 'range', True, True, 5),
                ('Уровень шума', 'дБА', 'range', True, True, 6),
            ],
            'monitors': [
                ('Диагональ', 'дюймов', 'range', True, True, 1),
                ('Разрешение', '', 'checkbox', True, True, 2),
                ('Частота обновления', 'Гц', 'range', True, True, 3),
                ('Тип матрицы', '', 'checkbox', True, True, 4),
                ('Время отклика', 'мс', 'range', True, True, 5),
                ('HDR', '', 'checkbox', True, True, 6),
                ('Интерфейсы', '', 'checkbox', True, True, 7),
                ('Изогнутый экран', '', 'checkbox', True, True, 8),
            ],
            'peripherals': [
                ('Тип устройства', '', 'checkbox', True, True, 1),
                ('Подключение', '', 'checkbox', True, True, 2),
                ('RGB подсветка', '', 'checkbox', True, True, 3),
                ('Игровое', '', 'checkbox', True, True, 4),
                ('Беспроводное', '', 'checkbox', True, True, 5),
            ],
        }

        result = {}
        for cat_slug, specs in specs_map.items():
            cat = categories[cat_slug]
            result[cat_slug] = {}
            for spec_name, unit, filter_type, is_filterable, is_comparable, order in specs:
                sn = SpecificationName.objects.create(
                    name=spec_name,
                    category=cat,
                    unit=unit,
                    filter_type=filter_type,
                    is_filterable=is_filterable,
                    is_comparable=is_comparable,
                    order=order,
                )
                result[cat_slug][spec_name] = sn
        return result

    # ------------------------------------------------------------------
    # Products
    # ------------------------------------------------------------------

    def _create_products(self, categories, brands, spec_names):
        all_products = []

        self.stdout.write('  Creating CPUs...')
        all_products.extend(self._create_cpus(categories, brands, spec_names))

        self.stdout.write('  Creating Motherboards...')
        all_products.extend(self._create_motherboards(categories, brands, spec_names))

        self.stdout.write('  Creating RAM...')
        all_products.extend(self._create_ram(categories, brands, spec_names))

        self.stdout.write('  Creating GPUs...')
        all_products.extend(self._create_gpus(categories, brands, spec_names))

        self.stdout.write('  Creating Storage...')
        all_products.extend(self._create_storage(categories, brands, spec_names))

        self.stdout.write('  Creating PSUs...')
        all_products.extend(self._create_psus(categories, brands, spec_names))

        self.stdout.write('  Creating Cases...')
        all_products.extend(self._create_cases(categories, brands, spec_names))

        self.stdout.write('  Creating Coolers...')
        all_products.extend(self._create_coolers(categories, brands, spec_names))

        self.stdout.write('  Creating Monitors...')
        all_products.extend(self._create_monitors(categories, brands, spec_names))

        self.stdout.write('  Creating Peripherals...')
        all_products.extend(self._create_peripherals(categories, brands, spec_names))

        return all_products

    def _make_product(self, category, brand, name, sku, price, specs_dict, spec_names_map,
                      discount_price=None, short_description='', stock_quantity=None,
                      is_featured=False):
        """Helper to create a Product and its ProductSpecification entries."""
        slug = slugify(name, allow_unicode=True)
        if not slug:
            slug = sku.lower()
        # Ensure unique slug
        base_slug = slug
        counter = 1
        while Product.objects.filter(slug=slug).exists():
            slug = f'{base_slug}-{counter}'
            counter += 1

        if stock_quantity is None:
            stock_quantity = random.randint(3, 50)

        product = Product.objects.create(
            name=name,
            slug=slug,
            sku=sku,
            category=category,
            brand=brand,
            price=Decimal(str(price)),
            discount_price=Decimal(str(discount_price)) if discount_price else None,
            short_description=short_description,
            stock_quantity=stock_quantity,
            is_active=True,
            is_featured=is_featured,
        )

        for spec_key, value in specs_dict.items():
            if spec_key in spec_names_map:
                ProductSpecification.objects.create(
                    product=product,
                    spec_name=spec_names_map[spec_key],
                    value=str(value),
                )

        return product

    # ------------------------------------------------------------------
    # CPUs
    # ------------------------------------------------------------------

    def _create_cpus(self, categories, brands, spec_names):
        cat = categories['cpu']
        sn = spec_names['cpu']
        amd = brands['AMD']
        intel = brands['Intel']
        products = []

        cpus_data = [
            # AMD AM4
            (amd, 'AMD Ryzen 5 5600X', 'CPU-5600X', 2200, {
                'Производитель': 'AMD', 'Серия': 'Ryzen 5', 'Модель': '5600X',
                'Сокет': 'AM4', 'Кол-во ядер': '6', 'Кол-во потоков': '12',
                'Базовая частота': '3.7', 'Турбо частота': '4.6', 'Кэш L3': '32',
                'TDP': '65', 'Встроенная графика': 'Нет', 'Техпроцесс': '7',
            }, 1900, True),
            (amd, 'AMD Ryzen 7 5800X', 'CPU-5800X', 2900, {
                'Производитель': 'AMD', 'Серия': 'Ryzen 7', 'Модель': '5800X',
                'Сокет': 'AM4', 'Кол-во ядер': '8', 'Кол-во потоков': '16',
                'Базовая частота': '3.8', 'Турбо частота': '4.7', 'Кэш L3': '32',
                'TDP': '105', 'Встроенная графика': 'Нет', 'Техпроцесс': '7',
            }, None, False),
            (amd, 'AMD Ryzen 7 5800X3D', 'CPU-5800X3D', 3500, {
                'Производитель': 'AMD', 'Серия': 'Ryzen 7', 'Модель': '5800X3D',
                'Сокет': 'AM4', 'Кол-во ядер': '8', 'Кол-во потоков': '16',
                'Базовая частота': '3.4', 'Турбо частота': '4.5', 'Кэш L3': '96',
                'TDP': '105', 'Встроенная графика': 'Нет', 'Техпроцесс': '7',
            }, 3200, True),
            # AMD AM5
            (amd, 'AMD Ryzen 5 7600X', 'CPU-7600X', 3000, {
                'Производитель': 'AMD', 'Серия': 'Ryzen 5', 'Модель': '7600X',
                'Сокет': 'AM5', 'Кол-во ядер': '6', 'Кол-во потоков': '12',
                'Базовая частота': '4.7', 'Турбо частота': '5.3', 'Кэш L3': '32',
                'TDP': '105', 'Встроенная графика': 'AMD Radeon Graphics', 'Техпроцесс': '5',
            }, 2700, False),
            (amd, 'AMD Ryzen 5 7600', 'CPU-7600', 2600, {
                'Производитель': 'AMD', 'Серия': 'Ryzen 5', 'Модель': '7600',
                'Сокет': 'AM5', 'Кол-во ядер': '6', 'Кол-во потоков': '12',
                'Базовая частота': '3.8', 'Турбо частота': '5.1', 'Кэш L3': '32',
                'TDP': '65', 'Встроенная графика': 'AMD Radeon Graphics', 'Техпроцесс': '5',
            }, None, False),
            (amd, 'AMD Ryzen 7 7700X', 'CPU-7700X', 3800, {
                'Производитель': 'AMD', 'Серия': 'Ryzen 7', 'Модель': '7700X',
                'Сокет': 'AM5', 'Кол-во ядер': '8', 'Кол-во потоков': '16',
                'Базовая частота': '4.5', 'Турбо частота': '5.4', 'Кэш L3': '32',
                'TDP': '105', 'Встроенная графика': 'AMD Radeon Graphics', 'Техпроцесс': '5',
            }, None, False),
            (amd, 'AMD Ryzen 7 7800X3D', 'CPU-7800X3D', 4800, {
                'Производитель': 'AMD', 'Серия': 'Ryzen 7', 'Модель': '7800X3D',
                'Сокет': 'AM5', 'Кол-во ядер': '8', 'Кол-во потоков': '16',
                'Базовая частота': '4.2', 'Турбо частота': '5.0', 'Кэш L3': '96',
                'TDP': '120', 'Встроенная графика': 'AMD Radeon Graphics', 'Техпроцесс': '5',
            }, 4500, True),
            (amd, 'AMD Ryzen 9 7900X', 'CPU-7900X', 5500, {
                'Производитель': 'AMD', 'Серия': 'Ryzen 9', 'Модель': '7900X',
                'Сокет': 'AM5', 'Кол-во ядер': '12', 'Кол-во потоков': '24',
                'Базовая частота': '4.7', 'Турбо частота': '5.6', 'Кэш L3': '64',
                'TDP': '170', 'Встроенная графика': 'AMD Radeon Graphics', 'Техпроцесс': '5',
            }, None, False),
            (amd, 'AMD Ryzen 9 7950X', 'CPU-7950X', 6800, {
                'Производитель': 'AMD', 'Серия': 'Ryzen 9', 'Модель': '7950X',
                'Сокет': 'AM5', 'Кол-во ядер': '16', 'Кол-во потоков': '32',
                'Базовая частота': '4.5', 'Турбо частота': '5.7', 'Кэш L3': '64',
                'TDP': '170', 'Встроенная графика': 'AMD Radeon Graphics', 'Техпроцесс': '5',
            }, None, True),
            # Intel LGA1700
            (intel, 'Intel Core i3-13100F', 'CPU-I3-13100F', 1300, {
                'Производитель': 'Intel', 'Серия': 'Core i3', 'Модель': '13100F',
                'Сокет': 'LGA1700', 'Кол-во ядер': '4', 'Кол-во потоков': '8',
                'Базовая частота': '3.4', 'Турбо частота': '4.5', 'Кэш L3': '12',
                'TDP': '58', 'Встроенная графика': 'Нет', 'Техпроцесс': '10',
            }, None, False),
            (intel, 'Intel Core i5-13400F', 'CPU-I5-13400F', 2100, {
                'Производитель': 'Intel', 'Серия': 'Core i5', 'Модель': '13400F',
                'Сокет': 'LGA1700', 'Кол-во ядер': '10', 'Кол-во потоков': '16',
                'Базовая частота': '2.5', 'Турбо частота': '4.6', 'Кэш L3': '20',
                'TDP': '65', 'Встроенная графика': 'Нет', 'Техпроцесс': '10',
            }, 1900, False),
            (intel, 'Intel Core i5-13600KF', 'CPU-I5-13600KF', 3200, {
                'Производитель': 'Intel', 'Серия': 'Core i5', 'Модель': '13600KF',
                'Сокет': 'LGA1700', 'Кол-во ядер': '14', 'Кол-во потоков': '20',
                'Базовая частота': '3.5', 'Турбо частота': '5.1', 'Кэш L3': '24',
                'TDP': '125', 'Встроенная графика': 'Нет', 'Техпроцесс': '10',
            }, None, False),
            (intel, 'Intel Core i7-13700KF', 'CPU-I7-13700KF', 4200, {
                'Производитель': 'Intel', 'Серия': 'Core i7', 'Модель': '13700KF',
                'Сокет': 'LGA1700', 'Кол-во ядер': '16', 'Кол-во потоков': '24',
                'Базовая частота': '3.4', 'Турбо частота': '5.4', 'Кэш L3': '30',
                'TDP': '125', 'Встроенная графика': 'Нет', 'Техпроцесс': '10',
            }, None, False),
            (intel, 'Intel Core i5-14400F', 'CPU-I5-14400F', 2300, {
                'Производитель': 'Intel', 'Серия': 'Core i5', 'Модель': '14400F',
                'Сокет': 'LGA1700', 'Кол-во ядер': '10', 'Кол-во потоков': '16',
                'Базовая частота': '2.5', 'Турбо частота': '4.7', 'Кэш L3': '20',
                'TDP': '65', 'Встроенная графика': 'Нет', 'Техпроцесс': '10',
            }, None, False),
            (intel, 'Intel Core i5-14600KF', 'CPU-I5-14600KF', 3400, {
                'Производитель': 'Intel', 'Серия': 'Core i5', 'Модель': '14600KF',
                'Сокет': 'LGA1700', 'Кол-во ядер': '14', 'Кол-во потоков': '20',
                'Базовая частота': '3.5', 'Турбо частота': '5.3', 'Кэш L3': '24',
                'TDP': '125', 'Встроенная графика': 'Нет', 'Техпроцесс': '10',
            }, 3100, True),
            (intel, 'Intel Core i7-14700KF', 'CPU-I7-14700KF', 4600, {
                'Производитель': 'Intel', 'Серия': 'Core i7', 'Модель': '14700KF',
                'Сокет': 'LGA1700', 'Кол-во ядер': '20', 'Кол-во потоков': '28',
                'Базовая частота': '3.4', 'Турбо частота': '5.6', 'Кэш L3': '33',
                'TDP': '125', 'Встроенная графика': 'Нет', 'Техпроцесс': '10',
            }, None, True),
            (intel, 'Intel Core i9-14900KF', 'CPU-I9-14900KF', 6500, {
                'Производитель': 'Intel', 'Серия': 'Core i9', 'Модель': '14900KF',
                'Сокет': 'LGA1700', 'Кол-во ядер': '24', 'Кол-во потоков': '32',
                'Базовая частота': '3.2', 'Турбо частота': '6.0', 'Кэш L3': '36',
                'TDP': '125', 'Встроенная графика': 'Нет', 'Техпроцесс': '10',
            }, None, False),
        ]

        for brand_obj, name, sku, price, specs, discount, featured in cpus_data:
            p = self._make_product(
                category=cat, brand=brand_obj, name=name, sku=sku, price=price,
                specs_dict=specs, spec_names_map=sn,
                discount_price=discount,
                short_description=f'{specs["Производитель"]} {specs["Серия"]} процессор, '
                                  f'{specs["Кол-во ядер"]} ядер, {specs["Турбо частота"]} ГГц',
                is_featured=featured,
            )
            products.append(p)

        self.stdout.write(self.style.SUCCESS(f'    {len(products)} CPUs created'))
        return products

    # ------------------------------------------------------------------
    # Motherboards
    # ------------------------------------------------------------------

    def _create_motherboards(self, categories, brands, spec_names):
        cat = categories['motherboards']
        sn = spec_names['motherboards']
        products = []

        mb_data = [
            # AM4 Motherboards
            (brands['ASUS'], 'ASUS PRIME B550M-A', 'MB-ASUS-B550MA', 1100, {
                'Сокет': 'AM4', 'Чипсет': 'B550', 'Форм-фактор': 'mATX',
                'Кол-во слотов RAM': '4', 'Тип памяти': 'DDR4',
                'Макс частота RAM': '4800', 'Макс объём RAM': '128',
                'Слоты M.2': '2', 'Слоты PCIe': '2', 'Wi-Fi': 'Нет', 'Bluetooth': 'Нет',
            }, None, False),
            (brands['MSI'], 'MSI B550-A PRO', 'MB-MSI-B550AP', 1200, {
                'Сокет': 'AM4', 'Чипсет': 'B550', 'Форм-фактор': 'ATX',
                'Кол-во слотов RAM': '4', 'Тип памяти': 'DDR4',
                'Макс частота RAM': '4866', 'Макс объём RAM': '128',
                'Слоты M.2': '2', 'Слоты PCIe': '3', 'Wi-Fi': 'Нет', 'Bluetooth': 'Нет',
            }, None, False),
            (brands['Gigabyte'], 'Gigabyte B550 AORUS Elite V2', 'MB-GB-B550AEV2', 1350, {
                'Сокет': 'AM4', 'Чипсет': 'B550', 'Форм-фактор': 'ATX',
                'Кол-во слотов RAM': '4', 'Тип памяти': 'DDR4',
                'Макс частота RAM': '5200', 'Макс объём RAM': '128',
                'Слоты M.2': '2', 'Слоты PCIe': '3', 'Wi-Fi': 'Нет', 'Bluetooth': 'Нет',
            }, None, False),
            (brands['ASRock'], 'ASRock B550M Steel Legend', 'MB-AR-B550MSL', 1150, {
                'Сокет': 'AM4', 'Чипсет': 'B550', 'Форм-фактор': 'mATX',
                'Кол-во слотов RAM': '4', 'Тип памяти': 'DDR4',
                'Макс частота RAM': '4733', 'Макс объём RAM': '128',
                'Слоты M.2': '2', 'Слоты PCIe': '2', 'Wi-Fi': 'Нет', 'Bluetooth': 'Нет',
            }, None, False),
            (brands['ASUS'], 'ASUS ROG STRIX B550-F GAMING', 'MB-ASUS-B550FG', 1700, {
                'Сокет': 'AM4', 'Чипсет': 'B550', 'Форм-фактор': 'ATX',
                'Кол-во слотов RAM': '4', 'Тип памяти': 'DDR4',
                'Макс частота RAM': '5100', 'Макс объём RAM': '128',
                'Слоты M.2': '2', 'Слоты PCIe': '3', 'Wi-Fi': 'Да', 'Bluetooth': 'Да',
            }, None, True),
            # AM5 Motherboards
            (brands['ASUS'], 'ASUS PRIME B650M-A', 'MB-ASUS-B650MA', 1600, {
                'Сокет': 'AM5', 'Чипсет': 'B650', 'Форм-фактор': 'mATX',
                'Кол-во слотов RAM': '4', 'Тип памяти': 'DDR5',
                'Макс частота RAM': '6400', 'Макс объём RAM': '128',
                'Слоты M.2': '2', 'Слоты PCIe': '2', 'Wi-Fi': 'Нет', 'Bluetooth': 'Нет',
            }, None, False),
            (brands['MSI'], 'MSI MAG B650 TOMAHAWK WIFI', 'MB-MSI-B650TW', 2300, {
                'Сокет': 'AM5', 'Чипсет': 'B650', 'Форм-фактор': 'ATX',
                'Кол-во слотов RAM': '4', 'Тип памяти': 'DDR5',
                'Макс частота RAM': '7200', 'Макс объём RAM': '128',
                'Слоты M.2': '3', 'Слоты PCIe': '3', 'Wi-Fi': 'Да', 'Bluetooth': 'Да',
            }, 2100, True),
            (brands['Gigabyte'], 'Gigabyte B650 AORUS Elite AX', 'MB-GB-B650AEAX', 2100, {
                'Сокет': 'AM5', 'Чипсет': 'B650', 'Форм-фактор': 'ATX',
                'Кол-во слотов RAM': '4', 'Тип памяти': 'DDR5',
                'Макс частота RAM': '7600', 'Макс объём RAM': '128',
                'Слоты M.2': '2', 'Слоты PCIe': '3', 'Wi-Fi': 'Да', 'Bluetooth': 'Да',
            }, None, False),
            (brands['ASRock'], 'ASRock B650M PG Riptide', 'MB-AR-B650MPR', 1500, {
                'Сокет': 'AM5', 'Чипсет': 'B650', 'Форм-фактор': 'mATX',
                'Кол-во слотов RAM': '4', 'Тип памяти': 'DDR5',
                'Макс частота RAM': '7200', 'Макс объём RAM': '128',
                'Слоты M.2': '2', 'Слоты PCIe': '2', 'Wi-Fi': 'Нет', 'Bluetooth': 'Нет',
            }, None, False),
            (brands['ASUS'], 'ASUS ROG STRIX B650E-F GAMING WIFI', 'MB-ASUS-B650EFG', 3000, {
                'Сокет': 'AM5', 'Чипсет': 'B650E', 'Форм-фактор': 'ATX',
                'Кол-во слотов RAM': '4', 'Тип памяти': 'DDR5',
                'Макс частота RAM': '7800', 'Макс объём RAM': '128',
                'Слоты M.2': '3', 'Слоты PCIe': '3', 'Wi-Fi': 'Да', 'Bluetooth': 'Да',
            }, None, True),
            (brands['MSI'], 'MSI MEG X670E ACE', 'MB-MSI-X670EA', 5500, {
                'Сокет': 'AM5', 'Чипсет': 'X670E', 'Форм-фактор': 'ATX',
                'Кол-во слотов RAM': '4', 'Тип памяти': 'DDR5',
                'Макс частота RAM': '7800', 'Макс объём RAM': '128',
                'Слоты M.2': '4', 'Слоты PCIe': '4', 'Wi-Fi': 'Да', 'Bluetooth': 'Да',
            }, None, False),
            # LGA1700 Motherboards
            (brands['ASUS'], 'ASUS PRIME B760M-A', 'MB-ASUS-B760MA', 1400, {
                'Сокет': 'LGA1700', 'Чипсет': 'B760', 'Форм-фактор': 'mATX',
                'Кол-во слотов RAM': '4', 'Тип памяти': 'DDR5',
                'Макс частота RAM': '6400', 'Макс объём RAM': '128',
                'Слоты M.2': '2', 'Слоты PCIe': '2', 'Wi-Fi': 'Нет', 'Bluetooth': 'Нет',
            }, None, False),
            (brands['MSI'], 'MSI PRO B760M-A WIFI DDR4', 'MB-MSI-B760MWD4', 1300, {
                'Сокет': 'LGA1700', 'Чипсет': 'B760', 'Форм-фактор': 'mATX',
                'Кол-во слотов RAM': '4', 'Тип памяти': 'DDR4',
                'Макс частота RAM': '4800', 'Макс объём RAM': '128',
                'Слоты M.2': '2', 'Слоты PCIe': '2', 'Wi-Fi': 'Да', 'Bluetooth': 'Да',
            }, None, False),
            (brands['Gigabyte'], 'Gigabyte B760 AORUS Elite AX DDR4', 'MB-GB-B760AEAXD4', 1700, {
                'Сокет': 'LGA1700', 'Чипсет': 'B760', 'Форм-фактор': 'ATX',
                'Кол-во слотов RAM': '4', 'Тип памяти': 'DDR4',
                'Макс частота RAM': '5333', 'Макс объём RAM': '128',
                'Слоты M.2': '3', 'Слоты PCIe': '3', 'Wi-Fi': 'Да', 'Bluetooth': 'Да',
            }, None, False),
            (brands['MSI'], 'MSI MAG Z790 TOMAHAWK WIFI', 'MB-MSI-Z790TW', 3200, {
                'Сокет': 'LGA1700', 'Чипсет': 'Z790', 'Форм-фактор': 'ATX',
                'Кол-во слотов RAM': '4', 'Тип памяти': 'DDR5',
                'Макс частота RAM': '7600', 'Макс объём RAM': '128',
                'Слоты M.2': '4', 'Слоты PCIe': '4', 'Wi-Fi': 'Да', 'Bluetooth': 'Да',
            }, 2900, True),
            (brands['ASUS'], 'ASUS ROG STRIX Z790-E GAMING WIFI', 'MB-ASUS-Z790EG', 4500, {
                'Сокет': 'LGA1700', 'Чипсет': 'Z790', 'Форм-фактор': 'ATX',
                'Кол-во слотов RAM': '4', 'Тип памяти': 'DDR5',
                'Макс частота RAM': '7800', 'Макс объём RAM': '128',
                'Слоты M.2': '4', 'Слоты PCIe': '4', 'Wi-Fi': 'Да', 'Bluetooth': 'Да',
            }, None, True),
            (brands['Gigabyte'], 'Gigabyte Z790 AORUS Master', 'MB-GB-Z790AM', 5000, {
                'Сокет': 'LGA1700', 'Чипсет': 'Z790', 'Форм-фактор': 'ATX',
                'Кол-во слотов RAM': '4', 'Тип памяти': 'DDR5',
                'Макс частота RAM': '8000', 'Макс объём RAM': '128',
                'Слоты M.2': '4', 'Слоты PCIe': '4', 'Wi-Fi': 'Да', 'Bluetooth': 'Да',
            }, None, False),
            (brands['ASRock'], 'ASRock B660M-HDV', 'MB-AR-B660MHDV', 900, {
                'Сокет': 'LGA1700', 'Чипсет': 'B660', 'Форм-фактор': 'mATX',
                'Кол-во слотов RAM': '2', 'Тип памяти': 'DDR4',
                'Макс частота RAM': '4800', 'Макс объём RAM': '64',
                'Слоты M.2': '1', 'Слоты PCIe': '2', 'Wi-Fi': 'Нет', 'Bluetooth': 'Нет',
            }, None, False),
        ]

        for brand_obj, name, sku, price, specs, discount, featured in mb_data:
            p = self._make_product(
                category=cat, brand=brand_obj, name=name, sku=sku, price=price,
                specs_dict=specs, spec_names_map=sn,
                discount_price=discount,
                short_description=f'{specs["Чипсет"]} {specs["Форм-фактор"]}, '
                                  f'{specs["Тип памяти"]}, {specs["Сокет"]}',
                is_featured=featured,
            )
            products.append(p)

        self.stdout.write(self.style.SUCCESS(f'    {len(products)} Motherboards created'))
        return products

    # ------------------------------------------------------------------
    # RAM
    # ------------------------------------------------------------------

    def _create_ram(self, categories, brands, spec_names):
        cat = categories['ram']
        sn = spec_names['ram']
        products = []

        ram_data = [
            # DDR4
            (brands['Corsair'], 'Corsair Vengeance LPX 16GB (2x8GB) DDR4-3200', 'RAM-COR-V16D4-3200', 550, {
                'Тип': 'DDR4', 'Объём': '16', 'Частота': '3200',
                'Кол-во модулей': '2', 'Тайминги': 'CL16-20-20-38',
                'Радиатор': 'Да', 'RGB': 'Нет',
            }, None, True),
            (brands['Corsair'], 'Corsair Vengeance LPX 32GB (2x16GB) DDR4-3200', 'RAM-COR-V32D4-3200', 1000, {
                'Тип': 'DDR4', 'Объём': '32', 'Частота': '3200',
                'Кол-во модулей': '2', 'Тайминги': 'CL16-20-20-38',
                'Радиатор': 'Да', 'RGB': 'Нет',
            }, None, False),
            (brands['Kingston'], 'Kingston FURY Beast 16GB (2x8GB) DDR4-3200', 'RAM-KIN-FB16D4-3200', 500, {
                'Тип': 'DDR4', 'Объём': '16', 'Частота': '3200',
                'Кол-во модулей': '2', 'Тайминги': 'CL16-18-18-36',
                'Радиатор': 'Да', 'RGB': 'Нет',
            }, None, False),
            (brands['Kingston'], 'Kingston FURY Beast 32GB (2x16GB) DDR4-3600', 'RAM-KIN-FB32D4-3600', 1100, {
                'Тип': 'DDR4', 'Объём': '32', 'Частота': '3600',
                'Кол-во модулей': '2', 'Тайминги': 'CL18-22-22-42',
                'Радиатор': 'Да', 'RGB': 'Нет',
            }, None, False),
            (brands['G.Skill'], 'G.Skill Trident Z RGB 16GB (2x8GB) DDR4-3600', 'RAM-GSK-TZ16D4-3600', 700, {
                'Тип': 'DDR4', 'Объём': '16', 'Частота': '3600',
                'Кол-во модулей': '2', 'Тайминги': 'CL18-22-22-42',
                'Радиатор': 'Да', 'RGB': 'Да',
            }, None, True),
            (brands['G.Skill'], 'G.Skill Trident Z RGB 32GB (2x16GB) DDR4-3600', 'RAM-GSK-TZ32D4-3600', 1200, {
                'Тип': 'DDR4', 'Объём': '32', 'Частота': '3600',
                'Кол-во модулей': '2', 'Тайминги': 'CL18-22-22-42',
                'Радиатор': 'Да', 'RGB': 'Да',
            }, None, False),
            (brands['Corsair'], 'Corsair Vengeance LPX 8GB (1x8GB) DDR4-3200', 'RAM-COR-V8D4-3200', 300, {
                'Тип': 'DDR4', 'Объём': '8', 'Частота': '3200',
                'Кол-во модулей': '1', 'Тайминги': 'CL16-20-20-38',
                'Радиатор': 'Да', 'RGB': 'Нет',
            }, None, False),
            # DDR5
            (brands['Corsair'], 'Corsair Vengeance 32GB (2x16GB) DDR5-5600', 'RAM-COR-V32D5-5600', 1200, {
                'Тип': 'DDR5', 'Объём': '32', 'Частота': '5600',
                'Кол-во модулей': '2', 'Тайминги': 'CL36-36-36-76',
                'Радиатор': 'Да', 'RGB': 'Нет',
            }, None, True),
            (brands['Corsair'], 'Corsair Vengeance RGB 32GB (2x16GB) DDR5-6000', 'RAM-COR-VR32D5-6000', 1500, {
                'Тип': 'DDR5', 'Объём': '32', 'Частота': '6000',
                'Кол-во модулей': '2', 'Тайминги': 'CL30-36-36-76',
                'Радиатор': 'Да', 'RGB': 'Да',
            }, 1350, True),
            (brands['Kingston'], 'Kingston FURY Beast 32GB (2x16GB) DDR5-5600', 'RAM-KIN-FB32D5-5600', 1100, {
                'Тип': 'DDR5', 'Объём': '32', 'Частота': '5600',
                'Кол-во модулей': '2', 'Тайминги': 'CL36-38-38-80',
                'Радиатор': 'Да', 'RGB': 'Нет',
            }, None, False),
            (brands['Kingston'], 'Kingston FURY Beast RGB 32GB (2x16GB) DDR5-6000', 'RAM-KIN-FBR32D5-6000', 1400, {
                'Тип': 'DDR5', 'Объём': '32', 'Частота': '6000',
                'Кол-во модулей': '2', 'Тайминги': 'CL30-36-36-76',
                'Радиатор': 'Да', 'RGB': 'Да',
            }, None, False),
            (brands['G.Skill'], 'G.Skill Trident Z5 RGB 32GB (2x16GB) DDR5-6000', 'RAM-GSK-TZ5R32D5-6000', 1600, {
                'Тип': 'DDR5', 'Объём': '32', 'Частота': '6000',
                'Кол-во модулей': '2', 'Тайминги': 'CL30-38-38-96',
                'Радиатор': 'Да', 'RGB': 'Да',
            }, None, True),
            (brands['G.Skill'], 'G.Skill Trident Z5 RGB 64GB (2x32GB) DDR5-6400', 'RAM-GSK-TZ5R64D5-6400', 3200, {
                'Тип': 'DDR5', 'Объём': '64', 'Частота': '6400',
                'Кол-во модулей': '2', 'Тайминги': 'CL32-39-39-102',
                'Радиатор': 'Да', 'RGB': 'Да',
            }, None, False),
            (brands['Corsair'], 'Corsair Dominator Platinum RGB 64GB (2x32GB) DDR5-6400', 'RAM-COR-DP64D5-6400', 3500, {
                'Тип': 'DDR5', 'Объём': '64', 'Частота': '6400',
                'Кол-во модулей': '2', 'Тайминги': 'CL32-38-38-96',
                'Радиатор': 'Да', 'RGB': 'Да',
            }, None, False),
            (brands['Kingston'], 'Kingston FURY Beast 16GB (2x8GB) DDR5-5600', 'RAM-KIN-FB16D5-5600', 600, {
                'Тип': 'DDR5', 'Объём': '16', 'Частота': '5600',
                'Кол-во модулей': '2', 'Тайминги': 'CL36-38-38-80',
                'Радиатор': 'Да', 'RGB': 'Нет',
            }, None, False),
        ]

        for brand_obj, name, sku, price, specs, discount, featured in ram_data:
            p = self._make_product(
                category=cat, brand=brand_obj, name=name, sku=sku, price=price,
                specs_dict=specs, spec_names_map=sn,
                discount_price=discount,
                short_description=f'{specs["Тип"]} {specs["Объём"]}ГБ {specs["Частота"]}МГц ({specs["Кол-во модулей"]} мод.)',
                is_featured=featured,
            )
            products.append(p)

        self.stdout.write(self.style.SUCCESS(f'    {len(products)} RAM modules created'))
        return products

    # ------------------------------------------------------------------
    # GPUs
    # ------------------------------------------------------------------

    def _create_gpus(self, categories, brands, spec_names):
        cat = categories['gpu']
        sn = spec_names['gpu']
        products = []

        gpus_data = [
            # NVIDIA RTX 30 series
            (brands['MSI'], 'MSI GeForce RTX 3060 VENTUS 2X 12G OC', 'GPU-MSI-3060V2X', 3500, {
                'GPU': 'GeForce RTX 3060', 'Объём видеопамяти': '12', 'Тип памяти': 'GDDR6',
                'Шина памяти': '192', 'Базовая частота': '1320', 'Boost частота': '1807',
                'TDP': '170', 'Доп. питание': '1x 8-pin', 'Длина': '235', 'Кол-во вентиляторов': '2',
            }, 3200, False),
            (brands['Gigabyte'], 'Gigabyte GeForce RTX 3070 GAMING OC 8G', 'GPU-GB-3070GOC', 4500, {
                'GPU': 'GeForce RTX 3070', 'Объём видеопамяти': '8', 'Тип памяти': 'GDDR6',
                'Шина памяти': '256', 'Базовая частота': '1500', 'Boost частота': '1815',
                'TDP': '220', 'Доп. питание': '2x 8-pin', 'Длина': '286', 'Кол-во вентиляторов': '3',
            }, None, False),
            # NVIDIA RTX 40 series
            (brands['ASUS'], 'ASUS Dual GeForce RTX 4060 OC 8GB', 'GPU-ASUS-4060D', 3800, {
                'GPU': 'GeForce RTX 4060', 'Объём видеопамяти': '8', 'Тип памяти': 'GDDR6',
                'Шина памяти': '128', 'Базовая частота': '1830', 'Boost частота': '2535',
                'TDP': '115', 'Доп. питание': '1x 8-pin', 'Длина': '240', 'Кол-во вентиляторов': '2',
            }, None, True),
            (brands['MSI'], 'MSI GeForce RTX 4060 Ti VENTUS 2X 8G OC', 'GPU-MSI-4060TiV', 4800, {
                'GPU': 'GeForce RTX 4060 Ti', 'Объём видеопамяти': '8', 'Тип памяти': 'GDDR6',
                'Шина памяти': '128', 'Базовая частота': '2310', 'Boost частота': '2580',
                'TDP': '160', 'Доп. питание': '1x 8-pin', 'Длина': '251', 'Кол-во вентиляторов': '2',
            }, 4500, False),
            (brands['Gigabyte'], 'Gigabyte GeForce RTX 4060 Ti GAMING OC 8G', 'GPU-GB-4060TiGOC', 5000, {
                'GPU': 'GeForce RTX 4060 Ti', 'Объём видеопамяти': '8', 'Тип памяти': 'GDDR6',
                'Шина памяти': '128', 'Базовая частота': '2310', 'Boost частота': '2595',
                'TDP': '160', 'Доп. питание': '1x 8-pin', 'Длина': '281', 'Кол-во вентиляторов': '3',
            }, None, False),
            (brands['ASUS'], 'ASUS TUF Gaming GeForce RTX 4070 OC 12GB', 'GPU-ASUS-4070TUF', 6500, {
                'GPU': 'GeForce RTX 4070', 'Объём видеопамяти': '12', 'Тип памяти': 'GDDR6X',
                'Шина памяти': '192', 'Базовая частота': '1920', 'Boost частота': '2550',
                'TDP': '200', 'Доп. питание': '1x 8-pin', 'Длина': '301', 'Кол-во вентиляторов': '3',
            }, None, True),
            (brands['MSI'], 'MSI GeForce RTX 4070 SUPER VENTUS 2X OC', 'GPU-MSI-4070SV', 7200, {
                'GPU': 'GeForce RTX 4070 Super', 'Объём видеопамяти': '12', 'Тип памяти': 'GDDR6X',
                'Шина памяти': '192', 'Базовая частота': '1980', 'Boost частота': '2565',
                'TDP': '220', 'Доп. питание': '1x 16-pin', 'Длина': '242', 'Кол-во вентиляторов': '2',
            }, 6800, True),
            (brands['Gigabyte'], 'Gigabyte GeForce RTX 4070 Ti SUPER GAMING OC', 'GPU-GB-4070TiSGOC', 9500, {
                'GPU': 'GeForce RTX 4070 Ti Super', 'Объём видеопамяти': '16', 'Тип памяти': 'GDDR6X',
                'Шина памяти': '256', 'Базовая частота': '2340', 'Boost частота': '2640',
                'TDP': '285', 'Доп. питание': '1x 16-pin', 'Длина': '332', 'Кол-во вентиляторов': '3',
            }, None, False),
            (brands['ASUS'], 'ASUS ROG STRIX GeForce RTX 4070 Ti SUPER OC', 'GPU-ASUS-4070TiSROG', 10500, {
                'GPU': 'GeForce RTX 4070 Ti Super', 'Объём видеопамяти': '16', 'Тип памяти': 'GDDR6X',
                'Шина памяти': '256', 'Базовая частота': '2340', 'Boost частота': '2670',
                'TDP': '285', 'Доп. питание': '1x 16-pin', 'Длина': '336', 'Кол-во вентиляторов': '3',
            }, None, True),
            (brands['MSI'], 'MSI GeForce RTX 4080 SUPER GAMING X TRIO', 'GPU-MSI-4080SGXT', 13000, {
                'GPU': 'GeForce RTX 4080 Super', 'Объём видеопамяти': '16', 'Тип памяти': 'GDDR6X',
                'Шина памяти': '256', 'Базовая частота': '2295', 'Boost частота': '2610',
                'TDP': '320', 'Доп. питание': '1x 16-pin', 'Длина': '337', 'Кол-во вентиляторов': '3',
            }, 12500, False),
            (brands['ASUS'], 'ASUS ROG STRIX GeForce RTX 4090 OC 24GB', 'GPU-ASUS-4090ROG', 22000, {
                'GPU': 'GeForce RTX 4090', 'Объём видеопамяти': '24', 'Тип памяти': 'GDDR6X',
                'Шина памяти': '384', 'Базовая частота': '2235', 'Boost частота': '2640',
                'TDP': '450', 'Доп. питание': '1x 16-pin', 'Длина': '358', 'Кол-во вентиляторов': '3',
            }, None, True),
            (brands['MSI'], 'MSI GeForce RTX 4090 SUPRIM X 24G', 'GPU-MSI-4090SX', 21000, {
                'GPU': 'GeForce RTX 4090', 'Объём видеопамяти': '24', 'Тип памяти': 'GDDR6X',
                'Шина памяти': '384', 'Базовая частота': '2235', 'Boost частота': '2625',
                'TDP': '450', 'Доп. питание': '1x 16-pin', 'Длина': '340', 'Кол-во вентиляторов': '3',
            }, None, False),
            # AMD Radeon
            (brands['MSI'], 'MSI Radeon RX 7600 MECH 2X 8G', 'GPU-MSI-7600M', 3200, {
                'GPU': 'Radeon RX 7600', 'Объём видеопамяти': '8', 'Тип памяти': 'GDDR6',
                'Шина памяти': '128', 'Базовая частота': '1720', 'Boost частота': '2655',
                'TDP': '165', 'Доп. питание': '1x 8-pin', 'Длина': '242', 'Кол-во вентиляторов': '2',
            }, None, False),
            (brands['Gigabyte'], 'Gigabyte Radeon RX 7700 XT GAMING OC 12G', 'GPU-GB-7700XTGOC', 5000, {
                'GPU': 'Radeon RX 7700 XT', 'Объём видеопамяти': '12', 'Тип памяти': 'GDDR6',
                'Шина памяти': '192', 'Базовая частота': '1800', 'Boost частота': '2599',
                'TDP': '245', 'Доп. питание': '2x 8-pin', 'Длина': '302', 'Кол-во вентиляторов': '3',
            }, None, False),
            (brands['ASUS'], 'ASUS TUF Gaming Radeon RX 7800 XT OC 16GB', 'GPU-ASUS-7800XTTUF', 5800, {
                'GPU': 'Radeon RX 7800 XT', 'Объём видеопамяти': '16', 'Тип памяти': 'GDDR6',
                'Шина памяти': '256', 'Базовая частота': '1295', 'Boost частота': '2565',
                'TDP': '263', 'Доп. питание': '2x 8-pin', 'Длина': '322', 'Кол-во вентиляторов': '3',
            }, 5500, True),
            (brands['MSI'], 'MSI Radeon RX 7900 XT GAMING TRIO CLASSIC 20G', 'GPU-MSI-7900XTGTC', 8800, {
                'GPU': 'Radeon RX 7900 XT', 'Объём видеопамяти': '20', 'Тип памяти': 'GDDR6',
                'Шина памяти': '320', 'Базовая частота': '1500', 'Boost частота': '2500',
                'TDP': '315', 'Доп. питание': '2x 8-pin', 'Длина': '325', 'Кол-во вентиляторов': '3',
            }, None, False),
            (brands['ASUS'], 'ASUS TUF Gaming Radeon RX 7900 XTX OC 24GB', 'GPU-ASUS-7900XTXTUF', 11000, {
                'GPU': 'Radeon RX 7900 XTX', 'Объём видеопамяти': '24', 'Тип памяти': 'GDDR6',
                'Шина памяти': '384', 'Базовая частота': '1500', 'Boost частота': '2615',
                'TDP': '355', 'Доп. питание': '2x 8-pin', 'Длина': '348', 'Кол-во вентиляторов': '3',
            }, None, False),
        ]

        for brand_obj, name, sku, price, specs, discount, featured in gpus_data:
            p = self._make_product(
                category=cat, brand=brand_obj, name=name, sku=sku, price=price,
                specs_dict=specs, spec_names_map=sn,
                discount_price=discount,
                short_description=f'{specs["GPU"]}, {specs["Объём видеопамяти"]}ГБ {specs["Тип памяти"]}',
                is_featured=featured,
            )
            products.append(p)

        self.stdout.write(self.style.SUCCESS(f'    {len(products)} GPUs created'))
        return products

    # ------------------------------------------------------------------
    # Storage
    # ------------------------------------------------------------------

    def _create_storage(self, categories, brands, spec_names):
        cat = categories['storage']
        sn = spec_names['storage']
        products = []

        storage_data = [
            # M.2 NVMe SSDs
            (brands['Samsung'], 'Samsung 970 EVO Plus 500GB M.2 NVMe', 'SSD-SAM-970EP-500', 600, {
                'Тип': 'SSD', 'Форм-фактор': 'M.2', 'Интерфейс': 'NVMe',
                'Объём': '500', 'Скорость чтения': '3500', 'Скорость записи': '3200',
            }, None, False),
            (brands['Samsung'], 'Samsung 970 EVO Plus 1TB M.2 NVMe', 'SSD-SAM-970EP-1T', 900, {
                'Тип': 'SSD', 'Форм-фактор': 'M.2', 'Интерфейс': 'NVMe',
                'Объём': '1000', 'Скорость чтения': '3500', 'Скорость записи': '3300',
            }, None, False),
            (brands['Samsung'], 'Samsung 980 PRO 1TB M.2 NVMe', 'SSD-SAM-980P-1T', 1200, {
                'Тип': 'SSD', 'Форм-фактор': 'M.2', 'Интерфейс': 'NVMe',
                'Объём': '1000', 'Скорость чтения': '7000', 'Скорость записи': '5100',
            }, 1100, True),
            (brands['Samsung'], 'Samsung 980 PRO 2TB M.2 NVMe', 'SSD-SAM-980P-2T', 2200, {
                'Тип': 'SSD', 'Форм-фактор': 'M.2', 'Интерфейс': 'NVMe',
                'Объём': '2000', 'Скорость чтения': '7000', 'Скорость записи': '5100',
            }, None, False),
            (brands['Samsung'], 'Samsung 990 PRO 1TB M.2 NVMe', 'SSD-SAM-990P-1T', 1400, {
                'Тип': 'SSD', 'Форм-фактор': 'M.2', 'Интерфейс': 'NVMe',
                'Объём': '1000', 'Скорость чтения': '7450', 'Скорость записи': '6900',
            }, None, True),
            (brands['Samsung'], 'Samsung 990 PRO 2TB M.2 NVMe', 'SSD-SAM-990P-2T', 2500, {
                'Тип': 'SSD', 'Форм-фактор': 'M.2', 'Интерфейс': 'NVMe',
                'Объём': '2000', 'Скорость чтения': '7450', 'Скорость записи': '6900',
            }, None, False),
            (brands['Kingston'], 'Kingston NV2 500GB M.2 NVMe', 'SSD-KIN-NV2-500', 400, {
                'Тип': 'SSD', 'Форм-фактор': 'M.2', 'Интерфейс': 'NVMe',
                'Объём': '500', 'Скорость чтения': '3500', 'Скорость записи': '2100',
            }, None, False),
            (brands['Kingston'], 'Kingston NV2 1TB M.2 NVMe', 'SSD-KIN-NV2-1T', 700, {
                'Тип': 'SSD', 'Форм-фактор': 'M.2', 'Интерфейс': 'NVMe',
                'Объём': '1000', 'Скорость чтения': '3500', 'Скорость записи': '2100',
            }, 650, True),
            (brands['Kingston'], 'Kingston NV2 2TB M.2 NVMe', 'SSD-KIN-NV2-2T', 1300, {
                'Тип': 'SSD', 'Форм-фактор': 'M.2', 'Интерфейс': 'NVMe',
                'Объём': '2000', 'Скорость чтения': '3500', 'Скорость записи': '2800',
            }, None, False),
            (brands['Western Digital'], 'WD Blue SN580 1TB M.2 NVMe', 'SSD-WD-SN580-1T', 750, {
                'Тип': 'SSD', 'Форм-фактор': 'M.2', 'Интерфейс': 'NVMe',
                'Объём': '1000', 'Скорость чтения': '4150', 'Скорость записи': '4150',
            }, None, False),
            (brands['Western Digital'], 'WD Black SN770 1TB M.2 NVMe', 'SSD-WD-SN770-1T', 950, {
                'Тип': 'SSD', 'Форм-фактор': 'M.2', 'Интерфейс': 'NVMe',
                'Объём': '1000', 'Скорость чтения': '5150', 'Скорость записи': '4900',
            }, None, False),
            (brands['Western Digital'], 'WD Black SN850X 1TB M.2 NVMe', 'SSD-WD-SN850X-1T', 1200, {
                'Тип': 'SSD', 'Форм-фактор': 'M.2', 'Интерфейс': 'NVMe',
                'Объём': '1000', 'Скорость чтения': '7300', 'Скорость записи': '6300',
            }, None, True),
            # SATA SSDs
            (brands['Samsung'], 'Samsung 870 EVO 500GB 2.5" SATA', 'SSD-SAM-870E-500', 500, {
                'Тип': 'SSD', 'Форм-фактор': '2.5"', 'Интерфейс': 'SATA',
                'Объём': '500', 'Скорость чтения': '560', 'Скорость записи': '530',
            }, None, False),
            (brands['Samsung'], 'Samsung 870 EVO 1TB 2.5" SATA', 'SSD-SAM-870E-1T', 800, {
                'Тип': 'SSD', 'Форм-фактор': '2.5"', 'Интерфейс': 'SATA',
                'Объём': '1000', 'Скорость чтения': '560', 'Скорость записи': '530',
            }, None, False),
            (brands['Kingston'], 'Kingston A400 480GB 2.5" SATA', 'SSD-KIN-A400-480', 350, {
                'Тип': 'SSD', 'Форм-фактор': '2.5"', 'Интерфейс': 'SATA',
                'Объём': '480', 'Скорость чтения': '500', 'Скорость записи': '450',
            }, None, False),
            # HDDs
            (brands['Seagate'], 'Seagate Barracuda 1TB 3.5" 7200rpm', 'HDD-SEA-BAR-1T', 450, {
                'Тип': 'HDD', 'Форм-фактор': '3.5"', 'Интерфейс': 'SATA',
                'Объём': '1000', 'Скорость чтения': '210', 'Скорость записи': '210',
            }, None, False),
            (brands['Seagate'], 'Seagate Barracuda 2TB 3.5" 7200rpm', 'HDD-SEA-BAR-2T', 650, {
                'Тип': 'HDD', 'Форм-фактор': '3.5"', 'Интерфейс': 'SATA',
                'Объём': '2000', 'Скорость чтения': '220', 'Скорость записи': '220',
            }, None, False),
            (brands['Western Digital'], 'WD Blue 1TB 3.5" 7200rpm', 'HDD-WD-BLUE-1T', 430, {
                'Тип': 'HDD', 'Форм-фактор': '3.5"', 'Интерфейс': 'SATA',
                'Объём': '1000', 'Скорость чтения': '175', 'Скорость записи': '175',
            }, None, False),
            (brands['Western Digital'], 'WD Blue 2TB 3.5" 7200rpm', 'HDD-WD-BLUE-2T', 620, {
                'Тип': 'HDD', 'Форм-фактор': '3.5"', 'Интерфейс': 'SATA',
                'Объём': '2000', 'Скорость чтения': '175', 'Скорость записи': '175',
            }, None, False),
        ]

        for brand_obj, name, sku, price, specs, discount, featured in storage_data:
            p = self._make_product(
                category=cat, brand=brand_obj, name=name, sku=sku, price=price,
                specs_dict=specs, spec_names_map=sn,
                discount_price=discount,
                short_description=f'{specs["Тип"]} {specs["Форм-фактор"]} {specs["Объём"]}ГБ {specs["Интерфейс"]}',
                is_featured=featured,
            )
            products.append(p)

        self.stdout.write(self.style.SUCCESS(f'    {len(products)} Storage devices created'))
        return products

    # ------------------------------------------------------------------
    # PSUs
    # ------------------------------------------------------------------

    def _create_psus(self, categories, brands, spec_names):
        cat = categories['psu']
        sn = spec_names['psu']
        products = []

        psu_data = [
            (brands['Corsair'], 'Corsair RM650 650W 80+ Gold', 'PSU-COR-RM650', 900, {
                'Мощность': '650', 'Сертификат': '80 Plus Gold', 'Модульность': 'Полная',
                'Форм-фактор': 'ATX', 'Длина': '160', 'Вентилятор': '135',
            }, None, False),
            (brands['Corsair'], 'Corsair RM750 750W 80+ Gold', 'PSU-COR-RM750', 1050, {
                'Мощность': '750', 'Сертификат': '80 Plus Gold', 'Модульность': 'Полная',
                'Форм-фактор': 'ATX', 'Длина': '160', 'Вентилятор': '135',
            }, None, True),
            (brands['Corsair'], 'Corsair RM850 850W 80+ Gold', 'PSU-COR-RM850', 1250, {
                'Мощность': '850', 'Сертификат': '80 Plus Gold', 'Модульность': 'Полная',
                'Форм-фактор': 'ATX', 'Длина': '160', 'Вентилятор': '135',
            }, 1150, True),
            (brands['Corsair'], 'Corsair RM1000 1000W 80+ Gold', 'PSU-COR-RM1000', 1700, {
                'Мощность': '1000', 'Сертификат': '80 Plus Gold', 'Модульность': 'Полная',
                'Форм-фактор': 'ATX', 'Длина': '160', 'Вентилятор': '135',
            }, None, False),
            (brands['be quiet!'], 'be quiet! Pure Power 12 M 650W', 'PSU-BQ-PP12M-650', 850, {
                'Мощность': '650', 'Сертификат': '80 Plus Gold', 'Модульность': 'Полная',
                'Форм-фактор': 'ATX', 'Длина': '160', 'Вентилятор': '120',
            }, None, False),
            (brands['be quiet!'], 'be quiet! Pure Power 12 M 750W', 'PSU-BQ-PP12M-750', 1000, {
                'Мощность': '750', 'Сертификат': '80 Plus Gold', 'Модульность': 'Полная',
                'Форм-фактор': 'ATX', 'Длина': '160', 'Вентилятор': '120',
            }, None, False),
            (brands['be quiet!'], 'be quiet! Pure Power 12 M 850W', 'PSU-BQ-PP12M-850', 1200, {
                'Мощность': '850', 'Сертификат': '80 Plus Gold', 'Модульность': 'Полная',
                'Форм-фактор': 'ATX', 'Длина': '160', 'Вентилятор': '120',
            }, None, False),
            (brands['be quiet!'], 'be quiet! Straight Power 12 1000W', 'PSU-BQ-SP12-1000', 2000, {
                'Мощность': '1000', 'Сертификат': '80 Plus Platinum', 'Модульность': 'Полная',
                'Форм-фактор': 'ATX', 'Длина': '170', 'Вентилятор': '135',
            }, None, True),
            (brands['Thermaltake'], 'Thermaltake Toughpower GF3 750W', 'PSU-TT-TGF3-750', 950, {
                'Мощность': '750', 'Сертификат': '80 Plus Gold', 'Модульность': 'Полная',
                'Форм-фактор': 'ATX', 'Длина': '150', 'Вентилятор': '120',
            }, None, False),
            (brands['Thermaltake'], 'Thermaltake Toughpower GF3 850W', 'PSU-TT-TGF3-850', 1150, {
                'Мощность': '850', 'Сертификат': '80 Plus Gold', 'Модульность': 'Полная',
                'Форм-фактор': 'ATX', 'Длина': '150', 'Вентилятор': '120',
            }, None, False),
            (brands['Thermaltake'], 'Thermaltake Toughpower GF3 1200W', 'PSU-TT-TGF3-1200', 2200, {
                'Мощность': '1200', 'Сертификат': '80 Plus Gold', 'Модульность': 'Полная',
                'Форм-фактор': 'ATX', 'Длина': '180', 'Вентилятор': '140',
            }, None, False),
            (brands['Corsair'], 'Corsair CV550 550W 80+ Bronze', 'PSU-COR-CV550', 550, {
                'Мощность': '550', 'Сертификат': '80 Plus Bronze', 'Модульность': 'Нет',
                'Форм-фактор': 'ATX', 'Длина': '140', 'Вентилятор': '120',
            }, None, False),
            (brands['Corsair'], 'Corsair CV650 650W 80+ Bronze', 'PSU-COR-CV650', 650, {
                'Мощность': '650', 'Сертификат': '80 Plus Bronze', 'Модульность': 'Нет',
                'Форм-фактор': 'ATX', 'Длина': '140', 'Вентилятор': '120',
            }, None, False),
            (brands['Cooler Master'], 'Cooler Master MWE Gold 750 V2', 'PSU-CM-MWE750G2', 900, {
                'Мощность': '750', 'Сертификат': '80 Plus Gold', 'Модульность': 'Полная',
                'Форм-фактор': 'ATX', 'Длина': '160', 'Вентилятор': '120',
            }, None, False),
            (brands['Deepcool'], 'Deepcool PQ750M 750W 80+ Gold', 'PSU-DC-PQ750M', 800, {
                'Мощность': '750', 'Сертификат': '80 Plus Gold', 'Модульность': 'Полная',
                'Форм-фактор': 'ATX', 'Длина': '160', 'Вентилятор': '120',
            }, None, False),
        ]

        for brand_obj, name, sku, price, specs, discount, featured in psu_data:
            p = self._make_product(
                category=cat, brand=brand_obj, name=name, sku=sku, price=price,
                specs_dict=specs, spec_names_map=sn,
                discount_price=discount,
                short_description=f'{specs["Мощность"]}Вт, {specs["Сертификат"]}, {specs["Модульность"]}',
                is_featured=featured,
            )
            products.append(p)

        self.stdout.write(self.style.SUCCESS(f'    {len(products)} PSUs created'))
        return products

    # ------------------------------------------------------------------
    # Cases
    # ------------------------------------------------------------------

    def _create_cases(self, categories, brands, spec_names):
        cat = categories['cases']
        sn = spec_names['cases']
        products = []

        cases_data = [
            (brands['NZXT'], 'NZXT H5 Flow', 'CASE-NZXT-H5F', 1000, {
                'Форм-фактор поддержки': 'ATX, mATX, Mini-ITX',
                'Макс длина GPU': '365', 'Макс высота кулера': '165',
                'Кол-во мест под вентиляторы': '7', 'Боковое окно': 'Закалённое стекло',
            }, None, True),
            (brands['NZXT'], 'NZXT H7 Flow', 'CASE-NZXT-H7F', 1400, {
                'Форм-фактор поддержки': 'ATX, mATX, Mini-ITX',
                'Макс длина GPU': '400', 'Макс высота кулера': '185',
                'Кол-во мест под вентиляторы': '10', 'Боковое окно': 'Закалённое стекло',
            }, None, True),
            (brands['NZXT'], 'NZXT H5 Elite', 'CASE-NZXT-H5E', 1200, {
                'Форм-фактор поддержки': 'ATX, mATX, Mini-ITX',
                'Макс длина GPU': '365', 'Макс высота кулера': '165',
                'Кол-во мест под вентиляторы': '7', 'Боковое окно': 'Закалённое стекло',
            }, None, False),
            (brands['Corsair'], 'Corsair 4000D Airflow', 'CASE-COR-4000DA', 1100, {
                'Форм-фактор поддержки': 'ATX, mATX, Mini-ITX',
                'Макс длина GPU': '360', 'Макс высота кулера': '170',
                'Кол-во мест под вентиляторы': '10', 'Боковое окно': 'Закалённое стекло',
            }, 950, True),
            (brands['Corsair'], 'Corsair 5000D Airflow', 'CASE-COR-5000DA', 1600, {
                'Форм-фактор поддержки': 'ATX, mATX, Mini-ITX',
                'Макс длина GPU': '420', 'Макс высота кулера': '170',
                'Кол-во мест под вентиляторы': '12', 'Боковое окно': 'Закалённое стекло',
            }, None, False),
            (brands['Deepcool'], 'Deepcool CH510', 'CASE-DC-CH510', 700, {
                'Форм-фактор поддержки': 'ATX, mATX, Mini-ITX',
                'Макс длина GPU': '380', 'Макс высота кулера': '175',
                'Кол-во мест под вентиляторы': '7', 'Боковое окно': 'Закалённое стекло',
            }, None, False),
            (brands['Deepcool'], 'Deepcool CH560', 'CASE-DC-CH560', 850, {
                'Форм-фактор поддержки': 'ATX, mATX, Mini-ITX',
                'Макс длина GPU': '380', 'Макс высота кулера': '175',
                'Кол-во мест под вентиляторы': '9', 'Боковое окно': 'Закалённое стекло',
            }, None, True),
            (brands['Cooler Master'], 'Cooler Master MasterBox TD500 Mesh', 'CASE-CM-TD500M', 1000, {
                'Форм-фактор поддержки': 'ATX, mATX, Mini-ITX',
                'Макс длина GPU': '410', 'Макс высота кулера': '165',
                'Кол-во мест под вентиляторы': '7', 'Боковое окно': 'Закалённое стекло',
            }, None, False),
            (brands['Cooler Master'], 'Cooler Master MasterBox NR200P', 'CASE-CM-NR200P', 900, {
                'Форм-фактор поддержки': 'Mini-ITX',
                'Макс длина GPU': '330', 'Макс высота кулера': '155',
                'Кол-во мест под вентиляторы': '7', 'Боковое окно': 'Закалённое стекло',
            }, None, False),
            (brands['Thermaltake'], 'Thermaltake S200 TG ARGB', 'CASE-TT-S200TG', 700, {
                'Форм-фактор поддержки': 'ATX, mATX, Mini-ITX',
                'Макс длина GPU': '340', 'Макс высота кулера': '165',
                'Кол-во мест под вентиляторы': '6', 'Боковое окно': 'Закалённое стекло',
            }, None, False),
            (brands['Thermaltake'], 'Thermaltake View 200 TG ARGB', 'CASE-TT-V200TG', 800, {
                'Форм-фактор поддержки': 'ATX, mATX, Mini-ITX',
                'Макс длина GPU': '380', 'Макс высота кулера': '170',
                'Кол-во мест под вентиляторы': '8', 'Боковое окно': 'Закалённое стекло',
            }, None, False),
            (brands['MSI'], 'MSI MAG FORGE 100R', 'CASE-MSI-MF100R', 650, {
                'Форм-фактор поддержки': 'ATX, mATX, Mini-ITX',
                'Макс длина GPU': '340', 'Макс высота кулера': '165',
                'Кол-во мест под вентиляторы': '6', 'Боковое окно': 'Закалённое стекло',
            }, None, False),
            (brands['ASUS'], 'ASUS TUF Gaming GT502', 'CASE-ASUS-GT502', 1500, {
                'Форм-фактор поддержки': 'ATX, mATX, Mini-ITX',
                'Макс длина GPU': '400', 'Макс высота кулера': '170',
                'Кол-во мест под вентиляторы': '10', 'Боковое окно': 'Закалённое стекло',
            }, None, True),
            (brands['Corsair'], 'Corsair 3000D Airflow', 'CASE-COR-3000DA', 800, {
                'Форм-фактор поддержки': 'ATX, mATX, Mini-ITX',
                'Макс длина GPU': '360', 'Макс высота кулера': '170',
                'Кол-во мест под вентиляторы': '8', 'Боковое окно': 'Закалённое стекло',
            }, None, False),
            (brands['Deepcool'], 'Deepcool CC560 V2', 'CASE-DC-CC560V2', 500, {
                'Форм-фактор поддержки': 'ATX, mATX, Mini-ITX',
                'Макс длина GPU': '370', 'Макс высота кулера': '163',
                'Кол-во мест под вентиляторы': '7', 'Боковое окно': 'Закалённое стекло',
            }, None, False),
        ]

        for brand_obj, name, sku, price, specs, discount, featured in cases_data:
            p = self._make_product(
                category=cat, brand=brand_obj, name=name, sku=sku, price=price,
                specs_dict=specs, spec_names_map=sn,
                discount_price=discount,
                short_description=f'{specs["Форм-фактор поддержки"]}, GPU до {specs["Макс длина GPU"]}мм',
                is_featured=featured,
            )
            products.append(p)

        self.stdout.write(self.style.SUCCESS(f'    {len(products)} Cases created'))
        return products

    # ------------------------------------------------------------------
    # Coolers
    # ------------------------------------------------------------------

    def _create_coolers(self, categories, brands, spec_names):
        cat = categories['coolers']
        sn = spec_names['coolers']
        products = []

        coolers_data = [
            # Tower coolers
            (brands['Deepcool'], 'Deepcool AK400', 'COOL-DC-AK400', 350, {
                'Тип': 'Башенный', 'Совместимые сокеты': 'LGA1700, LGA1200, AM5, AM4',
                'TDP рассеивания': '220', 'Размер радиатора': '-',
                'Высота': '155', 'Уровень шума': '29',
            }, None, True),
            (brands['Deepcool'], 'Deepcool AK620', 'COOL-DC-AK620', 650, {
                'Тип': 'Башенный', 'Совместимые сокеты': 'LGA1700, LGA1200, AM5, AM4',
                'TDP рассеивания': '260', 'Размер радиатора': '-',
                'Высота': '160', 'Уровень шума': '28',
            }, None, True),
            (brands['be quiet!'], 'be quiet! Pure Rock 2', 'COOL-BQ-PR2', 400, {
                'Тип': 'Башенный', 'Совместимые сокеты': 'LGA1700, LGA1200, AM5, AM4',
                'TDP рассеивания': '150', 'Размер радиатора': '-',
                'Высота': '155', 'Уровень шума': '26',
            }, None, False),
            (brands['be quiet!'], 'be quiet! Dark Rock Pro 4', 'COOL-BQ-DRP4', 850, {
                'Тип': 'Башенный', 'Совместимые сокеты': 'LGA1700, LGA1200, AM5, AM4',
                'TDP рассеивания': '250', 'Размер радиатора': '-',
                'Высота': '163', 'Уровень шума': '24',
            }, None, True),
            (brands['Cooler Master'], 'Cooler Master Hyper 212 EVO V2', 'COOL-CM-H212E2', 350, {
                'Тип': 'Башенный', 'Совместимые сокеты': 'LGA1700, LGA1200, AM5, AM4',
                'TDP рассеивания': '150', 'Размер радиатора': '-',
                'Высота': '157', 'Уровень шума': '27',
            }, None, False),
            (brands['Thermaltake'], 'Thermaltake UX200 SE ARGB', 'COOL-TT-UX200SE', 300, {
                'Тип': 'Башенный', 'Совместимые сокеты': 'LGA1700, LGA1200, AM5, AM4',
                'TDP рассеивания': '150', 'Размер радиатора': '-',
                'Высота': '152', 'Уровень шума': '28',
            }, None, False),
            (brands['NZXT'], 'NZXT T120', 'COOL-NZXT-T120', 400, {
                'Тип': 'Башенный', 'Совместимые сокеты': 'LGA1700, LGA1200, AM5, AM4',
                'TDP рассеивания': '180', 'Размер радиатора': '-',
                'Высота': '159', 'Уровень шума': '28',
            }, None, False),
            # AIO Liquid coolers
            (brands['Corsair'], 'Corsair iCUE H100i Elite LCD XT 240mm', 'COOL-COR-H100I', 1800, {
                'Тип': 'СЖО', 'Совместимые сокеты': 'LGA1700, LGA1200, AM5, AM4',
                'TDP рассеивания': '300', 'Размер радиатора': '240',
                'Высота': '27', 'Уровень шума': '36',
            }, None, True),
            (brands['Corsair'], 'Corsair iCUE H150i Elite LCD XT 360mm', 'COOL-COR-H150I', 2500, {
                'Тип': 'СЖО', 'Совместимые сокеты': 'LGA1700, LGA1200, AM5, AM4',
                'TDP рассеивания': '350', 'Размер радиатора': '360',
                'Высота': '27', 'Уровень шума': '37',
            }, 2300, True),
            (brands['NZXT'], 'NZXT Kraken 240', 'COOL-NZXT-K240', 1500, {
                'Тип': 'СЖО', 'Совместимые сокеты': 'LGA1700, LGA1200, AM5, AM4',
                'TDP рассеивания': '300', 'Размер радиатора': '240',
                'Высота': '27', 'Уровень шума': '33',
            }, None, False),
            (brands['NZXT'], 'NZXT Kraken 360', 'COOL-NZXT-K360', 2200, {
                'Тип': 'СЖО', 'Совместимые сокеты': 'LGA1700, LGA1200, AM5, AM4',
                'TDP рассеивания': '350', 'Размер радиатора': '360',
                'Высота': '27', 'Уровень шума': '33',
            }, None, True),
            (brands['Deepcool'], 'Deepcool LE520 240mm ARGB', 'COOL-DC-LE520', 700, {
                'Тип': 'СЖО', 'Совместимые сокеты': 'LGA1700, LGA1200, AM5, AM4',
                'TDP рассеивания': '260', 'Размер радиатора': '240',
                'Высота': '27', 'Уровень шума': '32',
            }, None, False),
            (brands['Deepcool'], 'Deepcool LT720 360mm ARGB', 'COOL-DC-LT720', 1200, {
                'Тип': 'СЖО', 'Совместимые сокеты': 'LGA1700, LGA1200, AM5, AM4',
                'TDP рассеивания': '350', 'Размер радиатора': '360',
                'Высота': '27', 'Уровень шума': '34',
            }, None, False),
            (brands['Cooler Master'], 'Cooler Master MasterLiquid ML240L V2 ARGB', 'COOL-CM-ML240L', 800, {
                'Тип': 'СЖО', 'Совместимые сокеты': 'LGA1700, LGA1200, AM5, AM4',
                'TDP рассеивания': '270', 'Размер радиатора': '240',
                'Высота': '27', 'Уровень шума': '27',
            }, None, False),
            (brands['Cooler Master'], 'Cooler Master MasterLiquid ML360L V2 ARGB', 'COOL-CM-ML360L', 1100, {
                'Тип': 'СЖО', 'Совместимые сокеты': 'LGA1700, LGA1200, AM5, AM4',
                'TDP рассеивания': '320', 'Размер радиатора': '360',
                'Высота': '27', 'Уровень шума': '27',
            }, None, False),
        ]

        for brand_obj, name, sku, price, specs, discount, featured in coolers_data:
            p = self._make_product(
                category=cat, brand=brand_obj, name=name, sku=sku, price=price,
                specs_dict=specs, spec_names_map=sn,
                discount_price=discount,
                short_description=f'{specs["Тип"]}, TDP {specs["TDP рассеивания"]}Вт, {specs["Уровень шума"]}дБА',
                is_featured=featured,
            )
            products.append(p)

        self.stdout.write(self.style.SUCCESS(f'    {len(products)} Coolers created'))
        return products

    # ------------------------------------------------------------------
    # Monitors
    # ------------------------------------------------------------------

    def _create_monitors(self, categories, brands, spec_names):
        cat = categories['monitors']
        sn = spec_names.get('monitors', {})
        asus = brands['ASUS']
        samsung = brands['Samsung']
        acer = brands['Acer']
        lg = brands['LG']
        products = []

        data = [
            (asus, 'ASUS TUF Gaming VG279QM 27" IPS 280Hz', 'MON-ASUS-VG279QM', 5200, None,
             True, 'Игровой монитор 27 дюймов, IPS 280 Гц, время отклика 1 мс, HDR400',
             {'Диагональ': '27', 'Разрешение': '1920x1080', 'Частота обновления': '280',
              'Тип матрицы': 'IPS', 'Время отклика': '1', 'HDR': 'HDR400',
              'Интерфейсы': 'HDMI 2.0, DisplayPort 1.2', 'Изогнутый экран': 'Нет'}),
            (samsung, 'Samsung Odyssey G5 27" VA 165Hz', 'MON-SAM-G5-27', 4800, 4299,
             True, 'Игровой изогнутый монитор 27", 165 Гц, QHD 1440p',
             {'Диагональ': '27', 'Разрешение': '2560x1440', 'Частота обновления': '165',
              'Тип матрицы': 'VA', 'Время отклика': '1', 'HDR': 'HDR10',
              'Интерфейсы': 'HDMI 2.0, DisplayPort 1.2', 'Изогнутый экран': 'Да'}),
            (lg, 'LG UltraWide 34WN80C-B 34" IPS', 'MON-LG-34WN80C', 8500, None,
             False, 'Ультраширокий монитор 34 дюйма, IPS, 3440x1440, USB-C',
             {'Диагональ': '34', 'Разрешение': '3440x1440', 'Частота обновления': '60',
              'Тип матрицы': 'IPS', 'Время отклика': '5', 'HDR': 'HDR10',
              'Интерфейсы': 'HDMI 2.0, USB-C', 'Изогнутый экран': 'Нет'}),
            (acer, 'Acer Nitro XV272U 27" IPS 170Hz', 'MON-ACER-XV272U', 4200, None,
             False, 'Монитор 27" IPS 170 Гц QHD для игр и работы',
             {'Диагональ': '27', 'Разрешение': '2560x1440', 'Частота обновления': '170',
              'Тип матрицы': 'IPS', 'Время отклика': '1', 'HDR': 'HDR400',
              'Интерфейсы': 'HDMI 2.0, DisplayPort 1.4', 'Изогнутый экран': 'Нет'}),
            (asus, 'ASUS ProArt PA278QV 27" IPS 4K', 'MON-ASUS-PA278QV', 6900, None,
             False, 'Профессиональный монитор 27", IPS 4K, 100% sRGB для дизайнеров',
             {'Диагональ': '27', 'Разрешение': '3840x2160', 'Частота обновления': '60',
              'Тип матрицы': 'IPS', 'Время отклика': '5', 'HDR': 'HDR400',
              'Интерфейсы': 'HDMI 2.0, DisplayPort 1.2, USB-C', 'Изогнутый экран': 'Нет'}),
            (samsung, 'Samsung Odyssey G7 32" VA 240Hz', 'MON-SAM-G7-32', 9200, 8490,
             True, 'Топовый игровой монитор 32", 240 Гц, QHD, изогнутый 1000R',
             {'Диагональ': '32', 'Разрешение': '2560x1440', 'Частота обновления': '240',
              'Тип матрицы': 'VA', 'Время отклика': '1', 'HDR': 'HDR600',
              'Интерфейсы': 'HDMI 2.0, DisplayPort 1.4', 'Изогнутый экран': 'Да'}),
        ]

        for brand, name, sku, price, disc, featured, short_desc, specs in data:
            p = self._make_product(
                category=cat, brand=brand, name=name, sku=sku,
                price=price, discount_price=disc, specs_dict=specs,
                spec_names_map=sn, is_featured=featured,
                short_description=short_desc,
            )
            products.append(p)

        self.stdout.write(self.style.SUCCESS(f'    {len(products)} Monitors created'))
        return products

    # ------------------------------------------------------------------
    # Peripherals
    # ------------------------------------------------------------------

    def _create_peripherals(self, categories, brands, spec_names):
        cat = categories['peripherals']
        sn = spec_names.get('peripherals', {})
        corsair = brands['Corsair']
        logitech = brands['Logitech']
        razer = brands['Razer']
        asus = brands['ASUS']
        products = []

        data = [
            (logitech, 'Logitech G Pro X Superlight 2 Мышь', 'PER-LOG-GPX-S2', 3200, None,
             True, 'Ультралёгкая игровая мышь 60г, сенсор HERO 25K, беспроводная',
             {'Тип устройства': 'Мышь', 'Подключение': 'Беспроводное',
              'RGB подсветка': 'Нет', 'Игровое': 'Да', 'Беспроводное': 'Да'}),
            (razer, 'Razer DeathAdder V3 HyperSpeed', 'PER-RAZ-DAV3', 2800, 2499,
             False, 'Беспроводная игровая мышь, сенсор Focus Pro 30K, 59г',
             {'Тип устройства': 'Мышь', 'Подключение': 'Беспроводное',
              'RGB подсветка': 'Нет', 'Игровое': 'Да', 'Беспроводное': 'Да'}),
            (corsair, 'Corsair K70 RGB Pro Механическая клавиатура', 'PER-COR-K70RGB', 3500, None,
             True, 'Механическая игровая клавиатура, Cherry MX Red, RGB, PBT-кейкапы',
             {'Тип устройства': 'Клавиатура', 'Подключение': 'Проводное',
              'RGB подсветка': 'Да', 'Игровое': 'Да', 'Беспроводное': 'Нет'}),
            (logitech, 'Logitech MX Keys S Клавиатура', 'PER-LOG-MXS', 2900, None,
             False, 'Беспроводная клавиатура для профессионалов, тихие клавиши',
             {'Тип устройства': 'Клавиатура', 'Подключение': 'Беспроводное',
              'RGB подсветка': 'Нет', 'Игровое': 'Нет', 'Беспроводное': 'Да'}),
            (razer, 'Razer BlackShark V2 Pro Гарнитура', 'PER-RAZ-BSV2P', 4100, 3799,
             True, 'Беспроводная игровая гарнитура, 50 мм динамики, THX Spatial Audio',
             {'Тип устройства': 'Гарнитура', 'Подключение': 'Беспроводное',
              'RGB подсветка': 'Нет', 'Игровое': 'Да', 'Беспроводное': 'Да'}),
            (corsair, 'Corsair HS80 RGB Wireless Гарнитура', 'PER-COR-HS80', 3200, None,
             False, 'Беспроводная гарнитура, Dolby Atmos, 65-часовой аккумулятор',
             {'Тип устройства': 'Гарнитура', 'Подключение': 'Беспроводное',
              'RGB подсветка': 'Да', 'Игровое': 'Да', 'Беспроводное': 'Да'}),
            (logitech, 'Logitech G502 X Plus Мышь', 'PER-LOG-G502X', 2500, 2200,
             False, 'Беспроводная игровая мышь, сенсор HERO 25K, 13 кнопок, 95г',
             {'Тип устройства': 'Мышь', 'Подключение': 'Беспроводное',
              'RGB подсветка': 'Да', 'Игровое': 'Да', 'Беспроводное': 'Да'}),
            (asus, 'ASUS ROG Strix Scope RX Клавиатура', 'PER-ASUS-ROG-SCOPE', 4200, None,
             False, 'Механическая клавиатура ROG RX Red, RGB, алюминиевый корпус',
             {'Тип устройства': 'Клавиатура', 'Подключение': 'Проводное',
              'RGB подсветка': 'Да', 'Игровое': 'Да', 'Беспроводное': 'Нет'}),
        ]

        for brand, name, sku, price, disc, featured, short_desc, specs in data:
            p = self._make_product(
                category=cat, brand=brand, name=name, sku=sku,
                price=price, discount_price=disc, specs_dict=specs,
                spec_names_map=sn, is_featured=featured,
                short_description=short_desc,
            )
            products.append(p)

        self.stdout.write(self.style.SUCCESS(f'    {len(products)} Peripherals created'))
        return products

    # ------------------------------------------------------------------
    # Hero Slides
    # ------------------------------------------------------------------

    def _create_hero_slides(self):
        """
        Creates hero slides without images (image field left blank).
        The admin must upload images via Django Admin → Слайды главной.
        Until images are added, the static hero banner is shown on the homepage.
        """
        slides_data = [
            {
                'title': 'Игровые ПК нового поколения',
                'subtitle': 'Максимальная производительность в каждой детали',
                'description': 'Готовые сборки и комплектующие от ведущих производителей. Доставка по всему Таджикистану.',
                'button_text': 'Смотреть сборки',
                'button_link': '/presets',
                'order': 1,
            },
            {
                'title': 'Видеокарты RTX 40 серии',
                'subtitle': 'DLSS 3, Ray Tracing, Ada Lovelace',
                'description': 'NVIDIA GeForce RTX 4060, 4070, 4080 и 4090 в наличии. Официальная гарантия.',
                'button_text': 'Выбрать видеокарту',
                'button_link': '/catalog/gpu',
                'order': 2,
            },
            {
                'title': 'Мониторы для игр и работы',
                'subtitle': 'IPS, VA, OLED — от 60 до 280 Гц',
                'description': 'Широкий выбор мониторов ASUS, Samsung, LG, Acer. QHD, 4K, UltraWide форматы.',
                'button_text': 'Смотреть мониторы',
                'button_link': '/catalog/monitors',
                'order': 3,
            },
            {
                'title': 'Конфигуратор ПК с AI-оценкой',
                'subtitle': 'Соберите идеальный компьютер за минуты',
                'description': 'Проверка совместимости компонентов и искусственный интеллект оценит вашу сборку.',
                'button_text': 'Собрать ПК',
                'button_link': '/configurator',
                'order': 4,
            },
        ]

        slides = []
        for data in slides_data:
            slide = HeroSlide.objects.create(
                title=data['title'],
                subtitle=data['subtitle'],
                description=data['description'],
                image='',          # No image — upload via Django Admin
                button_text=data['button_text'],
                button_link=data['button_link'],
                order=data['order'],
                is_active=False,   # Inactive until image is added
            )
            slides.append(slide)
            self.stdout.write(f'    Slide {data["order"]}: {data["title"]}')

        return slides

    def _create_site_settings(self):
        ss, _ = SiteSettings.objects.get_or_create(pk=1)
        return ss

    # ------------------------------------------------------------------
    # Test Users
    # ------------------------------------------------------------------

    def _create_users(self):
        users = []

        # Admin (superuser)
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@elitepc.tj',
            password='admin123456',
            first_name='Администратор',
            last_name='Elite PC',
            phone='+992 900 000001',
            city='Душанбе',
            is_verified=True,
        )
        UserProfile.objects.get_or_create(user=admin)
        users.append(admin)
        self.stdout.write(self.style.SUCCESS('    admin / admin123456 (superuser)'))

        # Manager (staff)
        manager = User.objects.create_user(
            username='manager',
            email='manager@elitepc.tj',
            password='manager123456',
            first_name='Фируз',
            last_name='Менеджеров',
            phone='+992 900 000002',
            city='Душанбе',
            is_staff=True,
            is_verified=True,
        )
        UserProfile.objects.get_or_create(user=manager)
        users.append(manager)
        self.stdout.write(self.style.SUCCESS('    manager / manager123456 (staff)'))

        # Customer
        customer = User.objects.create_user(
            username='customer',
            email='customer@example.com',
            password='customer123456',
            first_name='Дильшод',
            last_name='Рахимов',
            phone='+992 901 234567',
            city='Душанбе',
            address='ул. Рудаки 45, кв. 12',
            is_verified=True,
        )
        UserProfile.objects.get_or_create(user=customer)
        users.append(customer)
        self.stdout.write(self.style.SUCCESS('    customer / customer123456'))

        return users

    # ------------------------------------------------------------------
    # Compatibility Rules
    # ------------------------------------------------------------------

    def _create_compatibility_rules(self):
        rules_data = [
            ('socket_match', True,
             'Сокет процессора ({cpu_socket}) не совпадает с сокетом материнской платы ({mb_socket}). '
             'Выберите материнскую плату с сокетом {cpu_socket}.'),
            ('ram_type_match', True,
             'Тип оперативной памяти ({ram_type}) не поддерживается материнской платой '
             '(поддерживается {mb_ram_type}). Выберите {mb_ram_type} память.'),
            ('ram_slots_limit', True,
             'Количество модулей RAM ({ram_modules}) превышает количество слотов '
             'на материнской плате ({mb_slots}). Максимум {mb_slots} модулей.'),
            ('ram_max_capacity', False,
             'Общий объём RAM ({total_ram}ГБ) превышает максимально поддерживаемый '
             'материнской платой ({max_ram}ГБ).'),
            ('form_factor_fit', True,
             'Форм-фактор материнской платы ({mb_form}) не поддерживается корпусом. '
             'Корпус поддерживает: {case_form}.'),
            ('gpu_length_fit', True,
             'Видеокарта слишком длинная ({gpu_length}мм) для данного корпуса '
             '(максимум {case_max_gpu}мм). Выберите другой корпус или видеокарту.'),
            ('cooler_height_fit', True,
             'Кулер слишком высокий ({cooler_height}мм) для данного корпуса '
             '(максимум {case_max_cooler}мм). Выберите низкопрофильный кулер или другой корпус.'),
            ('psu_wattage_check', False,
             'Мощности блока питания ({psu_wattage}Вт) может быть недостаточно. '
             'Рекомендуемая мощность: {recommended}Вт (TDP CPU {cpu_tdp}Вт + TDP GPU {gpu_tdp}Вт + 100Вт запас).'),
            ('cooler_socket_match', True,
             'Кулер не совместим с сокетом {cpu_socket}. '
             'Совместимые сокеты кулера: {cooler_sockets}.'),
            ('m2_slots_limit', True,
             'Количество M.2 накопителей ({m2_count}) превышает количество слотов M.2 '
             'на материнской плате ({mb_m2_slots}).'),
        ]

        rules = []
        for rule_type, is_hard, message in rules_data:
            rule = CompatibilityRule.objects.create(
                rule_type=rule_type,
                is_hard=is_hard,
                message_template=message,
            )
            rules.append(rule)

        return rules

    # ------------------------------------------------------------------
    # Preset Configurations
    # ------------------------------------------------------------------

    def _create_preset_configurations(self, categories, all_products, users):
        """Create preset PC configurations (budget, gaming, pro, ultra, streaming)."""

        # Build lookup dictionaries by SKU for quick access
        products_by_sku = {p.sku: p for p in all_products}

        presets_data = [
            {
                'name': 'Бюджетный ПК',
                'preset_label': 'budget',
                'items': [
                    ('cpu', 'CPU-I3-13100F'),
                    ('motherboard', 'MB-AR-B660MHDV'),
                    ('ram', 'RAM-COR-V16D4-3200'),
                    ('gpu', 'GPU-MSI-3060V2X'),
                    ('ssd', 'SSD-KIN-NV2-500'),
                    ('psu', 'PSU-COR-CV550'),
                    ('case', 'CASE-DC-CC560V2'),
                    ('cooler', 'COOL-TT-UX200SE'),
                ],
            },
            {
                'name': 'Игровой ПК',
                'preset_label': 'gaming',
                'items': [
                    ('cpu', 'CPU-I5-14600KF'),
                    ('motherboard', 'MB-MSI-B760MWD4'),
                    ('ram', 'RAM-COR-V32D4-3200'),
                    ('gpu', 'GPU-ASUS-4070TUF'),
                    ('ssd', 'SSD-SAM-980P-1T'),
                    ('psu', 'PSU-COR-RM750'),
                    ('case', 'CASE-COR-4000DA'),
                    ('cooler', 'COOL-DC-AK620'),
                ],
            },
            {
                'name': 'Игровой ПК AM5',
                'preset_label': 'gaming_am5',
                'items': [
                    ('cpu', 'CPU-7800X3D'),
                    ('motherboard', 'MB-MSI-B650TW'),
                    ('ram', 'RAM-COR-V32D5-5600'),
                    ('gpu', 'GPU-MSI-4070SV'),
                    ('ssd', 'SSD-SAM-990P-1T'),
                    ('psu', 'PSU-COR-RM850'),
                    ('case', 'CASE-NZXT-H5F'),
                    ('cooler', 'COOL-COR-H100I'),
                ],
            },
            {
                'name': 'Профессиональный ПК',
                'preset_label': 'pro',
                'items': [
                    ('cpu', 'CPU-7900X'),
                    ('motherboard', 'MB-ASUS-B650EFG'),
                    ('ram', 'RAM-GSK-TZ5R64D5-6400'),
                    ('gpu', 'GPU-ASUS-4070TiSROG'),
                    ('ssd', 'SSD-SAM-990P-2T'),
                    ('psu', 'PSU-BQ-SP12-1000'),
                    ('case', 'CASE-COR-5000DA'),
                    ('cooler', 'COOL-COR-H150I'),
                ],
            },
            {
                'name': 'Ультра ПК',
                'preset_label': 'ultra',
                'items': [
                    ('cpu', 'CPU-I9-14900KF'),
                    ('motherboard', 'MB-ASUS-Z790EG'),
                    ('ram', 'RAM-COR-DP64D5-6400'),
                    ('gpu', 'GPU-ASUS-4090ROG'),
                    ('ssd', 'SSD-SAM-990P-2T'),
                    ('hdd', 'HDD-SEA-BAR-2T'),
                    ('psu', 'PSU-TT-TGF3-1200'),
                    ('case', 'CASE-ASUS-GT502'),
                    ('cooler', 'COOL-NZXT-K360'),
                ],
            },
        ]

        admin_user = users[0]  # admin
        presets = []

        for preset_data in presets_data:
            config = PCConfiguration.objects.create(
                user=admin_user,
                name=preset_data['name'],
                status='completed',
                assembly_fee=Decimal('500.00'),
                is_preset=True,
                preset_label=preset_data['preset_label'],
            )

            total = Decimal('0.00')
            for component_type, sku in preset_data['items']:
                product = products_by_sku.get(sku)
                if product:
                    price = product.discount_price if product.discount_price else product.price
                    ConfigurationItem.objects.create(
                        configuration=config,
                        product=product,
                        component_type=component_type,
                        quantity=1,
                        price_at_addition=price,
                    )
                    total += price
                else:
                    self.stdout.write(self.style.WARNING(
                        f'    Product SKU {sku} not found for preset "{preset_data["name"]}"'
                    ))

            config.total_price = total
            config.save(update_fields=['total_price'])

            presets.append(config)
            self.stdout.write(self.style.SUCCESS(
                f'    Preset "{config.name}" — {total} TJS ({config.items.count()} components)'
            ))

        return presets
