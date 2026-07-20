from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.postulantes.models import EstadoPostulacion, HistorialEstado, Postulacion, SeguimientoEtapa
from apps.postulantes.serializers import FlujoPostulacionSerializer
from apps.postulantes.workflow import WorkflowService


User = get_user_model()


class WorkflowBaseMixin:
    def setUp(self) -> None:
        super().setUp()
        self.admin = User.objects.create_user(
            username="admin_flujo",
            password="segura123",
            ci="9000001",
            ru="RU9000001",
            is_staff=True,
            is_superuser=True,
        )
        self.student = User.objects.create_user(
            username="estudiante_flujo",
            password="segura123",
            ci="9000002",
            ru="RU9000002",
        )
        self.other_student = User.objects.create_user(
            username="otro_flujo",
            password="segura123",
            ci="9000003",
            ru="RU9000003",
        )
        self.modalidad = Modalidad.objects.create(
            codigo="PROYECTO_GRADO",
            nombre="Proyecto de Grado",
        )
        self.otra_modalidad = Modalidad.objects.create(
            codigo="TRABAJO_DIRIGIDO",
            nombre="Trabajo Dirigido",
        )
        self.periodo = Periodo.objects.create(
            nombre="2026-II",
            gestion=2026,
            semestre="II",
            fecha_inicio="2026-07-01",
            fecha_fin="2026-12-31",
        )
        self.estado_registrada = EstadoPostulacion.objects.create(
            codigo="REGISTRADA",
            nombre="Registrada",
        )
        self.estado_en_proceso = EstadoPostulacion.objects.create(
            codigo="EN_PROCESO",
            nombre="En proceso",
        )
        self.estado_concluida = EstadoPostulacion.objects.create(
            codigo="CONCLUIDA",
            nombre="Concluida",
        )
        self.postulacion = Postulacion.objects.create(
            codigo="POST-FLUJO-001",
            estudiante=self.student,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )
        self.other_postulacion = Postulacion.objects.create(
            codigo="POST-FLUJO-002",
            estudiante=self.other_student,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )

        self.etapa_inscripcion = EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo="INSCRIPCION",
            nombre="Inscripción",
            orden=1,
            origen_normativo="Capítulo II",
        )
        self.etapa_perfil = EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo="PERFIL_PROYECTO",
            nombre="Perfil de Proyecto",
            orden=2,
            permite_repeticion=True,
            origen_normativo="Capítulo III",
        )
        self.etapa_opcional = EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo="ETAPA_OPCIONAL",
            nombre="Etapa Opcional",
            orden=3,
            obligatoria=False,
            origen_normativo="Diagrama oficial",
        )
        self.etapa_cierre = EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo="CIERRE_DOCUMENTAL",
            nombre="Cierre Documental",
            orden=4,
            origen_normativo="Capítulo VII",
        )


class SeguimientoEtapaModelTest(WorkflowBaseMixin, TestCase):
    """Pruebas del modelo SeguimientoEtapa."""

    def test_seguimiento_rechaza_modalidad_distinta(self):
        etapa_ajena = EtapaModalidad.objects.create(
            modalidad=self.otra_modalidad,
            codigo="INSCRIPCION_TD",
            nombre="Inscripción TD",
            orden=1,
            origen_normativo="Otro reglamento",
        )
        seguimiento = SeguimientoEtapa(
            postulacion=self.postulacion,
            etapa=etapa_ajena,
        )

        with self.assertRaises(ValidationError):
            seguimiento.full_clean()

    def test_seguimiento_rechaza_fecha_fin_anterior(self):
        seguimiento = SeguimientoEtapa(
            postulacion=self.postulacion,
            etapa=self.etapa_inscripcion,
            fecha_inicio="2026-07-10T10:00:00Z",
            fecha_fin="2026-07-09T10:00:00Z",
        )

        with self.assertRaises(ValidationError):
            seguimiento.full_clean()


