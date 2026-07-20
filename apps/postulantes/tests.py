"""Pruebas de API para el módulo de postulaciones usando APITestCase."""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.academico.models import Modalidad, Periodo
from apps.postulantes.models import EstadoPostulacion, HistorialEstado, Observacion, Postulacion
from apps.usuarios.models import AuditLog


User = get_user_model()


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
        )
        self.periodo = Periodo.objects.create(
            nombre="2025-I",
            gestion=2025,
            semestre="I",
            fecha_inicio="2025-01-01",
            fecha_fin="2025-06-30",
        )
        self.modalidad = Modalidad.objects.create(
            codigo="MGR",
            nombre="Modalidad de graduación",
        )
        self.estado_registrada = EstadoPostulacion.objects.create(
            codigo="REGISTRADA",
            nombre="Registrada",
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


class TestSeguridadPropietario(APITestCase):
    """Pruebas de acceso por propietario para postulaciones y registros relacionados."""

    def setUp(self) -> None:
        self.owner = User.objects.create_user(
            username="owner_postulacion",
            password="segura123",
            ci="7777771",
            ru="RU7777771",
        )
        self.other_student = User.objects.create_user(
            username="other_postulacion",
            password="segura123",
            ci="7777772",
            ru="RU7777772",
        )
        self.admin = User.objects.create_user(
            username="admin_postulacion",
            password="segura123",
            ci="7777773",
            ru="RU7777773",
            is_staff=True,
            is_superuser=True,
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
