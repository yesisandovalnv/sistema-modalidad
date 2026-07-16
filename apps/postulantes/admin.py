from django.contrib import admin

from apps.postulantes.models import EstadoPostulacion, HistorialEstado, Observacion, Postulacion


@admin.register(EstadoPostulacion)
class EstadoPostulacionAdmin(admin.ModelAdmin):
    """Configuración administrativa del modelo EstadoPostulacion."""

    list_display = ("codigo", "nombre", "descripcion", "activo")
    search_fields = ("codigo", "nombre")
    ordering = ("nombre",)
    list_filter = ("activo",)


@admin.register(HistorialEstado)
class HistorialEstadoAdmin(admin.ModelAdmin):
    """Configuración administrativa del modelo HistorialEstado."""

    list_display = (
        "postulacion",
        "estado_anterior",
        "estado_nuevo",
        "usuario",
        "fecha_cambio",
        "activo",
    )
    search_fields = (
        "postulacion__codigo",
        "estado_anterior__nombre",
        "estado_nuevo__nombre",
        "usuario__username",
        "comentario",
    )
    list_filter = (
        "activo",
        "estado_anterior",
        "estado_nuevo",
        "fecha_cambio",
    )
    ordering = ("-fecha_cambio",)


@admin.register(Observacion)
class ObservacionAdmin(admin.ModelAdmin):
    """Configuración administrativa del modelo Observacion."""

    list_display = (
        "postulacion",
        "usuario",
        "leida_estudiante",
        "fecha_observacion",
        "activo",
    )
    search_fields = (
        "postulacion__codigo",
        "usuario__username",
        "comentario",
    )
    list_filter = (
        "activo",
        "leida_estudiante",
        "fecha_observacion",
    )
    ordering = ("-fecha_observacion",)


@admin.register(Postulacion)
class PostulacionAdmin(admin.ModelAdmin):
    """Configuración administrativa del modelo Postulacion."""

    list_display = (
        "codigo",
        "estudiante",
        "modalidad",
        "periodo",
        "estado_actual",
        "fecha_postulacion",
        "activo",
    )
    search_fields = (
        "codigo",
        "estudiante__username",
        "estudiante__nombres",
        "estudiante__apellido_paterno",
        "estudiante__apellido_materno",
        "modalidad__nombre",
        "periodo__nombre",
    )
    list_filter = (
        "activo",
        "modalidad",
        "periodo",
        "fecha_postulacion",
    )
    ordering = ("-fecha_postulacion",)
