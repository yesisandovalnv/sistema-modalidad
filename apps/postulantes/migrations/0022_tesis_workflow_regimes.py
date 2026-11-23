from django.db import migrations, models


def clasificar_tesis_existentes(apps, schema_editor):
    Postulacion = apps.get_model("postulantes", "Postulacion")
    Postulacion.objects.filter(modalidad__codigo="TESIS_GRADO").update(
        regimen_workflow="TESIS_LEGACY_V1",
    )


def revertir_clasificacion_tesis(apps, schema_editor):
    Postulacion = apps.get_model("postulantes", "Postulacion")
    Postulacion.objects.filter(
        modalidad__codigo="TESIS_GRADO", regimen_workflow="TESIS_LEGACY_V1",
    ).update(regimen_workflow=None)


class Migration(migrations.Migration):
    dependencies = [("postulantes", "0021_cancelled_defense_rescheduling")]

    operations = [
        migrations.AlterField(
            model_name="postulacion",
            name="regimen_workflow",
            field=models.CharField(
                blank=True,
                choices=[
                    ("PG_LEGACY", "Proyecto de Grado legacy"),
                    ("PG_HITOS_V1", "Proyecto de Grado con hitos v1"),
                    ("TESIS_LEGACY_V1", "Tesis de Grado legacy"),
                    ("TESIS_PERFIL_V2", "Tesis de Grado con Perfil directo v2"),
                ],
                max_length=20,
                null=True,
                verbose_name="Régimen del workflow",
            ),
        ),
        migrations.RunPython(clasificar_tesis_existentes, revertir_clasificacion_tesis),
    ]
