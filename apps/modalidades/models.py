from django.core.exceptions import ValidationError
from django.db import models

from core.managers import ActiveManager
from core.models import BaseModel


class ExamenArea(BaseModel):
    class Estado(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        EN_PROCESO = "EN_PROCESO", "En proceso"
        APROBADA = "APROBADA", "Aprobada"
        POSTERGADA = "POSTERGADA", "Postergada"
        REPROBADA = "REPROBADA", "Reprobada"

    postulacion = models.ForeignKey("postulantes.Postulacion", models.CASCADE, related_name="examen_areas")
    codigo = models.CharField(max_length=30)
    nombre = models.CharField(max_length=150)
    orden = models.PositiveSmallIntegerField()
    ponderacion = models.DecimalField(max_digits=5, decimal_places=2)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.PENDIENTE)
    intento_actual = models.PositiveSmallIntegerField(default=1)
    reintento_hasta = models.DateTimeField(null=True, blank=True)

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["postulacion", "codigo"], name="unique_examen_area_postulacion_codigo"),
            models.UniqueConstraint(fields=["postulacion", "orden"], name="unique_examen_area_postulacion_orden"),
        ]
        ordering = ["postulacion", "orden"]

    def clean(self):
        super().clean()
        errors = {}
        if self.orden < 1 or self.orden > 4:
            errors["orden"] = "El área debe estar entre 1 y 4."
        if self.ponderacion <= 0:
            errors["ponderacion"] = "La ponderación debe ser positiva."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class ExamenEvaluacion(BaseModel):
    class ModalidadRegistro(models.TextChoices):
        INDIVIDUAL = "INDIVIDUAL", "Individual"
        CONSENSO = "CONSENSO", "Consenso"

    class Resultado(models.TextChoices):
        APROBADA = "APROBADA", "Aprobada"
        INSUFICIENTE = "INSUFICIENTE", "Insuficiente"

    area = models.ForeignKey(ExamenArea, models.CASCADE, related_name="evaluaciones")
    intento = models.PositiveSmallIntegerField()
    nota = models.DecimalField(max_digits=5, decimal_places=2)
    resultado = models.CharField(max_length=20, choices=Resultado.choices)
    modalidad_registro = models.CharField(max_length=15, choices=ModalidadRegistro.choices, default=ModalidadRegistro.INDIVIDUAL)
    evaluador = models.ForeignKey("usuarios.CustomUser", models.PROTECT, null=True, blank=True, related_name="evaluaciones_examen")
    fecha_evaluacion = models.DateTimeField(auto_now_add=True)
    observaciones = models.TextField(blank=True)

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["area", "intento", "evaluador"], name="unique_examen_evaluacion_area_intento_evaluador"),
        ]
        ordering = ["area", "intento"]

    def clean(self):
        super().clean()
        if not 0 <= self.nota <= 100:
            raise ValidationError({"nota": "La nota del área debe estar entre 0 y 100."})
        expected = self.Resultado.APROBADA if self.nota >= 61 else self.Resultado.INSUFICIENTE
        if self.resultado != expected:
            raise ValidationError({"resultado": "El resultado debe corresponder a la nota y al mínimo normativo de 61."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class ExcelenciaExpediente(BaseModel):
    class Criterio(models.TextChoices):
        RENDIMIENTO_ACADEMICO = "RENDIMIENTO_ACADEMICO", "Rendimiento académico"
        RECONOCIMIENTO_CALIDAD = "RECONOCIMIENTO_CALIDAD", "Reconocimiento a la calidad"

    class Resultado(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        FAVORABLE = "FAVORABLE", "Favorable"
        DESFAVORABLE = "DESFAVORABLE", "Desfavorable"

    postulacion = models.OneToOneField(
        "postulantes.Postulacion", models.CASCADE, related_name="excelencia_expediente",
    )
    criterio = models.CharField(max_length=30, choices=Criterio.choices)
    resultado = models.CharField(max_length=20, choices=Resultado.choices, default=Resultado.PENDIENTE)
    promedio_general = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    observaciones = models.TextField(blank=True)
    evaluado_por = models.ForeignKey(
        "usuarios.CustomUser", models.PROTECT, null=True, blank=True, related_name="evaluaciones_excelencia",
    )
    fecha_evaluacion = models.DateTimeField(null=True, blank=True)

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ["postulacion"]

    def clean(self):
        super().clean()
        errors = {}
        if self.promedio_general is not None and not 0 <= self.promedio_general <= 100:
            errors["promedio_general"] = "El promedio general debe estar entre 0 y 100."
        if self.pk:
            previous = type(self).all_objects.filter(pk=self.pk).values_list("criterio", flat=True).first()
            if previous and previous != self.criterio:
                errors["criterio"] = "El criterio no puede cambiar después de ser seleccionado."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class DiplomadoModulo(BaseModel):
    class Estado(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        EN_PROCESO = "EN_PROCESO", "En proceso"
        APROBADO = "APROBADO", "Aprobado"
        REPROBADO = "REPROBADO", "Reprobado"

    postulacion = models.ForeignKey("postulantes.Postulacion", models.CASCADE, related_name="diplomado_modulos")
    orden = models.PositiveSmallIntegerField()
    nombre = models.CharField(max_length=180)
    horas = models.PositiveSmallIntegerField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.PENDIENTE)
    nota = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    observaciones = models.TextField(blank=True)

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ["postulacion", "orden"]
        constraints = [
            models.UniqueConstraint(fields=["postulacion", "orden"], name="unique_diplomado_modulo_orden"),
        ]

    def clean(self):
        super().clean()
        errors = {}
        if not 1 <= self.orden <= 5:
            errors["orden"] = "El módulo debe estar entre 1 y 5."
        if self.orden == 5 and self.nombre != "Taller de Investigación":
            errors["nombre"] = "El quinto módulo debe ser Taller de Investigación."
        if self.nota is not None and not 0 <= self.nota <= 100:
            errors["nota"] = "La nota del módulo debe estar entre 0 y 100."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class DiplomadoDefensa(BaseModel):
    class Resultado(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        APROBADA = "APROBADA", "Aprobada"
        REPROBADA = "REPROBADA", "Reprobada"

    postulacion = models.ForeignKey("postulantes.Postulacion", models.CASCADE, related_name="diplomado_defensas")
    numero_intento = models.PositiveSmallIntegerField(default=1)
    nota_consenso = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    resultado = models.CharField(max_length=20, choices=Resultado.choices, default=Resultado.PENDIENTE)
    reintento_hasta = models.DateTimeField(null=True, blank=True)
    observaciones = models.TextField(blank=True)

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ["postulacion", "numero_intento"]
        constraints = [
            models.UniqueConstraint(fields=["postulacion", "numero_intento"], name="unique_diplomado_defensa_intento"),
        ]

    def clean(self):
        super().clean()
        if self.nota_consenso is not None and not 0 <= self.nota_consenso <= 100:
            raise ValidationError({"nota_consenso": "La nota debe estar entre 0 y 100."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)
