from rest_framework import serializers
from apps.academico.models import Modalidad,EtapaModalidad
from apps.postulantes.models import EstadoPostulacion, Postulacion
from apps.usuarios.models import CustomUser
from apps.reportes.resultados import EstadoDisponibilidad


class ReportFilterSerializer(serializers.Serializer):
    modalidad=serializers.PrimaryKeyRelatedField(queryset=Modalidad.objects.all(),required=False)
    gestion=serializers.IntegerField(min_value=1900,max_value=2200,required=False)
    semestre=serializers.ChoiceField(choices=("I","II"),required=False)
    tipo_registro=serializers.ChoiceField(choices=Postulacion.TipoRegistroChoices.choices,required=False)
    etapa_actual=serializers.PrimaryKeyRelatedField(queryset=EtapaModalidad.objects.all(),required=False,help_text="ID persistido de EtapaModalidad; no acepta código ni nombre.")
    estado_general=serializers.PrimaryKeyRelatedField(queryset=EstadoPostulacion.objects.all(),required=False)
    tutor=serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(),required=False)
    fecha_desde=serializers.DateField(required=False); fecha_hasta=serializers.DateField(required=False)
    buscar=serializers.CharField(max_length=100,required=False); ordering=serializers.CharField(max_length=40,required=False)
    def validate(self,a):
        if a.get("fecha_desde") and a.get("fecha_hasta") and a["fecha_desde"]>a["fecha_hasta"]: raise serializers.ValidationError({"fecha_hasta":"Debe ser igual o posterior a fecha_desde."})
        if a.get("modalidad") and a.get("etapa_actual") and a["etapa_actual"].modalidad_id!=a["modalidad"].pk: raise serializers.ValidationError({"etapa_actual":"La etapa no pertenece a la modalidad seleccionada."})
        allowed={"postulante_nombre","modalidad","gestion","semestre","etapa_actual","estado_general","fecha_creacion","fecha_actualizacion"}
        raw=a.get("ordering",""); key=raw.lstrip("-")
        if raw and key not in allowed: raise serializers.ValidationError({"ordering":"Ordenamiento no permitido."})
        return a
    def normalized(self):
        return {k:(v.pk if hasattr(v,"pk") else v) for k,v in self.validated_data.items()}


class DashboardSerializer(serializers.Serializer):
    filtros_aplicados=serializers.DictField(); resumen=serializers.DictField(); modalidades=serializers.ListField(); etapas=serializers.ListField(); estados=serializers.ListField()
    documentos=serializers.DictField(); defensas=serializers.DictField(); cierre=serializers.DictField(); notificaciones=serializers.DictField(); tendencia=serializers.ListField(); advertencias=serializers.ListField()


class ReportePostulacionSerializer(serializers.Serializer):
    postulacion_id=serializers.IntegerField(); postulante_id=serializers.IntegerField(); postulante_nombre=serializers.CharField(); modalidad=serializers.DictField(); gestion=serializers.IntegerField(); semestre=serializers.ChoiceField(choices=("I","II"))
    titulo_trabajo=serializers.CharField(allow_null=True); tutor_activo=serializers.CharField(allow_null=True); etapa_actual=serializers.CharField(allow_null=True); estado_general=serializers.CharField(allow_null=True)
    porcentaje_etapas_aprobadas=serializers.DecimalField(max_digits=5,decimal_places=2); documentos_pendientes=serializers.IntegerField(); proxima_defensa=serializers.DateTimeField(allow_null=True)
    revision_final_aprobada=serializers.BooleanField(); cierre_documental_aprobado=serializers.BooleanField(); cierre_aplicable=serializers.BooleanField(); concluida=serializers.BooleanField(); fecha_creacion=serializers.DateTimeField(); fecha_actualizacion=serializers.DateTimeField()


class ResultadoAcademicoReportSerializer(serializers.Serializer):
    estado_disponibilidad = serializers.ChoiceField(choices=[item.value for item in EstadoDisponibilidad])
    disponible = serializers.BooleanField()
    definitivo = serializers.BooleanField()
    nota_final = serializers.DecimalField(max_digits=7, decimal_places=2, allow_null=True)
    escala = serializers.CharField(allow_null=True)
    resultado = serializers.CharField(allow_null=True)
    clasificacion = serializers.CharField(allow_null=True)
    reconocimiento = serializers.CharField(allow_null=True)
    fecha_conclusion = serializers.DateTimeField(allow_null=True)
    limitacion = serializers.CharField(allow_null=True)


class ResultadoReportFilterSerializer(serializers.Serializer):
    gestion = serializers.IntegerField(min_value=1900, max_value=2200, required=False)
    semestre = serializers.ChoiceField(choices=("I", "II"), required=False)
    modalidad = serializers.PrimaryKeyRelatedField(queryset=Modalidad.objects.all(), required=False)
    estado_administrativo = serializers.PrimaryKeyRelatedField(queryset=EstadoPostulacion.objects.all(), required=False)
    buscar = serializers.CharField(max_length=100, required=False)

    def validate(self, attrs):
        allowed = set(self.fields) | {"page", "page_size"}
        unknown = set(self.initial_data) - allowed
        if unknown:
            raise serializers.ValidationError({key: "Filtro no soportado en R2." for key in sorted(unknown)})
        return attrs

    def normalized(self):
        return {key: (value.pk if hasattr(value, "pk") else value) for key, value in self.validated_data.items()}


class ReporteResultadoAcademicoSerializer(serializers.Serializer):
    postulacion_id = serializers.IntegerField()
    postulacion_codigo = serializers.CharField()
    estudiante = serializers.DictField()
    modalidad = serializers.DictField()
    gestion = serializers.IntegerField()
    semestre = serializers.ChoiceField(choices=("I", "II"))
    estado_administrativo = serializers.DictField(allow_null=True)
    resultado_academico = ResultadoAcademicoReportSerializer()
