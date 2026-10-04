"""Políticas académicas configurables por modalidad.

Este módulo no persiste clases ni aplica una política por defecto: una modalidad
sin registro es, deliberadamente, una modalidad académicamente no soportada.
"""
from __future__ import annotations

from abc import ABC
from dataclasses import asdict, dataclass, field
from typing import Any

from django.core.exceptions import ValidationError


class ModalidadNoSoportadaError(ValidationError):
    def __init__(self, codigo: str):
        self.codigo_modalidad = codigo
        super().__init__(f"La modalidad '{codigo}' no tiene normativa específica configurada.", code="modalidad_no_soportada")


class ActorCargaDocumento:
    """Actores que el motor documental reconoce como responsables de una carga."""

    ESTUDIANTE = "ESTUDIANTE"
    ADMINISTRACION = "ADMINISTRACION"
    TODOS = frozenset((ESTUDIANTE, ADMINISTRACION))


@dataclass(frozen=True)
class EtapaDefinition:
    codigo: str
    nombre: str
    orden: int
    obligatoria: bool = True
    inicial: bool = False
    final: bool = False
    permite_reapertura: bool = False
    siguientes_permitidas: tuple[str, ...] = ()
    capacidades_requeridas: tuple[str, ...] = ()


@dataclass(frozen=True)
class DecisionAcademicaDefinition:
    codigo: str
    resultados: tuple[str, ...]
    nombre: str | None = None
    roles_participantes: tuple[str, ...] = ()
    participantes_minimos: int = 0
    participantes_maximos: int | None = None
    ordenes_requeridos: tuple[int, ...] = ()
    regimen_workflow_requerido: str | None = None
    validar_composicion_asignaciones: bool = False


@dataclass
class ModalidadCapabilities:
    codigo: str
    nombre: str
    soportada: bool
    workflow_configurado: bool = False
    eventos_soportados: bool = False
    evaluaciones_soportadas: bool = False
    asignaciones_soportadas: bool = False
    condiciones_soportadas: bool = False
    entregas_soportadas: bool = False
    cierre_soportado: bool = False
    tipos_evento: list[str] = field(default_factory=list)
    tipos_evaluacion: list[str] = field(default_factory=list)
    etapas: list[dict[str, Any]] = field(default_factory=list)
    advertencias: list[str] = field(default_factory=list)
    configuracion_valida: bool = False

    def to_dict(self):
        return asdict(self)


class BaseEventoPolicy(ABC):
    def get_tipos_evento(self): return ()
    def get_precondiciones_programacion(self, codigo_etapa): return None
    def evaluar_requisitos_programacion(self, *, tipo_evento, seguimiento, asignaciones):
        requisitos = self.get_precondiciones_programacion(seguimiento.etapa.codigo) or {}
        resultado = {}
        for rol, minimo in requisitos.get("asignaciones_minimas", {}).items():
            actual = asignaciones.filter(tipo_participacion=rol).values("usuario_id").distinct().count()
            resultado[rol] = {"actual": actual, "minimo": minimo, "cumplido": actual >= minimo, "conflicto_identidad": False}
        return {"cumple": all(item["cumplido"] for item in resultado.values()), "requisitos": resultado, "conflictos": []}
    def validar_programacion(self, **kwargs): raise ModalidadNoSoportadaError(kwargs.get("codigo", ""))
    def validar_participante(self, **kwargs): return None
    def validar_quorum(self, evento): raise ModalidadNoSoportadaError(evento.postulacion.modalidad.codigo)
    def validar_inicio(self, evento): return None
    def validar_finalizacion(self, evento): return None
    def get_reglas_reprogramacion(self, evento): return {}
    def get_etapa_asociada(self, tipo_evento): return None
    def validar_correspondencia_evento_etapa(self, evento): return None
    def validar_reprogramacion(self, evento, nueva_fecha): return None
    def requiere_vinculo_evento_documento(self, tipo_documento): return False
    def validar_vinculo_documento(self, *, postulacion, tipo_documento, evento_defensa):
        if evento_defensa is not None:
            raise ValidationError("Este tipo documental no admite vincularse a un evento.")


class BaseEvaluacionPolicy(ABC):
    def get_tipos_evaluacion(self): return ()
    def validar_evaluacion(self, **kwargs): return None
    def consolidar(self, **kwargs): raise NotImplementedError
    def calcular_resultado(self, **kwargs): raise NotImplementedError
    def afecta_workflow(self, **kwargs): return False
    def get_etapa_aprobada(self, **kwargs): return None
    def validar_registro(self, evaluacion): return None
    def validar_solicitud_registro(self, **kwargs): return None
    def construir_consolidado(self, evaluacion, usuario): raise NotImplementedError
    def calcular_resultado_final(self, postulacion): raise NotImplementedError
    def get_modalidad_registro_por_defecto(self, *, evento, tipo):
        raise ModalidadNoSoportadaError(evento.postulacion.modalidad.codigo)
    def get_valores_registro(self, *, evento, tipo, nota):
        return {"ponderacion": None, "aporte_ponderado": nota}
    def get_semantica_nota(self, *, evento, tipo):
        from apps.postulantes.models import EvaluacionDefensa
        return EvaluacionDefensa.SemanticaNota.MODALIDAD_ESPECIFICA
    def obtener_evaluacion_para_consolidar(self, *, evento, evaluaciones): raise NotImplementedError
    def obtener_aprobacion_por_consolidacion(self, *, evento, evaluacion, resultado_final): return None
    def obtener_rechazo_por_consolidacion(self, *, evento, evaluacion, resultado_final): return None


