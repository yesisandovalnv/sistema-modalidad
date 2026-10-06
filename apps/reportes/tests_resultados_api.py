from decimal import Decimal
from unittest.mock import patch

from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.academico.models import Modalidad, Periodo
from apps.modalidades.models import ExcelenciaExpediente
from apps.postulantes.models import AsignacionPostulacion, EstadoPostulacion, Postulacion
from apps.reportes.resultados import EstadoDisponibilidad, ResultadoAcademicoDTO
from apps.usuarios.models import CustomUser, Role


class ResultadosAcademicosApiTests(TestCase):
    endpoint = "/api/v1/reportes/resultados/"

    def setUp(self):
        self.admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administrador R2")
        self.teacher_role = Role.objects.create(codigo="DOCENTE", nombre="Docente R2")
        self.student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante R2")
        self.admin = CustomUser.objects.create_user(username="r2-admin", role=self.admin_role, is_staff=True)
        self.teacher = CustomUser.objects.create_user(username="r2-doc", role=self.teacher_role)
        self.student = CustomUser.objects.create_user(username="r2-student", role=self.student_role)
        self.period_i = Periodo.objects.create(nombre="2026-I-R2", gestion=2026, semestre="I", fecha_inicio="2026-01-01", fecha_fin="2026-06-30")
        self.period_ii = Periodo.objects.create(nombre="2025-II-R2", gestion=2025, semestre="II", fecha_inicio="2025-07-01", fecha_fin="2025-12-31")
        self.registered = EstadoPostulacion.objects.create(codigo="REG_R2", nombre="Registrada R2")
        self.concluded = EstadoPostulacion.objects.create(codigo="CONCLUIDA_R2", nombre="Concluida R2")
        self.project = Modalidad.objects.create(codigo="PROYECTO_GRADO", nombre="Proyecto de Grado R2")
        self.excellence = Modalidad.objects.create(codigo="EXCELENCIA_ACADEMICA", nombre="Excelencia R2")
        self.counter = 0
        self.p1 = self.create_post(self.project, self.period_i, self.registered, "Ana", "Pérez", "RU-100")
        self.p2 = self.create_post(self.excellence, self.period_ii, self.concluded, "Luis", "Rojas", "RU-200")
        AsignacionPostulacion.objects.create(postulacion=self.p1, usuario=self.teacher, tipo_participacion="TUTOR", designado_por=self.admin)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def create_post(self, modalidad, periodo, estado, nombres, apellido, ru, *, historico=False):
        self.counter += 1
        user = CustomUser.objects.create_user(
            username=f"r2-est-{self.counter}", nombres=nombres, apellido_paterno=apellido,
            ru=ru, role=self.student_role,
        )
        return Postulacion.objects.create(
            codigo=f"R2-{self.counter}", estudiante=user, modalidad=modalidad, periodo=periodo,
            estado_actual=estado,
            tipo_registro=(Postulacion.TipoRegistroChoices.HISTORICO if historico else Postulacion.TipoRegistroChoices.SEGUIMIENTO),
            vigencia=(Postulacion.VigenciaChoices.CERRADA if historico else Postulacion.VigenciaChoices.VIGENTE),
        )

    @staticmethod
    def dto(*, estado=EstadoDisponibilidad.SIN_RESULTADO, nota=None, clasificacion=None, reconocimiento=None, resultado=None):
        definitivo = estado in {EstadoDisponibilidad.DEFINITIVO, EstadoDisponibilidad.SIN_NOTA_NUMERICA}
        return ResultadoAcademicoDTO(
            estado_disponibilidad=estado, disponible=estado not in {EstadoDisponibilidad.SIN_RESULTADO, EstadoDisponibilidad.HISTORICO_SIN_EVIDENCIA},
            definitivo=definitivo, nota_final=nota, resultado=resultado,
            clasificacion=clasificacion, reconocimiento=reconocimiento,
        )

    def fake_batch(self, items):
        return {item.pk: self.dto() for item in items}

    @patch("apps.reportes.views.ResultadoAcademicoReportService.resolver_lote")
    def test_admin_obtiene_pagina_y_contrato_sin_datos_sensibles(self, resolver):
        resolver.side_effect = self.fake_batch
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        row = response.data["results"][0]
        self.assertEqual(set(row), {"postulacion_id", "postulacion_codigo", "estudiante", "modalidad", "gestion", "semestre", "estado_administrativo", "resultado_academico"})
        self.assertEqual(set(row["estudiante"]), {"id", "nombre", "ru"})
        for sensitive in ("ci", "correo", "telefono", "observaciones"):
            self.assertNotIn(sensitive, row["estudiante"])
        self.assertIsNone(row["resultado_academico"]["nota_final"])

    def test_estudiante_no_puede_acceder(self):
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.get(self.endpoint).status_code, 403)

    @patch("apps.reportes.views.ResultadoAcademicoReportService.resolver_lote")
    def test_docente_conserva_scope_de_asignaciones(self, resolver):
        resolver.side_effect = self.fake_batch
        self.client.force_authenticate(self.teacher)
        response = self.client.get(self.endpoint)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["postulacion_id"], self.p1.pk)

    @patch("apps.reportes.views.ResultadoAcademicoReportService.resolver_lote")
    def test_filtros_persistidos_y_busqueda_por_nombre_ru(self, resolver):
        resolver.side_effect = self.fake_batch
        cases = (
            ("buscar=Ana", self.p1.pk), ("buscar=RU-200", self.p2.pk),
            ("gestion=2026", self.p1.pk), ("semestre=II", self.p2.pk),
            (f"modalidad={self.project.pk}", self.p1.pk),
            (f"estado_administrativo={self.concluded.pk}", self.p2.pk),
        )
        for query, expected in cases:
            with self.subTest(query=query):
                response = self.client.get(f"{self.endpoint}?{query}")
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data["count"], 1)
                self.assertEqual(response.data["results"][0]["postulacion_id"], expected)

    def test_filtros_derivados_no_se_ignoran_silenciosamente(self):
        for query in ("definitivo=true", "estado_disponibilidad=DEFINITIVO", "clasificacion=APROBADO"):
            with self.subTest(query=query):
                self.assertEqual(self.client.get(f"{self.endpoint}?{query}").status_code, 400)

    @patch("apps.reportes.views.ResultadoAcademicoReportService.resolver_lote")
    def test_preserva_semantica_multimodalidad(self, resolver):
        exam = Modalidad.objects.create(codigo="EXAMEN_GRADO", nombre="Examen R2")
        diploma = Modalidad.objects.create(codigo="GRADUACION_VIA_DIPLOMADO", nombre="Diplomado R2")
        p3 = self.create_post(exam, self.period_i, self.concluded, "Eva", "López", "RU-300")
        p4 = self.create_post(diploma, self.period_i, self.concluded, "Mario", "Soliz", "RU-400")
        values = {
            self.p1.pk: self.dto(estado=EstadoDisponibilidad.DEFINITIVO, nota=Decimal("92"), resultado="APROBACION_PLENA_CON_FELICITACION", clasificacion="APROBACION_PLENA_CON_FELICITACION", reconocimiento="Aprobación plena con felicitación"),
            self.p2.pk: self.dto(estado=EstadoDisponibilidad.SIN_NOTA_NUMERICA, resultado="FAVORABLE"),
            p3.pk: self.dto(estado=EstadoDisponibilidad.INCOMPLETO),
            p4.pk: self.dto(estado=EstadoDisponibilidad.DEFINITIVO, nota=Decimal("95"), clasificacion="EXCELENTE"),
        }
        resolver.side_effect = lambda items: {item.pk: values[item.pk] for item in items}
        response = self.client.get(f"{self.endpoint}?page_size=10")
        rows = {row["postulacion_id"]: row["resultado_academico"] for row in response.data["results"]}
        self.assertEqual(rows[self.p1.pk]["reconocimiento"], "Aprobación plena con felicitación")
        self.assertEqual(rows[p4.pk]["clasificacion"], "EXCELENTE")
        self.assertIsNone(rows[p4.pk]["reconocimiento"])
        self.assertEqual(rows[self.p2.pk]["resultado"], "FAVORABLE")
        self.assertIsNone(rows[self.p2.pk]["nota_final"])
        self.assertEqual(rows[p3.pk]["estado_disponibilidad"], "INCOMPLETO")

    @patch("apps.reportes.views.ResultadoAcademicoReportService.resolver_lote")
    def test_historico_sin_evidencia_y_orden_estable(self, resolver):
        historic = self.create_post(self.project, self.period_i, self.concluded, "Hilda", "Vega", "RU-500", historico=True)
        resolver.side_effect = lambda items: {
            item.pk: self.dto(estado=EstadoDisponibilidad.HISTORICO_SIN_EVIDENCIA) if item.pk == historic.pk else self.dto()
            for item in items
        }
        first = self.client.get(f"{self.endpoint}?page_size=1&page=1")
        second = self.client.get(f"{self.endpoint}?page_size=1&page=2")
        self.assertNotEqual(first.data["results"][0]["postulacion_id"], second.data["results"][0]["postulacion_id"])
        all_rows = self.client.get(f"{self.endpoint}?page_size=10").data["results"]
        historic_row = next(row for row in all_rows if row["postulacion_id"] == historic.pk)
        self.assertEqual(historic_row["resultado_academico"]["estado_disponibilidad"], "HISTORICO_SIN_EVIDENCIA")

    def test_batch_excelencia_no_crece_linealmente(self):
        self.p1.delete()
        ExcelenciaExpediente.objects.create(
            postulacion=self.p2, criterio=ExcelenciaExpediente.Criterio.RECONOCIMIENTO_CALIDAD,
            resultado=ExcelenciaExpediente.Resultado.FAVORABLE,
        )
        url = f"{self.endpoint}?modalidad={self.excellence.pk}&page_size=20"
        with CaptureQueriesContext(connection) as one:
            one_response = self.client.get(url)
        for index in range(3, 8):
            post = self.create_post(self.excellence, self.period_i, self.concluded, f"Excelencia {index}", "Batch", f"RU-{index}00")
            ExcelenciaExpediente.objects.create(
                postulacion=post, criterio=ExcelenciaExpediente.Criterio.RECONOCIMIENTO_CALIDAD,
                resultado=ExcelenciaExpediente.Resultado.FAVORABLE,
            )
        with CaptureQueriesContext(connection) as many:
            many_response = self.client.get(url)
        self.assertEqual(one_response.data["count"], 1)
        self.assertEqual(many_response.data["count"], 6)
        self.assertEqual((len(one), len(many)), (4, 4))

    def test_policy_individual_documenta_limite_de_consultas_actual(self):
        self.p2.delete()
        url = f"{self.endpoint}?modalidad={self.project.pk}&page_size=20"
        with CaptureQueriesContext(connection) as one:
            self.client.get(url)
        for index in range(3, 8):
            self.create_post(self.project, self.period_i, self.registered, f"Proyecto {index}", "Batch", f"RU-P{index}")
        with CaptureQueriesContext(connection) as many:
            self.client.get(url)
        # La policy canónica consulta privada y pública por postulación.
        # Reportes mide esta deuda, pero no copia la fórmula ni toca la policy protegida.
        self.assertEqual((len(one), len(many)), (5, 15))

    def test_pagina_heterogenea_mide_consultas_reales(self):
        for code, name, index in (
            ("TESIS_GRADO", "Tesis R2", 3),
            ("TRABAJO_DIRIGIDO", "Trabajo Dirigido R2", 4),
            ("EXAMEN_GRADO", "Examen R2", 5),
            ("GRADUACION_VIA_DIPLOMADO", "Diplomado R2", 6),
        ):
            modalidad = Modalidad.objects.create(codigo=code, nombre=name)
            self.create_post(modalidad, self.period_i, self.registered, name, "Heterogénea", f"RU-H{index}")
        with CaptureQueriesContext(connection) as queries:
            response = self.client.get(f"{self.endpoint}?page_size=20")
        self.assertEqual(response.data["count"], 6)
        self.assertEqual(len(queries), 11)