class WorkflowServiceTest(WorkflowBaseMixin, TestCase):
    """Pruebas del servicio genérico de flujo."""

    def test_inicializar_flujo_crea_etapas_pendientes_e_idempotente(self):
        seguimientos = WorkflowService.inicializar_flujo(self.postulacion, self.admin)
        repetido = WorkflowService.inicializar_flujo(self.postulacion, self.admin)

        self.assertEqual(len(seguimientos), 4)
        self.assertEqual(
            [seguimiento.etapa.codigo for seguimiento in seguimientos],
            ["INSCRIPCION", "PERFIL_PROYECTO", "ETAPA_OPCIONAL", "CIERRE_DOCUMENTAL"],
        )
        self.assertTrue(
            all(
                seguimiento.estado == SeguimientoEtapa.EstadoChoices.PENDIENTE
                and seguimiento.numero_intento == 1
                for seguimiento in seguimientos
            )
        )
        self.assertEqual(SeguimientoEtapa.objects.filter(postulacion=self.postulacion).count(), 4)
        self.assertEqual(len(repetido), 4)

    def test_inicializar_flujo_falla_si_modalidad_no_tiene_etapas(self):
        postulacion_sin_etapas = Postulacion.objects.create(
            codigo="POST-SIN-ETAPAS",
            estudiante=self.student,
            modalidad=self.otra_modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )

        with self.assertRaisesMessage(ValidationError, "La modalidad no tiene etapas activas configuradas."):
            WorkflowService.inicializar_flujo(postulacion_sin_etapas, self.admin)

        self.assertFalse(SeguimientoEtapa.objects.filter(postulacion=postulacion_sin_etapas).exists())

    def test_iniciar_etapa_actualiza_estado_general_e_historial(self):
        seguimiento = WorkflowService.inicializar_flujo(self.postulacion, self.admin)[0]

        actualizado = WorkflowService.iniciar_etapa(seguimiento, self.admin)

        self.assertEqual(actualizado.estado, SeguimientoEtapa.EstadoChoices.EN_PROCESO)
        self.assertIsNotNone(actualizado.fecha_inicio)
        self.assertEqual(actualizado.abierta_por, self.admin)
        self.postulacion.refresh_from_db()
        self.assertEqual(self.postulacion.estado_actual.codigo, "EN_PROCESO")
        self.assertTrue(
            HistorialEstado.objects.filter(
                postulacion=self.postulacion,
                estado_nuevo__codigo="EN_PROCESO",
            ).exists()
        )

    def test_no_permite_iniciar_si_hay_etapas_obligatorias_previas_sin_aprobar(self):
        WorkflowService.inicializar_flujo(self.postulacion, self.admin)
        seguimiento_perfil = SeguimientoEtapa.objects.get(
            postulacion=self.postulacion,
            etapa=self.etapa_perfil,
            numero_intento=1,
        )

        with self.assertRaisesMessage(ValidationError, "Existen etapas obligatorias anteriores sin aprobar."):
            WorkflowService.iniciar_etapa(seguimiento_perfil, self.admin)

    def test_observar_etapa_exige_observaciones(self):
        seguimiento = WorkflowService.inicializar_flujo(self.postulacion, self.admin)[0]
        seguimiento = WorkflowService.iniciar_etapa(seguimiento, self.admin)

        with self.assertRaisesMessage(ValidationError, "Las observaciones son obligatorias."):
            WorkflowService.observar_etapa(seguimiento, self.admin, "   ")

    def test_aprobar_cierre_documental_marca_postulacion_concluida(self):
        WorkflowService.inicializar_flujo(self.postulacion, self.admin)
        for etapa in (self.etapa_inscripcion, self.etapa_perfil, self.etapa_opcional, self.etapa_cierre):
            seguimiento = SeguimientoEtapa.objects.get(
                postulacion=self.postulacion,
                etapa=etapa,
                numero_intento=1,
            )
            seguimiento = WorkflowService.iniciar_etapa(seguimiento, self.admin)
            WorkflowService.aprobar_etapa(seguimiento, self.admin)

        self.postulacion.refresh_from_db()
        cierre = SeguimientoEtapa.objects.get(postulacion=self.postulacion, etapa=self.etapa_cierre, numero_intento=1)
        self.assertEqual(cierre.estado, SeguimientoEtapa.EstadoChoices.APROBADA)
        self.assertEqual(self.postulacion.estado_actual.codigo, "CONCLUIDA")
        self.assertTrue(
            HistorialEstado.objects.filter(
                postulacion=self.postulacion,
                estado_nuevo__codigo="CONCLUIDA",
            ).exists()
        )

    def test_no_permite_omitir_etapa_obligatoria(self):
        seguimiento = WorkflowService.inicializar_flujo(self.postulacion, self.admin)[0]

        with self.assertRaisesMessage(ValidationError, "No se pueden omitir etapas obligatorias."):
            WorkflowService.omitir_etapa(seguimiento, self.admin, "No aplica")

    def test_crear_nuevo_intento_para_etapa_repetible_rechazada(self):
        WorkflowService.inicializar_flujo(self.postulacion, self.admin)
        seguimiento_inscripcion = SeguimientoEtapa.objects.get(
            postulacion=self.postulacion,
            etapa=self.etapa_inscripcion,
            numero_intento=1,
        )
        WorkflowService.aprobar_etapa(
            WorkflowService.iniciar_etapa(seguimiento_inscripcion, self.admin),
            self.admin,
        )
        seguimiento_perfil = SeguimientoEtapa.objects.get(
            postulacion=self.postulacion,
            etapa=self.etapa_perfil,
            numero_intento=1,
        )
        WorkflowService.rechazar_etapa(
            WorkflowService.iniciar_etapa(seguimiento_perfil, self.admin),
            self.admin,
            "Debe rehacer el perfil",
        )

        nuevo_intento = WorkflowService.crear_nuevo_intento(
            self.postulacion,
            self.etapa_perfil,
            self.admin,
        )

        self.assertEqual(nuevo_intento.numero_intento, 2)
        self.assertEqual(nuevo_intento.estado, SeguimientoEtapa.EstadoChoices.PENDIENTE)

    def test_porcentaje_avance_no_sobrecuenta_intentos_repetidos(self):
        WorkflowService.inicializar_flujo(self.postulacion, self.admin)
        WorkflowService.aprobar_etapa(
            WorkflowService.iniciar_etapa(
                SeguimientoEtapa.objects.get(postulacion=self.postulacion, etapa=self.etapa_inscripcion, numero_intento=1),
                self.admin,
            ),
            self.admin,
        )
        WorkflowService.rechazar_etapa(
            WorkflowService.iniciar_etapa(
                SeguimientoEtapa.objects.get(postulacion=self.postulacion, etapa=self.etapa_perfil, numero_intento=1),
                self.admin,
            ),
            self.admin,
            "Debe corregir",
        )
        nuevo_intento = WorkflowService.crear_nuevo_intento(self.postulacion, self.etapa_perfil, self.admin)
        WorkflowService.aprobar_etapa(WorkflowService.iniciar_etapa(nuevo_intento, self.admin), self.admin)

        serializer = FlujoPostulacionSerializer(
            self.postulacion,
            context={},
        )

        self.assertEqual(serializer.data["porcentaje_avance"], 66.67)


