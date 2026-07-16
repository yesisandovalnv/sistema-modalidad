from django.contrib.auth.models import AbstractUser
from django.db import models

from core.managers import ActiveManager
from core.models import BaseModel


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
