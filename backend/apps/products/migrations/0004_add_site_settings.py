from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0003_add_performance_indexes'),
    ]

    operations = [
        migrations.CreateModel(
            name='SiteSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('phone_primary',            models.CharField(blank=True, default='+992 900 123 456', max_length=50, verbose_name='Основной телефон')),
                ('phone_secondary',          models.CharField(blank=True, default='+992 918 654 321', max_length=50, verbose_name='Дополнительный телефон')),
                ('email_primary',            models.EmailField(blank=True, default='info@elitepc.tj', verbose_name='Основной Email')),
                ('email_support',            models.EmailField(blank=True, default='support@elitepc.tj', verbose_name='Email поддержки')),
                ('telegram_handle',          models.CharField(blank=True, default='@elitepc_tj', max_length=100, verbose_name='Telegram аккаунт')),
                ('telegram_url',             models.URLField(blank=True, default='https://t.me/elitepc_tj', max_length=300, verbose_name='Telegram ссылка')),
                ('address_line1',            models.CharField(blank=True, default='Республика Таджикистан', max_length=300, verbose_name='Адрес (строка 1)')),
                ('address_line2',            models.CharField(blank=True, default='г. Душанбе, ул. Рудаки 123', max_length=300, verbose_name='Адрес (строка 2)')),
                ('address_line3',            models.CharField(blank=True, default='2 этаж, офис 205', max_length=300, verbose_name='Адрес (строка 3)')),
                ('working_hours',            models.CharField(blank=True, default='Пн-Сб: 09:00 — 19:00, Вс: выходной', max_length=300, verbose_name='Режим работы')),
                ('about_text',               models.TextField(blank=True, verbose_name='О нас (основной текст)')),
                ('about_mission',            models.TextField(blank=True, verbose_name='Миссия компании')),
                ('delivery_city_price',      models.DecimalField(decimal_places=2, default=50, max_digits=10, verbose_name='Стоимость доставки по городу (с.)')),
                ('delivery_free_threshold',  models.DecimalField(decimal_places=2, default=2000, max_digits=10, verbose_name='Порог бесплатной доставки (с.)')),
                ('delivery_city_days',       models.CharField(blank=True, default='1-2 рабочих дня', max_length=100, verbose_name='Срок доставки по городу')),
                ('delivery_country_days',    models.CharField(blank=True, default='3-7 рабочих дней', max_length=100, verbose_name='Срок доставки по Таджикистану')),
                ('site_name',                models.CharField(blank=True, default='Elite PC', max_length=200, verbose_name='Название сайта')),
                ('meta_description',         models.TextField(blank=True, verbose_name='Мета описание сайта')),
            ],
            options={
                'verbose_name': 'Настройки компании',
                'verbose_name_plural': 'Настройки компании',
            },
        ),
    ]
