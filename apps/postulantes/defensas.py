from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

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


class ProyectoGradoDefensaPolicy:
    """Reglas recuperables del reglamento específico de Proyecto de Grado."""
    @staticmethod
    def validar_quorum(evento):
        presentes = evento.participantes.filter(presente=True, activo=True)
        counts = {rol: presentes.filter(rol_evento=rol).count() for rol, _ in ParticipanteEvento.Rol.choices}
        req = {}
        if evento.tipo_evento == EventoDefensa.Tipo.DEFENSA_PERFIL:
            # La fuente exige considerar el tribunal designado; no inventa cargos operativos.
            req = {ParticipanteEvento.Rol.TRIBUNAL: 2}
        elif evento.tipo_evento == EventoDefensa.Tipo.DEFENSA_PRIVADA:
            req = {ParticipanteEvento.Rol.TRIBUNAL: 2, ParticipanteEvento.Rol.DOCENTE_MODALIDAD: 1}
        elif evento.tipo_evento == EventoDefensa.Tipo.DEFENSA_PUBLICA:
            req = {ParticipanteEvento.Rol.TRIBUNAL: 2, ParticipanteEvento.Rol.PRESIDENTE: 1, ParticipanteEvento.Rol.SECRETARIO: 1}
        faltantes = {rol: minimo-counts.get(rol, 0) for rol, minimo in req.items() if counts.get(rol, 0) < minimo}
        return {"valido": not faltantes, "faltantes": faltantes, "detalle": counts}


