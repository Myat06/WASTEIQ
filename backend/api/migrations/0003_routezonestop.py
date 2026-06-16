from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_routeassignment'),
    ]

    operations = [
        migrations.CreateModel(
            name='RouteZoneStop',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('stop_order', models.PositiveSmallIntegerField()),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('assignment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='stops', to='api.routeassignment')),
                ('zone', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='zone_stops', to='api.zone')),
            ],
            options={
                'ordering': ['stop_order'],
                'unique_together': {('assignment', 'stop_order')},
            },
        ),
    ]
