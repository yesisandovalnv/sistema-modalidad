from __future__ import annotations

from typing import Iterable

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.academico.models import EtapaModalidad
from apps.postulantes.models import EstadoPostulacion, HistorialEstado, Postulacion, SeguimientoEtapa
from apps.usuarios.models import CustomUser
from apps.modalidades.policies import ModalidadPolicyRegistry
from apps.notificaciones.events import EventTypes, publish_domain_event


class WorkflowService:
    """Servicio generico para operar el flujo de etapas por modalidad."""

    CLOSING_STAGE_CODE = "CIERRE_DOCUMENTAL"

    @staticmethod
    def inicializar_flujo(postulacion: Postulacion, usuario: CustomUser) -> list[SeguimientoEtapa]:
        WorkflowService._validar_postulacion(postulacion)
        WorkflowService._validar_postulacion_operativa(postulacion)
        WorkflowService._validar_usuario(usuario)

        with transaction.atomic():
            postulacion = (
                Postulacion.objects.select_for_update()
                .select_related("modalidad")
                .get(pk=postulacion.pk)
            )
            etapas = list(WorkflowService._obtener_etapas_activas(postulacion))
            if not etapas:
                raise ValidationError("La modalidad no tiene etapas activas configuradas.")
            policy = ModalidadPolicyRegistry.get(postulacion)

            seguimientos: list[SeguimientoEtapa] = []
            for etapa in etapas:
                seguimiento, _created = SeguimientoEtapa.objects.get_or_create(
                    postulacion=postulacion,
                    etapa=etapa,
                    numero_intento=1,
                    defaults={"estado": SeguimientoEtapa.EstadoChoices.PENDIENTE},
                )
                seguimientos.append(seguimiento)

            cierre_policy = policy.get_cierre_policy()
            if cierre_policy:
                cierre_policy.inicializar_requisitos(postulacion)

            return sorted(
                seguimientos,
                key=lambda item: (item.etapa.orden, item.numero_intento),
            )

    @staticmethod
    def iniciar_etapa(seguimiento: SeguimientoEtapa, usuario: CustomUser) -> SeguimientoEtapa:
        WorkflowService._validar_seguimiento(seguimiento)
        WorkflowService._validar_usuario(usuario)
        ModalidadPolicyRegistry.get(seguimiento.postulacion)

        with transaction.atomic():
            seguimiento = WorkflowService._bloquear_seguimiento(seguimiento.pk)
            WorkflowService._validar_inicio_etapa(seguimiento, lock=True)

            seguimiento.estado = SeguimientoEtapa.EstadoChoices.EN_PROCESO
            seguimiento.fecha_inicio = seguimiento.fecha_inicio or timezone.now()
            seguimiento.abierta_por = usuario
            seguimiento.save(
                update_fields=["estado", "fecha_inicio", "abierta_por", "updated_at"],
            )
            publish_domain_event(EventTypes.ETAPA_INICIADA, seguimiento, usuario, seguimiento.postulacion,
                {"etapa": seguimiento.etapa.nombre}, f"ETAPA_INICIADA:{seguimiento.pk}:{seguimiento.updated_at.isoformat()}")

            WorkflowService._actualizar_estado_general(
                postulacion=seguimiento.postulacion,
                codigo_estado="EN_PROCESO",
                usuario=usuario,
                comentario=f"Se inicio la etapa {seguimiento.etapa.codigo}.",
                strict=False,
            )

            return seguimiento

    @staticmethod
    def observar_etapa(
        seguimiento: SeguimientoEtapa,
        usuario: CustomUser,
        observaciones: str,
    ) -> SeguimientoEtapa:
        WorkflowService._validar_seguimiento(seguimiento)
        WorkflowService._validar_usuario(usuario)
        observaciones = (observaciones or "").strip()
        if not observaciones:
            raise ValidationError("Las observaciones son obligatorias.")

        with transaction.atomic():
            seguimiento = WorkflowService._bloquear_seguimiento(seguimiento.pk)
            WorkflowService._validar_observacion_etapa(seguimiento)

            seguimiento.estado = SeguimientoEtapa.EstadoChoices.OBSERVADA
            seguimiento.observaciones = WorkflowService._combinar_observaciones(
                seguimiento.observaciones,
                observaciones,
            )
            seguimiento.save(update_fields=["estado", "observaciones", "updated_at"])
            return seguimiento

    @staticmethod
    def aprobar_etapa(
        seguimiento: SeguimientoEtapa,
        usuario: CustomUser,
        observaciones: str = "",
        actualizar_estado_general: bool = True,
    ) -> SeguimientoEtapa:
        WorkflowService._validar_seguimiento(seguimiento)
        WorkflowService._validar_usuario(usuario)

        with transaction.atomic():
            seguimiento = WorkflowService._bloquear_seguimiento(seguimiento.pk)
            WorkflowService._validar_aprobacion_etapa(seguimiento)
            policy = ModalidadPolicyRegistry.get(seguimiento.postulacion)

            seguimiento.estado = SeguimientoEtapa.EstadoChoices.APROBADA
            seguimiento.fecha_fin = timezone.now()
            seguimiento.cerrada_por = usuario
            if observaciones.strip():
                seguimiento.observaciones = WorkflowService._combinar_observaciones(
                    seguimiento.observaciones,
                    observaciones,
                )
            seguimiento.save(
                update_fields=["estado", "fecha_fin", "cerrada_por", "observaciones", "updated_at"],
            )
            publish_domain_event(EventTypes.ETAPA_APROBADA, seguimiento, usuario, seguimiento.postulacion,
                {"etapa": seguimiento.etapa.nombre}, f"ETAPA_APROBADA:{seguimiento.pk}:{seguimiento.updated_at.isoformat()}")

            final_codes = {x.codigo for x in policy.get_etapas_finales()}
            if (actualizar_estado_general and seguimiento.etapa.codigo in final_codes
                    and seguimiento.etapa.codigo != WorkflowService.CLOSING_STAGE_CODE
                    and policy.get_cierre_policy()):
                WorkflowService._actualizar_estado_general(
                    postulacion=seguimiento.postulacion,
                    codigo_estado="CONCLUIDA",
                    usuario=usuario,
                    comentario="La postulacion fue concluida mediante el cierre documental.",
                    strict=True,
                )

            return seguimiento

    @staticmethod
    def rechazar_etapa(
        seguimiento: SeguimientoEtapa,
        usuario: CustomUser,
        observaciones: str = "",
    ) -> SeguimientoEtapa:
        WorkflowService._validar_seguimiento(seguimiento)
        WorkflowService._validar_usuario(usuario)

        with transaction.atomic():
            seguimiento = WorkflowService._bloquear_seguimiento(seguimiento.pk)
            WorkflowService._validar_rechazo_etapa(seguimiento)

            seguimiento.estado = SeguimientoEtapa.EstadoChoices.RECHAZADA
            seguimiento.fecha_fin = timezone.now()
            seguimiento.cerrada_por = usuario
            if observaciones.strip():
                seguimiento.observaciones = WorkflowService._combinar_observaciones(
                    seguimiento.observaciones,
                    observaciones,
                )
            seguimiento.save(
                update_fields=["estado", "fecha_fin", "cerrada_por", "observaciones", "updated_at"],
            )
            publish_domain_event(EventTypes.ETAPA_RECHAZADA, seguimiento, usuario, seguimiento.postulacion,
                {"etapa": seguimiento.etapa.nombre}, f"ETAPA_RECHAZADA:{seguimiento.pk}:{seguimiento.updated_at.isoformat()}")
            return seguimiento

    @staticmethod
    def omitir_etapa(
        seguimiento: SeguimientoEtapa,
        usuario: CustomUser,
        observaciones: str = "",
    ) -> SeguimientoEtapa:
        WorkflowService._validar_seguimiento(seguimiento)
        WorkflowService._validar_usuario(usuario)

        with transaction.atomic():
            seguimiento = WorkflowService._bloquear_seguimiento(seguimiento.pk)
            WorkflowService._validar_omision_etapa(seguimiento)

            seguimiento.estado = SeguimientoEtapa.EstadoChoices.OMITIDA
            seguimiento.fecha_fin = timezone.now()
            seguimiento.cerrada_por = usuario
            if observaciones.strip():
                seguimiento.observaciones = WorkflowService._combinar_observaciones(
                    seguimiento.observaciones,
                    observaciones,
                )
            seguimiento.save(
                update_fields=["estado", "fecha_fin", "cerrada_por", "observaciones", "updated_at"],
            )
            return seguimiento

    @staticmethod
    def crear_nuevo_intento(
        postulacion: Postulacion,
        etapa: EtapaModalidad,
        usuario: CustomUser,
    ) -> SeguimientoEtapa:
        WorkflowService._validar_postulacion(postulacion)
        WorkflowService._validar_usuario(usuario)
        if not isinstance(etapa, EtapaModalidad) or not etapa.pk:
            raise ValidationError("La etapa es obligatoria.")

        with transaction.atomic():
            postulacion = Postulacion.objects.select_for_update().select_related("modalidad").get(pk=postulacion.pk)
            etapa = EtapaModalidad.objects.select_for_update().get(pk=etapa.pk)

            if postulacion.modalidad_id != etapa.modalidad_id:
                raise ValidationError("La etapa no pertenece a la modalidad de la postulacion.")
            if not etapa.permite_repeticion:
                raise ValidationError("La etapa no permite crear un nuevo intento.")

            seguimientos = list(
                SeguimientoEtapa.objects.select_for_update()
                .filter(postulacion=postulacion, etapa=etapa)
                .order_by("numero_intento")
            )
            if not seguimientos:
                raise ValidationError("La etapa aun no fue inicializada para esta postulacion.")

            ultimo = seguimientos[-1]
            if ultimo.estado != SeguimientoEtapa.EstadoChoices.RECHAZADA:
                raise ValidationError("Solo se puede crear un nuevo intento a partir de una etapa rechazada.")

            ModalidadPolicyRegistry.get(postulacion).validar_nuevo_intento(
                postulacion=postulacion,
                etapa=etapa,
                ultimo_seguimiento=ultimo,
            )

            nuevo_numero = ultimo.numero_intento + 1
            if SeguimientoEtapa.objects.filter(
                postulacion=postulacion,
                etapa=etapa,
                numero_intento=nuevo_numero,
            ).exists():
                raise ValidationError("Ya existe un seguimiento para ese intento.")

            return SeguimientoEtapa.objects.create(
                postulacion=postulacion,
                etapa=etapa,
                estado=SeguimientoEtapa.EstadoChoices.PENDIENTE,
                numero_intento=nuevo_numero,
                observaciones="",
            )

    @staticmethod
    def obtener_seguimientos_ordenados(postulacion: Postulacion) -> Iterable[SeguimientoEtapa]:
        WorkflowService._validar_postulacion(postulacion)
        return SeguimientoEtapa.objects.filter(postulacion=postulacion).select_related(
            "etapa",
            "postulacion",
            "postulacion__modalidad",
            "abierta_por",
            "cerrada_por",
        ).order_by("etapa__orden", "numero_intento")

    @staticmethod
    def obtener_acciones_permitidas(seguimiento: SeguimientoEtapa) -> list[str]:
        """Consulta capacidades operativas sin ejecutar ni persistir una transición."""
        validadores = (
            ("iniciar", lambda: WorkflowService._validar_inicio_etapa(seguimiento)),
            ("aprobar", lambda: WorkflowService._validar_aprobacion_etapa(seguimiento)),
            ("observar", lambda: WorkflowService._validar_observacion_etapa(seguimiento)),
            ("rechazar", lambda: WorkflowService._validar_rechazo_etapa(seguimiento)),
            ("omitir", lambda: WorkflowService._validar_omision_etapa(seguimiento)),
        )
        acciones = []
        for accion, validar in validadores:
            try:
                validar()
            except ValidationError:
                continue
            acciones.append(accion)
        return acciones

    @staticmethod
    def _validar_inicio_etapa(seguimiento: SeguimientoEtapa, lock: bool = False) -> None:
        if seguimiento.estado != SeguimientoEtapa.EstadoChoices.PENDIENTE:
            raise ValidationError("Solo se pueden iniciar etapas pendientes.")
        queryset = SeguimientoEtapa.objects.select_for_update() if lock else SeguimientoEtapa.objects
        existe_en_proceso = queryset.filter(
            postulacion=seguimiento.postulacion,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
        ).exclude(pk=seguimiento.pk)
        if existe_en_proceso.exists():
            raise ValidationError("La postulacion ya tiene una etapa en proceso.")
        WorkflowService._validar_etapas_anteriores_aprobadas(seguimiento)
        ModalidadPolicyRegistry.get(seguimiento.postulacion).validar_inicio_etapa(seguimiento)

    @staticmethod
    def _validar_observacion_etapa(seguimiento: SeguimientoEtapa) -> None:
        WorkflowService._validar_estado_editable(seguimiento)
        if seguimiento.estado != SeguimientoEtapa.EstadoChoices.EN_PROCESO:
            raise ValidationError("Solo se pueden observar etapas en proceso.")

    @staticmethod
    def _validar_aprobacion_etapa(seguimiento: SeguimientoEtapa) -> None:
        WorkflowService._validar_estado_editable(seguimiento)
        if seguimiento.estado not in (
            SeguimientoEtapa.EstadoChoices.EN_PROCESO,
            SeguimientoEtapa.EstadoChoices.OBSERVADA,
        ):
            raise ValidationError("Solo se pueden aprobar etapas en proceso u observadas.")
        ModalidadPolicyRegistry.get(seguimiento.postulacion).validar_aprobacion_etapa(seguimiento)

    @staticmethod
    def _validar_rechazo_etapa(seguimiento: SeguimientoEtapa) -> None:
        WorkflowService._validar_estado_editable(seguimiento)
        if seguimiento.estado not in (
            SeguimientoEtapa.EstadoChoices.EN_PROCESO,
            SeguimientoEtapa.EstadoChoices.OBSERVADA,
        ):
            raise ValidationError("Solo se pueden rechazar etapas en proceso u observadas.")

    @staticmethod
    def _validar_omision_etapa(seguimiento: SeguimientoEtapa) -> None:
        WorkflowService._validar_estado_editable(seguimiento)
        if seguimiento.etapa.obligatoria:
            raise ValidationError("No se pueden omitir etapas obligatorias.")

    @staticmethod
    def _validar_etapas_anteriores_aprobadas(seguimiento: SeguimientoEtapa) -> None:
        etapas_previas = list(
            EtapaModalidad.objects.filter(
                modalidad=seguimiento.postulacion.modalidad,
                activo=True,
                obligatoria=True,
                orden__lt=seguimiento.etapa.orden,
            ).values_list("id", flat=True)
        )
        if not etapas_previas:
            return

        etapas_aprobadas = set(
            SeguimientoEtapa.objects.filter(
                postulacion=seguimiento.postulacion,
                etapa_id__in=etapas_previas,
                estado=SeguimientoEtapa.EstadoChoices.APROBADA,
            ).values_list("etapa_id", flat=True)
        )
        pendientes = [etapa_id for etapa_id in etapas_previas if etapa_id not in etapas_aprobadas]
        if pendientes:
            raise ValidationError("Existen etapas obligatorias anteriores sin aprobar.")

    @staticmethod
    @transaction.atomic
    def concluir_postulacion(postulacion: Postulacion, usuario: CustomUser, observaciones: str = "") -> Postulacion:
        """Conclusi\u00f3n acad\u00e9mica reutilizable, validada por la policy de modalidad."""
        WorkflowService._validar_postulacion(postulacion)
        WorkflowService._validar_usuario(usuario)
        # estado_actual es nullable; PostgreSQL no permite bloquear el lado
        # nullable de ese join. Se bloquea exclusivamente la postulación.
        post = Postulacion.objects.select_for_update(of=("self",)).select_related("modalidad", "estado_actual").get(pk=postulacion.pk)
        if post.estado_actual and post.estado_actual.codigo == "CONCLUIDA":
            return post
        ModalidadPolicyRegistry.get(post).validar_conclusion_academica(post)
        WorkflowService._actualizar_estado_general(
            post, "CONCLUIDA", usuario,
            observaciones or "Conclusi\u00f3n acad\u00e9mica validada por la modalidad.", True,
        )
        return post

    @staticmethod
    def _actualizar_estado_general(
        postulacion: Postulacion,
        codigo_estado: str,
        usuario: CustomUser,
        comentario: str,
        strict: bool,
    ) -> None:
        estado_objetivo = EstadoPostulacion.objects.filter(codigo=codigo_estado).first()
        if not estado_objetivo:
            if strict:
                raise ValidationError(f"No existe el estado general {codigo_estado}.")
            return

        estado_anterior = postulacion.estado_actual
        if estado_anterior and estado_anterior.pk == estado_objetivo.pk:
            return

        postulacion.estado_actual = estado_objetivo
        postulacion.save(update_fields=["estado_actual", "updated_at"])
        HistorialEstado.objects.create(
            postulacion=postulacion,
            estado_anterior=estado_anterior,
            estado_nuevo=estado_objetivo,
            usuario=usuario,
            comentario=comentario,
        )
        history = HistorialEstado.objects.filter(postulacion=postulacion, estado_nuevo=estado_objetivo).order_by("-pk").first()
        publish_domain_event(EventTypes.POSTULACION_ESTADO_CAMBIADO, history, usuario, postulacion,
            {"estado": estado_objetivo.nombre}, f"POSTULACION_ESTADO_CAMBIADO:{postulacion.pk}:{history.pk}")

    @staticmethod
    def _bloquear_seguimiento(seguimiento_id: int) -> SeguimientoEtapa:
        return (
            SeguimientoEtapa.objects.select_for_update()
            .select_related("postulacion", "postulacion__modalidad", "etapa")
            .get(pk=seguimiento_id)
        )

    @staticmethod
    def _validar_estado_editable(seguimiento: SeguimientoEtapa) -> None:
        if seguimiento.estado in (
            SeguimientoEtapa.EstadoChoices.APROBADA,
            SeguimientoEtapa.EstadoChoices.RECHAZADA,
            SeguimientoEtapa.EstadoChoices.OMITIDA,
        ):
            raise ValidationError("No se puede modificar una etapa ya cerrada.")

    @staticmethod
    def _obtener_etapas_activas(postulacion: Postulacion):
        return EtapaModalidad.objects.filter(
            modalidad=postulacion.modalidad,
            activo=True,
        ).order_by("orden")

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
    def _validar_postulacion(postulacion: Postulacion) -> None:
        if not isinstance(postulacion, Postulacion) or not postulacion.pk:
            raise ValidationError("La postulacion es obligatoria.")

    @staticmethod
    def _validar_postulacion_operativa(postulacion: Postulacion) -> None:
        if postulacion.tipo_registro == Postulacion.TipoRegistroChoices.HISTORICO:
            raise ValidationError("Las postulaciones históricas no participan en el workflow operativo.")

    @staticmethod
    def _validar_seguimiento(seguimiento: SeguimientoEtapa) -> None:
        if not isinstance(seguimiento, SeguimientoEtapa) or not seguimiento.pk:
            raise ValidationError("El seguimiento es obligatorio.")
        WorkflowService._validar_postulacion_operativa(seguimiento.postulacion)

    @staticmethod
    def _validar_usuario(usuario: CustomUser) -> None:
        if not isinstance(usuario, CustomUser) or not usuario.pk:
            raise ValidationError("El usuario es obligatorio.")
