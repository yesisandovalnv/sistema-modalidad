from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.modalidades.policies import (
    BaseModalidadPolicy,
    DecisionAcademicaDefinition,
    ModalidadPolicyRegistry,
)
from apps.postulantes.decisiones_academicas import DecisionAcademicaEtapaService
from apps.postulantes.models import (
    AsignacionPostulacion,
    DecisionAcademicaEtapa,
    EstadoPostulacion,
    ParticipacionDecisionAcademica,
    Postulacion,
    SeguimientoEtapa,
)
from apps.usuarios.models import AuditLog, CustomUser


class DecisionTestPolicy(BaseModalidadPolicy):
    codigo = "MODALIDAD_TEST_DECISION"

    def get_decisiones_academicas_permitidas(self, codigo_etapa):
        if codigo_etapa != "ETAPA_TEST":
            return ()
        return (
            DecisionAcademicaDefinition(
                codigo="COMITE_RESOLUCION",
                resultados=("ACEPTADA", "RECHAZADA"),
                roles_participantes=("TRIBUNAL",),
                participantes_minimos=2,
                participantes_maximos=2,
                ordenes_requeridos=(1, 2),
            ),
        )


class DecisionAcademicaEtapaFixtureMixin:
    decision_code = "COMITE_RESOLUCION"
    result = "ACEPTADA"

    def setUp(self):
        super().setUp()
        ModalidadPolicyRegistry.register(DecisionTestPolicy.codigo, DecisionTestPolicy)
        self.admin = CustomUser.objects.create_superuser(
            username="decision-admin",
            password="test-password",
        )
        self.student = CustomUser.objects.create_user(username="decision-student")
        self.participant_one = CustomUser.objects.create_user(username="decision-tribunal-1")
        self.participant_two = CustomUser.objects.create_user(username="decision-tribunal-2")
        self.period = Periodo.objects.create(
            nombre="DECISION-TEST-2026",
            gestion=2026,
            semestre="I",
            fecha_inicio="2026-01-01",
            fecha_fin="2026-12-31",
        )
        self.postulacion = self._postulacion("DECISION-POST-1", self.student)
        self.stage = EtapaModalidad.objects.create(
            modalidad=self.postulacion.modalidad,
            codigo="ETAPA_TEST",
            nombre="Etapa de prueba",
            orden=1,
            origen_normativo="Fixture de policy fake",
        )
        self.seguimiento = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion,
            etapa=self.stage,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
        )
        self.assignment_one = self._assignment(self.postulacion, self.participant_one, 1)
        self.assignment_two = self._assignment(self.postulacion, self.participant_two, 2)

    def _postulacion(self, codigo, student):
        modality, _ = Modalidad.objects.get_or_create(
            codigo=DecisionTestPolicy.codigo,
            defaults={"nombre": "Modalidad de prueba de decisiones"},
        )
        status_record = EstadoPostulacion.objects.create(
            codigo=f"EN_PROCESO_{codigo}",
            nombre=f"En proceso {codigo}",
        )
        return Postulacion.objects.create(
            codigo=codigo,
            estudiante=student,
            modalidad=modality,
            periodo=self.period,
            estado_actual=status_record,
        )

    def _assignment(self, postulacion, user, order, role="TRIBUNAL"):
        return AsignacionPostulacion.objects.create(
            postulacion=postulacion,
            usuario=user,
            tipo_participacion=role,
            orden_cargo=order,
            designado_por=self.admin,
        )

    def valid_participants(self):
        return [
            {"asignacion": self.assignment_one, "rol": "TRIBUNAL", "orden": 1},
            {"asignacion": self.assignment_two, "rol": "TRIBUNAL", "orden": 2},
        ]

    def registrar(self, **overrides):
        values = {
            "seguimiento": self.seguimiento,
            "codigo": self.decision_code,
            "resultado": self.result,
            "registrado_por": self.admin,
            "observaciones": "Consenso académico de prueba",
            "participantes": self.valid_participants(),
        }
        values.update(overrides)
        return DecisionAcademicaEtapaService.registrar(**values)


