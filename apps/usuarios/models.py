from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import Q
from django.db.models.functions import Trim, Upper

from core.managers import ActiveManager
from core.models import BaseModel


RU_NORMALIZED_UNIQUE_CONSTRAINT = "usuarios_customuser_ru_norm_uniq"
CI_NORMALIZED_UNIQUE_CONSTRAINT = "usuarios_customuser_ci_norm_uniq"


class Role(BaseModel):
    """Modelo de rol reutilizable para la seguridad del sistema."""

    codigo = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="Código",
    )
    nombre = models.CharField(
        max_length=100,
        verbose_name="Nombre",
    )
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name="Descripción",
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        """Configuración del modelo Role para el panel administrativo y las consultas."""

        verbose_name = "Rol"
        verbose_name_plural = "Roles"
        ordering = ["nombre"]
        app_label = "usuarios"

    def __str__(self) -> str:
        """Retorna la representación legible del rol."""
        return self.nombre


class CustomUser(AbstractUser, BaseModel):
    """Usuario personalizado del sistema con datos personales y académicos básicos."""

    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name="usuarios",
        verbose_name="Rol",
        blank=True,
        null=True,
    )
    nombres = models.CharField(
        max_length=150,
        verbose_name="Nombres",
        blank=True,
    )
    apellido_paterno = models.CharField(
        max_length=100,
        verbose_name="Apellido paterno",
        blank=True,
    )
    apellido_materno = models.CharField(
        max_length=100,
        verbose_name="Apellido materno",
        blank=True,
    )
    ci = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="Cédula de identidad",
        blank=True,
        null=True,
        default=None,
    )
    expedido = models.CharField(
        max_length=50,
        verbose_name="Expedido en",
        blank=True,
    )
    fecha_nacimiento = models.DateField(
        verbose_name="Fecha de nacimiento",
        blank=True,
        null=True,
    )
    telefono = models.CharField(
        max_length=20,
        verbose_name="Teléfono",
        blank=True,
    )
    correo_personal = models.EmailField(
        verbose_name="Correo personal",
        blank=True,
    )
    correo_institucional = models.EmailField(
        verbose_name="Correo institucional",
        blank=True,
    )
    fotografia = models.FileField(
        upload_to="fotos_usuarios/",
        verbose_name="Fotografía",
        blank=True,
        null=True,
    )
    ru = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="R.U.",
        blank=True,
        null=True,
        default=None,
    )

    username = models.CharField(
        max_length=150,
        unique=True,
        verbose_name="Nombre de usuario",
    )
    email = models.EmailField(
        verbose_name="Correo electrónico",
        blank=True,
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        """Configuración del modelo CustomUser para la administración y consultas."""

        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
        ordering = ["apellido_paterno", "apellido_materno", "nombres"]
        app_label = "usuarios"
        constraints = [
            models.CheckConstraint(
                condition=Q(ru__isnull=True) | Q(ru__regex=r"\S"),
                name="usuarios_customuser_ru_nonblank",
            ),
            models.CheckConstraint(
                condition=Q(ci__isnull=True) | Q(ci__regex=r"\S"),
                name="usuarios_customuser_ci_nonblank",
            ),
            models.UniqueConstraint(
                Upper(Trim("ru")),
                condition=Q(ru__isnull=False),
                name=RU_NORMALIZED_UNIQUE_CONSTRAINT,
            ),
            models.UniqueConstraint(
                Trim("ci"),
                condition=Q(ci__isnull=False),
                name=CI_NORMALIZED_UNIQUE_CONSTRAINT,
            ),
        ]

    @property
    def nombre_completo(self) -> str:
        """Retorna el nombre completo del usuario en formato legible."""
        return f"{self.nombres} {self.apellido_paterno} {self.apellido_materno}".strip()

    def __str__(self) -> str:
        """Retorna la representación legible del usuario."""
        return self.nombre_completo or self.username


class AuditLog(BaseModel):
    """Registro de auditoría para acciones relevantes del sistema."""

    usuario = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="audit_logs",
        verbose_name="Usuario",
    )
    accion = models.CharField(
        max_length=100,
        verbose_name="Acción",
    )
    modulo = models.CharField(
        max_length=100,
        verbose_name="Módulo",
    )
    descripcion = models.TextField(
        verbose_name="Descripción",
    )
    ip_address = models.GenericIPAddressField(
        verbose_name="Dirección IP",
        blank=True,
        null=True,
    )
    metodo_http = models.CharField(
        max_length=10,
        verbose_name="Método HTTP",
        blank=True,
    )
    url = models.CharField(
        max_length=300,
        verbose_name="URL",
        blank=True,
    )

    class Meta:
        """Configuración del modelo AuditLog para consultas y administración."""

        verbose_name = "Registro de auditoría"
        verbose_name_plural = "Registros de auditoría"
        ordering = ["-created_at"]
        app_label = "usuarios"

    def __str__(self) -> str:
        """Retorna un resumen legible del registro de auditoría."""
        return f"{self.usuario} - {self.accion} - {self.modulo}"


class StudentLoginThrottle(BaseModel):
    """Contador persistente y pseudonimizado para el acceso estudiantil."""

    class Scope(models.TextChoices):
        ACCOUNT = "ACCOUNT", "Cuenta"
        ORIGIN = "ORIGIN", "Origen"

    scope = models.CharField(max_length=10, choices=Scope.choices)
    key_digest = models.CharField(max_length=64)
    failed_attempts = models.PositiveSmallIntegerField(default=0)
    window_started_at = models.DateTimeField(blank=True, null=True)
    blocked_until = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = "Control de acceso estudiantil"
        verbose_name_plural = "Controles de acceso estudiantil"
        constraints = [
            models.UniqueConstraint(
                fields=["scope", "key_digest"],
                name="unique_student_login_throttle_key",
            ),
        ]
        indexes = [
            models.Index(fields=["scope", "blocked_until"], name="idx_student_login_block"),
        ]

    def __str__(self) -> str:
        return f"{self.scope} - intentos {self.failed_attempts}"


class StudentAccountActivation(BaseModel):
    """Single-use, purpose-bound email code state for student activation/recovery."""

    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="student_account_activation",
    )
    code_digest = models.CharField(max_length=64, blank=True)
    password_snapshot = models.CharField(max_length=128, blank=True)
    expires_at = models.DateTimeField(blank=True, null=True)
    failed_attempts = models.PositiveSmallIntegerField(default=0)
    last_sent_at = models.DateTimeField(blank=True, null=True)
    request_window_started_at = models.DateTimeField(blank=True, null=True)
    requests_in_window = models.PositiveSmallIntegerField(default=0)
    used_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = "Activación de cuenta estudiantil"
        verbose_name_plural = "Activaciones de cuentas estudiantiles"

    def __str__(self) -> str:
        return f"Activación estudiantil para usuario {self.user_id}"
