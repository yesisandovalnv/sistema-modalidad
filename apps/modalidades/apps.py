from django.apps import AppConfig


class ModalidadesConfig(AppConfig):
    """App deprecada: reemplazada por apps.academico.Modalidad."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.modalidades'

    def ready(self):
        from apps.modalidades.policies import ModalidadPolicyRegistry
        from apps.modalidades.proyecto_grado import ProyectoGradoPolicy
        from apps.modalidades.tesis_grado import TesisGradoPolicy
        ModalidadPolicyRegistry.register("PROYECTO_GRADO", ProyectoGradoPolicy)
        ModalidadPolicyRegistry.register("TESIS_GRADO", TesisGradoPolicy)
