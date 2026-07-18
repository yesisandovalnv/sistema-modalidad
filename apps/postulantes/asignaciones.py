from __future__ import annotations

from typing import Iterable

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.postulantes.models import AsignacionPostulacion, Postulacion, SeguimientoEtapa
from apps.usuarios.models import AuditLog, CustomUser


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
            AsignacionService._validar_reglas_actor(postulacion, usuario_asignado, tipo_participacion, orden_cargo)

            asignaciones_activas_tipo = AsignacionPostulacion.objects.select_for_update().filter(
                postulacion=postulacion,
                tipo_participacion=tipo_participacion,
                activo=True,
            )
            activos_mismo_contexto = AsignacionService._filtrar_por_contexto(
                asignaciones_activas_tipo,
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
            )

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
            return asignacion

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

        role_code = ((getattr(usuario_asignado.role, "codigo", "") or "")).strip().upper()
        if role_code in AsignacionService.STUDENT_ROLE_CODES or not role_code:
            raise ValidationError("El usuario asignado no tiene un rol autorizado para esta participación.")

        if tipo_participacion == AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL and orden_cargo is None:
            raise ValidationError("El tribunal requiere un orden de cargo.")

    @staticmethod
    def _validar_reglas_modalidad(
        queryset_tipo,
        queryset_contexto,
        postulacion: Postulacion,
        tipo_participacion: str,
        orden_cargo: int | None,
        seguimiento_etapa: SeguimientoEtapa | None,
    ) -> None:
        if tipo_participacion in AsignacionService.SINGLE_ACTIVE_TYPES and queryset_tipo.exists():
            raise ValidationError(f"La postulación ya tiene un {tipo_participacion} activo.")

        if (
            tipo_participacion == AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL
            and postulacion.modalidad.codigo == AsignacionService.PROJECT_GRADE_CODE
            and seguimiento_etapa is not None
            and seguimiento_etapa.etapa.codigo == AsignacionService.PROFILE_STAGE_CODE
        ):
            if queryset_contexto.count() >= 3:
                raise ValidationError(
                    "Proyecto de Grado admite como máximo tres miembros activos de tribunal en el perfil."
                )
            if orden_cargo is not None and queryset_contexto.filter(orden_cargo=orden_cargo).exists():
                raise ValidationError("Ya existe un miembro activo del tribunal con ese orden de cargo.")

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
        if not usuario.is_active:
            raise ValidationError("No se puede asignar un usuario inactivo.")

    @staticmethod
    def _validar_usuario_responsable(usuario: CustomUser) -> None:
        if not isinstance(usuario, CustomUser) or not usuario.pk:
            raise ValidationError("El usuario responsable es obligatorio.")
        if not usuario.is_active:
            raise ValidationError("El usuario responsable no está activo.")
        role_code = ((getattr(usuario.role, "codigo", "") or "")).strip().upper()
        if not (usuario.is_staff or usuario.is_superuser or role_code in AsignacionService.ADMIN_ROLE_CODES):
            raise ValidationError("El usuario responsable no tiene permisos administrativos para designar actores.")