class WorkflowApiTest(WorkflowBaseMixin, APITestCase):
    """Pruebas API para endpoints del flujo académico."""

    def authenticate(self, user) -> None:
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_estudiante_puede_ver_su_flujo(self):
        WorkflowService.inicializar_flujo(self.postulacion, self.admin)
        self.authenticate(self.student)

        response = self.client.get(f"/api/v1/postulaciones/{self.postulacion.id}/flujo/", format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["codigo"], self.postulacion.codigo)
        self.assertEqual(len(response.data["etapas"]), 4)

    def test_estudiante_no_puede_ver_flujo_ajeno(self):
        WorkflowService.inicializar_flujo(self.other_postulacion, self.admin)
        self.authenticate(self.student)

        response = self.client.get(f"/api/v1/postulaciones/{self.other_postulacion.id}/flujo/", format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_puede_inicializar_e_iniciar_etapa_por_api(self):
        self.authenticate(self.admin)
        inicializar = self.client.post(
            f"/api/v1/postulaciones/{self.postulacion.id}/flujo/inicializar/",
            format="json",
        )
        seguimiento = SeguimientoEtapa.objects.get(
            postulacion=self.postulacion,
            etapa=self.etapa_inscripcion,
            numero_intento=1,
        )

        iniciar = self.client.post(
            f"/api/v1/seguimientos-etapa/{seguimiento.id}/iniciar/",
            format="json",
        )

        self.assertEqual(inicializar.status_code, status.HTTP_200_OK)
        self.assertEqual(iniciar.status_code, status.HTTP_200_OK)
        self.assertEqual(iniciar.data["estado"], SeguimientoEtapa.EstadoChoices.EN_PROCESO)

    def test_admin_puede_crear_nuevo_intento_por_api(self):
        WorkflowService.inicializar_flujo(self.postulacion, self.admin)
        WorkflowService.aprobar_etapa(
            WorkflowService.iniciar_etapa(
                SeguimientoEtapa.objects.get(postulacion=self.postulacion, etapa=self.etapa_inscripcion, numero_intento=1),
                self.admin,
            ),
            self.admin,
        )
        WorkflowService.rechazar_etapa(
            WorkflowService.iniciar_etapa(
                SeguimientoEtapa.objects.get(postulacion=self.postulacion, etapa=self.etapa_perfil, numero_intento=1),
                self.admin,
            ),
            self.admin,
            "Corregir",
        )
        self.authenticate(self.admin)

        response = self.client.post(
            f"/api/v1/postulaciones/{self.postulacion.id}/etapas/{self.etapa_perfil.id}/nuevo-intento/",
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["numero_intento"], 2)

    def test_estudiante_no_puede_ejecutar_acciones_operativas(self):
        WorkflowService.inicializar_flujo(self.postulacion, self.admin)
        seguimiento = SeguimientoEtapa.objects.get(
            postulacion=self.postulacion,
            etapa=self.etapa_inscripcion,
            numero_intento=1,
        )
        self.authenticate(self.student)

        response = self.client.post(
            f"/api/v1/seguimientos-etapa/{seguimiento.id}/iniciar/",
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_endpoints_de_flujo_requieren_autenticacion(self):
        WorkflowService.inicializar_flujo(self.postulacion, self.admin)
        seguimiento = SeguimientoEtapa.objects.get(
            postulacion=self.postulacion,
            etapa=self.etapa_inscripcion,
            numero_intento=1,
        )

        flujo = self.client.get(f"/api/v1/postulaciones/{self.postulacion.id}/flujo/", format="json")
        iniciar = self.client.post(f"/api/v1/seguimientos-etapa/{seguimiento.id}/iniciar/", format="json")

        self.assertEqual(flujo.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(iniciar.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_directo_sobre_seguimiento_no_esta_permitido(self):
        WorkflowService.inicializar_flujo(self.postulacion, self.admin)
        seguimiento = SeguimientoEtapa.objects.get(
            postulacion=self.postulacion,
            etapa=self.etapa_inscripcion,
            numero_intento=1,
        )
        self.authenticate(self.admin)

        response = self.client.patch(
            f"/api/v1/seguimientos-etapa/{seguimiento.id}/",
            {"estado": SeguimientoEtapa.EstadoChoices.APROBADA},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
