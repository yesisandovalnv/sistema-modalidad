from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db.models import ProtectedError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.postulantes.asignaciones import AsignacionService
from apps.postulantes.models import AsignacionPostulacion, EstadoPostulacion, Postulacion, SeguimientoEtapa
from apps.usuarios.models import AuditLog, Role


User = get_user_model()


class AssignmentBaseMixin:
    def setUp(self) -> None:
        super().setUp()
        self.admin_role = Role.objects.create(codigo="ADMIN", nombre="Administrador")
        self.student_role = Role.objects.create(codigo="EST", nombre="Estudiante")
        self.docente_role = Role.objects.create(codigo="DOC", nombre="Docente")

        self.admin = User.objects.create_user(
            username="admin_asignaciones",
            password="segura123",
            ci="8100001",
            ru="RU8100001",
            role=self.admin_role,
            is_staff=True,
            is_superuser=True,
        )
        self.student = User.objects.create_user(
            username="student_asignaciones",
            password="segura123",
            ci="8100002",
            ru="RU8100002",
            role=self.student_role,
        )
        self.other_student = User.objects.create_user(
            username="student_other_asignaciones",
            password="segura123",
            ci="8100003",
            ru="RU8100003",
            role=self.student_role,
        )
        self.docente_1 = User.objects.create_user(
            username="docente_uno",
            password="segura123",
            ci="8100004",
            ru="RU8100004",
            role=self.docente_role,
        )
        self.docente_2 = User.objects.create_user(
            username="docente_dos",
            password="segura123",
            ci="8100005",
            ru="RU8100005",
            role=self.docente_role,
        )
        self.docente_3 = User.objects.create_user(
            username="docente_tres",
            password="segura123",
            ci="8100006",
            ru="RU8100006",
            role=self.docente_role,
        )
        self.docente_4 = User.objects.create_user(
            username="docente_cuatro",
            password="segura123",
            ci="8100007",
            ru="RU8100007",
            role=self.docente_role,
        )
        self.inactive_docente = User.objects.create_user(
            username="docente_inactivo",
            password="segura123",
            ci="8100008",
            ru="RU8100008",
            role=self.docente_role,
            is_active=False,
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
            nombre="2026-III",
            gestion=2026,
            semestre="II",
            fecha_inicio="2026-07-01",
            fecha_fin="2026-12-31",
        )
        self.estado_registrada = EstadoPostulacion.objects.create(codigo="REGISTRADA", nombre="Registrada")
        self.postulacion = Postulacion.objects.create(
            codigo="POST-ASIG-001",
            estudiante=self.student,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )
        self.other_postulacion = Postulacion.objects.create(
            codigo="POST-ASIG-002",
            estudiante=self.other_student,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
        )

        self.etapa_perfil = EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo="PERFIL_PROYECTO",
            nombre="Perfil de Proyecto",
            orden=1,
            origen_normativo="Capitulo III",
        )
        self.otro_etapa = EtapaModalidad.objects.create(
            modalidad=self.otra_modalidad,
            codigo="PERFIL_TD",
            nombre="Perfil TD",
            orden=1,
            origen_normativo="Otro reglamento",
        )
        self.seguimiento_perfil = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion,
            etapa=self.etapa_perfil,
            estado=SeguimientoEtapa.EstadoChoices.PENDIENTE,
        )
        self.seguimiento_ajeno = SeguimientoEtapa.objects.create(
            postulacion=self.other_postulacion,
            etapa=self.etapa_perfil,
            estado=SeguimientoEtapa.EstadoChoices.PENDIENTE,
        )