class DecisionAcademicaEtapaServiceTests(DecisionAcademicaEtapaFixtureMixin, TestCase):
    def test_registra_decision_policy_valida_con_participantes_y_sin_evidencia_documental(self):
        decision = self.registrar()

        self.assertEqual(decision.codigo, self.decision_code)
        self.assertEqual(decision.resultado, self.result)
        self.assertTrue(decision.activo)
        self.assertEqual(decision.registrado_por, self.admin)
        self.assertEqual(decision.participaciones.count(), 2)
        self.assertNotIn("evidencia_version", {field.name for field in decision._meta.fields})

    def test_policy_controla_codigo_y_resultado_permitidos(self):
        with self.assertRaises(ValidationError):
            self.registrar(codigo="CODIGO_NO_DECLARADO")
        with self.assertRaises(ValidationError):
            self.registrar(resultado="RESULTADO_NO_DECLARADO")
        self.assertEqual(DecisionAcademicaEtapa.all_objects.count(), 0)

    def test_codigo_de_decision_solo_se_permite_en_etapa_declarada_por_policy(self):
        other_stage = EtapaModalidad.objects.create(
            modalidad=self.postulacion.modalidad,
            codigo="OTRA_ETAPA_TEST",
            nombre="Otra etapa",
            orden=2,
            origen_normativo="Fixture",
        )
        other_follow = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion,
            etapa=other_stage,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
        )

        with self.assertRaises(ValidationError):
            self.registrar(seguimiento=other_follow)

    def test_rechaza_asignacion_de_otra_postulacion(self):
        other_student = CustomUser.objects.create_user(username="decision-other-student")
        other_post = self._postulacion("DECISION-POST-2", other_student)
        foreign_assignment = self._assignment(other_post, self.participant_one, 3)
        participants = [
            {"asignacion": foreign_assignment, "rol": "TRIBUNAL", "orden": 1},
            {"asignacion": self.assignment_two, "rol": "TRIBUNAL", "orden": 2},
        ]

        with self.assertRaises(ValidationError):
            self.registrar(participantes=participants)

    def test_rechaza_asignacion_inactiva_y_usuario_inactivo(self):
        self.assignment_two.activo = False
        self.assignment_two.save(update_fields=["activo", "updated_at"])
        with self.assertRaises(ValidationError):
            self.registrar()

        self.assignment_two.activo = True
        self.assignment_two.save(update_fields=["activo", "updated_at"])
        self.participant_two.is_active = False
        self.participant_two.save(update_fields=["is_active"])
        with self.assertRaises(ValidationError):
            self.registrar()

    def test_rechaza_una_persona_repetida_a_traves_de_asignaciones_distintas(self):
        duplicate_assignment = self._assignment(self.postulacion, self.participant_one, 3)
        participants = [
            {"asignacion": self.assignment_one, "rol": "TRIBUNAL", "orden": 1},
            {"asignacion": duplicate_assignment, "rol": "TRIBUNAL", "orden": 2},
        ]

        with self.assertRaises(ValidationError):
            self.registrar(participantes=participants)

    def test_policy_controla_roles_y_ordenes_de_participantes(self):
        wrong_role = [
            {"asignacion": self.assignment_one, "rol": "TUTOR", "orden": 1},
            {"asignacion": self.assignment_two, "rol": "TRIBUNAL", "orden": 2},
        ]
        wrong_orders = [
            {"asignacion": self.assignment_one, "rol": "TRIBUNAL", "orden": 1},
            {"asignacion": self.assignment_two, "rol": "TRIBUNAL", "orden": 3},
        ]
        with self.assertRaises(ValidationError):
            self.registrar(participantes=wrong_role)
        with self.assertRaises(ValidationError):
            self.registrar(participantes=wrong_orders)

    def test_impide_duplicado_activo_y_versiona_reemplazo_sin_borrar_historial(self):
        previous = self.registrar()
        with self.assertRaises(ValidationError):
            self.registrar()

        replacement = self.registrar(reemplaza_decision=previous)

        previous.refresh_from_db()
        self.assertFalse(previous.activo)
        self.assertTrue(replacement.activo)
        self.assertNotEqual(previous.pk, replacement.pk)
        self.assertEqual(DecisionAcademicaEtapa.all_objects.filter(
            seguimiento_etapa=self.seguimiento,
            codigo=self.decision_code,
        ).count(), 2)
        self.assertEqual(DecisionAcademicaEtapa.objects.filter(
            seguimiento_etapa=self.seguimiento,
            codigo=self.decision_code,
        ).count(), 1)
        self.assertEqual(previous.participaciones.count(), 2)

    def test_no_reemplaza_decision_de_otro_seguimiento(self):
        previous = self.registrar()
        other_student = CustomUser.objects.create_user(username="decision-third-student")
        other_post = self._postulacion("DECISION-POST-3", other_student)
        other_follow = SeguimientoEtapa.objects.create(
            postulacion=other_post,
            etapa=self.stage,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
        )
        other_assignment_one = self._assignment(other_post, self.participant_one, 1)
        other_assignment_two = self._assignment(other_post, self.participant_two, 2)
        other_decision = DecisionAcademicaEtapaService.registrar(
            seguimiento=other_follow,
            codigo=self.decision_code,
            resultado=self.result,
            registrado_por=self.admin,
            participantes=[
                {"asignacion": other_assignment_one, "rol": "TRIBUNAL", "orden": 1},
                {"asignacion": other_assignment_two, "rol": "TRIBUNAL", "orden": 2},
            ],
        )

        with self.assertRaises(ValidationError):
            self.registrar(reemplaza_decision=other_decision)
        previous.refresh_from_db()
        other_decision.refresh_from_db()
        self.assertTrue(previous.activo)
        self.assertTrue(other_decision.activo)

    def test_deja_trazabilidad_de_alta_y_reemplazo(self):
        previous = self.registrar()
        replacement = self.registrar(reemplaza_decision=previous)

        self.assertTrue(AuditLog.objects.filter(
            accion="REGISTER_ACADEMIC_DECISION",
            modulo="DECISION_ACADEMICA",
            descripcion__contains=f"decisión {previous.pk}",
        ).exists())
        self.assertTrue(AuditLog.objects.filter(
            accion="REPLACE_ACADEMIC_DECISION",
            modulo="DECISION_ACADEMICA",
            descripcion__contains=f"decisión anterior {previous.pk}",
        ).exists())
        self.assertTrue(AuditLog.objects.filter(
            usuario=self.admin,
            descripcion__contains=f"decisión {replacement.pk}",
        ).exists())

    def test_falla_de_auditoria_revierte_decision_y_participantes(self):
        with patch("apps.postulantes.decisiones_academicas.AuditLog.objects.create", side_effect=RuntimeError("audit failed")):
            with self.assertRaisesRegex(RuntimeError, "audit failed"):
                self.registrar()

        self.assertEqual(DecisionAcademicaEtapa.all_objects.count(), 0)
        self.assertEqual(ParticipacionDecisionAcademica.all_objects.count(), 0)

    def test_falla_de_auditoria_al_reemplazar_revierte_desactivacion_anterior(self):
        previous = self.registrar()
        with patch("apps.postulantes.decisiones_academicas.AuditLog.objects.create", side_effect=RuntimeError("audit failed")):
            with self.assertRaisesRegex(RuntimeError, "audit failed"):
                self.registrar(reemplaza_decision=previous)

        previous.refresh_from_db()
        self.assertTrue(previous.activo)
        self.assertEqual(DecisionAcademicaEtapa.all_objects.filter(seguimiento_etapa=self.seguimiento).count(), 1)


