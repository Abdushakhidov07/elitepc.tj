from django.conf import settings
from django.db import models


class PCConfiguration(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Черновик'),
        ('completed', 'Завершена'),
        ('ordered', 'Заказана'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='configurations', verbose_name='Пользователь'
    )
    name = models.CharField('Название сборки', max_length=200, blank=True)
    session_key = models.CharField('Ключ сессии', max_length=100, blank=True)
    status = models.CharField('Статус', max_length=20, choices=STATUS_CHOICES, default='draft')
    total_price = models.DecimalField('Общая цена', max_digits=12, decimal_places=2, default=0)
    assembly_fee = models.DecimalField('Цена сборки', max_digits=10, decimal_places=2, default=500)
    ai_rating = models.PositiveIntegerField('Оценка AI', null=True, blank=True)
    ai_comment = models.TextField('Комментарий AI', blank=True)
    is_preset = models.BooleanField('Готовая сборка', default=False)
    preset_label = models.CharField('Тип сборки', max_length=100, blank=True)
    image = models.ImageField('Фото сборки', upload_to='configurations/', blank=True, null=True)
    created_at = models.DateTimeField('Создана', auto_now_add=True)
    updated_at = models.DateTimeField('Обновлена', auto_now=True)

    class Meta:
        verbose_name = 'Конфигурация ПК'
        verbose_name_plural = 'Конфигурации ПК'
        ordering = ['-created_at']

    def __str__(self):
        return self.name or f'Конфигурация #{self.pk}'

    def recalculate_total(self):
        total = sum(
            item.price_at_addition * item.quantity
            for item in self.items.all()
        )
        self.total_price = total
        self.save(update_fields=['total_price'])


class ConfigurationItem(models.Model):
    COMPONENT_CHOICES = [
        ('cpu', 'Процессор'),
        ('motherboard', 'Материнская плата'),
        ('ram', 'Оперативная память'),
        ('gpu', 'Видеокарта'),
        ('ssd', 'SSD'),
        ('hdd', 'HDD'),
        ('psu', 'Блок питания'),
        ('case', 'Корпус'),
        ('cooler', 'Кулер/СЖО'),
        ('extra', 'Дополнительно'),
    ]

    configuration = models.ForeignKey(
        PCConfiguration, on_delete=models.CASCADE, related_name='items',
        verbose_name='Конфигурация'
    )
    product = models.ForeignKey(
        'products.Product', on_delete=models.CASCADE, verbose_name='Товар'
    )
    component_type = models.CharField('Тип компонента', max_length=20, choices=COMPONENT_CHOICES)
    quantity = models.PositiveIntegerField('Количество', default=1)
    price_at_addition = models.DecimalField('Цена при добавлении', max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Компонент конфигурации'
        verbose_name_plural = 'Компоненты конфигурации'

    def __str__(self):
        return f'{self.get_component_type_display()}: {self.product.name}'


class CompatibilityRule(models.Model):
    RULE_TYPE_CHOICES = [
        ('socket_match', 'Совпадение сокета CPU и материнки'),
        ('ram_type_match', 'Совпадение типа RAM и материнки'),
        ('ram_slots_limit', 'Лимит слотов RAM'),
        ('ram_max_capacity', 'Максимальный объём RAM'),
        ('form_factor_fit', 'Совместимость форм-фактора'),
        ('gpu_length_fit', 'Длина GPU в корпусе'),
        ('cooler_height_fit', 'Высота кулера в корпусе'),
        ('psu_wattage_check', 'Мощность БП'),
        ('cooler_socket_match', 'Совместимость кулера и сокета'),
        ('m2_slots_limit', 'Лимит слотов M.2'),
    ]

    rule_type = models.CharField('Тип правила', max_length=30, choices=RULE_TYPE_CHOICES, unique=True)
    is_hard = models.BooleanField('Жёсткое ограничение', default=True)
    message_template = models.TextField('Шаблон сообщения')

    class Meta:
        verbose_name = 'Правило совместимости'
        verbose_name_plural = 'Правила совместимости'

    def __str__(self):
        return self.get_rule_type_display()
