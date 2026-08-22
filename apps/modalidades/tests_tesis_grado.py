from decimal import Decimal
from types import SimpleNamespace

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.modalidades.policies import ModalidadPolicyRegistry
from apps.modalidades.tesis_grado import TesisGradoEvaluacionPolicy, TesisGradoPolicy
from apps.documentos.models import (ConfirmacionCorreccionDocumento, DocumentoPostulacion,
    EstadoDocumento, ObservacionDocumento, TipoDocumento, VersionDocumento)
from apps.postulantes.asignaciones import AsignacionService
from apps.postulantes.models import (
    AsignacionPostulacion, EstadoPostulacion, EvaluacionDefensa, EventoDefensa,
    ParticipanteEvento, Postulacion, SeguimientoEtapa,
)
from apps.postulantes.workflow import WorkflowService
from apps.postulantes.defensas_api import EvaluarPayload
from apps.usuarios.models import CustomUser, Role


class TesisGradoPolicyTest(TestCase):
    def setUp(self):
        call_command("seed_initial_data", verbosity=0)
        self.admin_role = Role.objects.create(codigo="ADMIN", nombre="Administrador")
        self.doc_role = Role.objects.create(codigo="DOC", nombre="Docente")
        self.student_role = Role.objects.create(codigo="EST", nombre="Estudiante")
        self.admin = CustomUser.objects.create_user(username="tesis-admin", password="x", ci="7100001", ru="RU7100001", role=self.admin_role, is_staff=True)
        self.student = CustomUser.objects.create_user(username="tesis-estudiante", password="x", ci="7100002", ru="RU7100002", role=self.student_role)
        self.docentes = [CustomUser.objects.create_user(username=f"tesis-docente-{n}", password="x", ci=f"710001{n}", ru=f"RU710001{n}", role=self.doc_role) for n in range(1, 5)]
        self.modalidad = Modalidad.objects.get(codigo="TESIS_GRADO")
        self.periodo = Periodo.objects.create(nombre="2026-TESIS", gestion=2026, semestre="II", fecha_inicio="2026-07-01", fecha_fin="2026-12-31")
        self.postulacion = Postulacion.objects.create(codigo="TESIS-TEST-001", estudiante=self.student, modalidad=self.modalidad, periodo=self.periodo, estado_actual=EstadoPostulacion.objects.get(codigo="REGISTRADA"))
        self.seguimientos = {item.etapa.codigo: item for item in WorkflowService.inicializar_flujo(self.postulacion, self.admin)}

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

    def test_bloquea_inicio_fuera_de_secuencia_e_inscripcion_sin_documentos(self):
        with self.assertRaises(ValidationError):
            WorkflowService.iniciar_etapa(self.seguimientos["TEMATICA_TESIS"], self.admin)
        WorkflowService.iniciar_etapa(self.seguimientos["INSCRIPCION"], self.admin)
        with self.assertRaises(ValidationError):
            WorkflowService.aprobar_etapa(self.seguimientos["INSCRIPCION"], self.admin)

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

        for note in (Decimal("0"), Decimal("70")):
            evaluation = EvaluacionDefensa(
                evento=event, tipo_evaluacion="PUBLICA", modalidad_registro="CONSENSO",
                nota_numerica=note,
            )
            evaluation.full_clean()
        for note in (Decimal("-0.01"), Decimal("70.01")):
            with self.assertRaises(ValidationError):
                EvaluacionDefensa(
                    evento=event, tipo_evaluacion="PUBLICA", modalidad_registro="CONSENSO",
                    nota_numerica=note,
                ).full_clean()
        values = policy.get_valores_registro(evento=event, tipo="PUBLICA", nota=Decimal("70"))
        self.assertEqual(values, {"ponderacion": Decimal("70.00"), "aporte_ponderado": Decimal("70")})
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
        self.assertEqual(consolidated.aporte_ponderado, Decimal("60"))
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
            aporte_ponderado=Decimal("70"), es_resultado_final_evento=True,
            registrado_por=self.admin,
        )
        result = TesisGradoEvaluacionPolicy().calcular_resultado_final(self.postulacion)
        self.assertEqual(result["aporte_privada"], Decimal("30"))
        self.assertEqual(result["aporte_publica"], Decimal("70"))
        self.assertEqual(result["nota_final"], Decimal("100.00"))
        self.assertEqual(result["clasificacion"], "APROBACION_PLENA_CON_FELICITACION")
