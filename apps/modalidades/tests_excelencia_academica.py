from decimal import Decimal
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import RequestFactory, TestCase

from apps.academico.models import Modalidad, Periodo
from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, TipoDocumento, VersionDocumento
from apps.modalidades.excelencia_academica import ExcelenciaAcademicaPolicy
from apps.modalidades.excelencia_academica_service import ExcelenciaAcademicaService
from apps.modalidades.models import ExcelenciaExpediente
from apps.postulantes.asignaciones import AsignacionService
from apps.postulantes.models import AsignacionPostulacion, EstadoPostulacion, Postulacion, SeguimientoEtapa
from apps.postulantes.serializers import FlujoPostulacionSerializer
from apps.postulantes.workflow import WorkflowService
from apps.usuarios.models import CustomUser, Role


class ExcelenciaAcademicaTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_initial_data", verbosity=0)
        admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Excelencia admin")
        cls.teacher_role = Role.objects.create(codigo="DOCENTE", nombre="Docente")
        student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        cls.admin = CustomUser.objects.create_user("excelencia-admin", password="x", role=admin_role, is_staff=True, ci="EXC-1", ru="EXC-R1")
        cls.student = CustomUser.objects.create_user("excelencia-student", password="x", role=student_role, ci="EXC-2", ru="EXC-R2")
        cls.post = Postulacion.objects.create(
            codigo="EXC-TEST-001", estudiante=cls.student,
            modalidad=Modalidad.objects.get(codigo="EXCELENCIA_ACADEMICA"),
            periodo=Periodo.objects.create(nombre="EXC-2026", gestion=2026, semestre="II", fecha_inicio="2026-01-01", fecha_fin="2026-12-31"),
            estado_actual=EstadoPostulacion.objects.get(codigo="REGISTRADA"),
        )

    def setUp(self):
        self.follow = {item.etapa.codigo: item for item in WorkflowService.inicializar_flujo(self.post, self.admin)}
        self.actor_users = []
        for index, role in enumerate(("PRESIDENTE", "SECRETARIO", "TRIBUNAL", "TRIBUNAL", "DIRECTOR_INSTITUTO_INVESTIGACION"), start=1):
            user = CustomUser.objects.create_user(
                f"excelencia-actor-{self._testMethodName}-{index}", password="x",
                role=self.teacher_role, ci=f"EXC-{self._testMethodName[:4]}{index}", ru=f"EXC-R{self._testMethodName[:4]}{index}",
            )
            self.actor_users.append(user)
            AsignacionService.asignar_actor(
                self.post, user, role, self.admin,
                orden_cargo=index - 2 if role == "TRIBUNAL" else None,
            )

    def _configure(self, criterion):
        return ExcelenciaAcademicaService.configurar_criterio(self.post, criterion)

    def _gestion_actores(self):
        request = RequestFactory().get("/")
        request.user = self.admin
        return FlujoPostulacionSerializer(
            self.post,
            context={"request": request},
        ).data["gestion_actores"]

    def _documents(self, codes):
        approved = EstadoDocumento.objects.get(codigo="APR")
        for code in codes:
            document = DocumentoPostulacion.objects.create(
                postulacion=self.post, tipo_documento=TipoDocumento.objects.get(codigo=code), estado=approved,
            )
            VersionDocumento.objects.create(
                documento=document, subido_por=self.admin, numero_version=1,
                archivo=SimpleUploadedFile(f"{code}.pdf", b"pdf"), nombre_original=f"{code}.pdf",
                tamano_bytes=3, hash_sha256="a" * 64, es_version_actual=True,
            )

    def _approve(self, code):
        stage = SeguimientoEtapa.objects.get(postulacion=self.post, etapa__codigo=code, numero_intento=1)
        WorkflowService.iniciar_etapa(stage, self.admin)
        return WorkflowService.aprobar_etapa(stage, self.admin)

    def _prepare_evaluation(self, criterion):
        self._configure(criterion)
        self._documents([
            "CARTA_EXCELENCIA", "RECIBO_MATRICULA_EXC",
            "HISTORIAL_EXCELENCIA", "FOLDER_EXCELENCIA",
            "CERT_PLANIFICACION", "SOLVENCIA_UNIV",
            "SOLVENCIA_BIBLIO", "TIMBRE_EXCELENCIA",
        ] + (["CERT_DIR_CARRERA", "CERT_INST_INVEST"] if criterion == ExcelenciaExpediente.Criterio.RECONOCIMIENTO_CALIDAD else []))
        self._approve("INSCRIPCION")
        self._approve("REVISION_REQUISITOS")
        stage = self.follow["EVALUACION_TRIBUNAL"]
        WorkflowService.iniciar_etapa(stage, self.admin)
        return stage

    def test_policy_declara_cinco_etapas_y_actores_normativos(self):
        policy = ExcelenciaAcademicaPolicy()
        self.assertEqual([stage.codigo for stage in policy.etapas], ["INSCRIPCION", "REVISION_REQUISITOS", "EVALUACION_TRIBUNAL", "REGISTRO_ACTA", "CONCLUSION_ACADEMICA"])
        self.assertEqual(policy.get_reglas_asignacion()["DIRECTOR_INSTITUTO_INVESTIGACION"], 1)
        self.assertEqual(policy.get_documentos_requeridos("REGISTRO_ACTA"), ("ACTA_EXCELENCIA",))

    def test_gestion_actores_proyecta_las_cinco_posiciones_canonicas(self):
        gestion = self._gestion_actores()
        posiciones = gestion["posiciones"]

        self.assertEqual(len(posiciones), 5)
        self.assertEqual(
            [item["clave"] for item in posiciones],
            [
                "TRIBUNAL_EXCELENCIA_1",
                "TRIBUNAL_EXCELENCIA_2",
                "PRESIDENTE_EXCELENCIA_1",
                "SECRETARIO_EXCELENCIA_1",
                "DIRECTOR_INSTITUTO_INVESTIGACION_EXCELENCIA_1",
            ],
        )
        self.assertEqual(
            [item["tipo_participacion"] for item in posiciones],
            [
                "TRIBUNAL",
                "TRIBUNAL",
                "PRESIDENTE",
                "SECRETARIO",
                "DIRECTOR_INSTITUTO_INVESTIGACION",
            ],
        )
        self.assertEqual(
            [item["orden_cargo"] for item in posiciones],
            [1, 2, None, None, None],
        )
        self.assertEqual(
            [item["nombre"] for item in posiciones],
            [
                "Tribunal docente 1",
                "Tribunal docente 2",
                "Presidente",
                "Secretario",
                "Director del Instituto de Investigación",
            ],
        )
        self.assertTrue(all(item["ambito"] == "POSTULACION" for item in posiciones))
        self.assertTrue(all(item["seguimiento_etapa"] is None for item in posiciones))
        self.assertTrue(all(item["estado_ocupacion"] == "ASIGNADA" for item in posiciones))
        self.assertTrue(all(item["acciones_permitidas"] == ["REEMPLAZAR", "FINALIZAR"] for item in posiciones))
        tribunales = [item for item in posiciones if item["tipo_participacion"] == "TRIBUNAL"]
        otras_posiciones = [item for item in posiciones if item["tipo_participacion"] != "TRIBUNAL"]
        self.assertTrue(all(item["restriccion_identidad"] == {
            "grupo": "TRIBUNAL_EXCELENCIA",
            "unica_persona": True,
        } for item in tribunales))
        self.assertTrue(all(item["ocupacion_actor"] == {
            "aplica": True,
            "ambito": "POSTULACION",
            "motivo": "YA_TIENE_ASIGNACION_VIGENTE_COMO_TRIBUNAL_EXCELENCIA",
            "relevantes": ["TRIBUNAL"],
        } for item in tribunales))
        self.assertTrue(all(item["restriccion_identidad"] is None for item in otras_posiciones))
        self.assertTrue(all(item["ocupacion_actor"] is None for item in otras_posiciones))

    def test_candidatos_tribunal_muestran_ocupado_y_mantienen_otro_elegible(self):
        self.post.asignaciones.update(activo=False)
        tribunal_1 = CustomUser.objects.create_user(
            f"excelencia-tribunal-1-{self._testMethodName}",
            password="x",
            role=self.teacher_role,
            ci="EXC-TRIB-1",
            ru="EXC-TRIB-R1",
        )
        candidato_libre = CustomUser.objects.create_user(
            f"excelencia-tribunal-2-{self._testMethodName}",
            password="x",
            role=self.teacher_role,
            ci="EXC-TRIB-2",
            ru="EXC-TRIB-R2",
        )
        AsignacionService.asignar_actor(
            self.post,
            tribunal_1,
            "TRIBUNAL",
            self.admin,
            orden_cargo=1,
        )

        candidatos = AsignacionService.obtener_candidatos_elegibles(
            self.post,
            "TRIBUNAL",
            2,
            seguimiento_etapa=None,
        )
        estados = {item.pk: item for item in candidatos}

        self.assertIn(tribunal_1.pk, estados)
        self.assertFalse(estados[tribunal_1.pk].elegible)
        self.assertEqual(
            estados[tribunal_1.pk].motivo_bloqueo,
            "YA_TIENE_ASIGNACION_VIGENTE_COMO_TRIBUNAL_EXCELENCIA",
        )
        self.assertEqual(estados[tribunal_1.pk].asignaciones_vigentes, ["Tribunal 1"])
        self.assertIn(candidato_libre.pk, estados)
        self.assertTrue(estados[candidato_libre.pk].elegible)
        self.assertIsNone(estados[candidato_libre.pk].motivo_bloqueo)
        self.assertEqual(estados[candidato_libre.pk].asignaciones_vigentes, [])

    def test_ocupacion_tribunal_no_crea_exclusividad_con_otras_categorias(self):
        self.post.asignaciones.update(activo=False)
        actor = self.actor_users[0]
        AsignacionService.asignar_actor(self.post, actor, "PRESIDENTE", self.admin)

        candidatos_tribunal = {
            item.pk: item
            for item in AsignacionService.obtener_candidatos_elegibles(
                self.post,
                "TRIBUNAL",
                1,
                seguimiento_etapa=None,
            )
        }
        self.assertTrue(candidatos_tribunal[actor.pk].elegible)

        AsignacionService.asignar_actor(
            self.post,
            actor,
            "TRIBUNAL",
            self.admin,
            orden_cargo=1,
        )
        for tipo in ("PRESIDENTE", "SECRETARIO", "DIRECTOR_INSTITUTO_INVESTIGACION"):
            if tipo == "PRESIDENTE":
                self.post.asignaciones.filter(tipo_participacion=tipo).update(activo=False)
            with self.subTest(tipo=tipo):
                candidatos = {
                    item.pk: item
                    for item in AsignacionService.obtener_candidatos_elegibles(
                        self.post,
                        tipo,
                        None,
                        seguimiento_etapa=None,
                    )
                }
                self.assertIn(actor.pk, candidatos)
                self.assertTrue(candidatos[actor.pk].elegible)
                self.assertIsNone(candidatos[actor.pk].motivo_bloqueo)

    def test_backend_rechaza_reutilizar_persona_entre_tribunal_uno_y_dos(self):
        self.post.asignaciones.update(activo=False)
        actor = self.actor_users[0]
        AsignacionService.asignar_actor(
            self.post,
            actor,
            "TRIBUNAL",
            self.admin,
            orden_cargo=1,
        )

        with self.assertRaisesMessage(
            ValidationError,
            "El usuario ya tiene una asignación activa como TRIBUNAL en el mismo contexto.",
        ):
            AsignacionService.asignar_actor(
                self.post,
                actor,
                "TRIBUNAL",
                self.admin,
                orden_cargo=2,
            )

    def test_motor_consulta_candidatos_y_asigna_cada_posicion_en_postulacion(self):
        self.post.asignaciones.update(activo=False)
        posiciones = (
            ("TRIBUNAL", 1),
            ("TRIBUNAL", 2),
            ("PRESIDENTE", None),
            ("SECRETARIO", None),
            ("DIRECTOR_INSTITUTO_INVESTIGACION", None),
        )

        for index, (tipo, orden) in enumerate(posiciones, start=1):
            candidato = CustomUser.objects.create_user(
                f"excelencia-candidato-{self._testMethodName}-{index}",
                password="x",
                role=self.teacher_role,
                ci=f"EXC-CAND-{index}",
                ru=f"EXC-CAND-R{index}",
            )
            candidatos = list(AsignacionService.obtener_candidatos_elegibles(
                self.post,
                tipo,
                orden,
                seguimiento_etapa=None,
            ))
            self.assertIn(candidato.pk, [item.pk for item in candidatos])

            asignacion = AsignacionService.asignar_actor(
                self.post,
                candidato,
                tipo,
                self.admin,
                orden_cargo=orden,
            )
            self.assertEqual(asignacion.tipo_participacion, tipo)
            self.assertEqual(asignacion.orden_cargo, orden)
            self.assertIsNone(asignacion.seguimiento_etapa_id)

        self.assertEqual(
            AsignacionPostulacion.objects.filter(postulacion=self.post, activo=True).count(),
            5,
        )
        self.assertTrue(all(
            item["estado_ocupacion"] == "ASIGNADA"
            for item in self._gestion_actores()["posiciones"]
        ))

    def test_no_admite_duplicar_posicion_ni_agregar_tribunal_tres(self):
        candidato = CustomUser.objects.create_user(
            f"excelencia-extra-{self._testMethodName}",
            password="x",
            role=self.teacher_role,
            ci="EXC-EXTRA",
            ru="EXC-EXTRA-R",
        )

        with self.assertRaises(ValidationError):
            AsignacionService.asignar_actor(
                self.post,
                candidato,
                "TRIBUNAL",
                self.admin,
                orden_cargo=1,
            )
        with self.assertRaisesMessage(ValidationError, "órdenes 1 y 2"):
            AsignacionService.asignar_actor(
                self.post,
                candidato,
                "TRIBUNAL",
                self.admin,
                orden_cargo=3,
            )

        for tipo in ("PRESIDENTE", "SECRETARIO", "DIRECTOR_INSTITUTO_INVESTIGACION"):
            with self.subTest(tipo=tipo), self.assertRaises(ValidationError):
                AsignacionService.asignar_actor(
                    self.post,
                    candidato,
                    tipo,
                    self.admin,
                )

        tribunales = [
            item for item in self._gestion_actores()["posiciones"]
            if item["tipo_participacion"] == "TRIBUNAL"
        ]
        self.assertEqual([item["orden_cargo"] for item in tribunales], [1, 2])
        self.assertNotIn("ASIGNAR", tribunales[0]["acciones_permitidas"])

    def test_no_exige_exclusividad_entre_categorias_distintas(self):
        self.post.asignaciones.update(activo=False)
        actor = self.actor_users[0]

        presidente = AsignacionService.asignar_actor(
            self.post,
            actor,
            "PRESIDENTE",
            self.admin,
        )
        self.assertEqual(presidente.tipo_participacion, "PRESIDENTE")

        candidatos = AsignacionService.obtener_candidatos_elegibles(
            self.post,
            "SECRETARIO",
            None,
            seguimiento_etapa=None,
        )
        self.assertIn(actor.pk, [item.pk for item in candidatos])
        secretario = AsignacionService.asignar_actor(
            self.post,
            actor,
            "SECRETARIO",
            self.admin,
        )
        self.assertEqual(secretario.tipo_participacion, "SECRETARIO")

    def test_validacion_academica_conserva_la_composicion_completa(self):
        policy = ExcelenciaAcademicaPolicy()
        policy._validate_tribunal(self.post)

        self.post.asignaciones.filter(
            tipo_participacion="DIRECTOR_INSTITUTO_INVESTIGACION",
            activo=True,
        ).update(activo=False)
        with self.assertRaisesMessage(ValidationError, "DIRECTOR_INSTITUTO_INVESTIGACION: 0/1"):
            policy._validate_tribunal(self.post)

    def test_orientacion_dirige_a_gestionar_actores_si_falta_un_actor(self):
        self._configure(ExcelenciaExpediente.Criterio.RENDIMIENTO_ACADEMICO)
        self.post.asignaciones.filter(tipo_participacion="TRIBUNAL").update(activo=False)

        orientation = ExcelenciaAcademicaPolicy().get_orientacion_etapa_actual(
            postulacion=self.post,
            seguimiento=self.follow["EVALUACION_TRIBUNAL"],
        )

        action = orientation["siguiente_accion"]
        self.assertEqual(action["codigo"], "GESTIONAR_ACTORES")
        self.assertEqual(action["titulo"], "Gestionar actores")
        self.assertEqual(action["accion_label"], "Gestionar actores")
        self.assertEqual(action["estado"], "PENDIENTE")
        self.assertEqual(action["destino"], "#actores")

    def test_orientacion_habilita_evaluacion_con_requisitos_completos(self):
        self._configure(ExcelenciaExpediente.Criterio.RENDIMIENTO_ACADEMICO)

        orientation = ExcelenciaAcademicaPolicy().get_orientacion_etapa_actual(
            postulacion=self.post,
            seguimiento=self.follow["EVALUACION_TRIBUNAL"],
        )

        action = orientation["siguiente_accion"]
        self.assertEqual(action["codigo"], "REGISTRAR_EVALUACION_EXCELENCIA")
        self.assertEqual(action["estado"], "DISPONIBLE")
        self.assertEqual(action["destino"], "#excelencia")

    def test_orientacion_no_habilita_evaluacion_con_otro_requisito_pendiente(self):
        self._configure(ExcelenciaExpediente.Criterio.RENDIMIENTO_ACADEMICO)
        policy = ExcelenciaAcademicaPolicy()
        requirements = [
            {"tipo": "ACTOR", "codigo": "TRIBUNAL", "cumplido": True},
            {"tipo": "ACADEMICO", "codigo": "BLOQUEO_ACADEMICO", "cumplido": False},
        ]
        with patch.object(policy, "_stage_requirements", return_value=requirements):
            orientation = policy.get_orientacion_etapa_actual(
                postulacion=self.post,
                seguimiento=self.follow["EVALUACION_TRIBUNAL"],
            )

        action = orientation["siguiente_accion"]
        self.assertEqual(action["codigo"], "REGISTRAR_EVALUACION_EXCELENCIA")
        self.assertEqual(action["estado"], "PENDIENTE")
        self.assertNotEqual(action["estado"], "DISPONIBLE")

    def test_criterio_inmutable_al_iniciar_flujo(self):
        self._configure(ExcelenciaExpediente.Criterio.RENDIMIENTO_ACADEMICO)
        self._documents(["CARTA_EXCELENCIA", "RECIBO_MATRICULA_EXC", "HISTORIAL_EXCELENCIA", "FOLDER_EXCELENCIA"])
        self._approve("INSCRIPCION")
        with self.assertRaises(ValidationError):
            ExcelenciaAcademicaService.configurar_criterio(self.post, ExcelenciaExpediente.Criterio.RECONOCIMIENTO_CALIDAD)

    def test_rendimiento_requiere_80_y_no_inventa_kardex(self):
        self._prepare_evaluation(ExcelenciaExpediente.Criterio.RENDIMIENTO_ACADEMICO)
        with self.assertRaisesMessage(ValidationError, "igual o superior a 80"):
            ExcelenciaAcademicaService.registrar_evaluacion(self.post, self.admin, "FAVORABLE", Decimal("79.99"))
        result = ExcelenciaAcademicaService.registrar_evaluacion(self.post, self.admin, "FAVORABLE", Decimal("80.00"))
        self.assertEqual(result.promedio_general, Decimal("80.00"))
        self.assertEqual(result.resultado, ExcelenciaExpediente.Resultado.FAVORABLE)

    def test_calidad_es_cualitativa_y_exige_certificaciones(self):
        self._configure(ExcelenciaExpediente.Criterio.RECONOCIMIENTO_CALIDAD)
        self._documents(["CARTA_EXCELENCIA", "RECIBO_MATRICULA_EXC", "HISTORIAL_EXCELENCIA", "FOLDER_EXCELENCIA"])
        self._approve("INSCRIPCION")
        self._documents(["CERT_PLANIFICACION", "SOLVENCIA_UNIV", "SOLVENCIA_BIBLIO", "TIMBRE_EXCELENCIA"])
        review = self.follow["REVISION_REQUISITOS"]
        WorkflowService.iniciar_etapa(review, self.admin)
        with self.assertRaises(ValidationError):
            WorkflowService.aprobar_etapa(review, self.admin)
        self._documents(["CERT_DIR_CARRERA", "CERT_INST_INVEST"])
        WorkflowService.aprobar_etapa(review, self.admin)
        stage = self.follow["EVALUACION_TRIBUNAL"]
        WorkflowService.iniciar_etapa(stage, self.admin)
        result = ExcelenciaAcademicaService.registrar_evaluacion(self.post, self.admin, "FAVORABLE")
        self.assertEqual(result.promedio_general, None)

    def test_conclusion_bloqueada_hasta_acta_aprobada(self):
        self._prepare_evaluation(ExcelenciaExpediente.Criterio.RENDIMIENTO_ACADEMICO)
        ExcelenciaAcademicaService.registrar_evaluacion(self.post, self.admin, "FAVORABLE", Decimal("80"))
        acta_stage = self.follow["REGISTRO_ACTA"]
        WorkflowService.iniciar_etapa(acta_stage, self.admin)
        with self.assertRaises(ValidationError):
            WorkflowService.aprobar_etapa(acta_stage, self.admin)
        self._documents(["ACTA_EXCELENCIA"])
        WorkflowService.aprobar_etapa(acta_stage, self.admin)
        ExcelenciaAcademicaService.concluir(self.post, self.admin)
        self.post.refresh_from_db()
        self.assertEqual(self.post.estado_actual.codigo, "CONCLUIDA")
