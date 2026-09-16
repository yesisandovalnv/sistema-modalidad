from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("postulantes", "0012_postulacion_vigencia"),
    ]

    operations = [
        migrations.AddField(
            model_name="postulacion",
            name="fecha_baja",
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name="Fecha de baja",
            ),
        ),
        migrations.AddField(
            model_name="postulacion",
            name="motivo_baja",
            field=models.TextField(
                blank=True,
                null=True,
                verbose_name="Motivo de baja",
            ),
        ),
        migrations.AddField(
            model_name="postulacion",
            name="baja_por",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="postulaciones_dadas_de_baja",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Responsable de la baja",
            ),
        ),
    ]
