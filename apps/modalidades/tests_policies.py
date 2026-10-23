from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import TestCase
from django.urls import reverse
from unittest.mock import patch
from rest_framework.test import APIClient
from rest_framework.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.academico.models import EtapaModalidad, Modalidad
from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, TipoDocumento, VersionDocumento
from apps.documentos.services import DocumentoService
from apps.modalidades.policies import (ActorCargaDocumento, BaseModalidadPolicy,
    EtapaDefinition, DecisionAcademicaDefinition, ModalidadNoSoportadaError,
    ModalidadPolicyRegistry)
from apps.modalidades.proyecto_grado import ProyectoGradoPolicy
from apps.modalidades.trabajo_dirigido import TrabajoDirigidoPolicy
from apps.modalidades.tesis_grado import TesisGradoPolicy
from apps.modalidades.validators import ModalidadConfigurationValidator
from apps.postulantes.models import EstadoPostulacion, Postulacion, SeguimientoEtapa
from apps.postulantes.workflow import WorkflowService
from apps.academico.models import Periodo
from apps.usuarios.models import CustomUser, Role


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

    def test_trabajo_dirigido_does_not_inherit_project_identity_restriction(self):
        groups = TrabajoDirigidoPolicy().get_configuracion_actores()["grupos"]
        tribunal = next(
            group for group in groups
            if group["clave"] == "TRIBUNAL_PROPUESTA_TRABAJO_DIRIGIDO"
        )

        self.assertIsNone(tribunal.get("restriccion_identidad"))

    def test_ocupacion_actor_is_opt_in_for_project_grade_pilot_only(self):
        project_groups = ProyectoGradoPolicy().get_configuracion_actores()["grupos"]
        td_groups = TrabajoDirigidoPolicy().get_configuracion_actores()["grupos"]
        thesis_groups = TesisGradoPolicy().get_configuracion_actores()["grupos"]

        self.assertTrue(all(group["ocupacion_actor"]["aplica"] for group in project_groups))
        self.assertTrue(all(group.get("ocupacion_actor") is None for group in td_groups))
        self.assertTrue(all(group.get("ocupacion_actor") is None for group in thesis_groups))

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

    def test_revision_tribunal_previa_reserva_informe_para_administracion(self):
        actores = self.policy.get_actores_carga_documento(
            "REVISION_TRIBUNAL_PREVIA",
            "INFORME_REVISION_TRIBUNAL_PREVIA",
        )
        self.assertEqual(actores, (ActorCargaDocumento.ADMINISTRACION,))

    def test_revision_final_post_publica_reserva_hoja_para_administracion(self):
        actores = self.policy.get_actores_carga_documento(
            "REVISION_FINAL_POST_PUBLICA",
            "HOJA_APROBACION",
        )
        self.assertEqual(actores, (ActorCargaDocumento.ADMINISTRACION,))

    def test_documento_no_clasificado_preserva_compatibilidad_temporal(self):
        self.assertIsNone(self.policy.get_actores_carga_documento(
            "DOCUMENTO_FINAL",
            "DOCUMENTO_FINAL",
        ))

    def test_etapa_no_configurada_es_fail_closed(self):
        """Verificar que etapas sin documentos configurados devuelven tupla vacía (fail-closed)."""
        # PERFIL_PROYECTO, DEFENSA_PRIVADA, DEFENSA_PUBLICA, etc.
        etapas_sin_docs = ["DEFENSA_PRIVADA", "DEFENSA_PUBLICA"]
        for etapa in etapas_sin_docs:
            with self.subTest(etapa=etapa):
                resultado = self.requisitos_policy.get_documentos_requeridos(etapa)
                self.assertEqual(resultado, (), f"Etapa {etapa} debe devolver tupla vacía")

    def test_inscripcion_configura_tres_documentos_y_una_entrega_fisica(self):
        self.assertEqual(
            self.policy.get_documentos_aplicables_en_etapa("INSCRIPCION"),
            ("CARTA_SOLICITUD_PROYECTO", "MATRICULA_VIGENTE", "HISTORIAL_PRERREQ"),
        )
        self.assertEqual(
            self.policy.get_documentos_aplicables_en_etapa("PERFIL_PROYECTO"),
            ("CARTA_SOLICITUD_TRIBUNAL_PROYECTO", "PERFIL_ACADEMICO_PROYECTO", "MEMORANDUM_DESIGNACION_PROYECTO"),
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


class ProyectoGradoOrientacionDocumentalPerfilTests(TestCase):
    def setUp(self):
        self.policy = ProyectoGradoPolicy()
        self.student = CustomUser.objects.create_user(username="orientacion-doc-pg", password="x")
        modalidad = Modalidad.objects.create(codigo="PROYECTO_GRADO", nombre="Proyecto orientación documental")
        periodo = Periodo.objects.create(
            nombre="2026-ORIENTACION", gestion=2026, semestre="I",
            fecha_inicio="2026-01-01", fecha_fin="2026-12-31",
        )
        estado = EstadoPostulacion.objects.create(codigo="EN_PROCESO", nombre="En proceso orientación")
        self.postulacion = Postulacion.objects.create(
            codigo="POST-ORIENTACION-PG", estudiante=self.student, modalidad=modalidad,
            periodo=periodo, estado_actual=estado, regimen_workflow="PG_HITOS_V1",
        )
        etapa = EtapaModalidad.objects.create(
            modalidad=modalidad, codigo="PERFIL_PROYECTO", nombre="Perfil de Proyecto",
            orden=2, obligatoria=True, origen_normativo="Normativa",
        )
        self.seguimiento = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion, etapa=etapa, estado="EN_PROCESO",
        )
        self.enviado = EstadoDocumento.objects.create(codigo="ENV", nombre="Enviado")
        self.aprobado = EstadoDocumento.objects.create(codigo="APR", nombre="Aprobado")
        self.observado = EstadoDocumento.objects.create(codigo="OBS", nombre="Observado")
        self.carta = TipoDocumento.objects.create(
            codigo="CARTA_SOLICITUD_TRIBUNAL_PROYECTO", nombre="Carta de solicitud de Tribunal",
        )
        self.perfil = TipoDocumento.objects.create(
            codigo="PERFIL_ACADEMICO_PROYECTO", nombre="Perfil académico",
        )
        TipoDocumento.objects.create(
            codigo="MEMORANDUM_DESIGNACION_PROYECTO", nombre="Memorándum de designación",
        )

    def _documento(self, tipo, estado, *, requiere_correccion=False):
        documento = DocumentoPostulacion.objects.create(
            postulacion=self.postulacion, tipo_documento=tipo, estado=estado,
            requiere_correccion=requiere_correccion,
        )
        VersionDocumento.objects.create(
            documento=documento, subido_por=self.student, numero_version=1,
            archivo=SimpleUploadedFile(f"{tipo.codigo}.pdf", b"%PDF-1.4"),
            nombre_original=f"{tipo.codigo}.pdf", tamano_bytes=8,
            hash_sha256="a" * 64, es_version_actual=True,
        )
        return documento

    def _orientacion(self):
        return self.policy.get_orientacion_etapa_actual(
            postulacion=self.postulacion, seguimiento=self.seguimiento,
        )

    def test_sin_documentos_proyecta_todos_los_documentos_aplicables_del_estudiante(self):
        orientacion = self._orientacion()

        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")
        self.assertEqual([item["codigo"] for item in orientacion["requisitos"]], [
            "CARTA_SOLICITUD_TRIBUNAL_PROYECTO",
            "PERFIL_ACADEMICO_PROYECTO",
        ])
        self.assertTrue(all(item["estado"] == "NO_PRESENTADO" for item in orientacion["requisitos"]))

    def test_carta_aprobada_conserva_ambos_requisitos_y_perfil_pendiente(self):
        self._documento(self.carta, self.aprobado)

        orientacion = self._orientacion()

        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")
        self.assertEqual(
            [(item["codigo"], item["estado"], item["cumplido"]) for item in orientacion["requisitos"]],
            [
                ("CARTA_SOLICITUD_TRIBUNAL_PROYECTO", "APROBADO", True),
                ("PERFIL_ACADEMICO_PROYECTO", "NO_PRESENTADO", False),
            ],
        )

    def test_documentos_enviados_orientan_a_esperar_revision(self):
        self._documento(self.carta, self.enviado)
        self._documento(self.perfil, self.enviado)

        orientacion = self._orientacion()

        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "ESPERAR_REVISION_DOCUMENTOS")
        self.assertEqual([item["codigo"] for item in orientacion["requisitos"]], [
            "CARTA_SOLICITUD_TRIBUNAL_PROYECTO",
            "PERFIL_ACADEMICO_PROYECTO",
        ])
        self.assertTrue(all(item["estado"] == "PENDIENTE_REVISION" for item in orientacion["requisitos"]))

    def test_documento_observado_orienta_a_correccion_o_reenvio(self):
        self._documento(self.carta, self.observado, requiere_correccion=True)
        self._documento(self.perfil, self.aprobado)

        orientacion = self._orientacion()

        self.assertEqual(orientacion["siguiente_accion"]["titulo"], "Corregir o reenviar documentos")
        self.assertEqual(orientacion["requisitos"][0]["estado"], "REQUIERE_CORRECCION")
        self.assertEqual(orientacion["requisitos"][1]["estado"], "APROBADO")

    def test_documentos_aprobados_dejan_continuar_orientacion_academica(self):
        self._documento(self.carta, self.aprobado)
        self._documento(self.perfil, self.aprobado)

        orientacion = self._orientacion()

        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "GESTIONAR_ACTORES")
        self.assertEqual(orientacion["siguiente_accion"]["titulo"], "Completar Tribunal de Perfil")

    def test_despues_de_propuesta_y_tutor_orienta_a_presentar_perfil(self):
        self._documento(self.carta, self.aprobado)
        docente_role = Role.objects.create(codigo="DOC_ORIENTACION", nombre="Docente")
        docentes = [
            CustomUser.objects.create_user(username=f"doc-orientacion-{indice}", role=docente_role)
            for indice in range(4)
        ]
        from apps.postulantes.models import AsignacionPostulacion

        for orden, docente in enumerate(docentes[:3], start=1):
            AsignacionPostulacion.objects.create(
                postulacion=self.postulacion, usuario=docente, tipo_participacion="TRIBUNAL",
                orden_cargo=orden, seguimiento_etapa=self.seguimiento, designado_por=docentes[3],
            )
        AsignacionPostulacion.objects.create(
            postulacion=self.postulacion, usuario=docentes[3], tipo_participacion="TUTOR",
            designado_por=docentes[3],
        )

        with patch.object(self.policy, "_propuesta_aprobada", return_value=True):
            orientacion = self._orientacion()

        self.assertEqual([item["codigo"] for item in orientacion["requisitos"]], [
            "CARTA_SOLICITUD_TRIBUNAL_PROYECTO",
            "PERFIL_ACADEMICO_PROYECTO",
        ])
        self.assertTrue(orientacion["requisitos"][0]["cumplido"])
        self.assertFalse(orientacion["requisitos"][1]["cumplido"])
        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")

    def test_modalidad_sin_documentos_aplicables_no_inventa_orientacion(self):
        class SinDocumentosPolicy(BaseModalidadPolicy):
            pass

        self.assertIsNone(SinDocumentosPolicy().get_orientacion_documental_prioritaria(
            postulacion=self.postulacion, seguimiento=self.seguimiento,
        ))


