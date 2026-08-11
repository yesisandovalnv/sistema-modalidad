from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase
from unittest.mock import patch

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.postulantes.defensas import EventoDefensaService, EvaluacionDefensaService
from apps.postulantes.models import (AsignacionPostulacion, EstadoPostulacion,
    EvaluacionDefensa, EventoDefensa, ParticipanteEvento, Postulacion, SeguimientoEtapa)
from apps.notificaciones.models import Notificacion
from apps.usuarios.models import AuditLog, Role

User = get_user_model()


class DefensaMixin:
    def setUp(self):
        super().setUp()
        ar=Role.objects.create(codigo="ADMDEF",nombre="Admin defensa"); sr=Role.objects.create(codigo="ESTDEF",nombre="Estudiante defensa"); dr=Role.objects.create(codigo="DOCDEF",nombre="Docente defensa")
        self.admin=User.objects.create_user(username="admdef",role=ar,is_staff=True)
        self.student=User.objects.create_user(username="estdef",role=sr)
        self.other=User.objects.create_user(username="otrodef",role=sr)
        self.docs=[User.objects.create_user(username=f"docdef{i}",role=dr) for i in range(5)]
        self.mod=Modalidad.objects.create(codigo="PROYECTO_GRADO",nombre="Proyecto grado defensa")
        self.period=Periodo.objects.create(nombre="2026-DEF",gestion=2026,semestre="I",fecha_inicio="2026-01-01",fecha_fin="2026-12-31")
        state=EstadoPostulacion.objects.create(codigo="REGDEF",nombre="Registrada defensa")
        self.post=Postulacion.objects.create(codigo="P-DEF",estudiante=self.student,modalidad=self.mod,periodo=self.period,estado_actual=state)
        self.other_post=Postulacion.objects.create(codigo="P-OTRA-DEF",estudiante=self.other,modalidad=self.mod,periodo=self.period,estado_actual=state)
        self.follow={}
        for order,code in enumerate(("PERFIL_PROYECTO","DEFENSA_PRIVADA","DEFENSA_PUBLICA"),1):
            stage=EtapaModalidad.objects.create(modalidad=self.mod,codigo=code,nombre=code,orden=order,origen_normativo="Reglamento")
            self.follow[code]=SeguimientoEtapa.objects.create(postulacion=self.post,etapa=stage,estado="EN_PROCESO")
        self.assign={}
        for doc,role in zip(self.docs,("TRIBUNAL","TRIBUNAL","DOCENTE_MODALIDAD","PRESIDENTE","SECRETARIO")):
            self.assign.setdefault(role,[]).append(AsignacionPostulacion.objects.create(postulacion=self.post,usuario=doc,tipo_participacion=role,designado_por=self.admin))

    def event(self,kind="DEFENSA_PERFIL",state="PROGRAMADA"):
        code={"DEFENSA_PERFIL":"PERFIL_PROYECTO","DEFENSA_PRIVADA":"DEFENSA_PRIVADA","DEFENSA_PUBLICA":"DEFENSA_PUBLICA"}[kind]
        return EventoDefensa.objects.create(postulacion=self.post,seguimiento_etapa=self.follow[code],tipo_evento=kind,estado=state,fecha_programada=timezone.now(),lugar="Sala",programado_por=self.admin)

    def add(self,event,roles,present=True):
        used={}; result=[]
        for role in roles:
            idx=used.get(role,0); used[role]=idx+1
            result.append(ParticipanteEvento.objects.create(evento=event,asignacion=self.assign[role][idx],rol_evento=role,presente=present if event.estado=="EN_CURSO" else None))
        return result


