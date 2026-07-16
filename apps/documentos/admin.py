from django.contrib import admin

from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, ObservacionDocumento, TipoDocumento, VersionDocumento


@admin.register(EstadoDocumento)
class EstadoDocumentoAdmin(admin.ModelAdmin):
    """Configuración administrativa del modelo EstadoDocumento."""

    list_display = ("codigo", "nombre", "descripcion", "activo")
    search_fields = ("codigo", "nombre")
    list_filter = ("activo", "nombre")
    ordering = ("nombre",)


@admin.register(TipoDocumento)
class TipoDocumentoAdmin(admin.ModelAdmin):
    """Configuración administrativa del modelo TipoDocumento."""

    list_display = (
        "codigo",
        "nombre",
        "obligatorio",
        "permite_multiple_version",
        "tamano_maximo_mb",
        "activo",
    )
    search_fields = ("codigo", "nombre")
    list_filter = ("activo", "obligatorio", "permite_multiple_version")
    ordering = ("nombre",)


@admin.register(DocumentoPostulacion)
class DocumentoPostulacionAdmin(admin.ModelAdmin):
    """Configuración administrativa del modelo DocumentoPostulacion."""

    list_display = (
        "postulacion",
        "tipo_documento",
        "estado",
        "fecha_subida",
        "fecha_revision",
        "requiere_correccion",
        "activo",
    )
    search_fields = (
        "postulacion__codigo",
        "tipo_documento__nombre",
        "estado__nombre",
    )
    list_filter = (
        "activo",
        "estado",
        "requiere_correccion",
        "fecha_subida",
    )
    ordering = ("-fecha_subida",)
    autocomplete_fields = (
        "postulacion",
        "tipo_documento",
        "estado",
    )


@admin.register(VersionDocumento)
class VersionDocumentoAdmin(admin.ModelAdmin):
    """Configuración administrativa del modelo VersionDocumento."""

    list_display = (
        "documento",
        "numero_version",
        "subido_por",
        "fecha_subida",
        "es_version_actual",
        "activo",
    )
    search_fields = (
        "documento__postulacion__codigo",
        "documento__tipo_documento__nombre",
        "subido_por__username",
        "nombre_original",
        "hash_sha256",
    )
    list_filter = (
        "activo",
        "es_version_actual",
        "fecha_subida",
    )
    ordering = ("-numero_version",)
    autocomplete_fields = (
        "documento",
        "subido_por",
    )


@admin.register(ObservacionDocumento)
class ObservacionDocumentoAdmin(admin.ModelAdmin):
    """Configuración administrativa del modelo ObservacionDocumento."""

    list_display = (
        "version_documento",
        "usuario",
        "leida_por_estudiante",
        "corregida",
        "fecha_observacion",
        "activo",
    )
    search_fields = (
        "version_documento__documento__postulacion__codigo",
        "version_documento__documento__tipo_documento__nombre",
        "usuario__username",
        "comentario",
    )
    list_filter = (
        "activo",
        "leida_por_estudiante",
        "corregida",
        "fecha_observacion",
    )
    ordering = ("-fecha_observacion",)
    autocomplete_fields = (
        "version_documento",
        "usuario",
    )
