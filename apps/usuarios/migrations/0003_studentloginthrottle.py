from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("usuarios", "0002_alter_customuser_managers_alter_role_managers"),
    ]

    operations = [
        migrations.CreateModel(
            name="StudentLoginThrottle",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")),
                ("activo", models.BooleanField(default=True, verbose_name="Activo")),
                ("scope", models.CharField(choices=[("ACCOUNT", "Cuenta"), ("ORIGIN", "Origen")], max_length=10)),
                ("key_digest", models.CharField(max_length=64)),
                ("failed_attempts", models.PositiveSmallIntegerField(default=0)),
                ("window_started_at", models.DateTimeField(blank=True, null=True)),
                ("blocked_until", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "verbose_name": "Control de acceso estudiantil",
                "verbose_name_plural": "Controles de acceso estudiantil",
                "indexes": [models.Index(fields=["scope", "blocked_until"], name="idx_student_login_block")],
                "constraints": [models.UniqueConstraint(fields=("scope", "key_digest"), name="unique_student_login_throttle_key")],
            },
        ),
    ]
