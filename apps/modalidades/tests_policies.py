from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.academico.models import EtapaModalidad, Modalidad
from apps.documentos.models import EstadoDocumento, TipoDocumento
from apps.documentos.services import DocumentoService
from apps.modalidades.policies import (BaseModalidadPolicy, EtapaDefinition,
    ModalidadNoSoportadaError, ModalidadPolicyRegistry)
from apps.modalidades.proyecto_grado import ProyectoGradoPolicy
from apps.modalidades.tesis_grado import TesisGradoPolicy
from apps.modalidades.validators import ModalidadConfigurationValidator
from apps.postulantes.models import EstadoPostulacion, Postulacion, SeguimientoEtapa
from apps.postulantes.workflow import WorkflowService
from apps.academico.models import Periodo
from apps.usuarios.models import CustomUser


class RegistryTests(TestCase):
    def setUp(self):
        self.pg = Modalidad.objects.create(codigo="PROYECTO_GRADO", nombre="Proyecto de Grado policies")
        self.other = Modalidad.objects.create(codigo="MODALIDAD_NO_CONFIG", nombre="Modalidad sin configurar")
        self.tesis = Modalidad.objects.create(codigo="TESIS_GRADO", nombre="Tesis policies")

    def test_registry_resuelve_codigo_y_modalidad(self):
        self.assertIsInstance(ModalidadPolicyRegistry.get("PROYECTO_GRADO"), ProyectoGradoPolicy)
        self.assertIsInstance(ModalidadPolicyRegistry.get(self.pg), ProyectoGradoPolicy)
        self.assertIsInstance(ModalidadPolicyRegistry.get(self.tesis), TesisGradoPolicy)

    def test_registry_lista_soportadas_sin_fallback(self):
        self.assertIn("PROYECTO_GRADO", ModalidadPolicyRegistry.list_supported())
        self.assertIn("TESIS_GRADO", ModalidadPolicyRegistry.list_supported())
        with self.assertRaises(ModalidadNoSoportadaError): ModalidadPolicyRegistry.get(self.other)

    def test_registro_incompatible_es_rechazado(self):
        class OtherPolicy(BaseModalidadPolicy): codigo = "PROYECTO_GRADO"
        with self.assertRaises(ValueError): ModalidadPolicyRegistry.register("PROYECTO_GRADO", OtherPolicy)

    def test_capacidades_proyecto(self):
        cap = ModalidadPolicyRegistry.get(self.pg).get_capabilities(self.pg)
        self.assertTrue(cap.soportada and cap.eventos_soportados and cap.evaluaciones_soportadas and cap.cierre_soportado)
        self.assertEqual(len(cap.etapas), 8)
        self.assertEqual(cap.tipos_evento, ["DEFENSA_PERFIL", "DEFENSA_PRIVADA", "DEFENSA_PUBLICA"])

    def test_capacidades_examen_configuradas(self):
        examen = Modalidad.objects.create(codigo="EXAMEN_GRADO", nombre="Examen capacidades configuradas")
        result = ModalidadConfigurationValidator.validate_modalidad(examen)
        self.assertNotIn("Política de cierre no disponible.", result.errores)

    def test_validador_detecta_etapas_faltantes(self):
        result = ModalidadConfigurationValidator.validate_modalidad(self.pg)
        self.assertTrue(any("no persistida" in error for error in result.errores))

    def test_validador_modalidad_no_configurada_es_advertencia(self):
        result = ModalidadConfigurationValidator.validate_modalidad(self.other)
        self.assertTrue(result.valida)
        self.assertEqual(result.advertencias, ["Normativa específica no configurada"])

    def test_policy_declarativa_valida_transiciones(self):
        self.assertEqual(ProyectoGradoPolicy().validate_configuration(), [])
        self.assertEqual(ProyectoGradoPolicy().get_etapa_inicial().codigo, "INSCRIPCION")
        self.assertEqual(ProyectoGradoPolicy().get_etapas_finales()[0].codigo, "CIERRE_DOCUMENTAL")
        self.assertEqual(TesisGradoPolicy().validate_configuration(), [])
        self.assertEqual(TesisGradoPolicy().get_etapa_inicial().codigo, "INSCRIPCION")


class CapabilitiesApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(username="cap-user", password="x")
        self.client.force_authenticate(self.user)
        self.pg = Modalidad.objects.create(codigo="PROYECTO_GRADO", nombre="Proyecto capacidades")
        self.other = Modalidad.objects.create(codigo="MODALIDAD_NO_CONFIG", nombre="Modalidad sin configurar")

    def test_api_proyecto_soportado(self):
        response = self.client.get(reverse("modalidad-capacidades", args=[self.pg.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["soportada"])
        self.assertIn("configuracion_valida", response.data)

    def test_api_vincula_etapas_persistidas_y_reporta_faltantes(self):
        stored = EtapaModalidad.objects.create(
            modalidad=self.pg, codigo="INSCRIPCION", nombre="Inscripción persistida",
            orden=1, obligatoria=True, origen_normativo="Norma",
        )
        response = self.client.get(reverse("modalidad-capacidades", args=[self.pg.pk]))
        inscription = next(stage for stage in response.data["etapas"] if stage["codigo"] == "INSCRIPCION")
        missing = next(stage for stage in response.data["etapas"] if stage["codigo"] == "PERFIL_PROYECTO")
        self.assertEqual(inscription["id"], stored.pk)
        self.assertEqual(inscription["nombre"], stored.nombre)
        self.assertEqual(inscription["orden"], stored.orden)
        self.assertIsNone(missing["id"])
        self.assertFalse(response.data["configuracion_valida"])

    def test_api_no_soportada_expone_etapas_persistidas_solo_para_consulta(self):
        stored = EtapaModalidad.objects.create(
            modalidad=self.other, codigo="CONSULTA", nombre="Consulta", orden=1,
            obligatoria=False, origen_normativo="Norma",
        )
        response = self.client.get(reverse("modalidad-capacidades", args=[self.other.pk]))
        self.assertFalse(response.data["soportada"])
        self.assertEqual(response.data["etapas"][0]["id"], stored.pk)

    def test_api_modalidad_sin_policy_no_es_500(self):
        response = self.client.get(reverse("modalidad-capacidades", args=[self.other.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["soportada"])
        self.assertFalse(response.data["cierre_soportado"])

    def test_api_requiere_autenticacion(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(reverse("modalidad-capacidades", args=[self.pg.pk])).status_code, 401)


class ProyectoGradoRequisitosTests(TestCase):
    """Tests para verificar que la política de Proyecto de Grado ofrece documentos correctos por etapa."""

    def setUp(self):
        self.policy = ProyectoGradoPolicy()
        self.requisitos_policy = self.policy.requisitos_policy

    def test_documento_final_etapa_ofrece_documento_final(self):
        """Verificar que DOCUMENTO_FINAL etapa permite cargar DOCUMENTO_FINAL."""
        resultado = self.requisitos_policy.get_documentos_requeridos("DOCUMENTO_FINAL")
        self.assertEqual(resultado, ("DOCUMENTO_FINAL",))

    def test_revision_tribunal_previa_etapa_ofrece_informe_revision_tribunal_previa(self):
        """Verificar que REVISION_TRIBUNAL_PREVIA etapa permite cargar INFORME_REVISION_TRIBUNAL_PREVIA."""
        resultado = self.requisitos_policy.get_documentos_requeridos("REVISION_TRIBUNAL_PREVIA")
        self.assertEqual(resultado, ("INFORME_REVISION_TRIBUNAL_PREVIA",))

    def test_etapa_no_configurada_es_fail_closed(self):
        """Verificar que etapas sin documentos configurados devuelven tupla vacía (fail-closed)."""
        # PERFIL_PROYECTO, DEFENSA_PRIVADA, DEFENSA_PUBLICA, etc.
        etapas_sin_docs = ["PERFIL_PROYECTO", "DEFENSA_PRIVADA", "DEFENSA_PUBLICA"]
        for etapa in etapas_sin_docs:
            with self.subTest(etapa=etapa):
                resultado = self.requisitos_policy.get_documentos_requeridos(etapa)
                self.assertEqual(resultado, (), f"Etapa {etapa} debe devolver tupla vacía")

    def test_inscripcion_configura_tres_documentos_y_una_entrega_fisica(self):
        self.assertEqual(
            self.policy.get_documentos_aplicables_en_etapa("INSCRIPCION"),
            ("CARTA_SOLICITUD_PROYECTO", "MATRICULA_VIGENTE", "HISTORIAL_PRERREQ"),
        )
        self.assertEqual(self.policy.get_condiciones_requeridas("INSCRIPCION"), ())
        self.assertEqual(self.policy.get_entregas_requeridas("INSCRIPCION"), ("FOLDER_AMARILLO",))

    def test_sin_fase_devuelve_todos_documentos(self):
        """Verificar que llamar sin fase devuelve todos los documentos requeridos (compatibilidad)."""
        resultado = self.requisitos_policy.get_documentos_requeridos(None)
        self.assertEqual(
            resultado,
            ("DOCUMENTO_FINAL", "ACTA_DEFENSA", "HOJA_APROBACION", "INFORME_FINAL_TUTOR")
        )

    def test_documentos_aplicables_en_etapa_revision_tribunal_previa(self):
        """Verificar que get_documentos_aplicables_en_etapa devuelve INFORME_REVISION_TRIBUNAL_PREVIA."""
        # El método get_documentos_aplicables_en_etapa delega a get_documentos_requeridos
        resultado = self.policy.get_documentos_aplicables_en_etapa("REVISION_TRIBUNAL_PREVIA")
        self.assertEqual(resultado, ("INFORME_REVISION_TRIBUNAL_PREVIA",))

    def test_documentos_aplicables_en_etapa_documento_final(self):
        """Verificar que DOCUMENTO_FINAL sigue siendo aplicable en su etapa."""
        resultado = self.policy.get_documentos_aplicables_en_etapa("DOCUMENTO_FINAL")
        self.assertEqual(resultado, ("DOCUMENTO_FINAL", "OBSERVACIONES_DEFENSA_PERFIL"))

    def test_revision_final_post_publica_ofrece_exactamente_hoja_aprobacion(self):
        resultado = self.policy.get_documentos_aplicables_en_etapa("REVISION_FINAL_POST_PUBLICA")
        self.assertEqual(resultado, ("HOJA_APROBACION",))


class ProyectoGradoDocumentosAplicablesTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = CustomUser.objects.create_superuser(username="documentos-pg-admin", password="x")
        modalidad = Modalidad.objects.create(codigo="PROYECTO_GRADO", nombre="Proyecto documentos aplicables")
        periodo = Periodo.objects.create(
            nombre="2026-PGA", gestion=2026, semestre="I",
            fecha_inicio="2026-01-01", fecha_fin="2026-12-31",
        )
        estado = EstadoPostulacion.objects.create(codigo="EN_PROCESO", nombre="En proceso documentos")
        self.postulacion = Postulacion.objects.create(
            codigo="POST-DOCUMENTOS-PG", estudiante=self.admin,
            modalidad=modalidad, periodo=periodo, estado_actual=estado,
        )
        etapas = {
            "REVISION_FINAL_POST_PUBLICA": EtapaModalidad.objects.create(
                modalidad=modalidad, codigo="REVISION_FINAL_POST_PUBLICA",
                nombre="Revisión Final Post Pública", orden=7,
                obligatoria=True, origen_normativo="Normativa",
            ),
            "CIERRE_DOCUMENTAL": EtapaModalidad.objects.create(
                modalidad=modalidad, codigo="CIERRE_DOCUMENTAL",
                nombre="Cierre Documental", orden=8,
                obligatoria=True, origen_normativo="Normativa",
            ),
        }
        SeguimientoEtapa.objects.create(
            postulacion=self.postulacion,
            etapa=etapas["REVISION_FINAL_POST_PUBLICA"],
            estado="EN_PROCESO",
        )
        SeguimientoEtapa.objects.create(
            postulacion=self.postulacion,
            etapa=etapas["CIERRE_DOCUMENTAL"],
            estado="PENDIENTE",
        )
        self.estado_enviado = EstadoDocumento.objects.create(codigo="ENV", nombre="Enviado documentos")
        EstadoDocumento.objects.create(codigo="APR", nombre="Aprobado documentos")
        self.hoja = TipoDocumento.objects.create(codigo="HOJA_APROBACION", nombre="Hoja de Aprobación")
        self.acta = TipoDocumento.objects.create(codigo="ACTA_DEFENSA", nombre="Acta de Defensa")
        self.informe = TipoDocumento.objects.create(codigo="INFORME_FINAL_TUTOR", nombre="Informe Final del Tutor")
        self.ajeno = TipoDocumento.objects.create(codigo="DOCUMENTO_AJENO_CIERRE", nombre="Documento ajeno al cierre")

    def _activar_cierre(self):
        SeguimientoEtapa.objects.filter(
            postulacion=self.postulacion,
            etapa__codigo="REVISION_FINAL_POST_PUBLICA",
        ).update(estado="APROBADA")
        SeguimientoEtapa.objects.filter(
            postulacion=self.postulacion,
            etapa__codigo="CIERRE_DOCUMENTAL",
        ).update(estado="EN_PROCESO")

    def test_endpoint_de_cierre_expone_solo_acta_e_informe_final_tutor(self):
        self._activar_cierre()
        self.client.force_authenticate(self.admin)

        response = self.client.get(f"/api/v1/postulaciones/{self.postulacion.pk}/documentos-aplicables/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["etapa_actual"], "CIERRE_DOCUMENTAL")
        self.assertEqual(
            {item["codigo"] for item in response.data["documentos_aplicables"]},
            {"ACTA_DEFENSA", "INFORME_FINAL_TUTOR"},
        )
        self.assertNotIn("DOCUMENTO_FINAL", {item["codigo"] for item in response.data["documentos_aplicables"]})
        self.assertNotIn("HOJA_APROBACION", {item["codigo"] for item in response.data["documentos_aplicables"]})

    def test_carga_ordinaria_permite_informe_y_rechaza_tipo_ajeno(self):
        self._activar_cierre()
        service = DocumentoService()
        archivo = SimpleUploadedFile("informe-tutor.pdf", b"%PDF-1.4", content_type="application/pdf")

        version = service.subir_documento(self.postulacion, self.informe, archivo, self.admin)

        self.assertEqual(version.documento.tipo_documento.codigo, "INFORME_FINAL_TUTOR")
        with self.assertRaisesMessage(ValidationError, "no puede cargarse en la etapa"):
            service.subir_documento(
                self.postulacion,
                self.ajeno,
                SimpleUploadedFile("ajeno.pdf", b"%PDF-1.4", content_type="application/pdf"),
                self.admin,
            )

    def test_acta_conserva_vinculo_especial_y_rechaza_carga_sin_evento(self):
        self._activar_cierre()
        with self.assertRaisesMessage(DjangoValidationError, "ACTA_DEFENSA debe vincularse a una Defensa Pública finalizada"):
            DocumentoService().subir_documento(
                self.postulacion,
                self.acta,
                SimpleUploadedFile("acta.pdf", b"%PDF-1.4", content_type="application/pdf"),
                self.admin,
            )
