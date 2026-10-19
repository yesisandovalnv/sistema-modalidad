from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.postulantes.models import EstadoPostulacion, Postulacion, SeguimientoEtapa
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
        for orden, codigo in enumerate(TesisGradoWorkflowOrchestrator.ETAPAS, 1):
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

    def test_crear_tesis_inicializa_ocho_etapas_e_inicia_solo_inscripcion(self):
        response = self.client.post("/api/v1/postulaciones/", self.payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        postulacion = Postulacion.objects.get(codigo="TESIS-AUTO-001")
        postulacion.refresh_from_db()
        self.assertEqual(postulacion.estado_actual.codigo, "EN_PROCESO")

        flujo = self.client.get(f"/api/v1/postulaciones/{postulacion.pk}/flujo/", format="json")
        self.assertEqual(flujo.status_code, status.HTTP_200_OK)
        self.assertEqual(flujo.data["porcentaje_avance"], 0.0)
        self.assertEqual(flujo.data["etapa_actual"]["codigo"], "INSCRIPCION")
        self.assertEqual(flujo.data["etapa_actual"]["estado"], "EN_PROCESO")
        self.assertEqual(len(flujo.data["etapas"]), 8)

        estados = {etapa["codigo"]: etapa["estado"] for etapa in flujo.data["etapas"]}
        self.assertEqual(estados["INSCRIPCION"], "EN_PROCESO")
        self.assertNotEqual(estados["INSCRIPCION"], "APROBADA")
        self.assertEqual(estados["TEMATICA_TESIS"], "PENDIENTE")
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
        self.assertEqual(len(primera), 8)
        self.assertEqual(len(segunda), 8)
        self.assertEqual(SeguimientoEtapa.objects.filter(postulacion=postulacion).count(), 8)
        self.assertEqual(inscripcion.estado, "EN_PROCESO")
        self.assertEqual(inscripcion.fecha_inicio, fecha_inicio)

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
