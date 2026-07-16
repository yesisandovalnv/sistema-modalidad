from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from apps.usuarios.models import AuditLog, CustomUser, Role


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    """Configuración administrativa del modelo Role."""

    list_display = ("nombre", "codigo", "activo")
    search_fields = ("nombre", "codigo", "descripcion")
    ordering = ("nombre",)
    list_filter = ("activo",)


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """Configuración administrativa del usuario personalizado."""

    list_display = ("username", "nombre_completo", "ci", "role", "activo")
    search_fields = ("username", "nombres", "apellido_paterno", "apellido_materno", "ci", "correo_personal", "correo_institucional")
    list_filter = ("activo", "is_staff", "is_superuser", "role")
    ordering = ("apellido_paterno", "apellido_materno", "nombres")

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Información personal", {"fields": ("nombres", "apellido_paterno", "apellido_materno", "ci", "expedido", "fecha_nacimiento", "telefono", "correo_personal", "correo_institucional", "fotografia", "ru", "role")}),
        ("Permisos", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Fechas importantes", {"fields": ("last_login", "date_joined")}),
    )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Configuración administrativa del registro de auditoría."""

    list_display = ("usuario", "accion", "modulo", "metodo_http", "created_at")
    list_filter = ("accion", "modulo", "metodo_http", "activo")
    search_fields = ("usuario__username", "usuario__nombres", "accion", "modulo", "descripcion", "url")
    ordering = ("-created_at",)