class EventoDefensaService:
    @staticmethod
    def _validar_postulacion_editable(postulacion):
        if not postulacion.activo:
            raise ValidationError("La postulación no está activa y no puede modificarse.")

    @staticmethod
    @transaction.atomic
    def programar_evento(postulacion, seguimiento_etapa, tipo_evento, fecha_programada, usuario,
                         lugar="", modalidad_evento="PRESENCIAL", enlace_virtual="", observaciones=""):
        seguimiento = SeguimientoEtapa.objects.select_for_update().select_related("etapa", "postulacion__modalidad").get(pk=seguimiento_etapa.pk)
        EventoDefensaService._validar_postulacion_editable(seguimiento.postulacion)
        policy = ModalidadPolicyRegistry.get(postulacion)
        if not policy.permite_eventos(): raise ValidationError("La modalidad no soporta eventos académicos.")
        if seguimiento.postulacion_id != postulacion.pk or seguimiento.estado not in (SeguimientoEtapa.EstadoChoices.EN_PROCESO, SeguimientoEtapa.EstadoChoices.OBSERVADA):
            raise ValidationError("El seguimiento no está habilitado para programar una defensa.")
        anteriores = SeguimientoEtapa.objects.filter(postulacion=postulacion, etapa__orden__lt=seguimiento.etapa.orden, etapa__obligatoria=True).exclude(estado=SeguimientoEtapa.EstadoChoices.APROBADA)
        if anteriores.exists(): raise ValidationError("Las etapas obligatorias anteriores deben estar aprobadas.")
        requeridos = {
            EventoDefensa.Tipo.DEFENSA_PERFIL: {"TRIBUNAL": 2},
            EventoDefensa.Tipo.DEFENSA_PRIVADA: {"TRIBUNAL": 2, "DOCENTE_MODALIDAD": 1},
            EventoDefensa.Tipo.DEFENSA_PUBLICA: {"TRIBUNAL": 2, "PRESIDENTE": 1, "SECRETARIO": 1},
        }.get(tipo_evento, {})
        asignaciones = AsignacionPostulacion.objects.filter(postulacion=postulacion, activo=True)
        policy.evento_policy.validar_programacion(tipo_evento=tipo_evento, seguimiento=seguimiento, fecha_programada=fecha_programada, asignaciones=asignaciones)
        faltan = {rol: cantidad-asignaciones.filter(tipo_participacion=rol).count() for rol, cantidad in requeridos.items() if asignaciones.filter(tipo_participacion=rol).count() < cantidad}
        if faltan: raise ValidationError(f"No existen asignaciones mínimas activas: {faltan}.")
        if tipo_evento == EventoDefensa.Tipo.DEFENSA_PUBLICA and fecha_programada < timezone.now()+timedelta(hours=48):
            raise ValidationError("La defensa pública debe programarse con al menos 48 horas de anticipación (diagrama oficial).")
        duplicate = EventoDefensa.objects.filter(
            postulacion=postulacion,
            tipo_evento=tipo_evento,
            numero_intento=seguimiento.numero_intento,
            activo=True,
        ).exists()
        if duplicate:
            raise ValidationError({"non_field_errors": ["Ya existe una defensa activa del mismo tipo e intento."]})
        evento=EventoDefensa(postulacion=postulacion,seguimiento_etapa=seguimiento,tipo_evento=tipo_evento,
            numero_intento=seguimiento.numero_intento,fecha_programada=fecha_programada,programado_por=usuario,
            lugar=lugar,modalidad_evento=modalidad_evento,enlace_virtual=enlace_virtual,observaciones=observaciones)
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
        evento.estado=evento.Estado.EN_CURSO; evento.fecha_inicio_real=timezone.now(); evento.iniciado_por=usuario; evento.save(); _audit(usuario,"START",f"Evento {evento.pk} iniciado."); return evento

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
        evento.estado=estado; evento.observaciones=(evento.observaciones+"\n"+motivo).strip(); evento.cerrado_por=usuario; evento.fecha_fin_real=timezone.now(); evento.save(); _audit(usuario,accion,f"Evento {evento.pk}: {motivo}")
        event_type=EventTypes.DEFENSA_SUSPENDIDA if estado==EventoDefensa.Estado.SUSPENDIDA else EventTypes.DEFENSA_CANCELADA
        publish_domain_event(event_type,evento,usuario,evento.postulacion,{},f"{event_type}:{evento.pk}:{evento.fecha_fin_real.isoformat()}"); return evento
    suspender_evento=staticmethod(lambda evento,usuario,motivo: EventoDefensaService._cerrar(evento,usuario,EventoDefensa.Estado.SUSPENDIDA,motivo,"SUSPEND"))
    cancelar_evento=staticmethod(lambda evento,usuario,motivo: EventoDefensaService._cerrar(evento,usuario,EventoDefensa.Estado.CANCELADA,motivo,"CANCEL"))

    @staticmethod
    @transaction.atomic
    def reprogramar_evento(evento,nueva_fecha,usuario,motivo):
        evento=EventoDefensa.objects.select_for_update().get(pk=evento.pk)
        EventoDefensaService._validar_postulacion_editable(evento.postulacion)
        if evento.estado not in (evento.Estado.PROGRAMADA,evento.Estado.SUSPENDIDA): raise ValidationError("El evento no admite reprogramación.")
        if not motivo.strip(): raise ValidationError("El motivo es obligatorio.")
        if evento.tipo_evento==evento.Tipo.DEFENSA_PUBLICA and nueva_fecha < timezone.now()+timedelta(hours=48): raise ValidationError("La defensa pública requiere 48 horas de anticipación.")
        evento.fecha_programada=nueva_fecha; evento.estado=evento.Estado.PROGRAMADA
        evento.fecha_inicio_real=None; evento.fecha_fin_real=None; evento.iniciado_por=None; evento.cerrado_por=None
        evento.observaciones=(evento.observaciones+"\nReprogramación: "+motivo).strip(); evento.save(); _audit(usuario,"RESCHEDULE",f"Evento {evento.pk} reprogramado: {motivo}")
        publish_domain_event(EventTypes.DEFENSA_REPROGRAMADA,evento,usuario,evento.postulacion,{"tipo_evento":evento.get_tipo_evento_display(),"fecha":nueva_fecha.isoformat()},f"DEFENSA_REPROGRAMADA:{evento.pk}:{nueva_fecha.isoformat()}"); return evento


