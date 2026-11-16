from django.db import migrations, models
import django.db.models.deletion


def move_cancellation_timestamps(apps, schema_editor):
    EventoDefensa = apps.get_model("postulantes", "EventoDefensa")
    EventoDefensa.objects.filter(
        estado="CANCELADA", fecha_fin_real__isnull=False,
    ).update(fecha_cancelacion=models.F("fecha_fin_real"), fecha_fin_real=None)


def restore_cancellation_timestamps(apps, schema_editor):
    EventoDefensa = apps.get_model("postulantes", "EventoDefensa")
    EventoDefensa.objects.filter(
        estado="CANCELADA", fecha_cancelacion__isnull=False,
    ).update(fecha_fin_real=models.F("fecha_cancelacion"))


class Migration(migrations.Migration):
    dependencies = [
        ("postulantes", "0020_proyecto_grado_defensa_propuesta"),
    ]

    operations = [
        migrations.AddField(
            model_name="eventodefensa",
            name="fecha_cancelacion",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="eventodefensa",
            name="reprogramada_desde",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.PROTECT,
                related_name="reprogramaciones", to="postulantes.eventodefensa",
            ),
        ),
        migrations.RunPython(move_cancellation_timestamps, restore_cancellation_timestamps),
        migrations.RemoveConstraint(
            model_name="eventodefensa",
            name="evento_defensa_activo_unico",
        ),
        migrations.AddConstraint(
            model_name="eventodefensa",
            constraint=models.UniqueConstraint(
                condition=models.Q(("activo", True)) & ~models.Q(("estado", "CANCELADA")),
                fields=("postulacion", "tipo_evento", "numero_intento"),
                name="evento_defensa_activo_unico",
            ),
        ),
    ]
