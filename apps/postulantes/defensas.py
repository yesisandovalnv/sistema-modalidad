from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.postulantes.models import (AsignacionPostulacion, EvaluacionDefensa,
    EventoDefensa, ParticipanteEvento, SeguimientoEtapa)
from apps.postulantes.workflow import WorkflowService
from apps.usuarios.models import AuditLog
from apps.modalidades.policies import ModalidadPolicyRegistry


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
    @transaction.atomic
    def programar_evento(postulacion, seguimiento_etapa, tipo_evento, fecha_programada, usuario,
                         lugar="", modalidad_evento="PRESENCIAL", enlace_virtual="", observaciones=""):
        seguimiento = SeguimientoEtapa.objects.select_for_update().select_related("etapa", "postulacion__modalidad").get(pk=seguimiento_etapa.pk)
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
        evento=EventoDefensa(postulacion=postulacion,seguimiento_etapa=seguimiento,tipo_evento=tipo_evento,
            numero_intento=seguimiento.numero_intento,fecha_programada=fecha_programada,programado_por=usuario,
            lugar=lugar,modalidad_evento=modalidad_evento,enlace_virtual=enlace_virtual,observaciones=observaciones)
        evento.save(); _audit(usuario,"PROGRAM",f"Evento {evento.pk} programado para {postulacion.codigo}."); return evento

    @staticmethod
    @transaction.atomic
    def agregar_participante(evento, asignacion, rol_evento, usuario):
        evento=EventoDefensa.objects.select_for_update().get(pk=evento.pk)
        if evento.estado in (evento.Estado.FINALIZADA,evento.Estado.CANCELADA): raise ValidationError("El evento ya no admite participantes.")
        if not asignacion.activo: raise ValidationError("La asignación debe estar activa al programar.")
        p=ParticipanteEvento(evento=evento,asignacion=asignacion,rol_evento=rol_evento); p.save()
        _audit(usuario,"ADD_PARTICIPANT",f"Participante {p.pk} agregado al evento {evento.pk}."); return p

    @staticmethod
    @transaction.atomic
    def remover_participante(evento, participante, usuario):
        evento=EventoDefensa.objects.select_for_update().get(pk=evento.pk)
        if participante.evento_id != evento.pk: raise ValidationError("El participante no pertenece al evento.")
        participante.activo=False; participante.save(update_fields=["activo","updated_at"]); _audit(usuario,"REMOVE_PARTICIPANT",f"Participante {participante.pk} removido.")

    @staticmethod
    @transaction.atomic
    def iniciar_evento(evento, usuario):
        evento=EventoDefensa.objects.select_for_update().get(pk=evento.pk)
        if evento.estado != evento.Estado.PROGRAMADA: raise ValidationError("Solo se inicia un evento programado.")
        if timezone.now() < evento.fecha_programada and not (usuario.is_staff or usuario.is_superuser): raise ValidationError("No puede iniciar antes de la fecha programada.")
        evento.estado=evento.Estado.EN_CURSO; evento.fecha_inicio_real=timezone.now(); evento.iniciado_por=usuario; evento.save(); _audit(usuario,"START",f"Evento {evento.pk} iniciado."); return evento

    @staticmethod
    @transaction.atomic
    def registrar_asistencia(participante, presente, usuario, observaciones=""):
        p=ParticipanteEvento.objects.select_for_update().select_related("evento").get(pk=participante.pk)
        if p.evento.estado != EventoDefensa.Estado.EN_CURSO: raise ValidationError("El evento no está en curso.")
        p.presente=presente; p.fecha_registro_asistencia=timezone.now(); p.registrado_por=usuario; p.observaciones=observaciones; p.save(); _audit(usuario,"ATTENDANCE",f"Asistencia registrada para {p.pk}."); return p

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
        if evento.estado != evento.Estado.EN_CURSO: raise ValidationError("El evento no está en curso.")
        if not EventoDefensaService.validar_quorum(evento,usuario)["valido"]: raise ValidationError("No se puede finalizar sin quórum.")
        evento.estado=evento.Estado.FINALIZADA; evento.fecha_fin_real=timezone.now(); evento.cerrado_por=usuario; evento.save(); _audit(usuario,"FINISH",f"Evento {evento.pk} finalizado."); return evento

    @staticmethod
    @transaction.atomic
    def _cerrar(evento,usuario,estado,motivo,accion):
        evento=EventoDefensa.objects.select_for_update().get(pk=evento.pk)
        if evento.estado in (evento.Estado.FINALIZADA,evento.Estado.CANCELADA): raise ValidationError("El evento no puede modificarse.")
        if not motivo.strip(): raise ValidationError("El motivo es obligatorio.")
        evento.estado=estado; evento.observaciones=(evento.observaciones+"\n"+motivo).strip(); evento.cerrado_por=usuario; evento.fecha_fin_real=timezone.now(); evento.save(); _audit(usuario,accion,f"Evento {evento.pk}: {motivo}"); return evento
    suspender_evento=staticmethod(lambda evento,usuario,motivo: EventoDefensaService._cerrar(evento,usuario,EventoDefensa.Estado.SUSPENDIDA,motivo,"SUSPEND"))
    cancelar_evento=staticmethod(lambda evento,usuario,motivo: EventoDefensaService._cerrar(evento,usuario,EventoDefensa.Estado.CANCELADA,motivo,"CANCEL"))

    @staticmethod
    @transaction.atomic
    def reprogramar_evento(evento,nueva_fecha,usuario,motivo):
        evento=EventoDefensa.objects.select_for_update().get(pk=evento.pk)
        if evento.estado not in (evento.Estado.PROGRAMADA,evento.Estado.SUSPENDIDA): raise ValidationError("El evento no admite reprogramación.")
        if not motivo.strip(): raise ValidationError("El motivo es obligatorio.")
        if evento.tipo_evento==evento.Tipo.DEFENSA_PUBLICA and nueva_fecha < timezone.now()+timedelta(hours=48): raise ValidationError("La defensa pública requiere 48 horas de anticipación.")
        evento.fecha_programada=nueva_fecha; evento.estado=evento.Estado.PROGRAMADA; evento.observaciones=(evento.observaciones+"\nReprogramación: "+motivo).strip(); evento.save(); _audit(usuario,"RESCHEDULE",f"Evento {evento.pk} reprogramado: {motivo}"); return evento


