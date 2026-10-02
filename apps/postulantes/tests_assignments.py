from unittest.mock import patch
from threading import Barrier, Thread

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import close_old_connections
from django.db.models import ProtectedError
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.postulantes.asignaciones import AsignacionService
from apps.postulantes.decisiones_academicas import DecisionAcademicaEtapaService
from apps.modalidades.proyecto_grado import ProyectoGradoPolicy
from apps.postulantes.models import (
    AsignacionPostulacion,
    EstadoPostulacion,
    EventoDefensa,
    ParticipanteEvento,
    Postulacion,
    SeguimientoEtapa,
)
from apps.postulantes.serializers import FlujoPostulacionSerializer
from apps.usuarios.models import AuditLog, Role


User = get_user_model()


class AssignmentBaseMixin:
    def setUp(self) -> None:
        super().setUp()
        self.admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administrador")
        self.student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        self.docente_role = Role.objects.create(codigo="DOCENTE", nombre="Docente")

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
            regimen_workflow=Postulacion.RegimenWorkflowChoices.PG_LEGACY,
        )
        self.other_postulacion = Postulacion.objects.create(
            codigo="POST-ASIG-002",
            estudiante=self.other_student,
            modalidad=self.modalidad,
            periodo=self.periodo,
            estado_actual=self.estado_registrada,
            regimen_workflow=Postulacion.RegimenWorkflowChoices.PG_LEGACY,
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

    def _seguimiento_publico(self, intento=1):
        etapa, _ = EtapaModalidad.objects.get_or_create(
            modalidad=self.modalidad, codigo="DEFENSA_PUBLICA",
            defaults={"nombre": "Defensa Pública", "orden": 6, "origen_normativo": "Reglamento"},
        )
        return SeguimientoEtapa.objects.create(
            postulacion=self.postulacion, etapa=etapa,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO, numero_intento=intento,
        )

    def test_rechaza_misma_persona_como_presidente_y_secretario_en_defensa_publica(self):
        seguimiento = self._seguimiento_publico()
        AsignacionService.asignar_actor(self.postulacion, self.docente_1, "PRESIDENTE", self.admin, seguimiento_etapa=seguimiento)
        with self.assertRaisesMessage(ValidationError, "cargo incompatible"):
            AsignacionService.asignar_actor(self.postulacion, self.docente_1, "SECRETARIO", self.admin, seguimiento_etapa=seguimiento)

    def test_rechaza_secretario_o_presidente_que_ya_es_tribunal(self):
        seguimiento = self._seguimiento_publico()
        AsignacionService.asignar_actor(
            self.postulacion, self.docente_1, "TRIBUNAL", self.admin,
            orden_cargo=1, seguimiento_etapa=self.seguimiento_perfil,
        )
        for rol in ("SECRETARIO", "PRESIDENTE"):
            with self.subTest(rol=rol), self.assertRaisesMessage(ValidationError, "cargo incompatible"):
                AsignacionService.asignar_actor(self.postulacion, self.docente_1, rol, self.admin, seguimiento_etapa=seguimiento)

    def test_permite_rol_historico_finalizado(self):
        seguimiento = self._seguimiento_publico()
        tribunal = AsignacionService.asignar_actor(
            self.postulacion, self.docente_1, "TRIBUNAL", self.admin,
            orden_cargo=1, seguimiento_etapa=self.seguimiento_perfil,
        )
        AsignacionService.finalizar_asignacion(tribunal, self.admin, "Fin de designación")
        presidente = AsignacionService.asignar_actor(
            self.postulacion, self.docente_1, "PRESIDENTE", self.admin, seguimiento_etapa=seguimiento,
        )
        self.assertTrue(presidente.activo)

    def test_permite_roles_en_intentos_publicos_distintos(self):
        intento_1 = self._seguimiento_publico(1)
        intento_2 = self._seguimiento_publico(2)
        presidente = AsignacionService.asignar_actor(
            self.postulacion, self.docente_1, "PRESIDENTE", self.admin, seguimiento_etapa=intento_1,
        )
        secretario = AsignacionService.asignar_actor(
            self.postulacion, self.docente_1, "SECRETARIO", self.admin, seguimiento_etapa=intento_2,
        )
        self.assertNotEqual(presidente.seguimiento_etapa_id, secretario.seguimiento_etapa_id)

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

    def test_contrato_actual_tribunal_perfil_admite_ordenes_uno_dos_y_tres_en_su_contexto(self):
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
        self.assertEqual(
            {item.seguimiento_etapa_id for item in activos},
            {self.seguimiento_perfil.pk},
        )

    def test_resolver_candidatos_mantiene_ocupados_visibles_y_bloqueados_por_politica(self):
        AsignacionService.asignar_actor(
            self.postulacion, self.docente_1, "TRIBUNAL", self.admin,
            orden_cargo=1, seguimiento_etapa=self.seguimiento_perfil,
        )
        otra_etapa = EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo="DEFENSA_PRIVADA",
            nombre="Defensa Privada",
            orden=2,
            origen_normativo="Capitulo III",
        )
        otro_seguimiento = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion,
            etapa=otra_etapa,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
        )
        AsignacionPostulacion.objects.create(
            postulacion=self.postulacion,
            usuario=self.docente_2,
            tipo_participacion="TRIBUNAL",
            orden_cargo=1,
            designado_por=self.admin,
            seguimiento_etapa=otro_seguimiento,
        )

        candidatos = AsignacionService.obtener_candidatos_elegibles(
            self.postulacion,
            "TRIBUNAL",
            2,
            self.seguimiento_perfil,
        )
        estados = {item.pk: item for item in candidatos}

        self.assertFalse(estados[self.docente_1.pk].elegible)
        self.assertEqual(estados[self.docente_1.pk].asignaciones_vigentes, ["Tribunal 1"])
        self.assertFalse(estados[self.docente_2.pk].elegible)
        self.assertEqual(estados[self.docente_2.pk].asignaciones_vigentes, ["Tribunal 1"])
        self.assertTrue(estados[self.docente_3.pk].elegible)
        self.assertIsNone(estados[self.docente_3.pk].motivo_bloqueo)

    def test_contrato_actual_tribunal_perfil_bloquea_cuarto_miembro_en_mismo_contexto(self):
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

    def test_bloquea_finalizacion_si_la_asignacion_participa_en_evento_programado_o_en_curso(self):
        etapa = EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo="DEFENSA_PUBLICA",
            nombre="Defensa Pública",
            orden=6,
            origen_normativo="Reglamento",
        )
        seguimiento = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion,
            etapa=etapa,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
            numero_intento=1,
        )
        asignacion = AsignacionService.asignar_actor(
            postulacion=self.postulacion,
            usuario_asignado=self.docente_1,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.SECRETARIO,
            designado_por=self.admin,
            seguimiento_etapa=seguimiento,
        )
        evento_programado = EventoDefensa.objects.create(
            postulacion=self.postulacion,
            seguimiento_etapa=seguimiento,
            tipo_evento=EventoDefensa.Tipo.DEFENSA_PUBLICA,
            estado=EventoDefensa.Estado.PROGRAMADA,
            fecha_programada=timezone.now() + timezone.timedelta(days=1),
            lugar="Sala 1",
            programado_por=self.admin,
        )
        ParticipanteEvento.objects.create(
            evento=evento_programado,
            asignacion=asignacion,
            rol_evento=ParticipanteEvento.Rol.SECRETARIO,
        )

        with self.assertRaisesMessage(ValidationError, "No se puede finalizar la asignación porque participa activamente en un evento"):
            AsignacionService.finalizar_asignacion(asignacion, self.admin, "Regularización por conflicto de roles")

        evento_en_curso = EventoDefensa.objects.get(pk=evento_programado.pk)
        evento_en_curso.estado = EventoDefensa.Estado.EN_CURSO
        evento_en_curso.fecha_programada = timezone.now()
        evento_en_curso.lugar = "Sala 2"
        evento_en_curso.fecha_inicio_real = timezone.now()
        evento_en_curso.save()

        participante = ParticipanteEvento.objects.get(evento=evento_en_curso, asignacion=asignacion)
        participante.presente = True
        participante.save()

        with self.assertRaisesMessage(ValidationError, "No se puede finalizar la asignación porque participa activamente en un evento"):
            AsignacionService.finalizar_asignacion(asignacion, self.admin, "Regularización por conflicto de roles")

    def test_no_bloquea_finalizacion_si_evento_vinculado_ya_finalizo(self):
        etapa = EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo="DEFENSA_PUBLICA",
            nombre="Defensa Pública",
            orden=6,
            origen_normativo="Reglamento",
        )
        seguimiento = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion,
            etapa=etapa,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
            numero_intento=1,
        )
        asignacion = AsignacionService.asignar_actor(
            postulacion=self.postulacion,
            usuario_asignado=self.docente_1,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.SECRETARIO,
            designado_por=self.admin,
            seguimiento_etapa=seguimiento,
        )
        evento = EventoDefensa.objects.create(
            postulacion=self.postulacion,
            seguimiento_etapa=seguimiento,
            tipo_evento=EventoDefensa.Tipo.DEFENSA_PUBLICA,
            estado=EventoDefensa.Estado.FINALIZADA,
            fecha_programada=timezone.now() - timezone.timedelta(days=2),
            lugar="Sala 3",
            programado_por=self.admin,
            fecha_inicio_real=timezone.now() - timezone.timedelta(days=2),
            fecha_fin_real=timezone.now() - timezone.timedelta(days=1),
        )
        ParticipanteEvento.objects.create(
            evento=evento,
            asignacion=asignacion,
            rol_evento=ParticipanteEvento.Rol.SECRETARIO,
            presente=None,
        )

        actualizada = AsignacionService.finalizar_asignacion(asignacion, self.admin, "Cierre histórico")

        self.assertFalse(actualizada.activo)
        self.assertIsNotNone(actualizada.fecha_finalizacion)

    def test_reemplazar_actor_no_bypassea_proteccion_de_evento_activo(self):
        etapa = EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo="DEFENSA_PUBLICA",
            nombre="Defensa Pública",
            orden=6,
            origen_normativo="Reglamento",
        )
        seguimiento = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion,
            etapa=etapa,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
            numero_intento=1,
        )
        asignacion = AsignacionService.asignar_actor(
            postulacion=self.postulacion,
            usuario_asignado=self.docente_1,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.SECRETARIO,
            designado_por=self.admin,
            seguimiento_etapa=seguimiento,
        )
        evento = EventoDefensa.objects.create(
            postulacion=self.postulacion,
            seguimiento_etapa=seguimiento,
            tipo_evento=EventoDefensa.Tipo.DEFENSA_PUBLICA,
            estado=EventoDefensa.Estado.PROGRAMADA,
            fecha_programada=timezone.now() + timezone.timedelta(days=3),
            lugar="Sala 4",
            programado_por=self.admin,
        )
        ParticipanteEvento.objects.create(
            evento=evento,
            asignacion=asignacion,
            rol_evento=ParticipanteEvento.Rol.SECRETARIO,
        )

        with self.assertRaisesMessage(ValidationError, "No se puede finalizar la asignación porque participa activamente en un evento"):
            AsignacionService.reemplazar_actor(asignacion, self.docente_2, self.admin, "Cambio de secretario")

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


