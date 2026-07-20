"""Pruebas para el módulo de gestión documental."""

from django.contrib import admin
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from apps.academico.models import Modalidad, Periodo
from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, ObservacionDocumento, TipoDocumento, VersionDocumento
from apps.postulantes.models import Postulacion
from apps.usuarios.models import CustomUser


class TestEstadoDocumento(TestCase):
    """Pruebas para el modelo EstadoDocumento."""

    def setUp(self) -> None:
        """Prepara datos base para las pruebas."""
        self.estado_pendiente = EstadoDocumento.objects.create(
            codigo="PENDIENTE",
            nombre="Pendiente de revisión",
            descripcion="Documento pendiente de revisión",
        )
        self.estado_validado = EstadoDocumento.objects.create(
            codigo="VALIDADO",
            nombre="Validado",
            descripcion="Documento validado correctamente",
        )

    def test_crear_estado_documento(self) -> None:
        """Debe crear un estado de documento correctamente."""
        self.assertEqual(EstadoDocumento.objects.count(), 2)
        self.assertEqual(self.estado_pendiente.codigo, "PENDIENTE")
        self.assertEqual(self.estado_pendiente.nombre, "Pendiente de revisión")

    def test_codigo_unico(self) -> None:
        """El campo código debe ser único."""
        with self.assertRaises(Exception):
            EstadoDocumento.objects.create(
                codigo="PENDIENTE",
                nombre="Otro pendiente",
            )

    def test_nombre_unico(self) -> None:
        """El campo nombre debe ser único."""
        with self.assertRaises(Exception):
            EstadoDocumento.objects.create(
                codigo="OTRO_CODIGO",
                nombre="Pendiente de revisión",
            )

    def test_str_representation(self) -> None:
        """El método __str__ debe retornar el nombre."""
        self.assertEqual(str(self.estado_pendiente), "Pendiente de revisión")

    def test_heredar_de_base_model(self) -> None:
        """Debe heredar created_at, updated_at y activo de BaseModel."""
        self.assertIsNotNone(self.estado_pendiente.created_at)
        self.assertIsNotNone(self.estado_pendiente.updated_at)
        self.assertTrue(self.estado_pendiente.activo)

    def test_queryset_default_activo(self) -> None:
        """El queryset default debe filtrar solo registros activos."""
        self.estado_pendiente.activo = False
        self.estado_pendiente.save()

        self.assertEqual(EstadoDocumento.objects.count(), 1)
        self.assertEqual(EstadoDocumento.all_objects.count(), 2)

    def test_ordering_por_nombre(self) -> None:
        """Los estados deben ordenarse por nombre por defecto."""
        estado_rechazado = EstadoDocumento.objects.create(
            codigo="RECHAZADO",
            nombre="Archivado",
        )
        estados = EstadoDocumento.objects.all()
        nombres = [e.nombre for e in estados]
        self.assertEqual(nombres, sorted(nombres))

    def test_descripcion_opcional(self) -> None:
        """El campo descripción debe ser opcional."""
        estado_sin_desc = EstadoDocumento.objects.create(
            codigo="SIN_DESC",
            nombre="Sin descripción",
        )
        self.assertIsNone(estado_sin_desc.descripcion)


class TestTipoDocumento(TestCase):
    """Pruebas para el modelo TipoDocumento."""

    def test_crear_tipo_documento(self) -> None:
        """Debe crear un tipo de documento con los campos básicos."""
        tipo_documento = TipoDocumento.objects.create(
            codigo="DNI",
            nombre="Documento Nacional de Identidad",
            descripcion="Documento de identidad personal",
            obligatorio=True,
            permite_multiple_version=False,
            tamano_maximo_mb=5,
            extensiones_permitidas="pdf,jpg,png",
        )

        self.assertEqual(tipo_documento.codigo, "DNI")
        self.assertTrue(tipo_documento.obligatorio)
        self.assertEqual(tipo_documento.tamano_maximo_mb, 5)

    def test_str_representation(self) -> None:
        """El método __str__ debe retornar el nombre."""
        tipo_documento = TipoDocumento.objects.create(
            codigo="CONSTANCIA",
            nombre="Constancia de estudio",
        )
        self.assertEqual(str(tipo_documento), "Constancia de estudio")

    def test_heredar_de_base_model(self) -> None:
        """Debe heredar los campos base del modelo abstracto."""
        tipo_documento = TipoDocumento.objects.create(
            codigo="OTRO",
            nombre="Otro documento",
        )
        self.assertIsNotNone(tipo_documento.created_at)
        self.assertIsNotNone(tipo_documento.updated_at)
        self.assertTrue(tipo_documento.activo)

    def test_registro_en_admin(self) -> None:
        """El modelo debe estar registrado en el administrador."""
        self.assertIn(TipoDocumento, admin.site._registry)