class EvaluacionDefensaService:
    @staticmethod
    def _registrar(evento,usuario,tipo,resultado="",nota=None,evaluador=None,modalidad_registro="CONSENSO",observaciones=""):
        policy=ModalidadPolicyRegistry.get(evento.postulacion)
        if tipo not in policy.get_tipos_evaluacion(): raise ValidationError("La modalidad no soporta este tipo de evaluación.")
        if evento.estado not in (EventoDefensa.Estado.EN_CURSO,EventoDefensa.Estado.FINALIZADA): raise ValidationError("El evento no puede evaluarse.")
        if evaluador and (not evaluador.presente): raise ValidationError("El evaluador individual debe estar presente.")
        ponderacion = Decimal("70.00") if tipo==EvaluacionDefensa.Tipo.PUBLICA else (Decimal("30.00") if tipo==EvaluacionDefensa.Tipo.PRIVADA else None)
        aporte=(Decimal(nota)*Decimal("0.70")).quantize(Decimal("0.01"),rounding=ROUND_HALF_UP) if nota is not None and tipo==EvaluacionDefensa.Tipo.PUBLICA else None
        e=EvaluacionDefensa(evento=evento,evaluador=evaluador,tipo_evaluacion=tipo,modalidad_registro=modalidad_registro,resultado_cualitativo=resultado,nota_numerica=nota,ponderacion=ponderacion,aporte_ponderado=aporte,observaciones=observaciones,registrado_por=usuario); e.save(); _audit(usuario,"EVALUATE",f"Evaluación {tipo} registrada en evento {evento.pk}."); return e
    registrar_evaluacion_perfil=staticmethod(lambda evento,usuario,resultado,evaluador=None,modalidad_registro="CONSENSO",observaciones="": EvaluacionDefensaService._registrar(evento,usuario,EvaluacionDefensa.Tipo.PERFIL,resultado,None,evaluador,modalidad_registro,observaciones))
    registrar_evaluacion_privada=staticmethod(lambda evento,usuario,resultado,evaluador=None,modalidad_registro="CONSENSO",observaciones="": EvaluacionDefensaService._registrar(evento,usuario,EvaluacionDefensa.Tipo.PRIVADA,resultado,None,evaluador,modalidad_registro,observaciones))
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
        if not qs.exists(): raise ValidationError("No existen evaluaciones para consolidar.")
        if evento.tipo_evento==EventoDefensa.Tipo.DEFENSA_PUBLICA:
            notas=[x.nota_numerica for x in qs if x.nota_numerica is not None]
            if not notas: raise ValidationError("No existen notas públicas para consolidar.")
            nota=(sum(notas)/len(notas)).quantize(Decimal("0.01"),rounding=ROUND_HALF_UP); resultado=EvaluacionDefensa.Resultado.APROBADO if nota>=51 else EvaluacionDefensa.Resultado.POSTERGADO
            e=EvaluacionDefensa(evento=evento,tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL,modalidad_registro=EvaluacionDefensa.ModalidadRegistro.CONSENSO,resultado_cualitativo=resultado,nota_numerica=nota,ponderacion=Decimal("70.00"),aporte_ponderado=(nota*Decimal("0.70")).quantize(Decimal("0.01")),es_resultado_final_evento=True,registrado_por=usuario)
        else:
            resultado=EvaluacionDefensa.Resultado.SUFICIENTE if all(x.resultado_cualitativo==EvaluacionDefensa.Resultado.SUFICIENTE for x in qs) else EvaluacionDefensa.Resultado.INSUFICIENTE
            e=EvaluacionDefensa(evento=evento,tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL,modalidad_registro=EvaluacionDefensa.ModalidadRegistro.CONSENSO,resultado_cualitativo=resultado,es_resultado_final_evento=True,registrado_por=usuario)
        e.save(); _audit(usuario,"CONSOLIDATE",f"Evento {evento.pk} consolidado.")
        if resultado in (EvaluacionDefensa.Resultado.SUFICIENTE,EvaluacionDefensa.Resultado.APROBADO): WorkflowService.aprobar_etapa(evento.seguimiento_etapa,usuario,"Aprobada por evaluación de defensa.")
        return e

    @staticmethod
    def calcular_resultado_final(postulacion,usuario):
        policy=ModalidadPolicyRegistry.get(postulacion)
        if not policy.permite_evaluaciones(): raise ValidationError("La modalidad no soporta evaluaciones.")
        # La privada es cualitativa en el texto recuperable: no existe una nota reproducible para sumar su 30 %.
        publica=EvaluacionDefensa.objects.filter(evento__postulacion=postulacion,tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL,evento__tipo_evento=EventoDefensa.Tipo.DEFENSA_PUBLICA).order_by("-created_at").first()
        if not publica: raise ValidationError("No existe resultado consolidado de defensa pública.")
        _audit(usuario,"CALCULATE_FINAL_RESULT",f"Resultado final consultado para {postulacion.codigo}; cálculo total pendiente por límite normativo.")
        return {"nota_publica": publica.nota_numerica, "aporte_publica": publica.aporte_ponderado, "resultado": publica.resultado_cualitativo, "nota_final": None, "limitacion_normativa": "La defensa privada representa 30 %, pero la fuente no aporta una nota numérica reproducible."}
