from django.contrib import admin

from apps.academico.models import Modalidad, ModalidadRequisito, Periodo, Requisito


@admin.register(Periodo)
class PeriodoAdmin(admin.ModelAdmin):
    """Configuración administrativa del modelo Periodo."""

    list_display = ("nombre", "fecha_inicio", "fecha_fin", "activo")
    search_fields = ("nombre",)
    ordering = ("-fecha_inicio",)


@admin.register(Modalidad)
class ModalidadAdmin(admin.ModelAdmin):
    """Configuración administrativa del modelo Modalidad."""

    list_display = ("codigo", "nombre", "activo")
    search_fields = ("codigo", "nombre", "descripcion")
    ordering = ("nombre",)
    list_filter = ("activo",)


@admin.register(Requisito)
class RequisitoAdmin(admin.ModelAdmin):
    """Configuración administrativa del modelo Requisito."""

    list_display = ("codigo", "nombre", "obligatorio", "activo")
    search_fields = ("codigo", "nombre", "descripcion")
    ordering = ("nombre",)
    list_filter = ("obligatorio", "activo")


@admin.register(ModalidadRequisito)
class ModalidadRequisitoAdmin(admin.ModelAdmin):
    """Configuración administrativa del modelo ModalidadRequisito."""

    list_display = ("modalidad", "requisito", "orden", "activo")
    list_filter = ("modalidad", "requisito", "activo")
    search_fields = ("modalidad__nombre", "requisito__nombre")
    ordering = ("modalidad", "orden")
