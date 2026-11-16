from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("postulantes", "0019_publicacionmemorandumdesignacion"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="decisionacademicaetapa",
            name="evento_defensa",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.PROTECT,
                related_name="decisiones_academicas", to="postulantes.eventodefensa",
            ),
        ),
        migrations.AlterField(
            model_name="eventodefensa",
            name="tipo_evento",
            field=models.CharField(max_length=30, choices=[
                ("DEFENSA_TEMATICA", "Defensa de temática"),
                ("DEFENSA_PROPUESTA", "Defensa de propuesta"),
                ("DEFENSA_PERFIL", "Defensa de perfil"),
                ("DEFENSA_PRIVADA", "Defensa privada"),
                ("DEFENSA_PUBLICA", "Defensa pública"),
            ]),
        ),
        migrations.AlterField(
            model_name="evaluaciondefensa",
            name="tipo_evaluacion",
            field=models.CharField(max_length=20, choices=[
                ("TEMATICA", "Temática"), ("PROPUESTA", "Propuesta"),
                ("PERFIL", "Perfil"), ("PRIVADA", "Privada"),
                ("PUBLICA", "Pública"), ("RESULTADO_FINAL", "Resultado final"),
            ]),
        ),
    ]