class AsignacionPostulacionModelTest(AssignmentBaseMixin, TestCase):
    """Pruebas del modelo AsignacionPostulacion."""

    def test_rechaza_fecha_final_anterior_a_designacion(self):
        asignacion = AsignacionPostulacion(
            postulacion=self.postulacion,
            usuario=self.docente_1,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
            fecha_designacion="2026-08-10T10:00:00Z",
            fecha_finalizacion="2026-08-09T10:00:00Z",
            designado_por=self.admin,
        )

        with self.assertRaises(ValidationError):
            asignacion.full_clean()

    def test_rechaza_orden_menor_a_uno(self):
        asignacion = AsignacionPostulacion(
            postulacion=self.postulacion,
            usuario=self.docente_1,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
            orden_cargo=0,
            designado_por=self.admin,
        )

        with self.assertRaises(ValidationError):
            asignacion.full_clean()

    def test_rechaza_seguimiento_ajeno(self):
        asignacion = AsignacionPostulacion(
            postulacion=self.postulacion,
            usuario=self.docente_1,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
            orden_cargo=1,
            designado_por=self.admin,
            seguimiento_etapa=self.seguimiento_ajeno,
        )

        with self.assertRaises(ValidationError):
            asignacion.full_clean()

    def test_impide_asignacion_activa_duplicada(self):
        AsignacionPostulacion.objects.create(
            postulacion=self.postulacion,
            usuario=self.docente_1,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
            orden_cargo=1,
                designado_por=self.admin,
                seguimiento_etapa=self.seguimiento_perfil,
            )

        with self.assertRaises(ValidationError):
            AsignacionPostulacion.objects.create(
                postulacion=self.postulacion,
                usuario=self.docente_1,
                tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
                orden_cargo=1,
                designado_por=self.admin,
                seguimiento_etapa=self.seguimiento_perfil,
            )

    def test_eliminacion_usuario_protegida(self):
        AsignacionPostulacion.objects.create(
            postulacion=self.postulacion,
            usuario=self.docente_1,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
            designado_por=self.admin,
        )

        with self.assertRaises(ProtectedError):
            self.docente_1.delete()

    def test_eliminacion_postulacion_hace_cascada(self):
        AsignacionPostulacion.objects.create(
            postulacion=self.postulacion,
            usuario=self.docente_1,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
            designado_por=self.admin,
        )

        self.postulacion.delete()

        self.assertEqual(AsignacionPostulacion.objects.count(), 0)


