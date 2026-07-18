import json
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from core.models import BaseModel


class Notificacion(BaseModel):
    class Nivel(models.TextChoices):
        INFO="INFO","Información"; SUCCESS="SUCCESS","Éxito"; WARNING="WARNING","Advertencia"; ERROR="ERROR","Error"
    destinatario=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="notificaciones")
    tipo=models.CharField(max_length=60)
    titulo=models.CharField(max_length=180)
    mensaje=models.TextField()
    nivel=models.CharField(max_length=10,choices=Nivel.choices,default=Nivel.INFO)
    leida=models.BooleanField(default=False)
    fecha_lectura=models.DateTimeField(null=True,blank=True)
    actor=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.SET_NULL,null=True,blank=True,related_name="notificaciones_generadas")
    postulacion=models.ForeignKey("postulantes.Postulacion",on_delete=models.CASCADE,null=True,blank=True,related_name="notificaciones")
    aggregate_type=models.CharField(max_length=80)
    aggregate_id=models.CharField(max_length=80)
    event_id=models.UUIDField()
    deduplication_key=models.CharField(max_length=255)
    metadata=models.JSONField(default=dict,blank=True)
    class Meta:
        ordering=["-created_at"]
        constraints=[models.UniqueConstraint(fields=["destinatario","deduplication_key"],name="unique_notif_dest_dedup")]
        indexes=[models.Index(fields=["destinatario","leida","-created_at"],name="notif_dest_read_created"),models.Index(fields=["postulacion"],name="notif_postulacion_idx"),models.Index(fields=["event_id"],name="notif_event_idx")]
    def clean(self):
        super().clean(); errors={}
        self.titulo=(self.titulo or "").strip(); self.mensaje=(self.mensaje or "").strip()
        if not self.destinatario_id: errors["destinatario"]="El destinatario es obligatorio."
        elif not self.destinatario.is_active: errors["destinatario"]="El destinatario debe estar activo."
        if not self.titulo: errors["titulo"]="El título es obligatorio."
        if not self.mensaje: errors["mensaje"]="El mensaje es obligatorio."
        if not self.event_id: errors["event_id"]="El event_id es obligatorio."
        if self.leida != bool(self.fecha_lectura): errors["fecha_lectura"]="La fecha de lectura debe corresponder al estado leído."
        try: json.dumps(self.metadata)
        except (TypeError,ValueError): errors["metadata"]="Metadata debe ser JSON serializable."
        if errors: raise ValidationError(errors)
    def save(self,*args,**kwargs): self.full_clean(); return super().save(*args,**kwargs)
    def __str__(self): return f"{self.destinatario}: {self.titulo}"

