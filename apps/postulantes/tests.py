"""Pruebas de API para el módulo de postulaciones usando APITestCase."""

from django.contrib.auth import get_user_model
from concurrent.futures import ThreadPoolExecutor

from django.core.exceptions import ValidationError
from django.db import IntegrityError, close_old_connections, transaction
from django.test import TransactionTestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, TipoDocumento
from apps.modalidades.policies import ModalidadPolicyRegistry
from apps.postulantes.models import (
    AsignacionPostulacion,
    EstadoPostulacion,
    EventoDefensa,
    HistorialEstado,
    Observacion,
    Postulacion,
    SeguimientoEtapa,
)
from apps.postulantes.services import PostulacionService
from apps.postulantes.workflow import WorkflowService
from apps.usuarios.models import AuditLog, Role


User = get_user_model()


def canonical_role(code):
    return Role.objects.get_or_create(codigo=code, defaults={"nombre": code.title()})[0]


class TestCrearPostulacion(APITestCase):
    """Pruebas para la creación de postulaciones."""

    def setUp(self) -> None:
        """Prepara datos base para todas las pruebas."""
        self.estudiante = User.objects.create_user(
            username="estudiante_crear",
            password="segura123",
            nombres="Ana",
            apellido_paterno="Pérez",
            apellido_materno="Gómez",
            ci="1234567",
            ru="RU1234567",
            is_staff=True,
            role=canonical_role("ADMINISTRADOR"),
        )
        self.periodo = Periodo.objects.create(
            nombre="2025-I",
            gestion=2025,
            semestre="I",
            fecha_inicio="2025-01-01",
            fecha_fin="2025-06-30",
        )
        self.modalidad = Modalidad.objects.create(
            codigo="PROYECTO_GRADO",
            nombre="Proyecto de Grado",
        )
        for etapa in ModalidadPolicyRegistry.get(self.modalidad).get_etapas_configuradas():
            EtapaModalidad.objects.create(
                modalidad=self.modalidad,
                codigo=etapa.codigo,
                nombre=etapa.nombre,
                orden=etapa.orden,
                obligatoria=etapa.obligatoria,
                origen_normativo="Policy de Proyecto de Grado",
            )
        self.estado_registrada = EstadoPostulacion.objects.create(
            codigo="REGISTRADA",
            nombre="Registrada",
        )
        self.estado_concluida = EstadoPostulacion.objects.create(
            codigo="CONCLUIDA",
            nombre="Concluida",
        )
        self.estudiante_sin_admin = User.objects.create_user(
            username="estudiante_sin_admin",
            password="segura123",
            ci="7654321",
            ru="RU7654321",
        )

        token = RefreshToken.for_user(self.estudiante).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_crear_postulacion_exitoso_con_autenticacion(self) -> None:
        """Debe crear una postulación mediante API con JWT."""
        response = self.client.post(
            "/api/v1/postulaciones/",
            {
                "codigo": "POST-001",
                "estudiante": self.estudiante.id,
                "modalidad": self.modalidad.id,
                "periodo": self.periodo.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["codigo"], "POST-001")
        self.assertEqual(response.data["vigencia"], Postulacion.VigenciaChoices.VIGENTE)
        self.assertEqual(response.data["tipo_registro"], Postulacion.TipoRegistroChoices.SEGUIMIENTO)

    def test_crear_historico_por_via_administrativa_no_inicializa_workflow(self) -> None:
        response = self.client.post(
            "/api/v1/postulaciones/historicas/",
            {
                "codigo": "HIST-2022-001",
                "estudiante": self.estudiante_sin_admin.id,
                "modalidad": self.modalidad.id,
                "periodo": self.periodo.id,
                "observaciones_generales": "Proceso concluido en 2022.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        historico = Postulacion.objects.get(pk=response.data["id"])
        self.assertEqual(historico.tipo_registro, Postulacion.TipoRegistroChoices.HISTORICO)
        self.assertEqual(historico.vigencia, Postulacion.VigenciaChoices.CERRADA)
        self.assertEqual(historico.estado_actual, self.estado_concluida)
        self.assertFalse(SeguimientoEtapa.objects.filter(postulacion=historico).exists())
        self.assertTrue(AuditLog.objects.filter(accion="crear_postulacion_historica", modulo="postulaciones").exists())
        self.assertTrue(HistorialEstado.objects.filter(postulacion=historico, estado_nuevo=self.estado_concluida).exists())

    def test_estudiante_no_puede_crear_historico(self) -> None:
        token = RefreshToken.for_user(self.estudiante_sin_admin).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.client.post(
            "/api/v1/postulaciones/historicas/",
            {
                "codigo": "HIST-2022-002",
                "estudiante": self.estudiante_sin_admin.id,
                "modalidad": self.modalidad.id,
                "periodo": self.periodo.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_tipo_registro_es_inmutable_en_patch(self) -> None:
        response = self.client.post(
            "/api/v1/postulaciones/",
            {
                "codigo": "POST-INMUTABLE-TIPO",
                "estudiante": self.estudiante_sin_admin.id,
                "modalidad": self.modalidad.id,
                "periodo": self.periodo.id,
            },
            format="json",
        )
        postulacion_id = response.data["id"]

        response = self.client.patch(
            f"/api/v1/postulaciones/{postulacion_id}/",
            {"tipo_registro": Postulacion.TipoRegistroChoices.HISTORICO},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Postulacion.objects.get(pk=postulacion_id).tipo_registro, Postulacion.TipoRegistroChoices.SEGUIMIENTO)

    def test_historico_cerrado_y_postulacion_actual_vigente_coexisten(self) -> None:
        historico = Postulacion.objects.create(
            codigo="HIST-2022-003",
            estudiante=self.estudiante_sin_admin,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_concluida,
            vigencia=Postulacion.VigenciaChoices.CERRADA,
            tipo_registro=Postulacion.TipoRegistroChoices.HISTORICO,
        )
        actual = PostulacionService.crear_postulacion({
            "codigo": "POST-2026-003",
            "estudiante": self.estudiante_sin_admin,
            "modalidad": self.modalidad,
            "periodo": self.periodo,
            "usuario": self.estudiante,
        })

        self.assertEqual(historico.vigencia, Postulacion.VigenciaChoices.CERRADA)
        self.assertEqual(actual.vigencia, Postulacion.VigenciaChoices.VIGENTE)

    def test_workflow_rechaza_postulacion_historica(self) -> None:
        historico = Postulacion.objects.create(
            codigo="HIST-2022-004",
            estudiante=self.estudiante_sin_admin,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_concluida,
            vigencia=Postulacion.VigenciaChoices.CERRADA,
            tipo_registro=Postulacion.TipoRegistroChoices.HISTORICO,
        )

        with self.assertRaises(ValidationError):
            WorkflowService.inicializar_flujo(historico, self.estudiante)

    def test_vigencia_read_only_en_post(self) -> None:
        """POST no debe aceptar una vigencia distinta de la inicial."""
        response = self.client.post(
            "/api/v1/postulaciones/",
            {
                "codigo": "POST-READONLY-VIGENCIA",
                "estudiante": self.estudiante.id,
                "modalidad": self.modalidad.id,
                "periodo": self.periodo.id,
                "vigencia": Postulacion.VigenciaChoices.DADA_DE_BAJA,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["vigencia"], Postulacion.VigenciaChoices.VIGENTE)

    def test_tipo_historico_no_se_acepta_en_endpoint_normal(self) -> None:
        response = self.client.post(
            "/api/v1/postulaciones/",
            {
                "codigo": "POST-TIPO-READONLY",
                "estudiante": self.estudiante_sin_admin.id,
                "modalidad": self.modalidad.id,
                "periodo": self.periodo.id,
                "tipo_registro": Postulacion.TipoRegistroChoices.HISTORICO,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["tipo_registro"], Postulacion.TipoRegistroChoices.SEGUIMIENTO)

    def test_estado_inicial_es_registrada(self) -> None:
        """El estado_actual debe ser REGISTRADA al crear."""
        response = self.client.post(
            "/api/v1/postulaciones/",
            {
                "codigo": "POST-002",
                "estudiante": self.estudiante.id,
                "modalidad": self.modalidad.id,
                "periodo": self.periodo.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["estado_actual"], self.estado_registrada.id)

    def test_crear_historial_automaticamente(self) -> None:
        """Debe crear un registro de HistorialEstado automáticamente."""
        self.client.post(
            "/api/v1/postulaciones/",
            {
                "codigo": "POST-003",
                "estudiante": self.estudiante.id,
                "modalidad": self.modalidad.id,
                "periodo": self.periodo.id,
            },
            format="json",
        )

        self.assertTrue(
            HistorialEstado.objects.filter(postulacion__codigo="POST-003").exists()
        )
        historial = HistorialEstado.objects.get(postulacion__codigo="POST-003")
        self.assertIsNone(historial.estado_anterior)
        self.assertEqual(historial.estado_nuevo, self.estado_registrada)

    def test_crear_auditlog_automaticamente(self) -> None:
        """Debe crear un registro de AuditLog automáticamente."""
        self.client.post(
            "/api/v1/postulaciones/",
            {
                "codigo": "POST-004",
                "estudiante": self.estudiante.id,
                "modalidad": self.modalidad.id,
                "periodo": self.periodo.id,
            },
            format="json",
        )

        self.assertTrue(
            AuditLog.objects.filter(
                accion="crear_postulacion", modulo="postulaciones"
            ).exists()
        )

    def test_rechaza_modalidad_sin_soporte_sin_afectar_catalogo(self) -> None:
        modalidad_no_soportada = Modalidad.objects.create(
            codigo="EXAMEN_GRADO",
            nombre="Examen de Grado",
        )

        response = self.client.post(
            "/api/v1/postulaciones/",
            {
                "codigo": "POST-NO-SOPORTADA",
                "estudiante": self.estudiante.id,
                "modalidad": modalidad_no_soportada.id,
                "periodo": self.periodo.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("modalidad", response.data)
        self.assertFalse(Postulacion.objects.filter(codigo="POST-NO-SOPORTADA").exists())
        self.assertTrue(Modalidad.objects.filter(pk=modalidad_no_soportada.pk).exists())


class TestBusquedaPostulacion(APITestCase):
    """Pruebas de los campos visibles usados para buscar postulaciones."""

    def setUp(self) -> None:
        self.estudiante = User.objects.create_user(
            username="ana.quispe",
            password="segura123",
            nombres="Ana Maria",
            apellido_paterno="Quispe",
            apellido_materno="Mamani",
            ci="9900001",
            ru="20260001",
            role=canonical_role("ESTUDIANTE"),
        )
        self.admin = User.objects.create_user(
            username="admin_busqueda",
            password="segura123",
            is_staff=True,
            role=canonical_role("ADMINISTRADOR"),
        )
        periodo = Periodo.objects.create(
            nombre="2026-II",
            gestion=2026,
            semestre="II",
            fecha_inicio="2026-07-01",
            fecha_fin="2026-12-31",
        )
        modalidad = Modalidad.objects.create(
            codigo="EXAMEN_GRADO",
            nombre="Examen de Grado",
        )
        estado_registrada = EstadoPostulacion.objects.create(
            codigo="REGISTRADA",
            nombre="Registrada",
        )
        self.postulacion = Postulacion.objects.create(
            codigo="POST-2026-001",
            estudiante=self.estudiante,
            modalidad=modalidad,
            periodo=periodo,
            estado_actual=estado_registrada,
        )
        token = RefreshToken.for_user(self.admin).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_busca_por_datos_visibles_del_estudiante_y_codigo(self) -> None:
        consultas = (
            "POST-2026-001",
            "ana.quispe",
            "20260001",
            "9900001",
            "Ana",
            "Quispe",
            "Mamani",
        )

        for consulta in consultas:
            with self.subTest(consulta=consulta):
                response = self.client.get(
                    "/api/v1/postulaciones/", {"search": consulta}
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response.data["count"], 1)
                self.assertEqual(
                    response.data["results"][0]["id"], self.postulacion.id
                )


class TestCambioEstado(APITestCase):
    """Pruebas para el cambio de estado de postulaciones."""

    def setUp(self) -> None:
        """Prepara datos base para todas las pruebas."""
        self.estudiante = User.objects.create_user(
            username="estudiante_cambio",
            password="segura123",
            nombres="Luis",
            apellido_paterno="Mendoza",
            apellido_materno="Rojas",
            ci="7654321",
            ru="RU7654321",
            is_staff=True,
            role=canonical_role("ADMINISTRADOR"),
        )
        self.periodo = Periodo.objects.create(
            nombre="2025-II",
            gestion=2025,
            semestre="II",
            fecha_inicio="2025-07-01",
            fecha_fin="2025-12-31",
        )
        self.modalidad = Modalidad.objects.create(
            codigo="MGR2",
            nombre="Modalidad 2",
        )
        self.estado_registrada = EstadoPostulacion.objects.create(
            codigo="REGISTRADA",
            nombre="Registrada",
        )
        self.estado_revision = EstadoPostulacion.objects.create(
            codigo="REVISION",
            nombre="En revisión",
        )
        self.postulacion = Postulacion.objects.create(
            codigo="POST-005",
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )

        token = RefreshToken.for_user(self.estudiante).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_cambio_de_estado_exitoso(self) -> None:
        """Debe cambiar el estado_actual correctamente."""
        response = self.client.patch(
            f"/api/v1/postulaciones/{self.postulacion.id}/",
            {"estado_actual": self.estado_revision.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.postulacion.refresh_from_db()
        self.assertEqual(self.postulacion.estado_actual, self.estado_revision)

    def test_crear_historial_al_cambiar_estado(self) -> None:
        """Debe crear un registro en HistorialEstado al cambiar."""
        self.client.patch(
            f"/api/v1/postulaciones/{self.postulacion.id}/",
            {"estado_actual": self.estado_revision.id},
            format="json",
        )

        historial = HistorialEstado.objects.filter(postulacion=self.postulacion).last()
        self.assertIsNotNone(historial)
        self.assertEqual(historial.estado_anterior, self.estado_registrada)
        self.assertEqual(historial.estado_nuevo, self.estado_revision)

    def test_crear_auditlog_al_cambiar_estado(self) -> None:
        """Debe crear un registro en AuditLog al cambiar."""
        self.client.patch(
            f"/api/v1/postulaciones/{self.postulacion.id}/",
            {"estado_actual": self.estado_revision.id},
            format="json",
        )

        self.assertTrue(
            AuditLog.objects.filter(
                accion="cambiar_estado", modulo="postulaciones"
            ).exists()
        )


class TestObservaciones(APITestCase):
    """Pruebas para la creación de observaciones."""

    def setUp(self) -> None:
        """Prepara datos base para todas las pruebas."""
        self.estudiante = User.objects.create_user(
            username="estudiante_observacion",
            password="segura123",
            nombres="Marta",
            apellido_paterno="López",
            apellido_materno="Vega",
            ci="1122334",
            ru="RU1122334",
            is_staff=True,
            role=canonical_role("ADMINISTRADOR"),
        )
        self.periodo = Periodo.objects.create(
            nombre="2026-I",
            gestion=2026,
            semestre="I",
            fecha_inicio="2026-01-01",
            fecha_fin="2026-06-30",
        )
        self.modalidad = Modalidad.objects.create(
            codigo="MGR3",
            nombre="Modalidad 3",
        )
        self.estado_registrada = EstadoPostulacion.objects.create(
            codigo="REGISTRADA",
            nombre="Registrada",
        )
        self.postulacion = Postulacion.objects.create(
            codigo="POST-006",
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )

        token = RefreshToken.for_user(self.estudiante).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_crear_observacion_exitosa(self) -> None:
        """Debe crear una observación correctamente."""
        response = self.client.post(
            "/api/v1/postulaciones/observaciones/",
            {
                "postulacion": self.postulacion.id,
                "usuario": self.estudiante.id,
                "comentario": "Falta documentación",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["comentario"], "Falta documentación")

    def test_observacion_leida_estudiante_false(self) -> None:
        """La observación debe crearse con leida_estudiante=False."""
        self.client.post(
            "/api/v1/postulaciones/observaciones/",
            {
                "postulacion": self.postulacion.id,
                "usuario": self.estudiante.id,
                "comentario": "Comentario de prueba",
            },
            format="json",
        )

        observacion = Observacion.objects.latest("id")
        self.assertFalse(observacion.leida_estudiante)

    def test_observacion_no_cambia_estado(self) -> None:
        """La creación de observación no debe cambiar estado_actual."""
        estado_original = self.postulacion.estado_actual

        self.client.post(
            "/api/v1/postulaciones/observaciones/",
            {
                "postulacion": self.postulacion.id,
                "usuario": self.estudiante.id,
                "comentario": "Prueba",
            },
            format="json",
        )

        self.postulacion.refresh_from_db()
        self.assertEqual(self.postulacion.estado_actual, estado_original)

    def test_crear_auditlog_en_observacion(self) -> None:
        """Debe crear un registro de AuditLog al agregar observación."""
        self.client.post(
            "/api/v1/postulaciones/observaciones/",
            {
                "postulacion": self.postulacion.id,
                "usuario": self.estudiante.id,
                "comentario": "Prueba",
            },
            format="json",
        )

        self.assertTrue(AuditLog.objects.filter(accion="CREAR", modulo="POSTULACIONES").exists())


class TestErrores(APITestCase):
    """Pruebas para validaciones y casos de error."""

    def setUp(self) -> None:
        """Prepara datos base para todas las pruebas."""
        self.estudiante = User.objects.create_user(
            username="estudiante_errores",
            password="segura123",
            nombres="Pedro",
            apellido_paterno="García",
            apellido_materno="Ruiz",
            ci="5555555",
            ru="RU5555555",
            is_staff=True,
            role=canonical_role("ADMINISTRADOR"),
        )
        self.periodo = Periodo.objects.create(
            nombre="2026-II",
            gestion=2026,
            semestre="II",
            fecha_inicio="2026-07-01",
            fecha_fin="2026-12-31",
        )
        self.modalidad = Modalidad.objects.create(
            codigo="MGR4",
            nombre="Modalidad 4",
        )
        self.estado_registrada = EstadoPostulacion.objects.create(
            codigo="REGISTRADA",
            nombre="Registrada",
        )

        token = RefreshToken.for_user(self.estudiante).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_rechazar_postulacion_duplicada(self) -> None:
        """Debe rechazar una segunda postulación activa para la misma combinación."""
        Postulacion.objects.create(
            codigo="POST-007",
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )

        response = self.client.post(
            "/api/v1/postulaciones/",
            {
                "codigo": "POST-008",
                "estudiante": self.estudiante.id,
                "modalidad": self.modalidad.id,
                "periodo": self.periodo.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rechazar_modalidad_diferente_para_estudiante_vigente(self) -> None:
        """La vigencia debe impedir simultaneidad entre modalidades distintas."""
        Postulacion.objects.create(
            codigo="POST-MODALIDAD-01",
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )
        otra_modalidad = Modalidad.objects.create(codigo="OTRA_MODALIDAD", nombre="Otra modalidad")

        with self.assertRaisesMessage(ValidationError, "postulación vigente"):
            PostulacionService.crear_postulacion({
                "usuario": self.estudiante,
                "estudiante": self.estudiante,
                "modalidad": otra_modalidad,
                "periodo": self.periodo,
                "codigo": "POST-MODALIDAD-02",
            })

    def test_rechazar_periodo_diferente_para_estudiante_vigente(self) -> None:
        """La vigencia debe impedir simultaneidad aunque cambie el periodo."""
        Postulacion.objects.create(
            codigo="POST-PERIODO-01",
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )
        otro_periodo = Periodo.objects.create(
            nombre="2025-II", gestion=2025, semestre="II",
            fecha_inicio="2025-07-01", fecha_fin="2025-12-31",
        )

        with self.assertRaisesMessage(ValidationError, "postulación vigente"):
            PostulacionService.crear_postulacion({
                "usuario": self.estudiante,
                "estudiante": self.estudiante,
                "modalidad": self.modalidad,
                "periodo": otro_periodo,
                "codigo": "POST-PERIODO-02",
            })

    def test_concluida_sigue_visible_historicamente(self) -> None:
        """Una postulación concluida debe continuar consultable por la API."""
        postulacion = Postulacion.objects.create(
            codigo="POST-CONCLUIDA",
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=EstadoPostulacion.objects.create(codigo="CONCLUIDA", nombre="Concluida"),
        )
        response = self.client.get(f"/api/v1/postulaciones/{postulacion.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["estado_actual_detalle"]["codigo"], "CONCLUIDA")

    def test_concluida_vigente_bloquea_nueva_postulacion(self) -> None:
        """CONCLUIDA no cambia la vigencia por sí sola y sigue bloqueando."""
        Postulacion.objects.create(
            codigo="POST-CONCLUIDA-VIGENTE",
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=EstadoPostulacion.objects.create(codigo="CONCLUIDA_V", nombre="Concluida vigente"),
        )

        with self.assertRaisesMessage(ValidationError, "postulación vigente"):
            PostulacionService.crear_postulacion({
                "usuario": self.estudiante,
                "estudiante": self.estudiante,
                "modalidad": self.modalidad,
                "periodo": self.periodo,
                "codigo": "POST-CONCLUIDA-NUEVA",
            })

    def test_vigencias_no_vigentes_no_bloquean_nueva_postulacion(self) -> None:
        """Los estados de inscripción no vigentes liberan la creación."""
        for index, vigencia in enumerate((
            Postulacion.VigenciaChoices.DADA_DE_BAJA,
            Postulacion.VigenciaChoices.CANCELADA,
            Postulacion.VigenciaChoices.CERRADA,
        ), start=1):
            Postulacion.objects.create(
                codigo=f"POST-NO-VIGENTE-{index}",
                estudiante=self.estudiante,
                modalidad=self.modalidad,
                periodo=self.periodo,
                estado_actual=self.estado_registrada,
                vigencia=vigencia,
            )

        nueva = PostulacionService.crear_postulacion({
            "usuario": self.estudiante,
            "estudiante": self.estudiante,
            "modalidad": self.modalidad,
            "periodo": self.periodo,
            "codigo": "POST-VIGENTE-DESPUES",
        })

        self.assertEqual(nueva.vigencia, Postulacion.VigenciaChoices.VIGENTE)

    def test_activo_y_vigencia_son_independientes(self) -> None:
        """La vigencia no deriva automáticamente del flag técnico activo."""
        postulacion = Postulacion.objects.create(
            codigo="POST-INDEPENDENCIA",
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
            activo=False,
            vigencia=Postulacion.VigenciaChoices.VIGENTE,
        )

        self.assertFalse(postulacion.activo)
        self.assertEqual(postulacion.vigencia, Postulacion.VigenciaChoices.VIGENTE)

    def test_patch_estudiante_no_debe_modificarlo(self) -> None:
        """La identidad estructural de una postulación debe ser inmutable."""
        otro_estudiante = User.objects.create_user(username="otro_estudiante", role=canonical_role("ESTUDIANTE"))
        postulacion = Postulacion.objects.create(
            codigo="POST-INMUTABLE-EST",
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )
        response = self.client.patch(f"/api/v1/postulaciones/{postulacion.id}/", {"estudiante": otro_estudiante.id}, format="json")

        postulacion.refresh_from_db()
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(postulacion.estudiante_id, self.estudiante.id)

    def test_patch_modalidad_no_debe_modificarla(self) -> None:
        """La modalidad estructural de una postulación debe ser inmutable."""
        otra_modalidad = Modalidad.objects.create(codigo="MODALIDAD_INMUTABLE", nombre="Modalidad inmutable")
        postulacion = Postulacion.objects.create(
            codigo="POST-INMUTABLE-MOD",
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )
        response = self.client.patch(f"/api/v1/postulaciones/{postulacion.id}/", {"modalidad": otra_modalidad.id}, format="json")

        postulacion.refresh_from_db()
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(postulacion.modalidad_id, self.modalidad.id)

    def test_patch_periodo_no_debe_modificarlo(self) -> None:
        """El periodo estructural de una postulación debe ser inmutable."""
        otro_periodo = Periodo.objects.create(
            nombre="2025-II", gestion=2025, semestre="II",
            fecha_inicio="2025-07-01", fecha_fin="2025-12-31",
        )
        postulacion = Postulacion.objects.create(
            codigo="POST-INMUTABLE-PER",
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )
        response = self.client.patch(f"/api/v1/postulaciones/{postulacion.id}/", {"periodo": otro_periodo.id}, format="json")

        postulacion.refresh_from_db()
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(postulacion.periodo_id, self.periodo.id)

    def test_delete_no_debe_eliminar_fisicamente_la_postulacion(self) -> None:
        """La API normal debe conservar la postulación y su trazabilidad."""
        postulacion = Postulacion.objects.create(
            codigo="POST-NO-DELETE",
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )
        response = self.client.delete(f"/api/v1/postulaciones/{postulacion.id}/")

        self.assertNotEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertTrue(Postulacion.all_objects.filter(pk=postulacion.id).exists())

    def test_rechazar_cambio_al_mismo_estado(self) -> None:
        """Debe rechazar cambio de estado al mismo valor."""
        postulacion = Postulacion.objects.create(
            codigo="POST-009",
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )

        response = self.client.patch(
            f"/api/v1/postulaciones/{postulacion.id}/",
            {"estado_actual": self.estado_registrada.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rechazar_observacion_comentario_vacio(self) -> None:
        """Debe rechazar observación con comentario vacío."""
        postulacion = Postulacion.objects.create(
            codigo="POST-010",
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )

        response = self.client.post(
            "/api/v1/postulaciones/observaciones/",
            {
                "postulacion": postulacion.id,
                "usuario": self.estudiante.id,
                "comentario": "   ",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Observacion.objects.count(), 0)

    def test_rechazar_observacion_sin_comentario(self) -> None:
        """Debe rechazar observación sin comentario."""
        postulacion = Postulacion.objects.create(
            codigo="POST-011",
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )

        response = self.client.post(
            "/api/v1/postulaciones/observaciones/",
            {"postulacion": postulacion.id, "usuario": self.estudiante.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_baja_exige_motivo_usuario_y_fecha(self) -> None:
        """La baja debe exigir todos sus metadatos de trazabilidad."""
        postulacion = Postulacion.objects.create(
            codigo="POST-BAJA-REQUISITOS",
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )

        for datos_incompletos in (
            {"baja_por": self.estudiante, "fecha_baja": "2026-09-16T01:00:00Z"},
            {"motivo_baja": "Cambio de modalidad", "fecha_baja": "2026-09-16T01:00:00Z"},
            {"motivo_baja": "Cambio de modalidad", "baja_por": self.estudiante},
        ):
            with self.subTest(datos=datos_incompletos):
                with self.assertRaises(ValidationError):
                    PostulacionService.dar_de_baja({
                        "postulacion": postulacion,
                        **datos_incompletos,
                    })

    def test_baja_valida_cambia_solo_vigencia_y_registra_trazabilidad(self) -> None:
        """Una baja válida debe cambiar vigencia y guardar sus metadatos."""
        postulacion = Postulacion.objects.create(
            codigo="POST-BAJA-VALIDA",
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )
        valores_originales = {
            "estudiante_id": postulacion.estudiante_id,
            "modalidad_id": postulacion.modalidad_id,
            "periodo_id": postulacion.periodo_id,
            "estado_actual_id": postulacion.estado_actual_id,
            "activo": postulacion.activo,
        }
        HistorialEstado.objects.create(
            postulacion=postulacion,
            estado_nuevo=self.estado_registrada,
            usuario=self.estudiante,
            comentario="Historial previo a la baja.",
        )
        etapa = EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo="ETAPA-BAJA",
            nombre="Etapa de baja",
            orden=1,
            origen_normativo="Prueba RED",
        )
        seguimiento = SeguimientoEtapa.objects.create(
            postulacion=postulacion,
            etapa=etapa,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
        )
        tipo_documento = TipoDocumento.objects.create(
            codigo="DOC-BAJA",
            nombre="Documento de baja",
        )
        estado_documento = EstadoDocumento.objects.create(
            codigo="PEN",
            nombre="Pendiente",
        )
        DocumentoPostulacion.objects.create(
            postulacion=postulacion,
            tipo_documento=tipo_documento,
            estado=estado_documento,
        )
        AsignacionPostulacion.objects.create(
            postulacion=postulacion,
            usuario=self.estudiante,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
            seguimiento_etapa=seguimiento,
        )
        EventoDefensa.objects.bulk_create([
            EventoDefensa(
                postulacion=postulacion,
                seguimiento_etapa=seguimiento,
                tipo_evento=EventoDefensa.Tipo.DEFENSA_PRIVADA,
                fecha_programada="2026-09-20T01:00:00Z",
                programado_por=self.estudiante,
            ),
        ])
        relacionados_antes = {
            "historial": HistorialEstado.objects.filter(postulacion=postulacion).count(),
            "etapas": SeguimientoEtapa.objects.filter(postulacion=postulacion).count(),
            "documentos": DocumentoPostulacion.objects.filter(postulacion=postulacion).count(),
            "asignaciones": AsignacionPostulacion.objects.filter(postulacion=postulacion).count(),
            "eventos": EventoDefensa.objects.filter(postulacion=postulacion).count(),
        }

        PostulacionService.dar_de_baja({
            "postulacion": postulacion,
            "motivo_baja": "Cambio de modalidad autorizado",
            "baja_por": self.estudiante,
            "fecha_baja": "2026-09-16T01:00:00Z",
        })

        postulacion.refresh_from_db()
        self.assertEqual(postulacion.vigencia, Postulacion.VigenciaChoices.DADA_DE_BAJA)
        self.assertEqual(postulacion.motivo_baja, "Cambio de modalidad autorizado")
        self.assertEqual(postulacion.baja_por_id, self.estudiante.id)
        self.assertIsNotNone(postulacion.fecha_baja)
        self.assertEqual(
            {campo: getattr(postulacion, campo) for campo in valores_originales},
            valores_originales,
        )
        self.assertTrue(HistorialEstado.objects.filter(postulacion=postulacion).exists())
        self.assertEqual(
            {
                "historial": HistorialEstado.objects.filter(postulacion=postulacion).count(),
                "etapas": SeguimientoEtapa.objects.filter(postulacion=postulacion).count(),
                "documentos": DocumentoPostulacion.objects.filter(postulacion=postulacion).count(),
                "asignaciones": AsignacionPostulacion.objects.filter(postulacion=postulacion).count(),
                "eventos": EventoDefensa.objects.filter(postulacion=postulacion).count(),
            },
            relacionados_antes,
        )
        self.assertTrue(AuditLog.objects.filter(
            accion="dar_de_baja",
            modulo="postulaciones",
            descripcion__icontains=postulacion.codigo,
        ).exists())

    def test_baja_repetida_es_error_de_dominio_explicito(self) -> None:
        """Una postulación dada de baja no debe aceptar una segunda baja silenciosa."""
        postulacion = Postulacion.objects.create(
            codigo="POST-BAJA-REPETIDA",
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
            vigencia=Postulacion.VigenciaChoices.DADA_DE_BAJA,
        )

        with self.assertRaises(ValidationError):
            PostulacionService.dar_de_baja({
                "postulacion": postulacion,
                "motivo_baja": "Segundo intento",
                "baja_por": self.estudiante,
                "fecha_baja": "2026-09-16T01:00:00Z",
            })

    def test_vigencia_es_read_only_en_patch_y_put(self) -> None:
        """PATCH y PUT normales no deben permitir cambiar vigencia."""
        postulacion = Postulacion.objects.create(
            codigo="POST-BAJA-READONLY",
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )

        patch_response = self.client.patch(
            f"/api/v1/postulaciones/{postulacion.id}/",
            {"vigencia": Postulacion.VigenciaChoices.DADA_DE_BAJA},
            format="json",
        )
        put_response = self.client.put(
            f"/api/v1/postulaciones/{postulacion.id}/",
            {
                "codigo": postulacion.codigo,
                "estudiante": postulacion.estudiante_id,
                "modalidad": postulacion.modalidad_id,
                "periodo": postulacion.periodo_id,
                "estado_actual": postulacion.estado_actual_id,
                "vigencia": Postulacion.VigenciaChoices.DADA_DE_BAJA,
            },
            format="json",
        )

        self.assertIn(patch_response.status_code, (status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST))
        self.assertIn(
            put_response.status_code,
            (status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST, status.HTTP_405_METHOD_NOT_ALLOWED),
        )
        postulacion.refresh_from_db()
        self.assertEqual(postulacion.vigencia, Postulacion.VigenciaChoices.VIGENTE)


class TestVigenciaConstraint(TransactionTestCase):
    """RED de exclusividad persistida y carrera de creación."""

    reset_sequences = True

    def setUp(self) -> None:
        self.estudiante = User.objects.create_user(
            username="estudiante_constraint",
            password="segura123",
            ci="8888888",
            ru="RU8888888",
        )
        self.periodo = Periodo.objects.create(
            nombre="2027-I",
            gestion=2027,
            semestre="I",
            fecha_inicio="2027-01-01",
            fecha_fin="2027-06-30",
        )
        self.modalidad = Modalidad.objects.create(codigo="CONSTRAINT", nombre="Constraint")
        self.estado = EstadoPostulacion.objects.create(codigo="REGISTRADA", nombre="Registrada")

    def _postulacion(self, codigo: str, vigencia: str = Postulacion.VigenciaChoices.VIGENTE) -> Postulacion:
        return Postulacion.objects.create(
            codigo=codigo,
            estudiante=self.estudiante,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado,
            vigencia=vigencia,
        )

    def test_dos_vigentes_del_mismo_estudiante_son_invalidas(self) -> None:
        """La base debe rechazar dos postulaciones VIGENTE del mismo estudiante."""
        self._postulacion("CONSTRAINT-VIGENTE-1")

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self._postulacion("CONSTRAINT-VIGENTE-2")

    def test_vigente_y_no_vigentes_son_validas(self) -> None:
        """Una VIGENTE puede coexistir con DADA_DE_BAJA, CANCELADA y CERRADA."""
        self._postulacion("CONSTRAINT-BAJA", Postulacion.VigenciaChoices.DADA_DE_BAJA)
        self._postulacion("CONSTRAINT-CANCELADA", Postulacion.VigenciaChoices.CANCELADA)
        self._postulacion("CONSTRAINT-CERRADA", Postulacion.VigenciaChoices.CERRADA)
        vigente = self._postulacion("CONSTRAINT-VIGENTE")

        self.assertEqual(vigente.vigencia, Postulacion.VigenciaChoices.VIGENTE)
        self.assertEqual(Postulacion.all_objects.filter(estudiante=self.estudiante).count(), 4)

    def test_creacion_concurrente_no_debe_crear_dos_vigentes(self) -> None:
        """La garantía transaccional debe resolver una carrera real de creación."""
        from apps.usuarios.models import CustomUser

        def crear(codigo: str) -> str:
            close_old_connections()
            try:
                usuario = CustomUser.objects.get(pk=self.estudiante.pk)
                PostulacionService.crear_postulacion({
                    "usuario": usuario,
                    "estudiante": usuario,
                    "modalidad": self.modalidad,
                    "periodo": self.periodo,
                    "codigo": codigo,
                })
                return "creada"
            except ValidationError as exc:
                self.assertEqual(
                    exc.messages,
                    ["El estudiante ya tiene una postulación vigente."],
                )
                return "rechazada"
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            resultados = list(executor.map(crear, ("CONCURRENTE-1", "CONCURRENTE-2")))

        self.assertEqual(resultados.count("creada"), 1)
        self.assertEqual(
            Postulacion.vigentes().filter(estudiante=self.estudiante).count(),
            1,
        )


class TestSeguridadPropietario(APITestCase):
    """Pruebas de acceso por propietario para postulaciones y registros relacionados."""

    def setUp(self) -> None:
        self.owner = User.objects.create_user(
            username="owner_postulacion",
            password="segura123",
            ci="7777771",
            ru="RU7777771",
            role=canonical_role("ESTUDIANTE"),
        )
        self.other_student = User.objects.create_user(
            username="other_postulacion",
            password="segura123",
            ci="7777772",
            ru="RU7777772",
            role=canonical_role("ESTUDIANTE"),
        )
        self.admin = User.objects.create_user(
            username="admin_postulacion",
            password="segura123",
            ci="7777773",
            ru="RU7777773",
            is_staff=True,
            is_superuser=True,
            role=canonical_role("ADMINISTRADOR"),
        )
        self.periodo = Periodo.objects.create(
            nombre="2027-I",
            gestion=2027,
            semestre="I",
            fecha_inicio="2027-01-01",
            fecha_fin="2027-06-30",
        )
        self.modalidad = Modalidad.objects.create(
            codigo="MGR5",
            nombre="Modalidad 5",
        )
        self.estado_registrada = EstadoPostulacion.objects.create(
            codigo="REGISTRADA",
            nombre="Registrada",
        )
        self.estado_revision = EstadoPostulacion.objects.create(
            codigo="REVISION",
            nombre="En revisión",
        )
        self.owner_postulacion = Postulacion.objects.create(
            codigo="POST-012",
            estudiante=self.owner,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )
        self.other_postulacion = Postulacion.objects.create(
            codigo="POST-013",
            estudiante=self.other_student,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )
        self.owner_historial = HistorialEstado.objects.create(
            postulacion=self.owner_postulacion,
            estado_anterior=self.estado_registrada,
            estado_nuevo=self.estado_revision,
            usuario=self.owner,
            comentario="Cambio del propietario",
        )
        self.other_historial = HistorialEstado.objects.create(
            postulacion=self.other_postulacion,
            estado_anterior=self.estado_registrada,
            estado_nuevo=self.estado_revision,
            usuario=self.other_student,
            comentario="Cambio ajeno",
        )
        self.owner_observacion = Observacion.objects.create(
            postulacion=self.owner_postulacion,
            usuario=self.owner,
            comentario="Observación propia",
        )
        self.other_observacion = Observacion.objects.create(
            postulacion=self.other_postulacion,
            usuario=self.other_student,
            comentario="Observación ajena",
        )

    def authenticate(self, user) -> None:
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_propietario_ve_solo_su_postulacion(self) -> None:
        self.authenticate(self.owner)

        response = self.client.get("/api/v1/postulaciones/", format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.owner_postulacion.id)

    def test_propietario_puede_recuperar_su_historial(self) -> None:
        self.authenticate(self.owner)

        response = self.client.get(
            f"/api/v1/postulaciones/historial/{self.owner_historial.id}/",
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.owner_historial.id)

    def test_estudiante_ajeno_no_puede_actualizar_postulacion_por_id(self) -> None:
        self.authenticate(self.owner)

        response = self.client.patch(
            f"/api/v1/postulaciones/{self.other_postulacion.id}/",
            {"observaciones_generales": "Intento ajeno"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_estudiante_ajeno_no_puede_ver_historial_por_id(self) -> None:
        self.authenticate(self.owner)

        response = self.client.get(
            f"/api/v1/postulaciones/historial/{self.other_historial.id}/",
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_estudiante_ajeno_no_puede_eliminar_observacion_por_id(self) -> None:
        self.authenticate(self.owner)

        response = self.client.delete(
            f"/api/v1/postulaciones/observaciones/{self.other_observacion.id}/",
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_puede_ver_todas_las_postulaciones_y_observaciones(self) -> None:
        self.authenticate(self.admin)

        postulaciones = self.client.get("/api/v1/postulaciones/", format="json")
        observaciones = self.client.get("/api/v1/postulaciones/observaciones/", format="json")

        self.assertEqual(postulaciones.status_code, status.HTTP_200_OK)
        self.assertEqual(postulaciones.data["count"], 2)
        self.assertEqual(observaciones.status_code, status.HTTP_200_OK)
        self.assertEqual(observaciones.data["count"], 2)
