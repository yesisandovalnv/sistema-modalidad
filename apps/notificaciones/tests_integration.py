from django.db import transaction
from django.test import TestCase,TransactionTestCase
from apps.academico.models import Modalidad,Periodo,EtapaModalidad
from apps.documentos.models import DocumentoPostulacion,EstadoDocumento,TipoDocumento,VersionDocumento
from apps.notificaciones.events import EventTypes,build_event,DomainEventPublisher
from apps.notificaciones.models import Notificacion
from apps.postulantes.complementarios import EntregaFisicaService
from apps.postulantes.models import EntregaFisica,EstadoPostulacion,Postulacion,SeguimientoEtapa,AsignacionPostulacion
from apps.postulantes.workflow import WorkflowService
from apps.usuarios.models import CustomUser


class IntegrationTests(TestCase):
    def setUp(self):
        self.actor=CustomUser.objects.create_user(username="notif-actor",is_staff=True); self.student=CustomUser.objects.create_user(username="notif-student"); self.tutor=CustomUser.objects.create_user(username="notif-tutor")
        mod=Modalidad.objects.create(codigo="PROYECTO_GRADO",nombre="PG notif"); period=Periodo.objects.create(nombre="N-2026",gestion=2026,semestre="I",fecha_inicio="2026-01-01",fecha_fin="2026-12-31"); state=EstadoPostulacion.objects.create(codigo="NREG",nombre="N reg")
        self.post=Postulacion.objects.create(codigo="N-P",estudiante=self.student,modalidad=mod,periodo=period,estado_actual=state)
        stage=EtapaModalidad.objects.create(modalidad=mod,codigo="INSCRIPCION",nombre="Inscripción",orden=1,origen_normativo="Norma")
        self.follow=SeguimientoEtapa.objects.create(postulacion=self.post,etapa=stage,estado="EN_PROCESO")
        AsignacionPostulacion.objects.create(postulacion=self.post,usuario=self.tutor,tipo_participacion="TUTOR",designado_por=self.actor)
    def _complete_inscription_requirements(self):
        required_types = (
            ("CARTA_SOLICITUD_PROYECTO", "Carta de Solicitud de Proyecto de Grado"),
            ("MATRICULA_VIGENTE", "Comprobante de Matrícula Vigente"),
            ("HISTORIAL_PRERREQ", "Historial Académico de Prerrequisitos"),
        )
        approved, _ = EstadoDocumento.objects.get_or_create(
            codigo="APR",
            defaults={"nombre": "Aprobado"},
        )
        for index, (codigo, nombre) in enumerate(required_types, start=1):
            document_type, _ = TipoDocumento.objects.get_or_create(
                codigo=codigo,
                defaults={"nombre": nombre},
            )
            document = DocumentoPostulacion.objects.create(
                postulacion=self.post,
                tipo_documento=document_type,
                estado=approved,
            )
            VersionDocumento.objects.create(
                documento=document,
                subido_por=self.student,
                numero_version=1,
                archivo=f"tests/{codigo.lower()}.pdf",
                nombre_original=f"{codigo.lower()}.pdf",
                tamano_bytes=1,
                hash_sha256=str(index).zfill(64),
                es_version_actual=True,
            )
        folder = EntregaFisicaService.crear(
            self.post,
            EntregaFisica.Tipo.FOLDER_AMARILLO,
            "Fólder amarillo",
            self.actor,
            cantidad=1,
        )
        EntregaFisicaService.registrar_entrega(folder, 1, self.actor)
    def test_aprobar_etapa_notifica_despues_commit(self):
        self._complete_inscription_requirements()
        with self.captureOnCommitCallbacks(execute=False) as callbacks: WorkflowService.aprobar_etapa(self.follow,self.actor)
        self.assertEqual(Notificacion.objects.count(),0); self.assertTrue(callbacks); callbacks[0](); self.assertEqual(set(Notificacion.objects.values_list("destinatario_id",flat=True)),{self.student.pk,self.tutor.pk})
    def test_rechazar_etapa_notifica(self):
        with self.captureOnCommitCallbacks(execute=True): WorkflowService.rechazar_etapa(self.follow,self.actor)
        self.assertTrue(Notificacion.objects.filter(tipo=EventTypes.ETAPA_RECHAZADA,destinatario=self.student).exists())
    def test_consulta_no_notifica(self): WorkflowService.obtener_seguimientos_ordenados(self.post); self.assertFalse(Notificacion.objects.exists())
    def test_evento_reintentado_no_duplica(self):
        event=build_event(EventTypes.ETAPA_APROBADA,self.follow,self.actor,self.post,{"etapa":"Inscripción"},"stable")
        DomainEventPublisher.publish(event); DomainEventPublisher.publish(event); self.assertEqual(Notificacion.objects.filter(destinatario=self.student).count(),1)
    def test_estudiante_ajeno_no_recibe(self):
        stranger=CustomUser.objects.create_user(username="notif-stranger"); event=build_event(EventTypes.ETAPA_APROBADA,self.follow,self.actor,self.post,{"etapa":"Inscripción"},"own")
        DomainEventPublisher.publish(event); self.assertFalse(Notificacion.objects.filter(destinatario=stranger).exists())
    def test_rollback_no_publica_evento(self):
        event=build_event(EventTypes.ETAPA_APROBADA,self.follow,self.actor,self.post,{"etapa":"Inscripción"},"rollback")
        with self.captureOnCommitCallbacks(execute=True):
            try:
                with transaction.atomic():
                    DomainEventPublisher.publish_after_commit(event)
                    raise ValueError("rollback")
            except ValueError: pass
        self.assertFalse(Notificacion.objects.filter(deduplication_key="rollback").exists())
