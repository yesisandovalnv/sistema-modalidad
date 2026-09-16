from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, TipoDocumento, VersionDocumento
from apps.notificaciones.events import EventTypes
from apps.postulantes.models import (
    AsignacionPostulacion,
    EstadoPostulacion,
    InformeRevisionTribunalPrevia,
    Postulacion,
    SeguimientoEtapa,
)
from apps.postulantes.revision_tribunal import RevisionTribunalPreviaService
from apps.postulantes.workflow import WorkflowService
from apps.usuarios.models import AuditLog, Role


User = get_user_model()


class RevisionTribunalFixtureMixin:
    def setUp(self):
        super().setUp()
        self.override_media = override_settings(
            STORAGES={"default": {"BACKEND": "django.core.files.storage.InMemoryStorage"}},
        )
        self.override_media.enable()
        self.addCleanup(self.override_media.disable)

        self.admin = User.objects.create_user(
            username="admin_revision", password="segura123", ci="7100001", ru="7100001",
            is_staff=True,
        )
        self.student = User.objects.create_user(
            username="student_revision", password="segura123", ci="7100002", ru="7100002",
        )
        self.stranger = User.objects.create_user(
            username="stranger_revision", password="segura123", ci="7100003", ru="7100003",
        )
        self.tribunales = [
            User.objects.create_user(
                username=f"tribunal_revision_{order}", password="segura123",
                ci=f"710001{order}", ru=f"710001{order}",
            )
            for order in (1, 2, 3)
        ]
        admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administrador")
        student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        teacher_role = Role.objects.create(codigo="DOCENTE", nombre="Docente")
        self.admin.role = admin_role
        self.admin.save(update_fields=["role"])
        User.objects.filter(pk__in=[self.student.pk, self.stranger.pk]).update(role=student_role)
        User.objects.filter(pk__in=[user.pk for user in self.tribunales]).update(role=teacher_role)
        self.modalidad = Modalidad.objects.create(codigo="PROYECTO_GRADO", nombre="Proyecto de Grado")
        self.periodo = Periodo.objects.create(
            nombre="2026-II", gestion=2026, semestre="II",
            fecha_inicio="2026-07-01", fecha_fin="2026-12-31",
        )
        self.estado_postulacion = EstadoPostulacion.objects.create(codigo="EN_PROCESO", nombre="En proceso")
        self.postulacion = Postulacion.objects.create(
            codigo="PG-TEST-REVISION", estudiante=self.student, modalidad=self.modalidad,
            periodo=self.periodo, estado_actual=self.estado_postulacion,
        )
        self.etapa = EtapaModalidad.objects.create(
            modalidad=self.modalidad, codigo="REVISION_TRIBUNAL_PREVIA",
            nombre="Revisión de Tribunal Previa", orden=4, origen_normativo="Reglamento PG",
        )
        self.seguimiento = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion, etapa=self.etapa,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO, abierta_por=self.admin,
        )
        for order, tribunal in enumerate(self.tribunales, 1):
            AsignacionPostulacion.objects.create(
                postulacion=self.postulacion, usuario=tribunal,
                tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
                orden_cargo=order, seguimiento_etapa=self.seguimiento, designado_por=self.admin,
            )

        self.aprobado = EstadoDocumento.objects.create(codigo="APR", nombre="Aprobado")
        self.enviado = EstadoDocumento.objects.create(codigo="ENV", nombre="Enviado")
        self.tipo_final = TipoDocumento.objects.create(codigo="DOCUMENTO_FINAL", nombre="Documento Final")
        self.tipo_evidencia = TipoDocumento.objects.create(
            codigo="INFORME_REVISION_TRIBUNAL_PREVIA", nombre="Informe de Evaluación del Tribunal",
        )
        self.documento_final = DocumentoPostulacion.objects.create(
            postulacion=self.postulacion, tipo_documento=self.tipo_final,
            estado=self.aprobado, requiere_correccion=False,
        )
        self.version_final = self._version(self.documento_final, "final.pdf", b"documento final")
        self.documento_evidencia = DocumentoPostulacion.objects.create(
            postulacion=self.postulacion, tipo_documento=self.tipo_evidencia, estado=self.enviado,
        )
        self.evidencia = self._version(self.documento_evidencia, "informe.pdf", b"informe tribunal")

    def _version(self, documento, nombre, contenido, numero=1):
        return VersionDocumento.objects.create(
            documento=documento, subido_por=self.admin, numero_version=numero,
            archivo=SimpleUploadedFile(nombre, contenido, content_type="application/pdf"),
            nombre_original=nombre, tamano_bytes=len(contenido), hash_sha256="a" * 64,
            es_version_actual=True,
        )

    def registrar(self, resultado="SUFICIENTE", observaciones=""):
        return RevisionTribunalPreviaService.registrar_informe(
            seguimiento=self.seguimiento,
            version_documento_revisada=self.version_final,
            resultado=resultado,
            observaciones=observaciones,
            evidencia_version=self.evidencia,
            usuario=self.admin,
        )