class ProyectoGradoHitosAssignmentTests(AssignmentBaseMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.postulacion.regimen_workflow = Postulacion.RegimenWorkflowChoices.PG_HITOS_V1
        self.postulacion.save(update_fields=["regimen_workflow", "updated_at"])

    def _tribunales_perfil(self):
        return [
            AsignacionService.asignar_actor(
                self.postulacion,
                docente,
                "TRIBUNAL",
                self.admin,
                orden_cargo=orden,
                seguimiento_etapa=self.seguimiento_perfil,
            )
            for orden, docente in enumerate((self.docente_1, self.docente_2, self.docente_3), start=1)
        ]

    def _participantes(self, assignments):
        return [
            {"asignacion": assignment, "rol": "TRIBUNAL", "orden": orden}
            for orden, assignment in enumerate(assignments, start=1)
        ]

    def _registrar_propuesta(self, participants):
        return DecisionAcademicaEtapaService.registrar(
            seguimiento=self.seguimiento_perfil,
            codigo="PROPUESTA_APROBADA",
            resultado="APROBADA",
            registrado_por=self.admin,
            participantes=participants,
        )

    def test_tutor_se_bloquea_hasta_decision_valida_y_se_habilita_despues(self):
        with self.assertRaisesMessage(ValidationError, "PROPUESTA_APROBADA"):
            AsignacionService.asignar_actor(
                self.postulacion, self.docente_4, "TUTOR", self.admin,
            )

        assignments = self._tribunales_perfil()
        decision = self._registrar_propuesta(self._participantes(assignments))
        self.assertEqual(decision.resultado, "APROBADA")
        actor_config = ProyectoGradoPolicy().get_configuracion_actores(
            self.postulacion,
            self.seguimiento_perfil,
        )
        tutor_group = next(group for group in actor_config["grupos"] if group["tipo_participacion"] == "TUTOR")
        tutor_payload = FlujoPostulacionSerializer()._proyectar_posicion(
            None,
            tutor_group,
            "TUTOR",
            "POSTULACION",
            None,
            None,
            True,
            tutor_group["posiciones"][0],
        )
        self.assertEqual(tutor_payload["precondicion"]["estado"], "CUMPLIDA")
        self.assertEqual(tutor_payload["precondicion"]["enforcement"], "ACTIVO")
        self.assertTrue(tutor_payload["habilitada"])
        self.assertIsNone(tutor_payload["bloqueo"])
        self.assertEqual(tutor_payload["acciones_permitidas"], ["ASIGNAR"])

        tutor = AsignacionService.asignar_actor(
            self.postulacion, self.docente_4, "TUTOR", self.admin,
        )
        self.assertEqual(tutor.tipo_participacion, "TUTOR")

    def test_decision_requiere_tres_tribunales_y_ordenes_formales(self):
        assignments = self._tribunales_perfil()
        with self.assertRaisesMessage(ValidationError, "mínimo de participantes"):
            self._registrar_propuesta(self._participantes(assignments[:2]))

        wrong_orders = [
            {"asignacion": assignments[0], "rol": "TRIBUNAL", "orden": 2},
            {"asignacion": assignments[1], "rol": "TRIBUNAL", "orden": 1},
            {"asignacion": assignments[2], "rol": "TRIBUNAL", "orden": 3},
        ]
        with self.assertRaisesMessage(ValidationError, "coincidir con el orden"):
            self._registrar_propuesta(wrong_orders)

        with self.assertRaisesMessage(ValidationError, "no está permitido por la policy"):
            self._registrar_propuesta([
                {"asignacion": assignments[0], "rol": "TUTOR", "orden": 1},
                {"asignacion": assignments[1], "rol": "TRIBUNAL", "orden": 2},
                {"asignacion": assignments[2], "rol": "TRIBUNAL", "orden": 3},
            ])

    def test_decision_rechaza_persona_duplicada_y_asignacion_de_otra_postulacion(self):
        assignments = self._tribunales_perfil()
        assignments[2].usuario = self.docente_1
        assignments[2].save(update_fields=["usuario"])
        with self.assertRaisesMessage(ValidationError, "no puede repetirse"):
            self._registrar_propuesta(self._participantes(assignments))

        assignments[2].usuario = self.docente_3
        assignments[2].save(update_fields=["usuario"])
        foreign = AsignacionService.asignar_actor(
            self.other_postulacion,
            self.docente_4,
            "TRIBUNAL",
            self.admin,
            orden_cargo=1,
            seguimiento_etapa=self.seguimiento_ajeno,
        )
        with self.assertRaisesMessage(ValidationError, "pertenecer a la postulación"):
            self._registrar_propuesta([
                {"asignacion": assignments[0], "rol": "TRIBUNAL", "orden": 1},
                {"asignacion": assignments[1], "rol": "TRIBUNAL", "orden": 2},
                {"asignacion": foreign, "rol": "TRIBUNAL", "orden": 3},
            ])

    def test_decision_rechaza_tribunal_de_otra_etapa_y_composicion_incompleta(self):
        assignments = self._tribunales_perfil()
        otra_etapa = EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo="DEFENSA_PUBLICA",
            nombre="Defensa Pública",
            orden=6,
            origen_normativo="Reglamento",
        )
        otro_seguimiento = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion,
            etapa=otra_etapa,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
        )
        assignments[2].seguimiento_etapa = otro_seguimiento
        assignments[2].save(update_fields=["seguimiento_etapa"])
        with self.assertRaisesMessage(ValidationError, "seguimiento de la decisión"):
            self._registrar_propuesta(self._participantes(assignments))

        assignments[2].seguimiento_etapa = self.seguimiento_perfil
        assignments[2].save(update_fields=["seguimiento_etapa"])
        extra = AsignacionPostulacion.objects.create(
            postulacion=self.postulacion,
            usuario=self.docente_4,
            tipo_participacion="TRIBUNAL",
            orden_cargo=4,
            designado_por=self.admin,
            seguimiento_etapa=self.seguimiento_perfil,
        )
        with self.assertRaisesMessage(ValidationError, "composición formal completa"):
            self._registrar_propuesta(self._participantes(assignments))

    def test_decision_rechaza_asignacion_inactiva_y_resultado_no_habilitante(self):
        assignments = self._tribunales_perfil()
        assignments[2].activo = False
        assignments[2].save(update_fields=["activo"])
        with self.assertRaisesMessage(ValidationError, "no está activa"):
            self._registrar_propuesta(self._participantes(assignments))

        assignments[2].activo = True
        assignments[2].save(update_fields=["activo"])
        with self.assertRaisesMessage(ValidationError, "resultado no está permitido"):
            DecisionAcademicaEtapaService.registrar(
                seguimiento=self.seguimiento_perfil,
                codigo="PROPUESTA_APROBADA",
                resultado="INSUFICIENTE",
                registrado_por=self.admin,
                participantes=self._participantes(assignments),
            )


