from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from drf_spectacular.generators import SchemaGenerator
from rest_framework.test import APITestCase

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.postulantes.models import (
    AsignacionPostulacion,
    EstadoPostulacion,
    EvaluacionDefensa,
    EventoDefensa,
    ParticipanteEvento,
    Postulacion,
    SeguimientoEtapa,
)
from apps.usuarios.models import AuditLog, Role


User = get_user_model()


class ConsultaDefensasContractTests(APITestCase):
    def setUp(self):
        role = Role.objects.create(codigo="DOCENTE", nombre="Docente")
        self.staff = User.objects.create_user("ht004-staff", role=role, is_staff=True)
        self.superuser = User.objects.create_superuser("ht004-super")
        self.owner = User.objects.create_user("ht004-owner", role=role)
        self.other_owner = User.objects.create_user("ht004-other-owner", role=role)
        self.active_actor = User.objects.create_user("ht004-active", role=role, nombres="Actor", apellido_paterno="Activo")
        self.historical_actor = User.objects.create_user("ht004-history", role=role)
        self.participant_user = User.objects.create_user("ht004-participant", role=role, nombres="María", apellido_paterno="Tribunal")
        self.unrelated = User.objects.create_user("ht004-unrelated", role=role)
        admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administrador")
        student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        self.staff.role = admin_role
        self.staff.save(update_fields=["role"])
        self.superuser.role = admin_role
        self.superuser.save(update_fields=["role"])
        for user in (self.owner, self.other_owner):
            user.role = student_role
            user.save(update_fields=["role"])
        self.modality = Modalidad.objects.create(codigo="PROYECTO_GRADO", nombre="Proyecto de Grado")
        self.period = Periodo.objects.create(
            nombre="2026-HT004", gestion=2026, semestre="II",
            fecha_inicio="2026-07-01", fecha_fin="2026-12-31",
        )
        state = EstadoPostulacion.objects.create(codigo="HT004", nombre="En proceso")
        self.post = Postulacion.objects.create(
            codigo="POST-HT004", estudiante=self.owner, modalidad=self.modality,
            periodo=self.period, estado_actual=state,
        )
        self.other_post = Postulacion.objects.create(
            codigo="POST-HT004-OTHER", estudiante=self.other_owner, modalidad=self.modality,
            periodo=self.period, estado_actual=state,
        )
        self.stages = {}
        self.other_stages = {}
        for order, code in enumerate(("PERFIL_PROYECTO", "DEFENSA_PRIVADA", "DEFENSA_PUBLICA"), 1):
            stage = EtapaModalidad.objects.create(
                modalidad=self.modality, codigo=code, nombre=code.replace("_", " ").title(),
                orden=order, origen_normativo="Contrato funcional",
            )
            self.stages[code] = SeguimientoEtapa.objects.create(postulacion=self.post, etapa=stage, estado="EN_PROCESO")
            self.other_stages[code] = SeguimientoEtapa.objects.create(postulacion=self.other_post, etapa=stage, estado="EN_PROCESO")
        self.active_assignment = AsignacionPostulacion.objects.create(
            postulacion=self.post, usuario=self.active_actor, tipo_participacion="TUTOR", designado_por=self.staff,
        )
        historical = AsignacionPostulacion.objects.create(
            postulacion=self.post, usuario=self.historical_actor, tipo_participacion="TUTOR", designado_por=self.staff,
        )
        historical.activo = False
        historical.save(update_fields=["activo"])
        self.participant_assignment = AsignacionPostulacion.objects.create(
            postulacion=self.post, usuario=self.participant_user, tipo_participacion="TRIBUNAL", designado_por=self.staff,
        )
        base = timezone.now().replace(microsecond=0)
        self.events = []
        types = ("DEFENSA_PERFIL", "DEFENSA_PRIVADA", "DEFENSA_PUBLICA")
        states = ("PROGRAMADA", "EN_CURSO", "FINALIZADA", "SUSPENDIDA", "CANCELADA")
        stage_for = {
            "DEFENSA_PERFIL": "PERFIL_PROYECTO",
            "DEFENSA_PRIVADA": "DEFENSA_PRIVADA",
            "DEFENSA_PUBLICA": "DEFENSA_PUBLICA",
        }
        for index in range(21):
            event_type = types[index % len(types)]
            event = EventoDefensa.objects.create(
                postulacion=self.post,
                seguimiento_etapa=self.stages[stage_for[event_type]],
                tipo_evento=event_type,
                numero_intento=index + 1,
                estado=states[index % len(states)],
                fecha_programada=base + timedelta(minutes=index),
                lugar="Sala técnica",
                programado_por=self.staff,
            )
            self.events.append(event)
        self.foreign_event = EventoDefensa.objects.create(
            postulacion=self.other_post,
            seguimiento_etapa=self.other_stages["PERFIL_PROYECTO"],
            tipo_evento="DEFENSA_PERFIL",
            fecha_programada=base + timedelta(days=1),
            lugar="Sala ajena",
            programado_por=self.staff,
        )
        self.event = self.events[-1]
        self.event.estado = EventoDefensa.Estado.EN_CURSO
        self.event.save(update_fields=["estado"])
        self.participant = ParticipanteEvento.objects.create(
            evento=self.event,
            asignacion=self.participant_assignment,
            rol_evento="TRIBUNAL",
            presente=True,
            fecha_registro_asistencia=base,
            registrado_por=self.staff,
            observaciones="Asistencia técnica",
        )
        EvaluacionDefensa.objects.create(
            evento=self.event,
            tipo_evaluacion="PUBLICA",
            modalidad_registro="CONSENSO",
            nota_numerica=Decimal("60.00"),
            ponderacion=Decimal("70.00"),
            aporte_ponderado=Decimal("60.00"),
            registrado_por=self.participant_user,
        )
        EvaluacionDefensa.objects.create(
            evento=self.event,
            tipo_evaluacion="RESULTADO_FINAL",
            modalidad_registro="CONSENSO",
            resultado_cualitativo="APROBADO",
            nota_numerica=Decimal("60.00"),
            ponderacion=Decimal("70.00"),
            aporte_ponderado=Decimal("60.00"),
            es_resultado_final_evento=True,
            registrado_por=self.staff,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user)

    def canonical(self, **params):
        return self.client.get("/api/v1/eventos-defensa/", params)

    def test_filter_is_exact_isolated_paginated_and_deterministic(self):
        self.authenticate(self.staff)
        response = self.canonical(postulacion=self.post.pk)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 21)
        self.assertEqual(len(response.data["results"]), 20)
        self.assertTrue(all(row["postulacion"] == self.post.pk for row in response.data["results"]))
        expected = list(
            EventoDefensa.objects.filter(postulacion=self.post)
            .order_by("-fecha_programada", "-id").values_list("id", flat=True)[:20]
        )
        self.assertEqual([row["id"] for row in response.data["results"]], expected)
        second = self.canonical(postulacion=self.post.pk, page=2)
        self.assertEqual(len(second.data["results"]), 1)
        self.assertNotIn(self.foreign_event.pk, expected)

    def test_safe_ordering_and_real_types_and_states(self):
        self.authenticate(self.owner)
        response = self.canonical(postulacion=self.post.pk, ordering="fecha_programada,id")
        rows = response.data["results"]
        self.assertEqual([row["id"] for row in rows], [event.pk for event in self.events[:20]])
        # El catálogo de EventoDefensa es compartido: DEFENSA_TEMATICA pertenece
        # a Tesis y no puede crearse válidamente para esta postulación PG.
        # La consulta debe conservar los tipos reales de su modalidad sin asumir
        # que la fixture PG instancia cada choice global.
        self.assertTrue({row["tipo_evento"] for row in rows}.issubset({choice for choice, _ in EventoDefensa.Tipo.choices}))
        self.assertEqual({row["estado"] for row in rows}, {choice for choice, _ in EventoDefensa.Estado.choices})

    def test_scope_matrix_and_context_endpoint_are_uniform(self):
        for user in (self.staff, self.superuser, self.owner, self.active_actor, self.historical_actor, self.participant_user):
            with self.subTest(user=user.username):
                self.authenticate(user)
                self.assertEqual(self.canonical(postulacion=self.post.pk).data["count"], 21)
                contextual = self.client.get(f"/api/v1/postulaciones/{self.post.pk}/eventos-defensa/")
                self.assertEqual(contextual.status_code, 200)
                self.assertEqual(len(contextual.data), 21)

    def test_unrelated_list_empty_and_detail_hidden_with_404(self):
        self.authenticate(self.unrelated)
        self.assertEqual(self.canonical(postulacion=self.post.pk).data["count"], 0)
        self.assertEqual(self.client.get(f"/api/v1/eventos-defensa/{self.event.pk}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/v1/eventos-defensa/{self.event.pk}/quorum/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/v1/postulaciones/{self.post.pk}/eventos-defensa/").status_code, 404)
        self.assertEqual(self.client.get("/api/v1/eventos-defensa/999999/").status_code, 404)

    def test_anonymous_receives_401(self):
        self.assertEqual(self.canonical(postulacion=self.post.pk).status_code, 401)
        self.assertEqual(self.client.get(f"/api/v1/eventos-defensa/{self.event.pk}/").status_code, 401)
        self.assertEqual(self.client.get(f"/api/v1/postulaciones/{self.post.pk}/eventos-defensa/").status_code, 401)
        self.assertEqual(self.client.get(f"/api/v1/eventos-defensa/{self.event.pk}/quorum/").status_code, 401)

    def test_readable_nested_contract_and_controlled_result_absence(self):
        self.authenticate(self.owner)
        detail = self.client.get(f"/api/v1/eventos-defensa/{self.event.pk}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["tipo_display"], "Defensa pública")
        self.assertEqual(detail.data["estado_display"], "En curso")
        self.assertEqual(detail.data["modalidad_display"], "Presencial")
        self.assertEqual(detail.data["postulacion_codigo"], "POST-HT004")
        self.assertEqual(detail.data["etapa_codigo"], "DEFENSA_PUBLICA")
        participant = detail.data["participantes"][0]
        self.assertEqual(participant["usuario_nombre"], "María Tribunal")
        self.assertEqual(participant["rol_display"], "Tribunal")
        self.assertTrue(participant["convocatoria"])
        self.assertTrue(participant["presente"])
        self.assertIsNotNone(participant["fecha_asistencia"])
        self.assertEqual(len(detail.data["evaluaciones"]), 2)
        self.assertIsNone(detail.data["evaluaciones"][0]["evaluador_nombre"])
        self.assertEqual(detail.data["resultado_consolidado"]["resultado_cualitativo"], "APROBADO")
        without_result = self.client.get(f"/api/v1/eventos-defensa/{self.events[0].pk}/")
        self.assertEqual(without_result.data["evaluaciones"], [])
        self.assertIsNone(without_result.data["resultado_consolidado"])

    def test_quorum_contract_valid_invalid_and_missing(self):
        self.authenticate(self.owner)
        url = f"/api/v1/eventos-defensa/{self.event.pk}/quorum/"
        invalid = self.client.get(url)
        self.assertFalse(invalid.data["valido"])
        self.assertEqual(invalid.data["conteos"]["TRIBUNAL"], 1)
        self.assertEqual(invalid.data["faltantes"], {"TRIBUNAL": 1, "PRESIDENTE": 1, "SECRETARIO": 1})
        self.assertEqual(invalid.data["detalle"], invalid.data["conteos"])
        for role, username in (("TRIBUNAL", "ht004-tribunal-2"), ("PRESIDENTE", "ht004-president"), ("SECRETARIO", "ht004-secretary")):
            user = User.objects.create_user(username, role=self.owner.role)
            assignment = AsignacionPostulacion.objects.create(
                postulacion=self.post, usuario=user, tipo_participacion=role, designado_por=self.staff,
            )
            ParticipanteEvento.objects.create(
                evento=self.event, asignacion=assignment, rol_evento=role, presente=True,
                fecha_registro_asistencia=timezone.now(), registrado_por=self.staff,
            )
        self.assertTrue(self.client.get(url).data["valido"])

    def test_get_does_not_audit_or_modify_and_has_bounded_queries(self):
        self.authenticate(self.staff)
        audit_before = AuditLog.objects.count()
        updated_before = self.event.updated_at
        with CaptureQueriesContext(connection) as queries:
            response = self.canonical(postulacion=self.post.pk)
        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(len(queries), 10)
        self.event.refresh_from_db()
        self.assertEqual(AuditLog.objects.count(), audit_before)
        self.assertEqual(self.event.updated_at, updated_before)

    def test_mutating_actions_keep_existing_permissions(self):
        self.authenticate(self.owner)
        self.assertEqual(self.client.post(f"/api/v1/eventos-defensa/{self.events[0].pk}/iniciar/").status_code, 403)
        self.authenticate(self.staff)
        self.assertEqual(self.client.post(f"/api/v1/eventos-defensa/{self.events[0].pk}/iniciar/").status_code, 200)

    def test_openapi_documents_canonical_filters_and_technical_quorum(self):
        schema = SchemaGenerator().get_schema(request=None, public=True)
        operation = schema["paths"]["/api/v1/eventos-defensa/"]["get"]
        names = {parameter["name"] for parameter in operation["parameters"]}
        self.assertTrue({"postulacion", "ordering", "page"}.issubset(names))
        quorum = schema["paths"]["/api/v1/eventos-defensa/{id}/quorum/"]["get"]
        self.assertIn("exclusivamente técnica", quorum["description"])
        properties = schema["components"]["schemas"]["EventoDefensa"]["properties"]
        self.assertTrue({"tipo_display", "estado_display", "modalidad_display", "resultado_consolidado"}.issubset(properties))