class ModelosDefensaTests(DefensaMixin,TestCase):
    def test_evento_seguimiento_tipo_intento_y_fechas(self):
        foreign=SeguimientoEtapa.objects.create(postulacion=self.other_post,etapa=self.follow["PERFIL_PROYECTO"].etapa,estado="EN_PROCESO")
        base=dict(postulacion=self.post,tipo_evento="DEFENSA_PERFIL",fecha_programada=timezone.now(),lugar="S",programado_por=self.admin)
        for data in ({"seguimiento_etapa":foreign},{"seguimiento_etapa":self.follow["DEFENSA_PRIVADA"]},{"seguimiento_etapa":self.follow["PERFIL_PROYECTO"],"numero_intento":0},{"seguimiento_etapa":self.follow["PERFIL_PROYECTO"],"fecha_inicio_real":timezone.now(),"fecha_fin_real":timezone.now()-timedelta(hours=1)}):
            with self.assertRaises(ValidationError): EventoDefensa(**base,**data).full_clean()

    def test_evento_modalidades(self):
        base=dict(postulacion=self.post,seguimiento_etapa=self.follow["PERFIL_PROYECTO"],tipo_evento="DEFENSA_PERFIL",fecha_programada=timezone.now(),programado_por=self.admin)
        for data in ({"modalidad_evento":"PRESENCIAL"},{"modalidad_evento":"VIRTUAL"},{"modalidad_evento":"MIXTA","lugar":"S"}):
            with self.assertRaises(ValidationError): EventoDefensa(**base,**data).full_clean()
        EventoDefensa(**base,modalidad_evento="MIXTA",lugar="S",enlace_virtual="https://example.test").full_clean()

    def test_evento_historico_permite_nuevo_activo(self):
        old=self.event(); old.activo=False; old.estado="FINALIZADA"; old.save()
        self.assertIsNotNone(self.event().pk)

    def test_participante_rechaza_rol_e_inactividad(self):
        ev=self.event(); assignment=self.assign["TRIBUNAL"][0]
        with self.assertRaises(ValidationError): ParticipanteEvento(evento=ev,asignacion=assignment,rol_evento="TUTOR").full_clean()
        assignment.activo=False; assignment.save(update_fields=["activo"])
        with self.assertRaises(ValidationError): ParticipanteEvento(evento=ev,asignacion=assignment,rol_evento="TRIBUNAL").full_clean()

    def test_asistencia_registra_responsable_y_fecha(self):
        ev=self.event(state="EN_CURSO"); p=self.add(ev,["TRIBUNAL"])[0]
        p=EventoDefensaService.registrar_asistencia(p,True,self.admin)
        self.assertEqual(p.registrado_por,self.admin); self.assertIsNotNone(p.fecha_registro_asistencia)

    def test_perfil_privada_y_publica_validan_resultados(self):
        ev=self.event(); EvaluacionDefensa(evento=ev,tipo_evaluacion="PERFIL",modalidad_registro="CONSENSO",resultado_cualitativo="SUFICIENTE").full_clean()
        with self.assertRaises(ValidationError): EvaluacionDefensa(evento=ev,tipo_evaluacion="PERFIL",modalidad_registro="CONSENSO",resultado_cualitativo="APROBADO",nota_numerica=1).full_clean()
        ev=self.event("DEFENSA_PRIVADA");
        for n in (Decimal("0"),Decimal("30")): EvaluacionDefensa(evento=ev,tipo_evaluacion="PRIVADA",modalidad_registro="CONSENSO",resultado_cualitativo="SUFICIENTE",nota_numerica=n,ponderacion=Decimal("30"),aporte_ponderado=n).full_clean()
        for n in (-1,31):
            with self.assertRaises(ValidationError): EvaluacionDefensa(evento=ev,tipo_evaluacion="PRIVADA",modalidad_registro="CONSENSO",resultado_cualitativo="SUFICIENTE",nota_numerica=n,ponderacion=Decimal("30"),aporte_ponderado=n).full_clean()
        ev=self.event("DEFENSA_PUBLICA","EN_CURSO")
        for n in (Decimal("0"),Decimal("70")): EvaluacionDefensa(evento=ev,tipo_evaluacion="PUBLICA",modalidad_registro="CONSENSO",nota_numerica=n,ponderacion=Decimal("70"),aporte_ponderado=n).full_clean()
        for n in (-1,71):
            with self.assertRaises(ValidationError): EvaluacionDefensa(evento=ev,tipo_evaluacion="PUBLICA",modalidad_registro="CONSENSO",nota_numerica=n,ponderacion=Decimal("70"),aporte_ponderado=n).full_clean()


