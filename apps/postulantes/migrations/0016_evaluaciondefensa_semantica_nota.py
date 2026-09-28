from django.db import migrations, models


def mark_project_legacy_scores(apps, schema_editor):
    EvaluacionDefensa = apps.get_model("postulantes", "EvaluacionDefensa")
    database = schema_editor.connection.alias
    project_rows = EvaluacionDefensa.objects.using(database).filter(
        evento__postulacion__modalidad__codigo="PROYECTO_GRADO",
    )
    project_rows.filter(tipo_evaluacion__in=("PRIVADA", "PUBLICA")).update(
        semantica_nota="LEGACY_PONDERADA",
    )
    project_rows.filter(
        tipo_evaluacion="RESULTADO_FINAL",
        evento__tipo_evento__in=("DEFENSA_PRIVADA", "DEFENSA_PUBLICA"),
    ).update(semantica_nota="LEGACY_PONDERADA")


class Migration(migrations.Migration):
    dependencies = [("postulantes", "0015_postulacion_tipo_registro")]

    operations = [
        migrations.AddField(
            model_name="evaluaciondefensa",
            name="semantica_nota",
            field=models.CharField(
                choices=[
                    ("LEGACY_PONDERADA", "Escala ponderada anterior"),
                    ("BRUTA_100", "Calificación bruta sobre 100"),
                    ("MODALIDAD_ESPECIFICA", "Escala específica de modalidad"),
                ],
                default="MODALIDAD_ESPECIFICA",
                max_length=24,
            ),
        ),
        migrations.RunPython(mark_project_legacy_scores, migrations.RunPython.noop),
    ]