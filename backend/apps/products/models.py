from django.db import models
from django.utils.text import slugify
from mptt.models import MPTTModel, TreeForeignKey


class Category(MPTTModel):
    name = models.CharField('Название', max_length=200)
    slug = models.SlugField('Slug', max_length=200, unique=True)
    description = models.TextField('Описание', blank=True)
    image = models.ImageField('Изображение', upload_to='categories/', blank=True)
    parent = TreeForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True,
        related_name='children', verbose_name='Родительская категория'
    )
    is_active = models.BooleanField('Активна', default=True)
    order = models.PositiveIntegerField('Порядок', default=0)
    meta_title = models.CharField('Meta Title', max_length=200, blank=True)
    meta_description = models.TextField('Meta Description', blank=True)

    class MPTTMeta:
        order_insertion_by = ['order', 'name']

    class Meta:
        verbose_name = 'Категория'
        verbose_name_plural = 'Категории'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)
        super().save(*args, **kwargs)


class Brand(models.Model):
    name = models.CharField('Название', max_length=200)
    slug = models.SlugField('Slug', max_length=200, unique=True)
    logo = models.ImageField('Логотип', upload_to='brands/', blank=True)
    description = models.TextField('Описание', blank=True)

    class Meta:
        verbose_name = 'Бренд'
        verbose_name_plural = 'Бренды'
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)
        super().save(*args, **kwargs)


class Product(models.Model):
    name = models.CharField('Название', max_length=500)
    slug = models.SlugField('Slug', max_length=500, unique=True)
    sku = models.CharField('Артикул', max_length=50, unique=True)
    description = models.TextField('Описание', blank=True)
    short_description = models.CharField('Краткое описание', max_length=500, blank=True)
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name='products', verbose_name='Категория'
    )
    brand = models.ForeignKey(
        Brand, on_delete=models.PROTECT, related_name='products',
        verbose_name='Бренд', null=True, blank=True
    )
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2)
    discount_price = models.DecimalField(
        'Цена со скидкой', max_digits=10, decimal_places=2, null=True, blank=True
    )
    discount_percent = models.PositiveIntegerField('Скидка %', default=0)
    stock_quantity = models.PositiveIntegerField('Остаток на складе', default=0)
    is_active = models.BooleanField('Активен', default=True, db_index=True)
    is_featured = models.BooleanField('Рекомендуемый', default=False, db_index=True)
    main_image = models.ImageField('Главное изображение', upload_to='products/', blank=True)
    views_count = models.PositiveIntegerField('Просмотры', default=0)
    created_at = models.DateTimeField('Создан', auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField('Обновлён', auto_now=True)

    class Meta:
        verbose_name = 'Товар'
        verbose_name_plural = 'Товары'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def current_price(self):
        return self.discount_price if self.discount_price else self.price

    @property
    def in_stock(self):
        return self.stock_quantity > 0

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)
        if self.discount_price and self.price:
            self.discount_percent = int(
                (1 - self.discount_price / self.price) * 100
            )
        super().save(*args, **kwargs)


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='images', verbose_name='Товар'
    )
    image = models.ImageField('Изображение', upload_to='products/')
    alt_text = models.CharField('Alt текст', max_length=200, blank=True)
    order = models.PositiveIntegerField('Порядок', default=0)
    is_main = models.BooleanField('Главное', default=False)

    class Meta:
        verbose_name = 'Изображение товара'
        verbose_name_plural = 'Изображения товаров'
        ordering = ['order']

    def __str__(self):
        return f'{self.product.name} — изображение {self.order}'


class SpecificationName(models.Model):
    FILTER_TYPE_CHOICES = [
        ('checkbox', 'Чекбокс'),
        ('range', 'Диапазон'),
        ('select', 'Выпадающий список'),
    ]

    name = models.CharField('Название', max_length=200)
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name='specification_names',
        verbose_name='Категория'
    )
    unit = models.CharField('Единица измерения', max_length=50, blank=True)
    filter_type = models.CharField(
        'Тип фильтра', max_length=20, choices=FILTER_TYPE_CHOICES, default='checkbox'
    )
    is_filterable = models.BooleanField('Фильтруемая', default=True)
    is_comparable = models.BooleanField('Для сравнения', default=True)
    order = models.PositiveIntegerField('Порядок', default=0)

    class Meta:
        verbose_name = 'Название характеристики'
        verbose_name_plural = 'Названия характеристик'
        ordering = ['order']
        unique_together = ('name', 'category')

    def __str__(self):
        return f'{self.name} ({self.category})'


