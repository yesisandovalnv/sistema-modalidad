from django.contrib import admin

from apps.postulantes.models import (
    AsignacionPostulacion,
    EstadoPostulacion,
    HistorialEstado,
    Observacion,
    Postulacion,
    SeguimientoEtapa,
    EventoDefensa,
    ParticipanteEvento,
    EvaluacionDefensa,
    CondicionPostulacion,
    EntregaFisica,
)


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
        "revision_final_aprobada",
        "cierre_documental_aprobado",
        "condiciones_pendientes",
        "entregas_pendientes",
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
    readonly_fields = ("estado_actual", "fecha_postulacion", "created_at", "updated_at")

    @admin.display(boolean=True, description="Revisión final aprobada")
    def revision_final_aprobada(self,obj): return obj.seguimientos_etapa.filter(etapa__codigo="REVISION_FINAL_POST_PUBLICA",estado="APROBADA",activo=True).exists()
    @admin.display(boolean=True, description="Cierre aprobado")
    def cierre_documental_aprobado(self,obj): return obj.seguimientos_etapa.filter(etapa__codigo="CIERRE_DOCUMENTAL",estado="APROBADA",activo=True).exists()
    @admin.display(description="Condiciones pendientes")
    def condiciones_pendientes(self,obj): return obj.condiciones.filter(activo=True).exclude(estado="CUMPLE").count()
    @admin.display(description="Entregas pendientes")
    def entregas_pendientes(self,obj): return obj.entregas_fisicas.filter(activo=True).exclude(estado="COMPLETA").count()


@admin.register(SeguimientoEtapa)
class SeguimientoEtapaAdmin(admin.ModelAdmin):
    """Configuración administrativa del modelo SeguimientoEtapa."""

    list_display = (
        "postulacion",
        "etapa",
        "estado",
        "numero_intento",
        "fecha_inicio",
        "fecha_fin",
        "activo",
    )
    list_filter = (
        "etapa__modalidad",
        "etapa",
        "estado",
        "numero_intento",
        "activo",
    )
    search_fields = (
        "postulacion__codigo",
        "postulacion__estudiante__username",
        "etapa__codigo",
        "etapa__nombre",
    )
    ordering = ("postulacion", "etapa__orden", "numero_intento")


@admin.register(AsignacionPostulacion)
class AsignacionPostulacionAdmin(admin.ModelAdmin):
    """Configuración administrativa del modelo AsignacionPostulacion."""

    list_display = (
        "postulacion",
        "usuario",
        "tipo_participacion",
        "orden_cargo",
        "seguimiento_etapa",
        "fecha_designacion",
        "fecha_finalizacion",
        "activo",
    )
    list_filter = (
        "tipo_participacion",
        "activo",
        "fecha_designacion",
        "seguimiento_etapa__etapa",
    )
    search_fields = (
        "postulacion__estudiante__nombres",
        "postulacion__estudiante__apellido_paterno",
        "postulacion__estudiante__apellido_materno",
        "postulacion__estudiante__ru",
        "usuario__nombres",
        "usuario__apellido_paterno",
        "usuario__apellido_materno",
        "usuario__email",
        "usuario__correo_personal",
        "usuario__correo_institucional",
        "tipo_participacion",
    )
    readonly_fields = (
        "designado_por",
        "fecha_designacion",
        "fecha_finalizacion",
        "created_at",
        "updated_at",
    )
    ordering = ("postulacion", "tipo_participacion", "orden_cargo", "-fecha_designacion")

    def get_readonly_fields(self, request, obj=None):
        readonly = list(super().get_readonly_fields(request, obj))
        if obj is not None:
            readonly.extend(
                [
                    "postulacion",
                    "usuario",
                    "tipo_participacion",
                    "orden_cargo",
                    "seguimiento_etapa",
                ]
            )
        return tuple(readonly)

@admin.register(EventoDefensa)
class EventoDefensaAdmin(admin.ModelAdmin):
    list_display=("postulacion","tipo_evento","numero_intento","estado","fecha_programada","modalidad_evento","activo")
    list_filter=("tipo_evento","estado","modalidad_evento","activo")
    search_fields=("postulacion__codigo","lugar","observaciones")
    readonly_fields=("estado","fecha_inicio_real","fecha_fin_real","iniciado_por","cerrado_por","created_at","updated_at")

@admin.register(ParticipanteEvento)
class ParticipanteEventoAdmin(admin.ModelAdmin):
    list_display=("evento","asignacion","rol_evento","convocado","presente","activo")
    list_filter=("rol_evento","convocado","presente","activo")
    search_fields=("evento__postulacion__codigo","asignacion__usuario__username")
    readonly_fields=("presente","fecha_registro_asistencia","registrado_por","created_at","updated_at")

@admin.register(EvaluacionDefensa)
class EvaluacionDefensaAdmin(admin.ModelAdmin):
    list_display=("evento","tipo_evaluacion","modalidad_registro","resultado_cualitativo","nota_numerica","es_resultado_final_evento")
    list_filter=("tipo_evaluacion","modalidad_registro","resultado_cualitativo","es_resultado_final_evento")
    search_fields=("evento__postulacion__codigo","observaciones")
    readonly_fields=("nota_numerica","ponderacion","aporte_ponderado","semantica_nota","es_resultado_final_evento","registrado_por","created_at","updated_at")

@admin.register(CondicionPostulacion)
class CondicionPostulacionAdmin(admin.ModelAdmin):
    list_display=("postulacion","codigo","estado","fecha_verificacion","verificado_por","activo")
    list_filter=("tipo","estado","activo")
    search_fields=("postulacion__codigo","codigo","nombre","observaciones")
    readonly_fields=("estado","fecha_verificacion","verificado_por","created_at","updated_at")

@admin.register(EntregaFisica)
class EntregaFisicaAdmin(admin.ModelAdmin):
    list_display=("postulacion","codigo","cantidad_recibida","estado","fecha_entrega","recibido_por","activo")
    list_filter=("codigo","estado","activo")
    search_fields=("postulacion__codigo","codigo","nombre","observaciones")
    readonly_fields=("cantidad_recibida","estado","fecha_entrega","recibido_por","created_at","updated_at")