class AsignacionServiceTest(AssignmentBaseMixin, TestCase):
    """Pruebas del servicio de asignaciones."""

    def test_asignar_tutor_y_obtener_tutor_activo(self):
        asignacion = AsignacionService.asignar_actor(
            postulacion=self.postulacion,
            usuario_asignado=self.docente_1,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
            designado_por=self.admin,
            observaciones="Tutor inicial",
        )

        tutor_activo = AsignacionService.obtener_tutor_activo(self.postulacion)

        self.assertEqual(asignacion.usuario, self.docente_1)
        self.assertEqual(tutor_activo.pk, asignacion.pk)

    def test_impide_segundo_tutor_activo(self):
        AsignacionService.asignar_actor(
            postulacion=self.postulacion,
            usuario_asignado=self.docente_1,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
            designado_por=self.admin,
        )

        with self.assertRaisesMessage(ValidationError, "La postulación ya tiene un TUTOR activo."):
            AsignacionService.asignar_actor(
                postulacion=self.postulacion,
                usuario_asignado=self.docente_2,
                tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
                designado_por=self.admin,
            )

    def test_reemplazar_tutor_conserva_historial(self):
        actual = AsignacionService.asignar_actor(
            postulacion=self.postulacion,
            usuario_asignado=self.docente_1,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
            designado_por=self.admin,
        )

        nueva = AsignacionService.reemplazar_actor(
            asignacion_actual=actual,
            nuevo_usuario=self.docente_2,
            usuario_responsable=self.admin,
            observaciones="Cambio de tutor",
        )

        actual.refresh_from_db()
        self.assertFalse(actual.activo)
        self.assertIsNotNone(actual.fecha_finalizacion)
        self.assertTrue(nueva.activo)
        self.assertEqual(nueva.usuario, self.docente_2)
        self.assertEqual(AsignacionPostulacion.all_objects.filter(postulacion=self.postulacion).count(), 2)

    def test_tribunal_permite_hasta_tres_miembros_en_perfil(self):
        for orden, docente in enumerate((self.docente_1, self.docente_2, self.docente_3), start=1):
            AsignacionService.asignar_actor(
                postulacion=self.postulacion,
                usuario_asignado=docente,
                tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
                designado_por=self.admin,
                orden_cargo=orden,
                seguimiento_etapa=self.seguimiento_perfil,
            )

        activos = list(AsignacionService.obtener_tribunal_activo(self.postulacion, self.seguimiento_perfil))
        self.assertEqual(len(activos), 3)
        self.assertEqual([item.orden_cargo for item in activos], [1, 2, 3])

    def test_tribunal_bloquea_cuarto_miembro_en_perfil_pg(self):
        for orden, docente in enumerate((self.docente_1, self.docente_2, self.docente_3), start=1):
            AsignacionService.asignar_actor(
                postulacion=self.postulacion,
                usuario_asignado=docente,
                tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
                designado_por=self.admin,
                orden_cargo=orden,
                seguimiento_etapa=self.seguimiento_perfil,
            )

        with self.assertRaisesMessage(
            ValidationError,
            "Proyecto de Grado admite como máximo tres miembros activos de tribunal en el perfil.",
        ):
            AsignacionService.asignar_actor(
                postulacion=self.postulacion,
                usuario_asignado=self.docente_4,
                tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
                designado_por=self.admin,
                orden_cargo=4,
                seguimiento_etapa=self.seguimiento_perfil,
            )

    def test_tribunal_bloquea_orden_duplicado(self):
        AsignacionService.asignar_actor(
            postulacion=self.postulacion,
            usuario_asignado=self.docente_1,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
            designado_por=self.admin,
            orden_cargo=1,
            seguimiento_etapa=self.seguimiento_perfil,
        )

        with self.assertRaisesMessage(ValidationError, "Ya existe un miembro activo del tribunal con ese orden de cargo."):
            AsignacionService.asignar_actor(
                postulacion=self.postulacion,
                usuario_asignado=self.docente_2,
                tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
                designado_por=self.admin,
                orden_cargo=1,
                seguimiento_etapa=self.seguimiento_perfil,
            )

    def test_docente_modalidad_unico_y_reemplazable(self):
        actual = AsignacionService.asignar_actor(
            postulacion=self.postulacion,
            usuario_asignado=self.docente_1,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.DOCENTE_MODALIDAD,
            designado_por=self.admin,
        )

        with self.assertRaisesMessage(ValidationError, "La postulación ya tiene un DOCENTE_MODALIDAD activo."):
            AsignacionService.asignar_actor(
                postulacion=self.postulacion,
                usuario_asignado=self.docente_2,
                tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.DOCENTE_MODALIDAD,
                designado_por=self.admin,
            )

        nuevo = AsignacionService.reemplazar_actor(actual, self.docente_2, self.admin, "Cambio de docente")
        self.assertEqual(nuevo.usuario, self.docente_2)
        self.assertEqual(AsignacionPostulacion.all_objects.filter(tipo_participacion="DOCENTE_MODALIDAD").count(), 2)

    def test_bloquea_usuario_inactivo_y_estudiante(self):
        with self.assertRaisesMessage(ValidationError, "No se puede asignar un usuario inactivo."):
            AsignacionService.asignar_actor(
                postulacion=self.postulacion,
                usuario_asignado=self.inactive_docente,
                tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
                designado_por=self.admin,
            )

        with self.assertRaisesMessage(ValidationError, "El usuario asignado no tiene un rol autorizado para esta participación."):
            AsignacionService.asignar_actor(
                postulacion=self.postulacion,
                usuario_asignado=self.other_student,
                tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
                designado_por=self.admin,
            )

    def test_finalizar_dos_veces_y_seguimiento_ajeno_bloqueados(self):
        asignacion = AsignacionService.asignar_actor(
            postulacion=self.postulacion,
            usuario_asignado=self.docente_1,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
            designado_por=self.admin,
        )
        AsignacionService.finalizar_asignacion(asignacion, self.admin, "Fin")

        with self.assertRaisesMessage(ValidationError, "La asignación ya está finalizada."):
            AsignacionService.finalizar_asignacion(asignacion, self.admin, "Segundo intento")

        with self.assertRaisesMessage(ValidationError, "El seguimiento de etapa no pertenece a la postulación indicada."):
            AsignacionService.asignar_actor(
                postulacion=self.postulacion,
                usuario_asignado=self.docente_1,
                tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
                designado_por=self.admin,
                orden_cargo=1,
                seguimiento_etapa=self.seguimiento_ajeno,
            )

    def test_reemplazo_es_atomico_si_falla_creacion_nueva(self):
        asignacion = AsignacionService.asignar_actor(
            postulacion=self.postulacion,
            usuario_asignado=self.docente_1,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
            designado_por=self.admin,
        )

        with patch.object(
            AsignacionService,
            "asignar_actor",
            side_effect=ValidationError("fallo controlado"),
        ):
            with self.assertRaisesMessage(ValidationError, "fallo controlado"):
                AsignacionService.reemplazar_actor(asignacion, self.docente_2, self.admin, "Cambio")

        asignacion.refresh_from_db()
        self.assertTrue(asignacion.activo)
        self.assertIsNone(asignacion.fecha_finalizacion)

    def test_auditoria_registra_creacion_finalizacion_y_reemplazo(self):
        asignacion = AsignacionService.asignar_actor(
            postulacion=self.postulacion,
            usuario_asignado=self.docente_1,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
            designado_por=self.admin,
        )
        AsignacionService.finalizar_asignacion(asignacion, self.admin, "Fin de tutor")
        segunda = AsignacionService.asignar_actor(
            postulacion=self.postulacion,
            usuario_asignado=self.docente_2,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
            designado_por=self.admin,
        )
        AsignacionService.reemplazar_actor(segunda, self.docente_3, self.admin, "Nuevo cambio")

        self.assertTrue(AuditLog.objects.filter(usuario=self.admin, accion="ASSIGN", modulo="ASIGNACIONES").exists())
        self.assertTrue(AuditLog.objects.filter(usuario=self.admin, accion="FINISH", modulo="ASIGNACIONES").exists())
        self.assertTrue(AuditLog.objects.filter(usuario=self.admin, accion="REPLACE", modulo="ASIGNACIONES").exists())


