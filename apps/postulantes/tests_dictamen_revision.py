from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, TipoDocumento, VersionDocumento
from apps.postulantes.models import DictamenRevisionDocumento, EstadoPostulacion, Postulacion, SeguimientoEtapa
from apps.usuarios.models import CustomUser


class DictamenRevisionDocumentoModelTest(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(username="dictamen-user", password="x", ci="660001", ru="RU660001")
        self.modalidad = Modalidad.objects.create(codigo="TESIS_GRADO", nombre="Tesis")
        self.periodo = Periodo.objects.create(nombre="2026-DICT", gestion=2026, semestre="II", fecha_inicio="2026-07-01", fecha_fin="2026-12-31")
        self.estado_post = EstadoPostulacion.objects.create(codigo="REG-DICT", nombre="Registrada")
        self.estado_doc = EstadoDocumento.objects.create(codigo="APR-DICT", nombre="Aprobado")
        self.tipo = TipoDocumento.objects.create(codigo="DOC-DICT", nombre="Documento", tamano_maximo_mb=10, extensiones_permitidas="pdf")
        self.p1 = Postulacion.objects.create(codigo="DICT-1", estudiante=self.user, modalidad=self.modalidad, periodo=self.periodo, estado_actual=self.estado_post)
        self.p2 = Postulacion.objects.create(codigo="DICT-2", estudiante=CustomUser.objects.create_user(username="dictamen-other", password="x", ci="660002", ru="RU660002"), modalidad=self.modalidad, periodo=self.periodo, estado_actual=self.estado_post)
        self.stage = EtapaModalidad.objects.create(modalidad=self.modalidad, codigo="REVISION_TUTOR", nombre="Revisión", orden=1, origen_normativo="Norma")
        self.s1 = SeguimientoEtapa.objects.create(postulacion=self.p1, etapa=self.stage, estado="EN_PROCESO")
        self.s2 = SeguimientoEtapa.objects.create(postulacion=self.p2, etapa=self.stage, estado="EN_PROCESO")
        self.v1 = self._version(self.p1, 1)
        self.v2 = self._version(self.p2, 1)

    def _version(self, postulacion, n):
        doc = DocumentoPostulacion.objects.create(postulacion=postulacion, tipo_documento=self.tipo, estado=self.estado_doc)
        return VersionDocumento.objects.create(documento=doc, subido_por=self.user, numero_version=n, archivo="documentos/versiones/test.pdf", nombre_original="test.pdf", tamano_bytes=1, hash_sha256="a" * 64)

    def test_rechaza_version_ajena(self):
        with self.assertRaises(ValidationError):
            DictamenRevisionDocumento.objects.create(seguimiento_etapa=self.s1, version_documento_revisada=self.v2, evidencia_version=self.v1, tipo_revision="TUTOR", resultado="SUFICIENTE")

    def test_historico_inactivo_permite_nuevo_dictamen(self):
        first = DictamenRevisionDocumento.objects.create(seguimiento_etapa=self.s1, version_documento_revisada=self.v1, evidencia_version=self.v1, tipo_revision="TUTOR", resultado="INSUFICIENTE")
        first.activo = False
        first.save(update_fields=["activo"])
        second = DictamenRevisionDocumento.objects.create(seguimiento_etapa=self.s1, version_documento_revisada=self.v1, evidencia_version=self.v1, tipo_revision="TUTOR", resultado="SUFICIENTE")
        self.assertTrue(second.activo)

    def test_tipos_tutor_y_tribunal_no_colisionan(self):
        DictamenRevisionDocumento.objects.create(seguimiento_etapa=self.s1, version_documento_revisada=self.v1, evidencia_version=self.v1, tipo_revision="TUTOR", resultado="SUFICIENTE")
        self.assertEqual(DictamenRevisionDocumento.objects.create(seguimiento_etapa=self.s1, version_documento_revisada=self.v1, evidencia_version=self.v1, tipo_revision="TRIBUNAL", resultado="SUFICIENTE").tipo_revision, "TRIBUNAL")
