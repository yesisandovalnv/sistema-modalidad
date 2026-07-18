from uuid import uuid4
from django.core.exceptions import PermissionDenied
from django.test import TestCase
from apps.notificaciones.events import DomainEvent,EventTypes
from apps.notificaciones.models import Notificacion
from apps.notificaciones.services import NotificationService
from apps.usuarios.models import AuditLog,CustomUser


class NotificationServiceTests(TestCase):
    def setUp(self): self.u=CustomUser.objects.create_user(username="notif-u"); self.v=CustomUser.objects.create_user(username="notif-v")
    def kwargs(self,key="k1"): return dict(tipo="TEST",titulo="T",mensaje="M",nivel="INFO",event_id=uuid4(),deduplication_key=key,aggregate_type="X",aggregate_id="1")
    def test_crear_individual_idempotente(self):
        a,c=NotificationService.crear_notificacion(destinatario=self.u,**self.kwargs()); b,c2=NotificationService.crear_notificacion(destinatario=self.u,**self.kwargs())
        self.assertTrue(c); self.assertFalse(c2); self.assertEqual(a.pk,b.pk)
    def test_crear_varios_elimina_duplicados(self):
        result=NotificationService.crear_para_usuarios([self.u,self.u,self.v],**self.kwargs()); self.assertEqual(len(result["creadas"]),2)
    def test_omite_inactivo(self):
        self.v.is_active=False; self.v.save(); result=NotificationService.crear_para_usuarios([self.u,self.v],**self.kwargs()); self.assertEqual(result["omitidos"],[self.v.pk])
    def test_marcar_leida_y_no_leida(self):
        n,_=NotificationService.crear_notificacion(destinatario=self.u,**self.kwargs()); NotificationService.marcar_leida(n,self.u); n.refresh_from_db(); self.assertTrue(n.leida)
        NotificationService.marcar_no_leida(n,self.u); n.refresh_from_db(); self.assertFalse(n.leida)
    def test_usuario_no_modifica_ajena(self):
        n,_=NotificationService.crear_notificacion(destinatario=self.u,**self.kwargs())
        with self.assertRaises(PermissionDenied): NotificationService.marcar_leida(n,self.v)
    def test_marcar_todas_y_contador(self):
        for i in range(3): NotificationService.crear_notificacion(destinatario=self.u,**self.kwargs(str(i)))
        self.assertEqual(NotificationService.contar_no_leidas(self.u),3); self.assertEqual(NotificationService.marcar_todas_leidas(self.u),3); self.assertEqual(NotificationService.contar_no_leidas(self.u),0)
    def test_lectura_audita_una_vez(self):
        n,_=NotificationService.crear_notificacion(destinatario=self.u,**self.kwargs()); NotificationService.marcar_leida(n,self.u); NotificationService.marcar_leida(n,self.u)
        self.assertEqual(AuditLog.objects.filter(accion="MARK_NOTIFICATION_READ").count(),1)

