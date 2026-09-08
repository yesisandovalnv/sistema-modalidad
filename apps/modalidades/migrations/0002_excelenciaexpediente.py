import core.managers
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("modalidades", "0001_initial"),
        ("postulantes", "0008_dictamen_revision_documento"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ExcelenciaExpediente",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")),
                ("activo", models.BooleanField(default=True, verbose_name="Activo")),
                ("criterio", models.CharField(choices=[("RENDIMIENTO_ACADEMICO", "Rendimiento académico"), ("RECONOCIMIENTO_CALIDAD", "Reconocimiento a la calidad")], max_length=30)),
                ("resultado", models.CharField(choices=[("PENDIENTE", "Pendiente"), ("FAVORABLE", "Favorable"), ("DESFAVORABLE", "Desfavorable")], default="PENDIENTE", max_length=20)),
                ("promedio_general", models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ("observaciones", models.TextField(blank=True)),
                ("fecha_evaluacion", models.DateTimeField(blank=True, null=True)),
                ("evaluado_por", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="evaluaciones_excelencia", to=settings.AUTH_USER_MODEL)),
                ("postulacion", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="excelencia_expediente", to="postulantes.postulacion")),
            ],
            options={"ordering": ["postulacion"]},
            managers=[("objects", core.managers.ActiveManager())],
        ),
    ]