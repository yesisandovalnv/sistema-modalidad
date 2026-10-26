from __future__ import annotations

from typing import Iterable

from django.core.exceptions import ValidationError
from core.permissions import is_staff_user
from django.db import transaction
from django.db.models.functions import Upper, Trim
from django.utils import timezone

from apps.postulantes.models import AsignacionPostulacion, EventoDefensa, Postulacion, SeguimientoEtapa
from apps.usuarios.models import AuditLog, CustomUser
from apps.notificaciones.events import EventTypes, publish_domain_event


class AsignacionService:
    """Servicio de dominio para administrar asignaciones de actores en postulaciones."""

    STUDENT_ROLE_CODES = {"EST", "ESTUDIANTE"}
    ADMIN_ROLE_CODES = {"ADM", "ADMIN", "ADMINISTRADOR"}
    DOCENTE_ROLE_CODES = {"DOC", "DOCENTE"}
    PROJECT_GRADE_CODE = "PROYECTO_GRADO"
    PROFILE_STAGE_CODE = "PERFIL_PROYECTO"
    SINGLE_ACTIVE_TYPES = {
        AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
        AsignacionPostulacion.TipoParticipacionChoices.DOCENTE_MODALIDAD,
    }

    @staticmethod
    def asignar_actor(
        postulacion: Postulacion,
        usuario_asignado: CustomUser,
        tipo_participacion: str,
        designado_por: CustomUser,
        orden_cargo: int | None = None,
        seguimiento_etapa: SeguimientoEtapa | None = None,
        observaciones: str = "",
    ) -> AsignacionPostulacion:
        AsignacionService._validar_postulacion(postulacion)
        AsignacionService._validar_usuario_responsable(designado_por)
        AsignacionService._validar_usuario_asignado(usuario_asignado)
        tipo_participacion = AsignacionService._normalizar_tipo_participacion(tipo_participacion)
        observaciones = (observaciones or "").strip()

        with transaction.atomic():
            postulacion = (
                Postulacion.objects.select_for_update()
                .select_related("modalidad", "estudiante")
                .get(pk=postulacion.pk)
            )
            usuario_asignado = CustomUser.objects.select_for_update().get(pk=usuario_asignado.pk)
            designado_por = CustomUser.objects.select_for_update().get(pk=designado_por.pk)
            seguimiento_bloqueado = AsignacionService._bloquear_seguimiento_opcional(seguimiento_etapa)

            AsignacionService._validar_contexto_seguimiento(postulacion, seguimiento_bloqueado)
            regla_ocupacion = AsignacionService._obtener_regla_ocupacion_actor(
                postulacion,
                tipo_participacion,
                seguimiento_bloqueado,
            )

            asignaciones_activas = AsignacionPostulacion.objects.select_for_update().filter(
                postulacion=postulacion, activo=True,
            )
            asignaciones_activas_tipo = asignaciones_activas.filter(tipo_participacion=tipo_participacion)
            activos_mismo_contexto = AsignacionService._obtener_asignaciones_tipo_contexto(
                asignaciones_activas,
                tipo_participacion,
                seguimiento_bloqueado,
            )

            AsignacionService._validar_duplicado_activo(
                queryset=activos_mismo_contexto,
                usuario_asignado=usuario_asignado,
                tipo_participacion=tipo_participacion,
                orden_cargo=orden_cargo,
            )
            AsignacionService._validar_reglas_modalidad(
                queryset_tipo=asignaciones_activas_tipo,
                queryset_contexto=activos_mismo_contexto,
                postulacion=postulacion,
                tipo_participacion=tipo_participacion,
                orden_cargo=orden_cargo,
                seguimiento_etapa=seguimiento_bloqueado,
                usuario_asignado=usuario_asignado,
                queryset_activas=asignaciones_activas,
            )
            AsignacionService._validar_ocupacion_actor(
                usuario_asignado,
                regla_ocupacion,
                asignaciones_activas,
            )
            AsignacionService._validar_reglas_actor(postulacion, usuario_asignado, tipo_participacion, orden_cargo)

            asignacion = AsignacionPostulacion.objects.create(
                postulacion=postulacion,
                usuario=usuario_asignado,
                tipo_participacion=tipo_participacion,
                orden_cargo=orden_cargo,
                fecha_designacion=timezone.now(),
                designado_por=designado_por,
                seguimiento_etapa=seguimiento_bloqueado,
                observaciones=observaciones,
                activo=True,
            )
            AsignacionService._registrar_auditoria(
                usuario=designado_por,
                accion="ASSIGN",
                modulo="ASIGNACIONES",
                descripcion=(
                    f"Se asignó {tipo_participacion} a {usuario_asignado} en la postulación "
                    f"{postulacion.codigo}."
                ),
            )
            publish_domain_event(EventTypes.ACTOR_ASIGNADO, asignacion, designado_por, postulacion,
                {"usuario_id": usuario_asignado.pk, "actor_tipo": tipo_participacion}, f"ACTOR_ASIGNADO:{asignacion.pk}")
            return asignacion

    @staticmethod
    def obtener_candidatos_elegibles(
        postulacion: Postulacion,
        tipo_participacion: str,
        orden_cargo: int | None,
        seguimiento_etapa: SeguimientoEtapa | None,
        asignacion_actual: AsignacionPostulacion | None = None,
        regla_ocupacion_actor: dict | None = None,
    ):
        """Proyecta las reglas actuales de asignación sobre un queryset de candidatos."""
        AsignacionService._validar_postulacion(postulacion)
        tipo_participacion = AsignacionService._normalizar_tipo_participacion(tipo_participacion)
        AsignacionService._validar_contexto_seguimiento(postulacion, seguimiento_etapa)
        regla_ocupacion = regla_ocupacion_actor or AsignacionService._obtener_regla_ocupacion_actor(
            postulacion,
            tipo_participacion,
            seguimiento_etapa,
        )

        if tipo_participacion == AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL and orden_cargo is None:
            raise ValidationError("El tribunal requiere un orden de cargo.")
        if asignacion_actual is not None and (
            asignacion_actual.postulacion_id != postulacion.pk
            or not asignacion_actual.activo
            or asignacion_actual.tipo_participacion != tipo_participacion
            or asignacion_actual.orden_cargo != orden_cargo
            or asignacion_actual.seguimiento_etapa_id != getattr(seguimiento_etapa, "pk", None)
        ):
            raise ValidationError("La asignación actual no corresponde a esta posición.")

        candidatos = AsignacionService._filtrar_usuarios_base_elegibles(
            CustomUser.all_objects.filter(is_active=True, activo=True, role__isnull=False),
            postulacion,
        ).select_related("role")

        asignaciones_activas = AsignacionPostulacion.objects.filter(
            postulacion=postulacion,
            activo=True,
        )
        if asignacion_actual is not None:
            asignaciones_activas = asignaciones_activas.exclude(pk=asignacion_actual.pk)
            candidatos = candidatos.exclude(pk=asignacion_actual.usuario_id)

        asignaciones_tipo_contexto = AsignacionService._obtener_asignaciones_tipo_contexto(
            asignaciones_activas,
            tipo_participacion,
            seguimiento_etapa,
        )
        if not AsignacionService._ocupacion_actor_aplica(regla_ocupacion):
            candidatos = candidatos.exclude(pk__in=asignaciones_tipo_contexto.values("usuario_id"))

        if (
            tipo_participacion in AsignacionService.SINGLE_ACTIVE_TYPES
            and asignacion_actual is None
            and asignaciones_activas.filter(tipo_participacion=tipo_participacion).exists()
        ):
            return candidatos.none()

        ocupaciones_vigentes = list(asignaciones_activas.select_related("seguimiento_etapa__etapa").order_by("tipo_participacion", "orden_cargo", "pk"))
        detalles = AsignacionService._detallar_ocupaciones(postulacion, ocupaciones_vigentes)
        for candidato in candidatos:
            estado = AsignacionService._evaluar_ocupacion_vigente(
                postulacion=postulacion,
                usuario=candidato,
                asignacion_actual=asignacion_actual,
                queryset_activas=ocupaciones_vigentes,
                regla_ocupacion=regla_ocupacion,
            )
            candidato.elegible = estado["elegible"]
            candidato.motivo_bloqueo = estado["motivo_bloqueo"]
            candidato.asignaciones_vigentes = estado["asignaciones_vigentes"]
            candidato.asignaciones_vigentes_detalle = detalles.get(candidato.pk, [])

        return candidatos

    @staticmethod
    def finalizar_asignacion(
        asignacion: AsignacionPostulacion,
        usuario: CustomUser,
        observaciones: str = "",
    ) -> AsignacionPostulacion:
        AsignacionService._validar_asignacion(asignacion)
        AsignacionService._validar_usuario_responsable(usuario)
        observaciones = (observaciones or "").strip()

        with transaction.atomic():
            asignacion = AsignacionService._bloquear_asignacion(asignacion.pk)
            AsignacionService._validar_asignacion_activa(asignacion)
            AsignacionService._validar_no_participa_en_evento_activo(asignacion)

            asignacion.fecha_finalizacion = timezone.now()
            asignacion.activo = False
            if observaciones:
                asignacion.observaciones = AsignacionService._combinar_observaciones(
                    asignacion.observaciones,
                    observaciones,
                )
            asignacion.save(
                update_fields=["fecha_finalizacion", "activo", "observaciones", "updated_at"],
            )
            AsignacionService._registrar_auditoria(
                usuario=usuario,
                accion="FINISH",
                modulo="ASIGNACIONES",
                descripcion=(
                    f"Se finalizó la asignación {asignacion.tipo_participacion} de {asignacion.usuario} "
                    f"en la postulación {asignacion.postulacion.codigo}."
                ),
            )
            publish_domain_event(EventTypes.ASIGNACION_FINALIZADA, asignacion, usuario, asignacion.postulacion,
                {"usuario_id": asignacion.usuario_id, "actor_tipo": asignacion.tipo_participacion}, f"ASIGNACION_FINALIZADA:{asignacion.pk}:{asignacion.fecha_finalizacion.isoformat()}")
            return asignacion

    @staticmethod
    def reemplazar_actor(
        asignacion_actual: AsignacionPostulacion,
        nuevo_usuario: CustomUser,
        usuario_responsable: CustomUser,
        observaciones: str = "",
    ) -> AsignacionPostulacion:
        AsignacionService._validar_asignacion(asignacion_actual)
        AsignacionService._validar_usuario_asignado(nuevo_usuario)
        AsignacionService._validar_usuario_responsable(usuario_responsable)
        observaciones = (observaciones or "").strip()

        with transaction.atomic():
            asignacion_actual = AsignacionService._bloquear_asignacion(asignacion_actual.pk)
            AsignacionService._validar_asignacion_activa(asignacion_actual)
            if nuevo_usuario.pk == asignacion_actual.usuario_id:
                raise ValidationError("La persona actual no puede ser su propio reemplazo.")

            AsignacionService.finalizar_asignacion(
                asignacion=asignacion_actual,
                usuario=usuario_responsable,
                observaciones=observaciones or "Asignación finalizada por reemplazo.",
            )
            nueva_asignacion = AsignacionService.asignar_actor(
                postulacion=asignacion_actual.postulacion,
                usuario_asignado=nuevo_usuario,
                tipo_participacion=asignacion_actual.tipo_participacion,
                designado_por=usuario_responsable,
                orden_cargo=asignacion_actual.orden_cargo,
                seguimiento_etapa=asignacion_actual.seguimiento_etapa,
                observaciones=observaciones,
            )
            AsignacionService._registrar_auditoria(
                usuario=usuario_responsable,
                accion="REPLACE",
                modulo="ASIGNACIONES",
                descripcion=(
                    f"Se reemplazó {asignacion_actual.usuario} por {nuevo_usuario} como "
                    f"{asignacion_actual.tipo_participacion} en la postulación {asignacion_actual.postulacion.codigo}."
                ),
            )
            publish_domain_event(EventTypes.ACTOR_REEMPLAZADO, nueva_asignacion, usuario_responsable, asignacion_actual.postulacion,
                {"usuario_id": nuevo_usuario.pk, "actor_tipo": asignacion_actual.tipo_participacion}, f"ACTOR_REEMPLAZADO:{asignacion_actual.pk}:{nueva_asignacion.pk}")
            return nueva_asignacion

    @staticmethod
    def listar_activos(
        postulacion: Postulacion,
        tipo_participacion: str | None = None,
    ) -> Iterable[AsignacionPostulacion]:
        AsignacionService._validar_postulacion(postulacion)
        queryset = AsignacionPostulacion.objects.filter(postulacion=postulacion, activo=True).select_related(
            "usuario",
            "usuario__role",
            "designado_por",
            "seguimiento_etapa",
            "seguimiento_etapa__etapa",
        )
        if tipo_participacion:
            queryset = queryset.filter(
                tipo_participacion=AsignacionService._normalizar_tipo_participacion(tipo_participacion)
            )
        return queryset.order_by("tipo_participacion", "orden_cargo", "-fecha_designacion")

    @staticmethod
    def obtener_tutor_activo(postulacion: Postulacion) -> AsignacionPostulacion | None:
        return (
            AsignacionService.listar_activos(
                postulacion,
                AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
            )
            .first()
        )

    @staticmethod
    def obtener_docente_modalidad_activo(postulacion: Postulacion) -> AsignacionPostulacion | None:
        return (
            AsignacionService.listar_activos(
                postulacion,
                AsignacionPostulacion.TipoParticipacionChoices.DOCENTE_MODALIDAD,
            )
            .first()
        )

    @staticmethod
    def obtener_tribunal_activo(
        postulacion: Postulacion,
        seguimiento_etapa: SeguimientoEtapa | None = None,
    ) -> Iterable[AsignacionPostulacion]:
        queryset = AsignacionService.listar_activos(
            postulacion,
            AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
        )
        if seguimiento_etapa is None:
            return queryset.order_by("orden_cargo", "fecha_designacion")
        seguimiento_etapa = AsignacionService._bloquear_seguimiento_opcional(seguimiento_etapa)
        AsignacionService._validar_contexto_seguimiento(postulacion, seguimiento_etapa)
        return queryset.filter(seguimiento_etapa=seguimiento_etapa).order_by("orden_cargo", "fecha_designacion")

    @staticmethod
    def _registrar_auditoria(
        usuario: CustomUser,
        accion: str,
        modulo: str,
        descripcion: str,
    ) -> AuditLog:
        return AuditLog.objects.create(
            usuario=usuario,
            accion=accion,
            modulo=modulo,
            descripcion=descripcion,
        )

    @staticmethod
    def _normalizar_tipo_participacion(tipo_participacion: str) -> str:
        tipo_normalizado = (tipo_participacion or "").strip().upper()
        validos = {choice for choice, _label in AsignacionPostulacion.TipoParticipacionChoices.choices}
        if tipo_normalizado not in validos:
            raise ValidationError("El tipo de participación no es válido.")
        return tipo_normalizado

    @staticmethod
    def _validar_reglas_actor(
        postulacion: Postulacion,
        usuario_asignado: CustomUser,
        tipo_participacion: str,
        orden_cargo: int | None,
    ) -> None:
        if usuario_asignado.pk == postulacion.estudiante_id:
            raise ValidationError("El estudiante de la postulación no puede ser asignado como actor académico.")

        if not AsignacionService._filtrar_usuarios_base_elegibles(
            CustomUser.all_objects.filter(pk=usuario_asignado.pk),
            postulacion,
        ).exists():
            raise ValidationError("El usuario asignado no tiene un rol autorizado para esta participación.")

        if tipo_participacion == AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL and orden_cargo is None:
            raise ValidationError("El tribunal requiere un orden de cargo.")

    @staticmethod
    @staticmethod
    def _describir_asignacion_vigente(asignacion: AsignacionPostulacion) -> str:
        if asignacion.tipo_participacion == AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL:
            if asignacion.orden_cargo is not None:
                return f"Tribunal {asignacion.orden_cargo}"
            return "Tribunal"
        if asignacion.tipo_participacion == AsignacionPostulacion.TipoParticipacionChoices.TUTOR:
            return "Tutor"
        if asignacion.tipo_participacion == AsignacionPostulacion.TipoParticipacionChoices.DOCENTE_MODALIDAD:
            return "Docente de modalidad"
        if asignacion.tipo_participacion == AsignacionPostulacion.TipoParticipacionChoices.PRESIDENTE:
            return "Presidente"
        if asignacion.tipo_participacion == AsignacionPostulacion.TipoParticipacionChoices.SECRETARIO:
            return "Secretario"
        return asignacion.get_tipo_participacion_display() or asignacion.tipo_participacion.title()

    @staticmethod
    def _detallar_ocupaciones(postulacion, asignaciones):
        """Identifica posiciones desde la configuración vigente, sin decidir elegibilidad."""
        from apps.modalidades.policies import ModalidadPolicyRegistry

        seguimiento = postulacion.seguimientos_etapa.filter(
            activo=True, estado__in=("EN_PROCESO", "OBSERVADA"),
        ).select_related("etapa").order_by("etapa__orden", "pk").first()
        config = ModalidadPolicyRegistry.get(postulacion).get_configuracion_actores(postulacion, seguimiento) or {}
        detalles = {}
        for item in asignaciones:
            if not item.activo or item.postulacion_id != postulacion.pk:
                continue
            ambito = "ETAPA" if item.seguimiento_etapa_id is not None else "POSTULACION"
            posiciones = [
                position for group in config.get("grupos", [])
                if group.get("tipo_participacion") == item.tipo_participacion and group.get("ambito") == ambito
                and (ambito == "POSTULACION" or group.get("codigo_etapa") == item.seguimiento_etapa.etapa.codigo)
                for position in group.get("posiciones", [])
                if position.get("orden_cargo") == item.orden_cargo
            ]
            detalles.setdefault(item.usuario_id, []).append({
                "id": item.pk, "postulacion": item.postulacion_id, "usuario": item.usuario_id,
                "codigo_posicion": posiciones[0].get("clave") if len(posiciones) == 1 else None,
                "tipo_participacion": item.tipo_participacion, "ambito": ambito,
                "seguimiento_etapa": item.seguimiento_etapa_id, "orden_cargo": item.orden_cargo,
                "activo": item.activo,
            })
        return detalles

    @staticmethod
    def _evaluar_ocupacion_vigente(
        postulacion: Postulacion,
        usuario: CustomUser | int,
        asignacion_actual: AsignacionPostulacion | None = None,
        queryset_activas: Iterable[AsignacionPostulacion] | None = None,
        regla_ocupacion: dict | None = None,
    ) -> dict:
        usuario_id = usuario.pk if isinstance(usuario, CustomUser) else int(usuario)
        if queryset_activas is None or hasattr(queryset_activas, "filter"):
            queryset = queryset_activas if queryset_activas is not None else AsignacionPostulacion.objects.all()
            queryset = queryset.filter(postulacion=postulacion, activo=True, usuario_id=usuario_id)
            if asignacion_actual is not None:
                queryset = queryset.exclude(pk=asignacion_actual.pk)
            asignaciones = list(queryset.order_by("tipo_participacion", "orden_cargo", "pk"))
        else:
            asignaciones = [
                item for item in queryset_activas
                if item.postulacion_id == postulacion.pk and item.activo and item.usuario_id == usuario_id
                and item.pk != getattr(asignacion_actual, "pk", None)
            ]
        ocupaciones = [AsignacionService._describir_asignacion_vigente(item) for item in asignaciones]
        if not AsignacionService._ocupacion_actor_aplica(regla_ocupacion):
            return {"elegible": True, "motivo_bloqueo": None, "asignaciones_vigentes": ocupaciones}
        relevantes = regla_ocupacion.get("relevantes") or tuple(
            choice for choice, _label in AsignacionPostulacion.TipoParticipacionChoices.choices
        )
        if not any(item.tipo_participacion in relevantes for item in asignaciones):
            return {"elegible": True, "motivo_bloqueo": None, "asignaciones_vigentes": ocupaciones}
        return {
            "elegible": False,
            "motivo_bloqueo": regla_ocupacion.get(
                "motivo",
                "YA_TIENE_ASIGNACION_VIGENTE_EN_POSTULACION",
            ),
            "asignaciones_vigentes": ocupaciones,
        }

    @staticmethod
    def _obtener_regla_ocupacion_actor(
        postulacion: Postulacion,
        tipo_participacion: str,
        seguimiento_etapa: SeguimientoEtapa | None,
    ) -> dict | None:
        from apps.modalidades.policies import ModalidadPolicyRegistry

        policy = ModalidadPolicyRegistry.get(postulacion)
        configuracion = policy.get_configuracion_actores(postulacion, seguimiento_etapa) or {}
        for grupo in configuracion.get("grupos", ()):
            if grupo.get("tipo_participacion") != tipo_participacion:
                continue
            if grupo.get("ambito") == "ETAPA":
                if (
                    seguimiento_etapa is None
                    or grupo.get("codigo_etapa") != seguimiento_etapa.etapa.codigo
                ):
                    continue
            return grupo.get("ocupacion_actor")
        return None

    @staticmethod
    def _ocupacion_actor_aplica(regla_ocupacion: dict | None) -> bool:
        return isinstance(regla_ocupacion, dict) and regla_ocupacion.get("aplica") is True

    @staticmethod
    def _validar_ocupacion_actor(usuario, regla_ocupacion, queryset_activas) -> None:
        if not AsignacionService._ocupacion_actor_aplica(regla_ocupacion):
            return
        relevantes = regla_ocupacion.get("relevantes") or tuple(
            choice for choice, _label in AsignacionPostulacion.TipoParticipacionChoices.choices
        )
        if queryset_activas.filter(usuario=usuario, tipo_participacion__in=relevantes).exists():
            raise ValidationError(
                "El usuario ya tiene otra asignación vigente en la misma postulación.",
                code=regla_ocupacion.get("motivo", "ocupacion_actor_vigente"),
            )

    @staticmethod
    def _validar_reglas_modalidad(
        queryset_tipo,
        queryset_contexto,
        postulacion: Postulacion,
        tipo_participacion: str,
        orden_cargo: int | None,
        seguimiento_etapa: SeguimientoEtapa | None,
        usuario_asignado: CustomUser,
        queryset_activas,
    ) -> None:
        if tipo_participacion in AsignacionService.SINGLE_ACTIVE_TYPES and queryset_tipo.exists():
            raise ValidationError(f"La postulación ya tiene un {tipo_participacion} activo.")

        from apps.modalidades.policies import ModalidadPolicyRegistry
        ModalidadPolicyRegistry.get(postulacion).validar_asignacion(
            queryset_tipo=queryset_tipo, queryset_contexto=queryset_contexto,
            postulacion=postulacion,
            tipo_participacion=tipo_participacion, seguimiento_etapa=seguimiento_etapa,
            orden_cargo=orden_cargo, usuario_asignado=usuario_asignado,
            queryset_activas=queryset_activas,
        )

    @staticmethod
    def _validar_duplicado_activo(
        queryset,
        usuario_asignado: CustomUser,
        tipo_participacion: str,
        orden_cargo: int | None,
    ) -> None:
        if queryset.filter(usuario=usuario_asignado).exists():
            raise ValidationError(
                f"El usuario ya tiene una asignación activa como {tipo_participacion} en el mismo contexto."
            )

        if orden_cargo is not None and queryset.filter(usuario=usuario_asignado, orden_cargo=orden_cargo).exists():
            raise ValidationError("Ya existe una asignación activa idéntica para el mismo usuario y orden.")

    @staticmethod
    def _filtrar_por_contexto(queryset, seguimiento_etapa: SeguimientoEtapa | None):
        if seguimiento_etapa is None:
            return queryset.filter(seguimiento_etapa__isnull=True)
        return queryset.filter(seguimiento_etapa=seguimiento_etapa)

    @staticmethod
    def _filtrar_usuarios_base_elegibles(queryset, postulacion: Postulacion):
        return queryset.annotate(
            _assignment_role_code=Upper(Trim("role__codigo")),
        ).exclude(
            pk=postulacion.estudiante_id,
        ).exclude(
            _assignment_role_code__in=AsignacionService.STUDENT_ROLE_CODES,
        ).exclude(
            _assignment_role_code="",
        )

    @staticmethod
    def _obtener_asignaciones_tipo_contexto(
        queryset_activas,
        tipo_participacion: str,
        seguimiento_etapa: SeguimientoEtapa | None,
    ):
        return AsignacionService._filtrar_por_contexto(
            queryset_activas.filter(tipo_participacion=tipo_participacion),
            seguimiento_etapa,
        )

    @staticmethod
    def _combinar_observaciones(actuales: str, nuevas: str) -> str:
        actuales = (actuales or "").strip()
        nuevas = (nuevas or "").strip()
        if not actuales:
            return nuevas
        if not nuevas:
            return actuales
        return f"{actuales}\n{nuevas}"

    @staticmethod
    def _bloquear_asignacion(asignacion_id: int) -> AsignacionPostulacion:
        return (
            AsignacionPostulacion.all_objects.select_for_update()
            .select_related(
                "postulacion",
                "postulacion__modalidad",
                "postulacion__estudiante",
                "usuario",
            )
            .get(pk=asignacion_id)
        )

    @staticmethod
    def _bloquear_seguimiento_opcional(
        seguimiento_etapa: SeguimientoEtapa | None,
    ) -> SeguimientoEtapa | None:
        if seguimiento_etapa is None:
            return None
        if not isinstance(seguimiento_etapa, SeguimientoEtapa) or not seguimiento_etapa.pk:
            raise ValidationError("El seguimiento de etapa no es válido.")
        return (
            SeguimientoEtapa.objects.select_for_update()
            .select_related("postulacion", "etapa", "postulacion__modalidad")
            .get(pk=seguimiento_etapa.pk)
        )

    @staticmethod
    def _validar_contexto_seguimiento(
        postulacion: Postulacion,
        seguimiento_etapa: SeguimientoEtapa | None,
    ) -> None:
        if seguimiento_etapa is None:
            return
        if seguimiento_etapa.postulacion_id != postulacion.pk:
            raise ValidationError("El seguimiento de etapa no pertenece a la postulación indicada.")

    @staticmethod
    def _validar_asignacion_activa(asignacion: AsignacionPostulacion) -> None:
        if not asignacion.activo:
            raise ValidationError("La asignación ya está finalizada.")

    @staticmethod
    def _validar_no_participa_en_evento_activo(asignacion: AsignacionPostulacion) -> None:
        participaciones = asignacion.participaciones_evento.select_related("evento").filter(activo=True)
        for participacion in participaciones:
            evento = participacion.evento
            if evento is None or not evento.activo:
                continue
            if evento.estado in {EventoDefensa.Estado.PROGRAMADA, EventoDefensa.Estado.EN_CURSO}:
                raise ValidationError(
                    "No se puede finalizar la asignación porque participa activamente en un evento "
                    "PROGRAMADA o EN_CURSO."
                )

    @staticmethod
    def _validar_postulacion(postulacion: Postulacion) -> None:
        if not isinstance(postulacion, Postulacion) or not postulacion.pk:
            raise ValidationError("La postulación es obligatoria.")

    @staticmethod
    def _validar_asignacion(asignacion: AsignacionPostulacion) -> None:
        if not isinstance(asignacion, AsignacionPostulacion) or not asignacion.pk:
            raise ValidationError("La asignación es obligatoria.")

    @staticmethod
    def _validar_usuario_asignado(usuario: CustomUser) -> None:
        if not isinstance(usuario, CustomUser) or not usuario.pk:
            raise ValidationError("El usuario asignado es obligatorio.")
        if not usuario.is_active or not usuario.activo:
            raise ValidationError("No se puede asignar un usuario inactivo.")

    @staticmethod
    def _validar_usuario_responsable(usuario: CustomUser) -> None:
        if not isinstance(usuario, CustomUser) or not usuario.pk:
            raise ValidationError("El usuario responsable es obligatorio.")
        if not usuario.is_active:
            raise ValidationError("El usuario responsable no está activo.")
        if not is_staff_user(usuario):
            raise ValidationError("El usuario responsable no tiene permisos administrativos para designar actores.")
