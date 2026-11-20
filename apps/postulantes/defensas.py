from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.postulantes.models import (AsignacionPostulacion, EvaluacionDefensa,
    EventoDefensa, ParticipanteEvento, SeguimientoEtapa)
from apps.postulantes.workflow import WorkflowService
from apps.usuarios.models import AuditLog
from apps.modalidades.policies import ModalidadPolicyRegistry
from apps.notificaciones.events import EventTypes, publish_domain_event


def _audit(user, action, description):
    AuditLog.objects.create(usuario=user, accion=action, modulo="DEFENSAS", descripcion=description)


class EventoDefensaService:
    @staticmethod
    def _validar_postulacion_editable(postulacion):
        if not postulacion.activo:
            raise ValidationError("La postulación no está activa y no puede modificarse.")

    @staticmethod
    @transaction.atomic
    def programar_evento(postulacion, seguimiento_etapa, tipo_evento, fecha_programada, usuario,
                         lugar="", modalidad_evento="PRESENCIAL", enlace_virtual="", observaciones="",
                         reprogramada_desde=None):
        seguimiento = SeguimientoEtapa.objects.select_for_update().select_related("etapa", "postulacion__modalidad").get(pk=seguimiento_etapa.pk)
        EventoDefensaService._validar_postulacion_editable(seguimiento.postulacion)
        policy = ModalidadPolicyRegistry.get(postulacion)
        if not policy.permite_eventos(): raise ValidationError("La modalidad no soporta eventos académicos.")
        if seguimiento.postulacion_id != postulacion.pk or seguimiento.estado not in (SeguimientoEtapa.EstadoChoices.EN_PROCESO, SeguimientoEtapa.EstadoChoices.OBSERVADA):
            raise ValidationError("El seguimiento no está habilitado para programar una defensa.")
        anteriores = SeguimientoEtapa.objects.filter(postulacion=postulacion, etapa__orden__lt=seguimiento.etapa.orden, etapa__obligatoria=True).exclude(estado=SeguimientoEtapa.EstadoChoices.APROBADA)
        if anteriores.exists(): raise ValidationError("Las etapas obligatorias anteriores deben estar aprobadas.")
        asignaciones = AsignacionPostulacion.objects.filter(postulacion=postulacion, activo=True)
        policy.evento_policy.validar_programacion(tipo_evento=tipo_evento, seguimiento=seguimiento, fecha_programada=fecha_programada, asignaciones=asignaciones)
        if reprogramada_desde is not None and (
            reprogramada_desde.estado != EventoDefensa.Estado.CANCELADA
            or reprogramada_desde.postulacion_id != postulacion.pk
            or reprogramada_desde.seguimiento_etapa_id != seguimiento.pk
            or reprogramada_desde.tipo_evento != tipo_evento
            or reprogramada_desde.numero_intento != seguimiento.numero_intento
        ):
            raise ValidationError("La defensa de origen debe estar cancelada y corresponder al mismo intento.")
        duplicate = EventoDefensa.objects.filter(
            postulacion=postulacion,
            tipo_evento=tipo_evento,
            numero_intento=seguimiento.numero_intento,
            activo=True,
        ).exclude(estado=EventoDefensa.Estado.CANCELADA).exists()
        if duplicate:
            raise ValidationError({"non_field_errors": ["Ya existe una defensa activa del mismo tipo e intento."]})
        evento=EventoDefensa(postulacion=postulacion,seguimiento_etapa=seguimiento,tipo_evento=tipo_evento,
            numero_intento=seguimiento.numero_intento,fecha_programada=fecha_programada,programado_por=usuario,
            lugar=lugar,modalidad_evento=modalidad_evento,enlace_virtual=enlace_virtual,observaciones=observaciones,
            reprogramada_desde=reprogramada_desde)
        try:
            with transaction.atomic():
                evento.save()
        except IntegrityError as exc:
            raise ValidationError({"non_field_errors": ["Ya existe una defensa activa del mismo tipo e intento."]}) from exc
        _audit(usuario,"PROGRAM",f"Evento {evento.pk} programado para {postulacion.codigo}.")
        publish_domain_event(EventTypes.DEFENSA_PROGRAMADA,evento,usuario,postulacion,{"tipo_evento":evento.get_tipo_evento_display(),"fecha":evento.fecha_programada.isoformat()},f"DEFENSA_PROGRAMADA:{evento.pk}:{evento.fecha_programada.isoformat()}"); return evento

    @staticmethod
    @transaction.atomic
    def agregar_participante(evento, asignacion, rol_evento, usuario):
        evento=EventoDefensa.objects.select_for_update().get(pk=evento.pk)
        if evento.estado in (evento.Estado.FINALIZADA,evento.Estado.CANCELADA): raise ValidationError("El evento ya no admite participantes.")
        asignacion=AsignacionPostulacion.all_objects.select_for_update().select_related("usuario").get(pk=asignacion.pk)
        if not asignacion.activo: raise ValidationError("La asignación debe estar activa al agregarla.")
        if not asignacion.usuario.is_active: raise ValidationError("El usuario asignado debe estar activo.")
        if asignacion.postulacion_id != evento.postulacion_id: raise ValidationError("La asignación no pertenece a la postulación.")
        if asignacion.tipo_participacion != rol_evento: raise ValidationError("El rol no es compatible con la asignación.")
        policy = ModalidadPolicyRegistry.get(evento.postulacion)
        if policy.evento_policy:
            policy.evento_policy.validar_participante(evento=evento, asignacion=asignacion, rol_evento=rol_evento)
        if ParticipanteEvento._base_manager.select_for_update().filter(
            evento=evento, asignacion__usuario_id=asignacion.usuario_id, activo=True,
        ).exists():
            raise ValidationError({"non_field_errors": ["La persona ya participa activamente en el evento mediante otra asignación."]})
        existente=ParticipanteEvento._base_manager.select_for_update().filter(evento=evento,asignacion=asignacion).first()
        if existente and existente.activo:
            raise ValidationError({"non_field_errors": ["La asignación ya participa activamente en el evento."]})
        if existente:
            existente.activo=True; existente.convocado=True; existente.presente=None
            existente.fecha_registro_asistencia=None; existente.registrado_por=None; existente.observaciones=""
            existente.save(); p=existente; detalle="reactivado"
        else:
            try:
                with transaction.atomic():
                    p=ParticipanteEvento(evento=evento,asignacion=asignacion,rol_evento=rol_evento); p.save()
            except IntegrityError as exc:
                raise ValidationError({"non_field_errors": ["La asignación ya participa en el evento."]}) from exc
            detalle="agregado"
        _audit(usuario,"ADD_PARTICIPANT",f"Participante {p.pk} {detalle} en el evento {evento.pk}."); return p

    @staticmethod
    @transaction.atomic
    def remover_participante(evento, participante, usuario):
        evento=EventoDefensa.objects.select_for_update().get(pk=evento.pk)
        if evento.estado in (evento.Estado.FINALIZADA,evento.Estado.CANCELADA): raise ValidationError("El evento ya no admite modificar participantes.")
        participante=ParticipanteEvento._base_manager.select_for_update().get(pk=participante.pk)
        if participante.evento_id != evento.pk: raise ValidationError("El participante no pertenece al evento.")
        if not participante.activo: raise ValidationError("El participante ya fue retirado.")
        participante.activo=False; participante.updated_at=timezone.now()
        ParticipanteEvento._base_manager.filter(pk=participante.pk).update(activo=False,updated_at=participante.updated_at)
        _audit(usuario,"REMOVE_PARTICIPANT",f"Participante {participante.pk} removido.")

    @staticmethod
    @transaction.atomic
    def iniciar_evento(evento, usuario):
        evento=EventoDefensa.objects.select_for_update().get(pk=evento.pk)
        EventoDefensaService._validar_postulacion_editable(evento.postulacion)
        if evento.estado != evento.Estado.PROGRAMADA: raise ValidationError("Solo se inicia un evento programado.")
        if timezone.now() < evento.fecha_programada: raise ValidationError("No puede iniciar antes de la fecha programada.")
        ModalidadPolicyRegistry.get(evento.postulacion).evento_policy.validar_inicio(evento)
        evento.estado=evento.Estado.EN_CURSO; evento.fecha_inicio_real=timezone.now(); evento.iniciado_por=usuario; evento.save(); _audit(usuario,"START",f"Evento {evento.pk} iniciado."); return evento

    @staticmethod
    @transaction.atomic
    def iniciar_evento_con_asistencia(evento, usuario, asistencias):
        evento = EventoDefensa.objects.select_for_update().get(pk=evento.pk)
        participantes = list(
            ParticipanteEvento.objects.select_for_update()
            .filter(evento=evento, activo=True)
            .order_by("pk")
        )
        pendientes = {participante.pk: participante for participante in participantes if participante.presente is None}
        decisiones = {}
        for asistencia in asistencias:
            participante = asistencia["participante"]
            participante_id = participante.pk if isinstance(participante, ParticipanteEvento) else int(participante)
            if not isinstance(asistencia["presente"], bool):
                raise ValidationError({"asistencias": "Cada participante requiere una decisión de presencia válida."})
            if participante_id in decisiones:
                raise ValidationError({"asistencias": "No se permiten decisiones duplicadas para un participante."})
            decisiones[participante_id] = asistencia["presente"]

        if decisiones.keys() != pendientes.keys():
            raise ValidationError({"asistencias": "Confirma la asistencia de todos los participantes activos pendientes."})

        evento = EventoDefensaService.iniciar_evento(evento, usuario)
        for participante_id, presente in decisiones.items():
            EventoDefensaService.registrar_asistencia(pendientes[participante_id], presente, usuario)

        return EventoDefensa.objects.select_related("postulacion__modalidad").get(pk=evento.pk)

    @staticmethod
    @transaction.atomic
    def registrar_asistencia(participante, presente, usuario, observaciones=""):
        p=ParticipanteEvento.objects.select_for_update().select_related("evento").get(pk=participante.pk)
        if p.evento.estado != EventoDefensa.Estado.EN_CURSO: raise ValidationError("El evento no está en curso.")
        p.presente=presente; p.fecha_registro_asistencia=timezone.now(); p.registrado_por=usuario; p.observaciones=observaciones; p.updated_at=timezone.now()
        ParticipanteEvento._base_manager.filter(pk=p.pk).update(
            presente=p.presente,fecha_registro_asistencia=p.fecha_registro_asistencia,
            registrado_por=p.registrado_por,observaciones=p.observaciones,updated_at=p.updated_at,
        )
        _audit(usuario,"ATTENDANCE",f"Asistencia registrada para {p.pk}."); return p

    @staticmethod
    def validar_quorum(evento, usuario=None):
        policy=ModalidadPolicyRegistry.get(evento.postulacion)
        if not policy.evento_policy: raise ValidationError("La modalidad no soporta eventos académicos.")
        result=policy.evento_policy.validar_quorum(evento)
        if usuario: _audit(usuario,"QUORUM_CHECK",f"Quórum evento {evento.pk}: {result['valido']}.")
        return result

    @staticmethod
    @transaction.atomic
    def finalizar_evento(evento, usuario):
        evento=EventoDefensa.objects.select_for_update().get(pk=evento.pk)
        EventoDefensaService._validar_postulacion_editable(evento.postulacion)
        if evento.estado != evento.Estado.EN_CURSO: raise ValidationError("El evento no está en curso.")
        ModalidadPolicyRegistry.get(evento.postulacion).evento_policy.validar_finalizacion(evento)
        if not EventoDefensaService.validar_quorum(evento,usuario)["valido"]: raise ValidationError("No se puede finalizar sin quórum.")
        evento.estado=evento.Estado.FINALIZADA; evento.fecha_fin_real=timezone.now(); evento.cerrado_por=usuario; evento.save(); _audit(usuario,"FINISH",f"Evento {evento.pk} finalizado.")
        publish_domain_event(EventTypes.DEFENSA_FINALIZADA,evento,usuario,evento.postulacion,{},f"DEFENSA_FINALIZADA:{evento.pk}:{evento.fecha_fin_real.isoformat()}"); return evento

    @staticmethod
    @transaction.atomic
    def _cerrar(evento,usuario,estado,motivo,accion):
        evento=EventoDefensa.objects.select_for_update().get(pk=evento.pk)
        EventoDefensaService._validar_postulacion_editable(evento.postulacion)
        if evento.estado in (evento.Estado.FINALIZADA,evento.Estado.CANCELADA): raise ValidationError("El evento no puede modificarse.")
        if estado == evento.Estado.SUSPENDIDA and evento.estado == evento.Estado.SUSPENDIDA: raise ValidationError("El evento ya está suspendido.")
        if not motivo.strip(): raise ValidationError("El motivo es obligatorio.")
        evento.estado=estado; evento.observaciones=(evento.observaciones+"\n"+motivo).strip(); evento.cerrado_por=usuario
        if estado == evento.Estado.CANCELADA:
            evento.fecha_cancelacion=timezone.now()
            evento.fecha_fin_real=None
        else:
            evento.fecha_fin_real=timezone.now()
        evento.save(); _audit(usuario,accion,f"Evento {evento.pk}: {motivo}")
        event_type=EventTypes.DEFENSA_SUSPENDIDA if estado==EventoDefensa.Estado.SUSPENDIDA else EventTypes.DEFENSA_CANCELADA
        event_timestamp = evento.fecha_cancelacion if estado == evento.Estado.CANCELADA else evento.fecha_fin_real
        publish_domain_event(event_type,evento,usuario,evento.postulacion,{},f"{event_type}:{evento.pk}:{event_timestamp.isoformat()}"); return evento
    suspender_evento=staticmethod(lambda evento,usuario,motivo: EventoDefensaService._cerrar(evento,usuario,EventoDefensa.Estado.SUSPENDIDA,motivo,"SUSPEND"))
    cancelar_evento=staticmethod(lambda evento,usuario,motivo: EventoDefensaService._cerrar(evento,usuario,EventoDefensa.Estado.CANCELADA,motivo,"CANCEL"))

    @staticmethod
    @transaction.atomic
    def reprogramar_evento(evento,nueva_fecha,usuario,motivo):
        evento=EventoDefensa.objects.select_for_update().get(pk=evento.pk)
        EventoDefensaService._validar_postulacion_editable(evento.postulacion)
        if not motivo.strip(): raise ValidationError("El motivo es obligatorio.")
        policy = ModalidadPolicyRegistry.get(evento.postulacion).evento_policy
        if evento.estado == evento.Estado.CANCELADA:
            policy.validar_reprogramacion(evento, nueva_fecha)
            replacement = EventoDefensaService.programar_evento(
                postulacion=evento.postulacion,
                seguimiento_etapa=evento.seguimiento_etapa,
                tipo_evento=evento.tipo_evento,
                fecha_programada=nueva_fecha,
                usuario=usuario,
                lugar=evento.lugar,
                modalidad_evento=evento.modalidad_evento,
                enlace_virtual=evento.enlace_virtual,
                observaciones=f"Nueva programación por cancelación del evento {evento.pk}: {motivo}",
                reprogramada_desde=evento,
            )
            _audit(usuario,"RESCHEDULE",f"Evento {replacement.pk} creado como nueva programación del evento cancelado {evento.pk}: {motivo}")
            return replacement
        if evento.estado not in (evento.Estado.PROGRAMADA,evento.Estado.SUSPENDIDA): raise ValidationError("El evento no admite reprogramación.")
        policy.validar_reprogramacion(evento, nueva_fecha)
        evento.fecha_programada=nueva_fecha; evento.estado=evento.Estado.PROGRAMADA
        evento.fecha_inicio_real=None; evento.fecha_fin_real=None; evento.iniciado_por=None; evento.cerrado_por=None
        evento.observaciones=(evento.observaciones+"\nReprogramación: "+motivo).strip(); evento.save(); _audit(usuario,"RESCHEDULE",f"Evento {evento.pk} reprogramado: {motivo}")
        publish_domain_event(EventTypes.DEFENSA_REPROGRAMADA,evento,usuario,evento.postulacion,{"tipo_evento":evento.get_tipo_evento_display(),"fecha":nueva_fecha.isoformat()},f"DEFENSA_REPROGRAMADA:{evento.pk}:{nueva_fecha.isoformat()}"); return evento