class TestDocumentoPostulacion(TestCase):
    """Pruebas para el modelo DocumentoPostulacion."""

    def setUp(self) -> None:
        """Crear los datos necesarios para la prueba."""
        self.usuario = CustomUser.objects.create(
            username="usuario_prueba",
        )
        self.modalidad = Modalidad.objects.create(
            codigo="MOD1",
            nombre="Modalidad Test",
        )
        self.periodo = Periodo.objects.create(
            nombre="2026-1",
            gestion=2026,
            semestre="I",
            fecha_inicio="2026-01-01",
            fecha_fin="2026-06-30",
        )
        self.postulacion = Postulacion.objects.create(
            codigo="POST001",
            estudiante=self.usuario,
            modalidad=self.modalidad,
            periodo=self.periodo,
        )
        self.estado_documento = EstadoDocumento.objects.create(
            codigo="PENDIENTE_DOC",
            nombre="Pendiente de documento",
        )
        self.tipo_documento = TipoDocumento.objects.create(
            codigo="DNI",
            nombre="Documento de identidad",
        )

    def test_crear_documento_postulacion(self) -> None:
        """Debe crear un documento de postulación correctamente."""
        documento = DocumentoPostulacion.objects.create(
            postulacion=self.postulacion,
            tipo_documento=self.tipo_documento,
            estado=self.estado_documento,
            observacion_general="Verificar firma",
            requiere_correccion=True,
        )

        self.assertEqual(documento.postulacion, self.postulacion)
        self.assertEqual(documento.tipo_documento, self.tipo_documento)
        self.assertEqual(documento.estado, self.estado_documento)
        self.assertTrue(documento.requiere_correccion)
        self.assertEqual(documento.observacion_general, "Verificar firma")
        self.assertIsNone(documento.fecha_revision)

    def test_str_representation(self) -> None:
        """El método __str__ debe retornar la postulación y el tipo de documento."""
        documento = DocumentoPostulacion.objects.create(
            postulacion=self.postulacion,
            tipo_documento=self.tipo_documento,
            estado=self.estado_documento,
        )

        self.assertEqual(
            str(documento),
            f"{self.postulacion} - {self.tipo_documento}",
        )

    def test_unique_constraint_por_postulacion_y_tipo_documento(self) -> None:
        """No debe permitir dos documentos del mismo tipo en una misma postulación."""
        DocumentoPostulacion.objects.create(
            postulacion=self.postulacion,
            tipo_documento=self.tipo_documento,
            estado=self.estado_documento,
        )

        with self.assertRaises(Exception):
            DocumentoPostulacion.objects.create(
                postulacion=self.postulacion,
                tipo_documento=self.tipo_documento,
                estado=self.estado_documento,
            )

    def test_registro_en_admin(self) -> None:
        """El modelo debe estar registrado en el administrador."""
        self.assertIn(DocumentoPostulacion, admin.site._registry)


