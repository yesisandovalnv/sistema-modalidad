from dataclasses import asdict, dataclass, replace
from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from apps.modalidades.examen_grado_service import ExamenGradoService
from apps.modalidades.models import ExcelenciaExpediente
from apps.modalidades.policies import ModalidadPolicyRegistry
from apps.postulantes.models import Postulacion


class EstadoDisponibilidad(StrEnum):
    DEFINITIVO = "DEFINITIVO"
    INCOMPLETO = "INCOMPLETO"
    SIN_RESULTADO = "SIN_RESULTADO"
    SIN_NOTA_NUMERICA = "SIN_NOTA_NUMERICA"
    HISTORICO_SIN_EVIDENCIA = "HISTORICO_SIN_EVIDENCIA"
    NO_SOPORTADO = "NO_SOPORTADO"


class SemanticaValorNumerico(StrEnum):
    CALIFICACION_FINAL = "CALIFICACION_FINAL"
    PROMEDIO_ACADEMICO = "PROMEDIO_ACADEMICO"


@dataclass(frozen=True, slots=True)
class ResultadoAcademicoDTO:
    estado_disponibilidad: EstadoDisponibilidad
    disponible: bool
    definitivo: bool
    nota_final: Decimal | None = None
    escala: str | None = None
    resultado: str | None = None
    clasificacion: str | None = None
    reconocimiento: str | None = None
    fecha_conclusion: datetime | None = None
    limitacion: str | None = None
    semantica_valor_numerico: SemanticaValorNumerico | None = None
    promedio_academico: Decimal | None = None
    criterio: str | None = None
    proceso_concluido: bool | None = None

    def as_dict(self):
        return asdict(self)


_NO_PRECARGADO = object()


def _normalizar_resultado_numerico(
    data, *, escala=None, limitacion_adicional=None,
):
    data = data or {}
    nota = data.get("nota_final")
    clasificacion = data.get("clasificacion")
    resultado = data.get("resultado")
    limitaciones = [item for item in (data.get("limitacion_normativa"), limitacion_adicional) if item]
    completo = data.get("completo")
    nota_final = nota if completo is not False else None

    has_partial_data = any(
        value is not None
        for key, value in data.items()
        if key not in {"limitacion_normativa", "completo", "areas"}
    ) or any(value is not None for value in (data.get("areas") or {}).values())

    if nota_final is not None:
        estado = EstadoDisponibilidad.DEFINITIVO
        disponible = definitivo = True
    elif has_partial_data:
        estado = EstadoDisponibilidad.INCOMPLETO
        disponible, definitivo = True, False
    else:
        estado = EstadoDisponibilidad.SIN_RESULTADO
        disponible = definitivo = False

    return ResultadoAcademicoDTO(
        estado_disponibilidad=estado,
        disponible=disponible,
        definitivo=definitivo,
        nota_final=nota_final,
        escala=escala,
        resultado=resultado,
        clasificacion=clasificacion,
        reconocimiento=None,
        fecha_conclusion=None,
        limitacion=" ".join(limitaciones) or None,
        semantica_valor_numerico=(
            SemanticaValorNumerico.CALIFICACION_FINAL
            if nota_final is not None else None
        ),
    )


