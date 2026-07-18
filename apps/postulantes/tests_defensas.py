from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.postulantes.defensas import EventoDefensaService, EvaluacionDefensaService
from apps.postulantes.models import (AsignacionPostulacion, EstadoPostulacion,
    EvaluacionDefensa, EventoDefensa, ParticipanteEvento, Postulacion, SeguimientoEtapa)
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
        self.mod=Modalidad.objects.create(codigo="PGDEF",nombre="Proyecto grado defensa")
        self.period=Periodo.objects.create(nombre="2026-DEF",fecha_inicio="2026-01-01",fecha_fin="2026-12-31")
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
        for kind,typ in (("DEFENSA_PERFIL","PERFIL"),("DEFENSA_PRIVADA","PRIVADA")):
            ev=self.event(kind); EvaluacionDefensa(evento=ev,tipo_evaluacion=typ,modalidad_registro="CONSENSO",resultado_cualitativo="SUFICIENTE",ponderacion=Decimal("30") if typ=="PRIVADA" else None).full_clean()
            with self.assertRaises(ValidationError): EvaluacionDefensa(evento=ev,tipo_evaluacion=typ,modalidad_registro="CONSENSO",resultado_cualitativo="APROBADO",nota_numerica=80).full_clean()
        ev=self.event("DEFENSA_PUBLICA","EN_CURSO")
        for n in (Decimal("1"),Decimal("100")): EvaluacionDefensa(evento=ev,tipo_evaluacion="PUBLICA",modalidad_registro="CONSENSO",nota_numerica=n).full_clean()
        for n in (0,101):
            with self.assertRaises(ValidationError): EvaluacionDefensa(evento=ev,tipo_evaluacion="PUBLICA",modalidad_registro="CONSENSO",nota_numerica=n).full_clean()
        self.assertEqual(EvaluacionDefensaService.registrar_evaluacion_publica(ev,self.admin,Decimal("80")).aporte_ponderado,Decimal("56.00"))


class ServiciosDefensaTests(DefensaMixin,TestCase):
    def test_programacion_y_auditoria(self):
        ev=EventoDefensaService.programar_evento(self.post,self.follow["PERFIL_PROYECTO"],"DEFENSA_PERFIL",timezone.now(),self.admin,lugar="Sala")
        self.assertEqual(ev.tipo_evento,"DEFENSA_PERFIL"); self.assertTrue(AuditLog.objects.filter(accion="PROGRAM",modulo="DEFENSAS").exists())

    def test_programacion_rechaza_anteriores_y_48_horas(self):
        with self.assertRaises(ValidationError): EventoDefensaService.programar_evento(self.post,self.follow["DEFENSA_PRIVADA"],"DEFENSA_PRIVADA",timezone.now(),self.admin,lugar="S")
        SeguimientoEtapa.objects.filter(pk__in=[self.follow["PERFIL_PROYECTO"].pk,self.follow["DEFENSA_PRIVADA"].pk]).update(estado="APROBADA")
        with self.assertRaises(ValidationError): EventoDefensaService.programar_evento(self.post,self.follow["DEFENSA_PUBLICA"],"DEFENSA_PUBLICA",timezone.now()+timedelta(hours=47),self.admin,lugar="S")

    def test_ciclo_operativo_y_auditoria(self):
        ev=self.event(); ev=EventoDefensaService.iniciar_evento(ev,self.admin); ev=EventoDefensaService.suspender_evento(ev,self.admin,"Falta quórum"); ev=EventoDefensaService.reprogramar_evento(ev,timezone.now()+timedelta(days=2),self.admin,"Nueva fecha"); ev=EventoDefensaService.cancelar_evento(ev,self.admin,"Causa")
        self.assertEqual(ev.estado,"CANCELADA"); self.assertTrue({"START","SUSPEND","RESCHEDULE","CANCEL"}.issubset(set(AuditLog.objects.values_list("accion",flat=True))))

    def test_quorum_perfil_privada_publica(self):
        cases=(("DEFENSA_PERFIL",["TRIBUNAL","TRIBUNAL"]),("DEFENSA_PRIVADA",["TRIBUNAL","TRIBUNAL","DOCENTE_MODALIDAD"]),("DEFENSA_PUBLICA",["TRIBUNAL","TRIBUNAL","PRESIDENTE","SECRETARIO"]))
        for kind,roles in cases:
            ev=self.event(kind,"EN_CURSO"); parts=self.add(ev,roles); self.assertTrue(EventoDefensaService.validar_quorum(ev)["valido"])
            parts[-1].presente=False; parts[-1].save(); self.assertFalse(EventoDefensaService.validar_quorum(ev)["valido"])

    def test_finalizacion_exige_quorum(self):
        ev=self.event(state="EN_CURSO")
        with self.assertRaises(ValidationError): EventoDefensaService.finalizar_evento(ev,self.admin)
        self.add(ev,["TRIBUNAL","TRIBUNAL"]); self.assertEqual(EventoDefensaService.finalizar_evento(ev,self.admin).estado,"FINALIZADA")

    def test_resultado_final_no_inventa_total(self):
        ev=self.event("DEFENSA_PUBLICA","FINALIZADA")
        EvaluacionDefensa.objects.create(evento=ev,tipo_evaluacion="PUBLICA",modalidad_registro="CONSENSO",nota_numerica=Decimal("80"),ponderacion=Decimal("70"),aporte_ponderado=Decimal("56"),registrado_por=self.admin)
        EvaluacionDefensaService.consolidar_evaluacion_evento(ev,self.admin)
        result=EvaluacionDefensaService.calcular_resultado_final(self.post,self.admin)
        self.assertIsNone(result["nota_final"]); self.assertEqual(result["aporte_publica"],Decimal("56.00"))


class ApiDefensaTests(DefensaMixin,APITestCase):
    def test_autenticacion_propiedad_y_permisos(self):
        ev=self.event(); url=f"/api/v1/eventos-defensa/{ev.pk}/"
        self.assertEqual(self.client.get(url).status_code,401)
        self.client.force_authenticate(self.student); self.assertEqual(self.client.get(url).status_code,200); self.assertEqual(self.client.post(url+"iniciar/").status_code,403)
        self.client.force_authenticate(self.admin); self.assertEqual(self.client.post(url+"iniciar/").status_code,200)

    def test_put_patch_directos_no_expuestos(self):
        ev=self.event(); self.client.force_authenticate(self.admin); url=f"/api/v1/eventos-defensa/{ev.pk}/"
        self.assertEqual(self.client.patch(url,{"estado":"FINALIZADA"}).status_code,405); self.assertEqual(self.client.put(url,{"estado":"FINALIZADA"}).status_code,405)

    def test_docente_evalua_solo_participacion_propia(self):
        ev=self.event(state="EN_CURSO"); p=self.add(ev,["TRIBUNAL"])[0]; self.client.force_authenticate(self.docs[0])
        url=f"/api/v1/eventos-defensa/{ev.pk}/evaluaciones/perfil/"
        self.assertEqual(self.client.post(url,{"resultado":"SUFICIENTE","evaluador":p.pk}).status_code,201)
        self.assertEqual(EvaluacionDefensa.objects.get().modalidad_registro,"INDIVIDUAL")

    def test_resultado_final_no_admite_put(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.put(f"/api/v1/postulaciones/{self.post.pk}/resultado-final/",{}).status_code,405)
