import os
from io import StringIO
from pathlib import Path
from unittest import mock

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import CommandError, call_command
from django.test import TestCase
from django.utils import timezone

from apps.academico.models import Modalidad, ModalidadRequisito, Periodo, Requisito
from apps.documentos.models import DocumentoPostulacion, TipoDocumento, VersionDocumento
from apps.notificaciones.models import Notificacion
from apps.postulantes.models import AsignacionPostulacion, EventoDefensa, ParticipanteEvento, Postulacion, SeguimientoEtapa
from apps.usuarios.models import CustomUser


class ResetTestDataCommandTests(TestCase):
    OFFICIAL_MODALIDAD_CODES = [
        "PROYECTO_GRADO",
        "TRABAJO_DIRIGIDO",
        "TESIS_GRADO",
        "GRADUACION_VIA_DIPLOMADO",
        "EXCELENCIA_ACADEMICA",
        "EXAMEN_GRADO",
    ]

    @classmethod
    def setUpTestData(cls):
        call_command("seed_initial_data", verbosity=0)

    def setUp(self):
        self.student = CustomUser.objects.create_user(
            username="student-reset-test",
            password="pass1234",
            nombres="Estudiante",
            apellido_paterno="Reset",
            apellido_materno="Test",
            ci="1234567",
            ru="RU-RESET-1",
            email="student@example.com",
        )
        self.docente = CustomUser.objects.create_user(
            username="teacher-reset-test",
            password="pass1234",
            nombres="Docente",
            apellido_paterno="Reset",
            apellido_materno="Teacher",
            ci="7654321",
            ru="RU-RESET-2",
            email="teacher@example.com",
        )

        self.modalidad = Modalidad.objects.get(codigo="PROYECTO_GRADO")
        self.periodo = Periodo.objects.order_by("id").first()
        if self.periodo is None:
            self.periodo = Periodo.objects.create(
                nombre="2026-I",
                fecha_inicio="2026-01-01",
                fecha_fin="2026-06-30",
                gestion=2026,
                semestre=Periodo.Semestre.PRIMERO,
            )

        self.postulacion = Postulacion.objects.create(
            codigo="P-RESET-001",
            estudiante=self.student,
            modalidad=self.modalidad,
            periodo=self.periodo,
        )

        etapa = self.modalidad.etapas.get(codigo="PERFIL_PROYECTO")
        self.seguimiento = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion,
            etapa=etapa,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
            numero_intento=1,
            fecha_inicio=timezone.now(),
            fecha_fin=timezone.now(),
            observaciones="Seguimiento de prueba",
        )
        self.asignacion = AsignacionPostulacion.objects.create(
            postulacion=self.postulacion,
            usuario=self.docente,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
            orden_cargo=1,
            fecha_designacion=timezone.now(),
        )
        self.evento = EventoDefensa.objects.create(
            postulacion=self.postulacion,
            seguimiento_etapa=self.seguimiento,
            tipo_evento="DEFENSA_PERFIL",
            numero_intento=1,
            estado=EventoDefensa.Estado.EN_CURSO,
            fecha_programada=timezone.now(),
            lugar="Aula 1",
            modalidad_evento=EventoDefensa.ModalidadEvento.PRESENCIAL,
            programado_por=self.docente,
        )
        self.asignacion_tribunal_1 = AsignacionPostulacion.objects.create(
            postulacion=self.postulacion,
            usuario=self.docente,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
            orden_cargo=1,
            fecha_designacion=timezone.now(),
            seguimiento_etapa=self.seguimiento,
        )
        self.asignacion_tribunal_2 = AsignacionPostulacion.objects.create(
            postulacion=self.postulacion,
            usuario=self.student,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
            orden_cargo=2,
            fecha_designacion=timezone.now(),
            seguimiento_etapa=self.seguimiento,
        )
        ParticipanteEvento.objects.create(
            evento=self.evento,
            asignacion=self.asignacion_tribunal_1,
            rol_evento=ParticipanteEvento.Rol.TRIBUNAL,
            convocado=True,
            presente=True,
        )
        ParticipanteEvento.objects.create(
            evento=self.evento,
            asignacion=self.asignacion_tribunal_2,
            rol_evento=ParticipanteEvento.Rol.TRIBUNAL,
            convocado=True,
            presente=True,
        )
        Notificacion.objects.create(
            destinatario=self.student,
            tipo="POSTULACION",
            titulo="Notificación de prueba",
            mensaje="Mensaje de prueba",
            nivel=Notificacion.Nivel.INFO,
            actor=self.docente,
            postulacion=self.postulacion,
            aggregate_type="postulacion",
            aggregate_id=str(self.postulacion.pk),
            event_id="11111111-1111-4111-8111-111111111111",
            deduplication_key="reset-test-notification-1",
        )

        documento_tipo = TipoDocumento.objects.order_by("id").first()
        documento = DocumentoPostulacion.objects.create(
            postulacion=self.postulacion,
            tipo_documento=documento_tipo,
            estado=documento_tipo.documentos.model._meta.get_field("estado").remote_field.model.objects.order_by("id").first(),
            evento_defensa=self.evento,
            observacion_general="Documento de prueba",
        )

        media_dir = Path(settings.MEDIA_ROOT) / "test_reset_data"
        media_dir.mkdir(parents=True, exist_ok=True)
        self.test_file = media_dir / "version_prueba.pdf"
        self.test_file.write_bytes(b"archivo temporal de la prueba")

        VersionDocumento.objects.create(
            documento=documento,
            subido_por=self.docente,
            numero_version=1,
            archivo=SimpleUploadedFile(self.test_file.name, self.test_file.read_bytes(), content_type="application/pdf"),
            nombre_original="version_prueba.pdf",
            tamano_bytes=self.test_file.stat().st_size,
            hash_sha256="a" * 64,
        )

    def _run_reset(self, **kwargs):
        stdout = StringIO()
        stderr = StringIO()
        with mock.patch.dict(os.environ, {"DJANGO_ENV": "development"}, clear=False):
            call_command("reset_test_data", stdout=stdout, stderr=stderr, **kwargs)
        return stdout.getvalue(), stderr.getvalue()

    def test_01_dry_run_no_elimina_datos(self):
        before_postulaciones = Postulacion.objects.count()
        before_users = CustomUser.objects.count()
        before_modalidades = Modalidad.objects.filter(codigo__in=self.OFFICIAL_MODALIDAD_CODES).count()
        before_documentos = DocumentoPostulacion.objects.count()

        self._run_reset(dry_run=True)

        self.assertEqual(Postulacion.objects.count(), before_postulaciones)
        self.assertEqual(CustomUser.objects.count(), before_users)
        self.assertEqual(Modalidad.objects.filter(codigo__in=self.OFFICIAL_MODALIDAD_CODES).count(), before_modalidades)
        self.assertEqual(DocumentoPostulacion.objects.count(), before_documentos)
        self.assertTrue(self.test_file.exists())

    def test_02_sin_confirm_no_elimina_datos(self):
        with self.assertRaises(CommandError):
            self._run_reset()

        self.assertEqual(Postulacion.objects.count(), 1)
        self.assertTrue(Postulacion.objects.filter(pk=self.postulacion.pk).exists())
        self.assertTrue(self.test_file.exists())

    def test_03_confirm_deja_postulaciones_en_cero(self):
        self._run_reset(confirm=True)
        self.assertEqual(Postulacion.objects.count(), 0)

    def test_04_elimina_dependencias_transaccionales(self):
        self._run_reset(confirm=True)

        self.assertEqual(SeguimientoEtapa.objects.count(), 0)
        self.assertEqual(AsignacionPostulacion.objects.count(), 0)
        self.assertEqual(EventoDefensa.objects.count(), 0)
        self.assertEqual(DocumentoPostulacion.objects.count(), 0)
        self.assertEqual(VersionDocumento.objects.count(), 0)
        self.assertEqual(Notificacion.objects.count(), 0)

    def test_05_usuarios_permanecen(self):
        before = CustomUser.objects.count()
        self._run_reset(confirm=True)
        self.assertEqual(CustomUser.objects.count(), before)
        self.assertTrue(CustomUser.objects.filter(pk=self.student.pk).exists())
        self.assertTrue(CustomUser.objects.filter(pk=self.docente.pk).exists())

    def test_06_estudiantes_permanecen(self):
        self._run_reset(confirm=True)
        self.assertTrue(CustomUser.objects.filter(pk=self.student.pk).exists())

    def test_07_docentes_permanecen(self):
        self._run_reset(confirm=True)
        self.assertTrue(CustomUser.objects.filter(pk=self.docente.pk).exists())

    def test_08_periodos_permanecen(self):
        before = Periodo.objects.count()
        self._run_reset(confirm=True)
        self.assertEqual(Periodo.objects.count(), before)

    def test_09_etapas_y_configuracion_permanecen(self):
        before = self.modalidad.etapas.count()
        self._run_reset(confirm=True)
        self.assertEqual(self.modalidad.etapas.count(), before)
        self.assertTrue(self.modalidad.etapas.exists())

    def test_10_tipos_de_documento_permanecen(self):
        before = TipoDocumento.objects.count()
        self._run_reset(confirm=True)
        self.assertEqual(TipoDocumento.objects.count(), before)

    def test_11_requisitos_oficiales_permanecen(self):
        before = Requisito.objects.count()
        self._run_reset(confirm=True)
        self.assertEqual(Requisito.objects.count(), before)

    def test_12_relaciones_configuracion_requisitos_permanecen(self):
        before = ModalidadRequisito.objects.count()
        self._run_reset(confirm=True)
        self.assertEqual(ModalidadRequisito.objects.count(), before)

    def test_13_las_6_modalidades_permanecen_con_su_identidad(self):
        self._run_reset(confirm=True)
        modalidades = Modalidad.objects.filter(codigo__in=self.OFFICIAL_MODALIDAD_CODES).order_by("codigo")
        self.assertEqual(modalidades.count(), 6)
        self.assertEqual(list(modalidades.values_list("codigo", flat=True)), sorted(self.OFFICIAL_MODALIDAD_CODES))

    def test_14_documentos_y_requisitos_oficiales_permanecen(self):
        self._run_reset(confirm=True)
        self.assertTrue(Modalidad.objects.filter(codigo="PROYECTO_GRADO").exists())
        self.assertTrue(Requisito.objects.exists())
        self.assertTrue(ModalidadRequisito.objects.exists())
        self.assertTrue(TipoDocumento.objects.exists())

    def test_15_ningun_archivo_fisico_creado_para_prueba_se_elimina(self):
        self.assertTrue(self.test_file.exists())
        self._run_reset(confirm=True)
        self.assertTrue(self.test_file.exists())

    def test_16_comando_se_niega_en_produccion(self):
        with mock.patch.dict(os.environ, {"DJANGO_ENV": "production"}, clear=False):
            with self.assertRaises(CommandError):
                call_command("reset_test_data", confirm=True, stdout=StringIO(), stderr=StringIO())
