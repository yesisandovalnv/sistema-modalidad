from dataclasses import dataclass, field

from apps.academico.models import Modalidad
from apps.modalidades.policies import ModalidadPolicyRegistry


@dataclass
class ConfigurationResult:
    codigo: str
    errores: list[str] = field(default_factory=list)
    advertencias: list[str] = field(default_factory=list)
    @property
    def valida(self): return not self.errores
    def to_dict(self): return {"codigo": self.codigo, "valida": self.valida, "errores": self.errores, "advertencias": self.advertencias}


class ModalidadConfigurationValidator:
    @classmethod
    def validate_modalidad(cls, modalidad):
        result = ConfigurationResult(modalidad.codigo)
        if not ModalidadPolicyRegistry.has_policy(modalidad):
            result.advertencias.append("Normativa específica no configurada")
            return result
        policy = ModalidadPolicyRegistry.get(modalidad)
        result.errores.extend(policy.validate_configuration())
        persisted = list(modalidad.etapas.filter(activo=True).values("codigo", "orden"))
        persisted_codes = {x["codigo"] for x in persisted}
        for stage in policy.get_etapas_obligatorias():
            if stage.codigo not in persisted_codes: result.errores.append(f"Etapa obligatoria no persistida: {stage.codigo}.")
        initial = policy.get_etapa_inicial()
        if initial and initial.codigo not in persisted_codes: result.errores.append(f"Etapa inicial no persistida: {initial.codigo}.")
        if len([x["orden"] for x in persisted]) != len({x["orden"] for x in persisted}): result.errores.append("Existen órdenes persistidos duplicados.")
        for event_type in policy.get_tipos_evento():
            if not policy.evento_policy.get_etapa_asociada(event_type): result.errores.append(f"Tipo de evento sin etapa asociada: {event_type}.")
        if policy.get_tipos_evaluacion() and not policy.get_tipos_evento(): result.errores.append("Existen evaluaciones sin eventos compatibles.")
        if policy.get_etapas_finales() and not policy.get_cierre_policy() and not policy.usa_conclusion_academica_propia(): result.errores.append("Política de cierre no disponible.")
        return result

    @classmethod
    def validate_all(cls):
        results = [cls.validate_modalidad(m) for m in Modalidad.all_objects.all()]
        existing = set(Modalidad.all_objects.values_list("codigo", flat=True))
        for code in ModalidadPolicyRegistry.list_supported():
            if code not in existing: results.append(ConfigurationResult(code, errores=["Policy registrada para código inexistente."]))
        return results

    @classmethod
    def raise_if_invalid(cls, modalidad):
        result = cls.validate_modalidad(modalidad)
        if result.errores:
            from django.core.exceptions import ValidationError
            raise ValidationError(result.errores)
        return result