class ServiciosDefensaTests(DefensaMixin,TestCase):
    def test_programacion_y_auditoria(self):
        ev=EventoDefensaService.programar_evento(self.post,self.follow["PERFIL_PROYECTO"],"DEFENSA_PERFIL",timezone.now(),self.admin,lugar="Sala")
        self.assertEqual(ev.tipo_evento,"DEFENSA_PERFIL"); self.assertTrue(AuditLog.objects.filter(accion="PROGRAM",modulo="DEFENSAS").exists())

    def test_programacion_rechaza_anteriores_y_48_horas(self):
        with self.assertRaises(ValidationError): EventoDefensaService.programar_evento(self.post,self.follow["DEFENSA_PRIVADA"],"DEFENSA_PRIVADA",timezone.now(),self.admin,lugar="S")
        SeguimientoEtapa.objects.filter(pk__in=[self.follow["PERFIL_PROYECTO"].pk,self.follow["DEFENSA_PRIVADA"].pk]).update(estado="APROBADA")
        with self.assertRaises(ValidationError): EventoDefensaService.programar_evento(self.post,self.follow["DEFENSA_PUBLICA"],"DEFENSA_PUBLICA",timezone.now()+timedelta(hours=47),self.admin,lugar="S")

    def test_programacion_duplicada_y_carrera_de_integridad_son_errores_controlados(self):
        self.event()
        with self.assertRaisesMessage(ValidationError, "Ya existe una defensa activa del mismo tipo e intento."):
            EventoDefensaService.programar_evento(
                self.post, self.follow["PERFIL_PROYECTO"], "DEFENSA_PERFIL",
                timezone.now(), self.admin, lugar="Sala",
            )
        EventoDefensa.objects.all().delete()
        with patch.object(EventoDefensa, "save", side_effect=IntegrityError("race")):
            with self.assertRaisesMessage(ValidationError, "Ya existe una defensa activa del mismo tipo e intento."):
                EventoDefensaService.programar_evento(
                    self.post, self.follow["PERFIL_PROYECTO"], "DEFENSA_PERFIL",
                    timezone.now(), self.admin, lugar="Sala",
                )
        self.assertFalse(AuditLog.objects.filter(accion="PROGRAM", modulo="DEFENSAS").exists())

    def test_inicio_anticipado_es_rechazado_tambien_para_staff(self):
        ev=self.event(); ev.fecha_programada=timezone.now()+timedelta(minutes=5); ev.save()
        with self.assertRaisesMessage(ValidationError, "No puede iniciar antes de la fecha programada."):
            EventoDefensaService.iniciar_evento(ev,self.admin)
        ev.refresh_from_db(); self.assertEqual(ev.estado,"PROGRAMADA"); self.assertIsNone(ev.fecha_inicio_real)
        self.assertFalse(AuditLog.objects.filter(accion="START",modulo="DEFENSAS").exists())

    def test_ciclo_operativo_y_auditoria(self):
        ev=self.event(); ev=EventoDefensaService.iniciar_evento(ev,self.admin); ev=EventoDefensaService.suspender_evento(ev,self.admin,"Falta quórum"); ev=EventoDefensaService.reprogramar_evento(ev,timezone.now()+timedelta(days=2),self.admin,"Nueva fecha"); ev=EventoDefensaService.cancelar_evento(ev,self.admin,"Causa")
        self.assertEqual(ev.estado,"CANCELADA"); self.assertTrue({"START","SUSPEND","RESCHEDULE","CANCEL"}.issubset(set(AuditLog.objects.values_list("accion",flat=True))))

    def test_reprogramar_suspendida_limpia_metadatos_tecnicos_de_cierre(self):
        ev=self.event(state="EN_CURSO"); ev.fecha_inicio_real=timezone.now()-timedelta(hours=1); ev.iniciado_por=self.admin; ev.save()
        ev=EventoDefensaService.suspender_evento(ev,self.admin,"Pausa técnica")
        ev=EventoDefensaService.reprogramar_evento(ev,timezone.now()+timedelta(days=1),self.admin,"Nueva fecha")
        self.assertEqual(ev.estado,"PROGRAMADA")
        self.assertIsNone(ev.fecha_inicio_real); self.assertIsNone(ev.fecha_fin_real)
        self.assertIsNone(ev.iniciado_por); self.assertIsNone(ev.cerrado_por)
        self.assertTrue(AuditLog.objects.filter(accion="SUSPEND",modulo="DEFENSAS").exists())
        self.assertTrue(AuditLog.objects.filter(accion="RESCHEDULE",modulo="DEFENSAS").exists())

    def test_suspension_repetida_no_audita_ni_notifica(self):
        ev=self.event()
        with self.captureOnCommitCallbacks(execute=True):
            ev=EventoDefensaService.suspender_evento(ev,self.admin,"Primera suspensión")
        first_end=ev.fecha_fin_real
        audits=AuditLog.objects.filter(accion="SUSPEND",modulo="DEFENSAS").count()
        notifications=Notificacion.objects.filter(tipo="DEFENSA_SUSPENDIDA").count()
        with self.assertRaisesMessage(ValidationError,"El evento ya está suspendido."):
            EventoDefensaService.suspender_evento(ev,self.admin,"Segunda suspensión")
        ev.refresh_from_db(); self.assertEqual(ev.fecha_fin_real,first_end)
        self.assertEqual(AuditLog.objects.filter(accion="SUSPEND",modulo="DEFENSAS").count(),audits)
        self.assertEqual(Notificacion.objects.filter(tipo="DEFENSA_SUSPENDIDA").count(),notifications)

    def test_postulacion_inactiva_bloquea_todas_las_acciones(self):
        actions = (
            lambda ev: EventoDefensaService.iniciar_evento(ev,self.admin),
            lambda ev: EventoDefensaService.finalizar_evento(ev,self.admin),
            lambda ev: EventoDefensaService.suspender_evento(ev,self.admin,"Motivo"),
            lambda ev: EventoDefensaService.cancelar_evento(ev,self.admin,"Motivo"),
            lambda ev: EventoDefensaService.reprogramar_evento(ev,timezone.now()+timedelta(days=1),self.admin,"Motivo"),
        )
        for index, action in enumerate(actions):
            ev=self.event(); self.post.activo=False; self.post.save(update_fields=["activo"])
            with self.assertRaisesMessage(ValidationError,"La postulación no está activa"):
                action(ev)
            self.post.activo=True; self.post.save(update_fields=["activo"]); ev.delete()
        self.post.activo=False; self.post.save(update_fields=["activo"])
        with self.assertRaisesMessage(ValidationError,"La postulación no está activa"):
            EventoDefensaService.programar_evento(
                self.post,self.follow["PERFIL_PROYECTO"],"DEFENSA_PERFIL",timezone.now(),self.admin,lugar="Sala"
            )
        self.assertFalse(AuditLog.objects.filter(modulo="DEFENSAS").exists())

    def test_matriz_de_estados_para_participantes_y_asistencia(self):
        for state in ("PROGRAMADA","EN_CURSO","SUSPENDIDA"):
            ev=self.event(state=state); assignment=self.assign["TRIBUNAL"][0]
            participant=EventoDefensaService.agregar_participante(ev,assignment,"TRIBUNAL",self.admin)
            if state == "EN_CURSO":
                self.assertTrue(EventoDefensaService.registrar_asistencia(participant,True,self.admin).presente)
            else:
                with self.assertRaisesMessage(ValidationError,"El evento no está en curso"):
                    EventoDefensaService.registrar_asistencia(participant,True,self.admin)
            EventoDefensaService.remover_participante(ev,participant,self.admin)
            ev.activo=False; ev.save(update_fields=["activo"])
        for state in ("FINALIZADA","CANCELADA"):
            ev=self.event(state=state); assignment=self.assign["TRIBUNAL"][0]
            with self.assertRaisesMessage(ValidationError,"El evento ya no admite participantes"):
                EventoDefensaService.agregar_participante(ev,assignment,"TRIBUNAL",self.admin)
            participant=ParticipanteEvento.objects.create(evento=ev,asignacion=assignment,rol_evento="TRIBUNAL")
            with self.assertRaisesMessage(ValidationError,"El evento ya no admite modificar participantes"):
                EventoDefensaService.remover_participante(ev,participant,self.admin)
            ev.activo=False; ev.save(update_fields=["activo"])

    def test_retiro_y_reactivacion_reutilizan_registro_y_limpian_asistencia(self):
        ev=self.event(state="EN_CURSO"); assignment=self.assign["TRIBUNAL"][0]
        participant=EventoDefensaService.agregar_participante(ev,assignment,"TRIBUNAL",self.admin)
        participant=EventoDefensaService.registrar_asistencia(participant,True,self.admin,"Presente inicial")
        original_id=participant.pk
        EventoDefensaService.remover_participante(ev,participant,self.admin)
        historical=ParticipanteEvento._base_manager.get(pk=original_id)
        self.assertFalse(historical.activo); self.assertTrue(historical.presente)
        self.assertEqual(historical.observaciones,"Presente inicial")
        with self.assertRaisesMessage(ValidationError,"El participante ya fue retirado"):
            EventoDefensaService.remover_participante(ev,historical,self.admin)
        reactivated=EventoDefensaService.agregar_participante(ev,assignment,"TRIBUNAL",self.admin)
        self.assertEqual(reactivated.pk,original_id); self.assertTrue(reactivated.activo); self.assertTrue(reactivated.convocado)
        self.assertEqual(ParticipanteEvento._base_manager.filter(evento=ev,asignacion=assignment).count(),1)
        self.assertIsNone(reactivated.presente); self.assertIsNone(reactivated.fecha_registro_asistencia)
        self.assertIsNone(reactivated.registrado_por); self.assertEqual(reactivated.observaciones,"")
        self.assertEqual(AuditLog.objects.filter(accion="ADD_PARTICIPANT",modulo="DEFENSAS").count(),2)
        self.assertEqual(AuditLog.objects.filter(accion="REMOVE_PARTICIPANT",modulo="DEFENSAS").count(),1)
        self.assertFalse(Notificacion.objects.exists())

    def test_alta_rechaza_duplicado_y_asignaciones_incompatibles(self):
        ev=self.event(); assignment=self.assign["TRIBUNAL"][0]
        EventoDefensaService.agregar_participante(ev,assignment,"TRIBUNAL",self.admin)
        with self.assertRaisesMessage(ValidationError,"ya participa activamente"):
            EventoDefensaService.agregar_participante(ev,assignment,"TRIBUNAL",self.admin)
        with self.assertRaisesMessage(ValidationError,"rol no es compatible"):
            EventoDefensaService.agregar_participante(ev,self.assign["PRESIDENTE"][0],"TRIBUNAL",self.admin)
        foreign=AsignacionPostulacion.objects.create(postulacion=self.other_post,usuario=self.docs[4],tipo_participacion="SECRETARIO",designado_por=self.admin)
        with self.assertRaisesMessage(ValidationError,"no pertenece a la postulación"):
            EventoDefensaService.agregar_participante(ev,foreign,"SECRETARIO",self.admin)
        inactive=self.assign["TRIBUNAL"][1]; inactive.activo=False; inactive.save(update_fields=["activo"])
        with self.assertRaisesMessage(ValidationError,"debe estar activa"):
            EventoDefensaService.agregar_participante(ev,inactive,"TRIBUNAL",self.admin)
        assignment.usuario.is_active=False; assignment.usuario.save(update_fields=["is_active"])
        existing=ParticipanteEvento.objects.get(evento=ev,asignacion=assignment)
        EventoDefensaService.remover_participante(ev,existing,self.admin)
        with self.assertRaisesMessage(ValidationError,"usuario asignado debe estar activo"):
            EventoDefensaService.agregar_participante(ev,assignment,"TRIBUNAL",self.admin)

    def test_asistencia_se_corrige_y_retiro_ajeno_es_controlado(self):
        ev=self.event(state="EN_CURSO"); participant=self.add(ev,["TRIBUNAL"],present=False)[0]
        first=EventoDefensaService.registrar_asistencia(participant,True,self.admin,"Primera")
        first_date=first.fecha_registro_asistencia
        corrected=EventoDefensaService.registrar_asistencia(first,False,self.admin,"Corregida")
        self.assertFalse(corrected.presente); self.assertEqual(corrected.observaciones,"Corregida")
        self.assertGreaterEqual(corrected.fecha_registro_asistencia,first_date)
        self.assertEqual(AuditLog.objects.filter(accion="ATTENDANCE",modulo="DEFENSAS").count(),2)
        other_event=self.event(kind="DEFENSA_PRIVADA",state="EN_CURSO")
        with self.assertRaisesMessage(ValidationError,"no pertenece al evento"):
            EventoDefensaService.remover_participante(other_event,participant,self.admin)

    def test_asignacion_historica_conserva_participante_asistencia_y_quorum(self):
        ev=self.event(state="EN_CURSO"); participants=self.add(ev,["TRIBUNAL","TRIBUNAL"])
        assignment=participants[0].asignacion; assignment.activo=False; assignment.save(update_fields=["activo"])
        updated=EventoDefensaService.registrar_asistencia(participants[0],True,self.admin,"Histórica")
        self.assertTrue(updated.presente); self.assertTrue(ParticipanteEvento.objects.filter(pk=updated.pk).exists())
        self.assertTrue(EventoDefensaService.validar_quorum(ev,self.admin)["valido"])
        self.assertTrue(AuditLog.objects.filter(accion="ATTENDANCE",modulo="DEFENSAS").exists())
        self.assertTrue(AuditLog.objects.filter(accion="QUORUM_CHECK",modulo="DEFENSAS").exists())

    def test_retirado_y_tutor_no_cuentan_como_tribunal(self):
        tutor=AsignacionPostulacion.objects.create(postulacion=self.post,usuario=self.docs[4],tipo_participacion="TUTOR",designado_por=self.admin)
        ev=self.event(state="EN_CURSO"); tribunals=self.add(ev,["TRIBUNAL","TRIBUNAL"])
        ParticipanteEvento.objects.create(evento=ev,asignacion=tutor,rol_evento="TUTOR",presente=True)
        self.assertTrue(EventoDefensaService.validar_quorum(ev)["valido"])
        EventoDefensaService.remover_participante(ev,tribunals[0],self.admin)
        self.assertFalse(EventoDefensaService.validar_quorum(ev)["valido"])

    def test_quorum_perfil_privada_publica(self):
        cases=(("DEFENSA_PERFIL",["TRIBUNAL","TRIBUNAL"]),("DEFENSA_PRIVADA",["TRIBUNAL","TRIBUNAL","DOCENTE_MODALIDAD"]),("DEFENSA_PUBLICA",["TRIBUNAL","TRIBUNAL","PRESIDENTE","SECRETARIO"]))
        for kind,roles in cases:
            ev=self.event(kind,"EN_CURSO"); parts=self.add(ev,roles); self.assertTrue(EventoDefensaService.validar_quorum(ev)["valido"])
            parts[-1].presente=False; parts[-1].save(); self.assertFalse(EventoDefensaService.validar_quorum(ev)["valido"])

    def test_finalizacion_exige_quorum(self):
        ev=self.event(state="EN_CURSO")
        with self.assertRaises(ValidationError): EventoDefensaService.finalizar_evento(ev,self.admin)
        self.add(ev,["TRIBUNAL","TRIBUNAL"]); self.assertEqual(EventoDefensaService.finalizar_evento(ev,self.admin).estado,"FINALIZADA")

    def test_matriz_rechaza_transiciones_invalidas_y_estados_terminales(self):
        ev=self.event(state="PROGRAMADA")
        with self.assertRaises(ValidationError): EventoDefensaService.finalizar_evento(ev,self.admin)
        ev.estado="EN_CURSO"; ev.save()
        with self.assertRaises(ValidationError): EventoDefensaService.iniciar_evento(ev,self.admin)
        with self.assertRaises(ValidationError): EventoDefensaService.reprogramar_evento(ev,timezone.now()+timedelta(days=1),self.admin,"Motivo")
        for state in ("FINALIZADA","CANCELADA"):
            ev.estado=state; ev.save()
            for action in (
                lambda: EventoDefensaService.iniciar_evento(ev,self.admin),
                lambda: EventoDefensaService.finalizar_evento(ev,self.admin),
                lambda: EventoDefensaService.suspender_evento(ev,self.admin,"Motivo"),
                lambda: EventoDefensaService.cancelar_evento(ev,self.admin,"Motivo"),
                lambda: EventoDefensaService.reprogramar_evento(ev,timezone.now()+timedelta(days=1),self.admin,"Motivo"),
            ):
                with self.assertRaises(ValidationError): action()

    def test_resultado_final_suma_aportes_y_no_sustituye_faltantes_por_cero(self):
        private=self.event("DEFENSA_PRIVADA","FINALIZADA"); public=self.event("DEFENSA_PUBLICA","FINALIZADA")
        EvaluacionDefensa.objects.create(evento=private,tipo_evaluacion="RESULTADO_FINAL",modalidad_registro="CONSENSO",resultado_cualitativo="SUFICIENTE",nota_numerica=Decimal("24"),ponderacion=Decimal("30"),aporte_ponderado=Decimal("24"),es_resultado_final_evento=True,registrado_por=self.admin)
        result=EvaluacionDefensaService.calcular_resultado_final(self.post,self.admin)
        self.assertIsNone(result["nota_final"])
        EvaluacionDefensa.objects.create(evento=public,tipo_evaluacion="RESULTADO_FINAL",modalidad_registro="CONSENSO",nota_numerica=Decimal("60"),ponderacion=Decimal("70"),aporte_ponderado=Decimal("60"),es_resultado_final_evento=True,registrado_por=self.admin)
        result=EvaluacionDefensaService.calcular_resultado_final(self.post,self.admin)
        self.assertEqual(result["nota_final"],Decimal("84.00")); self.assertEqual(result["clasificacion"],"APROBACION_PLENA")

    def test_clasificacion_cubre_todos_los_limites_confirmados(self):
        casos = {
            0: "POSTERGADO", 50: "POSTERGADO",
            51: "APROBADO", 74: "APROBADO",
            75: "APROBACION_PLENA", 89: "APROBACION_PLENA",
            90: "APROBACION_PLENA_CON_FELICITACION",
            100: "APROBACION_PLENA_CON_FELICITACION",
        }
        for nota, esperado in casos.items():
            with self.subTest(nota=nota):
                self.assertEqual(EvaluacionDefensaService.clasificar_nota_final(Decimal(nota)), esperado)


