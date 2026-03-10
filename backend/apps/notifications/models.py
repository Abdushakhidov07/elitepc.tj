import datetime

from django.db import models


class NotificationSettings(models.Model):
    telegram_bot_token = models.CharField('Telegram Bot Token', max_length=200, blank=True)
    telegram_channel_id = models.CharField('Telegram Channel ID', max_length=100, blank=True)
    is_active = models.BooleanField('Активно', default=True)
    notify_on_new_order = models.BooleanField('Уведомлять о новых заказах', default=True)
    notify_on_status_change = models.BooleanField('Уведомлять о смене статуса', default=True)
    notify_on_low_stock = models.BooleanField('Уведомлять о низком остатке', default=True)
    low_stock_threshold = models.PositiveIntegerField('Порог низкого остатка', default=5)
    daily_report_time = models.TimeField('Время ежедневного отчёта', default=datetime.time(9, 0))

    class Meta:
        verbose_name = 'Настройки уведомлений'
        verbose_name_plural = 'Настройки уведомлений'

    def __str__(self):
        return 'Настройки уведомлений'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class TelegramChat(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Ожидает'),
        ('approved', 'Одобрен'),
        ('rejected', 'Отклонён'),
    ]

    chat_id = models.BigIntegerField('Chat ID', unique=True)
    chat_type = models.CharField('Тип чата', max_length=50, blank=True)
    title = models.CharField('Название', max_length=300, blank=True)
    username = models.CharField('Username', max_length=200, blank=True)
    status = models.CharField('Статус', max_length=20, choices=STATUS_CHOICES, default='pending')
    registered_at = models.DateTimeField('Зарегистрирован', auto_now_add=True)
    updated_at = models.DateTimeField('Обновлён', auto_now=True)

    class Meta:
        verbose_name = 'Telegram чат'
        verbose_name_plural = 'Telegram чаты'
        ordering = ['-registered_at']

    def __str__(self):
        return f'{self.title or self.chat_id} ({self.get_status_display()})'
