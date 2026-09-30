from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, TipoDocumento, VersionDocumento
from apps.modalidades.policies import ModalidadPolicyRegistry
from apps.modalidades.proyecto_grado import ProyectoGradoPolicy
from apps.notificaciones.events import EventTypes
from apps.postulantes.defensas import EvaluacionDefensaService
from apps.postulantes.models import (
    EntregaFisica, EstadoPostulacion, EvaluacionDefensa, EventoDefensa, Postulacion,
    SeguimientoEtapa,
)
from apps.postulantes.complementarios import EntregaFisicaService
from apps.postulantes.proyecto_grado_workflow import ProyectoGradoWorkflowOrchestrator
from apps.postulantes.serializers import FlujoPostulacionSerializer
from apps.postulantes.workflow import WorkflowService


User = get_user_model()


class ProyectoGradoAutoaperturaTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="admin_auto_pg", is_staff=True)
        self.student = User.objects.create_user(username="student_auto_pg")
        self.modalidad = Modalidad.objects.create(codigo="PROYECTO_GRADO", nombre="Proyecto auto")
        self.periodo = Periodo.objects.create(
            nombre="2026-AUTO", gestion=2026, semestre="II",
            fecha_inicio="2026-07-01", fecha_fin="2026-12-31",
        )
        self.registrada = EstadoPostulacion.objects.create(codigo="REGISTRADA", nombre="Registrada auto")
        self.en_proceso = EstadoPostulacion.objects.create(codigo="EN_PROCESO", nombre="En proceso auto")
        self.concluida = EstadoPostulacion.objects.create(codigo="CONCLUIDA", nombre="Concluida auto")
        self.postulacion = Postulacion.objects.create(
            codigo="PG-AUTO-001", estudiante=self.student, modalidad=self.modalidad,
            periodo=self.periodo, estado_actual=self.registrada,
        )
        for orden, codigo in enumerate(ProyectoGradoWorkflowOrchestrator.ETAPAS, 1):
            EtapaModalidad.objects.create(
                modalidad=self.modalidad, codigo=codigo, nombre=codigo, orden=orden,
                obligatoria=True, permite_repeticion=codigo == "PERFIL_PROYECTO",
                origen_normativo="Normativa PG",
            )

    def etapas(self):
        return {
            item.etapa.codigo: item
            for item in self.postulacion.seguimientos_etapa.select_related("etapa")
        }

    def test_arranque_deja_inscripcion_en_proceso_sin_aprobar_etapas(self):
        ProyectoGradoWorkflowOrchestrator.inicializar_proceso(self.postulacion, self.admin)
        etapas = self.etapas()

        self.assertEqual(etapas["INSCRIPCION"].estado, "EN_PROCESO")
        self.assertIsNotNone(etapas["INSCRIPCION"].fecha_inicio)
        self.assertTrue(all(etapa.estado == "PENDIENTE" for etapa in etapas.values() if etapa.etapa.codigo != "INSCRIPCION"))
        flow = FlujoPostulacionSerializer(self.postulacion).data
        self.assertEqual(flow["porcentaje_avance"], 0.0)
        orientation = flow["orientacion_etapa_actual"]
        self.assertEqual(orientation["requisitos_cumplidos"], 0)
        self.assertEqual(orientation["requisitos_totales"], 4)
        self.assertEqual(len(orientation["requisitos"]), 4)
        self.assertNotEqual(orientation["siguiente_accion"]["codigo"], "APROBAR_ETAPA")
        self.assertNotIn("aprobar", WorkflowService.obtener_acciones_permitidas(etapas["INSCRIPCION"]))

    def _create_inscription_document(self, code, status_code="APR", uploaded_by=None):
        names = {
            "CARTA_SOLICITUD_PROYECTO": "Carta de Solicitud de Proyecto de Grado",
            "MATRICULA_VIGENTE": "Comprobante de Matrícula Vigente",
            "HISTORIAL_PRERREQ": "Historial Académico de Prerrequisitos",
        }
        document_type, _ = TipoDocumento.objects.get_or_create(
            codigo=code,
            defaults={"nombre": names[code]},
        )
        state, _ = EstadoDocumento.objects.get_or_create(
            codigo=status_code,
            defaults={"nombre": {"ENV": "Enviado", "APR": "Aprobado"}[status_code]},
        )
        document = DocumentoPostulacion.objects.create(
            postulacion=self.postulacion,
            tipo_documento=document_type,
            estado=state,
            requiere_correccion=False,
        )
        VersionDocumento.objects.create(
            documento=document,
            subido_por=uploaded_by or self.student,
            numero_version=1,
            archivo=f"tests/{code.lower()}.pdf",
            nombre_original=f"{code.lower()}.pdf",
            tamano_bytes=1,
            hash_sha256=code.lower().ljust(64, "0"),
            es_version_actual=True,
        )
        return document

    def _complete_inscription_documents(self, missing_code=None, status_overrides=None):
        status_overrides = status_overrides or {}
        for code in ProyectoGradoPolicy.requisitos_policy.INSCRIPTION_DOCUMENTS:
            if code != missing_code:
                self._create_inscription_document(
                    code,
                    status_overrides.get(code, "APR"),
                    uploaded_by=self.student,
                )

    def _receive_yellow_folder(self):
        delivery = EntregaFisicaService.crear(
            self.postulacion,
            EntregaFisica.Tipo.FOLDER_AMARILLO,
            "Fólder amarillo rotulado con nombre y modalidad",
            self.admin,
            cantidad=1,
        )
        return EntregaFisicaService.registrar_entrega(delivery, 1, self.admin)

    def _start_inscription(self):
        ProyectoGradoWorkflowOrchestrator.inicializar_proceso(self.postulacion, self.admin)
        return self.etapas()["INSCRIPCION"]

    def test_endpoint_documentos_aplicables_devuelve_los_tres_documentos_de_inscripcion(self):
        self._start_inscription()
        self._complete_inscription_documents()
        client = APIClient()
        self.admin.is_superuser = True
        self.admin.save(update_fields=["is_superuser"])
        client.force_authenticate(self.admin)

        response = client.get(f"/api/v1/postulaciones/{self.postulacion.pk}/documentos-aplicables/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["etapa_actual"], "INSCRIPCION")
        self.assertEqual(
            {item["codigo"] for item in response.data["documentos_aplicables"]},
            {"CARTA_SOLICITUD_PROYECTO", "MATRICULA_VIGENTE", "HISTORIAL_PRERREQ"},
        )
        self.assertNotIn(
            "FOLDER_AMARILLO",
            {item["codigo"] for item in response.data["documentos_aplicables"]},
        )

    def test_inscripcion_bloquea_si_falta_cualquiera_de_los_cuatro_requisitos(self):
        inscription = self._start_inscription()
        document_codes = ProyectoGradoPolicy.requisitos_policy.INSCRIPTION_DOCUMENTS

        for missing_code in (*document_codes, EntregaFisica.Tipo.FOLDER_AMARILLO):
            with self.subTest(falta=missing_code):
                DocumentoPostulacion.objects.filter(postulacion=self.postulacion).delete()
                EntregaFisica.objects.filter(
                    postulacion=self.postulacion,
                    codigo=EntregaFisica.Tipo.FOLDER_AMARILLO,
                ).delete()
                self._complete_inscription_documents(
                    missing_code=missing_code if missing_code in document_codes else None,
                )
                if missing_code != EntregaFisica.Tipo.FOLDER_AMARILLO:
                    self._receive_yellow_folder()

                with self.assertRaises(ValidationError) as error:
                    WorkflowService.aprobar_etapa(inscription, self.admin)

                self.assertIn(missing_code, error.exception.message_dict["faltantes"])
                inscription.refresh_from_db()
                self.assertEqual(inscription.estado, "EN_PROCESO")

    def test_documento_de_estudiante_enviado_no_cumple_hasta_aprobacion(self):
        inscription = self._start_inscription()
        self._complete_inscription_documents(
            status_overrides={"CARTA_SOLICITUD_PROYECTO": "ENV"},
        )
        self._receive_yellow_folder()

        with self.assertRaises(ValidationError) as error:
            WorkflowService.aprobar_etapa(inscription, self.admin)

        self.assertIn("CARTA_SOLICITUD_PROYECTO", error.exception.message_dict["faltantes"])
        orientation = FlujoPostulacionSerializer(self.postulacion).data["orientacion_etapa_actual"]
        carta = next(item for item in orientation["requisitos"] if item["codigo"] == "CARTA_SOLICITUD_PROYECTO")
        self.assertEqual(carta["estado_display"], "Pendiente de revisión administrativa")
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "GESTIONAR_DOCUMENTOS")

    def test_tres_documentos_aprobados_por_estudiante_y_foler_recibido_permiten_aprobar(self):
        inscription = self._start_inscription()
        self._complete_inscription_documents()
        self._receive_yellow_folder()

        orientation = FlujoPostulacionSerializer(self.postulacion).data["orientacion_etapa_actual"]
        self.assertEqual(orientation["requisitos_cumplidos"], 4)
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "APROBAR_ETAPA")
        approved = WorkflowService.aprobar_etapa(inscription, self.admin)

        self.assertEqual(approved.estado, "APROBADA")
        self.assertEqual(self.etapas()["PERFIL_PROYECTO"].estado, "EN_PROCESO")

    def test_orientacion_actualiza_progreso_desde_cero_hasta_cuatro(self):
        self._start_inscription()
        flow = FlujoPostulacionSerializer(self.postulacion).data
        self.assertEqual(flow["orientacion_etapa_actual"]["requisitos_cumplidos"], 0)

        for progress, code in enumerate(ProyectoGradoPolicy.requisitos_policy.INSCRIPTION_DOCUMENTS, start=1):
            self._create_inscription_document(code)
            orientation = FlujoPostulacionSerializer(self.postulacion).data["orientacion_etapa_actual"]
            self.assertEqual(orientation["requisitos_cumplidos"], progress)
            self.assertEqual(orientation["requisitos_totales"], 4)
            self.assertNotEqual(orientation["siguiente_accion"]["codigo"], "APROBAR_ETAPA")

        self._receive_yellow_folder()
        orientation = FlujoPostulacionSerializer(self.postulacion).data["orientacion_etapa_actual"]
        self.assertEqual(orientation["requisitos_cumplidos"], 4)
        self.assertEqual(orientation["siguiente_accion"]["codigo"], "APROBAR_ETAPA")
        self.assertIn("aprobar", WorkflowService.obtener_acciones_permitidas(self.etapas()["INSCRIPCION"]))

    def test_inscripcion_ya_aprobada_no_se_reinterpreta_por_el_nuevo_gate(self):
        self._start_inscription()
        inscription = self.etapas()["INSCRIPCION"]
        SeguimientoEtapa.objects.filter(pk=inscription.pk).update(estado="APROBADA")
        inscription.refresh_from_db()

        with self.assertRaisesMessage(ValidationError, "No se puede modificar una etapa ya cerrada."):
            WorkflowService.aprobar_etapa(inscription, self.admin)

    def test_endpoint_directo_bloquea_inscripcion_sin_requisitos(self):
        inscription = self._start_inscription()
        admin = User.objects.create_superuser(username="admin_api_pg", password="test-password")
        client = APIClient()
        client.force_authenticate(admin)

        response = client.post(
            f"/api/v1/seguimientos-etapa/{inscription.pk}/aprobar/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        inscription.refresh_from_db()
        self.assertEqual(inscription.estado, "EN_PROCESO")

    @patch.object(ProyectoGradoPolicy, "validar_aprobacion_etapa", return_value=None)
    @patch("apps.postulantes.workflow.publish_domain_event")
    def test_cadena_autoabre_cada_etapa_una_sola_vez_y_no_concluye(self, publish, _validar):
        ProyectoGradoWorkflowOrchestrator.inicializar_proceso(self.postulacion, self.admin)
        etapas = self.etapas()
        WorkflowService.aprobar_etapa(etapas["INSCRIPCION"], self.admin)
        etapas = self.etapas()
        self.assertEqual(etapas["PERFIL_PROYECTO"].estado, "EN_PROCESO")

        for actual, siguiente in zip(
            ProyectoGradoWorkflowOrchestrator.ETAPAS[1:-1],
            ProyectoGradoWorkflowOrchestrator.ETAPAS[2:],
        ):
            WorkflowService.aprobar_etapa(etapas[actual], self.admin)
            etapas = self.etapas()
            self.assertEqual(etapas[siguiente].estado, "EN_PROCESO")
            self.assertEqual(etapas[siguiente].abierta_por, self.admin)
            self.assertIsNotNone(etapas[siguiente].fecha_inicio)

        cierre = etapas["CIERRE_DOCUMENTAL"]
        fecha_inicio = cierre.fecha_inicio
        ProyectoGradoWorkflowOrchestrator.autoabrir_siguiente(etapas["REVISION_FINAL_POST_PUBLICA"], self.admin)
        cierre.refresh_from_db()
        self.assertEqual(cierre.fecha_inicio, fecha_inicio)

        WorkflowService.aprobar_etapa(cierre, self.admin, actualizar_estado_general=False)
        self.postulacion.refresh_from_db()
        self.assertNotEqual(self.postulacion.estado_actual.codigo, "CONCLUIDA")
        iniciadas = [call for call in publish.call_args_list if call.args[0] == EventTypes.ETAPA_INICIADA]
        self.assertEqual(len(iniciadas), 8)

    def test_arranque_reintentado_no_duplica_inicio(self):
        ProyectoGradoWorkflowOrchestrator.inicializar_proceso(self.postulacion, self.admin)
        inscripcion = self.etapas()["INSCRIPCION"]
        fecha_inicio_inscripcion = inscripcion.fecha_inicio
        perfil = self.etapas()["PERFIL_PROYECTO"]

        ProyectoGradoWorkflowOrchestrator.inicializar_proceso(self.postulacion, self.admin)

        inscripcion.refresh_from_db()
        perfil.refresh_from_db()
        self.assertEqual(inscripcion.estado, "EN_PROCESO")
        self.assertEqual(inscripcion.fecha_inicio, fecha_inicio_inscripcion)
        self.assertEqual(perfil.estado, "PENDIENTE")
        self.assertIsNone(perfil.fecha_inicio)

    def test_historico_no_se_autoabre(self):
        self.postulacion.tipo_registro = Postulacion.TipoRegistroChoices.HISTORICO
        self.postulacion.save(update_fields=["tipo_registro"])
        self.assertIsNone(ProyectoGradoWorkflowOrchestrator.autoabrir_siguiente(
            SeguimientoEtapa(postulacion=self.postulacion, etapa=self.modalidad.etapas.first()), self.admin,
        ))

    @patch.object(ProyectoGradoPolicy, "validar_aprobacion_etapa", return_value=None)
    def test_autoapertura_de_defensa_no_inicia_evento_real(self, _validar):
        ProyectoGradoWorkflowOrchestrator.inicializar_proceso(self.postulacion, self.admin)
        etapas = self.etapas()
        WorkflowService.aprobar_etapa(etapas["INSCRIPCION"], self.admin)
        etapas = self.etapas()
        for codigo in ProyectoGradoWorkflowOrchestrator.ETAPAS[1:4]:
            WorkflowService.aprobar_etapa(etapas[codigo], self.admin)
            etapas = self.etapas()
        privada = etapas["DEFENSA_PRIVADA"]
        evento = EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=privada,
            tipo_evento="DEFENSA_PRIVADA", estado="PROGRAMADA",
            fecha_programada=timezone.now(), lugar="Sala", programado_por=self.admin,
        )

        self.assertEqual(privada.estado, "EN_PROCESO")
        self.assertEqual(evento.estado, "PROGRAMADA")
        self.assertIsNone(evento.fecha_inicio_real)
        self.assertIsNone(evento.iniciado_por)

    def _preparar_defensa_para_consolidar(self, codigo_etapa, tipo_evento, tipo_evaluacion, nota):
        WorkflowService.inicializar_flujo(self.postulacion, self.admin)
        etapas = self.etapas()
        orden_objetivo = ProyectoGradoWorkflowOrchestrator.ETAPAS.index(codigo_etapa)
        SeguimientoEtapa.objects.filter(
            pk__in=[etapas[codigo].pk for codigo in ProyectoGradoWorkflowOrchestrator.ETAPAS[:orden_objetivo]],
        ).update(estado="APROBADA")
        objetivo = etapas[codigo_etapa]
        objetivo.estado = "EN_PROCESO"
        objetivo.fecha_inicio = timezone.now()
        objetivo.abierta_por = self.admin
        objetivo.save(update_fields=["estado", "fecha_inicio", "abierta_por", "updated_at"])
        evento = EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=objetivo,
            tipo_evento=tipo_evento, estado="FINALIZADA",
            fecha_programada=timezone.now(), fecha_fin_real=timezone.now(),
            lugar="Sala", programado_por=self.admin,
        )
        evaluacion = EvaluacionDefensa.objects.create(
            evento=evento, tipo_evaluacion=tipo_evaluacion, modalidad_registro="CONSENSO",
            resultado_cualitativo="SUFICIENTE" if tipo_evaluacion == "PRIVADA" else "",
            nota_numerica=nota, ponderacion=Decimal("30") if tipo_evaluacion == "PRIVADA" else Decimal("70"),
            aporte_ponderado=nota, semantica_nota="LEGACY_PONDERADA", registrado_por=self.admin,
        )
        return objetivo, evento, evaluacion

    def test_consolidar_privada_autoabre_defensa_publica(self):
        privada, evento, _evaluacion = self._preparar_defensa_para_consolidar(
            "DEFENSA_PRIVADA", "DEFENSA_PRIVADA", "PRIVADA", Decimal("25"),
        )

        EvaluacionDefensaService.consolidar_evaluacion_evento(evento, self.admin)

        privada.refresh_from_db()
        publica = self.etapas()["DEFENSA_PUBLICA"]
        self.assertEqual(privada.estado, "APROBADA")
        self.assertEqual(publica.estado, "EN_PROCESO")
        self.assertEqual(publica.abierta_por, self.admin)

    def test_consolidar_publica_autoabre_revision_final(self):
        publica, evento, _evaluacion = self._preparar_defensa_para_consolidar(
            "DEFENSA_PUBLICA", "DEFENSA_PUBLICA", "PUBLICA", Decimal("60"),
        )
        privada = self.etapas()["DEFENSA_PRIVADA"]
        evento_privado = EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=privada,
            tipo_evento="DEFENSA_PRIVADA", estado="FINALIZADA",
            fecha_programada=timezone.now(), fecha_fin_real=timezone.now(),
            lugar="Sala", programado_por=self.admin,
        )
        EvaluacionDefensa.objects.create(
            evento=evento_privado, tipo_evaluacion="RESULTADO_FINAL", modalidad_registro="CONSENSO",
            resultado_cualitativo="SUFICIENTE", nota_numerica=Decimal("25"),
            ponderacion=Decimal("30"), aporte_ponderado=Decimal("25"), semantica_nota="LEGACY_PONDERADA",
            es_resultado_final_evento=True, registrado_por=self.admin,
        )

        EvaluacionDefensaService.consolidar_evaluacion_evento(evento, self.admin)

        publica.refresh_from_db()
        revision = self.etapas()["REVISION_FINAL_POST_PUBLICA"]
        self.assertEqual(publica.estado, "APROBADA")
        self.assertEqual(revision.estado, "EN_PROCESO")
        self.assertEqual(revision.abierta_por, self.admin)


