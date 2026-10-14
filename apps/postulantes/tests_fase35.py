from django.test import TestCase
from rest_framework.test import APIRequestFactory

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.modalidades.proyecto_grado import ProyectoGradoPolicy
from apps.modalidades.policies import BaseModalidadPolicy
from apps.postulantes.asignaciones import AsignacionService
from apps.postulantes.decisiones_academicas import DecisionAcademicaEtapaService
from apps.postulantes.models import AsignacionPostulacion, EstadoPostulacion, Postulacion, SeguimientoEtapa
from apps.postulantes.serializers import FlujoPostulacionSerializer
from apps.usuarios.models import CustomUser, Role


class Fase35FlowContractTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administrador")
        teacher_role = Role.objects.create(codigo="DOCENTE", nombre="Docente")
        student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        cls.admin = CustomUser.objects.create_user("f35-admin", role=admin_role)
        cls.student = CustomUser.objects.create_user("f35-student", role=student_role)
        cls.other_student = CustomUser.objects.create_user("f35-other-student", role=student_role)
        cls.teachers = [CustomUser.objects.create_user(f"f35-teacher-{index}", role=teacher_role) for index in range(1, 5)]
        modalidad = Modalidad.objects.create(codigo="PROYECTO_GRADO", nombre="Proyecto de Grado F35")
        periodo = Periodo.objects.create(nombre="F35", gestion=2026, semestre="II", fecha_inicio="2026-01-01", fecha_fin="2026-12-31")
        estado = EstadoPostulacion.objects.create(codigo="EN_PROCESO_F35", nombre="En proceso")
        etapa = EtapaModalidad.objects.create(
            modalidad=modalidad, codigo="PERFIL_PROYECTO", nombre="Perfil", orden=1,
            origen_normativo="Contrato funcional Fase 3.5",
        )
        cls.postulacion = Postulacion.objects.create(
            codigo="F35-001", estudiante=cls.student, modalidad=modalidad, periodo=periodo, estado_actual=estado,
            regimen_workflow=Postulacion.RegimenWorkflowChoices.PG_HITOS_V1,
        )
        cls.seguimiento = SeguimientoEtapa.objects.create(postulacion=cls.postulacion, etapa=etapa, estado="EN_PROCESO")

    def flow(self, user):
        request = APIRequestFactory().get("/")
        request.user = user
        return FlujoPostulacionSerializer(self.postulacion, context={"request": request}).data

    def assign_tribunals(self):
        return [AsignacionPostulacion.objects.create(
            postulacion=self.postulacion, usuario=user, tipo_participacion="TRIBUNAL", orden_cargo=index,
            seguimiento_etapa=self.seguimiento, designado_por=self.admin,
        ) for index, user in enumerate(self.teachers[:3], start=1)]

    def prepare_private_defense(self):
        tribunals = self.assign_tribunals()
        DecisionAcademicaEtapaService.registrar(
            seguimiento=self.seguimiento,
            codigo="PROPUESTA_APROBADA",
            resultado="APROBADA",
            registrado_por=self.admin,
            participantes=[
                {"asignacion": item, "rol": "TRIBUNAL", "orden": index}
                for index, item in enumerate(tribunals, start=1)
            ],
        )
        AsignacionService.asignar_actor(
            self.postulacion, self.teachers[3], "TUTOR", self.admin,
        )
        self.seguimiento.estado = SeguimientoEtapa.EstadoChoices.APROBADA
        self.seguimiento.save(update_fields=["estado", "updated_at"])
        etapa_privada = EtapaModalidad.objects.create(
            modalidad=self.postulacion.modalidad,
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
        return seguimiento_privado, tribunals

    def test_default_policy_has_no_academic_decisions(self):
        self.assertEqual(BaseModalidadPolicy().get_decisiones_academicas_permitidas("CUALQUIERA"), ())
        self.assertEqual(BaseModalidadPolicy().get_configuracion_actores(), {})

    def test_project_tribunal_positions_share_declared_identity_restriction(self):
        positions = self.flow(self.admin)["gestion_actores"]["posiciones"]
        tribunal_positions = [item for item in positions if item["tipo_participacion"] == "TRIBUNAL"]
        expected = {"grupo": "TRIBUNAL_PERFIL", "unica_persona": True}

        self.assertEqual(len(tribunal_positions), 3)
        self.assertTrue(all(item["restriccion_identidad"] == expected for item in tribunal_positions))
        tutor = next(item for item in positions if item["tipo_participacion"] == "TUTOR")
        self.assertIsNone(tutor["restriccion_identidad"])

    def test_distinct_identity_groups_project_distinct_metadata(self):
        serializer = FlujoPostulacionSerializer(self.postulacion)
        restrictions = []
        for group in ("GRUPO_A", "GRUPO_B"):
            restrictions.append(serializer._proyectar_posicion(
                obj=self.postulacion,
                grupo={"clave": group, "restriccion_identidad": {"grupo": group, "unica_persona": True}},
                tipo="ACTOR",
                ambito="POSTULACION",
                orden=None,
                asignacion=None,
                is_admin=True,
                configuracion_posicion={"clave": f"{group}_1", "nombre": group},
            )["restriccion_identidad"])

        self.assertEqual(restrictions, [
            {"grupo": "GRUPO_A", "unica_persona": True},
            {"grupo": "GRUPO_B", "unica_persona": True},
        ])

    def test_flow_returns_empty_decision_contract_without_policy(self):
        modalidad = Modalidad.objects.create(codigo="MODALIDAD_SIN_POLICY_F35", nombre="Sin policy")
        etapa = EtapaModalidad.objects.create(
            modalidad=modalidad, codigo="ETAPA_UNICA", nombre="Etapa", orden=1,
            origen_normativo="Prueba de contrato genérico",
        )
        postulacion = Postulacion.objects.create(
            codigo="F35-SIN-POLICY", estudiante=self.other_student, modalidad=modalidad,
            periodo=self.postulacion.periodo, estado_actual=self.postulacion.estado_actual,
        )
        SeguimientoEtapa.objects.create(postulacion=postulacion, etapa=etapa, estado="EN_PROCESO")

        data = FlujoPostulacionSerializer(postulacion).data

        self.assertEqual(data["gestion_decisiones_academicas"], {"contexto": None, "decisiones": []})
        self.assertEqual(data["gestion_actores"], {})

    def test_incomplete_composition_blocks_decision_and_orients_to_actors(self):
        data = self.flow(self.admin)
        decision = data["gestion_decisiones_academicas"]["decisiones"][0]
        self.assertEqual(decision["estado"], "PENDIENTE")
        self.assertFalse(decision["habilitada"])
        self.assertEqual(decision["acciones_permitidas"], [])
        self.assertEqual(decision["bloqueo"]["codigo"], "COMPOSICION_PARTICIPANTES_INCOMPLETA")
        self.assertEqual(data["orientacion_etapa_actual"]["siguiente_accion"]["codigo"], "GESTIONAR_ACTORES")
        tribunal = next(item for item in data["gestion_actores"]["posiciones"] if item["tipo_participacion"] == "TRIBUNAL")
        self.assertIsNone(tribunal["asignacion_actual"])
        self.assertIsNone(tribunal["asignacion_actual_detalle"])

    def test_complete_composition_exposes_exact_participants_and_admin_action(self):
        assignments = self.assign_tribunals()
        data = self.flow(self.admin)
        decision = data["gestion_decisiones_academicas"]["decisiones"][0]
        self.assertTrue(decision["habilitada"])
        self.assertEqual(decision["acciones_permitidas"], ["REGISTRAR"])
        self.assertEqual(decision["memorandum_designacion"]["tipo_documento"], "MEMORANDUM_DESIGNACION_PROYECTO")
        self.assertEqual(decision["memorandum_designacion"]["decision_academica"], "PROPUESTA_APROBADA")
        self.assertTrue(decision["memorandum_designacion"]["publicacion_independiente"])
        self.assertIsNone(data["gestion_decisiones_academicas"]["memorandum_designacion_contextual"])
        self.assertEqual([item["asignacion"] for item in decision["participantes_disponibles"]], [item.pk for item in assignments])
        self.assertEqual([item["orden"] for item in decision["participantes_disponibles"]], [1, 2, 3])
        self.assertEqual(data["orientacion_etapa_actual"]["siguiente_accion"]["codigo"], "REGISTRAR_DECISION")
        tribunal = next(item for item in data["gestion_actores"]["posiciones"] if item["orden_cargo"] == 1)
        self.assertEqual(tribunal["asignacion_actual_detalle"]["id"], assignments[0].pk)
        self.assertEqual(tribunal["asignacion_actual_detalle"]["usuario"], {
            "id": self.teachers[0].pk,
            "nombre": self.teachers[0].username,
        })
        self.assertEqual(tribunal["asignacion_actual_detalle"]["ambito"], "ETAPA")
        regular = self.flow(self.student)["gestion_decisiones_academicas"]["decisiones"][0]
        self.assertEqual(regular["acciones_permitidas"], [])

    def test_assignment_from_another_stage_does_not_occupy_current_position(self):
        other_stage = EtapaModalidad.objects.create(
            modalidad=self.postulacion.modalidad, codigo="DEFENSA_PRIVADA", nombre="Defensa Privada", orden=2,
            origen_normativo="Contrato de actores por etapa",
        )
        other_follow = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion, etapa=other_stage, estado="PENDIENTE",
        )
        AsignacionPostulacion.objects.create(
            postulacion=self.postulacion, usuario=self.teachers[0], tipo_participacion="TRIBUNAL",
            orden_cargo=1, seguimiento_etapa=other_follow, designado_por=self.admin,
        )

        data = self.flow(self.admin)
        tribunal = next(item for item in data["gestion_actores"]["posiciones"] if item["orden_cargo"] == 1)

        self.assertEqual(tribunal["estado_ocupacion"], "VACANTE")
        self.assertIsNone(tribunal["asignacion_actual"])
        self.assertIsNone(tribunal["asignacion_actual_detalle"])

    def test_profile_positions_are_not_projected_in_another_current_stage(self):
        self.seguimiento.estado = "APROBADA"
        self.seguimiento.save(update_fields=["estado", "updated_at"])
        other_stage = EtapaModalidad.objects.create(
            modalidad=self.postulacion.modalidad, codigo="DEFENSA_PRIVADA", nombre="Defensa Privada", orden=2,
            origen_normativo="Contrato de actores por etapa",
        )
        SeguimientoEtapa.objects.create(
            postulacion=self.postulacion, etapa=other_stage, estado="EN_PROCESO",
        )

        data = self.flow(self.admin)

        self.assertEqual(data["etapa_actual"]["codigo"], "DEFENSA_PRIVADA")
        self.assertFalse(any(
            item["tipo_participacion"] == "TRIBUNAL"
            for item in data["gestion_actores"]["posiciones"]
        ))
        self.assertTrue(any(
            item["tipo_participacion"] == "TUTOR"
            for item in data["gestion_actores"]["posiciones"]
        ))

    def test_private_defense_actor_contract_matches_pending_operational_requirement(self):
        seguimiento_privado, tribunals = self.prepare_private_defense()

        data = self.flow(self.admin)
        requisitos = {item["codigo"]: item for item in data["orientacion_etapa_actual"]["requisitos"]}
        posiciones = data["gestion_actores"]["posiciones"]
        docente = next(item for item in posiciones if item["tipo_participacion"] == "DOCENTE_MODALIDAD")
        tutor = next(item for item in posiciones if item["tipo_participacion"] == "TUTOR")

        self.assertEqual(data["etapa_actual"]["codigo"], "DEFENSA_PRIVADA")
        self.assertEqual(requisitos["TRIBUNAL"]["actual"], 3)
        self.assertEqual(requisitos["TRIBUNAL"]["minimo"], 2)
        self.assertTrue(requisitos["TRIBUNAL"]["cumplido"])
        self.assertEqual(requisitos["DOCENTE_MODALIDAD"]["actual"], 0)
        self.assertEqual(requisitos["DOCENTE_MODALIDAD"]["minimo"], 1)
        self.assertFalse(requisitos["DOCENTE_MODALIDAD"]["cumplido"])
        self.assertEqual(data["orientacion_etapa_actual"]["siguiente_accion"]["codigo"], "GESTIONAR_ACTORES")
        self.assertEqual(docente["clave"], "DOCENTE_MODALIDAD_DEFENSA_PRIVADA_1")
        self.assertEqual(docente["orden_cargo"], None)
        self.assertEqual(docente["obligatoriedad"], True)
        self.assertEqual(docente["ambito"], "ETAPA")
        self.assertEqual(docente["seguimiento_etapa"], seguimiento_privado.pk)
        self.assertEqual(docente["estado_ocupacion"], "VACANTE")
        self.assertEqual(docente["acciones_permitidas"], ["ASIGNAR"])
        self.assertIsNone(docente["restriccion_identidad"])
        self.assertEqual(tutor["ambito"], "POSTULACION")
        self.assertEqual(tutor["estado_ocupacion"], "ASIGNADA")
        self.assertEqual(tutor["asignacion_actual_detalle"]["usuario"]["id"], self.teachers[3].pk)
        self.assertIsNone(tutor["restriccion_identidad"])
        self.assertFalse(any(item["tipo_participacion"] == "TRIBUNAL" for item in posiciones))
        self.assertEqual(len(tribunals), 3)
        self.assertEqual(ProyectoGradoPolicy().evento_policy.ASSIGNMENTS["DEFENSA_PRIVADA"]["TRIBUNAL"], 2)

    def test_private_defense_docente_projection_supports_assignment_replacement_and_read_only_users(self):
        seguimiento_privado, _tribunals = self.prepare_private_defense()
        docente_libre = CustomUser.objects.create_user(
            "f35-docente-modalidad-libre",
            role=self.teachers[0].role,
        )
        docente_asignado = AsignacionService.asignar_actor(
            self.postulacion,
            docente_libre,
            "DOCENTE_MODALIDAD",
            self.admin,
            seguimiento_etapa=seguimiento_privado,
        )

        admin_data = self.flow(self.admin)
        regular_data = self.flow(self.student)
        admin_position = next(
            item for item in admin_data["gestion_actores"]["posiciones"]
            if item["tipo_participacion"] == "DOCENTE_MODALIDAD"
        )
        regular_position = next(
            item for item in regular_data["gestion_actores"]["posiciones"]
            if item["tipo_participacion"] == "DOCENTE_MODALIDAD"
        )

        self.assertEqual(admin_position["estado_ocupacion"], "ASIGNADA")
        self.assertEqual(admin_position["asignacion_actual"], docente_asignado.pk)
        self.assertEqual(admin_position["asignacion_actual_detalle"]["usuario"]["id"], docente_libre.pk)
        self.assertEqual(admin_position["asignacion_actual_detalle"]["seguimiento_etapa"], seguimiento_privado.pk)
        self.assertEqual(admin_position["acciones_permitidas"], ["REEMPLAZAR", "FINALIZAR"])
        self.assertEqual(regular_position["acciones_permitidas"], [])

    def test_private_defense_operational_actor_counts_and_profile_quorum_are_unchanged(self):
        policy = ProyectoGradoPolicy()
        self.assertEqual(policy.evento_policy.ASSIGNMENTS["DEFENSA_PRIVADA"], {"TRIBUNAL": 2, "DOCENTE_MODALIDAD": 1})
        self.assertEqual(policy.evento_policy.ASSIGNMENTS["DEFENSA_PERFIL"]["TRIBUNAL"], 2)

    def test_registered_decision_completes_contract_enables_tutor_and_orients_to_actors(self):
        assignments = self.assign_tribunals()
        DecisionAcademicaEtapaService.registrar(
            seguimiento=self.seguimiento, codigo="PROPUESTA_APROBADA", resultado="APROBADA", registrado_por=self.admin,
            participantes=[{"asignacion": item, "rol": "TRIBUNAL", "orden": index} for index, item in enumerate(assignments, start=1)],
        )
        data = self.flow(self.admin)
        decision = data["gestion_decisiones_academicas"]["decisiones"][0]
        tutor = next(item for item in data["gestion_actores"]["posiciones"] if item["tipo_participacion"] == "TUTOR")
        self.assertTrue(decision["cumplida"])
        self.assertEqual(decision["resultado_actual"], "APROBADA")
        self.assertEqual(decision["acciones_permitidas"], ["REEMPLAZAR"])
        self.assertTrue(tutor["habilitada"])
        self.assertEqual(tutor["acciones_permitidas"], ["ASIGNAR"])
        self.assertEqual(data["orientacion_etapa_actual"]["siguiente_accion"]["codigo"], "GESTIONAR_ACTORES")

    def test_legacy_does_not_project_hit_decision(self):
        self.postulacion.regimen_workflow = Postulacion.RegimenWorkflowChoices.PG_LEGACY
        self.postulacion.save(update_fields=["regimen_workflow", "updated_at"])
        data = self.flow(self.admin)
        self.assertEqual(data["gestion_decisiones_academicas"]["decisiones"], [])
        tutor = next(item for item in data["gestion_actores"]["posiciones"] if item["tipo_participacion"] == "TUTOR")
        self.assertIsNone(tutor["precondicion"])

    def test_defensa_perfil_quorum_remains_two(self):
        policy = ProyectoGradoPolicy()
        self.assertEqual(policy.evento_policy.ASSIGNMENTS["DEFENSA_PERFIL"]["TRIBUNAL"], 2)