class TestVersionDocumento(TestCase):
    """Pruebas para el modelo VersionDocumento."""

    def setUp(self) -> None:
        """Crear los datos necesarios para la prueba."""
        self.usuario = CustomUser.objects.create(
            username="usuario_version",
        )
        self.modalidad = Modalidad.objects.create(
            codigo="MOD2",
            nombre="Modalidad Version",
        )
        self.periodo = Periodo.objects.create(
            nombre="2026-2",
            gestion=2026,
            semestre="II",
            fecha_inicio="2026-07-01",
            fecha_fin="2026-12-31",
        )
        self.postulacion = Postulacion.objects.create(
            codigo="POST002",
            estudiante=self.usuario,
            modalidad=self.modalidad,
            periodo=self.periodo,
        )
        self.estado_documento = EstadoDocumento.objects.create(
            codigo="REVISADO_DOC",
            nombre="Revisado",
        )
        self.tipo_documento = TipoDocumento.objects.create(
            codigo="CERT",
            nombre="Certificado",
        )
        self.documento = DocumentoPostulacion.objects.create(
            postulacion=self.postulacion,
            tipo_documento=self.tipo_documento,
            estado=self.estado_documento,
        )
        self.archivo = SimpleUploadedFile(
            name="documento.pdf",
            content=b"PDF content",
            content_type="application/pdf",
        )

    def test_crear_version_documento(self) -> None:
        """Debe crear una versión de documento correctamente."""
        version = VersionDocumento.objects.create(
            documento=self.documento,
            subido_por=self.usuario,
            numero_version=1,
            archivo=self.archivo,
            nombre_original="documento.pdf",
            tamano_bytes=1024,
            hash_sha256="a" * 64,
        )

        self.assertEqual(version.documento, self.documento)
        self.assertEqual(version.subido_por, self.usuario)
        self.assertEqual(version.numero_version, 1)
        self.assertEqual(version.nombre_original, "documento.pdf")
        self.assertEqual(version.tamano_bytes, 1024)
        self.assertEqual(version.hash_sha256, "a" * 64)
        self.assertTrue(version.es_version_actual)

    def test_str_representation(self) -> None:
        """El método __str__ debe retornar documento y número de versión."""
        version = VersionDocumento.objects.create(
            documento=self.documento,
            subido_por=self.usuario,
            numero_version=1,
            archivo=self.archivo,
            nombre_original="documento.pdf",
            tamano_bytes=1024,
            hash_sha256="b" * 64,
        )

        self.assertEqual(str(version), f"{self.documento} - v1")

    def test_unique_constraint_por_documento_y_numero_version(self) -> None:
        """No debe permitir dos versiones con el mismo número en un mismo documento."""
        VersionDocumento.objects.create(
            documento=self.documento,
            subido_por=self.usuario,
            numero_version=1,
            archivo=self.archivo,
            nombre_original="documento.pdf",
            tamano_bytes=1024,
            hash_sha256="c" * 64,
        )

        with self.assertRaises(Exception):
            VersionDocumento.objects.create(
                documento=self.documento,
                subido_por=self.usuario,
                numero_version=1,
                arquivo=self.archivo,
                nombre_original="documento.pdf",
                tamano_bytes=1024,
                hash_sha256="d" * 64,
            )

    def test_registro_en_admin(self) -> None:
        """El modelo debe estar registrado en el administrador."""
        self.assertIn(VersionDocumento, admin.site._registry)


class TestObservacionDocumento(TestCase):
    """Pruebas para el modelo ObservacionDocumento."""

    def setUp(self) -> None:
        """Crear los datos necesarios para la prueba."""
        self.usuario = CustomUser.objects.create(
            username="usuario_observacion",
        )
        self.modalidad = Modalidad.objects.create(
            codigo="MOD3",
            nombre="Modalidad Observacion",
        )
        self.periodo = Periodo.objects.create(
            nombre="2026-3",
            gestion=2026,
            semestre="II",
            fecha_inicio="2026-09-01",
            fecha_fin="2026-12-31",
        )
        self.postulacion = Postulacion.objects.create(
            codigo="POST003",
            estudiante=self.usuario,
            modalidad=self.modalidad,
            periodo=self.periodo,
        )
        self.estado_documento = EstadoDocumento.objects.create(
            codigo="OBS_DOC",
            nombre="Observación documento",
        )
        self.tipo_documento = TipoDocumento.objects.create(
            codigo="OBS",
            nombre="Documento de observación",
        )
        self.documento = DocumentoPostulacion.objects.create(
            postulacion=self.postulacion,
            tipo_documento=self.tipo_documento,
            estado=self.estado_documento,
        )
        self.version = VersionDocumento.objects.create(
            documento=self.documento,
            subido_por=self.usuario,
            numero_version=1,
            archivo=SimpleUploadedFile(
                name="documento.pdf",
                content=b"PDF content",
                content_type="application/pdf",
            ),
            nombre_original="documento.pdf",
            tamano_bytes=2048,
            hash_sha256="d" * 64,
        )

    def test_crear_observacion_documento(self) -> None:
        """Debe crear una observación de documento correctamente."""
        observacion = ObservacionDocumento.objects.create(
            version_documento=self.version,
            usuario=self.usuario,
            comentario="Revisar firma y sello.",
        )

        self.assertEqual(observacion.version_documento, self.version)
        self.assertEqual(observacion.usuario, self.usuario)
        self.assertEqual(observacion.comentario, "Revisar firma y sello.")
        self.assertFalse(observacion.leida_por_estudiante)
        self.assertFalse(observacion.corregida)
        self.assertIsNotNone(observacion.fecha_observacion)

    def test_str_representation(self) -> None:
        """El método __str__ debe mostrar documento, versión y usuario."""
        observacion = ObservacionDocumento.objects.create(
            version_documento=self.version,
            usuario=self.usuario,
            comentario="Observación de prueba.",
        )

        self.assertEqual(
            str(observacion),
            f"{self.version.documento} - v{self.version.numero_version} - {self.usuario}",
        )

    def test_registro_en_admin(self) -> None:
        """El modelo debe estar registrado en el administrador."""
        self.assertIn(ObservacionDocumento, admin.site._registry)