class ApiDefensaTests(DefensaMixin,APITestCase):
    def test_autenticacion_propiedad_y_permisos(self):
        ev=self.event(); url=f"/api/v1/eventos-defensa/{ev.pk}/"
        self.assertEqual(self.client.get(url).status_code,401)
        self.client.force_authenticate(self.student); self.assertEqual(self.client.get(url).status_code,200); self.assertEqual(self.client.post(url+"iniciar/").status_code,403)
        self.client.force_authenticate(self.admin); self.assertEqual(self.client.post(url+"iniciar/").status_code,200)

    def test_acciones_administrativas_aceptan_staff_y_superusuario(self):
        superuser=User.objects.create_superuser(username="superdef",password="secret")
        for user in (self.admin,superuser):
            ev=self.event(); self.client.force_authenticate(user)
            self.assertEqual(self.client.post(f"/api/v1/eventos-defensa/{ev.pk}/iniciar/",{}).status_code,200)
            ev.activo=False; ev.save(update_fields=["activo"])

    def test_acciones_administrativas_rechazan_todos_los_no_administrativos(self):
        historical=User.objects.create_user(username="histdef",role=self.docs[0].role)
        historical_assignment=AsignacionPostulacion.objects.create(
            postulacion=self.post,usuario=historical,tipo_participacion="TUTOR",designado_por=self.admin,
        )
        historical_assignment.activo=False; historical_assignment.save(update_fields=["activo"])
        participant=self.docs[0]; ev=self.event(); self.add(ev,["TRIBUNAL"])
        users=(self.student,self.docs[1],historical,participant,self.other)
        for user in users:
            self.client.force_authenticate(user)
            response=self.client.post(f"/api/v1/eventos-defensa/{ev.pk}/iniciar/",{})
            self.assertEqual(response.status_code,403,user.username)
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.post(f"/api/v1/eventos-defensa/{ev.pk}/iniciar/",{}).status_code,401)

    def test_programacion_duplicada_devuelve_error_400_estable(self):
        self.event(); self.client.force_authenticate(self.admin)
        response=self.client.post(
            f"/api/v1/postulaciones/{self.post.pk}/eventos-defensa/programar/",
            {
                "seguimiento_etapa":self.follow["PERFIL_PROYECTO"].pk,
                "tipo_evento":"DEFENSA_PERFIL",
                "fecha_programada":timezone.now().isoformat(),
                "lugar":"Sala",
                "modalidad_evento":"PRESENCIAL",
            },format="json",
        )
        self.assertEqual(response.status_code,400)
        self.assertEqual(response.data["non_field_errors"],["Ya existe una defensa activa del mismo tipo e intento."])

    def test_endpoints_participantes_mantienen_permiso_y_errores_controlados(self):
        ev=self.event(); assignment=self.assign["TRIBUNAL"][0]
        add_url=f"/api/v1/eventos-defensa/{ev.pk}/participantes/agregar/"
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.post(add_url,{"asignacion":assignment.pk,"rol_evento":"TRIBUNAL"}).status_code,403)
        self.client.force_authenticate(self.admin)
        response=self.client.post(add_url,{"asignacion":assignment.pk,"rol_evento":"TRIBUNAL"},format="json")
        self.assertEqual(response.status_code,201); participant_id=response.data["id"]
        self.assertEqual(self.client.post(add_url,{"asignacion":assignment.pk,"rol_evento":"TRIBUNAL"},format="json").status_code,400)
        remove_url=f"/api/v1/eventos-defensa/{ev.pk}/participantes/{participant_id}/remover/"
        self.assertEqual(self.client.post(remove_url,{},format="json").status_code,204)
        repeated=self.client.post(remove_url,{},format="json")
        self.assertEqual(repeated.status_code,400); self.assertIn("ya fue retirado",str(repeated.data))

    def test_put_patch_directos_no_expuestos(self):
        ev=self.event(); self.client.force_authenticate(self.admin); url=f"/api/v1/eventos-defensa/{ev.pk}/"
        self.assertEqual(self.client.patch(url,{"estado":"FINALIZADA"}).status_code,405); self.assertEqual(self.client.put(url,{"estado":"FINALIZADA"}).status_code,405)

    def test_evaluacion_es_administrativa_consensuada_con_quorum(self):
        ev=self.event(state="EN_CURSO"); self.add(ev,["TRIBUNAL","TRIBUNAL"]); self.client.force_authenticate(self.docs[0])
        url=f"/api/v1/eventos-defensa/{ev.pk}/evaluaciones/perfil/"
        self.assertEqual(self.client.post(url,{"resultado":"SUFICIENTE"}).status_code,403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post(url,{"resultado":"SUFICIENTE"}).status_code,201)
        self.assertEqual(self.client.post(url,{"resultado":"SUFICIENTE"}).status_code,400)
        self.assertEqual(EvaluacionDefensa.objects.get().modalidad_registro,"CONSENSO")

    def test_resultado_final_no_admite_put(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.put(f"/api/v1/postulaciones/{self.post.pk}/resultado-final/",{}).status_code,405)
