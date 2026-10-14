import core.managers
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("documentos", "0005_confirmacion_correccion_documento"),
        ("postulantes", "0018_postulacion_regimen_workflow"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PublicacionMemorandumDesignacion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")),
                ("activo", models.BooleanField(default=True, verbose_name="Activo")),
                ("fecha_publicacion", models.DateTimeField(default=django.utils.timezone.now)),
                ("asignaciones", models.ManyToManyField(related_name="publicaciones_memorandum_designacion", to="postulantes.asignacionpostulacion")),
                ("postulacion", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="publicaciones_memorandum_designacion", to="postulantes.postulacion")),
                ("publicado_por", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="memorandums_designacion_publicados", to=settings.AUTH_USER_MODEL)),
                ("seguimiento_etapa", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="publicaciones_memorandum_designacion", to="postulantes.seguimientoetapa")),
                ("version_documento", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="publicacion_designacion", to="documentos.versiondocumento")),
            ],
            options={
                "ordering": ["-fecha_publicacion", "-pk"],
            },
            managers=[("objects", core.managers.ActiveManager())],
        ),
        migrations.AddConstraint(
            model_name="publicacionmemorandumdesignacion",
            constraint=models.UniqueConstraint(condition=models.Q(("activo", True)), fields=("postulacion",), name="unique_memorandum_designacion_activo"),
        ),
    ]
