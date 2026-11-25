from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.postulantes.models import EstadoPostulacion, Postulacion, SeguimientoEtapa
from apps.postulantes.serializers import FlujoPostulacionSerializer
from apps.postulantes.tesis_grado_workflow import TesisGradoWorkflowOrchestrator
from apps.usuarios.models import Role


User = get_user_model()


class TesisGradoAutoinicializacionTests(TestCase):
    def setUp(self):
        admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administrador")
        self.admin = User.objects.create_user(username="admin_auto_tesis", is_staff=True, role=admin_role)
        self.student = User.objects.create_user(username="student_auto_tesis")
        self.modalidad = Modalidad.objects.create(codigo="TESIS_GRADO", nombre="Tesis auto")
        self.periodo = Periodo.objects.create(
            nombre="2026-AUTO-TESIS", gestion=2026, semestre="II",
            fecha_inicio="2026-07-01", fecha_fin="2026-12-31",
        )
        EstadoPostulacion.objects.create(codigo="REGISTRADA", nombre="Registrada")
        EstadoPostulacion.objects.create(codigo="EN_PROCESO", nombre="En proceso")
        for orden, codigo in enumerate(TesisGradoWorkflowOrchestrator.ETAPAS_LEGACY, 1):
            EtapaModalidad.objects.create(
                modalidad=self.modalidad, codigo=codigo, nombre=codigo.replace("_", " ").title(),
                orden=orden, obligatoria=True,
                permite_repeticion=codigo in {"PERFIL_TESIS", "DEFENSA_PRIVADA", "DEFENSA_PUBLICA"},
                origen_normativo="Normativa Tesis",
            )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def payload(self, codigo="TESIS-AUTO-001"):
        return {
            "codigo": codigo,
            "estudiante": self.student.pk,
            "modalidad": self.modalidad.pk,
            "periodo": self.periodo.pk,
        }

    def test_crear_tesis_inicializa_siete_etapas_sin_tematica_e_inicia_inscripcion(self):
        response = self.client.post("/api/v1/postulaciones/", self.payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        postulacion = Postulacion.all_objects.filter(pk=response.data["id"]).first()
        self.assertIsNotNone(postulacion, {"response": response.data})
        postulacion.refresh_from_db()
        self.assertEqual(postulacion.estado_actual.codigo, "EN_PROCESO")

        flujo = self.client.get(f"/api/v1/postulaciones/{postulacion.pk}/flujo/", format="json")
        self.assertEqual(flujo.status_code, status.HTTP_200_OK)
        self.assertEqual(flujo.data["porcentaje_avance"], 0.0)
        self.assertEqual(flujo.data["etapa_actual"]["codigo"], "INSCRIPCION")
        self.assertEqual(flujo.data["etapa_actual"]["estado"], "EN_PROCESO")
        self.assertEqual(len(flujo.data["etapas"]), 7)

        estados = {etapa["codigo"]: etapa["estado"] for etapa in flujo.data["etapas"]}
        self.assertEqual(estados["INSCRIPCION"], "EN_PROCESO")
        self.assertNotEqual(estados["INSCRIPCION"], "APROBADA")
        self.assertNotIn("TEMATICA_TESIS", estados)
        self.assertTrue(all(estados[codigo] == "PENDIENTE" for codigo in TesisGradoWorkflowOrchestrator.ETAPAS[1:]))

        orientacion = flujo.data["orientacion_etapa_actual"]
        requisitos = {item["codigo"]: item for item in orientacion["requisitos"]}
        self.assertEqual(set(requisitos), {"CARTA_SOLICITUD", "MATRICULA_VIGENTE", "HISTORIAL_PRERREQ"})
        self.assertTrue(all(item["cumplido"] is False for item in requisitos.values()))
        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")

    def test_orquestador_es_idempotente_y_no_duplica_seguimientos(self):
        postulacion = Postulacion.objects.create(
            codigo="TESIS-AUTO-IDEMP", estudiante=self.student, modalidad=self.modalidad,
            periodo=self.periodo, estado_actual=EstadoPostulacion.objects.get(codigo="REGISTRADA"),
        )

        primera = TesisGradoWorkflowOrchestrator.inicializar_proceso(postulacion, self.admin)
        fecha_inicio = next(item for item in primera if item.etapa.codigo == "INSCRIPCION").fecha_inicio
        segunda = TesisGradoWorkflowOrchestrator.inicializar_proceso(postulacion, self.admin)

        inscripcion = SeguimientoEtapa.objects.get(postulacion=postulacion, etapa__codigo="INSCRIPCION")
        self.assertEqual(len(primera), 7)
        self.assertEqual(len(segunda), 7)
        self.assertEqual(SeguimientoEtapa.objects.filter(postulacion=postulacion).count(), 7)
        self.assertEqual(inscripcion.estado, "EN_PROCESO")
        self.assertEqual(inscripcion.fecha_inicio, fecha_inicio)

    def test_tesis_legacy_conserva_tematicas_y_seguimientos_existentes(self):
        postulacion = Postulacion.objects.create(
            codigo="TESIS-AUTO-LEGACY", estudiante=self.student, modalidad=self.modalidad,
            periodo=self.periodo, estado_actual=EstadoPostulacion.objects.get(codigo="REGISTRADA"),
            regimen_workflow=Postulacion.RegimenWorkflowChoices.TESIS_LEGACY_V1,
        )
        from apps.postulantes.workflow import WorkflowService
        antiguos = WorkflowService.inicializar_flujo(postulacion, self.admin)
        thematic = next(item for item in antiguos if item.etapa.codigo == "TEMATICA_TESIS")
        SeguimientoEtapa.objects.filter(pk=thematic.pk).update(estado="APROBADA")
        thematic.refresh_from_db()

        actualizados = TesisGradoWorkflowOrchestrator.inicializar_proceso(postulacion, self.admin)

        self.assertEqual(len(actualizados), 8)
        self.assertEqual(SeguimientoEtapa.objects.filter(postulacion=postulacion).count(), 8)
        thematic.refresh_from_db()
        self.assertEqual(thematic.estado, "APROBADA")
        self.assertEqual(
            [item.etapa.codigo for item in actualizados],
            list(TesisGradoWorkflowOrchestrator.ETAPAS_LEGACY),
        )
        flujo = FlujoPostulacionSerializer(postulacion)
        self.assertIn("TEMATICA_TESIS", {item["codigo"] for item in flujo.get_etapas(postulacion)})

    def test_tesis_perfil_directo_oculta_tematica_operativa_y_conserva_el_seguimiento(self):
        postulacion = Postulacion.objects.create(
            codigo="TESIS-AUTO-V2-HIST", estudiante=self.student, modalidad=self.modalidad,
            periodo=self.periodo, estado_actual=EstadoPostulacion.objects.get(codigo="REGISTRADA"),
        )
        seguimientos = TesisGradoWorkflowOrchestrator.inicializar_proceso(postulacion, self.admin)
        by_code = {item.etapa.codigo: item for item in seguimientos}
        SeguimientoEtapa.objects.filter(pk=by_code["INSCRIPCION"].pk).update(estado="APROBADA")
        SeguimientoEtapa.objects.filter(pk=by_code["PERFIL_TESIS"].pk).update(estado="EN_PROCESO")
        thematic = SeguimientoEtapa.objects.create(
            postulacion=postulacion,
            etapa=self.modalidad.etapas.get(codigo="TEMATICA_TESIS"),
            estado="EN_PROCESO",
        )

        flujo = FlujoPostulacionSerializer(postulacion)

        self.assertNotIn("TEMATICA_TESIS", {item["codigo"] for item in flujo.get_etapas(postulacion)})
        self.assertEqual(flujo.get_etapa_actual(postulacion)["codigo"], "PERFIL_TESIS")
        self.assertEqual(flujo.get_etapas_totales(postulacion), 7)
        self.assertTrue(SeguimientoEtapa.objects.filter(pk=thematic.pk, activo=True).exists())

    def test_el_serializador_conserva_etapas_de_proyecto_y_otras_modalidades(self):
        for modality_code in ("PROYECTO_GRADO", "TRABAJO_DIRIGIDO"):
            with self.subTest(modalidad=modality_code):
                modality = Modalidad.objects.create(codigo=modality_code, nombre=modality_code)
                stages = [
                    EtapaModalidad.objects.create(
                        modalidad=modality, codigo=code, nombre=code, orden=order,
                        origen_normativo="Prueba",
                    )
                    for order, code in enumerate(("PERFIL_PROYECTO", "TEMATICA_TESIS"), start=1)
                ]
                student = User.objects.create_user(username=f"student_{modality_code.lower()}")
                postulacion = Postulacion.objects.create(
                    codigo=f"POST-{modality_code}", estudiante=student, modalidad=modality,
                    periodo=self.periodo, estado_actual=EstadoPostulacion.objects.get(codigo="REGISTRADA"),
                )
                for stage in stages:
                    SeguimientoEtapa.objects.create(postulacion=postulacion, etapa=stage)

                serialized_codes = {
                    item["codigo"]
                    for item in FlujoPostulacionSerializer(postulacion).get_etapas(postulacion)
                }
                self.assertEqual(serialized_codes, {"PERFIL_PROYECTO", "TEMATICA_TESIS"})

    @patch.object(
        TesisGradoWorkflowOrchestrator,
        "inicializar_proceso",
        side_effect=ValidationError("Fallo controlado de inicialización"),
    )
    def test_creacion_es_atomica_si_falla_la_autoinicializacion(self, _inicializar):
        response = self.client.post("/api/v1/postulaciones/", self.payload("TESIS-AUTO-ROLLBACK"), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Postulacion.objects.filter(codigo="TESIS-AUTO-ROLLBACK").exists())
        self.assertFalse(SeguimientoEtapa.objects.filter(postulacion__codigo="TESIS-AUTO-ROLLBACK").exists())
