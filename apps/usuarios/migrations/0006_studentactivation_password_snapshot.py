from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("usuarios", "0005_studentaccountactivation"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentaccountactivation",
            name="password_snapshot",
            field=models.CharField(blank=True, max_length=128),
        ),
    ]
