from django.contrib import admin

from apps.academico.models import EtapaModalidad, Modalidad, ModalidadRequisito, Periodo, Requisito


@admin.register(Periodo)
class PeriodoAdmin(admin.ModelAdmin):
    """Configuración administrativa del modelo Periodo."""

    list_display = ("nombre", "gestion", "semestre", "fecha_inicio", "fecha_fin", "activo")
    search_fields = ("nombre", "gestion")
    list_filter = ("gestion", "semestre", "activo")
    ordering = ("-gestion", "-semestre", "-fecha_inicio")


@admin.register(Modalidad)
class ModalidadAdmin(admin.ModelAdmin):
    """Configuración administrativa del modelo Modalidad."""

    list_display = ("codigo", "nombre", "policy_registrada", "workflow_configurado", "eventos_soportados", "cierre_soportado", "activo")
    search_fields = ("codigo", "nombre", "descripcion")
    ordering = ("nombre",)
    list_filter = ("activo",)

    @admin.display(boolean=True, description="Policy")
    def policy_registrada(self, obj):
        from apps.modalidades.policies import ModalidadPolicyRegistry
        return ModalidadPolicyRegistry.has_policy(obj)

    @admin.display(boolean=True, description="Workflow")
    def workflow_configurado(self, obj): return self._cap(obj).workflow_configurado
    @admin.display(boolean=True, description="Eventos")
    def eventos_soportados(self, obj): return self._cap(obj).eventos_soportados
    @admin.display(boolean=True, description="Cierre")
    def cierre_soportado(self, obj): return self._cap(obj).cierre_soportado
    def _cap(self, obj):
        from apps.modalidades.policies import ModalidadPolicyRegistry, unsupported_capabilities
        return ModalidadPolicyRegistry.get(obj).get_capabilities(obj) if ModalidadPolicyRegistry.has_policy(obj) else unsupported_capabilities(obj)


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


@admin.register(EtapaModalidad)
class EtapaModalidadAdmin(admin.ModelAdmin):
    """Configuración administrativa del modelo EtapaModalidad."""

    list_display = ("modalidad", "orden", "codigo", "nombre", "obligatoria", "permite_repeticion", "activo")
    list_filter = ("modalidad", "obligatoria", "permite_repeticion", "activo")
    search_fields = ("modalidad__nombre", "codigo", "nombre")
    ordering = ("modalidad", "orden")
