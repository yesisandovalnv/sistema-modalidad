from rest_framework import serializers

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.postulantes.models import (
    AsignacionPostulacion,
    DecisionAcademicaEtapa,
    EstadoPostulacion,
    DictamenRevisionDocumento,
    HistorialEstado,
    InformeRevisionTribunalPrevia,
    Observacion,
    ParticipacionDecisionAcademica,
    Postulacion,
    PublicacionMemorandumDesignacion,
    SeguimientoEtapa,
)
from apps.documentos.models import VersionDocumento
from apps.usuarios.models import CustomUser
from core.permissions import is_staff_user
from apps.postulantes.workflow import WorkflowService


class EstadoPostulacionSerializer(serializers.ModelSerializer):
    """Serializer para exponer el catálogo maestro de estados de postulación."""

    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(read_only=True)

    class Meta:
        """Configuración del serializer para el modelo EstadoPostulacion."""

        model = EstadoPostulacion
        fields = ("id", "codigo", "nombre", "descripcion", "created_at", "updated_at", "activo")
        read_only_fields = ("id", "created_at", "updated_at", "activo")

    def validate_codigo(self, value: str) -> str:
        """Valida que el código no esté vacío ni contenga solo espacios."""
        if not value or not value.strip():
            raise serializers.ValidationError("El código es obligatorio.")
        return value.strip()

    def validate_nombre(self, value: str) -> str:
        """Valida que el nombre no esté vacío ni contenga solo espacios."""
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre es obligatorio.")
        return value.strip()


class PostulacionSerializer(serializers.ModelSerializer):
    """Serializer para representar una postulación y su estado actual."""

    estudiante_detalle = serializers.SerializerMethodField()
    modalidad_detalle = serializers.SerializerMethodField()
    periodo_detalle = serializers.SerializerMethodField()
    estado_actual_detalle = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(read_only=True)

    class Meta:
        """Configuración del serializer para el modelo Postulacion."""

        model = Postulacion
        fields = (
            "id",
            "codigo",
            "estudiante",
            "modalidad",
            "periodo",
            "estado_actual",
            "vigencia",
            "tipo_registro",
            "fecha_baja",
            "motivo_baja",
            "baja_por",
            "estudiante_detalle",
            "modalidad_detalle",
            "periodo_detalle",
            "estado_actual_detalle",
            "fecha_postulacion",
            "observaciones_generales",
            "created_at",
            "updated_at",
            "activo",
        )
        read_only_fields = (
            "id",
            "fecha_postulacion",
            "created_at",
            "updated_at",
            "activo",
            "vigencia",
            "tipo_registro",
            "fecha_baja",
            "motivo_baja",
            "baja_por",
        )

    def get_estudiante_detalle(self, obj: Postulacion) -> dict:
        return {
            "id": obj.estudiante_id,
            "username": obj.estudiante.username,
            "nombre_completo": obj.estudiante.nombre_completo,
            "ru": obj.estudiante.ru,
        }

    def get_modalidad_detalle(self, obj: Postulacion) -> dict:
        return {
            "id": obj.modalidad_id,
            "codigo": obj.modalidad.codigo,
            "nombre": obj.modalidad.nombre,
        }

    def get_periodo_detalle(self, obj: Postulacion) -> dict:
        return {
            "id": obj.periodo_id,
            "nombre": obj.periodo.nombre,
            "gestion": obj.periodo.gestion,
            "semestre": obj.periodo.semestre,
        }

    def get_estado_actual_detalle(self, obj: Postulacion) -> dict | None:
        if not obj.estado_actual_id:
            return None
        return {
            "id": obj.estado_actual_id,
            "codigo": obj.estado_actual.codigo,
            "nombre": obj.estado_actual.nombre,
        }

    def validate_codigo(self, value: str) -> str:
        """Valida que el código no esté vacío ni contenga solo espacios."""
        if not value or not value.strip():
            raise serializers.ValidationError("El código es obligatorio.")
        return value.strip()

    def validate(self, attrs: dict) -> dict:
        """Valida que la postulación cuente con los datos base necesarios."""
        if self.instance:
            estructurales = {"estudiante", "modalidad", "periodo"} & set(self.initial_data)
            if estructurales:
                raise serializers.ValidationError({
                    campo: "Este campo no puede modificarse después de crear la postulación."
                    for campo in sorted(estructurales)
                })
            if "tipo_registro" in self.initial_data:
                raise serializers.ValidationError({
                    "tipo_registro": "Este campo no puede modificarse después de crear la postulación."
                })
        estudiante = attrs.get("estudiante", getattr(self.instance, "estudiante", None))
        modalidad = attrs.get("modalidad", getattr(self.instance, "modalidad", None))
        periodo = attrs.get("periodo", getattr(self.instance, "periodo", None))

        if not estudiante:
            raise serializers.ValidationError({"estudiante": "El estudiante es obligatorio."})
        if not modalidad:
            raise serializers.ValidationError({"modalidad": "La modalidad es obligatoria."})
        if not periodo:
            raise serializers.ValidationError({"periodo": "El período es obligatorio."})

        return attrs


