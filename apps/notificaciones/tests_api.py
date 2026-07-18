from uuid import uuid4
from django.urls import reverse
from rest_framework.test import APITestCase
from apps.notificaciones.models import Notificacion
from apps.usuarios.models import AuditLog,CustomUser


class NotificationApiTests(APITestCase):
    def setUp(self):
        self.u=CustomUser.objects.create_user(username="api-notif"); self.v=CustomUser.objects.create_user(username="api-notif-v")
        self.n=self.make(self.u,"A"); self.make(self.v,"B"); self.client.force_authenticate(self.u)
    def make(self,user,key): return Notificacion.objects.create(destinatario=user,tipo="TEST",titulo="T",mensaje="M",nivel="INFO",event_id=uuid4(),deduplication_key=key,aggregate_type="X",aggregate_id="1")
    def test_lista_solo_propias(self):
        r=self.client.get("/api/v1/notificaciones/"); self.assertEqual(r.status_code,200); self.assertEqual(r.data["count"],1)
    def test_detalle_ajeno_404(self): self.assertEqual(self.client.get(f"/api/v1/notificaciones/{Notificacion.objects.get(destinatario=self.v).pk}/").status_code,404)
    def test_contador(self): self.assertEqual(self.client.get("/api/v1/notificaciones/no-leidas/count/").data["count"],1)
    def test_marcar_leida_no_leida(self):
        self.assertEqual(self.client.post(f"/api/v1/notificaciones/{self.n.pk}/marcar-leida/").status_code,200)
        self.assertEqual(self.client.post(f"/api/v1/notificaciones/{self.n.pk}/marcar-no-leida/").status_code,200)
    def test_marcar_todas(self): self.assertEqual(self.client.post("/api/v1/notificaciones/marcar-todas-leidas/").data["actualizadas"],1)
    def test_filtros(self): self.assertEqual(self.client.get("/api/v1/notificaciones/?leida=false&tipo=TEST&nivel=INFO").data["count"],1)
    def test_metodos_escritura_no_disponibles(self):
        self.assertEqual(self.client.post("/api/v1/notificaciones/",{}).status_code,405); self.assertEqual(self.client.patch(f"/api/v1/notificaciones/{self.n.pk}/",{}).status_code,405); self.assertEqual(self.client.delete(f"/api/v1/notificaciones/{self.n.pk}/").status_code,405)
    def test_anonimo_401(self): self.client.force_authenticate(None); self.assertEqual(self.client.get("/api/v1/notificaciones/").status_code,401)
    def test_get_no_audita(self): self.client.get("/api/v1/notificaciones/"); self.assertFalse(AuditLog.objects.filter(modulo="NOTIFICACIONES").exists())