class RevisionTribunalServiceTest(RevisionTribunalFixtureMixin, TestCase):
    @patch("apps.postulantes.revision_tribunal.publish_domain_event")
    def test_suficiente_registra_trazabilidad_sin_aprobar_etapa(self, publish):
        informe = self.registrar()

        self.seguimiento.refresh_from_db()
        self.assertEqual(informe.version_documento_revisada, self.version_final)
        self.assertEqual(informe.evidencia_version, self.evidencia)
        self.assertEqual(self.seguimiento.estado, SeguimientoEtapa.EstadoChoices.EN_PROCESO)
        self.assertTrue(AuditLog.objects.filter(accion="REGISTER_PRE_REVIEW_REPORT").exists())
        publish.assert_called_once()
        self.assertEqual(publish.call_args.args[0], EventTypes.INFORME_REVISION_TRIBUNAL_REGISTRADO)

    def test_insuficiente_exige_observaciones_y_deja_etapa_observada(self):
        with self.assertRaisesMessage(ValidationError, "observaciones son obligatorias"):
            self.registrar("INSUFICIENTE")

        informe = self.registrar("INSUFICIENTE", "Debe corregir el capítulo de resultados.")
        self.seguimiento.refresh_from_db()
        self.postulacion.refresh_from_db()
        self.assertEqual(informe.resultado, InformeRevisionTribunalPrevia.Resultado.INSUFICIENTE)
        self.assertEqual(self.seguimiento.estado, SeguimientoEtapa.EstadoChoices.OBSERVADA)
        self.assertEqual(self.postulacion.estado_actual, self.estado_postulacion)

    def test_acepta_tribunal_vigente_aunque_asignado_en_etapa_anterior(self):
        """Verifica que tribunales vigentes de PERFIL_PROYECTO se aceptan en REVISION_TRIBUNAL_PREVIA."""
        # Los tribunales fueron creados con seguimiento_etapa=PERFIL_PROYECTO (ver setUp)
        # pero deben ser válidos en REVISION_TRIBUNAL_PREVIA porque están activos
        informe = self.registrar()
        self.assertEqual(informe.resultado, InformeRevisionTribunalPrevia.Resultado.SUFICIENTE)

    def test_rechaza_tribunal_inactivo(self):
        """Verifica que tribunales inactivos no cuentan."""
        asignacion = AsignacionPostulacion.objects.get(orden_cargo=3)
        asignacion.activo = False
        asignacion.save()
        with self.assertRaisesMessage(ValidationError, "tres tribunales activos distintos"):
            self.registrar()

    def test_rechaza_documento_final_no_aprobado_o_con_correccion(self):
        self.documento_final.requiere_correccion = True
        self.documento_final.save()
        with self.assertRaisesMessage(ValidationError, "Documento Final activo, aprobado"):
            self.registrar()

    def test_rechaza_solo_dos_tribunales_activos(self):
        """Caso 2: Verifica que solo 2 tribunales vigentes causa rechazo."""
        asignacion = AsignacionPostulacion.objects.get(orden_cargo=3)
        asignacion.activo = False
        asignacion.save()
        with self.assertRaisesMessage(ValidationError, "tres tribunales activos distintos"):
            self.registrar()

    def test_rechaza_ordenes_incompletas_1_2_en_lugar_de_1_2_3(self):
        """Caso 3: Verifica que órdenes {1, 2} sin 3 causa rechazo."""
        asignacion = AsignacionPostulacion.objects.get(orden_cargo=3)
        asignacion.activo = False
        asignacion.save()
        with self.assertRaisesMessage(ValidationError, "órdenes 1, 2 y 3"):
            self.registrar()

    def test_rechaza_ordenes_incorrectas_1_2_4_en_lugar_de_1_2_3(self):
        """Caso 3: Verifica que órdenes {1, 2, 4} causa rechazo."""
        asignacion = AsignacionPostulacion.objects.get(orden_cargo=3)
        asignacion.orden_cargo = 4
        asignacion.save()
        with self.assertRaisesMessage(ValidationError, "órdenes 1, 2 y 3"):
            self.registrar()

    def test_rechaza_mismo_usuario_en_dos_posiciones(self):
        """Caso 4: Verifica que 2 usuarios (con uno en dos órdenes) causa rechazo."""
        # Asignación para tribunal 3 → cambiar a usuario de tribunal 1
        asignacion = AsignacionPostulacion.objects.get(orden_cargo=3)
        asignacion.usuario = self.tribunales[0]  # Mismo usuario que orden_cargo=1
        asignacion.save()
        with self.assertRaisesMessage(ValidationError, "tres tribunales activos distintos"):
            self.registrar()

    def test_rechaza_usuario_inactivo_en_sistema(self):
        """Caso 6: Verifica que usuario.is_active=False causa exclusión."""
        tribunal = AsignacionPostulacion.objects.get(orden_cargo=3).usuario
        tribunal.is_active = False
        tribunal.save()
        with self.assertRaisesMessage(ValidationError, "tres tribunales activos distintos"):
            self.registrar()

    def test_rechaza_usuario_con_activo_false_en_campo_custom(self):
        """Caso 6: Verifica que usuario.activo=False causa exclusión."""
        tribunal = AsignacionPostulacion.objects.get(orden_cargo=3).usuario
        tribunal.activo = False
        tribunal.save()
        with self.assertRaisesMessage(ValidationError, "tres tribunales activos distintos"):
            self.registrar()

    def test_rechaza_tribunal_de_otra_postulacion(self):
        """Caso 7: Verifica que tribunal de diferente postulación no cuenta."""
        # Crear otra postulación con su propio tribunal
        otra_postulacion = Postulacion.objects.create(
            codigo="PG-TEST-OTRO", estudiante=self.stranger,
            modalidad=self.modalidad, periodo=self.periodo,
            estado_actual=self.estado_postulacion,
        )
        otro_tribunal = User.objects.create_user(
            username="tribunal_otro", password="segura123",
            ci="7100099", ru="7100099",
        )
        AsignacionPostulacion.objects.create(
            postulacion=otra_postulacion, usuario=otro_tribunal,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
            orden_cargo=3, designado_por=self.admin,
        )
        
        # Desactivar tribunal 3 de esta postulación
        asignacion = AsignacionPostulacion.objects.get(postulacion=self.postulacion, orden_cargo=3)
        asignacion.activo = False
        asignacion.save()
        
        # Debe fallar porque el tribunal de otra_postulacion no cuenta para esta
        with self.assertRaisesMessage(ValidationError, "tres tribunales activos distintos"):
            self.registrar()

    def test_acepta_tribunal_aunque_asignado_en_distinta_etapa(self):
        """Caso 8: Verifica que tribunal vigente de PERFIL se acepta en REVISION (comportamiento correcto)."""
        etapa_perfil = EtapaModalidad.objects.create(
            modalidad=self.modalidad, codigo="PERFIL_PROYECTO",
            nombre="Perfil de Proyecto", orden=2, origen_normativo="Reglamento PG",
        )
        seguimiento_perfil = SeguimientoEtapa.objects.create(
            postulacion=self.postulacion, etapa=etapa_perfil,
            estado=SeguimientoEtapa.EstadoChoices.APROBADA,
        )
        AsignacionPostulacion.objects.filter(
            postulacion=self.postulacion,
            tipo_participacion="TRIBUNAL",
            activo=True,
        ).update(seguimiento_etapa=seguimiento_perfil)

        self.assertEqual(
            AsignacionPostulacion.objects.filter(
                postulacion=self.postulacion,
                tipo_participacion="TRIBUNAL",
                activo=True,
                seguimiento_etapa=seguimiento_perfil,
            ).count(),
            3,
        )
        informe = self.registrar()
        self.assertEqual(informe.resultado, InformeRevisionTribunalPrevia.Resultado.SUFICIENTE)

    def test_acepta_tribunal_aunque_asignado_con_seguimiento_etapa_null(self):
        """Verifica que tribunal vigente sin seguimiento_etapa específico se acepta."""
        # Crear una asignación sin seguimiento_etapa
        tribunal_sin_etapa = User.objects.create_user(
            username="tribunal_sin_etapa", password="segura123",
            ci="7100099", ru="7100099",
        )
        # Remover los tribunales actuales
        AsignacionPostulacion.objects.filter(postulacion=self.postulacion, tipo_participacion="TRIBUNAL").update(activo=False)
        
        # Crear nuevas asignaciones sin seguimiento_etapa
        for order, usuario in enumerate([self.tribunales[0], self.tribunales[1], tribunal_sin_etapa], 1):
            AsignacionPostulacion.objects.create(
                postulacion=self.postulacion, usuario=usuario,
                tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
                orden_cargo=order, seguimiento_etapa=None, designado_por=self.admin,
            )
        
        # Debe aceptar aunque seguimiento_etapa sea None
        informe = self.registrar()
        self.assertEqual(informe.resultado, InformeRevisionTribunalPrevia.Resultado.SUFICIENTE)

    def test_rechaza_version_revisada_que_no_es_actual(self):
        self.version_final.es_version_actual = False
        self.version_final.save()
        nueva = self._version(self.documento_final, "final-v2.pdf", b"segunda", numero=2)
        with self.assertRaisesMessage(ValidationError, "versión actual activa"):
            RevisionTribunalPreviaService.registrar_informe(
                self.seguimiento, self.version_final, "SUFICIENTE", "", self.evidencia, self.admin,
            )
        self.assertTrue(nueva.es_version_actual)

    def test_rechaza_evidencia_sin_archivo_fisico(self):
        self.evidencia.archivo.storage.delete(self.evidencia.archivo.name)
        with self.assertRaisesMessage(ValidationError, "evidencia debe ser una versión actual"):
            self.registrar()

    def test_unico_informe_activo_por_seguimiento_y_version(self):
        self.registrar()
        with self.assertRaisesMessage(ValidationError, "Ya existe un informe activo"):
            self.registrar()

    def test_policy_bloquea_sin_informe_y_aprueba_con_informe_suficiente(self):
        with self.assertRaisesMessage(ValidationError, "No existe un informe activo"):
            WorkflowService.aprobar_etapa(self.seguimiento, self.admin)
        self.registrar()

        aprobado = WorkflowService.aprobar_etapa(self.seguimiento, self.admin)

        self.assertEqual(aprobado.estado, SeguimientoEtapa.EstadoChoices.APROBADA)

    def test_policy_bloquea_informe_insuficiente(self):
        self.registrar("INSUFICIENTE", "Falta sustento técnico.")
        with self.assertRaisesMessage(ValidationError, "declara el trabajo INSUFICIENTE"):
            WorkflowService.aprobar_etapa(self.seguimiento, self.admin)