class AsignacionPublicaConcurrencyTest(AssignmentBaseMixin, TransactionTestCase):
    reset_sequences = True

    def test_solicitudes_concurrentes_no_crean_roles_incompatibles(self):
        etapa = EtapaModalidad.objects.create(
            modalidad=self.modalidad, codigo="DEFENSA_PUBLICA", nombre="Defensa Pública",
            orden=6, origen_normativo="Reglamento",
        )
        seguimiento = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion, etapa=etapa,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO, numero_intento=1,
        )
        barrera, resultados = Barrier(2), []

        def asignar(rol):
            close_old_connections()
            try:
                barrera.wait()
                asignacion = AsignacionService.asignar_actor(
                    Postulacion.objects.get(pk=self.postulacion.pk),
                    User.objects.get(pk=self.docente_1.pk), rol,
                    User.objects.get(pk=self.admin.pk),
                    seguimiento_etapa=SeguimientoEtapa.objects.get(pk=seguimiento.pk),
                )
                resultados.append(("ok", asignacion.tipo_participacion))
            except ValidationError as exc:
                resultados.append(("rechazado", str(exc)))
            finally:
                close_old_connections()

        hilos = [Thread(target=asignar, args=(rol,)) for rol in ("PRESIDENTE", "SECRETARIO")]
        for hilo in hilos: hilo.start()
        for hilo in hilos: hilo.join(timeout=10)

        self.assertFalse(any(hilo.is_alive() for hilo in hilos))
        self.assertEqual([estado for estado, _ in resultados].count("ok"), 1)
        self.assertEqual([estado for estado, _ in resultados].count("rechazado"), 1)
        self.assertEqual(AsignacionPostulacion.objects.filter(postulacion=self.postulacion).count(), 1)


