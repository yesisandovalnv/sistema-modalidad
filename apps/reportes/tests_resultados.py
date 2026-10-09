from decimal import Decimal
from unittest.mock import Mock, patch

from django.test import TestCase

from apps.academico.models import Modalidad, Periodo
from apps.modalidades.models import ExcelenciaExpediente
from apps.postulantes.models import EstadoPostulacion, Postulacion
from apps.reportes.resultados import EstadoDisponibilidad, ResultadoAcademicoReportService
from apps.reportes.serializers import ResultadoAcademicoReportSerializer
from apps.usuarios.models import CustomUser, Role


class ResultadoAcademicoReportServiceTests(TestCase):
    def setUp(self):
        role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante resultados")
        self.student = CustomUser.objects.create_user(username="resultado-est", role=role)
        self.period = Periodo.objects.create(
            nombre="2026-I-resultados", gestion=2026, semestre="I",
            fecha_inicio="2026-01-01", fecha_fin="2026-06-30",
        )
        self.state = EstadoPostulacion.objects.create(codigo="REG_RESULT", nombre="Registrada")
        self.counter = 0

    def postulacion(self, codigo_modalidad, *, historico=False):
        self.counter += 1
        student = CustomUser.objects.create_user(
            username=f"resultado-est-{self.counter}", role=self.student.role,
        )
        modalidad, _ = Modalidad.objects.get_or_create(
            codigo=codigo_modalidad, defaults={"nombre": codigo_modalidad.replace("_", " ").title()},
        )
        return Postulacion.objects.create(
            codigo=f"RESULT-{self.counter}", estudiante=student, modalidad=modalidad,
            periodo=self.period, estado_actual=self.state,
            vigencia=(Postulacion.VigenciaChoices.CERRADA if historico else Postulacion.VigenciaChoices.VIGENTE),
            tipo_registro=(Postulacion.TipoRegistroChoices.HISTORICO if historico else Postulacion.TipoRegistroChoices.SEGUIMIENTO),
        )

    @staticmethod
    def policy_result(data):
        policy = Mock()
        policy.evaluacion_policy.calcular_resultado_final.return_value = data
        return policy

    def resolve_policy(self, codigo, data, *, historico=False):
        post = self.postulacion(codigo, historico=historico)
        policy = self.policy_result(data)
        with patch("apps.reportes.resultados.ModalidadPolicyRegistry.get", return_value=policy):
            result = ResultadoAcademicoReportService.resolver(post)
        policy.evaluacion_policy.calcular_resultado_final.assert_called_once_with(post)
        return result

    def test_proyecto_definitivo_delega_y_no_recalcula(self):
        result = self.resolve_policy("PROYECTO_GRADO", {
            "nota_final": Decimal("72.35"), "resultado": "APROBADO", "clasificacion": "APROBADO",
        })
        self.assertEqual(result.estado_disponibilidad, EstadoDisponibilidad.DEFINITIVO)
        self.assertEqual(result.nota_final, Decimal("72.35"))
        self.assertEqual(result.escala, "0-100")
        self.assertEqual(result.semantica_valor_numerico, "CALIFICACION_FINAL")
        self.assertTrue(result.definitivo)
        self.assertFalse(result.proceso_concluido)
        self.assertIsNone(result.reconocimiento)

    def test_proyecto_felicitacion_no_se_convierte_en_reconocimiento(self):
        result = self.resolve_policy("PROYECTO_GRADO", {
            "nota_final": Decimal("92.00"), "resultado": "APROBACION_PLENA_CON_FELICITACION",
            "clasificacion": "APROBACION_PLENA_CON_FELICITACION",
        })
        self.assertEqual(result.clasificacion, "APROBACION_PLENA_CON_FELICITACION")
        self.assertIsNone(result.reconocimiento)

    def test_proyecto_incompleto_no_inventa_cero_ni_reprobacion(self):
        result = self.resolve_policy("PROYECTO_GRADO", {
            "nota_privada": Decimal("24.00"), "nota_publica": None, "nota_final": None,
            "resultado": None, "clasificacion": None,
        })
        self.assertEqual(result.estado_disponibilidad, EstadoDisponibilidad.INCOMPLETO)
        self.assertIsNone(result.nota_final)
        self.assertIsNone(result.resultado)

    def test_tesis_preserva_limitacion_normativa(self):
        result = self.resolve_policy("TESIS_GRADO", {
            "nota_final": Decimal("80.00"), "resultado": "APROBACION_PLENA",
            "clasificacion": "APROBACION_PLENA", "limitacion_normativa": "Ambigüedad normativa vigente.",
        })
        self.assertEqual(result.limitacion, "Ambigüedad normativa vigente.")
        self.assertEqual(result.escala, "0-100")
        self.assertEqual(result.semantica_valor_numerico, "CALIFICACION_FINAL")
        self.assertTrue(result.definitivo)
        self.assertFalse(result.proceso_concluido)
        self.assertIsNone(result.reconocimiento)

    def test_trabajo_dirigido_es_modalidad_explicita_y_no_inventa_reconocimiento(self):
        result = self.resolve_policy("TRABAJO_DIRIGIDO", {
            "nota_final": Decimal("91.00"), "resultado": "APROBACION_PLENA",
            "clasificacion": "APROBACION_PLENA",
        })
        self.assertIsNone(result.reconocimiento)
        self.assertIn("Trabajo Dirigido", result.limitacion)
        self.assertEqual(result.escala, "0-100")
        self.assertEqual(result.semantica_valor_numerico, "CALIFICACION_FINAL")
        self.assertTrue(result.definitivo)
        self.assertFalse(result.proceso_concluido)

    @patch("apps.reportes.resultados.ExamenGradoService.calcular_resultado_final")
    def test_examen_definitivo_y_felicitacion_delegan_en_service(self, calculate):
        post = self.postulacion("EXAMEN_GRADO")
        calculate.return_value = {"completo": True, "nota_final": Decimal("94.00"), "clasificacion": "APROBACION_PLENA_CON_FELICITACION"}
        result = ResultadoAcademicoReportService.resolver(post)
        calculate.assert_called_once_with(post)
        self.assertTrue(result.definitivo)
        self.assertFalse(result.proceso_concluido)
        self.assertEqual(result.escala, "0-100")
        self.assertEqual(result.clasificacion, "APROBACION_PLENA_CON_FELICITACION")
        self.assertIsNone(result.resultado)
        self.assertIsNone(result.reconocimiento)

    @patch("apps.reportes.resultados.ExamenGradoService.calcular_resultado_final")
    def test_examen_incompleto(self, calculate):
        calculate.return_value = {"completo": False, "nota_final": None, "clasificacion": None, "areas": {"AREA_1": "70.00"}}
        result = ResultadoAcademicoReportService.resolver(self.postulacion("EXAMEN_GRADO"))
        self.assertEqual(result.estado_disponibilidad, EstadoDisponibilidad.INCOMPLETO)
        self.assertFalse(result.definitivo)
        self.assertIsNone(result.nota_final)
        self.assertIsNone(result.semantica_valor_numerico)
        self.assertIsNone(result.reconocimiento)

    @patch("apps.reportes.resultados.ExamenGradoService.calcular_resultado_final")
    def test_examen_incompleto_no_expone_como_final_una_nota_contradictoria(self, calculate):
        calculate.return_value = {
            "completo": False,
            "nota_final": Decimal("70.00"),
            "clasificacion": None,
            "areas": {"AREA_1": "70.00"},
        }

        result = ResultadoAcademicoReportService.resolver(
            self.postulacion("EXAMEN_GRADO"),
        )

        self.assertEqual(result.estado_disponibilidad, EstadoDisponibilidad.INCOMPLETO)
        self.assertFalse(result.definitivo)
        self.assertIsNone(result.nota_final)
        self.assertIsNone(result.semantica_valor_numerico)

    def test_diplomado_preserva_clasificacion_y_escala_propia(self):
        result = self.resolve_policy("GRADUACION_VIA_DIPLOMADO", {
            "nota_final": Decimal("95.00"), "clasificacion": "EXCELENTE",
        })
        self.assertEqual(result.clasificacion, "EXCELENTE")
        self.assertIsNone(result.resultado)
        self.assertEqual(result.escala, "1-100")
        self.assertEqual(result.semantica_valor_numerico, "CALIFICACION_FINAL")
        self.assertTrue(result.definitivo)
        self.assertFalse(result.proceso_concluido)
        self.assertIsNone(result.reconocimiento)

    def test_excelencia_favorable_con_promedio(self):
        post = self.postulacion("EXCELENCIA_ACADEMICA")
        ExcelenciaExpediente.objects.create(
            postulacion=post, criterio=ExcelenciaExpediente.Criterio.RENDIMIENTO_ACADEMICO,
            resultado=ExcelenciaExpediente.Resultado.FAVORABLE, promedio_general=Decimal("88.50"),
        )
        result = ResultadoAcademicoReportService.resolver(post)
        self.assertEqual(result.resultado, "FAVORABLE")
        self.assertIsNone(result.nota_final)
        self.assertEqual(result.promedio_academico, Decimal("88.50"))
        self.assertEqual(result.escala, "0-100")
        self.assertEqual(result.semantica_valor_numerico, "PROMEDIO_ACADEMICO")
        self.assertEqual(result.criterio, ExcelenciaExpediente.Criterio.RENDIMIENTO_ACADEMICO)
        self.assertTrue(result.definitivo)
        self.assertFalse(result.proceso_concluido)
        self.assertIsNone(result.reconocimiento)

    def test_excelencia_desfavorable_sin_nota_es_semantica_no_numerica(self):
        post = self.postulacion("EXCELENCIA_ACADEMICA")
        ExcelenciaExpediente.objects.create(
            postulacion=post, criterio=ExcelenciaExpediente.Criterio.RECONOCIMIENTO_CALIDAD,
            resultado=ExcelenciaExpediente.Resultado.DESFAVORABLE,
        )
        result = ResultadoAcademicoReportService.resolver(post)
        self.assertEqual(result.estado_disponibilidad, EstadoDisponibilidad.SIN_NOTA_NUMERICA)
        self.assertTrue(result.definitivo)
        self.assertEqual(result.criterio, ExcelenciaExpediente.Criterio.RECONOCIMIENTO_CALIDAD)
        self.assertIsNone(result.escala)
        self.assertIsNone(result.semantica_valor_numerico)
        self.assertIsNone(result.nota_final)
        self.assertIsNone(result.promedio_academico)
        self.assertEqual(result.resultado, ExcelenciaExpediente.Resultado.DESFAVORABLE)

    def test_excelencia_pendiente_preserva_criterio_sin_inventar_resultado(self):
        post = self.postulacion("EXCELENCIA_ACADEMICA")
        ExcelenciaExpediente.objects.create(
            postulacion=post,
            criterio=ExcelenciaExpediente.Criterio.RENDIMIENTO_ACADEMICO,
            resultado=ExcelenciaExpediente.Resultado.PENDIENTE,
        )

        result = ResultadoAcademicoReportService.resolver(post)

        self.assertEqual(result.estado_disponibilidad, EstadoDisponibilidad.SIN_RESULTADO)
        self.assertEqual(result.criterio, ExcelenciaExpediente.Criterio.RENDIMIENTO_ACADEMICO)
        self.assertIsNone(result.promedio_academico)
        self.assertIsNone(result.nota_final)
        self.assertFalse(result.definitivo)

    def test_sin_resultado_y_historico_sin_evidencia(self):
        empty = {"nota_final": None, "resultado": None, "clasificacion": None}
        current = self.resolve_policy("PROYECTO_GRADO", empty)
        historic = self.resolve_policy("TESIS_GRADO", empty, historico=True)
        self.assertEqual(current.estado_disponibilidad, EstadoDisponibilidad.SIN_RESULTADO)
        self.assertEqual(historic.estado_disponibilidad, EstadoDisponibilidad.HISTORICO_SIN_EVIDENCIA)

    def test_fecha_conclusion_permanece_null_y_serializer_estabiliza_contrato(self):
        result = self.resolve_policy("PROYECTO_GRADO", {"nota_final": Decimal("72"), "resultado": "APROBADO", "clasificacion": "APROBADO"})
        serializer = ResultadoAcademicoReportSerializer(data=result.as_dict())
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertIsNone(serializer.validated_data["fecha_conclusion"])
        self.assertIsNone(serializer.validated_data["reconocimiento"])

    def test_proceso_concluido_se_informa_separado_de_resultado_definitivo(self):
        post = self.postulacion("PROYECTO_GRADO")
        post.estado_actual.codigo = "CONCLUIDA"
        policy = self.policy_result({
            "nota_final": Decimal("72"), "resultado": "APROBADO", "clasificacion": "APROBADO",
        })
        with patch("apps.reportes.resultados.ModalidadPolicyRegistry.get", return_value=policy):
            result = ResultadoAcademicoReportService.resolver(post)
        self.assertTrue(result.definitivo)
        self.assertTrue(result.proceso_concluido)

    def test_modalidad_no_soportada(self):
        result = ResultadoAcademicoReportService.resolver(self.postulacion("MODALIDAD_FUTURA"))
        self.assertEqual(result.estado_disponibilidad, EstadoDisponibilidad.NO_SOPORTADO)

    def test_resolver_lote_precarga_excelencia_en_una_consulta(self):
        first = self.postulacion("EXCELENCIA_ACADEMICA")
        second = self.postulacion("EXCELENCIA_ACADEMICA")
        ExcelenciaExpediente.objects.create(
            postulacion=first, criterio=ExcelenciaExpediente.Criterio.RENDIMIENTO_ACADEMICO,
            resultado=ExcelenciaExpediente.Resultado.FAVORABLE, promedio_general=Decimal("85"),
        )
        with self.assertNumQueries(1):
            results = ResultadoAcademicoReportService.resolver_lote([first, second])
        self.assertEqual(results[first.pk].estado_disponibilidad, EstadoDisponibilidad.DEFINITIVO)
        self.assertEqual(results[second.pk].estado_disponibilidad, EstadoDisponibilidad.SIN_RESULTADO)
