import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework.exceptions import ValidationError as DRFValidationError

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, TipoDocumento
from apps.documentos.services import DocumentoService
from apps.postulantes.memorandums import MemorandumDesignacionService
from apps.postulantes.serializers import FlujoPostulacionSerializer
from apps.postulantes.models import (
    AsignacionPostulacion,
    DecisionAcademicaEtapa,
    EstadoPostulacion,
    Postulacion,
    PublicacionMemorandumDesignacion,
    SeguimientoEtapa,
)
from apps.usuarios.models import Role


User = get_user_model()


class MemorandumDesignacionTests(TestCase):
    def setUp(self):
        self.media_root = tempfile.mkdtemp(prefix="memorandum-designacion-")
        self.settings_override = override_settings(MEDIA_ROOT=self.media_root)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        self.addCleanup(shutil.rmtree, self.media_root, True)

        admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administrador memo")
        student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante memo")
        teacher_role = Role.objects.create(codigo="DOCENTE", nombre="Docente memo")
        self.admin = User.objects.create_user("memo-admin", role=admin_role, is_staff=True)
        self.student = User.objects.create_user("memo-student", role=student_role)
        self.docentes = [
            User.objects.create_user(f"memo-docente-{index}", role=teacher_role)
            for index in range(5)
        ]
        modalidad = Modalidad.objects.create(codigo="PROYECTO_GRADO", nombre="Proyecto de Grado memo")
        periodo = Periodo.objects.create(
            nombre="2026-MEMO", gestion=2026, semestre="II",
            fecha_inicio="2026-07-01", fecha_fin="2026-12-31",
        )
        estado = EstadoPostulacion.objects.create(codigo="EN_PROCESO", nombre="En proceso memo")
        self.postulacion = Postulacion.objects.create(
            codigo="PG-MEMO-001", estudiante=self.student, modalidad=modalidad,
            periodo=periodo, estado_actual=estado,
        )
        etapa = EtapaModalidad.objects.create(
            modalidad=modalidad, codigo="PERFIL_PROYECTO", nombre="Perfil de Proyecto",
            orden=1, origen_normativo="Flujo documental autorizado",
        )
        self.seguimiento = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion, etapa=etapa,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
        )
        EstadoDocumento.objects.create(codigo="ENV", nombre="Enviado memo")
        EstadoDocumento.objects.create(codigo="APR", nombre="Aprobado memo")
        TipoDocumento.objects.create(
            codigo="MEMORANDUM_DESIGNACION_PROYECTO",
            nombre="Memorándum oficial de designación de Proyecto",
            permite_multiple_version=True,
            extensiones_permitidas="pdf",
        )
        self.tutor = self._asignar(self.docentes[0], "TUTOR")
        self.tribunales = [
            self._asignar(self.docentes[index], "TRIBUNAL", orden=index)
            for index in range(1, 4)
        ]

    def _asignar(self, usuario, tipo, orden=None):
        return AsignacionPostulacion.objects.create(
            postulacion=self.postulacion,
            seguimiento_etapa=self.seguimiento if tipo == "TRIBUNAL" else None,
            usuario=usuario,
            tipo_participacion=tipo,
            orden_cargo=orden,
            designado_por=self.admin,
        )

    @staticmethod
    def _archivo(nombre="memorandum.pdf"):
        return SimpleUploadedFile(nombre, b"%PDF-1.4\n%test\n", content_type="application/pdf")

    def _publicar(self, seguimiento=None, archivo=None):
        return MemorandumDesignacionService.publicar(
            postulacion=self.postulacion,
            seguimiento=seguimiento or self.seguimiento,
            archivo=archivo or self._archivo(),
            usuario=self.admin,
        )

    def _usar_tesis(self, regimen):
        modalidad = Modalidad.objects.create(codigo="TESIS_GRADO", nombre="Tesis de Grado memo")
        self.postulacion.modalidad = modalidad
        self.postulacion.regimen_workflow = regimen
        self.postulacion.save(update_fields=["modalidad", "regimen_workflow"])
        etapa = EtapaModalidad.objects.create(
            modalidad=modalidad, codigo="PERFIL_TESIS", nombre="Perfil de Tesis",
            orden=1, origen_normativo="Flujo documental autorizado",
        )
        self.seguimiento.etapa = etapa
        self.seguimiento.save(update_fields=["etapa"])

    def test_endpoint_publica_memorandum_de_perfil_tesis_v2(self):
        self._usar_tesis(Postulacion.RegimenWorkflowChoices.TESIS_PERFIL_V2)
        memo_contract = FlujoPostulacionSerializer().get_gestion_decisiones_academicas(self.postulacion)
        self.assertEqual(
            memo_contract["memorandum_designacion_contextual"]["regimen_workflow_requerido"],
            Postulacion.RegimenWorkflowChoices.TESIS_PERFIL_V2,
        )
        client = APIClient()
        client.force_authenticate(self.admin)

        response = client.post(
            f"/api/v1/postulaciones/{self.postulacion.pk}/memorandums-designacion/",
            {"seguimiento_etapa": self.seguimiento.pk, "archivo": self._archivo()},
            format="multipart",
        )

        self.assertEqual(response.status_code, 201, getattr(response, "data", None))
        publicacion = PublicacionMemorandumDesignacion.objects.get(postulacion=self.postulacion)
        self.assertEqual(publicacion.seguimiento_etapa.etapa.codigo, "PERFIL_TESIS")
        self.assertEqual(publicacion.version_documento.documento.tipo_documento.codigo, "MEMORANDUM_DESIGNACION_PROYECTO")
        self.assertEqual(publicacion.version_documento.documento.estado.codigo, "APR")
        self.assertTrue(publicacion.version_documento.es_version_actual)
        self.assertTrue(MemorandumDesignacionService.es_vigente(publicacion))

    def test_memorandum_tesis_v2_rechaza_etapa_distinta_de_perfil_tesis(self):
        self._usar_tesis(Postulacion.RegimenWorkflowChoices.TESIS_PERFIL_V2)
        etapa_incorrecta = EtapaModalidad.objects.create(
            modalidad=self.postulacion.modalidad, codigo="DEFENSA_PRIVADA",
            nombre="Defensa Privada", orden=2, origen_normativo="Prueba de etapa incorrecta",
        )
        seguimiento_incorrecto = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion, etapa=etapa_incorrecta,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
        )

        with self.assertRaisesMessage(ValidationError, "Debe corresponder al Perfil de Tesis"):
            self._publicar(seguimiento=seguimiento_incorrecto)

        self.assertFalse(PublicacionMemorandumDesignacion.all_objects.exists())
        self.assertFalse(DocumentoPostulacion.all_objects.exists())

    def test_memorandum_tesis_v2_rechaza_pdf_invalido_y_no_registra_version(self):
        self._usar_tesis(Postulacion.RegimenWorkflowChoices.TESIS_PERFIL_V2)

        with self.assertRaisesMessage(DRFValidationError, "El contenido del archivo no corresponde a un PDF válido"):
            self._publicar(archivo=SimpleUploadedFile(
                "memorandum.pdf", b"no es PDF", content_type="application/pdf",
            ))

        self.assertFalse(PublicacionMemorandumDesignacion.all_objects.exists())
        self.assertFalse(DocumentoPostulacion.all_objects.exists())

    def test_carga_documental_ordinaria_no_hereda_excepcion_del_memorandum_tesis_v2(self):
        self._usar_tesis(Postulacion.RegimenWorkflowChoices.TESIS_PERFIL_V2)
        tipo = TipoDocumento.objects.get(codigo=MemorandumDesignacionService.TIPO_DOCUMENTO)

        with self.assertRaisesMessage(
            DRFValidationError,
            "no puede cargarse en la etapa 'PERFIL_TESIS'",
        ):
            DocumentoService().subir_documento(
                self.postulacion, tipo, self._archivo(), self.admin,
            )

        self.assertFalse(DocumentoPostulacion.all_objects.exists())

    def test_memorandum_no_se_habilita_para_tesis_legacy(self):
        self._usar_tesis(Postulacion.RegimenWorkflowChoices.TESIS_LEGACY_V1)
        memo_contract = FlujoPostulacionSerializer().get_gestion_decisiones_academicas(self.postulacion)
        self.assertIsNone(memo_contract["memorandum_designacion_contextual"])

        with self.assertRaisesMessage(
            ValidationError,
            "El memorándum de designación solo aplica a Proyecto de Grado.",
        ):
            self._publicar()

        self.assertFalse(PublicacionMemorandumDesignacion.all_objects.exists())

    def test_memorandum_sigue_rechazado_para_otras_modalidades(self):
        modalidad = Modalidad.objects.create(codigo="EXAMEN_GRADO", nombre="Examen de Grado memo")
        self.postulacion.modalidad = modalidad
        self.postulacion.regimen_workflow = None
        self.postulacion.save(update_fields=["modalidad", "regimen_workflow"])

        with self.assertRaisesMessage(
            ValidationError,
            "El memorándum de designación solo aplica a Proyecto de Grado.",
        ):
            self._publicar()

        self.assertFalse(PublicacionMemorandumDesignacion.all_objects.exists())

    def test_publicacion_congela_composicion_y_deja_de_ser_vigente_si_cambia(self):
        publicacion = self._publicar()

        self.assertFalse(DecisionAcademicaEtapa.objects.filter(
            seguimiento_etapa=self.seguimiento,
        ).exists())
        self.assertTrue(MemorandumDesignacionService.es_vigente(publicacion))
        self.assertEqual(
            set(publicacion.asignaciones.values_list("pk", flat=True)),
            {item.pk for item in [*self.tribunales, self.tutor]},
        )
        publicacion.version_documento.documento.refresh_from_db()
        self.assertEqual(publicacion.version_documento.documento.estado.codigo, "APR")

        self.tribunales[2].activo = False
        self.tribunales[2].save(update_fields=["activo"])
        self._asignar(self.docentes[4], "TRIBUNAL", orden=3)

        self.assertFalse(MemorandumDesignacionService.es_vigente(publicacion))
        nueva = self._publicar()
        publicacion.refresh_from_db()
        self.assertFalse(publicacion.activo)
        self.assertTrue(MemorandumDesignacionService.es_vigente(nueva))

    def test_publicacion_requiere_tutor_y_respalda_toda_la_designacion(self):
        self.tutor.activo = False
        self.tutor.save(update_fields=["activo"])

        with self.assertRaises(ValidationError):
            self._publicar()

    def test_cambio_de_tutor_invalida_memorandum_vigente(self):
        publicacion = self._publicar()
        self.assertTrue(MemorandumDesignacionService.es_vigente(publicacion))

        self.tutor.activo = False
        self.tutor.save(update_fields=["activo"])
        self._asignar(self.docentes[4], "TUTOR")

        self.assertFalse(MemorandumDesignacionService.es_vigente(publicacion))

    def test_memorandum_de_seguimiento_que_dejo_de_ser_actual_no_es_vigente(self):
        publicacion = self._publicar()
        seguimiento_actual = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion, etapa=self.seguimiento.etapa,
            numero_intento=self.seguimiento.numero_intento + 1,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
        )
        self.seguimiento.activo = False
        self.seguimiento.save(update_fields=["activo"])

        self.assertFalse(MemorandumDesignacionService.es_vigente(publicacion))
        self.assertEqual(seguimiento_actual.etapa.codigo, "PERFIL_PROYECTO")

    def test_rechaza_composicion_incompleta_y_usuario_no_administrativo(self):
        self.tribunales[2].activo = False
        self.tribunales[2].save(update_fields=["activo"])
        with self.assertRaises(ValidationError):
            self._publicar()
        self.assertFalse(PublicacionMemorandumDesignacion.all_objects.exists())

        self.tribunales[2].activo = True
        self.tribunales[2].save(update_fields=["activo"])
        with self.assertRaises(ValidationError):
            MemorandumDesignacionService.publicar(
                postulacion=self.postulacion,
                seguimiento=self.seguimiento,
                archivo=self._archivo(),
                usuario=self.student,
            )

    def test_rechaza_publicacion_si_falta_tipo_documental(self):
        TipoDocumento.all_objects.filter(
            codigo=MemorandumDesignacionService.TIPO_DOCUMENTO,
        ).delete()

        with self.assertRaisesMessage(
            ValidationError,
            "El tipo documental del memorándum no está configurado.",
        ):
            self._publicar()

        self.assertFalse(PublicacionMemorandumDesignacion.all_objects.exists())
        self.assertFalse(DocumentoPostulacion.all_objects.exists())

    def test_rechaza_publicacion_si_tipo_documental_esta_inactivo(self):
        tipo = TipoDocumento.all_objects.get(
            codigo=MemorandumDesignacionService.TIPO_DOCUMENTO,
        )
        tipo.activo = False
        tipo.save(update_fields=["activo"])

        with self.assertRaisesMessage(
            ValidationError,
            "El tipo documental del memorándum no está configurado.",
        ):
            self._publicar()

        self.assertFalse(PublicacionMemorandumDesignacion.all_objects.exists())
        self.assertFalse(DocumentoPostulacion.all_objects.exists())

    def test_rechaza_tribunales_duplicados_y_archivo_no_pdf(self):
        AsignacionPostulacion.objects.filter(pk=self.tribunales[1].pk).update(
            usuario=self.docentes[1],
        )
        with self.assertRaises(ValidationError):
            self._publicar()
        self.assertFalse(PublicacionMemorandumDesignacion.all_objects.exists())

        AsignacionPostulacion.objects.filter(pk=self.tribunales[1].pk).update(
            usuario=self.docentes[2],
        )
        with self.assertRaises(DRFValidationError):
            MemorandumDesignacionService.publicar(
                postulacion=self.postulacion,
                seguimiento=self.seguimiento,
                archivo=SimpleUploadedFile("memorandum.txt", b"no es PDF", content_type="text/plain"),
                usuario=self.admin,
            )
        self.assertFalse(PublicacionMemorandumDesignacion.all_objects.exists())
        self.assertFalse(DocumentoPostulacion.all_objects.filter(
            postulacion=self.postulacion,
            tipo_documento__codigo="MEMORANDUM_DESIGNACION_PROYECTO",
        ).exists())

    def test_estudiante_solo_consulta_y_descarga_la_version_publicada_vigente(self):
        publicacion = self._publicar()
        publicacion.asignaciones.add(self.tutor)
        client = APIClient()
        client.force_authenticate(self.student)

        response = client.get(f"/api/v1/postulaciones/{self.postulacion.pk}/memorandums-designacion/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [publicacion.pk])
        self.assertTrue(publicacion.version_documento.archivo.storage.exists(
            publicacion.version_documento.archivo.name,
        ))
        detail = client.get(f"/api/v1/documentos/versiones/{publicacion.version_documento_id}/")
        self.assertEqual(detail.status_code, 200, getattr(detail, "data", None))
        download = client.get(f"/api/v1/documentos/versiones/{publicacion.version_documento_id}/descargar/")
        self.assertEqual(download.status_code, 200, getattr(download, "data", None))

        self.tutor.activo = False
        self.tutor.save(update_fields=["activo"])
        self._asignar(self.docentes[4], "TUTOR")
        response = client.get(f"/api/v1/postulaciones/{self.postulacion.pk}/memorandums-designacion/")
        self.assertEqual(response.data, [])
        download = client.get(f"/api/v1/documentos/versiones/{publicacion.version_documento_id}/descargar/")
        self.assertEqual(download.status_code, 404)

        self.tribunales[2].activo = False
        self.tribunales[2].save(update_fields=["activo"])
        self._asignar(self.docentes[4], "TRIBUNAL", orden=3)

        response = client.get(f"/api/v1/postulaciones/{self.postulacion.pk}/memorandums-designacion/")
        self.assertEqual(response.data, [])
        download = client.get(f"/api/v1/documentos/versiones/{publicacion.version_documento_id}/descargar/")
        self.assertEqual(download.status_code, 404)

    def test_endpoint_de_publicacion_es_solo_administrativo(self):
        client = APIClient()
        client.force_authenticate(self.student)
        response = client.post(
            f"/api/v1/postulaciones/{self.postulacion.pk}/memorandums-designacion/",
            {"seguimiento_etapa": self.seguimiento.pk, "archivo": self._archivo()},
            format="multipart",
        )
        self.assertEqual(response.status_code, 403)
        self.assertFalse(PublicacionMemorandumDesignacion.objects.exists())

    def test_endpoint_administrativo_publica_con_tipo_documental_configurado(self):
        client = APIClient()
        client.force_authenticate(self.admin)
        response = client.post(
            f"/api/v1/postulaciones/{self.postulacion.pk}/memorandums-designacion/",
            {"seguimiento_etapa": self.seguimiento.pk, "archivo": self._archivo()},
            format="multipart",
        )

        self.assertEqual(response.status_code, 201, getattr(response, "data", None))
        self.assertTrue(PublicacionMemorandumDesignacion.objects.filter(
            postulacion=self.postulacion,
        ).exists())
        self.assertTrue(DocumentoPostulacion.objects.filter(
            postulacion=self.postulacion,
            tipo_documento__codigo=MemorandumDesignacionService.TIPO_DOCUMENTO,
        ).exists())
