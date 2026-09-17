from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("academico", "0008_alter_documentooficialmodalidad_modalidad"),
    ]

    operations = [
        migrations.AlterField(
            model_name="documentooficialmodalidad",
            name="nombre",
            field=models.CharField(max_length=200, verbose_name="Nombre del documento"),
        ),
    ]
