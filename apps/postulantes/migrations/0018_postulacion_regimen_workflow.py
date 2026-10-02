from django.db import migrations, models


def clasificar_proyecto_grado_legacy(apps, schema_editor):
    Postulacion = apps.get_model("postulantes", "Postulacion")
    Postulacion.objects.filter(modalidad__codigo="PROYECTO_GRADO").update(
        regimen_workflow="PG_LEGACY",
    )


class Migration(migrations.Migration):

    dependencies = [
        ("postulantes", "0017_decisionacademicaetapa_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="postulacion",
            name="regimen_workflow",
            field=models.CharField(
                blank=True,
                choices=[
                    ("PG_LEGACY", "Proyecto de Grado legacy"),
                    ("PG_HITOS_V1", "Proyecto de Grado con hitos v1"),
                ],
                max_length=20,
                null=True,
                verbose_name="Régimen del workflow",
            ),
        ),
        migrations.RunPython(clasificar_proyecto_grado_legacy, migrations.RunPython.noop),
    ]