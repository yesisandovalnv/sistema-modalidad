from uuid import uuid4
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone
from apps.notificaciones.models import Notificacion
from apps.usuarios.models import CustomUser


class NotificacionModelTests(TestCase):
    def setUp(self): self.user=CustomUser.objects.create_user(username="notif-model")
    def data(self,**extra):
        data=dict(destinatario=self.user,tipo="TEST",titulo="Título",mensaje="Mensaje",event_id=uuid4(),deduplication_key="test:1",aggregate_type="Test",aggregate_id="1")
        data.update(extra); return data
    def test_creacion_valida(self): self.assertEqual(Notificacion.objects.create(**self.data()).nivel,"INFO")
    def test_titulo_obligatorio(self):
        with self.assertRaises(ValidationError): Notificacion.objects.create(**self.data(titulo=""))
    def test_mensaje_obligatorio(self):
        with self.assertRaises(ValidationError): Notificacion.objects.create(**self.data(mensaje=""))
    def test_destinatario_activo(self):
        self.user.is_active=False; self.user.save()
        with self.assertRaises(ValidationError): Notificacion.objects.create(**self.data())
    def test_fecha_lectura_coherente(self):
        with self.assertRaises(ValidationError): Notificacion.objects.create(**self.data(fecha_lectura=timezone.now()))
    def test_metadata_json(self):
        with self.assertRaises(ValidationError): Notificacion.objects.create(**self.data(metadata={"bad":object()}))
    def test_deduplicacion_por_destinatario(self):
        Notificacion.objects.create(**self.data())
        with self.assertRaises(ValidationError): Notificacion.objects.create(**self.data(event_id=uuid4()))
    def test_misma_clave_distinto_destinatario(self):
        other=CustomUser.objects.create_user(username="notif-other"); Notificacion.objects.create(**self.data()); Notificacion.objects.create(**self.data(destinatario=other,event_id=uuid4()))
        self.assertEqual(Notificacion.objects.count(),2)
    def test_ordering(self): self.assertEqual(Notificacion._meta.ordering,["-created_at"])