class BaseRevisionTribunalPreviaPolicy(ABC):
    def validar_seguimiento(self, seguimiento): raise NotImplementedError
    def validar_tribunales(self, seguimiento): raise NotImplementedError
    def get_documento_final_codigo(self): raise NotImplementedError
    def get_tipo_evidencia_codigo(self): raise NotImplementedError


class BaseRequisitosPolicy(ABC):
    def get_condiciones_requeridas(self, fase=None): return ()
    def get_entregas_requeridas(self, fase=None): return ()
    def get_documentos_requeridos(self, fase=None): return ()
    def get_actores_carga_permitidos(self, fase, codigo_documento):
        """Retorna actores explícitos o ``None`` para configuraciones aún no clasificadas."""
        return None
    def validar_condicion(self, codigo, **kwargs): return codigo in self.get_condiciones_requeridas(kwargs.get("fase"))
    def validar_entrega(self, codigo, **kwargs): return codigo in self.get_entregas_requeridas(kwargs.get("fase"))
    def validar_documento(self, codigo, **kwargs): return codigo in self.get_documentos_requeridos(kwargs.get("fase"))


class BaseCierrePolicy(ABC):
    def evaluar_revision_final(self, postulacion): raise NotImplementedError
    def evaluar_cierre_documental(self, postulacion): raise NotImplementedError
    def puede_concluir(self, postulacion): raise NotImplementedError
    def obtener_faltantes(self, postulacion): return self.evaluar_cierre_documental(postulacion)["faltantes"]
    def obtener_advertencias(self, postulacion): return self.evaluar_cierre_documental(postulacion)["advertencias"]


