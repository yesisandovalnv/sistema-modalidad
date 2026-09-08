from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("postulantes", "0008_dictamen_revision_documento"),
    ]

    operations = [
        migrations.AlterField(
            model_name="asignacionpostulacion",
            name="tipo_participacion",
            field=models.CharField(
                choices=[
                    ("TUTOR", "Tutor"),
                    ("TRIBUNAL", "Tribunal"),
                    ("DOCENTE_MODALIDAD", "Docente de modalidad"),
                    ("PRESIDENTE", "Presidente"),
                    ("SECRETARIO", "Secretario"),
                    ("DIRECTOR_INSTITUTO_INVESTIGACION", "Director del Instituto de Investigación"),
                ],
                help_text="Código técnico del sistema fundamentado en los actores del reglamento y el diagrama oficial.",
                max_length=40,
                verbose_name="Tipo de participación",
            ),
        ),
    ]