class EvaluacionDefensaService:
    @staticmethod
    @transaction.atomic
    def _registrar(evento,usuario,tipo,resultado="",nota=None,evaluador=None,modalidad_registro=None,observaciones="",semantica_nota=None, *, omitir_quorum=False, permitir_programada=False):
        evento=EventoDefensa.objects.select_for_update().select_related("postulacion").get(pk=evento.pk)
        EventoDefensaService._validar_postulacion_editable(evento.postulacion)
        policy=ModalidadPolicyRegistry.get(evento.postulacion)
        if tipo not in policy.get_tipos_evaluacion(): raise ValidationError("La modalidad no soporta este tipo de evaluación.")
        estados_evaluables = (EventoDefensa.Estado.EN_CURSO, EventoDefensa.Estado.FINALIZADA)
        if permitir_programada:
            estados_evaluables += (EventoDefensa.Estado.PROGRAMADA,)
        if evento.estado not in estados_evaluables: raise ValidationError("El evento no puede evaluarse.")
        if not omitir_quorum and not EventoDefensaService.validar_quorum(evento)["valido"]: raise ValidationError("No se puede registrar la evaluación sin quórum técnico válido.")
        modalidad_registro = modalidad_registro or policy.evaluacion_policy.get_modalidad_registro_por_defecto(evento=evento, tipo=tipo)
        policy.evaluacion_policy.validar_solicitud_registro(modalidad_registro=modalidad_registro, evaluador=evaluador, evento=evento, tipo=tipo)
        existentes = evento.evaluaciones.filter(tipo_evaluacion=tipo)
        if existentes.exists() and not (modalidad_registro == EvaluacionDefensa.ModalidadRegistro.INDIVIDUAL and not existentes.exclude(modalidad_registro=EvaluacionDefensa.ModalidadRegistro.INDIVIDUAL).exists()): raise ValidationError("El evento ya tiene una evaluación registrada de este tipo.")
        semantica_nota = semantica_nota or policy.evaluacion_policy.get_semantica_nota(evento=evento,tipo=tipo)
        if not policy.evaluacion_policy.admite_semantica_entrada(evento=evento, tipo=tipo, semantica=semantica_nota):
            raise ValidationError("La semántica de entrada no está habilitada para esta evaluación.")
        if existentes.exclude(semantica_nota=semantica_nota).exists():
            raise ValidationError("No se pueden mezclar escalas en las evaluaciones del mismo evento.")
        valores = policy.evaluacion_policy.get_valores_para_semantica(evento=evento, tipo=tipo, nota=nota, semantica=semantica_nota)
        e=EvaluacionDefensa(evento=evento,evaluador=evaluador,tipo_evaluacion=tipo,modalidad_registro=modalidad_registro,resultado_cualitativo=resultado,nota_numerica=nota,ponderacion=valores["ponderacion"],aporte_ponderado=valores["aporte_ponderado"],semantica_nota=semantica_nota,observaciones=observaciones,registrado_por=usuario); e.save(); _audit(usuario,"EVALUATE",f"Evaluación {tipo} registrada en evento {evento.pk}."); return e
    registrar_evaluacion_perfil=staticmethod(lambda evento,usuario,resultado,evaluador=None,modalidad_registro=None,observaciones="": EvaluacionDefensaService._registrar(evento,usuario,EvaluacionDefensa.Tipo.PERFIL,resultado,None,evaluador,modalidad_registro,observaciones))
    registrar_evaluacion_tematica=staticmethod(lambda evento,usuario,resultado,evaluador=None,modalidad_registro=None,observaciones="": EvaluacionDefensaService._registrar(evento,usuario,EvaluacionDefensa.Tipo.TEMATICA,resultado,None,evaluador,modalidad_registro,observaciones))
    registrar_evaluacion_privada=staticmethod(lambda evento,usuario,resultado,nota=None,evaluador=None,modalidad_registro=None,observaciones="",semantica_nota=None: EvaluacionDefensaService._registrar(evento,usuario,EvaluacionDefensa.Tipo.PRIVADA,resultado,nota,evaluador,modalidad_registro,observaciones,semantica_nota))
    registrar_evaluacion_publica=staticmethod(lambda evento,usuario,nota,evaluador=None,modalidad_registro=None,observaciones="",semantica_nota=None: EvaluacionDefensaService._registrar(evento,usuario,EvaluacionDefensa.Tipo.PUBLICA,"",nota,evaluador,modalidad_registro,observaciones,semantica_nota))

    @staticmethod
    @transaction.atomic
    def registrar_resultado_directo_proyecto(evento, usuario, resultado="", nota=None, observaciones="", semantica_nota=None):
        """Registers and consolidates a supported defense without attendance records."""
        evento = EventoDefensa.objects.select_for_update().select_related(
            "postulacion__modalidad", "seguimiento_etapa__etapa",
        ).get(pk=evento.pk)
        modalidad_codigo = evento.postulacion.modalidad.codigo
        direct_types = {
            "PROYECTO_GRADO": {"DEFENSA_PERFIL", "DEFENSA_PRIVADA", "DEFENSA_PUBLICA"},
            "TESIS_GRADO": {"DEFENSA_TEMATICA", "DEFENSA_PERFIL", "DEFENSA_PRIVADA", "DEFENSA_PUBLICA"},
        }
        if evento.tipo_evento not in direct_types.get(modalidad_codigo, set()):
            raise ValidationError("El registro directo no está habilitado para esta modalidad y defensa.")
        EventoDefensaService._validar_postulacion_editable(evento.postulacion)
        policy = ModalidadPolicyRegistry.get(evento.postulacion)
        if not policy.evento_policy or evento.tipo_evento not in policy.evento_policy.get_tipos_evento():
            raise ValidationError("Tipo de defensa no admitido para registro directo.")
        policy.evento_policy.validar_correspondencia_evento_etapa(evento)
        seguimiento = SeguimientoEtapa.objects.select_for_update().select_related("etapa").get(
            pk=evento.seguimiento_etapa_id,
        )
        if seguimiento.postulacion_id != evento.postulacion_id or not seguimiento.activo:
            raise ValidationError("La defensa requiere un seguimiento vigente de la misma postulación.")
        seguimiento_actual = SeguimientoEtapa.objects.filter(
            postulacion_id=evento.postulacion_id,
            etapa_id=seguimiento.etapa_id,
            activo=True,
        ).order_by("-numero_intento", "-pk").first()
        if not seguimiento_actual or seguimiento_actual.pk != seguimiento.pk:
            raise ValidationError("La defensa no pertenece al seguimiento activo más reciente de la etapa.")
        if evento.numero_intento != seguimiento.numero_intento:
            raise ValidationError("La defensa no corresponde al intento vigente de la etapa.")
        if not evento.activo:
            raise ValidationError("La defensa debe estar activa para registrar el resultado.")
        consolidaciones = evento.evaluaciones.filter(
            tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL,
            es_resultado_final_evento=True,
        )
        if consolidaciones.count() > 1:
            raise ValidationError("El evento tiene más de un resultado consolidado; requiere revisión administrativa.")
        tipo_por_evento = {
            EventoDefensa.Tipo.DEFENSA_TEMATICA: EvaluacionDefensa.Tipo.TEMATICA,
            EventoDefensa.Tipo.DEFENSA_PERFIL: EvaluacionDefensa.Tipo.PERFIL,
            EventoDefensa.Tipo.DEFENSA_PRIVADA: EvaluacionDefensa.Tipo.PRIVADA,
            EventoDefensa.Tipo.DEFENSA_PUBLICA: EvaluacionDefensa.Tipo.PUBLICA,
        }
        tipo = tipo_por_evento[evento.tipo_evento]
        asignaciones = policy.evento_policy.get_asignaciones_formales_defensa(
            postulacion=evento.postulacion, tipo_evento=evento.tipo_evento,
            seguimiento=seguimiento,
        ).select_for_update()
        if modalidad_codigo == "TESIS_GRADO":
            requisitos = policy.evento_policy.evaluar_composicion_formal(
                tipo_evento=evento.tipo_evento, asignaciones=asignaciones,
            )
        else:
            requisitos = policy.evento_policy.evaluar_requisitos_programacion(
                tipo_evento=evento.tipo_evento,
                seguimiento=seguimiento,
                asignaciones=asignaciones,
            )
        if not requisitos["cumple"]:
            conflictos = requisitos.get("conflictos_detalle", [])
            if conflictos:
                nombres = {item.usuario_id: item.usuario.nombre_completo or item.usuario.username for item in asignaciones}
                detalle = "; ".join(
                    f"{nombres.get(item['usuario_id'], 'Una persona')} ocupa {', '.join(item['cargos'])}"
                    for item in conflictos
                )
                raise ValidationError({
                    "tribunal": f"La composición formal contiene identidades repetidas: {detalle}. Corrige las asignaciones antes de registrar el resultado."
                })
            raise ValidationError({"tribunal": "La composición formal vigente no cumple los requisitos de esta defensa."})
        if modalidad_codigo == "TESIS_GRADO":
            policy.evento_policy.validar_resultado_directo(
                evento=evento, tipo=tipo, resultado=resultado, nota=nota,
                semantica_nota=semantica_nota,
            )

        fuente_qs = evento.evaluaciones.filter(tipo_evaluacion=tipo, es_resultado_final_evento=False)
        fuentes = list(fuente_qs.select_for_update().order_by("pk"))
        consenso = [e for e in fuentes if e.modalidad_registro == EvaluacionDefensa.ModalidadRegistro.CONSENSO]
        if len(consenso) > 1:
            raise ValidationError("El evento tiene evaluaciones consensuadas duplicadas; requiere revisión administrativa.")
        if fuentes and not consenso:
            raise ValidationError({"evaluacion": "Existe una evaluación histórica individual. No se sobrescribe; debe resolverse mediante el flujo académico correspondiente."})
        if consenso and len(fuentes) != 1:
            raise ValidationError({"evaluacion": "Hay evaluaciones históricas incompatibles con el consenso. No se modificaron."})

        if consolidaciones.exists():
            consolidada = consolidaciones.select_for_update().get()
            fuente = consenso[0] if consenso else None
            if not fuente or not EvaluacionDefensaService._consolidado_coherente(fuente, consolidada):
                raise ValidationError("El resultado consolidado no tiene una evaluación consensuada fuente coherente.")
            if (
                evento.estado != EventoDefensa.Estado.FINALIZADA
                or not evento.fecha_fin_real
                or not evento.cerrado_por_id
            ):
                raise ValidationError("El resultado consolidado requiere un evento finalizado con cierre trazable.")
            if resultado and resultado != fuente.resultado_cualitativo:
                raise ValidationError("La solicitud no coincide con el resultado ya consolidado.")
            if nota is not None and nota != fuente.nota_numerica:
                raise ValidationError("La solicitud no coincide con la nota ya consolidada.")
            if evento.estado != EventoDefensa.Estado.FINALIZADA:
                raise ValidationError("Existe un resultado consolidado en un evento que no está finalizado.")
            estado_permitido = (SeguimientoEtapa.EstadoChoices.APROBADA, SeguimientoEtapa.EstadoChoices.RECHAZADA)
            if seguimiento.estado not in estado_permitido:
                raise ValidationError("El estado académico no concuerda con el resultado consolidado.")
            return evento

        if evento.estado not in (EventoDefensa.Estado.PROGRAMADA, EventoDefensa.Estado.EN_CURSO, EventoDefensa.Estado.FINALIZADA):
            raise ValidationError("Solo se puede registrar directamente una defensa programada o en curso.")
        if evento.estado == EventoDefensa.Estado.PROGRAMADA and timezone.now() < evento.fecha_programada:
            raise ValidationError("La defensa todavía no llega a su fecha y hora programadas.")
        if seguimiento.estado not in (SeguimientoEtapa.EstadoChoices.EN_PROCESO, SeguimientoEtapa.EstadoChoices.OBSERVADA):
            raise ValidationError("El seguimiento académico no está habilitado para registrar este resultado.")
        evaluacion_existente = consenso[0] if consenso else None
        if evaluacion_existente and (
            (resultado and resultado != evaluacion_existente.resultado_cualitativo)
            or (nota is not None and nota != evaluacion_existente.nota_numerica)
        ):
            raise ValidationError("La solicitud no coincide con la evaluación consensuada ya registrada.")
        if not evaluacion_existente:
            EvaluacionDefensaService._registrar(
            evento, usuario, tipo, resultado=resultado, nota=nota,
                modalidad_registro=EvaluacionDefensa.ModalidadRegistro.CONSENSO,
                observaciones=observaciones, semantica_nota=semantica_nota,
                omitir_quorum=True, permitir_programada=True,
            )

        if evento.estado != EventoDefensa.Estado.FINALIZADA:
            evento.estado = EventoDefensa.Estado.FINALIZADA
            evento.fecha_fin_real = timezone.now()
            evento.cerrado_por = usuario
            evento.save()
            _audit(usuario, "FINISH", f"Evento {evento.pk} finalizado mediante registro directo.")
            publish_domain_event(
                EventTypes.DEFENSA_FINALIZADA, evento, usuario, evento.postulacion, {},
                f"DEFENSA_FINALIZADA:{evento.pk}:{evento.fecha_fin_real.isoformat()}",
            )
        consolidada = EvaluacionDefensaService.consolidar_evaluacion_evento(evento, usuario)
        evento.refresh_from_db()
        evento._resultado_directo_consolidado = consolidada
        return evento

    @staticmethod
    def _consolidado_coherente(fuente, consolidado):
        return (
            consolidado.tipo_evaluacion == EvaluacionDefensa.Tipo.RESULTADO_FINAL
            and consolidado.es_resultado_final_evento
            and consolidado.modalidad_registro == fuente.modalidad_registro
            and consolidado.semantica_nota == fuente.semantica_nota
            and consolidado.resultado_cualitativo == fuente.resultado_cualitativo
            and consolidado.nota_numerica == fuente.nota_numerica
            and consolidado.ponderacion == fuente.ponderacion
            and consolidado.aporte_ponderado == fuente.aporte_ponderado
        )

    @staticmethod
    @transaction.atomic
    def consolidar_evaluacion_evento(evento,usuario):
        from apps.modalidades.policies import ReintentoNoElegibleError

        evento=EventoDefensa.objects.select_for_update().select_related("seguimiento_etapa").get(pk=evento.pk)
        policy=ModalidadPolicyRegistry.get(evento.postulacion)
        if not policy.permite_evaluaciones(): raise ValidationError("La modalidad no soporta evaluaciones.")
        if evento.estado != EventoDefensa.Estado.FINALIZADA: raise ValidationError("Sólo puede consolidarse un evento finalizado.")
        if evento.evaluaciones.filter(tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL).exists(): raise ValidationError("El evento ya tiene una evaluación consolidada.")
        qs=evento.evaluaciones.exclude(tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL)
        evaluacion=policy.evaluacion_policy.obtener_evaluacion_para_consolidar(evento=evento, evaluaciones=qs)
        e=policy.evaluacion_policy.construir_consolidado(evaluacion, usuario)
        e.save(); _audit(usuario,"CONSOLIDATE",f"Evento {evento.pk} consolidado.")
        publish_domain_event(EventTypes.EVALUACION_CONSOLIDADA,e,usuario,evento.postulacion,{},f"EVALUACION_CONSOLIDADA:{evento.pk}:{e.pk}")
        final=EvaluacionDefensaService.calcular_resultado_final(evento.postulacion,None,auditar=False)
        observacion = policy.evaluacion_policy.obtener_aprobacion_por_consolidacion(evento=evento, evaluacion=evaluacion, resultado_final=final)
        if observacion:
            WorkflowService.aprobar_etapa(evento.seguimiento_etapa,usuario,observacion)
        rechazo = policy.evaluacion_policy.obtener_rechazo_por_consolidacion(evento=evento, evaluacion=evaluacion, resultado_final=final)
        if rechazo:
            WorkflowService.rechazar_etapa(evento.seguimiento_etapa, usuario, rechazo)
            if evento.seguimiento_etapa.numero_intento == 1:
                try:
                    WorkflowService.crear_nuevo_intento(evento.postulacion, evento.seguimiento_etapa.etapa, usuario)
                except ReintentoNoElegibleError as error:
                    if not policy.evaluacion_policy.conservar_rechazo_sin_reintento(
                        evento=evento, error=error,
                    ):
                        raise
                    e._reintento = {
                        "creado": False,
                        "habilitado": False,
                        "motivo": error.messages[0],
                    }
        return e

    @staticmethod
    def calcular_resultado_final(postulacion,usuario,auditar=True):
        policy=ModalidadPolicyRegistry.get(postulacion)
        if not policy.permite_evaluaciones(): raise ValidationError("La modalidad no soporta evaluaciones.")
        resultado=policy.evaluacion_policy.calcular_resultado_final(postulacion)
        if auditar: _audit(usuario,"CALCULATE_FINAL_RESULT",f"Resultado final consultado para {postulacion.codigo}.")
        return resultado
