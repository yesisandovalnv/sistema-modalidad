from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from apps.modalidades.policies import DecisionAcademicaDefinition, ModalidadPolicyRegistry
from apps.postulantes.models import (
    AsignacionPostulacion,
    DecisionAcademicaEtapa,
    ParticipacionDecisionAcademica,
    SeguimientoEtapa,
)
from apps.usuarios.models import AuditLog
from core.permissions import is_staff_user


class DecisionAcademicaEtapaService:
    @staticmethod
    def _definition(seguimiento, codigo):
        policy = ModalidadPolicyRegistry.get(seguimiento.postulacion)
        definitions = policy.get_decisiones_academicas_permitidas(seguimiento.etapa.codigo)
        matches = [definition for definition in definitions if definition.codigo == codigo]
        if not matches:
            raise ValidationError({"codigo": ["La policy no permite este código de decisión para la etapa."]})
        if len(matches) != 1:
            raise ValidationError({"codigo": ["La policy declara el código de decisión más de una vez."]})

        definition = matches[0]
        if not isinstance(definition, DecisionAcademicaDefinition):
            raise ValidationError({"codigo": ["La definición de decisión de la policy no es válida."]})
        if (
            definition.regimen_workflow_requerido
            and seguimiento.postulacion.regimen_workflow != definition.regimen_workflow_requerido
        ):
            raise ValidationError({"codigo": ["Esta decisión no está habilitada para el régimen del workflow."]})
        if not definition.resultados or len(set(definition.resultados)) != len(definition.resultados):
            raise ValidationError({"resultado": ["La policy debe declarar resultados válidos y únicos."]})
        if definition.participantes_minimos < 0:
            raise ValidationError({"participantes": ["El mínimo de participantes configurado no es válido."]})
        if (
            definition.participantes_maximos is not None
            and definition.participantes_maximos < definition.participantes_minimos
        ):
            raise ValidationError({"participantes": ["El máximo de participantes configurado no es válido."]})
        if len(set(definition.ordenes_requeridos)) != len(definition.ordenes_requeridos):
            raise ValidationError({"participantes": ["La policy declara órdenes de participante duplicados."]})
        return definition

    @staticmethod
    def _validate_participants(seguimiento, definition, participants):
        participants = list(participants or ())
        count = len(participants)
        if count < definition.participantes_minimos:
            raise ValidationError({"participantes": ["No se alcanzó el mínimo de participantes definido por la policy."]})
        if definition.participantes_maximos is not None and count > definition.participantes_maximos:
            raise ValidationError({"participantes": ["Se excedió el máximo de participantes definido por la policy."]})

        validated = []
        people = set()
        orders = []
        for index, item in enumerate(participants):
            assignment = item["asignacion"]
            try:
                assignment = AsignacionPostulacion.objects.select_for_update().select_related("usuario").get(
                    pk=assignment.pk,
                )
            except AsignacionPostulacion.DoesNotExist as exc:
                raise ValidationError({"participantes": [f"La asignación de la posición {index + 1} no está activa."]}) from exc
            if assignment.postulacion_id != seguimiento.postulacion_id:
                raise ValidationError({"participantes": ["Cada asignación debe pertenecer a la postulación del seguimiento."]})
            if not assignment.usuario.is_active or not assignment.usuario.activo:
                raise ValidationError({"participantes": ["Cada asignación debe pertenecer a una persona activa."]})

            role = (item.get("rol") or "").strip().upper()
            if not role or role not in definition.roles_participantes:
                raise ValidationError({"participantes": [f"El rol '{role}' no está permitido por la policy."]})
            if definition.validar_composicion_asignaciones:
                if assignment.tipo_participacion != role:
                    raise ValidationError({"participantes": ["El rol participante debe coincidir con la asignación formal."]})
                if assignment.seguimiento_etapa_id != seguimiento.pk:
                    raise ValidationError({"participantes": ["La asignación debe pertenecer al seguimiento de la decisión."]})
                if assignment.orden_cargo != item.get("orden"):
                    raise ValidationError({"participantes": ["El orden participante debe coincidir con el orden de la asignación formal."]})
            if assignment.usuario_id in people:
                raise ValidationError({"participantes": ["Una persona no puede repetirse en la misma decisión."]})
            people.add(assignment.usuario_id)

            order = item.get("orden")
            if order is not None:
                if order < 1:
                    raise ValidationError({"participantes": ["El orden debe ser mayor o igual a uno."]})
                orders.append(order)
            validated.append({"asignacion": assignment, "rol": role, "orden": order})

        if len(orders) != len(set(orders)):
            raise ValidationError({"participantes": ["No se puede repetir el orden de los participantes."]})
        if definition.ordenes_requeridos and tuple(sorted(orders)) != tuple(sorted(definition.ordenes_requeridos)):
            raise ValidationError({"participantes": ["Los órdenes de participantes no coinciden con la policy."]})
        if definition.validar_composicion_asignaciones:
            assignments = {item["asignacion"].pk for item in validated}
            active_assignments = set(AsignacionPostulacion.objects.filter(
                postulacion_id=seguimiento.postulacion_id,
                seguimiento_etapa_id=seguimiento.pk,
                tipo_participacion__in=definition.roles_participantes,
                activo=True,
            ).values_list("pk", flat=True))
            if assignments != active_assignments:
                raise ValidationError({"participantes": ["La decisión debe incluir la composición formal completa del seguimiento."]})
        return validated

    @classmethod
    @transaction.atomic
    def registrar(
        cls,
        *,
        seguimiento,
        codigo,
        resultado,
        registrado_por,
        observaciones="",
        participantes=(),
        reemplaza_decision=None,
    ):
        if not registrado_por or not registrado_por.is_active or not is_staff_user(registrado_por):
            raise ValidationError("Se requiere un usuario administrativo activo para registrar decisiones académicas.")

        try:
            seguimiento = SeguimientoEtapa.objects.select_for_update().select_related(
                "postulacion__modalidad", "etapa",
            ).get(pk=seguimiento.pk)
        except SeguimientoEtapa.DoesNotExist as exc:
            raise ValidationError({"seguimiento_etapa": ["El seguimiento no está activo."]}) from exc

        codigo = (codigo or "").strip()
        resultado = (resultado or "").strip()
        observaciones = (observaciones or "").strip()
        definition = cls._definition(seguimiento, codigo)
        if resultado not in definition.resultados:
            raise ValidationError({"resultado": ["El resultado no está permitido por la policy."]})
        validated_participants = cls._validate_participants(seguimiento, definition, participantes)

        active = DecisionAcademicaEtapa.objects.select_for_update().filter(
            seguimiento_etapa=seguimiento,
            codigo=codigo,
        ).first()
        if active and not reemplaza_decision:
            raise ValidationError({"codigo": ["Ya existe una decisión activa para este código en el seguimiento."]})
        if reemplaza_decision:
            if not active or active.pk != reemplaza_decision.pk:
                raise ValidationError({"reemplaza_decision": ["Solo se puede reemplazar la decisión activa correspondiente a este código y seguimiento."]})
            active.activo = False
            active.save(update_fields=["activo", "updated_at"])

        try:
            with transaction.atomic():
                decision = DecisionAcademicaEtapa.objects.create(
                    seguimiento_etapa=seguimiento,
                    codigo=codigo,
                    resultado=resultado,
                    registrado_por=registrado_por,
                    observaciones=observaciones,
                )
                for item in validated_participants:
                    ParticipacionDecisionAcademica.objects.create(
                        decision=decision,
                        asignacion=item["asignacion"],
                        rol=item["rol"],
                        orden=item["orden"],
                    )
        except IntegrityError as exc:
            raise ValidationError({"codigo": ["No se pudo crear la decisión activa; verifica si ya existe otra versión activa."]}) from exc

        action = "REPLACE_ACADEMIC_DECISION" if active else "REGISTER_ACADEMIC_DECISION"
        previous = f"; decisión anterior {active.pk}" if active else ""
        AuditLog.objects.create(
            usuario=registrado_por,
            accion=action,
            modulo="DECISION_ACADEMICA",
            descripcion=(
                f"Postulación {seguimiento.postulacion.codigo}; seguimiento {seguimiento.pk}; "
                f"decisión {decision.pk}; código {codigo}; resultado {resultado}{previous}."
            ),
        )
        return decision