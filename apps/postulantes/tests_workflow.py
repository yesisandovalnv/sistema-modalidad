from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import Resolver404, resolve
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, TipoDocumento, VersionDocumento
from apps.postulantes.models import (AsignacionPostulacion, EstadoPostulacion, EvaluacionDefensa,
                                     EventoDefensa, HistorialEstado, Postulacion, SeguimientoEtapa)
from apps.postulantes.serializers import FlujoPostulacionSerializer
from apps.postulantes.workflow import WorkflowService
from apps.usuarios.models import Role


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
        admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administrador")
        student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        self.admin.role = admin_role
        self.admin.save(update_fields=["role"])
        User.objects.filter(pk__in=[self.student.pk, self.other_student.pk]).update(role=student_role)
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

    def habilitar_aprobacion_perfil(self, seguimiento):
        ahora = timezone.now()
        evento = EventoDefensa.objects.create(
            postulacion=self.postulacion,
            seguimiento_etapa=seguimiento,
            tipo_evento="DEFENSA_PERFIL",
            estado="FINALIZADA",
            fecha_programada=ahora,
            fecha_inicio_real=ahora,
            fecha_fin_real=ahora,
            lugar="Sala",
            programado_por=self.admin,
        )
        EvaluacionDefensa.objects.create(
            evento=evento,
            tipo_evaluacion="RESULTADO_FINAL",
            modalidad_registro="CONSENSO",
            resultado_cualitativo="SUFICIENTE",
            es_resultado_final_evento=True,
            registrado_por=self.admin,
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

    def test_workflow_rechaza_postulacion_historica(self):
        self.postulacion.tipo_registro = Postulacion.TipoRegistroChoices.HISTORICO
        self.postulacion.vigencia = Postulacion.VigenciaChoices.CERRADA
        self.postulacion.save(update_fields=["tipo_registro", "vigencia"])

        with self.assertRaises(ValidationError):
            WorkflowService.inicializar_flujo(self.postulacion, self.admin)

    def test_acciones_rechazan_seguimiento_de_postulacion_historica(self):
        self.postulacion.tipo_registro = Postulacion.TipoRegistroChoices.HISTORICO
        self.postulacion.vigencia = Postulacion.VigenciaChoices.CERRADA
        self.postulacion.save(update_fields=["tipo_registro", "vigencia"])
        seguimiento = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion,
            etapa=self.etapa_inscripcion,
        )
        acciones = (
            lambda: WorkflowService.iniciar_etapa(seguimiento, self.admin),
            lambda: WorkflowService.aprobar_etapa(seguimiento, self.admin),
            lambda: WorkflowService.observar_etapa(seguimiento, self.admin, "Observación"),
            lambda: WorkflowService.rechazar_etapa(seguimiento, self.admin),
            lambda: WorkflowService.omitir_etapa(seguimiento, self.admin),
        )

        for accion in acciones:
            with self.subTest(accion=accion):
                with self.assertRaises(ValidationError):
                    accion()

    def test_inicializar_flujo_falla_si_modalidad_no_tiene_etapas(self):
        estudiante_sin_etapas = User.objects.create_user(
            username="estudiante_flujo_sin_etapas",
            password="segura123",
            ci="9000099",
            ru="RU9000099",
        )
        postulacion_sin_etapas = Postulacion.objects.create(
            codigo="POST-SIN-ETAPAS",
            estudiante=estudiante_sin_etapas,
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

    def test_aprobar_cierre_documental_bloquea_requisitos_pendientes(self):
        WorkflowService.inicializar_flujo(self.postulacion, self.admin)
        for etapa in (self.etapa_inscripcion, self.etapa_perfil, self.etapa_opcional, self.etapa_cierre):
            seguimiento = SeguimientoEtapa.objects.get(
                postulacion=self.postulacion,
                etapa=etapa,
                numero_intento=1,
            )
            seguimiento = WorkflowService.iniciar_etapa(seguimiento, self.admin)
            if etapa == self.etapa_cierre:
                with self.assertRaises(ValidationError) as error:
                    WorkflowService.aprobar_etapa(seguimiento, self.admin)
                self.assertIn("REVISION_FINAL_POST_PUBLICA_APROBADA", str(error.exception))
                self.assertIn("CONDICION:PLAN_ESTUDIOS", str(error.exception))
                self.assertIn("ENTREGA:CD_RESPALDO", str(error.exception))
                self.assertIn("DOCUMENTO:DOCUMENTO_FINAL", str(error.exception))
            else:
                if etapa == self.etapa_perfil:
                    self.habilitar_aprobacion_perfil(seguimiento)
                WorkflowService.aprobar_etapa(seguimiento, self.admin)

        self.postulacion.refresh_from_db()
        cierre = SeguimientoEtapa.objects.get(postulacion=self.postulacion, etapa=self.etapa_cierre, numero_intento=1)
        self.assertEqual(cierre.estado, SeguimientoEtapa.EstadoChoices.EN_PROCESO)
        self.assertNotEqual(self.postulacion.estado_actual.codigo, "CONCLUIDA")
        self.assertFalse(HistorialEstado.objects.filter(postulacion=self.postulacion, estado_nuevo__codigo="CONCLUIDA").exists())

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
        nuevo_intento = WorkflowService.iniciar_etapa(nuevo_intento, self.admin)
        self.habilitar_aprobacion_perfil(nuevo_intento)
        WorkflowService.aprobar_etapa(nuevo_intento, self.admin)

        serializer = FlujoPostulacionSerializer(
            self.postulacion,
            context={},
        )

        self.assertEqual(serializer.data["porcentaje_avance"], 66.67)


class ProgrammingOrientationTest(WorkflowBaseMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.etapa_defensa = EtapaModalidad.objects.create(
            modalidad=self.modalidad, codigo="DEFENSA_PUBLICA", nombre="Defensa Pública",
            orden=6, origen_normativo="Diagrama oficial",
        )
        self.seguimiento = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion, etapa=self.etapa_defensa,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO, numero_intento=1,
        )
        self.actors = [User.objects.create_user(
            username=f"actor_orientacion_{index}", password="segura123", ci=f"910000{index}", ru=f"RU910000{index}",
        ) for index in range(1, 6)]

    def _asignar(self, usuario, rol, orden=None):
        return AsignacionPostulacion.objects.create(
            postulacion=self.postulacion, usuario=usuario, tipo_participacion=rol,
            orden_cargo=orden, designado_por=self.admin, seguimiento_etapa=self.seguimiento,
        )

    def _orientacion(self):
        return FlujoPostulacionSerializer(self.postulacion, context={}).data["orientacion_etapa_actual"]

    def test_orienta_a_actores_cuando_faltan_presidente_y_secretario(self):
        for index, usuario in enumerate(self.actors[:3], 1):
            self._asignar(usuario, "TRIBUNAL", index)
        orientacion = self._orientacion()
        requisitos = {item["codigo"]: item for item in orientacion["requisitos"]}
        self.assertEqual(requisitos["TRIBUNAL"]["nombre"], "Tribunales")
        self.assertEqual(requisitos["TRIBUNAL"]["estado_display"], "3/2 ✓")
        self.assertEqual(requisitos["PRESIDENTE"]["estado_display"], "0/1 pendiente")
        self.assertEqual(requisitos["SECRETARIO"]["estado_display"], "0/1 pendiente")
        self.assertEqual(requisitos["ANTICIPACION_MINIMA"]["estado_display"], "48 h")
        self.assertEqual(orientacion["siguiente_accion"]["titulo"], "Actores de la postulación")
        self.assertEqual(orientacion["siguiente_accion"]["destino"], "#actores")

    def test_orienta_a_programar_defensa_cuando_actores_estan_completos(self):
        self._asignar(self.actors[0], "TRIBUNAL", 1)
        self._asignar(self.actors[1], "TRIBUNAL", 2)
        self._asignar(self.actors[2], "PRESIDENTE")
        self._asignar(self.actors[3], "SECRETARIO")
        orientacion = self._orientacion()
        self.assertTrue(all(item["cumplido"] for item in orientacion["requisitos"] if item["tipo"] == "ACTOR"))
        self.assertEqual(orientacion["siguiente_accion"]["titulo"], "Programar defensa")
        self.assertEqual(orientacion["siguiente_accion"]["destino"], "#defensas")

    def test_orientacion_detecta_conflicto_de_identidad(self):
        self._asignar(self.actors[0], "TRIBUNAL", 1)
        self._asignar(self.actors[1], "TRIBUNAL", 2)
        self._asignar(self.actors[2], "PRESIDENTE")
        self._asignar(self.actors[2], "SECRETARIO")
        orientacion = self._orientacion()
        requisitos = {item["codigo"]: item for item in orientacion["requisitos"]}
        self.assertFalse(requisitos["PRESIDENTE"]["cumplido"])
        self.assertFalse(requisitos["SECRETARIO"]["cumplido"])
        self.assertTrue(requisitos["PRESIDENTE"]["conflicto_identidad"])
        self.assertEqual(orientacion["siguiente_accion"]["titulo"], "Actores de la postulación")
        self.assertEqual(orientacion["conflictos_identidad"][0]["usuario_id"], self.actors[2].pk)


class DocumentoFinalApprovalPreconditionTest(WorkflowBaseMixin, TestCase):
    ERROR = (
        "No se puede aprobar la etapa DOCUMENTO_FINAL: se requiere un Documento Final activo, "
        "aprobado, sin correcciones pendientes y con una versión actual activa."
    )

    def setUp(self) -> None:
        super().setUp()
        self.etapa_documento_final = EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo="DOCUMENTO_FINAL",
            nombre="Documento Final",
            orden=5,
            origen_normativo="Proyecto de Grado",
        )
        self.seguimiento = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion,
            etapa=self.etapa_documento_final,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
            numero_intento=1,
        )
        self.tipo_documento_final = TipoDocumento.objects.create(
            codigo="DOCUMENTO_FINAL",
            nombre="Documento Final",
            permite_multiple_version=True,
        )
        self.estado_env = EstadoDocumento.objects.create(codigo="ENV", nombre="Enviado")
        self.estado_apr = EstadoDocumento.objects.create(codigo="APR", nombre="Aprobado")

    def _documento(self, *, estado=None, requiere_correccion=False, activo=True):
        documento = DocumentoPostulacion.objects.create(
            postulacion=self.postulacion,
            tipo_documento=self.tipo_documento_final,
            estado=estado or self.estado_apr,
            requiere_correccion=requiere_correccion,
        )
        if not activo:
            documento.activo = False
            documento.save(update_fields=["activo"])
        return documento

    def _version(self, documento, *, es_version_actual=True, activo=True):
        version = VersionDocumento.objects.create(
            documento=documento,
            subido_por=self.admin,
            numero_version=1,
            archivo="documentos/versiones/documento-final.pdf",
            nombre_original="documento-final.pdf",
            tamano_bytes=10,
            hash_sha256="a" * 64,
            es_version_actual=es_version_actual,
        )
        if not activo:
            version.activo = False
            version.save(update_fields=["activo"])
        return version

    def _assert_rejected(self):
        with self.assertRaisesMessage(ValidationError, self.ERROR):
            WorkflowService.aprobar_etapa(self.seguimiento, self.admin)
        self.seguimiento.refresh_from_db()
        self.assertEqual(self.seguimiento.estado, SeguimientoEtapa.EstadoChoices.EN_PROCESO)
        self.assertIsNone(self.seguimiento.fecha_fin)
        self.assertIsNone(self.seguimiento.cerrada_por_id)

    def _orientation(self):
        return FlujoPostulacionSerializer(self.postulacion, context={}).data["orientacion_etapa_actual"]

    def test_orientation_requests_document_when_missing(self):
        orientation = self._orientation()
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")
        self.assertEqual(orientation["siguiente_accion"]["destino"], "#documentos")

    def test_orientation_waits_for_administrative_review_when_document_is_sent(self):
        documento = self._documento(estado=self.estado_env)
        self._version(documento)
        orientation = self._orientation()
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "GESTIONAR_DOCUMENTOS")
        self.assertNotEqual(orientation["siguiente_accion"]["codigo"], "APROBAR_ETAPA")

    def test_orientation_requests_correction_when_document_is_observed(self):
        documento = self._documento(requiere_correccion=True)
        self._version(documento)
        orientation = self._orientation()
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")
        self.assertIn("corrección", orientation["mensaje"])

    def test_orientation_does_not_approve_without_current_active_version(self):
        documento = self._documento()
        self._version(documento, activo=False)
        orientation = self._orientation()
        self.assertNotEqual(orientation["siguiente_accion"]["codigo"], "APROBAR_ETAPA")

    def test_orientation_allows_stage_approval_only_when_document_is_valid(self):
        documento = self._documento()
        self._version(documento)
        orientation = self._orientation()
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "APROBAR_ETAPA")

    def test_rechaza_si_no_existe_documento_final_activo(self):
        self._documento(activo=False)
        self._assert_rejected()

    def test_rechaza_si_documento_final_no_esta_aprobado(self):
        documento = self._documento(estado=self.estado_env)
        self._version(documento)
        self._assert_rejected()

    def test_rechaza_si_documento_final_requiere_correccion(self):
        documento = self._documento(requiere_correccion=True)
        self._version(documento)
        self._assert_rejected()

    def test_rechaza_si_no_existe_version_actual(self):
        self._documento()
        self._assert_rejected()

    def test_rechaza_si_version_actual_no_esta_activa(self):
        documento = self._documento()
        self._version(documento, activo=False)
        self._assert_rejected()

    def test_rechaza_si_version_activa_no_es_actual(self):
        documento = self._documento()
        self._version(documento, es_version_actual=False)
        self._assert_rejected()

    def test_aprueba_etapa_si_documento_cumple_todas_las_precondiciones(self):
        documento = self._documento()
        version = self._version(documento)

        actualizado = WorkflowService.aprobar_etapa(self.seguimiento, self.admin)

        self.assertEqual(actualizado.estado, SeguimientoEtapa.EstadoChoices.APROBADA)
        self.assertIsNotNone(actualizado.fecha_fin)
        self.assertEqual(actualizado.cerrada_por, self.admin)
        documento.refresh_from_db()
        version.refresh_from_db()
        self.assertEqual(documento.estado.codigo, "APR")
        self.assertTrue(version.es_version_actual)
        self.assertTrue(version.activo)


