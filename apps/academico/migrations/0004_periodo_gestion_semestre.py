import re

from django.db import migrations, models


YEAR_PATTERN = re.compile(r"(?<!\d)((?:19|20|21)\d{2})(?!\d)")
SEMESTER_PATTERN = re.compile(r"(?:^|[^A-Z])(II|I)(?:$|[^A-Z])", re.IGNORECASE)


def populate_period_fields(apps, schema_editor):
    Periodo = apps.get_model("academico", "Periodo")
    assignments = []
    invalid = []
    collisions = {}

    for periodo in Periodo.objects.order_by("pk"):
        years = sorted(set(YEAR_PATTERN.findall(periodo.nombre or "")))
        semesters = sorted(set(value.upper() for value in SEMESTER_PATTERN.findall(periodo.nombre or "")))
        if len(years) != 1 or len(semesters) != 1:
            invalid.append(
                f"id={periodo.pk}, nombre={periodo.nombre!r}: se esperaba exactamente una gestión y un semestre I/II en el nombre"
            )
            continue

        key = (int(years[0]), semesters[0])
        collisions.setdefault(key, []).append((periodo.pk, periodo.nombre))
        assignments.append((periodo.pk, *key))

    duplicated = {key: rows for key, rows in collisions.items() if len(rows) > 1}
    if invalid or duplicated:
        details = invalid[:]
        details.extend(
            f"gestión={key[0]}, semestre={key[1]}: "
            + ", ".join(f"id={pk} ({name!r})" for pk, name in rows)
            for key, rows in sorted(duplicated.items())
        )
        raise RuntimeError(
            "No se pudo migrar Periodo.gestion/semestre. "
            "No se modificó ningún registro. Diagnóstico: " + " | ".join(details)
        )

    for pk, gestion, semestre in assignments:
        Periodo.objects.filter(pk=pk).update(gestion=gestion, semestre=semestre)


class Migration(migrations.Migration):
    # El backfill y los cambios de esquema forman una sola unidad: cualquier
    # diagnóstico aborta la migración completa, incluidos los AddField previos.
    atomic = True
    dependencies = [("academico", "0003_etapamodalidad_and_more")]
    operations = [
        migrations.AddField(
            model_name="periodo",
            name="gestion",
            field=models.PositiveSmallIntegerField(blank=True, null=True, verbose_name="Gestión"),
        ),
        migrations.AddField(
            model_name="periodo",
            name="semestre",
            field=models.CharField(blank=True, choices=[("I", "Semestre I"), ("II", "Semestre II")], max_length=2, null=True, verbose_name="Semestre"),
        ),
        migrations.RunPython(populate_period_fields, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="periodo",
            name="gestion",
            field=models.PositiveSmallIntegerField(verbose_name="Gestión"),
        ),
        migrations.AlterField(
            model_name="periodo",
            name="semestre",
            field=models.CharField(choices=[("I", "Semestre I"), ("II", "Semestre II")], max_length=2, verbose_name="Semestre"),
        ),
        migrations.AddConstraint(
            model_name="periodo",
            constraint=models.UniqueConstraint(
                fields=("gestion", "semestre"),
                name="unique_periodo_gestion_semestre",
            ),
        ),
        migrations.AlterModelOptions(
            name="periodo",
            options={
                "ordering": ["-gestion", "-semestre"],
                "verbose_name": "Período",
                "verbose_name_plural": "Períodos",
            },
        ),
    ]
