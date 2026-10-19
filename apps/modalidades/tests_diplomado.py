from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.academico.models import Modalidad, Periodo
from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, TipoDocumento, VersionDocumento
from apps.modalidades.diplomado import DOCUMENTS_BY_STAGE, DiplomadoPolicy
from apps.modalidades.diplomado_api import DiplomadoOverviewView
from apps.modalidades.diplomado_service import DiplomadoService
from apps.modalidades.models import DiplomadoDefensa, DiplomadoModulo
from apps.postulantes.asignaciones import AsignacionService
from apps.postulantes.defensas import EvaluacionDefensaService
from apps.postulantes.defensas_api import EventoDefensaViewSet
from apps.postulantes.models import AsignacionPostulacion, EstadoPostulacion, EvaluacionDefensa, EventoDefensa, Postulacion
from apps.postulantes.serializers import FlujoPostulacionSerializer
from apps.postulantes.workflow import WorkflowService
from apps.usuarios.models import CustomUser, Role


@override_settings(
    STORAGES={"default": {"BACKEND": "django.core.files.storage.InMemoryStorage"}},
)
class DiplomadoTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_initial_data", verbosity=0)
        admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Diplomado admin")
        student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        cls.admin = CustomUser.objects.create_user("diplomado-admin", password="x", role=admin_role, is_staff=True, ci="DIP-1", ru="DIP-R1")
        cls.student = CustomUser.objects.create_user("diplomado-student", password="x", role=student_role, ci="DIP-2", ru="DIP-R2")
        cls.post = Postulacion.objects.create(
            codigo="DIP-TEST-001", estudiante=cls.student,
            modalidad=Modalidad.objects.get(codigo="GRADUACION_VIA_DIPLOMADO"),
            periodo=Periodo.objects.create(nombre="DIP-2026", gestion=2026, semestre="II", fecha_inicio="2026-01-01", fecha_fin="2026-12-31"),
            estado_actual=EstadoPostulacion.objects.get(codigo="REGISTRADA"),
        )

    def setUp(self):
        self.follow = {item.etapa.codigo: item for item in WorkflowService.inicializar_flujo(self.post, self.admin)}

    def test_policy_declara_quinto_taller_y_reglas_normativas(self):
        policy = DiplomadoPolicy()
        self.assertEqual(policy.etapas[5].codigo, "TALLER_INVESTIGACION")
        self.assertEqual(policy.get_reglas_asignacion()["TRIBUNAL"], 2)
        self.assertEqual(policy.get_documentos_requeridos("DEFENSA_PUBLICA")[0], "CARTA_DEFENSA_DIPL")

    def _crear_actor(self, suffix):
        role, _created = Role.objects.get_or_create(codigo="DOCENTE", defaults={"nombre": "Docente"})
        sequence = CustomUser.all_objects.count() + 1
        return CustomUser.objects.create_user(
            f"diplomado-actor-{sequence}-{suffix}-{self._testMethodName}", password="x", role=role,
            ci=f"DA-{sequence}", ru=f"DAR-{sequence}",
        )

    def _asignar_comision(self, autoridad="VICERRECTOR_POSGRADO"):
        roles = ["DECANO_FACULTAD", autoridad, "TRIBUNAL", "TRIBUNAL"]
        orders = [None, None, 1, 2]
        return [
            AsignacionService.asignar_actor(
                self.post, self._crear_actor(index), role, self.admin, orden_cargo=order,
            )
            for index, (role, order) in enumerate(zip(roles, orders), start=1)
        ]

    def test_configuracion_actores_declara_cinco_posiciones_y_alternativa_opcional(self):
        configuration = DiplomadoPolicy().get_configuracion_actores(self.post)
        groups = configuration["grupos"]
        positions = [position for group in groups for position in group["posiciones"]]

        self.assertTrue(all(group["ambito"] == "POSTULACION" for group in groups))
        self.assertEqual(
            [position["clave"] for position in positions],
            [
                "DECANO_DIPLOMADO_1", "VICERRECTOR_POSGRADO_DIPLOMADO_1",
                "DIRECTOR_CARRERA_DIPLOMADO_1", "TRIBUNAL_DIPLOMADO_1",
                "TRIBUNAL_DIPLOMADO_2",
            ],
        )
        self.assertEqual([position["orden_cargo"] for position in positions], [None, None, None, 1, 2])
        required = {group["tipo_participacion"]: group["obligatoriedad"] for group in groups}
        self.assertEqual(required, {
            "DECANO_FACULTAD": True,
            "VICERRECTOR_POSGRADO": False,
            "DIRECTOR_CARRERA": False,
            "TRIBUNAL": True,
        })
        self.assertTrue(all(group["restriccion_identidad"] == {
            "grupo": "COMISION_DEFENSA_DIPLOMADO", "unica_persona": True,
        } for group in groups))

    def test_serializacion_proyecta_posiciones_unicas_y_permisos_por_usuario(self):
        admin_request = APIRequestFactory().get("/")
        admin_request.user = self.admin
        student_request = APIRequestFactory().get("/")
        student_request.user = self.student

        admin_positions = FlujoPostulacionSerializer(
            self.post, context={"request": admin_request},
        ).data["gestion_actores"]["posiciones"]
        student_positions = FlujoPostulacionSerializer(
            self.post, context={"request": student_request},
        ).data["gestion_actores"]["posiciones"]

        self.assertEqual(len(admin_positions), 5)
        self.assertEqual([item["orden_cargo"] for item in admin_positions if item["tipo_participacion"] == "TRIBUNAL"], [1, 2])
        self.assertTrue(all(item["acciones_permitidas"] == ["ASIGNAR"] for item in admin_positions))
        self.assertTrue(all(item["acciones_permitidas"] == [] for item in student_positions))
        self.assertTrue(all(item["ambito"] == "POSTULACION" for item in admin_positions))
        self.assertTrue(all(item["restriccion_identidad"] == {
            "grupo": "COMISION_DEFENSA_DIPLOMADO", "unica_persona": True,
        } for item in admin_positions))
        self.assertTrue(all(item["ocupacion_actor"] == {
            "aplica": True,
            "ambito": "POSTULACION",
            "motivo": "YA_TIENE_ASIGNACION_VIGENTE_EN_DEFENSA_DIPLOMADO",
            "relevantes": [
                "DECANO_FACULTAD", "VICERRECTOR_POSGRADO",
                "DIRECTOR_CARRERA", "TRIBUNAL",
            ],
        } for item in admin_positions))

    def test_ocupacion_impide_misma_persona_en_cargos_incompatibles(self):
        actor = self._crear_actor(1)
        AsignacionService.asignar_actor(self.post, actor, "DECANO_FACULTAD", self.admin)

        with self.assertRaisesMessage(ValidationError, "otra asignaci"):
            AsignacionService.asignar_actor(
                self.post, actor, "TRIBUNAL", self.admin, orden_cargo=1,
            )

    def test_tribunal_no_admite_orden_ocupado_pero_si_reemplazo_legitimo(self):
        original = AsignacionService.asignar_actor(
            self.post, self._crear_actor(1), "TRIBUNAL", self.admin, orden_cargo=1,
        )
        with self.assertRaisesMessage(ValidationError, "posici"):
            AsignacionService.asignar_actor(
                self.post, self._crear_actor(2), "TRIBUNAL", self.admin, orden_cargo=1,
            )

        replacement = AsignacionService.reemplazar_actor(
            original, self._crear_actor(3), self.admin,
        )

        original.refresh_from_db()
        self.assertFalse(original.activo)
        self.assertTrue(replacement.activo)
        self.assertEqual(replacement.orden_cargo, 1)
        self.assertEqual(self.post.asignaciones.filter(
            activo=True, tipo_participacion="TRIBUNAL", orden_cargo=1,
        ).count(), 1)

    def test_asignaciones_de_defensa_publica_rechazan_contexto_de_etapa(self):
        with self.assertRaisesMessage(ValidationError, "contexto de postulación"):
            AsignacionService.asignar_actor(
                self.post,
                self._crear_actor("etapa"),
                "TRIBUNAL",
                self.admin,
                orden_cargo=1,
                seguimiento_etapa=self.follow["DEFENSA_PUBLICA"],
            )

    def test_programacion_acepta_vicerrector_o_director_con_decano_y_dos_tribunales(self):
        stage = self.follow["DEFENSA_PUBLICA"]
        for autoridad in ("VICERRECTOR_POSGRADO", "DIRECTOR_CARRERA"):
            with self.subTest(autoridad=autoridad):
                self.post.asignaciones.update(activo=False)
                self._asignar_comision(autoridad)
                DiplomadoPolicy().evento_policy.validar_programacion(
                    seguimiento=stage,
                    asignaciones=self.post.asignaciones.filter(activo=True),
                )

    def test_programacion_acepta_vicerrector_y_director_simultaneamente(self):
        stage = self.follow["DEFENSA_PUBLICA"]
        self._asignar_comision()
        AsignacionService.asignar_actor(
            self.post, self._crear_actor("director"), "DIRECTOR_CARRERA", self.admin,
        )

        DiplomadoPolicy().evento_policy.validar_programacion(
            seguimiento=stage,
            asignaciones=self.post.asignaciones.filter(activo=True),
        )

    def test_programacion_rechaza_composiciones_incompletas(self):
        stage = self.follow["DEFENSA_PUBLICA"]
        policy = DiplomadoPolicy().evento_policy
        cases = (
            ("sin_decano", [("VICERRECTOR_POSGRADO", None), ("TRIBUNAL", 1), ("TRIBUNAL", 2)]),
            ("sin_autoridad_alternativa", [("DECANO_FACULTAD", None), ("TRIBUNAL", 1), ("TRIBUNAL", 2)]),
            ("un_solo_tribunal", [("DECANO_FACULTAD", None), ("VICERRECTOR_POSGRADO", None), ("TRIBUNAL", 1)]),
        )
        for label, composition in cases:
            with self.subTest(case=label):
                self.post.asignaciones.update(activo=False)
                for index, (role, order) in enumerate(composition, start=1):
                    AsignacionService.asignar_actor(
                        self.post, self._crear_actor(f"{label}-{index}"), role, self.admin,
                        orden_cargo=order,
                    )
                with self.assertRaises(ValidationError):
                    policy.validar_programacion(
                        seguimiento=stage,
                        asignaciones=self.post.asignaciones.filter(activo=True),
                    )

    def _crear_documento_inscripcion(self, codigo, estado="APR", requiere_correccion=False):
        documento = DocumentoPostulacion.objects.create(
            postulacion=self.post,
            tipo_documento=TipoDocumento.objects.get(codigo=codigo),
            estado=EstadoDocumento.objects.get(codigo=estado),
            requiere_correccion=requiere_correccion,
        )
        VersionDocumento.objects.create(
            documento=documento,
            subido_por=self.student,
            numero_version=1,
            archivo=SimpleUploadedFile(f"{codigo}.pdf", b"pdf"),
            nombre_original=f"{codigo}.pdf",
            tamano_bytes=3,
            hash_sha256=codigo.lower().ljust(64, "0")[:64],
            es_version_actual=True,
        )
        return documento

    def _orientacion_inscripcion(self):
        return DiplomadoPolicy().get_orientacion_etapa_actual(
            postulacion=self.post,
            seguimiento=self.follow["INSCRIPCION"],
        )

    def _iniciar_etapa_modulo(self, codigo="MODULO_1"):
        target = self.follow[codigo]
        self.post.seguimientos_etapa.filter(
            etapa__orden__lt=target.etapa.orden,
        ).update(estado="APROBADA")
        WorkflowService.iniciar_etapa(target, self.admin)
        target.refresh_from_db()
        return target

    def _orientacion(self, seguimiento):
        return DiplomadoPolicy().get_orientacion_etapa_actual(
            postulacion=self.post,
            seguimiento=seguimiento,
        )

    def _iniciar_revision_monografia(self):
        stage = self.follow["REVISION_MONOGRAFIA"]
        self.post.seguimientos_etapa.filter(
            etapa__orden__lt=stage.etapa.orden,
        ).update(estado="APROBADA")
        WorkflowService.iniciar_etapa(stage, self.admin)
        stage.refresh_from_db()
        return stage

    def _iniciar_defensa_publica(self):
        modules = DiplomadoService.ensure_modules(self.post)
        for module in modules:
            module.nota = Decimal("100.00")
            module.estado = module.Estado.APROBADO
            module.save()
        stage = self.follow["DEFENSA_PUBLICA"]
        self.post.seguimientos_etapa.filter(
            etapa__orden__lt=stage.etapa.orden,
        ).update(estado="APROBADA")
        WorkflowService.iniciar_etapa(stage, self.admin)
        stage.refresh_from_db()
        return stage

    def _crear_documentos_defensa(self, estado="APR", requiere_correccion=False):
        return [
            self._crear_documento_inscripcion(codigo, estado, requiere_correccion)
            for codigo in DOCUMENTS_BY_STAGE["DEFENSA_PUBLICA"]
        ]

    def _crear_evento_defensa(self, stage, estado=EventoDefensa.Estado.FINALIZADA):
        now = timezone.now()
        return EventoDefensa.objects.create(
            postulacion=self.post,
            seguimiento_etapa=stage,
            tipo_evento=EventoDefensa.Tipo.DEFENSA_PUBLICA,
            numero_intento=stage.numero_intento,
            estado=estado,
            fecha_programada=now,
            fecha_inicio_real=now if estado != EventoDefensa.Estado.PROGRAMADA else None,
            fecha_fin_real=now if estado == EventoDefensa.Estado.FINALIZADA else None,
            lugar="Aula de defensa",
            programado_por=self.admin,
            iniciado_por=self.admin if estado != EventoDefensa.Estado.PROGRAMADA else None,
            cerrado_por=self.admin if estado == EventoDefensa.Estado.FINALIZADA else None,
        )

    def _crear_resultado_consolidado(self, evento, nota):
        return EvaluacionDefensa.objects.create(
            evento=evento,
            tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL,
            modalidad_registro=EvaluacionDefensa.ModalidadRegistro.CONSENSO,
            nota_numerica=Decimal(str(nota)),
            ponderacion=Decimal("100.00"),
            aporte_ponderado=Decimal(str(nota)),
            es_resultado_final_evento=True,
            registrado_por=self.admin,
        )

    def test_orientacion_inscripcion_dirige_documentos_faltantes_a_documentos(self):
        orientacion = self._orientacion_inscripcion()

        self.assertEqual(len(orientacion["requisitos"]), 8)
        self.assertEqual(orientacion["requisitos_cumplidos"], 0)
        self.assertEqual(orientacion["requisitos_totales"], 8)
        self.assertTrue(all(item["cumplido"] is False for item in orientacion["requisitos"]))
        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")
        self.assertEqual(orientacion["siguiente_accion"]["titulo"], "Gestionar documentos")
        self.assertEqual(
            orientacion["siguiente_accion"]["descripcion"],
            "Completa los documentos requeridos para continuar con la inscripción.",
        )
        self.assertEqual(orientacion["siguiente_accion"]["destino"], "#documentos")

    def test_orientacion_inscripcion_refleja_progreso_parcial(self):
        aprobados = DOCUMENTS_BY_STAGE["INSCRIPCION"][:3]
        for codigo in aprobados:
            self._crear_documento_inscripcion(codigo)

        orientacion = self._orientacion_inscripcion()
        requisitos = {item["codigo"]: item for item in orientacion["requisitos"]}

        self.assertEqual(orientacion["requisitos_cumplidos"], 3)
        self.assertEqual(orientacion["requisitos_totales"], 8)
        self.assertTrue(all(requisitos[codigo]["cumplido"] for codigo in aprobados))
        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")

    def test_orientacion_inscripcion_documento_observado_solicita_correccion(self):
        codigo = DOCUMENTS_BY_STAGE["INSCRIPCION"][0]
        self._crear_documento_inscripcion(codigo, estado="OBS", requiere_correccion=True)

        orientacion = self._orientacion_inscripcion()
        requisito = next(item for item in orientacion["requisitos"] if item["codigo"] == codigo)

        self.assertEqual(requisito["estado"], "REQUIERE_CORRECCION")
        self.assertFalse(requisito["cumplido"])
        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")
        self.assertEqual(orientacion["siguiente_accion"]["titulo"], "Gestionar documentos")
        self.assertEqual(orientacion["siguiente_accion"]["destino"], "#documentos")

    def test_orientacion_inscripcion_documentos_enviados_esperan_revision(self):
        for codigo in DOCUMENTS_BY_STAGE["INSCRIPCION"]:
            self._crear_documento_inscripcion(codigo, estado="ENV")

        orientacion = self._orientacion_inscripcion()

        self.assertEqual(orientacion["requisitos_cumplidos"], 0)
        self.assertTrue(all(item["estado"] == "PENDIENTE_REVISION" for item in orientacion["requisitos"]))
        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "ESPERAR_REVISION_DOCUMENTOS")
        self.assertEqual(orientacion["siguiente_accion"]["titulo"], "Documentos pendientes de revisión")
        self.assertEqual(orientacion["siguiente_accion"]["destino"], "#documentos")

    def test_orientacion_inscripcion_aprobada_retira_bloqueo_documental(self):
        for codigo in DOCUMENTS_BY_STAGE["INSCRIPCION"]:
            self._crear_documento_inscripcion(codigo)

        orientacion = self._orientacion_inscripcion()

        self.assertEqual(orientacion["requisitos_cumplidos"], 8)
        self.assertEqual(orientacion["requisitos_totales"], 8)
        self.assertTrue(all(item["cumplido"] is True for item in orientacion["requisitos"]))
        self.assertIsNone(orientacion["siguiente_accion"])

        WorkflowService.iniciar_etapa(self.follow["INSCRIPCION"], self.admin)
        self.follow["INSCRIPCION"].refresh_from_db()
        orientacion = self._orientacion_inscripcion()

        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "APROBAR_ETAPA")
        self.assertNotEqual(orientacion["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")

    def test_orientacion_inscripcion_no_ofrece_aprobar_al_estudiante(self):
        for codigo in DOCUMENTS_BY_STAGE["INSCRIPCION"]:
            self._crear_documento_inscripcion(codigo)
        WorkflowService.iniciar_etapa(self.follow["INSCRIPCION"], self.admin)
        self.follow["INSCRIPCION"].refresh_from_db()
        request = APIRequestFactory().get("/")
        request.user = self.student

        orientacion = FlujoPostulacionSerializer(
            self.post,
            context={"request": request},
        ).data["orientacion_etapa_actual"]

        self.assertIsNone(orientacion["siguiente_accion"])
        self.assertEqual(orientacion["requisitos_cumplidos"], 8)
        self.assertEqual(orientacion["requisitos_totales"], 8)

    def test_orientacion_revision_monografia_faltante_dirige_a_documentos(self):
        stage = self._iniciar_revision_monografia()

        orientacion = self._orientacion(stage)

        self.assertEqual(orientacion["requisitos_cumplidos"], 0)
        self.assertEqual(orientacion["requisitos_totales"], 1)
        self.assertEqual(orientacion["requisitos"][0]["codigo"], "MONOGRAFIA_DIPLOMADO")
        self.assertEqual(orientacion["requisitos"][0]["nombre"], "Monografía de Diplomado")
        self.assertEqual(orientacion["requisitos"][0]["estado"], "NO_PRESENTADO")
        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")
        self.assertEqual(orientacion["siguiente_accion"]["destino"], "#documentos")

    def test_orientacion_revision_monografia_observada_solicita_correccion(self):
        stage = self._iniciar_revision_monografia()
        self._crear_documento_inscripcion(
            "MONOGRAFIA_DIPLOMADO",
            estado="OBS",
            requiere_correccion=True,
        )

        orientacion = self._orientacion(stage)

        self.assertEqual(orientacion["requisitos"][0]["estado"], "REQUIERE_CORRECCION")
        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")
        self.assertEqual(orientacion["siguiente_accion"]["destino"], "#documentos")

    def test_orientacion_revision_monografia_enviada_espera_revision(self):
        stage = self._iniciar_revision_monografia()
        self._crear_documento_inscripcion("MONOGRAFIA_DIPLOMADO", estado="ENV")

        orientacion = self._orientacion(stage)

        self.assertEqual(orientacion["requisitos"][0]["estado"], "PENDIENTE_REVISION")
        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "ESPERAR_REVISION_DOCUMENTOS")
        self.assertEqual(orientacion["siguiente_accion"]["destino"], "#documentos")

    def test_orientacion_revision_monografia_aprobada_habilita_transicion(self):
        stage = self._iniciar_revision_monografia()
        self._crear_documento_inscripcion("MONOGRAFIA_DIPLOMADO")

        orientacion = self._orientacion(stage)

        self.assertEqual(orientacion["requisitos_cumplidos"], 1)
        self.assertEqual(orientacion["requisitos_totales"], 1)
        self.assertTrue(orientacion["requisitos"][0]["cumplido"])
        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "APROBAR_ETAPA")
        self.assertIn("aprobar", WorkflowService.obtener_acciones_permitidas(stage))
        WorkflowService.aprobar_etapa(stage, self.admin)
        stage.refresh_from_db()
        self.assertEqual(stage.estado, "APROBADA")

    def test_orientacion_revision_monografia_no_ofrece_aprobar_al_estudiante(self):
        stage = self._iniciar_revision_monografia()
        self._crear_documento_inscripcion("MONOGRAFIA_DIPLOMADO")
        request = APIRequestFactory().get("/")
        request.user = self.student

        orientacion = FlujoPostulacionSerializer(
            self.post,
            context={"request": request},
        ).data["orientacion_etapa_actual"]

        self.assertIsNone(orientacion["siguiente_accion"])
        self.assertEqual(orientacion["requisitos_cumplidos"], 1)
        self.assertEqual(orientacion["requisitos_totales"], 1)

    def test_crea_exactamente_cinco_modulos_y_no_permite_sexto(self):
        modules = DiplomadoService.ensure_modules(self.post)
        self.assertEqual(len(modules), 5)
        self.assertEqual(modules[4].nombre, "Taller de Investigación")
        self._iniciar_etapa_modulo()
        with self.assertRaises(ValidationError):
            DiplomadoService.set_module_result(self.post, 6, 80, self.admin)

    def test_modulo_sin_nota_no_puede_aprobarse(self):
        stage = self._iniciar_etapa_modulo()

        with self.assertRaises(ValidationError):
            WorkflowService.aprobar_etapa(stage, self.admin)

    def test_nota_65_reprobar_y_bloquea_aprobacion(self):
        stage = self._iniciar_etapa_modulo()
        module = DiplomadoService.set_module_result(self.post, 1, Decimal("65"), self.admin)

        self.assertEqual(module.estado, DiplomadoModulo.Estado.REPROBADO)
        with self.assertRaises(ValidationError):
            WorkflowService.aprobar_etapa(stage, self.admin)

    def test_notas_66_y_100_aprueban_modulo(self):
        stage = self._iniciar_etapa_modulo()
        module = DiplomadoService.set_module_result(self.post, 1, Decimal("66"), self.admin)
        self.assertEqual(module.estado, DiplomadoModulo.Estado.APROBADO)
        WorkflowService.aprobar_etapa(stage, self.admin)
        stage.refresh_from_db()
        self.assertEqual(stage.estado, "APROBADA")

        stage_two = self._iniciar_etapa_modulo("MODULO_2")
        module = DiplomadoService.set_module_result(self.post, 2, Decimal("100"), self.admin)
        self.assertEqual(module.estado, DiplomadoModulo.Estado.APROBADO)
        WorkflowService.aprobar_etapa(stage_two, self.admin)

    def test_nota_fuera_de_rango_es_rechazada(self):
        self._iniciar_etapa_modulo()
        for note in (Decimal("-0.01"), Decimal("100.01")):
            with self.subTest(note=note), self.assertRaises(ValidationError):
                DiplomadoService.set_module_result(self.post, 1, note, self.admin)

    def test_no_permite_registrar_modulo_futuro(self):
        self._iniciar_etapa_modulo()

        with self.assertRaises(ValidationError):
            DiplomadoService.set_module_result(self.post, 2, 80, self.admin)

    def test_no_permite_registrar_modulo_de_etapa_cerrada(self):
        stage = self._iniciar_etapa_modulo()
        DiplomadoService.set_module_result(self.post, 1, 80, self.admin)
        WorkflowService.aprobar_etapa(stage, self.admin)
        self._iniciar_etapa_modulo("MODULO_2")

        with self.assertRaises(ValidationError):
            DiplomadoService.set_module_result(self.post, 1, 90, self.admin)

    def test_taller_corresponde_al_quinto_modulo(self):
        self._iniciar_etapa_modulo("TALLER_INVESTIGACION")

        with self.assertRaises(ValidationError):
            DiplomadoService.set_module_result(self.post, 4, 80, self.admin)
        module = DiplomadoService.set_module_result(self.post, 5, 80, self.admin)
        self.assertEqual(module.nombre, "Taller de Investigación")
        self.assertEqual(module.estado, DiplomadoModulo.Estado.APROBADO)

    def test_orientacion_modulo_pendiente_aprobado_y_reprobado(self):
        stage = self._iniciar_etapa_modulo()

        pending = self._orientacion(stage)
        self.assertEqual(pending["siguiente_accion"]["codigo"], "REGISTRAR_RESULTADO_MODULO")
        self.assertEqual(pending["siguiente_accion"]["destino"], "#diplomado")
        self.assertFalse(pending["requisitos"][0]["cumplido"])

        DiplomadoService.set_module_result(self.post, 1, 65, self.admin)
        failed = self._orientacion(stage)
        self.assertEqual(failed["requisitos"][0]["estado"], "REPROBADO")
        self.assertIn("65.00", failed["requisitos"][0]["estado_display"])
        self.assertEqual(failed["siguiente_accion"]["destino"], "#diplomado")

        DiplomadoService.set_module_result(self.post, 1, 66, self.admin)
        approved = self._orientacion(stage)
        self.assertTrue(approved["requisitos"][0]["cumplido"])
        self.assertEqual(approved["siguiente_accion"]["codigo"], "APROBAR_ETAPA")

    def test_api_modulo_exige_administrador(self):
        self._iniciar_etapa_modulo()
        view = DiplomadoOverviewView.as_view()
        student_request = APIRequestFactory().post(
            f"/api/v1/postulaciones/{self.post.pk}/diplomado/modulo/",
            {"modulo": 1, "nota": 66},
            format="json",
        )
        force_authenticate(student_request, user=self.student)
        student_response = view(student_request, pk=self.post.pk, action="modulo")
        self.assertEqual(student_response.status_code, 403)

        admin_request = APIRequestFactory().post(
            f"/api/v1/postulaciones/{self.post.pk}/diplomado/modulo/",
            {"modulo": 1, "nota": 66},
            format="json",
        )
        force_authenticate(admin_request, user=self.admin)
        admin_response = view(admin_request, pk=self.post.pk, action="modulo")
        self.assertEqual(admin_response.status_code, 201)

    def test_policy_de_defensa_conserva_nota_1_a_100_y_ponderacion_total(self):
        policy = DiplomadoPolicy().evaluacion_policy
        values = policy.get_valores_registro(evento=None, tipo="PUBLICA", nota=Decimal("95.00"))
        self.assertEqual(values, {"ponderacion": Decimal("100.00"), "aporte_ponderado": Decimal("95.00")})
        self.assertEqual(policy.get_semantica_nota(evento=None, tipo="PUBLICA"), "MODALIDAD_ESPECIFICA")

    def test_no_puede_iniciar_defensa_sin_cinco_modulos_aprobados(self):
        stage = self.follow["DEFENSA_PUBLICA"]
        with self.assertRaises(ValidationError):
            WorkflowService.iniciar_etapa(stage, self.admin)

    def test_orientacion_defensa_refleja_un_documento_aprobado_de_siete(self):
        stage = self._iniciar_defensa_publica()
        self._crear_documento_inscripcion("MONOGRAFIA_DIPLOMADO")

        orientacion = self._orientacion(stage)

        self.assertEqual(orientacion["requisitos_cumplidos"], 1)
        self.assertEqual(orientacion["requisitos_totales"], 7)
        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")
        self.assertEqual(orientacion["siguiente_accion"]["destino"], "#documentos")

    def test_orientacion_defensa_documentos_observados_y_rechazados_solicitan_correccion(self):
        stage = self._iniciar_defensa_publica()
        self._crear_documento_inscripcion(
            "CARTA_DEFENSA_DIPL", estado="OBS", requiere_correccion=True,
        )
        self._crear_documento_inscripcion("MONOGRAFIA_DIPLOMADO", estado="REC")

        orientacion = self._orientacion(stage)
        requisitos = {item["codigo"]: item for item in orientacion["requisitos"]}

        self.assertEqual(requisitos["CARTA_DEFENSA_DIPL"]["estado"], "REQUIERE_CORRECCION")
        self.assertFalse(requisitos["MONOGRAFIA_DIPLOMADO"]["cumplido"])
        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "COMPLETAR_DOCUMENTOS")
        self.assertEqual(orientacion["siguiente_accion"]["destino"], "#documentos")

    def test_orientacion_defensa_documentos_enviados_esperan_revision(self):
        stage = self._iniciar_defensa_publica()
        self._crear_documentos_defensa(estado="ENV")

        orientacion = self._orientacion(stage)

        self.assertEqual(orientacion["requisitos_totales"], 7)
        self.assertTrue(all(item["estado"] == "PENDIENTE_REVISION" for item in orientacion["requisitos"]))
        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "ESPERAR_REVISION_DOCUMENTOS")
        self.assertEqual(orientacion["siguiente_accion"]["destino"], "#documentos")

    def test_orientacion_defensa_documentos_aprobados_dirige_al_siguiente_bloqueo(self):
        stage = self._iniciar_defensa_publica()
        self._crear_documentos_defensa()

        orientacion = self._orientacion(stage)

        self.assertEqual(orientacion["requisitos_cumplidos"], 7)
        self.assertEqual(orientacion["requisitos_totales"], 7)
        self.assertTrue(all(item["cumplido"] for item in orientacion["requisitos"]))
        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "GESTIONAR_ACTORES")
        self.assertEqual(orientacion["siguiente_accion"]["destino"], "#actores")
        self.assertNotEqual(orientacion["siguiente_accion"]["destino"], "#resumen")

    def test_orientacion_defensa_finalizada_dirige_a_registrar_evaluacion(self):
        stage = self._iniciar_defensa_publica()
        self._crear_documentos_defensa()
        self._crear_evento_defensa(stage)

        orientacion = self._orientacion(stage)

        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "REGISTRAR_EVALUACION")
        self.assertEqual(orientacion["siguiente_accion"]["destino"], "#defensas")

    def test_aprobacion_manual_defensa_bloqueada_sin_evento(self):
        stage = self._iniciar_defensa_publica()
        self._crear_documentos_defensa()

        with self.assertRaisesMessage(ValidationError, "EVENTO_DEFENSA_PUBLICA"):
            WorkflowService.aprobar_etapa(stage, self.admin)

    def test_aprobacion_manual_defensa_bloqueada_sin_resultado_consolidado(self):
        stage = self._iniciar_defensa_publica()
        self._crear_documentos_defensa()
        self._crear_evento_defensa(stage)

        with self.assertRaisesMessage(ValidationError, "RESULTADO_FINAL_DEFENSA_PUBLICA"):
            WorkflowService.aprobar_etapa(stage, self.admin)

    def test_aprobacion_defensa_no_acepta_resultado_de_intento_anterior(self):
        stage = self._iniciar_defensa_publica()
        self._crear_documentos_defensa()
        evento = self._crear_evento_defensa(stage)
        self._crear_resultado_consolidado(evento, 90)
        stage.numero_intento = 2
        stage.save(update_fields=["numero_intento", "updated_at"])

        with self.assertRaisesMessage(ValidationError, "EVENTO_DEFENSA_PUBLICA"):
            WorkflowService.aprobar_etapa(stage, self.admin)

    def test_aprobacion_manual_defensa_bloqueada_con_resultado_reprobatorio(self):
        stage = self._iniciar_defensa_publica()
        self._crear_documentos_defensa()
        evento = self._crear_evento_defensa(stage)
        self._crear_resultado_consolidado(evento, 65)

        with self.assertRaisesMessage(ValidationError, "no es aprobatorio"):
            WorkflowService.aprobar_etapa(stage, self.admin)

    def test_aprobacion_defensa_admite_resultado_consolidado_aprobatorio(self):
        stage = self._iniciar_defensa_publica()
        self._crear_documentos_defensa()
        evento = self._crear_evento_defensa(stage)
        self._crear_resultado_consolidado(evento, 66)

        WorkflowService.aprobar_etapa(stage, self.admin)

        stage.refresh_from_db()
        self.assertEqual(stage.estado, "APROBADA")

    def test_consolidacion_aprobatoria_conserva_transicion_automatica(self):
        stage = self._iniciar_defensa_publica()
        self._crear_documentos_defensa()
        evento = self._crear_evento_defensa(stage)
        EvaluacionDefensa.objects.create(
            evento=evento,
            tipo_evaluacion=EvaluacionDefensa.Tipo.PUBLICA,
            modalidad_registro=EvaluacionDefensa.ModalidadRegistro.CONSENSO,
            nota_numerica=Decimal("90.00"),
            ponderacion=Decimal("100.00"),
            aporte_ponderado=Decimal("90.00"),
            registrado_por=self.admin,
        )

        EvaluacionDefensaService.consolidar_evaluacion_evento(evento, self.admin)

        stage.refresh_from_db()
        self.assertEqual(stage.estado, "APROBADA")
        self.assertTrue(evento.evaluaciones.filter(
            tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL,
            es_resultado_final_evento=True,
            nota_numerica=Decimal("90.00"),
        ).exists())

    def _crear_evaluacion_reprobatoria(self, evento, nota=Decimal("65.00")):
        return EvaluacionDefensa.objects.create(
            evento=evento,
            tipo_evaluacion=EvaluacionDefensa.Tipo.PUBLICA,
            modalidad_registro=EvaluacionDefensa.ModalidadRegistro.CONSENSO,
            nota_numerica=nota,
            ponderacion=Decimal("100.00"),
            aporte_ponderado=nota,
            registrado_por=self.admin,
        )

    def test_consolidacion_reprobatoria_sin_reintento_conserva_resultado_y_rechazo(self):
        stage = self._iniciar_defensa_publica()
        evento = self._crear_evento_defensa(stage)
        self._crear_evaluacion_reprobatoria(evento)

        resultado = EvaluacionDefensaService.consolidar_evaluacion_evento(evento, self.admin)

        stage.refresh_from_db()
        self.assertEqual(stage.estado, "RECHAZADA")
        self.assertTrue(resultado.es_resultado_final_evento)
        self.assertEqual(resultado._reintento["habilitado"], False)
        self.assertEqual(stage.postulacion.seguimientos_etapa.filter(
            etapa=stage.etapa,
        ).count(), 1)

    def test_consolidacion_reprobatoria_crea_reintento_cuando_esta_habilitado(self):
        stage = self._iniciar_defensa_publica()
        evento = self._crear_evento_defensa(stage)
        self._crear_evaluacion_reprobatoria(evento)
        DiplomadoDefensa.objects.create(
            postulacion=self.post,
            numero_intento=1,
            nota_consenso=Decimal("65.00"),
            resultado=DiplomadoDefensa.Resultado.REPROBADA,
            reintento_hasta=timezone.now() + timedelta(days=30),
        )

        with patch.object(
            WorkflowService,
            "crear_nuevo_intento",
            wraps=WorkflowService.crear_nuevo_intento,
        ) as crear_nuevo_intento:
            resultado = EvaluacionDefensaService.consolidar_evaluacion_evento(evento, self.admin)

        crear_nuevo_intento.assert_called_once()
        self.assertFalse(hasattr(resultado, "_reintento"))
        self.assertTrue(self.post.seguimientos_etapa.filter(
            etapa=stage.etapa,
            numero_intento=2,
            estado="PENDIENTE",
        ).exists())

    def test_error_inesperado_al_crear_reintento_revierte_consolidacion(self):
        stage = self._iniciar_defensa_publica()
        evento = self._crear_evento_defensa(stage)
        self._crear_evaluacion_reprobatoria(evento)

        with patch.object(
            WorkflowService,
            "crear_nuevo_intento",
            side_effect=ValidationError("fallo inesperado"),
        ), self.assertRaisesMessage(ValidationError, "fallo inesperado"):
            EvaluacionDefensaService.consolidar_evaluacion_evento(evento, self.admin)

        stage.refresh_from_db()
        self.assertEqual(stage.estado, "EN_PROCESO")
        self.assertFalse(evento.evaluaciones.filter(
            tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL,
        ).exists())

    def test_consolidacion_reprobatoria_es_idempotente(self):
        stage = self._iniciar_defensa_publica()
        evento = self._crear_evento_defensa(stage)
        self._crear_evaluacion_reprobatoria(evento)
        EvaluacionDefensaService.consolidar_evaluacion_evento(evento, self.admin)

        with self.assertRaisesMessage(ValidationError, "ya tiene una evaluaci"):
            EvaluacionDefensaService.consolidar_evaluacion_evento(evento, self.admin)

        self.assertEqual(evento.evaluaciones.filter(
            tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL,
        ).count(), 1)
        self.assertEqual(self.post.seguimientos_etapa.filter(etapa=stage.etapa).count(), 1)

    def test_api_consolidacion_informa_reintento_no_habilitado(self):
        stage = self._iniciar_defensa_publica()
        evento = self._crear_evento_defensa(stage)
        self._crear_evaluacion_reprobatoria(evento)
        request = APIRequestFactory().post(
            f"/api/v1/eventos-defensa/{evento.pk}/evaluaciones/consolidar/",
            {},
            format="json",
        )
        force_authenticate(request, user=self.admin)
        response = EventoDefensaViewSet.as_view({"post": "consolidar"})(
            request, pk=evento.pk,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["reintento"]["creado"], False)
        self.assertEqual(response.data["reintento"]["habilitado"], False)
        self.assertIn("30 d", response.data["reintento"]["motivo"])

    def test_orientacion_defensa_no_expone_aprobacion_manual_al_estudiante(self):
        stage = self._iniciar_defensa_publica()
        self._crear_documentos_defensa()
        request = APIRequestFactory().get("/")
        request.user = self.student

        orientacion = FlujoPostulacionSerializer(
            self.post,
            context={"request": request},
        ).data["orientacion_etapa_actual"]

        self.assertEqual(orientacion["siguiente_accion"]["codigo"], "GESTIONAR_ACTORES")
        self.assertNotEqual(orientacion["siguiente_accion"]["codigo"], "APROBAR_ETAPA")

    def test_overview_expone_horas_creditos_y_modulos(self):
        data = DiplomadoService.overview(self.post)
        self.assertEqual(len(data["modulos"]), 5)
        self.assertEqual(data["reglas"]["horas_totales"], 800)
        self.assertEqual(data["reglas"]["creditos"], 20)
        self.assertEqual(data["reglas"]["reintento_dias"], 30)