class AsignacionApiTest(AssignmentBaseMixin, APITestCase):
    """Pruebas API y permisos para asignaciones."""

    def authenticate(self, user) -> None:
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_admin_puede_asignar_finalizar_y_reemplazar(self):
        self.authenticate(self.admin)
        asignar = self.client.post(
            f"/api/v1/postulaciones/{self.postulacion.id}/asignaciones/asignar/",
            {
                "usuario": self.docente_1.id,
                "tipo_participacion": "TUTOR",
                "observaciones": "Tutor principal",
            },
            format="json",
        )
        asignacion_id = asignar.data["id"]
        finalizar = self.client.post(
            f"/api/v1/asignaciones/{asignacion_id}/finalizar/",
            {"observaciones": "Se finaliza"},
            format="json",
        )

        otra = self.client.post(
            f"/api/v1/postulaciones/{self.postulacion.id}/asignaciones/asignar/",
            {
                "usuario": self.docente_2.id,
                "tipo_participacion": "TUTOR",
            },
            format="json",
        )
        reemplazar = self.client.post(
            f"/api/v1/asignaciones/{otra.data['id']}/reemplazar/",
            {
                "nuevo_usuario": self.docente_3.id,
                "observaciones": "Reemplazo formal",
            },
            format="json",
        )

        self.assertEqual(asignar.status_code, status.HTTP_201_CREATED)
        self.assertEqual(finalizar.status_code, status.HTTP_200_OK)
        self.assertEqual(reemplazar.status_code, status.HTTP_200_OK)
        self.assertEqual(reemplazar.data["usuario"], self.docente_3.id)

    def test_estudiante_ve_solo_asignaciones_propias(self):
        AsignacionService.asignar_actor(
            postulacion=self.postulacion,
            usuario_asignado=self.docente_1,
            tipo_participacion="TUTOR",
            designado_por=self.admin,
        )
        AsignacionService.asignar_actor(
            postulacion=self.other_postulacion,
            usuario_asignado=self.docente_2,
            tipo_participacion="TUTOR",
            designado_por=self.admin,
        )
        self.authenticate(self.student)

        propia = self.client.get(f"/api/v1/postulaciones/{self.postulacion.id}/asignaciones/", format="json")
        ajena = self.client.get(f"/api/v1/postulaciones/{self.other_postulacion.id}/asignaciones/", format="json")

        self.assertEqual(propia.status_code, status.HTTP_200_OK)
        self.assertEqual(len(propia.data), 1)
        self.assertEqual(ajena.status_code, status.HTTP_404_NOT_FOUND)

    def test_estudiante_no_puede_modificar(self):
        self.authenticate(self.student)

        response = self.client.post(
            f"/api/v1/postulaciones/{self.postulacion.id}/asignaciones/asignar/",
            {
                "usuario": self.docente_1.id,
                "tipo_participacion": "TUTOR",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_docente_ve_asignaciones_donde_participa(self):
        asignacion = AsignacionService.asignar_actor(
            postulacion=self.postulacion,
            usuario_asignado=self.docente_1,
            tipo_participacion="TUTOR",
            designado_por=self.admin,
        )
        self.authenticate(self.docente_1)

        listado = self.client.get("/api/v1/asignaciones/", format="json")
        detalle_postulacion = self.client.get(
            f"/api/v1/postulaciones/{self.postulacion.id}/asignaciones/",
            format="json",
        )

        self.assertEqual(listado.status_code, status.HTTP_200_OK)
        self.assertEqual(listado.data["count"], 1)
        self.assertEqual(listado.data["results"][0]["id"], asignacion.id)
        self.assertEqual(detalle_postulacion.status_code, status.HTTP_200_OK)

    def test_no_autenticado_recibe_401(self):
        response = self.client.get(f"/api/v1/postulaciones/{self.postulacion.id}/asignaciones/", format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_directo_rechazado_y_filtros_funcionan(self):
        tutor = AsignacionService.asignar_actor(
            postulacion=self.postulacion,
            usuario_asignado=self.docente_1,
            tipo_participacion="TUTOR",
            designado_por=self.admin,
        )
        tribunal = AsignacionService.asignar_actor(
            postulacion=self.postulacion,
            usuario_asignado=self.docente_2,
            tipo_participacion="TRIBUNAL",
            designado_por=self.admin,
            orden_cargo=1,
            seguimiento_etapa=self.seguimiento_perfil,
        )
        AsignacionService.finalizar_asignacion(tutor, self.admin, "Fin tutor")
        self.authenticate(self.admin)

        patch_response = self.client.patch(
            f"/api/v1/asignaciones/{tribunal.id}/",
            {"tipo_participacion": "SECRETARIO"},
            format="json",
        )
        filtrado = self.client.get(
            f"/api/v1/postulaciones/{self.postulacion.id}/asignaciones/?tipo_participacion=TRIBUNAL&activo=true",
            format="json",
        )
        activas = self.client.get(
            f"/api/v1/postulaciones/{self.postulacion.id}/asignaciones/activas/?usuario={self.docente_2.id}",
            format="json",
        )

        self.assertEqual(patch_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(filtrado.status_code, status.HTTP_200_OK)
        self.assertEqual(len(filtrado.data), 1)
        self.assertEqual(filtrado.data[0]["id"], tribunal.id)
        self.assertEqual(activas.status_code, status.HTTP_200_OK)
        self.assertEqual(len(activas.data), 1)