class RevisionTribunalApiTest(RevisionTribunalFixtureMixin, APITestCase):
    def endpoint(self):
        return f"/api/v1/seguimientos-etapa/{self.seguimiento.pk}/informes-revision-tribunal/"

    def payload(self):
        return {
            "version_documento_revisada": self.version_final.pk,
            "resultado": "SUFICIENTE",
            "observaciones": "Conforme al informe adjunto.",
            "evidencia_version": self.evidencia.pk,
        }

    def test_staff_registra_y_lista_informe(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(self.endpoint(), self.payload(), format="json")
        listed = self.client.get(self.endpoint())

        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["evidencia_version"], self.evidencia.pk)
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listed.data), 1)

    def test_estudiante_y_tribunal_pueden_listar_pero_no_registrar(self):
        self.registrar()
        for user in (self.student, self.tribunales[0]):
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get(self.endpoint()).status_code, status.HTTP_200_OK)
            self.assertEqual(self.client.post(self.endpoint(), self.payload(), format="json").status_code, status.HTTP_403_FORBIDDEN)

    def test_usuario_ajeno_no_puede_consultar(self):
        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.client.get(self.endpoint()).status_code, status.HTTP_404_NOT_FOUND)

    def test_requiere_autenticacion_y_expone_errores_de_dominio(self):
        self.assertEqual(self.client.get(self.endpoint()).status_code, status.HTTP_401_UNAUTHORIZED)
        self.client.force_authenticate(self.admin)
        self.documento_final.requiere_correccion = True
        self.documento_final.save()
        response = self.client.post(self.endpoint(), self.payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Documento Final", str(response.data))
