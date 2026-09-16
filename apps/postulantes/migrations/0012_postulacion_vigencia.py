from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("postulantes", "0011_alter_asignacionpostulacion_tipo_participacion_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="postulacion",
            name="vigencia",
            field=models.CharField(
                choices=[
                    ("VIGENTE", "Vigente"),
                    ("DADA_DE_BAJA", "Dada de baja"),
                    ("CANCELADA", "Cancelada"),
                    ("CERRADA", "Cerrada"),
                ],
                default="VIGENTE",
                max_length=20,
                verbose_name="Vigencia de la inscripción",
            ),
        ),
    ]
