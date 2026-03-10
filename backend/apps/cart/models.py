from decimal import Decimal

from django.conf import settings
from django.db import models


class CartItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='cart_items', verbose_name='Пользователь'
    )
    product = models.ForeignKey(
        'products.Product', on_delete=models.CASCADE,
        verbose_name='Товар', null=True, blank=True
    )
    configuration = models.ForeignKey(
        'configurator.PCConfiguration', on_delete=models.CASCADE,
        verbose_name='Конфигурация', null=True, blank=True
    )
    quantity = models.PositiveIntegerField('Количество', default=1)
    with_assembly = models.BooleanField('С сборкой', default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Элемент корзины'
        verbose_name_plural = 'Корзина'

    def __str__(self):
        item = self.product or self.configuration
        return f'{self.user} — {item} x{self.quantity}'

    @property
    def item_total(self):
        if self.product:
            return self.product.current_price * self.quantity
        elif self.configuration:
            total = self.configuration.total_price
            if self.with_assembly:
                total += self.configuration.assembly_fee
            return total * self.quantity
        return Decimal('0.00')