class OtrasModalidadesSinAutoaperturaTests(TestCase):
    def test_aprobar_etapa_no_abre_la_siguiente_en_otras_modalidades(self):
        admin = User.objects.create_user(username="admin_otras_auto", is_staff=True)
        estado = EstadoPostulacion.objects.create(codigo="REG-OTRAS-AUTO", nombre="Registrada otras auto")
        EstadoPostulacion.objects.create(codigo="EN_PROCESO", nombre="En proceso otras auto")
        periodo = Periodo.objects.create(
            nombre="2026-OTRAS-AUTO", gestion=2026, semestre="II",
            fecha_inicio="2026-07-01", fecha_fin="2026-12-31",
        )
        codigos = (
            "TESIS_GRADO", "TRABAJO_DIRIGIDO", "EXAMEN_GRADO",
            "EXCELENCIA_ACADEMICA", "GRADUACION_VIA_DIPLOMADO",
        )
        for indice, codigo_modalidad in enumerate(codigos):
            with self.subTest(modalidad=codigo_modalidad):
                modalidad = Modalidad.objects.create(codigo=codigo_modalidad, nombre=f"Modalidad {indice}")
                estudiante = User.objects.create_user(username=f"student_otra_auto_{indice}")
                postulacion = Postulacion.objects.create(
                    codigo=f"OTRA-AUTO-{indice}", estudiante=estudiante, modalidad=modalidad,
                    periodo=periodo, estado_actual=estado,
                )
                primera = EtapaModalidad.objects.create(
                    modalidad=modalidad, codigo="INSCRIPCION", nombre="Inscripción",
                    orden=1, origen_normativo="Normativa",
                )
                segunda = EtapaModalidad.objects.create(
                    modalidad=modalidad, codigo=f"SIGUIENTE_{indice}", nombre="Siguiente",
                    orden=2, origen_normativo="Normativa",
                )
                actual = SeguimientoEtapa.objects.create(
                    postulacion=postulacion, etapa=primera, estado="EN_PROCESO",
                    fecha_inicio=timezone.now(), abierta_por=admin,
                )
                siguiente = SeguimientoEtapa.objects.create(postulacion=postulacion, etapa=segunda)

                with patch.object(
                    ModalidadPolicyRegistry.get(modalidad),
                    "validar_aprobacion_etapa",
                    return_value=None,
                ):
                    WorkflowService.aprobar_etapa(actual, admin)

                siguiente.refresh_from_db()
                self.assertEqual(siguiente.estado, "PENDIENTE")