class EvaluacionDefensaService:
    @staticmethod
    @transaction.atomic
    def _registrar(evento,usuario,tipo,resultado="",nota=None,evaluador=None,modalidad_registro="CONSENSO",observaciones=""):
        evento=EventoDefensa.objects.select_for_update().select_related("postulacion").get(pk=evento.pk)
        EventoDefensaService._validar_postulacion_editable(evento.postulacion)
        policy=ModalidadPolicyRegistry.get(evento.postulacion)
        if tipo not in policy.get_tipos_evaluacion(): raise ValidationError("La modalidad no soporta este tipo de evaluación.")
        if evento.estado not in (EventoDefensa.Estado.EN_CURSO,EventoDefensa.Estado.FINALIZADA): raise ValidationError("El evento no puede evaluarse.")
        if not EventoDefensaService.validar_quorum(evento)["valido"]: raise ValidationError("No se puede registrar la evaluación sin quórum técnico válido.")
        if modalidad_registro!=EvaluacionDefensa.ModalidadRegistro.CONSENSO or evaluador is not None: raise ValidationError("La evaluación debe ser un consenso único del Tribunal.")
        if evento.evaluaciones.filter(tipo_evaluacion=tipo).exists(): raise ValidationError("El evento ya tiene una evaluación consensuada de este tipo.")
        ponderacion = Decimal("70.00") if tipo==EvaluacionDefensa.Tipo.PUBLICA else (Decimal("30.00") if tipo==EvaluacionDefensa.Tipo.PRIVADA else None)
        aporte=Decimal(nota).quantize(Decimal("0.01"),rounding=ROUND_HALF_UP) if nota is not None else None
        e=EvaluacionDefensa(evento=evento,evaluador=evaluador,tipo_evaluacion=tipo,modalidad_registro=modalidad_registro,resultado_cualitativo=resultado,nota_numerica=nota,ponderacion=ponderacion,aporte_ponderado=aporte,observaciones=observaciones,registrado_por=usuario); e.save(); _audit(usuario,"EVALUATE",f"Evaluación {tipo} registrada en evento {evento.pk}."); return e
    registrar_evaluacion_perfil=staticmethod(lambda evento,usuario,resultado,evaluador=None,modalidad_registro="CONSENSO",observaciones="": EvaluacionDefensaService._registrar(evento,usuario,EvaluacionDefensa.Tipo.PERFIL,resultado,None,evaluador,modalidad_registro,observaciones))
    registrar_evaluacion_privada=staticmethod(lambda evento,usuario,resultado,nota,evaluador=None,modalidad_registro="CONSENSO",observaciones="": EvaluacionDefensaService._registrar(evento,usuario,EvaluacionDefensa.Tipo.PRIVADA,resultado,nota,evaluador,modalidad_registro,observaciones))
    registrar_evaluacion_publica=staticmethod(lambda evento,usuario,nota,evaluador=None,modalidad_registro="CONSENSO",observaciones="": EvaluacionDefensaService._registrar(evento,usuario,EvaluacionDefensa.Tipo.PUBLICA,"",nota,evaluador,modalidad_registro,observaciones))

    @staticmethod
    @transaction.atomic
    def consolidar_evaluacion_evento(evento,usuario):
        evento=EventoDefensa.objects.select_for_update().select_related("seguimiento_etapa").get(pk=evento.pk)
        policy=ModalidadPolicyRegistry.get(evento.postulacion)
        if not policy.permite_evaluaciones(): raise ValidationError("La modalidad no soporta evaluaciones.")
        if evento.estado != EventoDefensa.Estado.FINALIZADA: raise ValidationError("Sólo puede consolidarse un evento finalizado.")
        if evento.evaluaciones.filter(tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL).exists(): raise ValidationError("El evento ya tiene una evaluación consolidada.")
        qs=evento.evaluaciones.exclude(tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL)
        if qs.count()!=1: raise ValidationError("Debe existir una única evaluación consensuada para consolidar.")
        evaluacion=qs.first()
        if evento.tipo_evento==EventoDefensa.Tipo.DEFENSA_PUBLICA:
            nota=evaluacion.nota_numerica
            e=EvaluacionDefensa(evento=evento,tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL,modalidad_registro=EvaluacionDefensa.ModalidadRegistro.CONSENSO,nota_numerica=nota,ponderacion=Decimal("70.00"),aporte_ponderado=nota,es_resultado_final_evento=True,registrado_por=usuario)
        elif evento.tipo_evento==EventoDefensa.Tipo.DEFENSA_PRIVADA:
            resultado=evaluacion.resultado_cualitativo; nota=evaluacion.nota_numerica
            e=EvaluacionDefensa(evento=evento,tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL,modalidad_registro=EvaluacionDefensa.ModalidadRegistro.CONSENSO,resultado_cualitativo=resultado,nota_numerica=nota,ponderacion=Decimal("30.00"),aporte_ponderado=nota,es_resultado_final_evento=True,registrado_por=usuario)
        else:
            resultado=evaluacion.resultado_cualitativo
            e=EvaluacionDefensa(evento=evento,tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL,modalidad_registro=EvaluacionDefensa.ModalidadRegistro.CONSENSO,resultado_cualitativo=resultado,es_resultado_final_evento=True,registrado_por=usuario)
        e.save(); _audit(usuario,"CONSOLIDATE",f"Evento {evento.pk} consolidado.")
        publish_domain_event(EventTypes.EVALUACION_CONSOLIDADA,e,usuario,evento.postulacion,{},f"EVALUACION_CONSOLIDADA:{evento.pk}:{e.pk}")
        if evento.tipo_evento!=EventoDefensa.Tipo.DEFENSA_PUBLICA and resultado==EvaluacionDefensa.Resultado.SUFICIENTE: WorkflowService.aprobar_etapa(evento.seguimiento_etapa,usuario,"Aprobada por evaluación de defensa.")
        return e

    @staticmethod
    def clasificar_nota_final(nota_final):
        if nota_final <= 50:
            return EvaluacionDefensa.Resultado.POSTERGADO
        if nota_final <= 74:
            return EvaluacionDefensa.Resultado.APROBADO
        if nota_final <= 89:
            return EvaluacionDefensa.Resultado.APROBACION_PLENA
        return EvaluacionDefensa.Resultado.APROBACION_PLENA_CON_FELICITACION

    @staticmethod
    def calcular_resultado_final(postulacion,usuario,auditar=True):
        policy=ModalidadPolicyRegistry.get(postulacion)
        if not policy.permite_evaluaciones(): raise ValidationError("La modalidad no soporta evaluaciones.")
        resultados=EvaluacionDefensa.objects.filter(evento__postulacion=postulacion,tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL,es_resultado_final_evento=True)
        privada=resultados.filter(evento__tipo_evento=EventoDefensa.Tipo.DEFENSA_PRIVADA).order_by("-created_at").first()
        publica=resultados.filter(evento__tipo_evento=EventoDefensa.Tipo.DEFENSA_PUBLICA).order_by("-created_at").first()
        nota_privada=privada.nota_numerica if privada else None; nota_publica=publica.nota_numerica if publica else None
        nota_final=(nota_privada+nota_publica).quantize(Decimal("0.01")) if nota_privada is not None and nota_publica is not None else None
        clasificacion=EvaluacionDefensaService.clasificar_nota_final(nota_final) if nota_final is not None else None
        if auditar: _audit(usuario,"CALCULATE_FINAL_RESULT",f"Resultado final consultado para {postulacion.codigo}.")
        return {"nota_privada":nota_privada,"nota_publica":nota_publica,"aporte_privada":nota_privada,"aporte_publica":nota_publica,"nota_final":nota_final,"clasificacion":clasificacion,"resultado":clasificacion,"limitacion_normativa":"" if nota_final is not None else "La nota final requiere resultados consolidados de defensa privada y pública."}