class WorkflowApiTest(WorkflowBaseMixin, APITestCase):
    """Pruebas API para endpoints del flujo académico."""

    def authenticate(self, user) -> None:
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_serializer_expone_capacidades_reales_por_estado(self):
        seguimiento = WorkflowService.inicializar_flujo(self.postulacion, self.admin)[0]
        self.authenticate(self.admin)

        expected_by_state = {
            SeguimientoEtapa.EstadoChoices.PENDIENTE: ["iniciar"],
            SeguimientoEtapa.EstadoChoices.EN_PROCESO: ["aprobar", "observar", "rechazar"],
            SeguimientoEtapa.EstadoChoices.OBSERVADA: ["aprobar", "rechazar"],
            SeguimientoEtapa.EstadoChoices.APROBADA: [],
            SeguimientoEtapa.EstadoChoices.RECHAZADA: [],
        }
        for state, expected in expected_by_state.items():
            with self.subTest(state=state):
                seguimiento.estado = state
                seguimiento.save(update_fields=["estado"])
                response = self.client.get("/api/v1/seguimientos-etapa/")
                payload = next(item for item in response.data["results"] if item["id"] == seguimiento.id)
                self.assertEqual(payload["acciones_permitidas"], expected)

    def test_serializer_no_expone_capacidades_operativas_a_usuario_no_admin(self):
        seguimiento = WorkflowService.inicializar_flujo(self.postulacion, self.admin)[0]
        self.authenticate(self.student)

        response = self.client.get("/api/v1/seguimientos-etapa/")

        payload = next(item for item in response.data["results"] if item["id"] == seguimiento.id)
        self.assertEqual(payload["acciones_permitidas"], [])

    def test_listado_de_seguimiento_expone_datos_humanos_y_conserva_contrato(self):
        self.student.nombres = "Ana Maria"
        self.student.apellido_paterno = "Quispe"
        self.student.apellido_materno = "Mamani"
        self.student.save(update_fields=["nombres", "apellido_paterno", "apellido_materno"])
        seguimiento = WorkflowService.inicializar_flujo(self.postulacion, self.admin)[0]
        self.authenticate(self.admin)

        response = self.client.get("/api/v1/seguimientos-etapa/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = next(item for item in response.data["results"] if item["id"] == seguimiento.id)
        self.assertEqual(payload["postulacion"], self.postulacion.id)
        self.assertEqual(payload["codigo_postulacion"], "POST-FLUJO-001")
        self.assertEqual(payload["estudiante_nombre"], "Ana Maria Quispe Mamani")
        self.assertEqual(payload["modalidad_nombre"], "Proyecto de Grado")
        self.assertEqual(payload["codigo"], "INSCRIPCION")
        self.assertEqual(payload["estado"], SeguimientoEtapa.EstadoChoices.PENDIENTE)
        self.assertEqual(payload["numero_intento"], 1)

    def test_rutas_de_acciones_resuelven_al_viewset_de_seguimiento(self):
        for action in ("aprobar", "rechazar", "omitir"):
            with self.subTest(action=action):
                match = resolve(f"/api/v1/seguimientos-etapa/1/{action}/")
                self.assertEqual(match.view_name, f"seguimientos-etapa-{action}")
                self.assertEqual(match.func.actions, {"post": action})

    def test_rutas_de_asignacion_conservan_sus_acciones_propias(self):
        for action in ("finalizar", "reemplazar"):
            with self.subTest(action=action):
                match = resolve(f"/api/v1/asignaciones/1/{action}/")
                self.assertEqual(match.view_name, f"asignaciones-{action}")
        for action in ("aprobar", "rechazar", "omitir"):
            with self.subTest(action=action), self.assertRaises(Resolver404):
                resolve(f"/api/v1/asignaciones/1/{action}/")

    def test_admin_aprueba_etapa_en_proceso_por_api(self):
        seguimiento = WorkflowService.iniciar_etapa(
            WorkflowService.inicializar_flujo(self.postulacion, self.admin)[0],
            self.admin,
        )
        self.authenticate(self.admin)

        response = self.client.post(
            f"/api/v1/seguimientos-etapa/{seguimiento.id}/aprobar/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        seguimiento.refresh_from_db()
        self.assertEqual(seguimiento.estado, SeguimientoEtapa.EstadoChoices.APROBADA)

    def test_admin_rechaza_etapa_en_proceso_por_api(self):
        seguimiento = WorkflowService.iniciar_etapa(
            WorkflowService.inicializar_flujo(self.postulacion, self.admin)[0],
            self.admin,
        )
        self.authenticate(self.admin)

        response = self.client.post(
            f"/api/v1/seguimientos-etapa/{seguimiento.id}/rechazar/",
            {"observaciones": "No cumple"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        seguimiento.refresh_from_db()
        self.assertEqual(seguimiento.estado, SeguimientoEtapa.EstadoChoices.RECHAZADA)

    def test_admin_observa_y_luego_aprueba_etapa_por_api(self):
        seguimiento = WorkflowService.iniciar_etapa(
            WorkflowService.inicializar_flujo(self.postulacion, self.admin)[0],
            self.admin,
        )
        self.authenticate(self.admin)

        observar = self.client.post(
            f"/api/v1/seguimientos-etapa/{seguimiento.id}/observar/",
            {"observaciones": "Subsanar observación"},
            format="json",
        )
        aprobar = self.client.post(
            f"/api/v1/seguimientos-etapa/{seguimiento.id}/aprobar/",
            {},
            format="json",
        )

        self.assertEqual(observar.status_code, status.HTTP_200_OK)
        self.assertEqual(observar.data["estado"], SeguimientoEtapa.EstadoChoices.OBSERVADA)
        self.assertEqual(aprobar.status_code, status.HTTP_200_OK)
        self.assertEqual(aprobar.data["estado"], SeguimientoEtapa.EstadoChoices.APROBADA)

    def test_omitir_etapa_obligatoria_por_api_conserva_regla_de_negocio(self):
        seguimiento = WorkflowService.inicializar_flujo(self.postulacion, self.admin)[0]
        self.authenticate(self.admin)

        response = self.client.post(
            f"/api/v1/seguimientos-etapa/{seguimiento.id}/omitir/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("No se pueden omitir etapas obligatorias.", str(response.data))
        seguimiento.refresh_from_db()
        self.assertEqual(seguimiento.estado, SeguimientoEtapa.EstadoChoices.PENDIENTE)

    def test_usuario_no_staff_recibe_403_en_acciones_de_seguimiento(self):
        seguimiento = WorkflowService.inicializar_flujo(self.postulacion, self.admin)[0]
        self.authenticate(self.student)

        for action in ("aprobar", "rechazar", "omitir"):
            with self.subTest(action=action):
                response = self.client.post(
                    f"/api/v1/seguimientos-etapa/{seguimiento.id}/{action}/",
                    {},
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

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