class BaseModalidadPolicy(ABC):
    codigo = ""
    etapas: tuple[EtapaDefinition, ...] = ()
    evento_policy: BaseEventoPolicy | None = None
    evaluacion_policy: BaseEvaluacionPolicy | None = None
    requisitos_policy: BaseRequisitosPolicy | None = None

    def get_codigo_modalidad(self): return self.codigo
    def get_etapas_configuradas(self): return self.etapas
    def get_etapa_inicial(self): return next((x for x in self.etapas if x.inicial), None)
    def get_etapas_obligatorias(self): return tuple(x for x in self.etapas if x.obligatoria)
    def get_etapas_finales(self): return tuple(x for x in self.etapas if x.final)
    def get_transiciones_permitidas(self): return {x.codigo: x.siguientes_permitidas for x in self.etapas}
    def permite_eventos(self): return bool(self.evento_policy and self.evento_policy.get_tipos_evento())
    def get_tipos_evento(self): return tuple(self.evento_policy.get_tipos_evento()) if self.evento_policy else ()
    def permite_evaluaciones(self): return bool(self.evaluacion_policy and self.evaluacion_policy.get_tipos_evaluacion())
    def get_tipos_evaluacion(self): return tuple(self.evaluacion_policy.get_tipos_evaluacion()) if self.evaluacion_policy else ()
    def get_reglas_asignacion(self): return {}
    def get_decisiones_academicas_permitidas(self, codigo_etapa: str) -> tuple[DecisionAcademicaDefinition, ...]:
        """Declara las decisiones académicas habilitadas para una etapa; cerrado por defecto."""
        return ()
    def get_condiciones_requeridas(self, fase=None): return tuple(self.requisitos_policy.get_condiciones_requeridas(fase)) if self.requisitos_policy else ()
    def get_entregas_requeridas(self, fase=None): return tuple(self.requisitos_policy.get_entregas_requeridas(fase)) if self.requisitos_policy else ()
    def get_documentos_requeridos(self, fase=None): return tuple(self.requisitos_policy.get_documentos_requeridos(fase)) if self.requisitos_policy else ()
    def get_documentos_aplicables_en_etapa(self, codigo_etapa: str) -> tuple:
        """Retorna los códigos de tipos documentales que pueden cargarse en una etapa específica.
        
        Reutiliza requisitos_policy.get_documentos_requeridos(codigo_etapa) como fuente de verdad.
        Si el policy no diferencia por etapa, devuelve vacío para ser explícito.
        """
        if self.requisitos_policy:
            return tuple(self.requisitos_policy.get_documentos_requeridos(codigo_etapa))
        return ()
    def get_actores_carga_documento(self, codigo_etapa: str, codigo_documento: str):
        """Delega la responsabilidad de carga a la configuración documental de la modalidad."""
        if self.requisitos_policy:
            return self.requisitos_policy.get_actores_carga_permitidos(
                codigo_etapa,
                codigo_documento,
            )
        return None
    def resolver_contexto_documental(self, postulacion):
        """Resuelve la etapa operativa que gobierna la carga documental actual."""
        return (
            postulacion.seguimientos_etapa
            .filter(activo=True, estado__in=("PENDIENTE", "EN_PROCESO", "OBSERVADA"))
            .values_list("etapa__codigo", flat=True)
            .first()
        )
    def get_configuracion_actores(self, postulacion=None, seguimiento=None):
        """Contrato canónico para la composición formal de actores por modalidad.

        La implementación por defecto es explícitamente vacía para mantener compatibilidad
        con modalidades que aún no implementan este contrato. Las políticas concretas pueden
        devolver grupos de posiciones con metadatos formales y precondiciones académicas.
        """
        return {}
    def get_orientacion_etapa_actual(self, *, postulacion, seguimiento): return None
    def get_cierre_policy(self): return None
    def get_revision_tribunal_previa_policy(self): return None
    def validar_dictamen_revision(self, **kwargs):
        raise ModalidadNoSoportadaError(self.codigo)
    def validar_asignacion(self, **kwargs): return None
    def validar_nuevo_intento(self, *, postulacion, etapa, ultimo_seguimiento): return None
    def validar_inicio_etapa(self, seguimiento): return None
    def validar_aprobacion_etapa(self, seguimiento): return None
    def validar_confirmacion_correccion(self, **kwargs):
        raise ModalidadNoSoportadaError(self.codigo)
    def validar_conclusion_academica(self, postulacion):
        raise ModalidadNoSoportadaError(self.codigo)
    def usa_conclusion_academica_propia(self): return False
    def permite_observacion_post_aprobacion(self, documento):
        """Capacidad documental excepcional, cerrada por defecto."""
        return False

    def validate_configuration(self):
        errors = []
        codes = [x.codigo for x in self.etapas]
        orders = [x.orden for x in self.etapas]
        if self.etapas and len([x for x in self.etapas if x.inicial]) != 1: errors.append("Debe existir exactamente una etapa inicial.")
        if len(codes) != len(set(codes)): errors.append("Existen códigos de etapa duplicados.")
        if len(orders) != len(set(orders)): errors.append("Existen órdenes de etapa duplicados.")
        known = set(codes)
        for stage in self.etapas:
            if not set(stage.siguientes_permitidas).issubset(known): errors.append(f"La etapa {stage.codigo} referencia una transición inexistente.")
        return errors

    def get_capabilities(self, modalidad=None):
        name = getattr(modalidad, "nombre", self.codigo)
        errors = self.validate_configuration()
        return ModalidadCapabilities(
            codigo=self.codigo, nombre=name, soportada=True,
            workflow_configurado=bool(self.etapas), eventos_soportados=self.permite_eventos(),
            evaluaciones_soportadas=self.permite_evaluaciones(), asignaciones_soportadas=bool(self.get_reglas_asignacion()),
            condiciones_soportadas=bool(self.get_condiciones_requeridas()), entregas_soportadas=bool(self.get_entregas_requeridas()),
            cierre_soportado=self.get_cierre_policy() is not None, tipos_evento=list(self.get_tipos_evento()),
            tipos_evaluacion=list(self.get_tipos_evaluacion()), etapas=[asdict(x) for x in self.etapas],
            advertencias=list(errors), configuracion_valida=not errors,
        )


class ModalidadPolicyRegistry:
    _policies: dict[str, BaseModalidadPolicy] = {}

    @classmethod
    def register(cls, codigo_modalidad, policy):
        codigo = str(codigo_modalidad).strip().upper()
        instance = policy() if isinstance(policy, type) else policy
        current = cls._policies.get(codigo)
        if current is not None and current.__class__ is not instance.__class__:
            raise ValueError(f"Ya existe una política incompatible para {codigo}.")
        if instance.get_codigo_modalidad() != codigo:
            raise ValueError("El código de registro no coincide con el de la política.")
        cls._policies[codigo] = instance
        return instance

    @classmethod
    def _codigo(cls, value):
        if isinstance(value, str): return value.strip().upper()
        modalidad = getattr(value, "modalidad", value)
        codigo = getattr(modalidad, "codigo", None)
        if not codigo: raise ValueError("Se esperaba un código, Modalidad o Postulacion.")
        return codigo.strip().upper()

    @classmethod
    def get(cls, value):
        codigo = cls._codigo(value)
        if codigo not in cls._policies: raise ModalidadNoSoportadaError(codigo)
        return cls._policies[codigo]

    @classmethod
    def has_policy(cls, value):
        return cls._codigo(value) in cls._policies

    @classmethod
    def list_supported(cls): return tuple(sorted(cls._policies))


def unsupported_capabilities(modalidad):
    return ModalidadCapabilities(codigo=modalidad.codigo, nombre=modalidad.nombre, soportada=False,
        advertencias=["Normativa específica no configurada"], configuracion_valida=False)