class HistorialEstadoSerializer(serializers.ModelSerializer):
    """Serializer para registrar el historial de cambios de estado de una postulación."""

    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(read_only=True)
    estado_anterior_nombre = serializers.CharField(source="estado_anterior.nombre", read_only=True, allow_null=True)
    estado_nuevo_nombre = serializers.CharField(source="estado_nuevo.nombre", read_only=True)
    actor_nombre = serializers.SerializerMethodField()

    def get_actor_nombre(self, obj: HistorialEstado) -> str | None:
        if not obj.usuario:
            return None
        return obj.usuario.nombre_completo or obj.usuario.username

    class Meta:
        """Configuración del serializer para el modelo HistorialEstado."""

        model = HistorialEstado
        fields = (
            "id",
            "postulacion",
            "estado_anterior",
            "estado_anterior_nombre",
            "estado_nuevo",
            "estado_nuevo_nombre",
            "usuario",
            "actor_nombre",
            "fecha_cambio",
            "comentario",
            "created_at",
            "updated_at",
            "activo",
        )
        read_only_fields = ("id", "fecha_cambio", "created_at", "updated_at", "activo")

    def validate(self, attrs: dict) -> dict:
        """Valida que el cambio de estado cuente con un estado nuevo y un usuario."""
        estado_nuevo = attrs.get("estado_nuevo")
        usuario = attrs.get("usuario")

        if not estado_nuevo:
            raise serializers.ValidationError({"estado_nuevo": "El estado nuevo es obligatorio."})
        if not usuario:
            raise serializers.ValidationError({"usuario": "El usuario es obligatorio."})

        return attrs


class ObservacionSerializer(serializers.ModelSerializer):
    """Serializer para representar observaciones registradas sobre una postulación."""

    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(read_only=True)

    class Meta:
        """Configuración del serializer para el modelo Observacion."""

        model = Observacion
        fields = (
            "id",
            "postulacion",
            "usuario",
            "comentario",
            "leida_estudiante",
            "fecha_observacion",
            "created_at",
            "updated_at",
            "activo",
        )
        read_only_fields = ("id", "fecha_observacion", "created_at", "updated_at", "activo")

    def validate_comentario(self, value: str) -> str:
        """Valida que el comentario no esté vacío ni contenga solo espacios."""
        if not value or not value.strip():
            raise serializers.ValidationError("El comentario es obligatorio.")
        return value.strip()

    def validate(self, attrs: dict) -> dict:
        """Valida que la observación tenga una postulación y un usuario asociados."""
        postulacion = attrs.get("postulacion")
        usuario = attrs.get("usuario")

        if not postulacion:
            raise serializers.ValidationError({"postulacion": "La postulación es obligatoria."})
        if not usuario:
            raise serializers.ValidationError({"usuario": "El usuario es obligatorio."})

        return attrs


class EtapaModalidadSerializer(serializers.ModelSerializer):
    """Serializer de solo lectura para etapas configuradas por modalidad."""

    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(read_only=True)

    class Meta:
        model = EtapaModalidad
        fields = (
            "id",
            "modalidad",
            "codigo",
            "nombre",
            "orden",
            "obligatoria",
            "permite_repeticion",
            "origen_normativo",
            "created_at",
            "updated_at",
            "activo",
        )
        read_only_fields = fields


