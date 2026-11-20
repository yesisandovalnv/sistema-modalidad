from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import close_old_connections, connection
from django.test import TransactionTestCase, skipUnless

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, TipoDocumento, VersionDocumento
from apps.documentos.services import DocumentoService
from apps.postulantes.models import EstadoPostulacion, Postulacion, SeguimientoEtapa
from apps.postulantes.tesis_grado_workflow import TesisGradoWorkflowOrchestrator


User = get_user_model()


class TesisInscripcionAutoFinalizacionTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.admin = User.objects.create_user(username="admin_tesis_auto", is_staff=True)
        self.student = User.objects.create_user(username="student_tesis_auto")
        self.modalidad = Modalidad.objects.create(codigo="TESIS_GRADO", nombre="Tesis auto")
        self.periodo = Periodo.objects.create(
            nombre="2026-TESIS-AUTO", gestion=2026, semestre="II",
            fecha_inicio="2026-07-01", fecha_fin="2026-12-31",
        )
        registrada, _ = EstadoPostulacion.objects.get_or_create(
            codigo="REGISTRADA", defaults={"nombre": "Registrada"},
        )
        EstadoPostulacion.objects.get_or_create(
            codigo="EN_PROCESO", defaults={"nombre": "En proceso"},
        )
        self.postulacion = Postulacion.objects.create(
            codigo="TESIS-AUTO-001", estudiante=self.student, modalidad=self.modalidad,
            periodo=self.periodo, estado_actual=registrada,
        )
        for orden, codigo in enumerate(TesisGradoWorkflowOrchestrator.ETAPAS, 1):
            EtapaModalidad.objects.create(
                modalidad=self.modalidad, codigo=codigo, nombre=codigo,
                orden=orden, obligatoria=True,
                permite_repeticion=codigo in {"PERFIL_TESIS", "DEFENSA_PRIVADA"},
                origen_normativo="Normativa Tesis",
            )
        self.seguimientos = {
            row.etapa.codigo: row
            for row in TesisGradoWorkflowOrchestrator.inicializar_proceso(self.postulacion, self.admin)
        }

    def _document(self, code, state="APR"):
        tipo, _ = TipoDocumento.objects.get_or_create(
            codigo=code, defaults={"nombre": code.replace("_", " ").title()},
        )
        estado, _ = EstadoDocumento.objects.get_or_create(
            codigo=state, defaults={"nombre": state},
        )
        document = DocumentoPostulacion.objects.create(
            postulacion=self.postulacion, tipo_documento=tipo,
            estado=estado, requiere_correccion=False,
        )
        VersionDocumento.objects.create(
            documento=document, subido_por=self.student, numero_version=1,
            archivo=f"tests/{code.lower()}.pdf", nombre_original=f"{code}.pdf",
            tamano_bytes=1, hash_sha256=code.lower().ljust(64, "0"),
            es_version_actual=True,
        )
        return document

    def _refresh_stages(self):
        return {
            row.etapa.codigo: row
            for row in Postulacion.objects.get(pk=self.postulacion.pk)
            .seguimientos_etapa.select_related("etapa")
        }

    def test_documentos_incompletos_no_aprueban_inscripcion(self):
        first = self._document("CARTA_SOLICITUD")
        second = self._document("MATRICULA_VIGENTE")
        DocumentoService().aprobar_documento(first, self.admin)
        DocumentoService().aprobar_documento(second, self.admin)

        self.seguimientos["INSCRIPCION"].refresh_from_db()
        self.assertEqual(self.seguimientos["INSCRIPCION"].estado, "EN_PROCESO")
        self.assertEqual(self._refresh_stages()["PERFIL_TESIS"].estado, "PENDIENTE")

    def test_documentos_completos_aprueban_y_abren_perfil_tesis(self):
        docs = [
            self._document("CARTA_SOLICITUD"),
            self._document("MATRICULA_VIGENTE"),
            self._document("HISTORIAL_PRERREQ", state="ENV"),
        ]
        service = DocumentoService()
        service.aprobar_documento(docs[0], self.admin)
        service.aprobar_documento(docs[1], self.admin)
        service.aprobar_documento(docs[2], self.admin)

        self.seguimientos["INSCRIPCION"].refresh_from_db()
        stages = self._refresh_stages()
        self.assertEqual(self.seguimientos["INSCRIPCION"].estado, "APROBADA")
        self.assertEqual(stages["PERFIL_TESIS"].estado, "EN_PROCESO")

    def test_repetir_disparador_no_duplica_transicion(self):
        from apps.postulantes.inscripcion_auto import InscripcionAutoFinalizacionService

        for code in ("CARTA_SOLICITUD", "MATRICULA_VIGENTE", "HISTORIAL_PRERREQ"):
            self._document(code)
        InscripcionAutoFinalizacionService.intentar_finalizar(self.postulacion, self.admin)
        InscripcionAutoFinalizacionService.intentar_finalizar(self.postulacion, self.admin)

        stages = self._refresh_stages()
        self.assertEqual(stages["INSCRIPCION"].estado, "APROBADA")
        self.assertEqual(stages["PERFIL_TESIS"].estado, "EN_PROCESO")
        self.assertEqual(self.postulacion.seguimientos_etapa.filter(etapa__codigo="PERFIL_TESIS").count(), 1)

    def test_error_al_abrir_perfil_revierta_aprobacion_y_ultimo_documento(self):
        docs = [
            self._document("CARTA_SOLICITUD"),
            self._document("MATRICULA_VIGENTE"),
            self._document("HISTORIAL_PRERREQ", state="ENV"),
        ]
        service = DocumentoService()
        service.aprobar_documento(docs[0], self.admin)
        service.aprobar_documento(docs[1], self.admin)
        with patch.object(
            TesisGradoWorkflowOrchestrator,
            "autoabrir_siguiente",
            side_effect=RuntimeError("No se pudo abrir Perfil de Tesis"),
        ):
            with self.assertRaisesMessage(RuntimeError, "No se pudo abrir Perfil de Tesis"):
                service.aprobar_documento(docs[2], self.admin)

        docs[2].refresh_from_db()
        self.seguimientos["INSCRIPCION"].refresh_from_db()
        self.assertEqual(docs[2].estado.codigo, "ENV")
        self.assertEqual(self.seguimientos["INSCRIPCION"].estado, "EN_PROCESO")
        self.assertEqual(self._refresh_stages()["PERFIL_TESIS"].estado, "PENDIENTE")

    @skipUnless(connection.vendor == "postgresql", "Requiere PostgreSQL para verificar select_for_update concurrente")
    def test_dos_disparadores_concurrentes_producen_una_sola_transicion(self):
        from apps.postulantes.inscripcion_auto import InscripcionAutoFinalizacionService

        for code in ("CARTA_SOLICITUD", "MATRICULA_VIGENTE", "HISTORIAL_PRERREQ"):
            self._document(code)
        barrier = Barrier(2)

        def trigger():
            close_old_connections()
            try:
                post = Postulacion.objects.get(pk=self.postulacion.pk)
                actor = User.objects.get(pk=self.admin.pk)
                barrier.wait(timeout=10)
                result = InscripcionAutoFinalizacionService.intentar_finalizar(post, actor)
                return result.pk if result else None
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _item: trigger(), range(2)))

        self.assertEqual(sum(result is not None for result in results), 1)
        stages = self._refresh_stages()
        self.assertEqual(stages["INSCRIPCION"].estado, "APROBADA")
        self.assertEqual(stages["PERFIL_TESIS"].estado, "EN_PROCESO")
        self.assertEqual(self.postulacion.seguimientos_etapa.filter(etapa__codigo="PERFIL_TESIS").count(), 1)
