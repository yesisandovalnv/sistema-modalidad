from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.test import SimpleTestCase, TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient, APIRequestFactory

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.modalidades.policies import ModalidadPolicyRegistry
from apps.modalidades.tesis_grado import TesisGradoEvaluacionPolicy, TesisGradoPolicy
from apps.documentos.models import (ConfirmacionCorreccionDocumento, DocumentoPostulacion,
    EstadoDocumento, ObservacionDocumento, TipoDocumento, VersionDocumento)
from apps.documentos.services import DocumentoService
from apps.postulantes.asignaciones import AsignacionService
from apps.postulantes.models import (
    AsignacionPostulacion, EstadoPostulacion, EvaluacionDefensa, EventoDefensa,
    DictamenRevisionDocumento, ParticipanteEvento, Postulacion, SeguimientoEtapa,
)
from apps.postulantes.serializers import FlujoPostulacionSerializer
from apps.postulantes.workflow import WorkflowService
from apps.postulantes.defensas_api import EvaluarPayload
from apps.usuarios.models import CustomUser, Role


class TesisProgrammingOrientationContractTest(SimpleTestCase):
    def test_configuracion_bruta_y_limites_sin_cambiar_payload_historico(self):
        policy = TesisGradoEvaluacionPolicy()
        for tipo, note, aporte in (("PRIVADA", "95", "28.50"), ("PRIVADA", "0", "0"), ("PRIVADA", "100", "30"), ("PUBLICA", "95", "66.50")):
            with self.subTest(tipo=tipo, note=note):
                values = policy.get_valores_para_semantica(evento=None, tipo=tipo, nota=Decimal(note), semantica="BRUTA_100")
                self.assertEqual(values["aporte_ponderado"], Decimal(aporte))
                item = SimpleNamespace(tipo_evaluacion=tipo, evento=SimpleNamespace(tipo_evento=f"DEFENSA_{tipo}"),
                                       resultado_cualitativo="SUFICIENTE", nota_numerica=Decimal(note), semantica_nota="BRUTA_100", **values)
                policy.validar_registro(item)
        item.nota_numerica = Decimal("0")
        with self.assertRaises(ValidationError):
            policy.validar_registro(item)
        self.assertEqual(policy.get_valores_registro(evento=None, tipo="PRIVADA", nota=Decimal("25"))["aporte_ponderado"], Decimal("25"))
        self.assertEqual(policy.get_semantica_nota(evento=None, tipo="PRIVADA"), "MODALIDAD_ESPECIFICA")

    def orientation(self, stage="DEFENSA_PRIVADA", **overrides):
        policy = TesisGradoPolicy()
        post = Mock(pk=7)
        post.asignaciones.filter.return_value.count.return_value = 3
        post.asignaciones.filter.return_value.exists.return_value = True
        post.seguimientos_etapa.filter.return_value.values_list.return_value = overrides.pop("candidates", [21])
        seguimiento = SimpleNamespace(
            pk=21, postulacion_id=7, activo=True, estado="EN_PROCESO",
            etapa=SimpleNamespace(codigo=stage), numero_intento=2,
        )
        for key, value in overrides.items():
            setattr(seguimiento, key, value)
        action = policy._orientation_action("PROGRAMAR_EVENTO", "Programar defensa", "Programa", "DISPONIBLE", "#defensas", "Programar")
        with patch.object(policy, "_event_orientation", return_value=(action, [])), patch.object(policy, "_document_orientation", return_value=[]):
            return policy.get_orientacion_etapa_actual(postulacion=post, seguimiento=seguimiento)

    def test_expone_evento_de_la_policy_para_las_cuatro_defensas(self):
        for stage, event in (("TEMATICA_TESIS", "DEFENSA_TEMATICA"), ("PERFIL_TESIS", "DEFENSA_PERFIL"), ("DEFENSA_PRIVADA", "DEFENSA_PRIVADA"), ("DEFENSA_PUBLICA", "DEFENSA_PUBLICA")):
            with self.subTest(stage=stage):
                result = self.orientation(stage)
                self.assertEqual(result["tipo_evento"], event)
                self.assertEqual(result["siguiente_accion"]["codigo"], "PROGRAMAR_EVENTO")

    def test_omite_evento_si_seguimiento_no_es_inequivoco_o_editable(self):
        for overrides in ({"activo": False}, {"postulacion_id": 8}, {"candidates": [21, 22]}, {"candidates": []}, {"estado": "PENDIENTE"}):
            with self.subTest(overrides=overrides):
                self.assertNotIn("tipo_evento", self.orientation(**overrides))

    def test_omite_evento_si_la_policy_declara_varios_tipos_para_la_etapa(self):
        with patch("apps.modalidades.tesis_grado.TesisGradoEventoPolicy.get_tipos_evento", return_value=("DEFENSA_PRIVADA", "OTRO")), patch("apps.modalidades.tesis_grado.TesisGradoEventoPolicy.get_etapa_asociada", return_value="DEFENSA_PRIVADA"):
            self.assertNotIn("tipo_evento", self.orientation())

    def test_gate_pendiente_no_expone_evento(self):
        policy = TesisGradoPolicy()
        post = Mock(pk=7)
        seguimiento = SimpleNamespace(pk=21, postulacion_id=7, activo=True, estado="EN_PROCESO", etapa=SimpleNamespace(codigo="DEFENSA_PUBLICA"))
        action = policy._orientation_action("GESTIONAR_PRECONDICIONES", "Completar", "Gate pendiente", "PENDIENTE", "#actores", "Completar")
        with patch.object(policy, "_event_orientation", return_value=(action, [])):
            result = policy.get_orientacion_etapa_actual(postulacion=post, seguimiento=seguimiento)
        self.assertNotIn("tipo_evento", result)
        self.assertEqual(result["siguiente_accion"], action)


