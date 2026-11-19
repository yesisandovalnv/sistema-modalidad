from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("usuarios", "0004_customuser_usuarios_customuser_ru_nonblank_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="StudentAccountActivation",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")),
                ("activo", models.BooleanField(default=True, verbose_name="Activo")),
                ("code_digest", models.CharField(blank=True, max_length=64)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("failed_attempts", models.PositiveSmallIntegerField(default=0)),
                ("last_sent_at", models.DateTimeField(blank=True, null=True)),
                ("request_window_started_at", models.DateTimeField(blank=True, null=True)),
                ("requests_in_window", models.PositiveSmallIntegerField(default=0)),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="student_account_activation",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Activación de cuenta estudiantil",
                "verbose_name_plural": "Activaciones de cuentas estudiantiles",
            },
        ),
    ]