class AsignacionApiTest(AssignmentBaseMixin, APITestCase):
    """Pruebas API y permisos para asignaciones."""

    def authenticate(self, user) -> None:
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def obtener_candidatos(self, posicion="TRIBUNAL_PERFIL_2", accion="ASIGNAR", **params):
        return self.client.get(
            f"/api/v1/postulaciones/{self.postulacion.pk}/candidatos-asignacion/",
            {"posicion": posicion, "accion": accion, **params},
            format="json",
        )

    def test_candidatos_contextuales_validan_clave_accion_y_modalidad(self):
        self.authenticate(self.admin)
        self.other_postulacion.modalidad = self.otra_modalidad
        self.other_postulacion.save(update_fields=["modalidad", "updated_at"])
        self.otro_etapa.codigo = "PERFIL_TRABAJO_DIRIGIDO"
        self.otro_etapa.save(update_fields=["codigo", "updated_at"])
        self.seguimiento_ajeno.etapa = self.otro_etapa
        self.seguimiento_ajeno.save(update_fields=["etapa", "updated_at"])

        inexistente = self.obtener_candidatos(posicion="TRIBUNAL_PERFIL_4")
        accion_invalida = self.obtener_candidatos(accion="REEMPLAZAR")
        modalidad_ajena = self.client.get(
            f"/api/v1/postulaciones/{self.other_postulacion.pk}/candidatos-asignacion/",
            {"posicion": "TRIBUNAL_PERFIL_2", "accion": "ASIGNAR"},
            format="json",
        )

        self.assertEqual(inexistente.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("posicion", inexistente.data)
        self.assertEqual(accion_invalida.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("accion", accion_invalida.data)
        self.seguimiento_perfil.estado = SeguimientoEtapa.EstadoChoices.APROBADA
        self.seguimiento_perfil.save(update_fields=["estado", "updated_at"])
        etapa_privada = EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo="DEFENSA_PRIVADA",
            nombre="Defensa Privada",
            orden=2,
            origen_normativo="Capitulo III",
        )
        SeguimientoEtapa.objects.create(
            postulacion=self.postulacion,
            etapa=etapa_privada,
            estado=SeguimientoEtapa.EstadoChoices.PENDIENTE,
        )
        posicion_contexto_incorrecto = self.obtener_candidatos()
        self.assertEqual(posicion_contexto_incorrecto.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("posicion", posicion_contexto_incorrecto.data)
        self.assertEqual(
            modalidad_ajena.status_code,
            status.HTTP_400_BAD_REQUEST,
            modalidad_ajena.data,
        )
        self.assertIn("posicion", modalidad_ajena.data)

    def test_candidatos_muestran_bloqueados_con_ocupacion_en_cualquier_contexto(self):
        AsignacionService.asignar_actor(
            self.postulacion, self.docente_1, "TRIBUNAL", self.admin,
            orden_cargo=1, seguimiento_etapa=self.seguimiento_perfil,
        )
        otra_etapa = EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo="DEFENSA_PRIVADA",
            nombre="Defensa Privada",
            orden=2,
            origen_normativo="Capitulo III",
        )
        otro_seguimiento = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion,
            etapa=otra_etapa,
            estado=SeguimientoEtapa.EstadoChoices.PENDIENTE,
        )
        AsignacionService.asignar_actor(
            self.postulacion, self.docente_2, "TRIBUNAL", self.admin,
            orden_cargo=1, seguimiento_etapa=otro_seguimiento,
        )
        self.authenticate(self.admin)

        response = self.obtener_candidatos()
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        rows = {row["id"]: row for row in response.data["results"]}

        self.assertFalse(rows[self.docente_1.pk]["elegible"])
        self.assertEqual(rows[self.docente_1.pk]["asignaciones_vigentes"], ["Tribunal 1"])
        self.assertFalse(rows[self.docente_2.pk]["elegible"])
        self.assertEqual(rows[self.docente_2.pk]["asignaciones_vigentes"], ["Tribunal 1"])
        self.assertTrue(rows[self.docente_3.pk]["elegible"])

    def test_candidato_contextual_resuelve_docente_modalidad_por_clave_de_defensa_privada(self):
        etapa_privada = EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo="DEFENSA_PRIVADA",
            nombre="Defensa Privada",
            orden=2,
            origen_normativo="Contrato de actores por etapa",
        )
        seguimiento_privado = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion,
            etapa=etapa_privada,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
        )
        self.authenticate(self.admin)

        response = self.obtener_candidatos(
            posicion="DOCENTE_MODALIDAD_DEFENSA_PRIVADA_1",
            accion="ASIGNAR",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIn(self.docente_1.pk, {row["id"] for row in response.data["results"]})
        self.assertEqual(response.data["count"], len(response.data["results"]))
        self.assertEqual(seguimiento_privado.postulacion_id, self.postulacion.pk)

    def test_get_muestra_ocupados_y_post_asignacion_rechaza_ocupacion_vigente(self):
        etapa_privada = EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo="DEFENSA_PRIVADA",
            nombre="Defensa Privada",
            orden=2,
            origen_normativo="Contrato de actores por etapa",
        )
        seguimiento_privado = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion,
            etapa=etapa_privada,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
        )
        AsignacionService.asignar_actor(
            self.postulacion, self.docente_1, "TUTOR", self.admin,
        )
        AsignacionPostulacion.objects.create(
            postulacion=self.postulacion,
            usuario=self.docente_1,
            tipo_participacion="TRIBUNAL",
            orden_cargo=2,
            designado_por=self.admin,
            seguimiento_etapa=self.seguimiento_perfil,
        )
        tribunal_actual = AsignacionService.asignar_actor(
            self.postulacion, self.docente_2, "TRIBUNAL", self.admin,
            orden_cargo=1, seguimiento_etapa=self.seguimiento_perfil,
        )
        self.authenticate(self.admin)

        response = self.obtener_candidatos(
            posicion="DOCENTE_MODALIDAD_DEFENSA_PRIVADA_1",
            page_size=20,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        rows = {row["id"]: row for row in response.data["results"]}
        ocupado_con_varias = rows[self.docente_1.pk]
        self.assertFalse(ocupado_con_varias["elegible"])
        self.assertEqual(
            ocupado_con_varias["motivo_bloqueo"],
            "YA_TIENE_ASIGNACION_VIGENTE_EN_POSTULACION",
        )
        self.assertEqual(ocupado_con_varias["asignaciones_vigentes"], ["Tribunal 2", "Tutor"])
        self.assertEqual(ocupado_con_varias["nombre_completo"], self.docente_1.nombre_completo)
        self.assertEqual(ocupado_con_varias["rol_nombre"], self.docente_role.nombre)
        self.assertTrue(rows[self.docente_3.pk]["elegible"])
        self.assertIsNone(rows[self.docente_3.pk]["motivo_bloqueo"])
        self.assertEqual(rows[self.docente_3.pk]["asignaciones_vigentes"], [])

        asignar = self.client.post(
            f"/api/v1/postulaciones/{self.postulacion.pk}/asignaciones/asignar/",
            {
                "usuario": self.docente_1.pk,
                "tipo_participacion": "DOCENTE_MODALIDAD",
                "seguimiento_etapa": seguimiento_privado.pk,
            },
            format="json",
        )
        self.assertEqual(asignar.status_code, status.HTTP_400_BAD_REQUEST, asignar.data)

        reemplazar = self.client.post(
            f"/api/v1/asignaciones/{tribunal_actual.pk}/reemplazar/",
            {"nuevo_usuario": self.docente_1.pk},
            format="json",
        )
        self.assertEqual(reemplazar.status_code, status.HTTP_400_BAD_REQUEST, reemplazar.data)
        tribunal_actual.refresh_from_db()
        self.assertTrue(tribunal_actual.activo)

    def test_reemplazo_excluye_al_actual_muestra_ocupado_y_habilita_libre(self):
        tribunal_actual = AsignacionService.asignar_actor(
            self.postulacion, self.docente_2, "TRIBUNAL", self.admin,
            orden_cargo=1, seguimiento_etapa=self.seguimiento_perfil,
        )
        AsignacionService.asignar_actor(
            self.postulacion, self.docente_1, "TUTOR", self.admin,
        )
        self.authenticate(self.admin)

        response = self.obtener_candidatos(
            posicion="TRIBUNAL_PERFIL_1",
            accion="REEMPLAZAR",
            page_size=20,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        rows = {row["id"]: row for row in response.data["results"]}
        self.assertNotIn(self.docente_2.pk, rows)
        self.assertFalse(rows[self.docente_1.pk]["elegible"])
        self.assertEqual(rows[self.docente_1.pk]["asignaciones_vigentes"], ["Tutor"])
        self.assertTrue(rows[self.docente_3.pk]["elegible"])
        self.assertIsNone(rows[self.docente_3.pk]["motivo_bloqueo"])

        propio = self.client.post(
            f"/api/v1/asignaciones/{tribunal_actual.pk}/reemplazar/",
            {"nuevo_usuario": self.docente_2.pk},
            format="json",
        )
        self.assertEqual(propio.status_code, status.HTTP_400_BAD_REQUEST, propio.data)

    def test_otra_postulacion_e_historico_no_bloquean_y_finalizar_libera(self):
        AsignacionService.asignar_actor(
            self.other_postulacion, self.docente_1, "TUTOR", self.admin,
        )
        finalizada = AsignacionService.asignar_actor(
            self.postulacion, self.docente_2, "TUTOR", self.admin,
        )
        etapa_privada = EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo="DEFENSA_PRIVADA",
            nombre="Defensa Privada",
            orden=2,
            origen_normativo="Contrato de actores por etapa",
        )
        SeguimientoEtapa.objects.create(
            postulacion=self.postulacion,
            etapa=etapa_privada,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
        )
        self.authenticate(self.admin)

        antes = self.obtener_candidatos(posicion="DOCENTE_MODALIDAD_DEFENSA_PRIVADA_1")
        self.assertEqual(antes.status_code, status.HTTP_200_OK, antes.data)
        filas_antes = {row["id"]: row for row in antes.data["results"]}
        self.assertTrue(filas_antes[self.docente_1.pk]["elegible"])
        self.assertFalse(filas_antes[self.docente_2.pk]["elegible"])
        self.assertEqual(filas_antes[self.docente_2.pk]["asignaciones_vigentes"], ["Tutor"])

        AsignacionService.finalizar_asignacion(finalizada, self.admin, "Fin de participación")
        despues = self.obtener_candidatos(posicion="DOCENTE_MODALIDAD_DEFENSA_PRIVADA_1")
        self.assertEqual(despues.status_code, status.HTTP_200_OK, despues.data)
        rows = {row["id"]: row for row in despues.data["results"]}
        for candidato in (self.docente_1, self.docente_2):
            self.assertTrue(rows[candidato.pk]["elegible"])
            self.assertIsNone(rows[candidato.pk]["motivo_bloqueo"])
            self.assertEqual(rows[candidato.pk]["asignaciones_vigentes"], [])

    def test_policy_sin_opt_in_no_aplica_ocupacion_generica(self):
        from apps.modalidades.policies import ModalidadPolicyRegistry

        self.other_postulacion.modalidad = self.otra_modalidad
        self.other_postulacion.save(update_fields=["modalidad", "updated_at"])
        config = ModalidadPolicyRegistry.get(self.otra_modalidad).get_configuracion_actores()
        grupos = config["grupos"]
        self.assertTrue(grupos)
        self.assertTrue(all(grupo.get("ocupacion_actor") is None for grupo in grupos))
        self.assertFalse(AsignacionService._ocupacion_actor_aplica(None))

    def test_candidatos_excluyen_inactivos_estudiantes_y_postulante_aunque_tenga_rol_docente(self):
        inactive_domain_user = User.objects.create_user(
            username="docente_dominio_inactivo",
            role=self.docente_role,
            activo=False,
        )
        self.student.role = self.docente_role
        self.student.save(update_fields=["role", "updated_at"])
        self.authenticate(self.admin)

        response = self.obtener_candidatos()
        candidate_ids = {row["id"] for row in response.data["results"]}

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn(self.inactive_docente.pk, candidate_ids)
        self.assertNotIn(inactive_domain_user.pk, candidate_ids)
        self.assertNotIn(self.other_student.pk, candidate_ids)
        self.assertNotIn(self.student.pk, candidate_ids)
        self.assertIn(self.docente_1.pk, candidate_ids)

    def test_reemplazo_excluye_persona_actual_y_buscador_pagina_sobre_elegibles(self):
        actual = AsignacionService.asignar_actor(
            self.postulacion, self.docente_1, "TRIBUNAL", self.admin,
            orden_cargo=1, seguimiento_etapa=self.seguimiento_perfil,
        )
        self.docente_2.nombres = "Candidata Buscable"
        self.docente_2.save(update_fields=["nombres", "updated_at"])
        self.authenticate(self.admin)

        replacement = self.obtener_candidatos(posicion="TRIBUNAL_PERFIL_1", accion="REEMPLAZAR")
        searched = self.obtener_candidatos(search="Buscable", page_size=1)
        first_page = self.obtener_candidatos(page_size=1)
        second_page = self.obtener_candidatos(page=2, page_size=1)

        self.assertEqual(replacement.status_code, status.HTTP_200_OK, replacement.data)
        self.assertEqual(searched.status_code, status.HTTP_200_OK, searched.data)
        self.assertEqual(first_page.status_code, status.HTTP_200_OK, first_page.data)
        self.assertEqual(second_page.status_code, status.HTTP_200_OK, second_page.data)
        replacement_ids = {row["id"] for row in replacement.data["results"]}
        self.assertNotIn(actual.usuario_id, replacement_ids)
        self.assertEqual(searched.data["count"], 1)
        self.assertEqual(searched.data["results"][0]["id"], self.docente_2.pk)
        self.assertEqual(first_page.data["count"], 5)
        self.assertEqual(len(first_page.data["results"]), 1)
        self.assertIsNotNone(first_page.data["next"])
        self.assertIsNotNone(second_page.data["previous"])
        self.assertEqual(len(second_page.data["results"]), 1)

    def test_post_sigue_rechazando_candidato_que_dejo_de_ser_elegible(self):
        self.authenticate(self.admin)
        candidates = self.obtener_candidatos()
        self.assertIn(self.docente_1.pk, {row["id"] for row in candidates.data["results"]})

        AsignacionService.asignar_actor(
            self.postulacion, self.docente_1, "TRIBUNAL", self.admin,
            orden_cargo=1, seguimiento_etapa=self.seguimiento_perfil,
        )
        response = self.client.post(
            f"/api/v1/postulaciones/{self.postulacion.pk}/asignaciones/asignar/",
            {
                "usuario": self.docente_1.pk,
                "tipo_participacion": "TRIBUNAL",
                "orden_cargo": 2,
                "seguimiento_etapa": self.seguimiento_perfil.pk,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("non_field_errors", response.data)

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

    def test_errores_de_acciones_conservan_claves_estables(self):
        self.authenticate(self.admin)
        asignar = self.client.post(
            f"/api/v1/postulaciones/{self.postulacion.id}/asignaciones/asignar/",
            {
                "usuario": self.inactive_docente.id,
                "tipo_participacion": "TIPO_INVALIDO",
                "orden_cargo": 0,
                "seguimiento_etapa": 999999,
                "observaciones": [],
            },
            format="json",
        )
        self.assertEqual(asignar.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            set(asignar.data) - {"status_code"},
            {"usuario", "tipo_participacion", "orden_cargo", "seguimiento_etapa", "observaciones"},
        )

        activa = AsignacionService.asignar_actor(
            self.postulacion, self.docente_1, "TUTOR", self.admin,
        )
        reemplazar = self.client.post(
            f"/api/v1/asignaciones/{activa.id}/reemplazar/",
            {"nuevo_usuario": self.inactive_docente.id, "observaciones": []},
            format="json",
        )
        self.assertEqual(reemplazar.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(reemplazar.data) - {"status_code"}, {"nuevo_usuario", "observaciones"})

        duplicada = self.client.post(
            f"/api/v1/postulaciones/{self.postulacion.id}/asignaciones/asignar/",
            {"usuario": self.docente_2.id, "tipo_participacion": "TUTOR"},
            format="json",
        )
        self.assertEqual(duplicada.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(duplicada.data) - {"status_code"}, {"non_field_errors"})

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

    def test_contrato_canonico_filtra_postulacion_e_incluye_activas_e_historicas(self):
        activa = AsignacionService.asignar_actor(
            self.postulacion, self.docente_1, "TUTOR", self.admin,
        )
        historica = AsignacionService.asignar_actor(
            self.postulacion, self.docente_2, "TRIBUNAL", self.admin, orden_cargo=1,
        )
        AsignacionService.finalizar_asignacion(historica, self.admin, "Fin de participación")
        AsignacionService.asignar_actor(
            self.other_postulacion, self.docente_3, "TUTOR", self.admin,
        )
        self.authenticate(self.admin)

        response = self.client.get(f"/api/v1/asignaciones/?postulacion={self.postulacion.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual([row["id"] for row in response.data["results"]], [activa.id, historica.id])
        self.assertEqual([row["activo"] for row in response.data["results"]], [True, False])
        self.assertEqual({row["postulacion"] for row in response.data["results"]}, {self.postulacion.id})

    def test_contrato_canonico_filtra_activo_y_expone_tipos_reales(self):
        tipos = [choice for choice, _label in AsignacionPostulacion.TipoParticipacionChoices.choices]
        asignaciones = []
        docentes = [self.docente_1, self.docente_2, self.docente_3, self.docente_4]
        docentes.extend(
            User.objects.create_user(username=f"docente_tipo_{indice}", role=self.docente_role)
            for indice in range(len(docentes), len(tipos))
        )
        for indice, (tipo, docente) in enumerate(zip(tipos, docentes), start=1):
            asignaciones.append(AsignacionService.asignar_actor(
                self.postulacion, docente, tipo, self.admin,
                orden_cargo=indice if tipo == "TRIBUNAL" else None,
            ))
        AsignacionService.finalizar_asignacion(asignaciones[-1], self.admin)
        self.authenticate(self.admin)

        activas = self.client.get(f"/api/v1/asignaciones/?postulacion={self.postulacion.id}&activo=true")
        historicas = self.client.get(f"/api/v1/asignaciones/?postulacion={self.postulacion.id}&activo=false")

        self.assertEqual(activas.data["count"], len(tipos) - 1)
        self.assertEqual(historicas.data["count"], 1)
        self.assertEqual(historicas.data["results"][0]["tipo_participacion"], tipos[-1])
        self.assertEqual(
            {row["tipo_participacion"] for row in [*activas.data["results"], *historicas.data["results"]]},
            set(tipos),
        )

    def test_nombre_legible_y_aliases_estables(self):
        self.docente_1.nombres = "Ana"
        self.docente_1.apellido_paterno = "Rojas"
        self.docente_1.save(update_fields=["nombres", "apellido_paterno"])
        con_nombre = AsignacionService.asignar_actor(
            self.postulacion, self.docente_1, "TUTOR", self.admin,
        )
        con_username = AsignacionService.asignar_actor(
            self.postulacion, self.docente_2, "TRIBUNAL", self.admin, orden_cargo=1,
        )
        self.authenticate(self.admin)

        response = self.client.get(f"/api/v1/asignaciones/?postulacion={self.postulacion.id}")
        por_id = {row["id"]: row for row in response.data["results"]}

        self.assertEqual(por_id[con_nombre.id]["usuario_nombre"], "Ana Rojas")
        self.assertEqual(por_id[con_username.id]["usuario_nombre"], "docente_dos")
        self.assertEqual(por_id[con_nombre.id]["tipo_participacion_display"], "Tutor")
        self.assertEqual(por_id[con_nombre.id]["fecha_inicio"], por_id[con_nombre.id]["fecha_designacion"])
        self.assertIn("fecha_fin", por_id[con_nombre.id])
        self.assertEqual(por_id[con_nombre.id]["asignado_por"], self.admin.id)

    def test_alcance_propietario_actor_activo_historico_y_ajeno(self):
        propia = AsignacionService.asignar_actor(
            self.postulacion, self.docente_1, "TUTOR", self.admin,
        )
        otra = AsignacionService.asignar_actor(
            self.postulacion, self.docente_2, "TRIBUNAL", self.admin, orden_cargo=1,
        )
        AsignacionService.finalizar_asignacion(propia, self.admin)

        for usuario in (self.student, self.docente_1, self.docente_2):
            self.authenticate(usuario)
            response = self.client.get(f"/api/v1/asignaciones/?postulacion={self.postulacion.id}")
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual({row["id"] for row in response.data["results"]}, {propia.id, otra.id})

        self.authenticate(self.other_student)
        listado = self.client.get(f"/api/v1/asignaciones/?postulacion={self.postulacion.id}")
        detalle = self.client.get(f"/api/v1/asignaciones/{propia.id}/")
        self.assertEqual(listado.status_code, status.HTTP_200_OK)
        self.assertEqual(listado.data["count"], 0)
        self.assertEqual(detalle.status_code, status.HTTP_404_NOT_FOUND)

    def test_staff_superuser_anonimo_y_get_sin_efectos(self):
        asignacion = AsignacionService.asignar_actor(
            self.postulacion, self.docente_1, "TUTOR", self.admin,
        )
        audit_count = AuditLog.objects.count()
        original = (asignacion.activo, asignacion.fecha_finalizacion, asignacion.observaciones)
        staff = User.objects.create_user(username="staff-consulta", role=self.admin_role, is_staff=True)
        superuser = User.objects.create_user(username="super-consulta", role=self.admin_role, is_superuser=True)
        for usuario in (staff, superuser):
            self.authenticate(usuario)
            response = self.client.get(f"/api/v1/asignaciones/?postulacion={self.postulacion.id}")
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data["count"], 1)
        self.client.credentials()
        anonimo = self.client.get(f"/api/v1/asignaciones/?postulacion={self.postulacion.id}")
        self.assertEqual(anonimo.status_code, status.HTTP_401_UNAUTHORIZED)
        asignacion.refresh_from_db()
        self.assertEqual((asignacion.activo, asignacion.fecha_finalizacion, asignacion.observaciones), original)
        self.assertEqual(AuditLog.objects.count(), audit_count)

    def test_orden_determinista_paginacion_y_base_solo_lectura(self):
        usuarios = [User.objects.create_user(username=f"docente_pagina_{index}", role=self.docente_role) for index in range(21)]
        for usuario in usuarios:
            AsignacionPostulacion.all_objects.create(
                postulacion=self.postulacion,
                usuario=usuario,
                tipo_participacion="SECRETARIO",
                designado_por=self.admin,
            )
        self.authenticate(self.admin)

        primera = self.client.get(f"/api/v1/asignaciones/?postulacion={self.postulacion.id}")
        segunda = self.client.get(f"/api/v1/asignaciones/?postulacion={self.postulacion.id}&page=2")
        post = self.client.post("/api/v1/asignaciones/", {}, format="json")
        delete = self.client.delete(f"/api/v1/asignaciones/{primera.data['results'][0]['id']}/")

        self.assertEqual(primera.data["count"], 21)
        self.assertEqual(len(primera.data["results"]), 20)
        self.assertEqual(len(segunda.data["results"]), 1)
        ids = [row["id"] for row in [*primera.data["results"], *segunda.data["results"]]]
        self.assertEqual(ids, sorted(ids))
        self.assertEqual(post.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(delete.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