class DecisionAcademicaEtapaApiTests(DecisionAcademicaEtapaFixtureMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()

    def decisions_url(self):
        return f"/api/v1/seguimientos-etapa/{self.seguimiento.pk}/decisiones-academicas/"

    def register_url(self):
        return f"/api/v1/seguimientos-etapa/{self.seguimiento.pk}/registrar-decision/"

    def payload(self, **overrides):
        payload = {
            "codigo": self.decision_code,
            "resultado": self.result,
            "observaciones": "Registro API de prueba",
            "participantes": [
                {"asignacion": self.assignment_one.pk, "rol": "TRIBUNAL", "orden": 1},
                {"asignacion": self.assignment_two.pk, "rol": "TRIBUNAL", "orden": 2},
            ],
        }
        payload.update(overrides)
        return payload

    def test_admin_registra_consulta_historial_y_reemplaza_decision(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(self.register_url(), self.payload(), format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(created.data["participantes"]), 2)

        replacement = self.client.post(
            self.register_url(),
            self.payload(reemplaza_decision=created.data["id"]),
            format="json",
        )
        history = self.client.get(self.decisions_url())

        self.assertEqual(replacement.status_code, status.HTTP_200_OK)
        self.assertEqual(history.status_code, status.HTTP_200_OK)
        self.assertEqual(len(history.data), 2)
        self.assertEqual([item["activo"] for item in history.data], [False, True])
        self.assertEqual(history.data[0]["resultado"], self.result)

    def test_api_rechaza_codigo_o_resultado_fuera_de_policy(self):
        self.client.force_authenticate(self.admin)
        invalid_code = self.client.post(self.register_url(), self.payload(codigo="NO_DECLARADO"), format="json")
        invalid_result = self.client.post(self.register_url(), self.payload(resultado="NO_DECLARADO"), format="json")

        self.assertEqual(invalid_code.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(invalid_result.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(DecisionAcademicaEtapa.all_objects.count(), 0)

    def test_api_rechaza_participante_de_otra_postulacion(self):
        other_student = CustomUser.objects.create_user(username="decision-api-other-student")
        other_post = self._postulacion("DECISION-API-OTHER", other_student)
        foreign_assignment = self._assignment(other_post, self.participant_one, 3)
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            self.register_url(),
            self.payload(participantes=[
                {"asignacion": foreign_assignment.pk, "rol": "TRIBUNAL", "orden": 1},
                {"asignacion": self.assignment_two.pk, "rol": "TRIBUNAL", "orden": 2},
            ]),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(DecisionAcademicaEtapa.all_objects.count(), 0)

    def test_solo_administracion_puede_registrar_y_propietario_consultar(self):
        self.client.force_authenticate(self.student)
        denied = self.client.post(self.register_url(), self.payload(), format="json")
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

        decision = self.registrar()
        visible = self.client.get(self.decisions_url())
        self.assertEqual(visible.status_code, status.HTTP_200_OK)
        self.assertEqual(visible.data[0]["id"], decision.pk)

    def test_endpoint_rechaza_decision_anterior_de_otro_seguimiento(self):
        previous = self.registrar()
        other_student = CustomUser.objects.create_user(username="decision-api-third-student")
        other_post = self._postulacion("DECISION-API-THIRD", other_student)
        other_follow = SeguimientoEtapa.objects.create(
            postulacion=other_post,
            etapa=self.stage,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
        )
        other_assignment_one = self._assignment(other_post, self.participant_one, 1)
        other_assignment_two = self._assignment(other_post, self.participant_two, 2)
        other_decision = DecisionAcademicaEtapaService.registrar(
            seguimiento=other_follow,
            codigo=self.decision_code,
            resultado=self.result,
            registrado_por=self.admin,
            participantes=[
                {"asignacion": other_assignment_one, "rol": "TRIBUNAL", "orden": 1},
                {"asignacion": other_assignment_two, "rol": "TRIBUNAL", "orden": 2},
            ],
        )
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            self.register_url(),
            self.payload(reemplaza_decision=other_decision.pk),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        previous.refresh_from_db()
        other_decision.refresh_from_db()
        self.assertTrue(previous.activo)
        self.assertTrue(other_decision.activo)