class ActorConfigurationContractTests(TestCase):
    def test_base_policy_default_is_empty(self):
        self.assertEqual(BaseModalidadPolicy().get_configuracion_actores(postulacion=None, seguimiento=None), {})

    def test_proyecto_grado_configuracion_expone_tribunal_y_tutor(self):
        configuration = ProyectoGradoPolicy().get_configuracion_actores(postulacion=None, seguimiento=None)
        self.assertIn("grupos", configuration)
        self.assertEqual(len(configuration["grupos"]), 3)

        tribunal = next(group for group in configuration["grupos"] if group["tipo_participacion"] == "TRIBUNAL")
        tutor = next(group for group in configuration["grupos"] if group["tipo_participacion"] == "TUTOR")
        docente_modalidad = next(group for group in configuration["grupos"] if group["tipo_participacion"] == "DOCENTE_MODALIDAD")

        self.assertEqual(tribunal["ambito"], "ETAPA")
        self.assertEqual(tribunal["minimo"], 3)
        self.assertEqual(tribunal["maximo"], 3)
        self.assertTrue(tribunal["ordenado"])
        self.assertEqual(tribunal["ordenes_permitidos"], [1, 2, 3])
        self.assertTrue(tribunal["obligatoriedad"])

        self.assertEqual(tutor["ambito"], "POSTULACION")
        self.assertEqual(tutor["minimo"], 1)
        self.assertEqual(tutor["maximo"], 1)
        self.assertTrue(tutor["obligatoriedad"])
        self.assertIsNone(tutor["precondicion"])

        self.assertEqual(docente_modalidad["ambito"], "ETAPA")
        self.assertEqual(docente_modalidad["codigo_etapa"], "DEFENSA_PRIVADA")
        self.assertEqual(docente_modalidad["minimo"], 1)
        self.assertEqual(docente_modalidad["maximo"], 1)
        self.assertTrue(docente_modalidad["obligatoriedad"])
        self.assertIsNone(docente_modalidad["posiciones"][0]["orden_cargo"])

    def test_trabajo_dirigido_declara_su_propio_docente_modalidad_para_defensa_privada(self):
        configuration = TrabajoDirigidoPolicy().get_configuracion_actores(postulacion=None, seguimiento=None)

        docente = next(
            group for group in configuration["grupos"]
            if group["tipo_participacion"] == "DOCENTE_MODALIDAD"
        )

        self.assertEqual(docente["clave"], "DOCENTE_MODALIDAD_DEFENSA_PRIVADA_TD")
        self.assertEqual(docente["codigo_etapa"], "DEFENSA_PRIVADA")
        self.assertEqual((docente["minimo"], docente["maximo"]), (1, 1))
        self.assertNotIn("PROYECTO", str(docente))

    def test_proyecto_declara_decision_aprobacion_de_propuesta_con_composicion_formal(self):
        definitions = ProyectoGradoPolicy().get_decisiones_academicas_permitidas("PERFIL_PROYECTO")
        self.assertEqual(len(definitions), 1)
        decision = definitions[0]
        self.assertIsInstance(decision, DecisionAcademicaDefinition)
        self.assertEqual(decision.codigo, "PROPUESTA_APROBADA")
        self.assertEqual(decision.resultados, ("APROBADA",))
        self.assertEqual(decision.participantes_minimos, 3)
        self.assertEqual(decision.participantes_maximos, 3)
        self.assertEqual(decision.roles_participantes, ("TRIBUNAL",))
        self.assertEqual(decision.ordenes_requeridos, (1, 2, 3))
        self.assertEqual(decision.regimen_workflow_requerido, "PG_HITOS_V1")
        self.assertTrue(decision.validar_composicion_asignaciones)
        self.assertEqual(ProyectoGradoPolicy().get_decisiones_academicas_permitidas("DEFENSA_PERFIL"), ())

    def test_proyecto_ubica_memorandum_en_decision_de_perfil_y_otras_etapas_permanecen_cerradas(self):
        config = ProyectoGradoPolicy().get_publicacion_memorandum_designacion("PERFIL_PROYECTO")

        self.assertEqual(config["tipo_documento"], "MEMORANDUM_DESIGNACION_PROYECTO")
        self.assertEqual(config["decision_academica"], "PROPUESTA_APROBADA")
        self.assertTrue(config["publicacion_independiente"])
        self.assertIsNone(ProyectoGradoPolicy().get_publicacion_memorandum_designacion("DEFENSA_PERFIL"))


class ProyectoGradoDocumentosAplicablesTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = CustomUser.objects.create_superuser(username="documentos-pg-admin", password="x")
        student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante documentos PG")
        self.student = CustomUser.objects.create_user(
            username="documentos-pg-estudiante",
            password="x",
            role=student_role,
        )
        modalidad = Modalidad.objects.create(codigo="PROYECTO_GRADO", nombre="Proyecto documentos aplicables")
        periodo = Periodo.objects.create(
            nombre="2026-PGA", gestion=2026, semestre="I",
            fecha_inicio="2026-01-01", fecha_fin="2026-12-31",
        )
        estado = EstadoPostulacion.objects.create(codigo="EN_PROCESO", nombre="En proceso documentos")
        self.postulacion = Postulacion.objects.create(
            codigo="POST-DOCUMENTOS-PG", estudiante=self.student,
            modalidad=modalidad, periodo=periodo, estado_actual=estado,
        )
        etapas = {
            "REVISION_TRIBUNAL_PREVIA": EtapaModalidad.objects.create(
                modalidad=modalidad, codigo="REVISION_TRIBUNAL_PREVIA",
                nombre="Revisión del Tribunal", orden=4,
                obligatoria=True, origen_normativo="Normativa",
            ),
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
            etapa=etapas["REVISION_TRIBUNAL_PREVIA"],
            estado="APROBADA",
        )
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

    def test_estudiante_recibe_informe_tribunal_aplicable_pero_no_cargable(self):
        SeguimientoEtapa.objects.filter(postulacion=self.postulacion).update(estado="APROBADA")
        SeguimientoEtapa.objects.filter(
            postulacion=self.postulacion,
            etapa__codigo="REVISION_TRIBUNAL_PREVIA",
        ).update(estado="EN_PROCESO")
        TipoDocumento.objects.create(
            codigo="INFORME_REVISION_TRIBUNAL_PREVIA",
            nombre="Informe de Evaluación del Tribunal",
        )
        self.client.force_authenticate(self.student)

        response = self.client.get(
            f"/api/v1/postulaciones/{self.postulacion.pk}/documentos-aplicables/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["documentos_aplicables"]), 1)
        item = response.data["documentos_aplicables"][0]
        self.assertEqual(item["codigo"], "INFORME_REVISION_TRIBUNAL_PREVIA")
        self.assertEqual(item["capacidad_carga"]["codigo"], "ACTOR_CARGA_NO_AUTORIZADO")
        self.assertFalse(item["capacidad_carga"]["permitida"])
        self.assertEqual(
            item["capacidad_carga"]["actores_carga_permitidos"],
            [ActorCargaDocumento.ADMINISTRACION],
        )

    def _activar_cierre(self):
        SeguimientoEtapa.objects.filter(
            postulacion=self.postulacion,
            etapa__codigo="REVISION_FINAL_POST_PUBLICA",
        ).update(estado="APROBADA")
        SeguimientoEtapa.objects.filter(
            postulacion=self.postulacion,
            etapa__codigo="CIERRE_DOCUMENTAL",
        ).update(estado="EN_PROCESO")

    def _solicitar_codigos_policy(self, codes):
        self.client.force_authenticate(self.admin)
        with patch.object(ProyectoGradoPolicy, "get_documentos_aplicables_en_etapa", return_value=codes):
            return self.client.get(f"/api/v1/postulaciones/{self.postulacion.pk}/documentos-aplicables/")

    def test_endpoint_devuelve_todos_los_tipos_declarados_y_activos(self):
        codes = ("POLICY_DOCUMENT_A", "POLICY_DOCUMENT_B", "POLICY_DOCUMENT_C")
        for code in codes:
            TipoDocumento.objects.create(codigo=code, nombre=code)

        response = self._solicitar_codigos_policy(codes)

        self.assertEqual(response.status_code, 200)
        self.assertEqual({item["codigo"] for item in response.data["documentos_aplicables"]}, set(codes))
        self.assertTrue(all(
            item["capacidad_carga"] == {
                "permitida": True,
                "codigo": "SIN_DOCUMENTO",
                "mensaje": "El documento todavía no fue cargado.",
            }
            for item in response.data["documentos_aplicables"]
        ))

    def test_endpoint_reporta_tipo_declarado_inexistente(self):
        codes = ("POLICY_MISSING_A", "POLICY_MISSING_B", "POLICY_MISSING_C")
        for code in codes[:2]:
            TipoDocumento.objects.create(codigo=code, nombre=code)

        response = self._solicitar_codigos_policy(codes)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["data"]["codigos_faltantes"], [codes[2]])
        self.assertIn(codes[2], response.data["message"])
        self.assertNotIn("documentos_aplicables", response.data["data"])

    def test_endpoint_reporta_tipo_declarado_inactivo(self):
        codes = ("POLICY_INACTIVE_A", "POLICY_INACTIVE_B", "POLICY_INACTIVE_C")
        for code in codes[:2]:
            TipoDocumento.objects.create(codigo=code, nombre=code)
        TipoDocumento.all_objects.create(codigo=codes[2], nombre=codes[2], activo=False)

        response = self._solicitar_codigos_policy(codes)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["data"]["codigos_faltantes"], [codes[2]])
        self.assertIn(codes[2], response.data["message"])

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