class SeguimientoEtapaSerializer(serializers.ModelSerializer):
    """Serializer de solo lectura para el seguimiento de etapas."""

    codigo_postulacion = serializers.CharField(source="postulacion.codigo", read_only=True)
    estudiante_nombre = serializers.CharField(source="postulacion.estudiante.nombre_completo", read_only=True)
    modalidad_nombre = serializers.CharField(source="postulacion.modalidad.nombre", read_only=True)
    acciones_permitidas = serializers.SerializerMethodField()
    etapa_id = serializers.IntegerField(source="etapa.id", read_only=True)
    codigo = serializers.CharField(source="etapa.codigo", read_only=True)
    nombre = serializers.CharField(source="etapa.nombre", read_only=True)
    orden = serializers.IntegerField(source="etapa.orden", read_only=True)
    obligatoria = serializers.BooleanField(source="etapa.obligatoria", read_only=True)
    permite_repeticion = serializers.BooleanField(source="etapa.permite_repeticion", read_only=True)
    modalidad_id = serializers.IntegerField(source="etapa.modalidad_id", read_only=True)
    abierta_por_nombre = serializers.CharField(source="abierta_por.username", read_only=True)
    cerrada_por_nombre = serializers.CharField(source="cerrada_por.username", read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(read_only=True)

    class Meta:
        model = SeguimientoEtapa
        fields = (
            "id",
            "postulacion",
            "codigo_postulacion",
            "estudiante_nombre",
            "modalidad_nombre",
            "acciones_permitidas",
            "etapa_id",
            "codigo",
            "nombre",
            "orden",
            "obligatoria",
            "permite_repeticion",
            "modalidad_id",
            "estado",
            "numero_intento",
            "fecha_inicio",
            "fecha_fin",
            "abierta_por",
            "abierta_por_nombre",
            "cerrada_por",
            "cerrada_por_nombre",
            "observaciones",
            "created_at",
            "updated_at",
            "activo",
        )
        read_only_fields = fields

    def get_acciones_permitidas(self, obj: SeguimientoEtapa) -> list[str]:
        request = self.context.get("request")
        if not request or not is_staff_user(request.user):
            return []
        return WorkflowService.obtener_acciones_permitidas(obj)


class ParticipanteDecisionAcademicaInputSerializer(serializers.Serializer):
    asignacion = serializers.PrimaryKeyRelatedField(queryset=AsignacionPostulacion.all_objects.all())
    rol = serializers.CharField(max_length=60)
    orden = serializers.IntegerField(required=False, allow_null=True, min_value=1)


class RegistrarDecisionAcademicaSerializer(serializers.Serializer):
    codigo = serializers.CharField(max_length=80)
    resultado = serializers.CharField(max_length=80)
    observaciones = serializers.CharField(required=False, allow_blank=True, default="")
    participantes = ParticipanteDecisionAcademicaInputSerializer(many=True, required=False, default=list)
    reemplaza_decision = serializers.PrimaryKeyRelatedField(
        queryset=DecisionAcademicaEtapa.all_objects.all(),
        required=False,
        allow_null=True,
    )


class ParticipacionDecisionAcademicaSerializer(serializers.ModelSerializer):
    asignacion_usuario_id = serializers.IntegerField(source="asignacion.usuario_id", read_only=True)
    asignacion_usuario_nombre = serializers.SerializerMethodField()

    class Meta:
        model = ParticipacionDecisionAcademica
        fields = ("id", "asignacion", "asignacion_usuario_id", "asignacion_usuario_nombre", "rol", "orden", "activo")
        read_only_fields = fields

    def get_asignacion_usuario_nombre(self, obj):
        return obj.asignacion.usuario.nombre_completo or obj.asignacion.usuario.username


class DecisionAcademicaEtapaSerializer(serializers.ModelSerializer):
    registrado_por_nombre = serializers.SerializerMethodField()
    participantes = ParticipacionDecisionAcademicaSerializer(source="participaciones", many=True, read_only=True)

    class Meta:
        model = DecisionAcademicaEtapa
        fields = (
            "id", "seguimiento_etapa", "codigo", "resultado", "fecha_decision",
            "registrado_por", "registrado_por_nombre", "observaciones", "participantes",
            "activo", "created_at", "updated_at",
        )
        read_only_fields = fields

    def get_registrado_por_nombre(self, obj):
        return obj.registrado_por.nombre_completo or obj.registrado_por.username


class PublicacionMemorandumDesignacionSerializer(serializers.ModelSerializer):
    version = serializers.SerializerMethodField()
    composicion = serializers.SerializerMethodField()
    vigente = serializers.SerializerMethodField()
    publicado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = PublicacionMemorandumDesignacion
        fields = (
            "id", "postulacion", "seguimiento_etapa", "fecha_publicacion", "activo",
            "vigente", "publicado_por", "publicado_por_nombre", "version", "composicion",
        )
        read_only_fields = fields

    def get_version(self, obj):
        version = obj.version_documento
        return {
            "id": version.pk,
            "numero_version": version.numero_version,
            "nombre_original": version.nombre_original,
            "fecha_subida": version.fecha_subida,
        }

    def get_composicion(self, obj):
        return [{
            "asignacion": item.pk,
            "tipo_participacion": item.tipo_participacion,
            "orden_cargo": item.orden_cargo,
            "usuario": item.usuario_id,
            "usuario_nombre": item.usuario.nombre_completo or item.usuario.username,
        } for item in obj.asignaciones.all().order_by("tipo_participacion", "orden_cargo", "pk")]

    def get_vigente(self, obj):
        from apps.postulantes.memorandums import MemorandumDesignacionService
        return MemorandumDesignacionService.es_vigente(obj)

    def get_publicado_por_nombre(self, obj):
        return obj.publicado_por.nombre_completo or obj.publicado_por.username


class PublicarMemorandumDesignacionSerializer(serializers.Serializer):
    seguimiento_etapa = serializers.PrimaryKeyRelatedField(queryset=SeguimientoEtapa.objects.all())
    archivo = serializers.FileField()


class FlujoPostulacionSerializer(serializers.ModelSerializer):
    """Serializer agregado para exponer el flujo de una postulación."""

    modalidad = serializers.SerializerMethodField()
    etapa_actual = serializers.SerializerMethodField()
    porcentaje_avance = serializers.SerializerMethodField()
    etapas_completadas = serializers.SerializerMethodField()
    etapas_totales = serializers.SerializerMethodField()
    etapas = serializers.SerializerMethodField()
    orientacion_etapa_actual = serializers.SerializerMethodField()
    gestion_actores = serializers.SerializerMethodField()
    gestion_decisiones_academicas = serializers.SerializerMethodField()

    class Meta:
        model = Postulacion
        fields = (
            "id",
            "codigo",
            "modalidad",
            "etapa_actual",
            "porcentaje_avance",
            "etapas_completadas",
            "etapas_totales",
            "etapas",
            "orientacion_etapa_actual",
            "gestion_actores",
            "gestion_decisiones_academicas",
        )
        read_only_fields = fields

    def get_modalidad(self, obj: Postulacion) -> dict:
        return {
            "id": obj.modalidad_id,
            "codigo": obj.modalidad.codigo,
            "nombre": obj.modalidad.nombre,
        }

    def get_etapas(self, obj: Postulacion) -> list[dict]:
        seguimientos = self._obtener_seguimientos(obj)
        return SeguimientoEtapaSerializer(seguimientos, many=True, context=self.context).data

    def get_etapa_actual(self, obj: Postulacion) -> dict | None:
        seguimientos = self._obtener_seguimientos(obj)
        actual = next(
            (
                seguimiento
                for seguimiento in seguimientos
                if seguimiento.estado in (
                    SeguimientoEtapa.EstadoChoices.EN_PROCESO,
                    SeguimientoEtapa.EstadoChoices.OBSERVADA,
                )
            ),
            None,
        )
        if actual is None:
            actual = next(
                (
                    seguimiento
                    for seguimiento in seguimientos
                    if seguimiento.estado == SeguimientoEtapa.EstadoChoices.PENDIENTE
                ),
                None,
            )
        if actual is None and seguimientos:
            actual = seguimientos[-1]
        if actual is None:
            return None
        return SeguimientoEtapaSerializer(actual, context=self.context).data

    def _obtener_conteo_progreso(self, obj: Postulacion) -> tuple[int, int]:
        seguimientos = self._obtener_seguimientos(obj)
        etapas_obligatorias_ids = {
            seguimiento.etapa_id
            for seguimiento in seguimientos
            if seguimiento.etapa.obligatoria and seguimiento.etapa.activo
        }
        etapas_aprobadas_ids = {
            seguimiento.etapa_id
            for seguimiento in seguimientos
            if seguimiento.estado == SeguimientoEtapa.EstadoChoices.APROBADA
            and seguimiento.etapa.obligatoria
            and seguimiento.etapa.activo
        }
        return len(etapas_aprobadas_ids), len(etapas_obligatorias_ids)

    def get_porcentaje_avance(self, obj: Postulacion) -> float:
        completadas, total = self._obtener_conteo_progreso(obj)
        return round((completadas / total) * 100, 2) if total else 0.0

    def get_etapas_completadas(self, obj: Postulacion) -> int:
        completadas, _ = self._obtener_conteo_progreso(obj)
        return completadas

    def get_etapas_totales(self, obj: Postulacion) -> int:
        _, total = self._obtener_conteo_progreso(obj)
        return total

    def get_orientacion_etapa_actual(self, obj: Postulacion) -> dict | None:
        """Evalúa precondiciones operativas declaradas por el policy de modalidad."""
        actual_data = self.get_etapa_actual(obj)
        if not actual_data:
            return None
        from apps.modalidades.policies import ModalidadPolicyRegistry
        if not ModalidadPolicyRegistry.has_policy(obj.modalidad):
            return None
        policy = ModalidadPolicyRegistry.get(obj.modalidad)
        orientacion = policy.get_orientacion_etapa_actual(
            postulacion=obj, seguimiento=self._seguimiento_actual(obj),
        )
        if orientacion is not None:
            return self._filtrar_aprobacion_no_permitida(orientacion, actual_data)
        from core.permissions import is_staff_user

        evento_policy = policy.evento_policy
        precondiciones = evento_policy.get_precondiciones_programacion(actual_data["codigo"]) if evento_policy else None
        if not precondiciones:
            request = self.context.get("request")
            return self._orientacion_aprobacion_generica(
                actual_data,
                puede_aprobar=is_staff_user(request.user) if request else False,
            )
        nombres_roles = dict(AsignacionPostulacion.TipoParticipacionChoices.choices)
        nombres_roles.update(precondiciones.get("nombres_asignaciones", {}))
        asignaciones = obj.asignaciones.filter(activo=True)
        evaluacion = evento_policy.evaluar_requisitos_programacion(
            tipo_evento=precondiciones["tipo_evento"], seguimiento=self._seguimiento_actual(obj), asignaciones=asignaciones,
        )
        requisitos, faltan_actores = [], False
        for rol, minimo in precondiciones["asignaciones_minimas"].items():
            resultado = evaluacion["requisitos"][rol]
            actual, cumplido = resultado["actual"], resultado["cumplido"]
            faltan_actores = faltan_actores or not cumplido
            estado_display = f"{actual}/{minimo}"
            if resultado.get("conflicto_identidad"):
                estado_display += " conflicto de identidad"
            else:
                estado_display += f" {'✓' if cumplido else 'pendiente'}"
            requisitos.append({
                "tipo": "ACTOR", "codigo": rol, "nombre": nombres_roles.get(rol, rol),
                "actual": actual, "minimo": minimo, "cumplido": cumplido,
                "estado": "CUMPLIDO" if cumplido else "PENDIENTE",
                "estado_display": estado_display,
                "conflicto_identidad": resultado.get("conflicto_identidad", False),
                "destino": "#actores" if not cumplido else None,
            })
        horas = precondiciones.get("anticipacion_minima_horas")
        if horas is not None:
            requisitos.append({
                "tipo": "ANTICIPACION", "codigo": "ANTICIPACION_MINIMA",
                "nombre": "Anticipación mínima", "valor": horas, "unidad": "HORAS",
                "cumplido": None, "estado": "INFORMATIVO", "estado_display": f"{horas} h", "destino": None,
            })
        siguiente_accion = ({
            "codigo": "GESTIONAR_ACTORES", "titulo": "Actores de la postulación",
            "descripcion": "Completa las asignaciones mínimas requeridas antes de programar.",
            "estado": "PENDIENTE", "estado_display": "Pendiente", "destino": "#actores",
        } if faltan_actores else {
            "codigo": "PROGRAMAR_EVENTO", "titulo": "Programar defensa",
            "descripcion": "Los actores requeridos están completos. Programa la defensa respetando la anticipación mínima.",
            "estado": "DISPONIBLE", "estado_display": "Disponible", "destino": "#defensas",
        })
        return {
            "operacion": "PROGRAMAR_EVENTO", "tipo_evento": precondiciones["tipo_evento"],
            "mensaje": "Verifica estas precondiciones antes de intentar programar la defensa.",
            "requisitos": requisitos, "siguiente_accion": siguiente_accion,
            "conflictos_identidad": evaluacion.get("conflictos", []),
        }

    @staticmethod
    def _filtrar_aprobacion_no_permitida(orientacion: dict, etapa_actual: dict) -> dict:
        action = orientacion.get("siguiente_accion") or {}
        if action.get("codigo") != "APROBAR_ETAPA" or "aprobar" in (etapa_actual.get("acciones_permitidas") or []):
            return orientacion

        resultado = {**orientacion, "siguiente_accion": None}
        if etapa_actual.get("estado") in {"EN_PROCESO", "OBSERVADA"}:
            nombre_etapa = etapa_actual.get("nombre") or etapa_actual.get("codigo", "la etapa")
            mensaje_responsable = f"La aprobación de {nombre_etapa} está pendiente del personal responsable."
            mensaje_especifico = (orientacion.get("mensaje") or "").strip()
            resultado["mensaje"] = f"{mensaje_especifico} {mensaje_responsable}".strip()
        return resultado

    @staticmethod
    def _orientacion_aprobacion_generica(etapa_actual: dict, *, puede_aprobar: bool) -> dict | None:
        if "aprobar" not in (etapa_actual.get("acciones_permitidas") or []):
            if not puede_aprobar and etapa_actual.get("estado") in {"EN_PROCESO", "OBSERVADA"}:
                return {
                    "operacion": "ORIENTAR_ETAPA",
                    "mensaje": "La etapa está en curso. Las acciones administrativas corresponden al personal responsable.",
                    "requisitos": [],
                    "siguiente_accion": None,
                    "conflictos_identidad": [],
                }
            return None

        nombre_etapa = etapa_actual.get("nombre") or etapa_actual.get("codigo", "la etapa")
        return {
            "operacion": "ORIENTAR_ETAPA",
            "mensaje": "Los requisitos de esta etapa están cumplidos. Está lista para aprobación administrativa.",
            "requisitos": [],
            "siguiente_accion": {
                "codigo": "APROBAR_ETAPA",
                "titulo": f"Aprobar {nombre_etapa}",
                "descripcion": "La aprobación cerrará esta etapa mediante el workflow y ejecutará la transición configurada.",
                "estado": "DISPONIBLE",
                "estado_display": "Disponible",
                "destino": "#resumen",
                "accion_label": f"Aprobar {nombre_etapa}",
            },
            "conflictos_identidad": [],
        }

    def get_gestion_actores(self, obj: Postulacion) -> dict:
        """Proyección canónica del contrato de actores para la UI, sin duplicar reglas operativas."""
        from apps.modalidades.policies import ModalidadPolicyRegistry

        if not ModalidadPolicyRegistry.has_policy(obj.modalidad):
            return {}

        policy = ModalidadPolicyRegistry.get(obj.modalidad)
        config = policy.get_configuracion_actores(obj, self._seguimiento_actual(obj))
        if not config or not isinstance(config, dict):
            return {}

        grupos = config.get("grupos", [])
        if not grupos:
            return {}

        request = self.context.get("request")
        is_admin = bool(request and is_staff_user(request.user))
        actual = self._seguimiento_actual(obj)
        contexto = {
            "tipo": "ETAPA",
            "seguimiento_etapa": actual.pk if actual else None,
            "codigo_etapa": actual.etapa.codigo if actual else None,
            "regimen_workflow": config.get("regimen_workflow"),
        }

        posiciones = []
        for grupo in grupos:
            tipo = grupo.get("tipo_participacion")
            ambito = grupo.get("ambito")
            codigo_etapa_grupo = grupo.get("codigo_etapa")
            if ambito == "ETAPA" and codigo_etapa_grupo and (
                actual is None or actual.etapa.codigo != codigo_etapa_grupo
            ):
                continue
            ordenes_permitidos = grupo.get("ordenes_permitidos", [])
            ordenado = bool(grupo.get("ordenado"))
            min_slots = int(grupo.get("minimo", 0) or 0)
            max_slots = int(grupo.get("maximo", min_slots) or min_slots)

            if ambito == "ETAPA":
                base_queryset = obj.asignaciones.filter(activo=True, tipo_participacion=tipo)
                if actual is not None:
                    base_queryset = base_queryset.filter(seguimiento_etapa=actual)
            elif ambito == "POSTULACION":
                base_queryset = obj.asignaciones.filter(activo=True, tipo_participacion=tipo, seguimiento_etapa__isnull=True)
            else:
                base_queryset = obj.asignaciones.none()

            if ordenado and ordenes_permitidos:
                for orden in ordenes_permitidos:
                    posicion_config = next(
                        (item for item in grupo.get("posiciones", []) if item.get("orden_cargo") == orden),
                        {"clave": f"{grupo['clave']}_{orden}", "orden_cargo": orden, "nombre": grupo.get("nombre", tipo)},
                    )
                    asignacion = base_queryset.filter(orden_cargo=orden).order_by("-fecha_designacion").first()
                    posicion = self._proyectar_posicion(
                        obj=obj,
                        grupo=grupo,
                        tipo=tipo,
                        ambito=ambito,
                        orden=orden,
                        asignacion=asignacion,
                        is_admin=is_admin,
                        configuracion_posicion=posicion_config,
                    )
                    posiciones.append(posicion)
            else:
                posicion_config = (grupo.get("posiciones") or [{}])[0]
                asignacion = base_queryset.order_by("-fecha_designacion").first()
                posicion = self._proyectar_posicion(
                    obj=obj,
                    grupo=grupo,
                    tipo=tipo,
                    ambito=ambito,
                    orden=None,
                    asignacion=asignacion,
                    is_admin=is_admin,
                    configuracion_posicion=posicion_config,
                )
                posiciones.append(posicion)

        return {"contexto": contexto, "posiciones": posiciones}

    def get_gestion_decisiones_academicas(self, obj: Postulacion) -> dict:
        """Proyecta decisiones declaradas por policy junto con estado, participantes y permisos."""
        from apps.modalidades.policies import ModalidadPolicyRegistry

        actual = self._seguimiento_actual(obj)
        if actual is None or not ModalidadPolicyRegistry.has_policy(obj.modalidad):
            return {"contexto": None, "decisiones": []}
        policy = ModalidadPolicyRegistry.get(obj.modalidad)
        definitions = policy.get_decisiones_academicas_permitidas(actual.etapa.codigo)
        memorandum_config = policy.get_publicacion_memorandum_designacion(actual.etapa.codigo)
        request = self.context.get("request")
        is_admin = bool(request and is_staff_user(request.user))
        decisiones = []
        for definition in definitions:
            if definition.regimen_workflow_requerido and obj.regimen_workflow != definition.regimen_workflow_requerido:
                continue
            asignaciones = obj.asignaciones.filter(
                activo=True,
                seguimiento_etapa=actual,
                tipo_participacion__in=definition.roles_participantes,
            ).select_related("usuario").order_by("orden_cargo", "pk")
            participantes = [{
                "asignacion": item.pk,
                "usuario": item.usuario_id,
                "usuario_nombre": item.usuario.nombre_completo or item.usuario.username,
                "rol": item.tipo_participacion,
                "orden": item.orden_cargo,
            } for item in asignaciones]
            orders = tuple(sorted(item["orden"] for item in participantes if item["orden"] is not None))
            composicion_completa = (
                len(participantes) >= definition.participantes_minimos
                and (definition.participantes_maximos is None or len(participantes) <= definition.participantes_maximos)
                and (not definition.ordenes_requeridos or orders == tuple(sorted(definition.ordenes_requeridos)))
            )
            decision = DecisionAcademicaEtapa.objects.filter(
                seguimiento_etapa=actual, codigo=definition.codigo, activo=True,
            ).prefetch_related("participaciones__asignacion__usuario").first()
            cumplida = decision is not None
            acciones = []
            if is_admin:
                if cumplida:
                    acciones = ["REEMPLAZAR"]
                elif composicion_completa:
                    acciones = ["REGISTRAR"]
            bloqueo = None if cumplida or composicion_completa else {
                "codigo": "COMPOSICION_PARTICIPANTES_INCOMPLETA",
                "mensaje": "Falta completar la composición formal requerida para registrar la decisión.",
            }
            decision_data = {
                "codigo": definition.codigo,
                "nombre": definition.nombre or definition.codigo.replace("_", " ").title(),
                "estado": "CUMPLIDA" if cumplida else "PENDIENTE",
                "cumplida": cumplida,
                "resultados_permitidos": list(definition.resultados),
                "resultado_actual": decision.resultado if decision else None,
                "participantes_requeridos": {
                    "roles": list(definition.roles_participantes),
                    "minimo": definition.participantes_minimos,
                    "maximo": definition.participantes_maximos,
                    "ordenes": list(definition.ordenes_requeridos),
                },
                "participantes_disponibles": participantes,
                "participantes_actuales": DecisionAcademicaEtapaSerializer(decision, context=self.context).data["participantes"] if decision else [],
                "habilitada": cumplida or composicion_completa,
                "acciones_permitidas": acciones,
                "bloqueo": bloqueo,
                "decision_actual": DecisionAcademicaEtapaSerializer(decision, context=self.context).data if decision else None,
                "reemplazable": bool(decision and is_admin),
            }
            if memorandum_config and memorandum_config.get("decision_academica") == definition.codigo:
                decision_data["memorandum_designacion"] = memorandum_config
            decisiones.append(decision_data)
        memorandum_contextual = None
        if memorandum_config and not any(item.get("memorandum_designacion") for item in decisiones):
            memorandum_contextual = memorandum_config
        return {
            "contexto": {"seguimiento_etapa": actual.pk, "codigo_etapa": actual.etapa.codigo},
            "decisiones": decisiones,
            "memorandum_designacion_contextual": memorandum_contextual,
        }

    def _proyectar_posicion(self, obj, grupo, tipo, ambito, orden, asignacion, is_admin, configuracion_posicion):
        precondicion = grupo.get("precondicion")
        enforcement_activo = bool(precondicion and precondicion.get("enforcement") == "ACTIVO")
        precondicion_pendiente = enforcement_activo and precondicion.get("estado") != "CUMPLIDA"
        habilitada = bool(grupo.get("habilitada", True)) and not precondicion_pendiente
        bloqueo_configurado = grupo.get("bloqueo_precondicion_pendiente", {})
        bloqueo = None
        if precondicion_pendiente:
            bloqueo = {
                "codigo": bloqueo_configurado.get("codigo", "PRECONDICION_NO_CUMPLIDA"),
                "mensaje": bloqueo_configurado.get("mensaje", "La precondición requerida no está cumplida."),
            }
        if asignacion is not None:
            estado_ocupacion = "ASIGNADA"
            asignacion_actual = asignacion.pk
            asignacion_data = AsignacionPostulacionSerializer(asignacion, context=self.context).data
            asignacion_actual_detalle = {
                "id": asignacion.pk,
                "usuario": {
                    "id": asignacion.usuario_id,
                    "nombre": asignacion_data["usuario_nombre"],
                },
                "tipo_participacion": asignacion.tipo_participacion,
                "orden_cargo": asignacion.orden_cargo,
                "ambito": ambito,
                "seguimiento_etapa": asignacion.seguimiento_etapa_id,
                "fecha_designacion": asignacion_data["fecha_designacion"],
            }
            acciones = ["REEMPLAZAR", "FINALIZAR"] if is_admin else []
        else:
            estado_ocupacion = "VACANTE"
            asignacion_actual = None
            asignacion_actual_detalle = None
            acciones = ["ASIGNAR"] if is_admin and habilitada else []

        if precondicion_pendiente:
            acciones = []

        return {
            "clave": configuracion_posicion.get("clave") or f"{grupo['clave']}_{orden or 1}",
            "tipo_participacion": tipo,
            "nombre": configuracion_posicion.get("nombre") or grupo.get("nombre", tipo),
            "orden_cargo": orden if orden is not None else configuracion_posicion.get("orden_cargo"),
            "obligatoriedad": bool(grupo.get("obligatoriedad", False)),
            "restriccion_identidad": grupo.get("restriccion_identidad"),
            "ocupacion_actor": grupo.get("ocupacion_actor"),
            "habilitada": habilitada,
            "estado_ocupacion": estado_ocupacion,
            "ambito": ambito,
            "seguimiento_etapa": (
                asignacion.seguimiento_etapa_id
                if asignacion is not None and ambito == "ETAPA"
                else (self._seguimiento_actual(obj).pk if ambito == "ETAPA" and self._seguimiento_actual(obj) else None)
            ),
            "asignacion_actual": asignacion_actual,
            "asignacion_actual_detalle": asignacion_actual_detalle,
            "acciones_permitidas": acciones,
            "bloqueo": bloqueo,
            "precondicion": precondicion,
        }

    def _seguimiento_actual(self, obj: Postulacion) -> SeguimientoEtapa | None:
        actual_data = self.get_etapa_actual(obj)
        if not actual_data:
            return None
        return next((item for item in self._obtener_seguimientos(obj) if item.pk == actual_data["id"]), None)

    def _obtener_seguimientos(self, obj: Postulacion) -> list[SeguimientoEtapa]:
        seguimientos = getattr(obj, "_prefetched_flujo", None)
        if seguimientos is not None:
            return list(seguimientos)
        queryset = obj.seguimientos_etapa.select_related("etapa", "abierta_por", "cerrada_por").order_by(
            "etapa__orden",
            "numero_intento",
        )
        return list(queryset)


class ObservaSeguimientoEtapaSerializer(serializers.Serializer):
    """Payload para observar una etapa."""

    observaciones = serializers.CharField(required=True, allow_blank=False)


class AprobarSeguimientoEtapaSerializer(serializers.Serializer):
    """Payload para aprobar una etapa."""

    observaciones = serializers.CharField(required=False, allow_blank=True, default="")


class RechazarSeguimientoEtapaSerializer(serializers.Serializer):
    """Payload para rechazar una etapa."""

    observaciones = serializers.CharField(required=False, allow_blank=True, default="")


class OmitirSeguimientoEtapaSerializer(serializers.Serializer):
    """Payload para omitir una etapa."""

    observaciones = serializers.CharField(required=False, allow_blank=True, default="")


class RegistrarDictamenRevisionSerializer(serializers.Serializer):
    version_documento_revisada = serializers.PrimaryKeyRelatedField(queryset=VersionDocumento.objects.all())
    tipo_revision = serializers.ChoiceField(choices=DictamenRevisionDocumento.TipoRevision.choices)
    resultado = serializers.ChoiceField(choices=DictamenRevisionDocumento.Resultado.choices)
    evidencia_version = serializers.PrimaryKeyRelatedField(queryset=VersionDocumento.objects.all())
    asignacion_emisora = serializers.PrimaryKeyRelatedField(queryset=AsignacionPostulacion.objects.all(), required=False, allow_null=True)
    observaciones = serializers.CharField(required=False, allow_blank=True)


class DictamenRevisionSerializer(serializers.ModelSerializer):
    evidencia_version_nombre = serializers.CharField(source="evidencia_version.nombre_original", read_only=True)
    version_documento_revisada_numero = serializers.IntegerField(source="version_documento_revisada.numero_version", read_only=True)

    class Meta:
        model = DictamenRevisionDocumento
        fields = ("id", "seguimiento_etapa", "version_documento_revisada", "version_documento_revisada_numero", "tipo_revision", "resultado", "evidencia_version", "evidencia_version_nombre", "asignacion_emisora", "observaciones", "registrado_por", "fecha_registro", "activo")
        read_only_fields = ("id", "seguimiento_etapa", "registrado_por", "fecha_registro", "activo")


class RegistrarInformeRevisionTribunalSerializer(serializers.Serializer):
    version_documento_revisada = serializers.PrimaryKeyRelatedField(
        queryset=VersionDocumento.all_objects.all(),
    )
    resultado = serializers.ChoiceField(choices=InformeRevisionTribunalPrevia.Resultado.choices)
    observaciones = serializers.CharField(required=False, allow_blank=True, default="")
    evidencia_version = serializers.PrimaryKeyRelatedField(
        queryset=VersionDocumento.all_objects.all(),
    )

    def validate(self, attrs):
        if (
            attrs.get("resultado") == InformeRevisionTribunalPrevia.Resultado.INSUFICIENTE
            and not attrs.get("observaciones", "").strip()
        ):
            raise serializers.ValidationError(
                {"observaciones": "Las observaciones son obligatorias para un resultado INSUFICIENTE."}
            )
        return attrs


class ActualizarEvidenciaInformeRevisionTribunalSerializer(serializers.Serializer):
    evidencia_version = serializers.PrimaryKeyRelatedField(
        queryset=VersionDocumento.all_objects.all(),
    )


class InformeRevisionTribunalSerializer(serializers.ModelSerializer):
    resultado_display = serializers.CharField(source="get_resultado_display", read_only=True)
    numero_version_revisada = serializers.IntegerField(
        source="version_documento_revisada.numero_version", read_only=True,
    )
    documento_final_nombre = serializers.CharField(
        source="version_documento_revisada.nombre_original", read_only=True,
    )
    evidencia_nombre_original = serializers.CharField(
        source="evidencia_version.nombre_original", read_only=True,
    )
    registrado_por_nombre = serializers.SerializerMethodField()

    def get_registrado_por_nombre(self, obj):
        return obj.registrado_por.nombre_completo or obj.registrado_por.username

    class Meta:
        model = InformeRevisionTribunalPrevia
        fields = (
            "id", "seguimiento_etapa", "version_documento_revisada",
            "numero_version_revisada", "documento_final_nombre", "resultado",
            "resultado_display", "observaciones", "evidencia_version",
            "evidencia_nombre_original", "fecha_registro", "registrado_por",
            "registrado_por_nombre", "activo", "created_at", "updated_at",
        )
        read_only_fields = fields


class AsignacionPostulacionSerializer(serializers.ModelSerializer):
    """Serializer de solo lectura para asignaciones de actores en postulaciones."""

    usuario_nombre_completo = serializers.CharField(source="usuario.nombre_completo", read_only=True)
    usuario_nombre = serializers.SerializerMethodField()
    designado_por_nombre = serializers.CharField(source="designado_por.nombre_completo", read_only=True)
    tipo_participacion_nombre = serializers.CharField(source="get_tipo_participacion_display", read_only=True)
    tipo_participacion_display = serializers.CharField(source="get_tipo_participacion_display", read_only=True)
    fecha_inicio = serializers.DateTimeField(source="fecha_designacion", read_only=True)
    fecha_fin = serializers.DateTimeField(source="fecha_finalizacion", read_only=True)
    asignado_por = serializers.IntegerField(source="designado_por_id", read_only=True)
    asignado_por_nombre = serializers.SerializerMethodField()
    etapa_id = serializers.IntegerField(source="seguimiento_etapa.etapa_id", read_only=True)
    etapa_codigo = serializers.CharField(source="seguimiento_etapa.etapa.codigo", read_only=True)
    etapa_nombre = serializers.CharField(source="seguimiento_etapa.etapa.nombre", read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(read_only=True)

    @staticmethod
    def _nombre_usuario(usuario) -> str:
        if not usuario:
            return "Usuario no disponible"
        return usuario.nombre_completo or usuario.username or f"Usuario {usuario.pk}"

    def get_usuario_nombre(self, obj: AsignacionPostulacion) -> str:
        return self._nombre_usuario(obj.usuario)

    def get_asignado_por_nombre(self, obj: AsignacionPostulacion) -> str | None:
        return self._nombre_usuario(obj.designado_por) if obj.designado_por_id else None

    class Meta:
        model = AsignacionPostulacion
        fields = (
            "id",
            "postulacion",
            "usuario",
            "usuario_nombre_completo",
            "usuario_nombre",
            "tipo_participacion",
            "tipo_participacion_nombre",
            "tipo_participacion_display",
            "orden_cargo",
            "seguimiento_etapa",
            "etapa_id",
            "etapa_codigo",
            "etapa_nombre",
            "fecha_designacion",
            "fecha_finalizacion",
            "fecha_inicio",
            "fecha_fin",
            "activo",
            "designado_por",
            "designado_por_nombre",
            "asignado_por",
            "asignado_por_nombre",
            "observaciones",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class AsignarActorSerializer(serializers.Serializer):
    """Payload para asignar un actor a una postulación."""

    usuario = serializers.PrimaryKeyRelatedField(queryset=CustomUser.all_objects.filter(is_active=True, activo=True))
    tipo_participacion = serializers.ChoiceField(choices=AsignacionPostulacion.TipoParticipacionChoices.choices)
    orden_cargo = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    seguimiento_etapa = serializers.PrimaryKeyRelatedField(
        queryset=SeguimientoEtapa.objects.all(),
        required=False,
        allow_null=True,
    )
    observaciones = serializers.CharField(required=False, allow_blank=True, default="")


class FinalizarAsignacionSerializer(serializers.Serializer):
    """Payload para finalizar una asignación activa."""

    observaciones = serializers.CharField(required=False, allow_blank=True, default="")


class ReemplazarActorSerializer(serializers.Serializer):
    """Payload para reemplazar un actor manteniendo historial."""

    nuevo_usuario = serializers.PrimaryKeyRelatedField(queryset=CustomUser.all_objects.filter(is_active=True, activo=True))
    observaciones = serializers.CharField(required=False, allow_blank=True, default="")
