from datetime import timedelta

from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.modalidades.policies import (BaseEvaluacionPolicy, BaseEventoPolicy,
    BaseModalidadPolicy, BaseRequisitosPolicy, EtapaDefinition)


STAGE_DATA = (
    ("INSCRIPCION", "Inscripción"), ("PERFIL_PROYECTO", "Perfil de Proyecto"),
    ("DOCUMENTO_FINAL", "Documento Final"), ("REVISION_TRIBUNAL_PREVIA", "Revisión de Tribunal Previa"),
    ("DEFENSA_PRIVADA", "Defensa Privada"), ("DEFENSA_PUBLICA", "Defensa Pública"),
    ("REVISION_FINAL_POST_PUBLICA", "Revisión Final Post Pública"), ("CIERRE_DOCUMENTAL", "Cierre Documental"),
)
ETAPAS = tuple(EtapaDefinition(code, name, i + 1, inicial=i == 0, final=i == len(STAGE_DATA)-1,
    permite_reapertura=code == "CIERRE_DOCUMENTAL", siguientes_permitidas=(STAGE_DATA[i+1][0],) if i+1 < len(STAGE_DATA) else ())
    for i, (code, name) in enumerate(STAGE_DATA))


class ProyectoGradoEventoPolicy(BaseEventoPolicy):
    EVENT_STAGE = {"DEFENSA_PERFIL": "PERFIL_PROYECTO", "DEFENSA_PRIVADA": "DEFENSA_PRIVADA", "DEFENSA_PUBLICA": "DEFENSA_PUBLICA"}
    ASSIGNMENTS = {"DEFENSA_PERFIL": {"TRIBUNAL": 2}, "DEFENSA_PRIVADA": {"TRIBUNAL": 2, "DOCENTE_MODALIDAD": 1}, "DEFENSA_PUBLICA": {"TRIBUNAL": 2, "PRESIDENTE": 1, "SECRETARIO": 1}}
    def get_tipos_evento(self): return tuple(self.EVENT_STAGE)
    def get_etapa_asociada(self, tipo_evento): return self.EVENT_STAGE.get(tipo_evento)
    def validar_programacion(self, *, tipo_evento, seguimiento, fecha_programada, asignaciones, **kwargs):
        if tipo_evento not in self.EVENT_STAGE: raise ValidationError("Tipo de evento no soportado por Proyecto de Grado.")
        if seguimiento.etapa.codigo != self.EVENT_STAGE[tipo_evento]: raise ValidationError("La etapa no corresponde al tipo de evento.")
        missing = {r:n-asignaciones.filter(tipo_participacion=r).count() for r,n in self.ASSIGNMENTS[tipo_evento].items() if asignaciones.filter(tipo_participacion=r).count() < n}
        if missing: raise ValidationError(f"No existen asignaciones mínimas activas: {missing}.")
        if tipo_evento == "DEFENSA_PUBLICA" and fecha_programada < timezone.now()+timedelta(hours=48): raise ValidationError("La defensa pública debe programarse con al menos 48 horas de anticipación (diagrama oficial).")
    def validar_quorum(self, evento):
        presentes = evento.participantes.filter(presente=True, activo=True)
        counts = {r: presentes.filter(rol_evento=r).count() for r in ("TRIBUNAL","DOCENTE_MODALIDAD","PRESIDENTE","SECRETARIO")}
        req = self.ASSIGNMENTS[evento.tipo_evento]
        missing = {r:n-counts.get(r,0) for r,n in req.items() if counts.get(r,0)<n}
        return {"valido": not missing, "faltantes": missing, "detalle": counts}


class ProyectoGradoEvaluacionPolicy(BaseEvaluacionPolicy):
    def get_tipos_evaluacion(self): return ("PERFIL", "PRIVADA", "PUBLICA", "RESULTADO_FINAL")


class ProyectoGradoRequisitosPolicy(BaseRequisitosPolicy):
    CONDITIONS = ("PLAN_ESTUDIOS", "ADMISION_COMPLETA", "SOLVENCIA_UNIVERSITARIA", "SOLVENCIA_BIBLIOTECA", "MATRICULA_VIGENTE", "PLAZO_MAXIMO")
    DELIVERIES = ("CD_RESPALDO", "EJEMPLARES_IMPRESOS", "TIMBRE_UNIVERSITARIO")
    DOCUMENTS = ("DOCUMENTO_FINAL", "ACTA_DEFENSA", "HOJA_APROBACION", "INFORME_FINAL_TUTOR", "REVISION_FINAL_POST_PUBLICA")
    def get_condiciones_requeridas(self, fase=None): return self.CONDITIONS
    def get_entregas_requeridas(self, fase=None): return self.DELIVERIES
    def get_documentos_requeridos(self, fase=None): return self.DOCUMENTS


class ProyectoGradoPolicy(BaseModalidadPolicy):
    codigo = "PROYECTO_GRADO"
    etapas = ETAPAS
    evento_policy = ProyectoGradoEventoPolicy()
    evaluacion_policy = ProyectoGradoEvaluacionPolicy()
    requisitos_policy = ProyectoGradoRequisitosPolicy()
    def get_reglas_asignacion(self): return self.evento_policy.ASSIGNMENTS
    def get_cierre_policy(self):
        from apps.postulantes.cierre import ProyectoGradoCierrePolicy
        return ProyectoGradoCierrePolicy
