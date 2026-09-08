from django.apps import AppConfig


class ModalidadesConfig(AppConfig):
    """App deprecada: reemplazada por apps.academico.Modalidad."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.modalidades'

    def ready(self):
        from apps.modalidades.policies import ModalidadPolicyRegistry
        from apps.modalidades.proyecto_grado import ProyectoGradoPolicy
        from apps.modalidades.tesis_grado import TesisGradoPolicy
        from apps.modalidades.examen_grado import ExamenGradoPolicy
        from apps.modalidades.excelencia_academica import ExcelenciaAcademicaPolicy
        ModalidadPolicyRegistry.register("PROYECTO_GRADO", ProyectoGradoPolicy)
        ModalidadPolicyRegistry.register("TESIS_GRADO", TesisGradoPolicy)
        ModalidadPolicyRegistry.register("EXAMEN_GRADO", ExamenGradoPolicy)
        ModalidadPolicyRegistry.register("EXCELENCIA_ACADEMICA", ExcelenciaAcademicaPolicy)