class ProductSpecification(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='specifications',
        verbose_name='Товар'
    )
    spec_name = models.ForeignKey(
        SpecificationName, on_delete=models.CASCADE, verbose_name='Характеристика'
    )
    value = models.CharField('Значение', max_length=500)

    class Meta:
        verbose_name = 'Характеристика товара'
        verbose_name_plural = 'Характеристики товаров'
        unique_together = ('product', 'spec_name')

    def __str__(self):
        return f'{self.product.name}: {self.spec_name.name} = {self.value}'


class HeroSlide(models.Model):
    """Слайды для hero-секции главной страницы. Управляются через Django Admin."""
    title = models.CharField('Заголовок', max_length=200)
    subtitle = models.CharField('Подзаголовок', max_length=300, blank=True)
    description = models.TextField('Описание', blank=True)
    image = models.ImageField('Изображение', upload_to='hero/')
    button_text = models.CharField('Текст кнопки', max_length=100, blank=True)
    button_link = models.CharField('Ссылка кнопки', max_length=500, blank=True)
    order = models.PositiveIntegerField('Порядок', default=0)
    is_active = models.BooleanField('Активный', default=True)
    created_at = models.DateTimeField('Создан', auto_now_add=True)

    class Meta:
        verbose_name = 'Слайд главной'
        verbose_name_plural = 'Слайды главной'
        ordering = ['order', '-created_at']

    def __str__(self):
        return self.title


class SiteSettings(models.Model):
    """Singleton model for company-wide settings editable from the frontend admin panel."""

    # ── Contact Information ──────────────────────────────────
    phone_primary    = models.CharField('Основной телефон', max_length=50, blank=True, default='+992 900 123 456')
    phone_secondary  = models.CharField('Дополнительный телефон', max_length=50, blank=True, default='+992 918 654 321')
    email_primary    = models.EmailField('Основной Email', blank=True, default='info@elitepc.tj')
    email_support    = models.EmailField('Email поддержки', blank=True, default='support@elitepc.tj')
    telegram_handle  = models.CharField('Telegram аккаунт', max_length=100, blank=True, default='@elitepc_tj')
    telegram_url     = models.URLField('Telegram ссылка', max_length=300, blank=True, default='https://t.me/elitepc_tj')

    # ── Address & Hours ──────────────────────────────────────
    address_line1  = models.CharField('Адрес (строка 1)', max_length=300, blank=True, default='Республика Таджикистан')
    address_line2  = models.CharField('Адрес (строка 2)', max_length=300, blank=True, default='г. Душанбе, ул. Рудаки 123')
    address_line3  = models.CharField('Адрес (строка 3)', max_length=300, blank=True, default='2 этаж, офис 205')
    working_hours  = models.CharField('Режим работы', max_length=300, blank=True, default='Пн-Сб: 09:00 — 19:00, Вс: выходной')

    # ── About Us ─────────────────────────────────────────────
    about_text     = models.TextField('О нас (основной текст)', blank=True)
    about_mission  = models.TextField('Миссия компании', blank=True)

    # ── Delivery ─────────────────────────────────────────────
    delivery_city_price       = models.DecimalField('Стоимость доставки по городу (с.)', max_digits=10, decimal_places=2, default=50)
    delivery_free_threshold   = models.DecimalField('Порог бесплатной доставки (с.)', max_digits=10, decimal_places=2, default=2000)
    delivery_city_days        = models.CharField('Срок доставки по городу', max_length=100, blank=True, default='1-2 рабочих дня')
    delivery_country_days     = models.CharField('Срок доставки по Таджикистану', max_length=100, blank=True, default='3-7 рабочих дней')

    # ── Site / SEO ────────────────────────────────────────────
    site_name         = models.CharField('Название сайта', max_length=200, blank=True, default='Elite PC')
    meta_description  = models.TextField('Мета описание сайта', blank=True)

    class Meta:
        verbose_name = 'Настройки компании'
        verbose_name_plural = 'Настройки компании'

    def __str__(self):
        return 'Настройки компании'

    def save(self, *args, **kwargs):
        self.pk = 1  # singleton
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