class ResultadoAcademicoReportService:
    """Adapta resultados canónicos; no decide alcance ni reglas académicas."""

    MODALIDADES_POLICY = {
        "PROYECTO_GRADO",
        "TESIS_GRADO",
        "TRABAJO_DIRIGIDO",
        "GRADUACION_VIA_DIPLOMADO",
    }

    @classmethod
    def resolver(cls, postulacion):
        return cls._resolver(postulacion)

    @classmethod
    def resolver_lote(cls, postulaciones):
        """Interfaz batch estable para evitar acoplar la futura tabla al lector individual.

        Excelencia se precarga en una consulta. Los demás lectores conservan por ahora
        la llamada canónica por postulación; cada grupo puede optimizarse posteriormente
        sin cambiar el contrato ni duplicar sus fórmulas.
        """
        items = list(postulaciones)
        excellence_ids = [p.pk for p in items if p.modalidad.codigo == "EXCELENCIA_ACADEMICA"]
        excellence = (
            {
                item.postulacion_id: item
                for item in ExcelenciaExpediente.objects.filter(postulacion_id__in=excellence_ids)
            }
            if excellence_ids else {}
        )
        return {
            postulacion.pk: cls._resolver(postulacion, excelencia=excellence.get(postulacion.pk))
            for postulacion in items
        }

    @classmethod
    def _resolver(cls, postulacion, *, excelencia=_NO_PRECARGADO):
        codigo = postulacion.modalidad.codigo
        if codigo in cls.MODALIDADES_POLICY:
            data = ModalidadPolicyRegistry.get(postulacion).evaluacion_policy.calcular_resultado_final(postulacion)
            extra = None
            if codigo == "TRABAJO_DIRIGIDO" and data.get("clasificacion"):
                extra = "La clasificación proviene de la policy vigente de Trabajo Dirigido; Reportes no la interpreta como reconocimiento institucional."
            escala = "1-100" if codigo == "GRADUACION_VIA_DIPLOMADO" else "0-100"
            dto = _normalizar_resultado_numerico(
                data, escala=escala, limitacion_adicional=extra,
            )
        elif codigo == "EXAMEN_GRADO":
            dto = _normalizar_resultado_numerico(
                ExamenGradoService.calcular_resultado_final(postulacion),
                escala="0-100",
            )
        elif codigo == "EXCELENCIA_ACADEMICA":
            dto = cls._resolver_excelencia(
                ExcelenciaExpediente.objects.filter(postulacion=postulacion).first()
                if excelencia is _NO_PRECARGADO else excelencia
            )
        else:
            dto = ResultadoAcademicoDTO(
                estado_disponibilidad=EstadoDisponibilidad.NO_SOPORTADO,
                disponible=False,
                definitivo=False,
                limitacion="La modalidad todavía no tiene adaptador de resultado académico en Reportes.",
            )

        if (
            postulacion.tipo_registro == Postulacion.TipoRegistroChoices.HISTORICO
            and dto.estado_disponibilidad == EstadoDisponibilidad.SIN_RESULTADO
        ):
            dto = ResultadoAcademicoDTO(
                estado_disponibilidad=EstadoDisponibilidad.HISTORICO_SIN_EVIDENCIA,
                disponible=False,
                definitivo=False,
                limitacion="El expediente histórico no contiene evidencia suficiente para reconstruir un resultado académico.",
            )
        estado = getattr(postulacion, "estado_actual", None)
        proceso_concluido = (
            None if estado is None else estado.codigo == "CONCLUIDA"
        )
        return replace(dto, proceso_concluido=proceso_concluido)

    @staticmethod
    def _resolver_excelencia(expediente):
        if expediente is None:
            return ResultadoAcademicoDTO(
                estado_disponibilidad=EstadoDisponibilidad.SIN_RESULTADO,
                disponible=False,
                definitivo=False,
                limitacion="Excelencia Académica todavía no tiene un resultado registrado.",
            )
        if expediente.resultado == ExcelenciaExpediente.Resultado.PENDIENTE:
            return ResultadoAcademicoDTO(
                estado_disponibilidad=EstadoDisponibilidad.SIN_RESULTADO,
                disponible=False,
                definitivo=False,
                criterio=expediente.criterio,
                limitacion="Excelencia Académica todavía no tiene un resultado registrado.",
            )

        promedio = expediente.promedio_general
        estado = EstadoDisponibilidad.DEFINITIVO if promedio is not None else EstadoDisponibilidad.SIN_NOTA_NUMERICA
        return ResultadoAcademicoDTO(
            estado_disponibilidad=estado,
            disponible=True,
            definitivo=True,
            escala="0-100" if promedio is not None else None,
            resultado=expediente.resultado,
            clasificacion=None,
            reconocimiento=None,
            fecha_conclusion=None,
            semantica_valor_numerico=(
                SemanticaValorNumerico.PROMEDIO_ACADEMICO
                if promedio is not None else None
            ),
            promedio_academico=promedio,
            criterio=expediente.criterio,
            limitacion=(
                "El criterio de Excelencia Académica no registra una nota numérica."
                if promedio is None else None
            ),
        )