class TesisGradoPolicyTest(TestCase):
    def setUp(self):
        call_command("seed_initial_data", verbosity=0)
        self.admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administrador")
        self.doc_role = Role.objects.create(codigo="DOCENTE", nombre="Docente")
        self.student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        self.admin = CustomUser.objects.create_user(username="tesis-admin", password="x", ci="7100001", ru="RU7100001", role=self.admin_role, is_staff=True)
        self.student = CustomUser.objects.create_user(username="tesis-estudiante", password="x", ci="7100002", ru="RU7100002", role=self.student_role)
        self.docentes = [CustomUser.objects.create_user(username=f"tesis-docente-{n}", password="x", ci=f"710001{n}", ru=f"RU710001{n}", role=self.doc_role) for n in range(1, 5)]
        self.modalidad = Modalidad.objects.get(codigo="TESIS_GRADO")
        self.periodo = Periodo.objects.create(nombre="2026-TESIS", gestion=2026, semestre="II", fecha_inicio="2026-07-01", fecha_fin="2026-12-31")
        self.postulacion = Postulacion.objects.create(codigo="TESIS-TEST-001", estudiante=self.student, modalidad=self.modalidad, periodo=self.periodo, estado_actual=EstadoPostulacion.objects.get(codigo="REGISTRADA"))
        self.seguimientos = {item.etapa.codigo: item for item in WorkflowService.inicializar_flujo(self.postulacion, self.admin)}

    def _activar_tematica(self):
        SeguimientoEtapa.objects.filter(postulacion=self.postulacion).update(estado="PENDIENTE")
        SeguimientoEtapa.objects.filter(pk=self.seguimientos["INSCRIPCION"].pk).update(estado="APROBADA")
        SeguimientoEtapa.objects.filter(pk=self.seguimientos["TEMATICA_TESIS"].pk).update(estado="EN_PROCESO")
        self.seguimientos["TEMATICA_TESIS"].refresh_from_db()
        return self.seguimientos["TEMATICA_TESIS"]

    def _activar_etapa(self, codigo):
        etapa = self.seguimientos[codigo]
        SeguimientoEtapa.objects.filter(postulacion=self.postulacion).update(estado="PENDIENTE")
        SeguimientoEtapa.objects.filter(
            postulacion=self.postulacion,
            etapa__orden__lt=etapa.etapa.orden,
        ).update(estado="APROBADA")
        SeguimientoEtapa.objects.filter(pk=etapa.pk).update(estado="EN_PROCESO")
        etapa.refresh_from_db()
        return etapa

    def _preparar_gate_publica_valido(self):
        private = EventoDefensa.objects.create(
            postulacion=self.postulacion,
            seguimiento_etapa=self.seguimientos["DEFENSA_PRIVADA"],
            tipo_evento="DEFENSA_PRIVADA", estado="FINALIZADA", numero_intento=1,
            fecha_programada="2026-08-01T10:00:00Z", fecha_fin_real="2026-08-01T11:00:00Z",
            lugar="Aula", programado_por=self.admin,
        )
        EvaluacionDefensa.objects.create(
            evento=private, tipo_evaluacion="RESULTADO_FINAL", modalidad_registro="CONSENSO",
            resultado_cualitativo="SUFICIENTE", nota_numerica=Decimal("20"),
            es_resultado_final_evento=True, registrado_por=self.admin,
        )
        DocumentoPostulacion.objects.create(
            postulacion=self.postulacion,
            tipo_documento=TipoDocumento.objects.get(codigo="DOCUMENTO_FINAL"),
            estado=EstadoDocumento.objects.get(codigo="APR"),
        )
        return private

    def _orientacion_publica(self):
        return TesisGradoPolicy().get_orientacion_etapa_actual(
            postulacion=self.postulacion, seguimiento=self.seguimientos["DEFENSA_PUBLICA"],
        )

    def _asignacion_publica(self, role, *, activo=True, seguimiento=None, usuario=None, orden=None):
        return AsignacionPostulacion.objects.create(
            postulacion=self.postulacion, usuario=usuario or self.docentes[0],
            tipo_participacion=role, activo=activo, designado_por=self.admin,
            seguimiento_etapa=seguimiento or self.seguimientos["TEMATICA_TESIS"],
            orden_cargo=orden,
        )

    def test_orientacion_publica_desglosa_conteo_vigente_entre_seguimientos(self):
        self._activar_etapa("DEFENSA_PUBLICA")
        self._preparar_gate_publica_valido()
        for teacher in self.docentes[:3]:
            self._asignacion_publica("TRIBUNAL", usuario=teacher)
        self._asignacion_publica("PRESIDENTE", activo=False)
        self._asignacion_publica("SECRETARIO", activo=False)
        orientation = self._orientacion_publica()
        self.assertEqual([(r["codigo"], r["actual"], r["minimo"], r["cumplido"]) for r in orientation["requisitos"]], [
            ("TRIBUNAL", 3, 3, True), ("PRESIDENTE", 0, 1, False), ("SECRETARIO", 0, 1, False),
        ])
        action = orientation["siguiente_accion"]
        self.assertEqual(action["titulo"], "Actores de la postulación")
        self.assertEqual(action["accion_label"], "Completar autoridades")
        self.assertEqual(action["requiere_permiso"], "GESTIONAR_ASIGNACIONES")
        self.assertNotIn("{'", action["descripcion"])
        self._asignacion_publica("PRESIDENTE", seguimiento=self.seguimientos["DEFENSA_PUBLICA"])
        self.assertEqual(self._orientacion_publica()["requisitos"][1]["actual"], 1)
        self._asignacion_publica("SECRETARIO", seguimiento=self.seguimientos["DEFENSA_PRIVADA"])
        ready = self._orientacion_publica()
        self.assertEqual(ready["siguiente_accion"]["codigo"], "PROGRAMAR_EVENTO")
        self.assertEqual(ready["tipo_evento"], "DEFENSA_PUBLICA")
        self.assertTrue(all(r["cumplido"] for r in ready["requisitos"]))
        self.assertFalse(any(r["codigo"] == "ANTICIPACION_MINIMA" for r in ready["requisitos"]))

    def test_orientacion_publica_preserva_count_no_distinct_y_minimo_programacion(self):
        public = self._activar_etapa("DEFENSA_PUBLICA")
        self._preparar_gate_publica_valido()
        # La semántica histórica cuenta asignaciones, incluso con usuario repetido.
        for order, stage in enumerate(("TEMATICA_TESIS", "DEFENSA_PRIVADA"), start=1):
            self._asignacion_publica("TRIBUNAL", seguimiento=self.seguimientos[stage], orden=order)
        self._asignacion_publica("PRESIDENTE")
        self._asignacion_publica("SECRETARIO")
        orientation = self._orientacion_publica()
        self.assertEqual(orientation["requisitos"][0]["actual"], 2)
        self.assertFalse(orientation["requisitos"][0]["cumplido"])
        self.assertEqual(orientation["siguiente_accion"]["accion_label"], "Ir a actores")
        policy = TesisGradoPolicy().evento_policy
        with self.assertRaisesMessage(ValidationError, "Tribunales: 2 de 3"):
            policy.validar_programacion(tipo_evento="DEFENSA_PUBLICA", seguimiento=public,
                                       asignaciones=self.postulacion.asignaciones.filter(activo=True))
        self._asignacion_publica("TRIBUNAL", seguimiento=public, orden=3)
        policy.validar_programacion(tipo_evento="DEFENSA_PUBLICA", seguimiento=public,
                                   asignaciones=self.postulacion.asignaciones.filter(activo=True))
        self.assertEqual(self._orientacion_publica()["siguiente_accion"]["codigo"], "PROGRAMAR_EVENTO")

    def test_orientacion_publica_separa_gate_academico_y_documental(self):
        self._activar_etapa("DEFENSA_PUBLICA")
        academic = self._orientacion_publica()
        self.assertEqual(academic["siguiente_accion"]["destino"], "#defensas")
        self.assertIn("SUFICIENTE", academic["siguiente_accion"]["descripcion"])
        self._preparar_gate_publica_valido()
        DocumentoPostulacion.objects.filter(postulacion=self.postulacion).update(activo=False)
        documentary = self._orientacion_publica()
        self.assertEqual(documentary["siguiente_accion"]["destino"], "#documentos")
        self.assertNotEqual(documentary["siguiente_accion"]["accion_label"], "Completar autoridades")

    def test_orientacion_publica_no_reabre_autoridades_con_evento_existente(self):
        public = self._activar_etapa("DEFENSA_PUBLICA")
        event = self._crear_evento_publico_consolidado(public)
        for state, code in (("PROGRAMADA", "GESTIONAR_DEFENSA"), ("EN_CURSO", "GESTIONAR_DEFENSA"), ("FINALIZADA", "APROBAR_ETAPA")):
            with self.subTest(state=state):
                event.estado = state
                event.save(update_fields=["estado"])
                self.assertEqual(self._orientacion_publica()["siguiente_accion"]["codigo"], code)

    def test_orientacion_publica_conserva_bloqueo_de_correcciones(self):
        self._activar_etapa("DEFENSA_PUBLICA")
        self._preparar_gate_publica_valido()
        document = DocumentoPostulacion.objects.get(postulacion=self.postulacion)
        version = VersionDocumento.objects.create(
            documento=document, subido_por=self.student, numero_version=1,
            archivo="tests/final.pdf", nombre_original="final.pdf", tamano_bytes=3,
            hash_sha256="a" * 64, es_version_actual=True,
        )
        observation = ObservacionDocumento.objects.create(
            version_documento=version, usuario=self.admin, comentario="Corrección de forma", corregida=False,
        )
        for corrected, expected in ((False, "observaciones de forma pendientes"), (True, "falta confirmación técnica")):
            with self.subTest(corrected=corrected):
                observation.corregida = corrected
                observation.save(update_fields=["corregida"])
                action = self._orientacion_publica()["siguiente_accion"]
                self.assertEqual(action["destino"], "#documentos")
                self.assertIn(expected, action["descripcion"])
                self.assertNotEqual(action["accion_label"], "Completar autoridades")

    def _crear_evento_publico_consolidado(self, seguimiento, *, nota=Decimal("70")):
        event = EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=seguimiento,
            tipo_evento="DEFENSA_PUBLICA", estado="FINALIZADA",
            numero_intento=seguimiento.numero_intento,
            fecha_programada="2026-08-02T10:00:00Z", fecha_fin_real="2026-08-02T11:00:00Z",
            lugar="Auditorio", programado_por=self.admin,
        )
        EvaluacionDefensa.objects.create(
            evento=event, tipo_evaluacion="RESULTADO_FINAL", modalidad_registro="CONSENSO",
            nota_numerica=nota, es_resultado_final_evento=True, registrado_por=self.admin,
        )
        return event

    def _crear_evento_tematica_consolidado(self, seguimiento, resultado):
        for order, teacher in enumerate(self.docentes[:3], start=1):
            AsignacionService.asignar_actor(
                self.postulacion, teacher, "TRIBUNAL", self.admin,
                orden_cargo=order, seguimiento_etapa=seguimiento,
            )
        event = EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=seguimiento,
            tipo_evento="DEFENSA_TEMATICA", estado="FINALIZADA", numero_intento=1,
            fecha_programada="2026-08-01T10:00:00Z", fecha_fin_real="2026-08-01T11:00:00Z",
            lugar="Aula", programado_por=self.admin,
        )
        return EvaluacionDefensa.objects.create(
            evento=event, tipo_evaluacion="RESULTADO_FINAL", modalidad_registro="CONSENSO",
            resultado_cualitativo=resultado, es_resultado_final_evento=True,
            registrado_por=self.admin,
        )

    def _preparar_conclusion_valida(
        self, *, estado_publico="APROBADA", nota_publica=Decimal("50"),
        incluir_acta=True, estado_acta="APR", incluir_version=True,
        version_activa=True, version_actual=True, acta_otro_intento=False,
    ):
        private = EventoDefensa.objects.create(
            postulacion=self.postulacion,
            seguimiento_etapa=self.seguimientos["DEFENSA_PRIVADA"],
            tipo_evento="DEFENSA_PRIVADA", estado="FINALIZADA", numero_intento=1,
            fecha_programada="2026-08-01T10:00:00Z", fecha_fin_real="2026-08-01T11:00:00Z",
            lugar="Aula", programado_por=self.admin,
        )
        EvaluacionDefensa.objects.create(
            evento=private, tipo_evaluacion="RESULTADO_FINAL", modalidad_registro="CONSENSO",
            resultado_cualitativo="SUFICIENTE", nota_numerica=Decimal("20"),
            es_resultado_final_evento=True, registrado_por=self.admin,
        )
        public = self.seguimientos["DEFENSA_PUBLICA"]
        acta_event = None
        if acta_otro_intento:
            acta_event = EventoDefensa.objects.create(
                postulacion=self.postulacion, seguimiento_etapa=public,
                tipo_evento="DEFENSA_PUBLICA", estado="FINALIZADA", numero_intento=1,
                fecha_programada="2026-08-02T10:00:00Z", fecha_fin_real="2026-08-02T11:00:00Z",
                lugar="Auditorio", programado_por=self.admin,
            )
            public.estado = SeguimientoEtapa.EstadoChoices.RECHAZADA
            public.save(update_fields=["estado"])
            public = SeguimientoEtapa.objects.create(
                postulacion=self.postulacion, etapa=public.etapa, numero_intento=2,
                estado=estado_publico,
            )
        else:
            public.estado = estado_publico
            public.save(update_fields=["estado"])
        public_event = EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=public,
            tipo_evento="DEFENSA_PUBLICA", estado="FINALIZADA",
            numero_intento=public.numero_intento,
            fecha_programada="2026-08-03T10:00:00Z", fecha_fin_real="2026-08-03T11:00:00Z",
            lugar="Auditorio", programado_por=self.admin,
        )
        if nota_publica is not None:
            EvaluacionDefensa.objects.create(
                evento=public_event, tipo_evaluacion="RESULTADO_FINAL", modalidad_registro="CONSENSO",
                nota_numerica=nota_publica, es_resultado_final_evento=True, registrado_por=self.admin,
            )
        if incluir_acta:
            estado = EstadoDocumento.objects.get(codigo="APR")
            if estado_acta != "APR":
                estado = EstadoDocumento.objects.create(codigo="PENDIENTE_TEST", nombre="Pendiente de prueba")
            document = DocumentoPostulacion.objects.create(
                postulacion=self.postulacion,
                tipo_documento=TipoDocumento.objects.get(codigo="ACTA_DEFENSA"),
                evento_defensa=acta_event or public_event,
                estado=estado,
            )
            if incluir_version:
                with override_settings(STORAGES={
                    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
                }):
                    VersionDocumento.objects.create(
                        documento=document, subido_por=self.admin, numero_version=1,
                        archivo=SimpleUploadedFile("acta.pdf", b"pdf"),
                        nombre_original="acta.pdf", tamano_bytes=3,
                        hash_sha256="a" * 64, activo=version_activa,
                        es_version_actual=version_actual,
                    )
        return public

    def _gestion_actores(self, usuario):
        request = APIRequestFactory().get("/")
        request.user = usuario
        return FlujoPostulacionSerializer(
            self.postulacion,
            context={"request": request},
        ).data["gestion_actores"]

    def test_policy_registrada_y_etapas_ordenadas(self):
        policy = ModalidadPolicyRegistry.get(self.postulacion)
        self.assertIsInstance(policy, TesisGradoPolicy)
        self.assertEqual([stage.codigo for stage in policy.etapas], [
            "INSCRIPCION", "TEMATICA_TESIS", "PERFIL_TESIS", "DOCUMENTO_FINAL",
            "REVISION_TUTOR", "REVISION_TRIBUNAL", "DEFENSA_PRIVADA", "DEFENSA_PUBLICA",
        ])
        self.assertEqual([x.etapa.codigo for x in WorkflowService.obtener_seguimientos_ordenados(self.postulacion)], [
            "INSCRIPCION", "TEMATICA_TESIS", "PERFIL_TESIS", "DOCUMENTO_FINAL",
            "REVISION_TUTOR", "REVISION_TRIBUNAL", "DEFENSA_PRIVADA", "DEFENSA_PUBLICA",
        ])

    def test_configuracion_actores_declara_tribunales_y_tutor_sin_restricciones_nuevas(self):
        config = TesisGradoPolicy().get_configuracion_actores()

        self.assertEqual(len(config["grupos"]), 2)
        tribunal, tutor = config["grupos"]
        self.assertEqual(tribunal["tipo_participacion"], "TRIBUNAL")
        self.assertEqual(tribunal["ambito"], "ETAPA")
        self.assertEqual(tribunal["codigo_etapa"], "TEMATICA_TESIS")
        self.assertEqual((tribunal["minimo"], tribunal["maximo"]), (3, 3))
        self.assertTrue(tribunal["ordenado"])
        self.assertEqual(tribunal["ordenes_permitidos"], [1, 2, 3])
        self.assertEqual(tutor["tipo_participacion"], "TUTOR")
        self.assertEqual(tutor["ambito"], "POSTULACION")
        self.assertEqual(tutor["precondicion"]["estado"], "PENDIENTE")
        for grupo in config["grupos"]:
            self.assertTrue(grupo["obligatoriedad"])
            self.assertNotIn("restriccion_identidad", grupo)
            self.assertNotIn("ocupacion_actor", grupo)

    def test_tutor_se_bloquea_hasta_aprobar_tematica_y_luego_se_habilita(self):
        tematica = self._activar_tematica()
        tutor_antes = next(
            item for item in self._gestion_actores(self.admin)["posiciones"]
            if item["tipo_participacion"] == "TUTOR"
        )
        self.assertEqual(tutor_antes["ambito"], "POSTULACION")
        self.assertEqual(tutor_antes["precondicion"]["estado"], "PENDIENTE")
        self.assertEqual(tutor_antes["acciones_permitidas"], [])
        self.assertEqual(tutor_antes["bloqueo"]["codigo"], "TEMATICA_TESIS_NO_APROBADA")
        with self.assertRaisesRegex(ValidationError, "después de aprobar"):
            AsignacionService.asignar_actor(
                self.postulacion, self.docentes[0], "TUTOR", self.admin,
            )

        SeguimientoEtapa.objects.filter(pk=tematica.pk).update(estado="APROBADA")
        self._activar_etapa("PERFIL_TESIS")
        tutor_despues = next(
            item for item in self._gestion_actores(self.admin)["posiciones"]
            if item["tipo_participacion"] == "TUTOR"
        )
        self.assertEqual(tutor_despues["precondicion"]["estado"], "CUMPLIDA")
        self.assertEqual(tutor_despues["acciones_permitidas"], ["ASIGNAR"])
        self.assertIsNone(tutor_despues["seguimiento_etapa"])

    def test_tutor_api_asigna_reemplaza_y_preserva_ambito_postulacion(self):
        self._activar_etapa("PERFIL_TESIS")
        client = APIClient()
        client.force_authenticate(self.admin)

        candidates = client.get(
            f"/api/v1/postulaciones/{self.postulacion.pk}/candidatos-asignacion/",
            {"posicion": "TUTOR_TESIS_1", "accion": "ASIGNAR"},
        )
        self.assertEqual(candidates.status_code, 200, candidates.data)
        self.assertIn(self.docentes[0].pk, {item["id"] for item in candidates.data["results"]})

        assigned = client.post(
            f"/api/v1/postulaciones/{self.postulacion.pk}/asignaciones/asignar/",
            {"usuario": self.docentes[0].pk, "tipo_participacion": "TUTOR"},
            format="json",
        )
        self.assertEqual(assigned.status_code, 201, assigned.data)
        self.assertIsNone(assigned.data["seguimiento_etapa"])

        replaced = client.post(
            f"/api/v1/asignaciones/{assigned.data['id']}/reemplazar/",
            {"nuevo_usuario": self.docentes[1].pk},
            format="json",
        )
        self.assertEqual(replaced.status_code, 200, replaced.data)
        self.assertIsNone(replaced.data["seguimiento_etapa"])
        self.assertFalse(AsignacionPostulacion.all_objects.get(pk=assigned.data["id"]).activo)

        student_position = next(
            item for item in self._gestion_actores(self.student)["posiciones"]
            if item["tipo_participacion"] == "TUTOR"
        )
        self.assertEqual(student_position["acciones_permitidas"], [])

    def test_docente_modalidad_privada_usa_ambito_postulacion_y_conserva_historial(self):
        privada = self._activar_etapa("DEFENSA_PRIVADA")
        posiciones = self._gestion_actores(self.admin)["posiciones"]
        docente = next(item for item in posiciones if item["tipo_participacion"] == "DOCENTE_MODALIDAD")
        self.assertEqual(docente["ambito"], "POSTULACION")
        self.assertIsNone(docente["seguimiento_etapa"])
        self.assertEqual(docente["acciones_permitidas"], ["ASIGNAR"])
        self.assertNotIn("restriccion_identidad", next(
            grupo for grupo in TesisGradoPolicy().get_configuracion_actores(self.postulacion, privada)["grupos"]
            if grupo["tipo_participacion"] == "DOCENTE_MODALIDAD"
        ))

        client = APIClient()
        client.force_authenticate(self.admin)
        candidates = client.get(
            f"/api/v1/postulaciones/{self.postulacion.pk}/candidatos-asignacion/",
            {"posicion": "DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TESIS_1", "accion": "ASIGNAR"},
        )
        self.assertEqual(candidates.status_code, 200, candidates.data)
        self.assertIn(self.docentes[0].pk, {item["id"] for item in candidates.data["results"]})

        asignado = AsignacionService.asignar_actor(
            self.postulacion, self.docentes[0], "DOCENTE_MODALIDAD", self.admin,
        )
        reemplazo = AsignacionService.reemplazar_actor(
            asignado, self.docentes[1], self.admin, "Reemplazo de prueba",
        )
        self.assertIsNone(reemplazo.seguimiento_etapa_id)
        self.assertFalse(AsignacionPostulacion.all_objects.get(pk=asignado.pk).activo)
        self.assertTrue(AsignacionPostulacion.all_objects.filter(pk=asignado.pk).exists())

        admin_position = next(
            item for item in self._gestion_actores(self.admin)["posiciones"]
            if item["tipo_participacion"] == "DOCENTE_MODALIDAD"
        )
        student_position = next(
            item for item in self._gestion_actores(self.student)["posiciones"]
            if item["tipo_participacion"] == "DOCENTE_MODALIDAD"
        )
        self.assertEqual(admin_position["asignacion_actual"], reemplazo.pk)
        self.assertEqual(admin_position["acciones_permitidas"], ["REEMPLAZAR", "FINALIZAR"])
        self.assertEqual(student_position["acciones_permitidas"], [])

    def test_gestion_actores_proyecta_posiciones_y_permisos_en_tematica(self):
        tematica = self._activar_tematica()

        posiciones_admin = self._gestion_actores(self.admin)["posiciones"]
        posiciones_estudiante = self._gestion_actores(self.student)["posiciones"]

        tribunales_admin = [
            item for item in posiciones_admin if item["tipo_participacion"] == "TRIBUNAL"
        ]
        tribunales_estudiante = [
            item for item in posiciones_estudiante if item["tipo_participacion"] == "TRIBUNAL"
        ]
        self.assertEqual(
            [item["clave"] for item in tribunales_admin],
            [
                "TRIBUNAL_TEMATICA_TESIS_1",
                "TRIBUNAL_TEMATICA_TESIS_2",
                "TRIBUNAL_TEMATICA_TESIS_3",
            ],
        )
        self.assertEqual([item["orden_cargo"] for item in tribunales_admin], [1, 2, 3])
        self.assertTrue(all(item["ambito"] == "ETAPA" for item in tribunales_admin))
        self.assertTrue(all(item["seguimiento_etapa"] == tematica.pk for item in tribunales_admin))
        self.assertTrue(all(item["obligatoriedad"] for item in tribunales_admin))
        self.assertTrue(all(item["acciones_permitidas"] == ["ASIGNAR"] for item in tribunales_admin))
        self.assertTrue(all(item["acciones_permitidas"] == [] for item in tribunales_estudiante))

    def test_candidatos_y_ciclo_de_asignacion_preservan_contexto_e_historial(self):
        tematica = self._activar_tematica()
        client = APIClient()
        client.force_authenticate(self.student)
        forbidden = client.get(
            f"/api/v1/postulaciones/{self.postulacion.pk}/candidatos-asignacion/",
            {"posicion": "TRIBUNAL_TEMATICA_TESIS_1", "accion": "ASIGNAR"},
        )
        self.assertEqual(forbidden.status_code, 403)

        client.force_authenticate(self.admin)
        candidates = client.get(
            f"/api/v1/postulaciones/{self.postulacion.pk}/candidatos-asignacion/",
            {"posicion": "TRIBUNAL_TEMATICA_TESIS_1", "accion": "ASIGNAR"},
        )
        self.assertEqual(candidates.status_code, 200, candidates.data)
        candidate_ids = {item["id"] for item in candidates.data["results"]}
        self.assertIn(self.docentes[0].pk, candidate_ids)
        self.assertNotIn(self.student.pk, candidate_ids)

        assigned = client.post(
            f"/api/v1/postulaciones/{self.postulacion.pk}/asignaciones/asignar/",
            {
                "usuario": self.docentes[0].pk,
                "tipo_participacion": "TRIBUNAL",
                "orden_cargo": 1,
                "seguimiento_etapa": tematica.pk,
            },
            format="json",
        )
        self.assertEqual(assigned.status_code, 201, assigned.data)
        original_id = assigned.data["id"]

        replaced = client.post(
            f"/api/v1/asignaciones/{original_id}/reemplazar/",
            {"nuevo_usuario": self.docentes[1].pk, "observaciones": "Reemplazo de prueba"},
            format="json",
        )
        self.assertEqual(replaced.status_code, 200, replaced.data)
        self.assertEqual(replaced.data["orden_cargo"], 1)
        self.assertEqual(replaced.data["seguimiento_etapa"], tematica.pk)
        self.assertFalse(AsignacionPostulacion.all_objects.get(pk=original_id).activo)
        self.assertTrue(AsignacionPostulacion.all_objects.filter(pk=original_id).exists())

        finalized = client.post(
            f"/api/v1/asignaciones/{replaced.data['id']}/finalizar/",
            {"observaciones": "Finalizacion de prueba"},
            format="json",
        )
        self.assertEqual(finalized.status_code, 200, finalized.data)
        self.assertFalse(AsignacionPostulacion.all_objects.get(pk=replaced.data["id"]).activo)

    def test_tematica_rechaza_orden_duplicado_y_cuarto_tribunal(self):
        tematica = self._activar_tematica()
        AsignacionService.asignar_actor(
            self.postulacion, self.docentes[0], "TRIBUNAL", self.admin,
            orden_cargo=1, seguimiento_etapa=tematica,
        )
        with self.assertRaisesRegex(ValidationError, "ese orden de cargo"):
            AsignacionService.asignar_actor(
                self.postulacion, self.docentes[1], "TRIBUNAL", self.admin,
                orden_cargo=1, seguimiento_etapa=tematica,
            )
        for orden, docente in ((2, self.docentes[1]), (3, self.docentes[2])):
            AsignacionService.asignar_actor(
                self.postulacion, docente, "TRIBUNAL", self.admin,
                orden_cargo=orden, seguimiento_etapa=tematica,
            )
        with self.assertRaisesRegex(ValidationError, "no se admite un cuarto tribunal"):
            AsignacionService.asignar_actor(
                self.postulacion, self.docentes[3], "TRIBUNAL", self.admin,
                orden_cargo=4, seguimiento_etapa=tematica,
            )

    def test_orientacion_evoluciona_de_cero_a_tres_tribunales(self):
        tematica = self._activar_tematica()
        policy = TesisGradoPolicy()

        displays = []
        for orden in range(4):
            orientacion = policy.get_orientacion_etapa_actual(
                postulacion=self.postulacion,
                seguimiento=tematica,
            )
            displays.append(orientacion["requisitos"][0]["estado_display"])
            if orden < 3:
                AsignacionService.asignar_actor(
                    self.postulacion, self.docentes[orden], "TRIBUNAL", self.admin,
                    orden_cargo=orden + 1, seguimiento_etapa=tematica,
                )

        self.assertEqual(displays, ["0/3", "1/3", "2/3", "3/3"])
        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "PROGRAMAR_EVENTO")

    def test_orientacion_tematica_insuficiente_requiere_resolucion_academica(self):
        tematica = self._activar_tematica()
        consolidado = self._crear_evento_tematica_consolidado(tematica, "INSUFICIENTE")

        orientacion = TesisGradoPolicy().get_orientacion_etapa_actual(
            postulacion=self.postulacion,
            seguimiento=tematica,
        )

        self.assertEqual(
            orientacion["siguiente_accion"]["codigo"],
            "RESOLUCION_ACADEMICA_PENDIENTE",
        )
        self.assertNotEqual(orientacion["siguiente_accion"]["codigo"], "APROBAR_ETAPA")
        self.assertIsNone(orientacion["siguiente_accion"]["destino"])
        self.assertIn("INSUFICIENTE", orientacion["mensaje"])
        self.assertIn("Art. 44", orientacion["mensaje"])
        self.assertNotIn("aprobar", WorkflowService.obtener_acciones_permitidas(tematica))
        tematica.refresh_from_db()
        self.assertEqual(tematica.estado, SeguimientoEtapa.EstadoChoices.EN_PROCESO)
        consolidado.refresh_from_db()
        self.assertTrue(consolidado.activo)

    def test_orientacion_tematica_suficiente_conserva_aprobacion(self):
        tematica = self._activar_tematica()
        self._crear_evento_tematica_consolidado(tematica, "SUFICIENTE")

        orientacion = TesisGradoPolicy().get_orientacion_etapa_actual(
            postulacion=self.postulacion,
            seguimiento=tematica,
        )

        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "APROBAR_ETAPA")
        self.assertEqual(orientacion["siguiente_accion"]["estado"], "DISPONIBLE")

    def test_bloquea_inicio_fuera_de_secuencia_e_inscripcion_sin_documentos(self):
        with self.assertRaises(ValidationError):
            WorkflowService.iniciar_etapa(self.seguimientos["TEMATICA_TESIS"], self.admin)
        WorkflowService.iniciar_etapa(self.seguimientos["INSCRIPCION"], self.admin)
        with self.assertRaises(ValidationError):
            WorkflowService.aprobar_etapa(self.seguimientos["INSCRIPCION"], self.admin)

    def test_aprobacion_publica_requiere_evento_del_intento_actual(self):
        self._preparar_gate_publica_valido()
        public = self._activar_etapa("DEFENSA_PUBLICA")

        with self.assertRaises(ValidationError):
            WorkflowService.aprobar_etapa(public, self.admin)

    def test_endpoint_administrativo_bloquea_aprobacion_publica_sin_evento(self):
        self._preparar_gate_publica_valido()
        public = self._activar_etapa("DEFENSA_PUBLICA")
        client = APIClient()
        client.force_authenticate(self.admin)

        response = client.post(
            f"/api/v1/seguimientos-etapa/{public.pk}/aprobar/",
            {}, format="json",
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("evento finalizado", str(response.data))

    def test_aprobacion_publica_requiere_evento_finalizado(self):
        self._preparar_gate_publica_valido()
        public = self._activar_etapa("DEFENSA_PUBLICA")
        EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=public,
            tipo_evento="DEFENSA_PUBLICA", estado="PROGRAMADA", numero_intento=public.numero_intento,
            fecha_programada="2026-08-02T10:00:00Z", lugar="Auditorio", programado_por=self.admin,
        )

        with self.assertRaises(ValidationError):
            WorkflowService.aprobar_etapa(public, self.admin)

    def test_aprobacion_publica_requiere_consolidado(self):
        self._preparar_gate_publica_valido()
        public = self._activar_etapa("DEFENSA_PUBLICA")
        EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=public,
            tipo_evento="DEFENSA_PUBLICA", estado="FINALIZADA", numero_intento=public.numero_intento,
            fecha_programada="2026-08-02T10:00:00Z", fecha_fin_real="2026-08-02T11:00:00Z",
            lugar="Auditorio", programado_por=self.admin,
        )

        with self.assertRaises(ValidationError):
            WorkflowService.aprobar_etapa(public, self.admin)

    def test_aprobacion_publica_rechaza_consolidado_postergado(self):
        self._preparar_gate_publica_valido()
        public = self._activar_etapa("DEFENSA_PUBLICA")
        self._crear_evento_publico_consolidado(public, nota=Decimal("20"))

        with self.assertRaises(ValidationError):
            WorkflowService.aprobar_etapa(public, self.admin)

    def test_aprobacion_publica_no_reutiliza_evento_aprobado_de_intento_anterior(self):
        self._preparar_gate_publica_valido()
        previous = self._activar_etapa("DEFENSA_PUBLICA")
        previous.estado = SeguimientoEtapa.EstadoChoices.APROBADA
        previous.save(update_fields=["estado"])
        self._crear_evento_publico_consolidado(previous)
        current = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion, etapa=previous.etapa, numero_intento=2,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
        )

        with self.assertRaises(ValidationError):
            WorkflowService.aprobar_etapa(current, self.admin)

    @override_settings(STORAGES={"default": {"BACKEND": "django.core.files.storage.InMemoryStorage"}})
    def test_autoaprobacion_acta_reutiliza_gate_real_y_no_concluye(self):
        self._preparar_gate_publica_valido()
        public = self._activar_etapa("DEFENSA_PUBLICA")
        event = self._crear_evento_publico_consolidado(public)
        public.estado = "APROBADA"
        public.save(update_fields=["estado"])
        version = DocumentoService().subir_documento(
            self.postulacion, TipoDocumento.objects.get(codigo="ACTA_DEFENSA"),
            SimpleUploadedFile("acta.pdf", b"%PDF-1.4", content_type="application/pdf"),
            self.admin, evento_defensa=event,
        )
        version.documento.refresh_from_db()
        self.assertEqual(version.documento.estado.codigo, "APR")
        self.postulacion.refresh_from_db()
        self.assertNotEqual(self.postulacion.estado_actual.codigo, "CONCLUIDA")
        TesisGradoPolicy().validar_conclusion_academica(self.postulacion)

    @override_settings(STORAGES={"default": {"BACKEND": "django.core.files.storage.InMemoryStorage"}})
    def test_autoaprobacion_acta_no_omite_gates_ni_resultado(self):
        self._preparar_gate_publica_valido()
        public = self._activar_etapa("DEFENSA_PUBLICA")
        event = self._crear_evento_publico_consolidado(public, nota=Decimal("20"))
        public.estado = "APROBADA"
        public.save(update_fields=["estado"])
        service = DocumentoService()
        policy = TesisGradoPolicy()
        self.assertFalse(service._puede_autoaprobar_acta_tesis(self.postulacion, event, policy))
        event.evaluaciones.update(nota_numerica=Decimal("70"))
        self.assertTrue(service._puede_autoaprobar_acta_tesis(self.postulacion, event, policy))
        DocumentoPostulacion.objects.filter(postulacion=self.postulacion,
            tipo_documento__codigo="DOCUMENTO_FINAL").update(activo=False)
        self.assertFalse(service._puede_autoaprobar_acta_tesis(self.postulacion, event, policy))
        version = service.subir_documento(self.postulacion,
            TipoDocumento.objects.get(codigo="ACTA_DEFENSA"),
            SimpleUploadedFile("acta.pdf", b"%PDF-1.4", content_type="application/pdf"),
            self.admin, evento_defensa=event)
        self.assertEqual(version.documento.estado.codigo, "ENV")

    def test_conclusion_requiere_defensa_publica_aprobada(self):
        self._preparar_conclusion_valida(estado_publico="EN_PROCESO")

        with self.assertRaisesRegex(ValidationError, "Defensa Pública aprobada"):
            TesisGradoPolicy().validar_conclusion_academica(self.postulacion)

    def test_conclusion_requiere_resultado_completo_y_no_postergado(self):
        self._preparar_conclusion_valida(nota_publica=None)
        with self.assertRaisesRegex(ValidationError, "nota final aprobatoria"):
            TesisGradoPolicy().validar_conclusion_academica(self.postulacion)

    def test_conclusion_rechaza_resultado_postergado(self):
        self._preparar_conclusion_valida(nota_publica=Decimal("20"))
        with self.assertRaisesRegex(ValidationError, "nota final aprobatoria"):
            TesisGradoPolicy().validar_conclusion_academica(self.postulacion)

    def test_conclusion_requiere_acta_vinculada_al_intento_actual(self):
        self._preparar_conclusion_valida(incluir_acta=False)
        with self.assertRaisesRegex(ValidationError, "ACTA_DEFENSA vigente"):
            TesisGradoPolicy().validar_conclusion_academica(self.postulacion)

    def test_conclusion_rechaza_acta_de_otro_intento(self):
        self._preparar_conclusion_valida(acta_otro_intento=True)
        with self.assertRaisesRegex(ValidationError, "ACTA_DEFENSA vigente"):
            TesisGradoPolicy().validar_conclusion_academica(self.postulacion)

    def test_conclusion_requiere_acta_aprobada_sin_correccion_pendiente(self):
        self._preparar_conclusion_valida(estado_acta="PENDIENTE_TEST")
        with self.assertRaisesRegex(ValidationError, "ACTA_DEFENSA vigente"):
            TesisGradoPolicy().validar_conclusion_academica(self.postulacion)

    def test_conclusion_rechaza_acta_con_correccion_pendiente(self):
        self._preparar_conclusion_valida()
        DocumentoPostulacion.objects.filter(
            postulacion=self.postulacion, tipo_documento__codigo="ACTA_DEFENSA",
        ).update(requiere_correccion=True)
        with self.assertRaisesRegex(ValidationError, "ACTA_DEFENSA vigente"):
            TesisGradoPolicy().validar_conclusion_academica(self.postulacion)

    def test_conclusion_requiere_version_actual_activa(self):
        self._preparar_conclusion_valida(incluir_version=False)
        with self.assertRaisesRegex(ValidationError, "ACTA_DEFENSA vigente"):
            TesisGradoPolicy().validar_conclusion_academica(self.postulacion)

    def test_conclusion_rechaza_version_inactiva(self):
        self._preparar_conclusion_valida(version_activa=False)
        with self.assertRaisesRegex(ValidationError, "ACTA_DEFENSA vigente"):
            TesisGradoPolicy().validar_conclusion_academica(self.postulacion)

    def test_conclusion_rechaza_version_no_actual(self):
        self._preparar_conclusion_valida(version_actual=False)
        with self.assertRaisesRegex(ValidationError, "ACTA_DEFENSA vigente"):
            TesisGradoPolicy().validar_conclusion_academica(self.postulacion)

    def test_endpoint_conclusion_rechaza_usuario_no_autorizado(self):
        client = APIClient()
        client.force_authenticate(self.student)

        response = client.post(
            f"/api/v1/postulaciones/{self.postulacion.pk}/concluir-academicamente/",
            {}, format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_documentos_aplicables_por_etapa(self):
        policy = TesisGradoPolicy().requisitos_policy
        self.assertEqual(policy.get_documentos_requeridos("INSCRIPCION"), (
            "CARTA_SOLICITUD", "MATRICULA_VIGENTE", "HISTORIAL_PRERREQ",
        ))
        self.assertEqual(policy.get_documentos_requeridos("TEMATICA_TESIS"), ())
        self.assertEqual(policy.get_documentos_requeridos("PERFIL_TESIS"), ("PERFIL_TESIS", "INFORME_TUTOR_TESIS"))
        self.assertEqual(policy.get_documentos_requeridos("DOCUMENTO_FINAL"), ("DOCUMENTO_FINAL", "INFORME_TUTOR_TESIS"))
        self.assertEqual(policy.get_documentos_requeridos("REVISION_TUTOR"), ("DOCUMENTO_FINAL", "INFORME_TUTOR_TESIS"))
        self.assertEqual(policy.get_documentos_requeridos("REVISION_TRIBUNAL"), ("DOCUMENTO_FINAL", "INFORME_TRIB_TESIS"))
        self.assertEqual(policy.get_documentos_requeridos("DEFENSA_PRIVADA"), ())
        self.assertEqual(policy.get_documentos_requeridos("DEFENSA_PUBLICA"), ("ACTA_DEFENSA",))

    def test_contexto_documental_post_macroflujo_expone_acta_defensa(self):
        policy = ModalidadPolicyRegistry.get(self.postulacion)
        self.assertEqual(policy.resolver_contexto_documental(self.postulacion), "INSCRIPCION")

        self.postulacion.seguimientos_etapa.update(estado=SeguimientoEtapa.EstadoChoices.APROBADA)
        self.assertEqual(policy.resolver_contexto_documental(self.postulacion), "DEFENSA_PUBLICA")

        client = APIClient()
        client.force_authenticate(self.admin)
        response = client.get(f"/api/v1/postulaciones/{self.postulacion.pk}/documentos-aplicables/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["etapa_actual"], "DEFENSA_PUBLICA")
        self.assertEqual(response.data["documentos_aplicables"], [{
            "id": TipoDocumento.objects.get(codigo="ACTA_DEFENSA").pk,
            "codigo": "ACTA_DEFENSA",
            "nombre": "Acta de Defensa",
            "capacidad_carga": {
                "permitida": True,
                "codigo": "SIN_DOCUMENTO",
                "mensaje": "El documento todavía no fue cargado.",
            },
        }])

        self.postulacion.estado_actual = EstadoPostulacion.objects.get(codigo="CONCLUIDA")
        self.assertIsNone(policy.resolver_contexto_documental(self.postulacion))

    def test_capacidad_preserva_correccion_post_aprobacion_de_documento_final(self):
        tipo = TipoDocumento.objects.get(codigo="DOCUMENTO_FINAL")
        documento = DocumentoPostulacion.objects.create(
            postulacion=self.postulacion,
            tipo_documento=tipo,
            estado=EstadoDocumento.objects.get(codigo="APR"),
            requiere_correccion=True,
        )
        policy = ModalidadPolicyRegistry.get(self.postulacion)
        service = DocumentoService()

        bloqueada = service.obtener_capacidad_carga(
            postulacion=self.postulacion,
            tipo_documento=tipo,
            usuario=self.student,
            documento=documento,
            policy=policy,
        )
        self.assertFalse(bloqueada["permitida"])
        self.assertEqual(bloqueada["codigo"], "DOCUMENTO_APROBADO")

        evento = EventoDefensa.objects.create(
            postulacion=self.postulacion,
            seguimiento_etapa=self.seguimientos["DEFENSA_PRIVADA"],
            tipo_evento="DEFENSA_PRIVADA",
            estado="FINALIZADA",
            fecha_programada="2026-08-01T10:00:00Z",
            fecha_fin_real="2026-08-01T11:00:00Z",
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

        permitida = service.obtener_capacidad_carga(
            postulacion=self.postulacion,
            tipo_documento=tipo,
            usuario=self.student,
            documento=documento,
            policy=policy,
        )
        self.assertTrue(permitida["permitida"])
        self.assertEqual(permitida["codigo"], "CORRECCION_POST_APROBACION")
        self.assertTrue(permitida["excepcion_aplicabilidad"])

    def test_correccion_post_aprobacion_es_aplicable_y_admite_subida_real(self):
        self.postulacion.seguimientos_etapa.update(estado=SeguimientoEtapa.EstadoChoices.APROBADA)
        tipo = TipoDocumento.objects.get(codigo="DOCUMENTO_FINAL")
        documento = DocumentoPostulacion.objects.create(
            postulacion=self.postulacion,
            tipo_documento=tipo,
            estado=EstadoDocumento.objects.get(codigo="APR"),
            requiere_correccion=True,
        )
        VersionDocumento.objects.create(
            documento=documento,
            subido_por=self.student,
            numero_version=1,
            archivo=SimpleUploadedFile("final-v1.pdf", b"%PDF-1.4", content_type="application/pdf"),
            nombre_original="final-v1.pdf",
            tamano_bytes=8,
            hash_sha256="0" * 64,
            es_version_actual=True,
        )
        evento = EventoDefensa.objects.create(
            postulacion=self.postulacion,
            seguimiento_etapa=self.seguimientos["DEFENSA_PRIVADA"],
            tipo_evento="DEFENSA_PRIVADA",
            estado="FINALIZADA",
            fecha_programada="2026-08-01T10:00:00Z",
            fecha_fin_real="2026-08-01T11:00:00Z",
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
        client = APIClient()
        client.force_authenticate(self.student)

        applicable = client.get(
            f"/api/v1/postulaciones/{self.postulacion.pk}/documentos-aplicables/"
        )
        item = next(
            item for item in applicable.data["documentos_aplicables"]
            if item["codigo"] == "DOCUMENTO_FINAL"
        )
        self.assertTrue(item["capacidad_carga"]["permitida"])
        self.assertTrue(item["capacidad_carga"]["excepcion_aplicabilidad"])

        uploaded = client.post(
            "/api/v1/documentos/documentos/subir/",
            {
                "postulacion_id": self.postulacion.pk,
                "tipo_documento_id": tipo.pk,
                "archivo": SimpleUploadedFile(
                    "final-v2.pdf", b"%PDF-1.4 nueva", content_type="application/pdf",
                ),
            },
            format="multipart",
        )

        self.assertEqual(uploaded.status_code, 201)
        self.assertEqual(documento.versiones.count(), 2)

    def test_correccion_post_aprobacion_no_relaja_otros_documentos_ni_condicion_policy(self):
        self.postulacion.seguimientos_etapa.update(estado=SeguimientoEtapa.EstadoChoices.APROBADA)
        tipo_final = TipoDocumento.objects.get(codigo="DOCUMENTO_FINAL")
        documento = DocumentoPostulacion.objects.create(
            postulacion=self.postulacion,
            tipo_documento=tipo_final,
            estado=EstadoDocumento.objects.get(codigo="APR"),
            requiere_correccion=True,
        )
        client = APIClient()
        client.force_authenticate(self.student)

        blocked = client.post(
            "/api/v1/documentos/documentos/subir/",
            {
                "postulacion_id": self.postulacion.pk,
                "tipo_documento_id": tipo_final.pk,
                "archivo": SimpleUploadedFile("final.pdf", b"%PDF-1.4", content_type="application/pdf"),
            },
            format="multipart",
        )
        self.assertEqual(blocked.status_code, 400)
        self.assertEqual(documento.versiones.count(), 0)

        tipo_ordinario = TipoDocumento.objects.get(codigo="INFORME_TUTOR_TESIS")
        ordinary = client.post(
            "/api/v1/documentos/documentos/subir/",
            {
                "postulacion_id": self.postulacion.pk,
                "tipo_documento_id": tipo_ordinario.pk,
                "archivo": SimpleUploadedFile("informe.pdf", b"%PDF-1.4", content_type="application/pdf"),
            },
            format="multipart",
        )
        self.assertEqual(ordinary.status_code, 400)
        self.assertFalse(
            DocumentoPostulacion.all_objects.filter(
                postulacion=self.postulacion, tipo_documento=tipo_ordinario,
            ).exists()
        )

    def _crear_documento_version(self, codigo, numero=1, actual=True):
        documento = DocumentoPostulacion.objects.create(
            postulacion=self.postulacion,
            tipo_documento=TipoDocumento.objects.get(codigo=codigo),
            estado=EstadoDocumento.objects.get(codigo="APR"),
        )
        return VersionDocumento.objects.create(
            documento=documento, subido_por=self.admin, numero_version=numero,
            archivo=SimpleUploadedFile(f"{codigo}-{numero}.pdf", b"pdf"),
            nombre_original=f"{codigo}-{numero}.pdf", tamano_bytes=3,
            hash_sha256=str(numero) * 64, es_version_actual=actual,
        )

    def _orientacion_revision_tribunal(self):
        request = APIRequestFactory().get("/")
        request.user = self.admin
        return FlujoPostulacionSerializer(
            self.postulacion, context={"request": request},
        ).data["orientacion_etapa_actual"]

    def test_orientacion_revision_tribunal_sin_informe_prioriza_carga(self):
        seguimiento = self._activar_etapa("REVISION_TRIBUNAL")
        self._crear_documento_version("DOCUMENTO_FINAL")
        orientation = TesisGradoPolicy().get_orientacion_etapa_actual(
            postulacion=self.postulacion, seguimiento=seguimiento,
        )
        self.assertEqual(orientation["siguiente_accion"], {
            "codigo": "COMPLETAR_DOCUMENTOS", "titulo": "Cargar Informe del Tribunal de Tesis",
            "descripcion": "Adjunta el Informe del Tribunal de Tesis requerido para registrar el dictamen correspondiente.",
            "estado": "PENDIENTE", "estado_display": "Pendiente",
            "destino": "#documentos", "accion_label": "Gestionar documentos",
        })
        requirement, = orientation["requisitos"]
        self.assertEqual(requirement["codigo"], "INFORME_TRIB_TESIS")
        self.assertFalse(requirement["cumplido"])
        self.assertEqual(requirement["destino"], "#documentos")

    def test_orientacion_revision_tribunal_evidencia_vigente_no_exige_aprobacion(self):
        seguimiento = self._activar_etapa("REVISION_TRIBUNAL")
        self._crear_documento_version("DOCUMENTO_FINAL")
        evidence = self._crear_documento_version("INFORME_TRIB_TESIS")
        for state in EstadoDocumento.objects.all():
            with self.subTest(estado=state.codigo):
                DocumentoPostulacion.objects.filter(pk=evidence.documento_id).update(
                    estado=state, requiere_correccion=True,
                )
                orientation = TesisGradoPolicy().get_orientacion_etapa_actual(
                    postulacion=self.postulacion, seguimiento=seguimiento,
                )
                self.assertEqual(orientation["siguiente_accion"]["codigo"], "REGISTRAR_DICTAMEN")
                self.assertEqual(orientation["siguiente_accion"]["estado"], "DISPONIBLE")

    def test_orientacion_revision_tribunal_descarta_evidencia_no_vigente_o_ambigua(self):
        seguimiento = self._activar_etapa("REVISION_TRIBUNAL")
        self._crear_documento_version("DOCUMENTO_FINAL")
        evidence = self._crear_documento_version("INFORME_TRIB_TESIS")
        for changes in ({"activo": False}, {"es_version_actual": False}):
            with self.subTest(changes=changes):
                VersionDocumento.all_objects.filter(pk=evidence.pk).update(**changes)
                orientation = TesisGradoPolicy().get_orientacion_etapa_actual(
                    postulacion=self.postulacion, seguimiento=seguimiento,
                )
                self.assertEqual(orientation["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")
                VersionDocumento.all_objects.filter(pk=evidence.pk).update(activo=True, es_version_actual=True)
        duplicate = VersionDocumento.objects.create(
            documento=evidence.documento, subido_por=self.admin, numero_version=2,
            archivo="informe-2.pdf", nombre_original="informe-2.pdf", tamano_bytes=3,
            hash_sha256="2" * 64, es_version_actual=True,
        )
        orientation = TesisGradoPolicy().get_orientacion_etapa_actual(postulacion=self.postulacion, seguimiento=seguimiento)
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")
        duplicate.activo = False
        duplicate.save(update_fields=["activo"])
        DocumentoPostulacion.objects.filter(pk=evidence.documento_id).update(activo=False)
        orientation = TesisGradoPolicy().get_orientacion_etapa_actual(postulacion=self.postulacion, seguimiento=seguimiento)
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")

    def test_orientacion_revision_tutor_sin_informe_conserva_contrato(self):
        seguimiento = self._activar_etapa("REVISION_TUTOR")
        self._crear_documento_version("DOCUMENTO_FINAL")
        orientation = TesisGradoPolicy().get_orientacion_etapa_actual(postulacion=self.postulacion, seguimiento=seguimiento)
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "REGISTRAR_DICTAMEN")
        self.assertEqual(orientation["siguiente_accion"]["destino"], "#dictamen-tutor")

    def test_orientacion_revision_tribunal_informe_sin_version_prioriza_carga(self):
        seguimiento = self._activar_etapa("REVISION_TRIBUNAL")
        DocumentoPostulacion.objects.create(
            postulacion=self.postulacion,
            tipo_documento=TipoDocumento.objects.get(codigo="INFORME_TRIB_TESIS"),
            estado=EstadoDocumento.objects.get(codigo="ENV"),
        )
        orientation = TesisGradoPolicy().get_orientacion_etapa_actual(postulacion=self.postulacion, seguimiento=seguimiento)
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")

    def test_orientacion_revision_tribunal_dictamen_actual_prevalece_sin_evidencia_utilizable(self):
        seguimiento = self._activar_etapa("REVISION_TRIBUNAL")
        final = self._crear_documento_version("DOCUMENTO_FINAL")
        evidence = self._crear_documento_version("INFORME_TRIB_TESIS", actual=False)
        dictamen = DictamenRevisionDocumento.objects.create(
            seguimiento_etapa=seguimiento, version_documento_revisada=final,
            tipo_revision="TRIBUNAL", resultado="SUFICIENTE", evidencia_version=evidence,
        )
        for result, action in (("SUFICIENTE", "APROBAR_ETAPA"), ("INSUFICIENTE", "CORREGIR_DOCUMENTO_FINAL")):
            with self.subTest(resultado=result):
                DictamenRevisionDocumento.objects.filter(pk=dictamen.pk).update(resultado=result)
                orientation = TesisGradoPolicy().get_orientacion_etapa_actual(postulacion=self.postulacion, seguimiento=seguimiento)
                self.assertEqual(orientation["siguiente_accion"]["codigo"], action)

    def test_orientacion_revision_tribunal_insuficiente_pide_corregir_documento(self):
        seguimiento = self.seguimientos["REVISION_TRIBUNAL"]
        SeguimientoEtapa.objects.filter(pk=seguimiento.pk).update(estado="OBSERVADA")
        final = self._crear_documento_version("DOCUMENTO_FINAL")
        evidencia = self._crear_documento_version("INFORME_TRIB_TESIS")
        DictamenRevisionDocumento.objects.create(
            seguimiento_etapa=seguimiento, version_documento_revisada=final,
            tipo_revision="TRIBUNAL", resultado="INSUFICIENTE",
            evidencia_version=evidencia,
        )
        orientacion = self._orientacion_revision_tribunal()
        action = orientacion["siguiente_accion"]
        self.assertEqual(action["titulo"], "Corregir Documento Final y registrar nuevo dictamen")
        self.assertEqual(action["estado"], "PENDIENTE")
        self.assertEqual(action["destino"], "#documentos")

    def test_orientacion_revision_tribunal_version_nueva_pide_nuevo_dictamen(self):
        seguimiento = self.seguimientos["REVISION_TRIBUNAL"]
        SeguimientoEtapa.objects.filter(pk=seguimiento.pk).update(estado="EN_PROCESO")
        final_v1 = self._crear_documento_version("DOCUMENTO_FINAL")
        final_v1.es_version_actual = False
        final_v1.save(update_fields=["es_version_actual"])
        final_document = final_v1.documento
        final_v2 = VersionDocumento.objects.create(
            documento=final_document, subido_por=self.admin, numero_version=2,
            archivo=SimpleUploadedFile("DOCUMENTO_FINAL-2.pdf", b"pdf"),
            nombre_original="DOCUMENTO_FINAL-2.pdf", tamano_bytes=3,
            hash_sha256="2" * 64, es_version_actual=True,
        )
        evidence = self._crear_documento_version("INFORME_TRIB_TESIS")
        DictamenRevisionDocumento.objects.create(
            seguimiento_etapa=seguimiento, version_documento_revisada=final_v1,
            tipo_revision="TRIBUNAL", resultado="INSUFICIENTE", evidencia_version=evidence,
        )
        action = self._orientacion_revision_tribunal()["siguiente_accion"]
        self.assertEqual(action["titulo"], "Registrar nuevo dictamen del Tribunal")
        self.assertEqual(action["estado"], "DISPONIBLE")
        self.assertEqual(action["destino"], "#dictamen-tribunal")

    def test_orientacion_revision_tribunal_suficiente_sobre_version_actual_pide_aprobar(self):
        seguimiento = self.seguimientos["REVISION_TRIBUNAL"]
        SeguimientoEtapa.objects.filter(pk=seguimiento.pk).update(estado="EN_PROCESO")
        final = self._crear_documento_version("DOCUMENTO_FINAL")
        evidence = self._crear_documento_version("INFORME_TRIB_TESIS")
        DictamenRevisionDocumento.objects.create(
            seguimiento_etapa=seguimiento, version_documento_revisada=final,
            tipo_revision="TRIBUNAL", resultado="SUFICIENTE", evidencia_version=evidence,
        )
        action = self._orientacion_revision_tribunal()["siguiente_accion"]
        self.assertEqual(action["titulo"], "Aprobar revisión")
        self.assertEqual(action["estado"], "DISPONIBLE")
        self.assertEqual(action["destino"], "#resumen")

    def test_tematica_exige_maximo_tres_tribunales_y_tutor_posterior(self):
        with self.assertRaises(ValidationError):
            AsignacionService.asignar_actor(self.postulacion, self.docentes[0], "TUTOR", self.admin)
        temat = self.seguimientos["TEMATICA_TESIS"]
        for orden, docente in enumerate(self.docentes[:3], start=1):
            AsignacionService.asignar_actor(self.postulacion, docente, "TRIBUNAL", self.admin, orden_cargo=orden, seguimiento_etapa=temat)
        with self.assertRaises(ValidationError):
            AsignacionService.asignar_actor(self.postulacion, self.docentes[3], "TRIBUNAL", self.admin, orden_cargo=4, seguimiento_etapa=temat)
        SeguimientoEtapa.objects.filter(pk=temat.pk).update(estado="APROBADA")
        self.assertEqual(AsignacionService.asignar_actor(self.postulacion, self.docentes[0], "TUTOR", self.admin).tipo_participacion, "TUTOR")

    def test_perfil_admite_un_reintento_y_bloquea_tercero(self):
        perfil = self.seguimientos["PERFIL_TESIS"]
        SeguimientoEtapa.objects.filter(pk=perfil.pk).update(estado="RECHAZADA")
        segundo = WorkflowService.crear_nuevo_intento(self.postulacion, perfil.etapa, self.admin)
        self.assertEqual(segundo.numero_intento, 2)
        SeguimientoEtapa.objects.filter(pk=segundo.pk).update(estado="RECHAZADA")
        with self.assertRaises(ValidationError):
            WorkflowService.crear_nuevo_intento(self.postulacion, perfil.etapa, self.admin)

    def test_defensa_privada_no_impone_un_tercer_intento(self):
        privada = self.seguimientos["DEFENSA_PRIVADA"]
        SeguimientoEtapa.objects.filter(pk=privada.pk).update(estado="RECHAZADA")
        segundo = WorkflowService.crear_nuevo_intento(self.postulacion, privada.etapa, self.admin)
        SeguimientoEtapa.objects.filter(pk=segundo.pk).update(estado="RECHAZADA")
        tercero = WorkflowService.crear_nuevo_intento(self.postulacion, privada.etapa, self.admin)
        self.assertEqual(tercero.numero_intento, 3)

    def test_quorum_publico_acepta_dos_tribunales_presidente_y_secretario(self):
        public = self.seguimientos["DEFENSA_PUBLICA"]
        event = EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=public,
            tipo_evento="DEFENSA_PUBLICA", estado="EN_CURSO", numero_intento=1,
            fecha_programada="2026-08-01T10:00:00Z", lugar="Aula",
            programado_por=self.admin,
        )
        roles = (("TRIBUNAL", self.docentes[0]), ("TRIBUNAL", self.docentes[1]),
                 ("PRESIDENTE", self.docentes[2]), ("SECRETARIO", self.docentes[3]))
        for role, user in roles:
            assignment = AsignacionPostulacion.objects.create(
                postulacion=self.postulacion, usuario=user,
                tipo_participacion=role, designado_por=self.admin,
            )
            participant = ParticipanteEvento.objects.create(
                evento=event, asignacion=assignment, rol_evento=role, presente=True,
            )
            self.assertTrue(participant.presente)

        result = TesisGradoPolicy().evento_policy.validar_quorum(event)
        self.assertTrue(result["valido"])
        self.assertEqual(result["detalle"], {"TRIBUNAL": 2, "PRESIDENTE": 1, "SECRETARIO": 1})

        ParticipanteEvento.objects.filter(rol_evento="PRESIDENTE").update(presente=False)
        result = TesisGradoPolicy().evento_policy.validar_quorum(event)
        self.assertFalse(result["valido"])
        self.assertEqual(result["faltantes"], {"PRESIDENTE": 1})

    def test_capacidad_preparatoria_publica_escala_promedio_y_gate(self):
        """La policy queda verificable sin habilitar ningún acto público real."""
        modalidad_policy = ModalidadPolicyRegistry.get(self.postulacion)
        policy = modalidad_policy.evaluacion_policy
        public = self.seguimientos["DEFENSA_PUBLICA"]
        event = EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=public,
            tipo_evento="DEFENSA_PUBLICA", estado="FINALIZADA", numero_intento=1,
            fecha_programada="2026-08-01T10:00:00Z", lugar="Aula",
            programado_por=self.admin,
        )
        thematic = self.seguimientos["TEMATICA_TESIS"]
        assignments = [AsignacionPostulacion.objects.create(
            postulacion=self.postulacion, usuario=docente, tipo_participacion="TRIBUNAL",
            seguimiento_etapa=thematic, designado_por=self.admin,
        ) for docente in self.docentes[:3]]
        participants = [ParticipanteEvento.objects.create(
            evento=event, asignacion=assignment, rol_evento="TRIBUNAL",
        ) for assignment in assignments]
        secretary_assignment = AsignacionPostulacion.objects.create(
            postulacion=self.postulacion, usuario=self.docentes[3],
            tipo_participacion="DOCENTE_MODALIDAD", designado_por=self.admin,
        )
        secretary = ParticipanteEvento.objects.create(
            evento=event, asignacion=secretary_assignment, rol_evento="DOCENTE_MODALIDAD",
        )

        for note in (Decimal("1"), Decimal("100")):
            evaluation = EvaluacionDefensa(
                evento=event, tipo_evaluacion="PUBLICA", modalidad_registro="CONSENSO",
                nota_numerica=note,
            )
            evaluation.full_clean()
        for note in (Decimal("0.99"), Decimal("100.01")):
            with self.assertRaises(ValidationError):
                EvaluacionDefensa(
                    evento=event, tipo_evaluacion="PUBLICA", modalidad_registro="CONSENSO",
                    nota_numerica=note,
                ).full_clean()
        values = policy.get_valores_registro(evento=event, tipo="PUBLICA", nota=Decimal("70"))
        self.assertEqual(values, {"ponderacion": Decimal("70.00"), "aporte_ponderado": Decimal("49.00")})
        self.assertEqual(policy.get_semantica_nota(evento=event, tipo="PUBLICA"), "MODALIDAD_ESPECIFICA")
        with self.assertRaises(ValidationError):
            policy.validar_solicitud_registro(
                modalidad_registro="INDIVIDUAL", evaluador=secretary, evento=event, tipo="PUBLICA",
            )
        invalid_evaluators = (
            SimpleNamespace(
                evento_id=event.pk, rol_evento="TRIBUNAL", activo=False,
                asignacion=assignments[0],
            ),
            SimpleNamespace(
                evento_id=event.pk, rol_evento="TRIBUNAL", activo=True,
                asignacion=SimpleNamespace(activo=False, postulacion_id=self.postulacion.pk),
            ),
            SimpleNamespace(
                evento_id=event.pk + 1, rol_evento="TRIBUNAL", activo=True,
                asignacion=assignments[0],
            ),
            SimpleNamespace(
                evento_id=event.pk, rol_evento="TRIBUNAL", activo=True,
                asignacion=SimpleNamespace(activo=True, postulacion_id=self.postulacion.pk + 1),
            ),
            SimpleNamespace(
                evento_id=event.pk, rol_evento="PRESIDENTE", activo=True,
                asignacion=assignments[0],
            ),
        )
        for invalid in invalid_evaluators:
            with self.assertRaises(ValidationError):
                policy.validar_solicitud_registro(
                    modalidad_registro="INDIVIDUAL", evaluador=invalid, evento=event, tipo="PUBLICA",
                )

        for note, participant in zip((Decimal("50"), Decimal("60"), Decimal("70")), participants):
            EvaluacionDefensa.objects.create(
                evento=event, tipo_evaluacion="PUBLICA", modalidad_registro="INDIVIDUAL",
                evaluador=participant, nota_numerica=note,
            )
            if note != Decimal("70"):
                with self.assertRaises(ValidationError):
                    policy.obtener_evaluacion_para_consolidar(
                        evento=event, evaluaciones=event.evaluaciones.all(),
                    )
        consolidated_source = policy.obtener_evaluacion_para_consolidar(
            evento=event, evaluaciones=event.evaluaciones.all(),
        )
        self.assertEqual(consolidated_source._tesis_promedio, Decimal("60"))
        consolidated = policy.construir_consolidado(consolidated_source, self.admin)
        self.assertEqual(consolidated.nota_numerica, Decimal("60"))
        self.assertEqual(consolidated.aporte_ponderado, Decimal("42.00"))
        self.assertEqual(event.evaluaciones.filter(tipo_evaluacion="PUBLICA").count(), 3)
        self.assertIsNone(policy.calcular_resultado_final(self.postulacion)["clasificacion"])

        for seguimiento in self.seguimientos.values():
            if seguimiento.etapa.orden < public.etapa.orden:
                SeguimientoEtapa.objects.filter(pk=seguimiento.pk).update(estado="APROBADA")
        public.refresh_from_db()
        with self.assertRaisesRegex(ValidationError, "Privada finalizada con resultado SUFICIENTE"):
            modalidad_policy.validar_gate_publica(self.postulacion)
        private = EventoDefensa.objects.create(postulacion=self.postulacion, seguimiento_etapa=self.seguimientos["DEFENSA_PRIVADA"], tipo_evento="DEFENSA_PRIVADA", estado="FINALIZADA", fecha_programada="2026-07-31T10:00:00Z", fecha_fin_real="2026-07-31T11:00:00Z", lugar="Aula", programado_por=self.admin)
        EvaluacionDefensa.objects.create(evento=private, tipo_evaluacion="RESULTADO_FINAL", modalidad_registro="CONSENSO", resultado_cualitativo="SUFICIENTE", es_resultado_final_evento=True)
        document = DocumentoPostulacion.objects.create(postulacion=self.postulacion, tipo_documento=TipoDocumento.objects.get(codigo="DOCUMENTO_FINAL"), estado=EstadoDocumento.objects.get(codigo="APR"))
        v1 = VersionDocumento.objects.create(documento=document, subido_por=self.student, numero_version=1, archivo=SimpleUploadedFile("final-v1.pdf", b"pdf"), nombre_original="final-v1.pdf", tamano_bytes=3, hash_sha256="a" * 64, es_version_actual=True)
        modalidad_policy.validar_gate_publica(self.postulacion)
        observation = ObservacionDocumento.objects.create(version_documento=v1, usuario=self.admin, comentario="Corrección de forma", corregida=True)
        v1.es_version_actual = False; v1.save(update_fields=["es_version_actual"])
        v2 = VersionDocumento.objects.create(documento=document, subido_por=self.student, numero_version=2, archivo=SimpleUploadedFile("final-v2.pdf", b"pdf"), nombre_original="final-v2.pdf", tamano_bytes=3, hash_sha256="b" * 64, es_version_actual=True)
        with self.assertRaisesRegex(ValidationError, "falta confirmación técnica"):
            modalidad_policy.validar_gate_publica(self.postulacion)
        ConfirmacionCorreccionDocumento.objects.create(postulacion=self.postulacion, evento_origen=private, version_observada=observation.version_documento, version_corregida=v2, confirmado_por=self.admin, asignacion_confirmante=assignments[0])
        modalidad_policy.validar_gate_publica(self.postulacion)
        private.evaluaciones.filter(tipo_evaluacion="RESULTADO_FINAL").update(resultado_cualitativo="INSUFICIENTE")
        with self.assertRaisesRegex(ValidationError, "Privada finalizada con resultado SUFICIENTE"):
            modalidad_policy.validar_gate_publica(self.postulacion)
        self.assertTrue(EvaluarPayload(data={"nota": "100"}).is_valid())

    def test_nota_final_suma_los_aportes_privado_y_publico(self):
        private = EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=self.seguimientos["DEFENSA_PRIVADA"],
            tipo_evento="DEFENSA_PRIVADA", estado="FINALIZADA", fecha_programada="2026-08-01T10:00:00Z",
            lugar="Aula", programado_por=self.admin,
        )
        public = EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=self.seguimientos["DEFENSA_PUBLICA"],
            tipo_evento="DEFENSA_PUBLICA", estado="FINALIZADA", fecha_programada="2026-08-02T10:00:00Z",
            lugar="Aula", programado_por=self.admin,
        )
        EvaluacionDefensa.objects.create(
            evento=private, tipo_evaluacion="RESULTADO_FINAL", modalidad_registro="CONSENSO",
            resultado_cualitativo="SUFICIENTE", nota_numerica=Decimal("30"),
            ponderacion=Decimal("30.00"), aporte_ponderado=Decimal("30"),
            es_resultado_final_evento=True, registrado_por=self.admin,
        )
        EvaluacionDefensa.objects.create(
            evento=public, tipo_evaluacion="RESULTADO_FINAL", modalidad_registro="CONSENSO",
            nota_numerica=Decimal("70"), ponderacion=Decimal("70.00"),
            aporte_ponderado=Decimal("49.00"), es_resultado_final_evento=True,
            registrado_por=self.admin,
        )
        result = TesisGradoEvaluacionPolicy().calcular_resultado_final(self.postulacion)
        self.assertEqual(result["aporte_privada"], Decimal("30"))
        self.assertEqual(result["aporte_publica"], Decimal("49.00"))
        self.assertEqual(result["nota_final"], Decimal("79.00"))
        self.assertEqual(result["clasificacion"], "APROBACION_PLENA")
        # Un nuevo resultado explícito usa aportes, no vuelve a ponderar el bruto.
        private.evaluaciones.update(nota_numerica=Decimal("95"), aporte_ponderado=Decimal("28.50"), semantica_nota="BRUTA_100")
        public.evaluaciones.update(nota_numerica=Decimal("95"), aporte_ponderado=Decimal("66.50"), semantica_nota="BRUTA_100")
        result = TesisGradoEvaluacionPolicy().calcular_resultado_final(self.postulacion)
        self.assertEqual(result["nota_final"], Decimal("95.00"))
        self.assertEqual(result["semantica_privada"], "BRUTA_100")
        from apps.reportes.resultados import ResultadoAcademicoReportService
        report = ResultadoAcademicoReportService.resolver(self.postulacion)
        self.assertEqual(report.nota_final, Decimal("95.00"))

    def test_publica_bruta_api_persiste_ponderacion_y_rechaza_cero(self):
        from apps.postulantes.defensas import EvaluacionDefensaService
        public = self.seguimientos["DEFENSA_PUBLICA"]
        event = EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=public,
            tipo_evento="DEFENSA_PUBLICA", estado="EN_CURSO",
            fecha_programada="2026-08-02T10:00:00Z", lugar="Aula", programado_por=self.admin,
        )
        roles = ("TRIBUNAL", "TRIBUNAL", "PRESIDENTE", "SECRETARIO")
        for role, teacher in zip(roles, self.docentes):
            assignment = AsignacionPostulacion.objects.create(
                postulacion=self.postulacion, usuario=teacher, tipo_participacion=role, designado_por=self.admin,
            )
            ParticipanteEvento.objects.create(evento=event, asignacion=assignment, rol_evento=role, presente=True)
        event.estado = "FINALIZADA"
        event.save()
        client = APIClient()
        client.force_authenticate(self.admin)
        url = f"/api/v1/eventos-defensa/{event.pk}/evaluaciones/publica/"
        payload = {"nota": "0", "semantica_nota": "BRUTA_100"}
        response = client.post(url, payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(event.evaluaciones.exists())
        payload["nota"] = "95"
        response = client.post(url, payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        evaluation = event.evaluaciones.get()
        self.assertEqual(evaluation.semantica_nota, "BRUTA_100")
        self.assertEqual(evaluation.aporte_ponderado, Decimal("66.50"))
        policy = TesisGradoEvaluacionPolicy()
        consolidated = policy.construir_consolidado(evaluation, self.admin)
        consolidated.save()
        self.assertEqual(consolidated.aporte_ponderado, Decimal("66.50"))
        result = EvaluacionDefensaService.calcular_resultado_final(self.postulacion, None, auditar=False)
        self.assertEqual(result["aporte_publica"], Decimal("66.50"))
