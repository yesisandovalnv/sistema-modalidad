from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.academico.models import Modalidad, Periodo
from apps.modalidades.examen_grado import ExamenGradoPolicy
from apps.modalidades.examen_grado_service import ExamenGradoService
from apps.modalidades.models import ExamenArea, ExamenEvaluacion
from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, TipoDocumento, VersionDocumento
from apps.modalidades.policies import ModalidadPolicyRegistry
from apps.postulantes.models import AsignacionPostulacion, EntregaFisica, EstadoPostulacion, Postulacion, SeguimientoEtapa
from apps.postulantes.complementarios import EntregaFisicaService
from apps.postulantes.asignaciones import AsignacionService
from apps.postulantes.workflow import WorkflowService
from apps.usuarios.models import CustomUser, Role


class ExamenGradoContenidosTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_initial_data", verbosity=0)
        admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Examen admin")
        cls.teacher_role = Role.objects.create(codigo="DOCENTE", nombre="Docente")
        student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        cls.admin = CustomUser.objects.create_user("examen-admin", password="x", role=admin_role, is_staff=True, ci="EXA-1", ru="EXA-R1")
        cls.student = CustomUser.objects.create_user("examen-student", password="x", role=student_role, ci="EXA-2", ru="EXA-R2")
        cls.post = Postulacion.objects.create(
            codigo="EXAM-TEST-001", estudiante=cls.student,
            modalidad=Modalidad.objects.get(codigo="EXAMEN_GRADO"),
            periodo=Periodo.objects.create(nombre="EXAM-2026", gestion=2026, semestre="II", fecha_inicio="2026-01-01", fecha_fin="2026-12-31"),
            estado_actual=EstadoPostulacion.objects.get(codigo="REGISTRADA"),
        )

    def setUp(self):
        self.policy = ModalidadPolicyRegistry.get(self.post)
        self.follow = {item.etapa.codigo: item for item in WorkflowService.inicializar_flujo(self.post, self.admin)}
        ExamenGradoService.ensure_areas(self.post)
        self.tribunal_users = []
        for index, role in enumerate(("TRIBUNAL", "TRIBUNAL", "TRIBUNAL", "PRESIDENTE", "SECRETARIO"), start=1):
            user = CustomUser.objects.create_user(f"examen-actor-{self._testMethodName}-{index}", password="x", role=self.teacher_role, ci=f"{self._testMethodName[:5]}{index}", ru=f"{self._testMethodName[:5]}R{index}")
            if role == "TRIBUNAL":
                self.tribunal_users.append(user)
            AsignacionPostulacion.objects.create(postulacion=self.post, usuario=user, tipo_participacion=role, orden_cargo=index if role == "TRIBUNAL" else None, designado_por=self.admin)

    def _approve_stage(self, code):
        if code == "INSCRIPCION":
            self._complete_inscription()
        stage = self.follow[code]
        WorkflowService.iniciar_etapa(stage, self.admin)
        return WorkflowService.aprobar_etapa(stage, self.admin)

    def _complete_inscription(self):
        for code in self.policy.get_documentos_requeridos("INSCRIPCION"):
            document = DocumentoPostulacion.objects.create(
                postulacion=self.post, tipo_documento=TipoDocumento.objects.get(codigo=code),
                estado=EstadoDocumento.objects.get(codigo="APR"),
            )
            VersionDocumento.objects.create(
                documento=document, subido_por=self.admin, numero_version=1,
                archivo=f"tests/{code}.pdf", nombre_original=f"{code}.pdf", tamano_bytes=3,
                hash_sha256="a" * 64, es_version_actual=True,
            )
        delivery = EntregaFisicaService.crear(self.post, "FOLDER_AMARILLO", "Fólder rotulado", self.admin)
        return EntregaFisicaService.registrar_entrega(delivery, 1, self.admin)

    def test_inscripcion_separa_tres_documentos_y_entrega_sin_cantidad_inventada(self):
        stage = self.follow["INSCRIPCION"]
        orientation = self.policy.get_orientacion_etapa_actual(postulacion=self.post, seguimiento=stage)
        self.assertEqual((orientation["requisitos_cumplidos"], orientation["requisitos_totales"]), (0, 4))
        self.assertEqual([item["tipo"] for item in orientation["requisitos"]], ["DOCUMENTO"] * 3 + ["ENTREGA_FISICA"])
        self.assertIsNone(orientation["requisitos"][-1]["cantidad"])
        self.assertFalse(orientation["permite_aprobar_etapa"])
        client = APIClient()
        client.force_authenticate(self.admin)
        response = client.get(f"/api/v1/postulaciones/{self.post.pk}/documentos-aplicables/")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual({item["codigo"] for item in response.data["documentos_aplicables"]}, set(self.policy.get_documentos_requeridos("INSCRIPCION")))
        self.assertNotIn("FOLDER_AMARILLO", {item["codigo"] for item in response.data["documentos_aplicables"]})

    def test_inscripcion_bloquea_cada_requisito_y_aprueba_solo_con_los_cuatro(self):
        delivery = self._complete_inscription()
        stage = self.follow["INSCRIPCION"]
        WorkflowService.iniciar_etapa(stage, self.admin)
        for code in self.policy.get_documentos_requeridos("INSCRIPCION"):
            with self.subTest(code=code):
                document = self.post.documentos.get(tipo_documento__codigo=code)
                DocumentoPostulacion.objects.filter(pk=document.pk).update(activo=False)
                with self.assertRaises(ValidationError):
                    WorkflowService.aprobar_etapa(stage, self.admin)
                DocumentoPostulacion.all_objects.filter(pk=document.pk).update(activo=True)
        EntregaFisica.objects.filter(pk=delivery.pk).update(estado="PENDIENTE", cantidad_recibida=0)
        orientation = self.policy.get_orientacion_etapa_actual(postulacion=self.post, seguimiento=stage)
        self.assertEqual(orientation["requisitos_cumplidos"], 3)
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "GESTIONAR_ENTREGA_FISICA")
        client = APIClient()
        client.force_authenticate(self.admin)
        response = client.post(f"/api/v1/seguimientos-etapa/{stage.pk}/aprobar/", {}, format="json")
        self.assertEqual(response.status_code, 400, response.data)
        response = client.post(f"/api/v1/gestion-complementaria/entregas-fisicas/{delivery.pk}/registrar/", {"cantidad_recibida": 1}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["estado"], "COMPLETA")
        self.assertIsNone(response.data["cantidad"])
        delivery.refresh_from_db()
        self.assertEqual(delivery.recibido_por, self.admin)
        self.assertIsNotNone(delivery.fecha_entrega)
        orientation = self.policy.get_orientacion_etapa_actual(postulacion=self.post, seguimiento=stage)
        self.assertEqual(orientation["requisitos_cumplidos"], 4)
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "APROBAR_ETAPA")
        response = client.post(f"/api/v1/seguimientos-etapa/{stage.pk}/aprobar/", {}, format="json")
        self.assertEqual(response.status_code, 200, response.data)

    def test_inscripcion_no_admite_documento_sin_aprobar_corregible_o_sin_version_vigente(self):
        self._complete_inscription()
        stage = self.follow["INSCRIPCION"]
        document = self.post.documentos.get(tipo_documento__codigo="CARTA_SOLICITUD_EXAMEN")
        for state in ("ENV", "OBS", "REC"):
            with self.subTest(state=state):
                DocumentoPostulacion.objects.filter(pk=document.pk).update(estado=EstadoDocumento.objects.get(codigo=state))
                with self.assertRaises(ValidationError):
                    self.policy.validar_aprobacion_etapa(stage)
        DocumentoPostulacion.objects.filter(pk=document.pk).update(estado=EstadoDocumento.objects.get(codigo="APR"), requiere_correccion=True)
        with self.assertRaises(ValidationError):
            self.policy.validar_aprobacion_etapa(stage)
        DocumentoPostulacion.objects.filter(pk=document.pk).update(requiere_correccion=False)
        document.versiones.update(es_version_actual=False)
        with self.assertRaises(ValidationError):
            self.policy.validar_aprobacion_etapa(stage)

    def _start_area(self, code, attempt=1):
        stage = SeguimientoEtapa.objects.get(postulacion=self.post, etapa__codigo=code, numero_intento=attempt)
        WorkflowService.iniciar_etapa(stage, self.admin)
        return stage

    def _evaluate_area(self, code, notes):
        results = []
        for user, note in zip(self.tribunal_users, notes):
            results.append(ExamenGradoService.registrar_evaluacion(self.post, code, note, self.admin, evaluador_id=user.id))
        return results

    def _evaluate_consensus(self, code, note):
        return ExamenGradoService.registrar_evaluacion(
            self.post, code, note, self.admin, modalidad_registro="CONSENSO",
        )

    def test_policy_etapas_documentos_y_capacidades(self):
        self.assertEqual(self.policy.get_etapa_inicial().codigo, "INSCRIPCION")
        self.assertEqual(len(self.policy.etapas), 8)
        self.assertEqual(self.policy.get_documentos_requeridos("INSCRIPCION"), ("CARTA_SOLICITUD_EXAMEN", "MATRICULA_VIGENTE", "HISTORIAL_ACADEMICO"))
        self.assertEqual(self.policy.get_entregas_requeridas("INSCRIPCION"), ("FOLDER_AMARILLO",))
        self.assertEqual(self.policy.get_entregas_requeridas("DOCUMENTACION_FINAL"), ())
        self.assertEqual(self.policy.get_documentos_requeridos("DOCUMENTACION_FINAL"), ("ACTA_EXAMEN", "HOJA_APROBACION_EXAMEN"))
        capabilities = self.policy.get_capabilities(self.post.modalidad)
        self.assertTrue(capabilities.soportada and capabilities.workflow_configurado)

    def test_declara_y_resuelve_las_cinco_posiciones_de_actores(self):
        configuration = self.policy.get_configuracion_actores(self.post)
        groups = configuration["grupos"]
        self.assertEqual([group["tipo_participacion"] for group in groups], ["TRIBUNAL", "PRESIDENTE", "SECRETARIO"])
        self.assertEqual(groups[0]["ordenes_permitidos"], [1, 2, 3])
        self.assertTrue(all(group["ambito"] == "POSTULACION" for group in groups))
        composition = self.policy.resolver_composicion_activa(self.post)
        self.assertTrue(composition["completa"])
        self.assertTrue(composition["evaluable"])
        self.assertEqual(len(composition["tribunales"]), 3)

    def test_composicion_incompleta_orienta_a_gestion_de_actores(self):
        AsignacionPostulacion.objects.filter(
            postulacion=self.post, tipo_participacion="SECRETARIO",
        ).update(activo=False)
        self._approve_stage("INSCRIPCION")
        preparation = self.follow["PREPARACION_EXAMEN"]
        orientation = self.policy.get_orientacion_etapa_actual(postulacion=self.post, seguimiento=preparation)
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "GESTIONAR_ACTORES")
        self.assertEqual(orientation["siguiente_accion"]["destino"], "#actores")
        self.assertIn("Secretario", [item["nombre"] for item in orientation["requisitos"]])

    def test_overview_api_expone_areas_y_reglas(self):
        client = APIClient()
        client.force_authenticate(self.admin)
        response = client.get(f"/api/v1/postulaciones/{self.post.pk}/examen/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["variante"], "EXAMEN_CONTENIDOS")
        self.assertEqual([area["codigo"] for area in response.data["areas"]], ["AREA_1", "AREA_2", "AREA_3", "AREA_4"])
        self.assertEqual(response.data["reglas"]["nota_minima"], 61)
        self.assertTrue(response.data["composicion"]["completa"])
        self.assertTrue(response.data["composicion"]["evaluable"])

    def test_motor_rechaza_posicion_duplicada_e_identidad_repetida(self):
        candidate = CustomUser.objects.create_user(
            f"duplicate-position-{self._testMethodName}", password="x", role=self.teacher_role,
            ci=f"DP{self._testMethodName[:8]}", ru=f"DPR{self._testMethodName[:8]}",
        )
        with self.assertRaisesMessage(ValidationError, "Ya existe un tribunal activo en esa posición"):
            AsignacionService.asignar_actor(self.post, candidate, "TRIBUNAL", self.admin, orden_cargo=1)

        self.post.asignaciones.filter(tipo_participacion="PRESIDENTE").update(activo=False)
        with self.assertRaisesMessage(ValidationError, "otra asignación vigente"):
            AsignacionService.asignar_actor(self.post, self.tribunal_users[0], "PRESIDENTE", self.admin)

    def test_bloquea_avance_secuencial_de_areas(self):
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        with self.assertRaises(ValidationError):
            self._start_area("AREA_2")
        self._start_area("AREA_1")

    def test_nota_60_posterga_y_61_aprueba(self):
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        self._start_area("AREA_1")
        first = self._evaluate_area("AREA_1", (60, 60, 60))[-1]
        self.assertEqual(first.resultado, ExamenEvaluacion.Resultado.INSUFICIENTE)
        area = self.post.examen_areas.get(codigo="AREA_1")
        self.assertEqual(area.intento_actual, 2)
        self.assertEqual(area.estado, "POSTERGADA")
        self.assertIsNotNone(area.reintento_hasta)
        self._start_area("AREA_1", 2)
        second = self._evaluate_area("AREA_1", (61, 61, 61))[-1]
        self.assertEqual(second.resultado, ExamenEvaluacion.Resultado.APROBADA)
        self.assertEqual(self.post.examen_areas.get(codigo="AREA_1").estado, "APROBADA")

    def test_nota_fuera_de_escala_y_segunda_insuficiencia(self):
        with self.assertRaises(ValidationError):
            ExamenEvaluacion(area=self.post.examen_areas.get(codigo="AREA_1"), intento=1, nota=Decimal("100.01"), resultado="APROBADA").full_clean()
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        self._start_area("AREA_1")
        self._evaluate_area("AREA_1", (60, 60, 60))
        self._start_area("AREA_1", 2)
        self._evaluate_area("AREA_1", (60, 60, 60))
        self.assertEqual(self.post.examen_areas.get(codigo="AREA_1").estado, "REPROBADA")

    def test_calcula_ponderacion_normativa(self):
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        for code, note in (("AREA_1", 100), ("AREA_2", 100), ("AREA_3", 100), ("AREA_4", 100)):
            self._start_area(code)
            self._evaluate_area(code, (note, note, note))
        result = ExamenGradoService.calcular_resultado_final(self.post)
        self.assertTrue(result["completo"])
        self.assertEqual(result["nota_final"], Decimal("100.00"))
        self.assertEqual(result["areas"], {"AREA_1": "100.00", "AREA_2": "100.00", "AREA_3": "100.00", "AREA_4": "100.00"})

    def test_resultado_final_promedia_los_tres_tribunales(self):
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        self._start_area("AREA_1")
        self._evaluate_area("AREA_1", (61, 62, 63))
        result = ExamenGradoService.calcular_resultado_final(self.post)
        self.assertFalse(result["completo"])
        self.assertIsNone(result["nota_final"])
        self.assertEqual(result["areas"]["AREA_1"], "62.00")

    def test_promedio_aprobado_conserva_resultados_individuales_y_serializacion(self):
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        self._start_area("AREA_1")

        self._evaluate_area("AREA_1", (50, 70, 70))

        area = self.post.examen_areas.get(codigo="AREA_1")
        evaluations = list(area.evaluaciones.filter(intento=1).order_by("evaluador_id"))
        self.assertEqual(area.estado, ExamenArea.Estado.APROBADA)
        self.assertEqual(
            sorted((item.nota, item.resultado) for item in evaluations),
            [
                (Decimal("50.00"), ExamenEvaluacion.Resultado.INSUFICIENTE),
                (Decimal("70.00"), ExamenEvaluacion.Resultado.APROBADA),
                (Decimal("70.00"), ExamenEvaluacion.Resultado.APROBADA),
            ],
        )
        for evaluation in evaluations:
            evaluation.full_clean()

        result = ExamenGradoService.calcular_resultado_final(self.post)
        self.assertEqual(result["areas"]["AREA_1"], "63.33")
        serialized = ExamenGradoService.overview(self.post)["areas"][0]["evaluaciones"]
        self.assertEqual(
            sorted((Decimal(item["nota"]), item["resultado"]) for item in serialized),
            [
                (Decimal("50.00"), ExamenEvaluacion.Resultado.INSUFICIENTE),
                (Decimal("70.00"), ExamenEvaluacion.Resultado.APROBADA),
                (Decimal("70.00"), ExamenEvaluacion.Resultado.APROBADA),
            ],
        )

    def test_promedio_insuficiente_conserva_resultados_individuales(self):
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        self._start_area("AREA_1")

        self._evaluate_area("AREA_1", (100, 40, 40))

        area = self.post.examen_areas.get(codigo="AREA_1")
        evaluations = list(area.evaluaciones.filter(intento=1))
        self.assertEqual(area.estado, ExamenArea.Estado.POSTERGADA)
        self.assertEqual(area.intento_actual, 2)
        self.assertEqual(
            sorted((item.nota, item.resultado) for item in evaluations),
            [
                (Decimal("40.00"), ExamenEvaluacion.Resultado.INSUFICIENTE),
                (Decimal("40.00"), ExamenEvaluacion.Resultado.INSUFICIENTE),
                (Decimal("100.00"), ExamenEvaluacion.Resultado.APROBADA),
            ],
        )
        for evaluation in evaluations:
            evaluation.full_clean()

    def test_consenso_persiste_una_unica_nota_del_area(self):
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        self._start_area("AREA_1")
        evaluation = self._evaluate_consensus("AREA_1", 75)
        self.assertEqual(evaluation.modalidad_registro, ExamenEvaluacion.ModalidadRegistro.CONSENSO)
        self.assertIsNone(evaluation.evaluador_id)
        self.assertEqual(self.post.examen_areas.get(codigo="AREA_1").estado, "APROBADA")
        self.assertEqual(self.post.examen_areas.get(codigo="AREA_1").evaluaciones.count(), 1)
        self.assertEqual(ExamenGradoService.calcular_resultado_final(self.post)["areas"]["AREA_1"], "75.00")

    def test_reemplazo_antes_de_calificar_mantiene_composicion_evaluable(self):
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        self._start_area("AREA_1")
        assignment = self.post.asignaciones.get(tipo_participacion="TRIBUNAL", orden_cargo=1, activo=True)
        replacement = CustomUser.objects.create_user(
            f"replacement-before-{self._testMethodName}", password="x", role=self.teacher_role,
            ci=f"RB{self._testMethodName[:8]}", ru=f"RBR{self._testMethodName[:8]}",
        )
        AsignacionService.reemplazar_actor(assignment, replacement, self.admin, "Cambio previo")
        composition = self.policy.resolver_composicion_activa(self.post, self.post.examen_areas.get(codigo="AREA_1"))
        self.assertTrue(composition["evaluable"])
        ExamenGradoService.registrar_evaluacion(self.post, "AREA_1", 61, self.admin, evaluador_id=replacement.pk)

    def test_reemplazo_despues_de_nota_bloquea_mezcla_y_conserva_historial(self):
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        self._start_area("AREA_1")
        original = self.post.asignaciones.get(tipo_participacion="TRIBUNAL", orden_cargo=1, activo=True)
        ExamenGradoService.registrar_evaluacion(self.post, "AREA_1", 70, self.admin, evaluador_id=original.usuario_id)
        replacement = CustomUser.objects.create_user(
            f"replacement-after-{self._testMethodName}", password="x", role=self.teacher_role,
            ci=f"RA{self._testMethodName[:8]}", ru=f"RAR{self._testMethodName[:8]}",
        )
        AsignacionService.reemplazar_actor(original, replacement, self.admin, "Cambio posterior")
        with self.assertRaisesMessage(ValidationError, "ya no pertenecen al tribunal activo"):
            ExamenGradoService.registrar_evaluacion(self.post, "AREA_1", 71, self.admin, evaluador_id=replacement.pk)
        evaluation = self.post.examen_areas.get(codigo="AREA_1").evaluaciones.get()
        self.assertEqual(evaluation.evaluador_id, original.usuario_id)
        self.assertEqual(evaluation.nota, Decimal("70.00"))

    def test_finalizacion_directa_deja_bloqueada_la_evaluacion(self):
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        self._start_area("AREA_1")
        assignment = self.post.asignaciones.get(tipo_participacion="TRIBUNAL", orden_cargo=1, activo=True)
        AsignacionService.finalizar_asignacion(assignment, self.admin, "Finalización directa")
        with self.assertRaisesMessage(ValidationError, "composición del Examen no permite evaluar"):
            ExamenGradoService.registrar_evaluacion(self.post, "AREA_1", 70, self.admin, evaluador_id=assignment.usuario_id)

    def test_no_permite_mezclar_registro_individual_y_consenso(self):
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        self._start_area("AREA_1")
        ExamenGradoService.registrar_evaluacion(self.post, "AREA_1", 70, self.admin, evaluador_id=self.tribunal_users[0].pk)
        with self.assertRaisesMessage(ValidationError, "No se pueden mezclar"):
            self._evaluate_consensus("AREA_1", 70)

    def test_conclusion_exige_documentos_y_concluye_con_acta_y_hoja(self):
        self._approve_stage("INSCRIPCION")
        self._approve_stage("PREPARACION_EXAMEN")
        for code in ("AREA_1", "AREA_2", "AREA_3", "AREA_4"):
            self._start_area(code)
            self._evaluate_area(code, (61, 61, 61))

        estado_aprobado = EstadoDocumento.objects.get(codigo="APR")
        for codigo in ("ACTA_EXAMEN", "HOJA_APROBACION_EXAMEN"):
            documento = DocumentoPostulacion.objects.create(
                postulacion=self.post,
                tipo_documento=TipoDocumento.objects.get(codigo=codigo),
                estado=estado_aprobado,
            )
            VersionDocumento.objects.create(
                documento=documento, subido_por=self.admin, numero_version=1,
                archivo=SimpleUploadedFile(f"{codigo}.pdf", b"pdf"),
                nombre_original=f"{codigo}.pdf", tamano_bytes=3,
                hash_sha256="a" * 64, es_version_actual=True,
            )

        documentation = self.follow["DOCUMENTACION_FINAL"]
        WorkflowService.iniciar_etapa(documentation, self.admin)
        WorkflowService.aprobar_etapa(documentation, self.admin)
        ExamenGradoService.concluir(self.post, self.admin)
        self.post.refresh_from_db()
        self.assertEqual(self.post.estado_actual.codigo, "CONCLUIDA")
        self.assertEqual(
            SeguimientoEtapa.objects.get(postulacion=self.post, etapa__codigo="CONCLUSION_ACADEMICA").estado,
            SeguimientoEtapa.EstadoChoices.APROBADA,
        )
