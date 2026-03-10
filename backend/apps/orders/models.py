import datetime
from django.conf import settings
from django.db import models


class Order(models.Model):
    STATUS_CHOICES = [
        ('new', 'Новый'),
        ('confirmed', 'Подтверждён'),
        ('paid', 'Оплачен'),
        ('assembling', 'Собирается'),
        ('shipping', 'Доставляется'),
        ('completed', 'Выполнен'),
        ('cancelled', 'Отменён'),
    ]
    DELIVERY_CHOICES = [
        ('pickup', 'Самовывоз'),
        ('delivery', 'Доставка'),
    ]

    order_number = models.CharField('Номер заказа', max_length=30, unique=True, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='orders', verbose_name='Пользователь'
    )
    status = models.CharField('Статус', max_length=20, choices=STATUS_CHOICES, default='new', db_index=True)
    customer_name = models.CharField('Имя клиента', max_length=200)
    customer_phone = models.CharField('Телефон', max_length=20)
    customer_email = models.EmailField('Email', blank=True)
    customer_city = models.CharField('Город', max_length=100, blank=True)
    customer_address = models.TextField('Адрес', blank=True)
    delivery_method = models.CharField(
        'Способ доставки', max_length=20, choices=DELIVERY_CHOICES, default='pickup'
    )
    comment = models.TextField('Комментарий', blank=True)
    total_price = models.DecimalField('Итого', max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField('Скидка', max_digits=10, decimal_places=2, default=0)
    is_guest_order = models.BooleanField('Гостевой заказ', default=False)
    created_at = models.DateTimeField('Создан', auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField('Обновлён', auto_now=True)

    class Meta:
        verbose_name = 'Заказ'
        verbose_name_plural = 'Заказы'
        ordering = ['-created_at']

    def __str__(self):
        return self.order_number

    def save(self, *args, **kwargs):
        if not self.order_number:
            today = datetime.date.today().strftime('%Y%m%d')
            last = Order.objects.filter(
                order_number__startswith=f'EPC-{today}'
            ).order_by('-order_number').first()
            if last:
                num = int(last.order_number.split('-')[-1]) + 1
            else:
                num = 1
            self.order_number = f'EPC-{today}-{num:04d}'
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items', verbose_name='Заказ')
    product = models.ForeignKey(
        'products.Product', on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='Товар'
    )
    configuration = models.ForeignKey(
        'configurator.PCConfiguration', on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='Конфигурация'
    )
    quantity = models.PositiveIntegerField('Количество', default=1)
    price_at_purchase = models.DecimalField('Цена при покупке', max_digits=10, decimal_places=2)
    is_assembled = models.BooleanField('Собранный ПК', default=False)
    assembly_fee = models.DecimalField('Цена сборки', max_digits=10, decimal_places=2, default=0)

    class Meta:
        verbose_name = 'Позиция заказа'
        verbose_name_plural = 'Позиции заказа'

    def __str__(self):
        item = self.product or self.configuration
        return f'{item} x{self.quantity}'

    @property
    def line_total(self):
        return (self.price_at_purchase + self.assembly_fee) * self.quantity


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='status_history',
        verbose_name='Заказ'
    )
    old_status = models.CharField('Старый статус', max_length=20)
    new_status = models.CharField('Новый статус', max_length=20)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='Изменил'
    )
    comment = models.TextField('Комментарий', blank=True)
    created_at = models.DateTimeField('Дата', auto_now_add=True)

    class Meta:
        verbose_name = 'История статуса'
        verbose_name_plural = 'История статусов'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.order} : {self.old_status} → {self.new_status}'
