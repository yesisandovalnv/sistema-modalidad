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
from apps.modalidades.policies import ModalidadPolicyRegistry
from apps.postulantes.defensas import EventoDefensaService, EvaluacionDefensaService
from apps.postulantes.workflow import WorkflowService
from apps.postulantes.models import (AsignacionPostulacion, EstadoPostulacion,
    EvaluacionDefensa, EventoDefensa, ParticipanteEvento, Postulacion, SeguimientoEtapa)
from apps.notificaciones.models import Notificacion
from apps.usuarios.models import AuditLog, Role

User = get_user_model()


class DefensaMixin:
    def setUp(self):
        super().setUp()
        ar=Role.objects.create(codigo="ADMINISTRADOR",nombre="Admin defensa"); sr=Role.objects.create(codigo="ESTUDIANTE",nombre="Estudiante defensa"); dr=Role.objects.create(codigo="DOCENTE",nombre="Docente defensa")
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
        for order,code in enumerate(("PERFIL_PROYECTO","DEFENSA_PRIVADA","DEFENSA_PUBLICA","REVISION_FINAL_POST_PUBLICA"),1):
            stage=EtapaModalidad.objects.create(modalidad=self.mod,codigo=code,nombre=code,orden=order,origen_normativo="Reglamento")
            estado="PENDIENTE" if code=="REVISION_FINAL_POST_PUBLICA" else "EN_PROCESO"
            self.follow[code]=SeguimientoEtapa.objects.create(postulacion=self.post,etapa=stage,estado=estado)
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

    def public_event_with_quorum(self, state="EN_CURSO"):
        event=self.event("DEFENSA_PUBLICA",state)
        self.add(event,["TRIBUNAL","TRIBUNAL","PRESIDENTE","SECRETARIO"])
        return event

    def private_event_with_quorum(self, state="EN_CURSO"):
        event=self.event("DEFENSA_PRIVADA",state)
        self.add(event,["TRIBUNAL","TRIBUNAL","DOCENTE_MODALIDAD"])
        return event

    def add_private_consolidated_result(self, note=Decimal("25")):
        event=self.event("DEFENSA_PRIVADA","FINALIZADA")
        return EvaluacionDefensa.objects.create(
            evento=event,tipo_evaluacion="RESULTADO_FINAL",modalidad_registro="CONSENSO",
            resultado_cualitativo="SUFICIENTE",nota_numerica=note,ponderacion=Decimal("30"),
            aporte_ponderado=note,semantica_nota="LEGACY_PONDERADA",es_resultado_final_evento=True,registrado_por=self.admin,
        )


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
        for n in (Decimal("0"),Decimal("30")): EvaluacionDefensa(evento=ev,tipo_evaluacion="PRIVADA",modalidad_registro="CONSENSO",resultado_cualitativo="SUFICIENTE",nota_numerica=n,ponderacion=Decimal("30"),aporte_ponderado=n,semantica_nota="LEGACY_PONDERADA").full_clean()
        for n in (-1,31):
            with self.assertRaises(ValidationError): EvaluacionDefensa(evento=ev,tipo_evaluacion="PRIVADA",modalidad_registro="CONSENSO",resultado_cualitativo="SUFICIENTE",nota_numerica=n,ponderacion=Decimal("30"),aporte_ponderado=n,semantica_nota="LEGACY_PONDERADA").full_clean()
        ev=self.event("DEFENSA_PUBLICA","EN_CURSO")
        for n in (Decimal("0"),Decimal("70")): EvaluacionDefensa(evento=ev,tipo_evaluacion="PUBLICA",modalidad_registro="CONSENSO",nota_numerica=n,ponderacion=Decimal("70"),aporte_ponderado=n,semantica_nota="LEGACY_PONDERADA").full_clean()
        for n in (-1,71):
            with self.assertRaises(ValidationError): EvaluacionDefensa(evento=ev,tipo_evaluacion="PUBLICA",modalidad_registro="CONSENSO",nota_numerica=n,ponderacion=Decimal("70"),aporte_ponderado=n,semantica_nota="LEGACY_PONDERADA").full_clean()


class ServiciosDefensaTests(DefensaMixin,TestCase):
    def test_nueva_nota_privada_de_proyecto_es_bruta_y_se_pondera_con_decimal(self):
        for note, contribution in (
            (Decimal("85.00"), Decimal("25.50")),
            (Decimal("85.05"), Decimal("25.52")),
            (Decimal("83.00"), Decimal("24.90")),
            (Decimal("0.00"), Decimal("0.00")),
            (Decimal("100.00"), Decimal("30.00")),
        ):
            with self.subTest(note=note):
                event=self.private_event_with_quorum()
                try:
                    evaluation=EvaluacionDefensaService.registrar_evaluacion_privada(
                        event,self.admin,"SUFICIENTE",nota=note,modalidad_registro="CONSENSO",
                    )
                    self.assertEqual(evaluation.nota_numerica,note)
                    self.assertEqual(evaluation.ponderacion,Decimal("30.00"))
                    self.assertEqual(evaluation.aporte_ponderado,contribution)
                    self.assertEqual(evaluation.semantica_nota,"BRUTA_100")
                finally:
                    event.activo=False; event.save(update_fields=["activo"])

    def test_nueva_nota_privada_de_proyecto_rechaza_fuera_de_0_a_100(self):
        for note in (Decimal("-0.01"),Decimal("100.01")):
            with self.subTest(note=note):
                event=self.private_event_with_quorum()
                with self.assertRaises(ValidationError):
                    EvaluacionDefensaService.registrar_evaluacion_privada(
                        event,self.admin,"SUFICIENTE",nota=note,modalidad_registro="CONSENSO",
                    )
                event.activo=False; event.save(update_fields=["activo"])

    def test_nueva_nota_publica_de_proyecto_es_bruta_y_se_pondera_con_decimal(self):
        for note, contribution in (
            (Decimal("95.00"), Decimal("66.50")),
            (Decimal("87.15"), Decimal("61.01")),
            (Decimal("87.00"), Decimal("60.90")),
            (Decimal("0.00"), Decimal("0.00")),
            (Decimal("100.00"), Decimal("70.00")),
        ):
            with self.subTest(note=note):
                event=self.public_event_with_quorum()
                evaluation=EvaluacionDefensaService.registrar_evaluacion_publica(
                    event,self.admin,note,modalidad_registro="CONSENSO",
                )
                self.assertEqual(evaluation.nota_numerica,note)
                self.assertEqual(evaluation.ponderacion,Decimal("70.00"))
                self.assertEqual(evaluation.aporte_ponderado,contribution)
                self.assertEqual(evaluation.semantica_nota,"BRUTA_100")
                event.activo=False; event.save(update_fields=["activo"])

    def test_nueva_nota_publica_de_proyecto_rechaza_fuera_de_0_a_100(self):
        for note in (Decimal("-0.01"),Decimal("100.01")):
            with self.subTest(note=note):
                event=self.public_event_with_quorum()
                with self.assertRaises(ValidationError):
                    EvaluacionDefensaService.registrar_evaluacion_publica(
                        event,self.admin,note,modalidad_registro="CONSENSO",
                    )
                event.activo=False; event.save(update_fields=["activo"])

    def test_nota_privada_no_deriva_resultado_cualitativo(self):
        event=self.private_event_with_quorum()
        evaluation=EvaluacionDefensaService.registrar_evaluacion_privada(
            event,self.admin,"INSUFICIENTE",nota=Decimal("100.00"),modalidad_registro="CONSENSO",
        )
        self.assertEqual(evaluation.nota_numerica,Decimal("100.00"))
        self.assertEqual(evaluation.resultado_cualitativo,"INSUFICIENTE")

    def test_consolidado_preserva_nota_bruta_aporte_ponderado_y_semantica(self):
        event=self.public_event_with_quorum()
        source=EvaluacionDefensaService.registrar_evaluacion_publica(
            event,self.admin,Decimal("95.00"),modalidad_registro="CONSENSO",
        )
        event.estado="FINALIZADA"; event.fecha_fin_real=timezone.now(); event.save()

        consolidated=EvaluacionDefensaService.consolidar_evaluacion_evento(event,self.admin)

        self.assertEqual(source.nota_numerica,Decimal("95.00"))
        self.assertEqual(consolidated.nota_numerica,Decimal("95.00"))
        self.assertEqual(consolidated.ponderacion,Decimal("70.00"))
        self.assertEqual(consolidated.aporte_ponderado,Decimal("66.50"))
        self.assertEqual(consolidated.semantica_nota,"BRUTA_100")

    def test_resultado_final_mixto_usa_aporte_nuevo_y_preserva_nota_legacy(self):
        private=self.event("DEFENSA_PRIVADA","FINALIZADA")
        public=self.event("DEFENSA_PUBLICA","FINALIZADA")
        EvaluacionDefensa.objects.create(
            evento=private,tipo_evaluacion="RESULTADO_FINAL",modalidad_registro="CONSENSO",
            resultado_cualitativo="SUFICIENTE",nota_numerica=Decimal("25.00"),
            ponderacion=Decimal("30.00"),aporte_ponderado=Decimal("25.00"),
            semantica_nota="LEGACY_PONDERADA",es_resultado_final_evento=True,registrado_por=self.admin,
        )
        EvaluacionDefensa.objects.create(
            evento=public,tipo_evaluacion="RESULTADO_FINAL",modalidad_registro="CONSENSO",
            nota_numerica=Decimal("95.00"),ponderacion=Decimal("70.00"),
            aporte_ponderado=Decimal("66.50"),semantica_nota="BRUTA_100",
            es_resultado_final_evento=True,registrado_por=self.admin,
        )

        result=EvaluacionDefensaService.calcular_resultado_final(self.post,self.admin)

        self.assertEqual(result["aporte_privada"],Decimal("25.00"))
        self.assertEqual(result["aporte_publica"],Decimal("66.50"))
        self.assertEqual(result["nota_final"],Decimal("91.50"))
        self.assertEqual(result["semantica_privada"],"LEGACY_PONDERADA")
        self.assertEqual(result["semantica_publica"],"BRUTA_100")

    def test_resultado_final_nuevo_85_y_95_suma_aportes_y_clasifica_sobre_100(self):
        private=self.event("DEFENSA_PRIVADA","FINALIZADA")
        public=self.event("DEFENSA_PUBLICA","FINALIZADA")
        EvaluacionDefensa.objects.create(
            evento=private,tipo_evaluacion="RESULTADO_FINAL",modalidad_registro="CONSENSO",
            resultado_cualitativo="SUFICIENTE",nota_numerica=Decimal("85.00"),
            ponderacion=Decimal("30.00"),aporte_ponderado=Decimal("25.50"),
            semantica_nota="BRUTA_100",es_resultado_final_evento=True,registrado_por=self.admin,
        )
        EvaluacionDefensa.objects.create(
            evento=public,tipo_evaluacion="RESULTADO_FINAL",modalidad_registro="CONSENSO",
            nota_numerica=Decimal("95.00"),ponderacion=Decimal("70.00"),
            aporte_ponderado=Decimal("66.50"),semantica_nota="BRUTA_100",
            es_resultado_final_evento=True,registrado_por=self.admin,
        )

        result=EvaluacionDefensaService.calcular_resultado_final(self.post,self.admin)

        self.assertEqual(result["aporte_privada"],Decimal("25.50"))
        self.assertEqual(result["aporte_publica"],Decimal("66.50"))
        self.assertEqual(result["nota_final"],Decimal("92.00"))
        self.assertEqual(result["clasificacion"],"APROBACION_PLENA_CON_FELICITACION")

    def test_resultado_final_legacy_25_mas_60_sigue_siendo_85(self):
        private=self.event("DEFENSA_PRIVADA","FINALIZADA")
        public=self.event("DEFENSA_PUBLICA","FINALIZADA")
        EvaluacionDefensa.objects.create(
            evento=private,tipo_evaluacion="RESULTADO_FINAL",modalidad_registro="CONSENSO",
            resultado_cualitativo="SUFICIENTE",nota_numerica=Decimal("25.00"),
            ponderacion=Decimal("30.00"),aporte_ponderado=Decimal("25.00"),
            semantica_nota="LEGACY_PONDERADA",es_resultado_final_evento=True,registrado_por=self.admin,
        )
        EvaluacionDefensa.objects.create(
            evento=public,tipo_evaluacion="RESULTADO_FINAL",modalidad_registro="CONSENSO",
            nota_numerica=Decimal("60.00"),ponderacion=Decimal("70.00"),
            aporte_ponderado=Decimal("60.00"),semantica_nota="LEGACY_PONDERADA",
            es_resultado_final_evento=True,registrado_por=self.admin,
        )
        result=EvaluacionDefensaService.calcular_resultado_final(self.post,self.admin)
        self.assertEqual(result["nota_final"],Decimal("85.00"))
        self.assertEqual(result["clasificacion"],"APROBACION_PLENA")

    def test_aprobacion_manual_perfil_exige_defensa_finalizada_y_resultado_suficiente(self):
        with self.assertRaisesMessage(ValidationError, "Defensa de Perfil finalizada"):
            WorkflowService.aprobar_etapa(self.follow["PERFIL_PROYECTO"], self.admin)

        evento = self.event("DEFENSA_PERFIL", "PROGRAMADA")
        with self.assertRaisesMessage(ValidationError, "Defensa de Perfil finalizada"):
            WorkflowService.aprobar_etapa(self.follow["PERFIL_PROYECTO"], self.admin)

        evento.estado = "FINALIZADA"
        evento.fecha_fin_real = timezone.now()
        evento.save()
        with self.assertRaisesMessage(ValidationError, "resultado consolidado SUFICIENTE"):
            WorkflowService.aprobar_etapa(self.follow["PERFIL_PROYECTO"], self.admin)

        EvaluacionDefensa.objects.create(
            evento=evento, tipo_evaluacion="RESULTADO_FINAL", modalidad_registro="CONSENSO",
            resultado_cualitativo="INSUFICIENTE", es_resultado_final_evento=True,
            registrado_por=self.admin,
        )
        with self.assertRaisesMessage(ValidationError, "resultado consolidado SUFICIENTE"):
            WorkflowService.aprobar_etapa(self.follow["PERFIL_PROYECTO"], self.admin)

    def test_consolidacion_suficiente_aprueba_perfil_y_deja_documento_final_pendiente(self):
        otros = [self.follow[codigo] for codigo in ("DEFENSA_PRIVADA", "DEFENSA_PUBLICA", "REVISION_FINAL_POST_PUBLICA")]
        etapas_otras = [seguimiento.etapa for seguimiento in otros]
        SeguimientoEtapa.objects.filter(pk__in=[seguimiento.pk for seguimiento in otros]).delete()
        EtapaModalidad.objects.filter(pk__in=[etapa.pk for etapa in etapas_otras]).delete()
        etapa_documento = EtapaModalidad.objects.create(
            modalidad=self.mod, codigo="DOCUMENTO_FINAL", nombre="Documento Final", orden=2,
            origen_normativo="Reglamento",
        )
        documento = SeguimientoEtapa.objects.create(
            postulacion=self.post, etapa=etapa_documento, estado="PENDIENTE",
        )
        evento = self.event("DEFENSA_PERFIL", "EN_CURSO")
        self.add(evento, ["TRIBUNAL", "TRIBUNAL"])
        EvaluacionDefensaService.registrar_evaluacion_perfil(evento, self.admin, "SUFICIENTE")
        EventoDefensaService.finalizar_evento(evento, self.admin)

        EvaluacionDefensaService.consolidar_evaluacion_evento(evento, self.admin)

        self.follow["PERFIL_PROYECTO"].refresh_from_db()
        documento.refresh_from_db()
        self.assertEqual(self.follow["PERFIL_PROYECTO"].estado, "APROBADA")
        self.assertIsNotNone(self.follow["PERFIL_PROYECTO"].fecha_fin)
        self.assertEqual(self.follow["PERFIL_PROYECTO"].cerrada_por, self.admin)
        self.assertEqual(documento.estado, "PENDIENTE")

    def test_programacion_y_auditoria(self):
        ev=EventoDefensaService.programar_evento(self.post,self.follow["PERFIL_PROYECTO"],"DEFENSA_PERFIL",timezone.now(),self.admin,lugar="Sala")
        self.assertEqual(ev.tipo_evento,"DEFENSA_PERFIL"); self.assertTrue(AuditLog.objects.filter(accion="PROGRAM",modulo="DEFENSAS").exists())

    def test_programacion_rechaza_anteriores_y_48_horas(self):
        with self.assertRaises(ValidationError): EventoDefensaService.programar_evento(self.post,self.follow["DEFENSA_PRIVADA"],"DEFENSA_PRIVADA",timezone.now(),self.admin,lugar="S")
        SeguimientoEtapa.objects.filter(pk__in=[self.follow["PERFIL_PROYECTO"].pk,self.follow["DEFENSA_PRIVADA"].pk]).update(estado="APROBADA")
        with self.assertRaises(ValidationError): EventoDefensaService.programar_evento(self.post,self.follow["DEFENSA_PUBLICA"],"DEFENSA_PUBLICA",timezone.now()+timedelta(hours=47),self.admin,lugar="S")

    def test_programacion_publica_rechaza_identidades_repetidas(self):
        secretario = self.assign["SECRETARIO"][0]
        secretario.usuario = self.assign["PRESIDENTE"][0].usuario
        secretario.save(update_fields=["usuario"])
        SeguimientoEtapa.objects.filter(
            pk__in=[self.follow["PERFIL_PROYECTO"].pk, self.follow["DEFENSA_PRIVADA"].pk],
        ).update(estado="APROBADA")
        with self.assertRaisesMessage(ValidationError, "cargos incompatibles"):
            EventoDefensaService.programar_evento(
                self.post, self.follow["DEFENSA_PUBLICA"], "DEFENSA_PUBLICA",
                timezone.now()+timedelta(hours=49), self.admin, lugar="Sala",
            )

    def test_programacion_publica_acepta_composicion_con_identidades_distintas(self):
        SeguimientoEtapa.objects.filter(
            pk__in=[self.follow["PERFIL_PROYECTO"].pk, self.follow["DEFENSA_PRIVADA"].pk],
        ).update(estado="APROBADA")
        evento = EventoDefensaService.programar_evento(
            self.post, self.follow["DEFENSA_PUBLICA"], "DEFENSA_PUBLICA",
            timezone.now()+timedelta(hours=49), self.admin, lugar="Sala",
        )
        self.assertEqual(evento.estado, "PROGRAMADA")

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

    def test_inicio_combinado_registra_todos_los_pendientes_y_delega_quorum_pg(self):
        ev = self.event()
        participants = self.add(ev, ["TRIBUNAL", "TRIBUNAL"])
        tutor_assignment = AsignacionPostulacion.objects.create(
            postulacion=self.post,
            usuario=User.objects.create_user(username="tutor_retirado_inicio", role=self.docs[0].role),
            tipo_participacion="TUTOR",
            designado_por=self.admin,
        )
        retired = EventoDefensaService.agregar_participante(ev, tutor_assignment, "TUTOR", self.admin)
        EventoDefensaService.remover_participante(ev, retired, self.admin)
        unincorporated_assignment = self.assign["PRESIDENTE"][0]

        updated = EventoDefensaService.iniciar_evento_con_asistencia(
            ev,
            self.admin,
            [
                {"participante": participants[0], "presente": True},
                {"participante": participants[1], "presente": False},
            ],
        )

        self.assertEqual(updated.estado, "EN_CURSO")
        self.assertIsNotNone(updated.fecha_inicio_real)
        for participant, expected in zip(participants, (True, False)):
            participant.refresh_from_db()
            self.assertTrue(participant.activo)
            self.assertTrue(participant.convocado)
            self.assertEqual(participant.presente, expected)
            self.assertIsNotNone(participant.fecha_registro_asistencia)
            self.assertEqual(participant.registrado_por, self.admin)
        self.assertFalse(EventoDefensaService.validar_quorum(updated)["valido"])
        retired.refresh_from_db()
        self.assertFalse(retired.activo)
        self.assertIsNone(retired.presente)
        self.assertFalse(ParticipanteEvento.objects.filter(evento=updated, asignacion=unincorporated_assignment).exists())
        self.assertEqual(AuditLog.objects.filter(accion="START", modulo="DEFENSAS").count(), 1)
        self.assertEqual(AuditLog.objects.filter(accion="ATTENDANCE", modulo="DEFENSAS").count(), 2)

    def test_inicio_reprogramado_preserva_asistencias_y_solo_registra_pendientes(self):
        ev = self.event(state="EN_CURSO")
        extra = AsignacionPostulacion.objects.create(
            postulacion=self.post,
            usuario=User.objects.create_user(username="tribunal_extra_inicio", role=self.docs[0].role),
            tipo_participacion="TRIBUNAL",
            designado_por=self.admin,
        )
        participants = self.add(ev, ["TRIBUNAL", "TRIBUNAL"])
        present = EventoDefensaService.registrar_asistencia(participants[0], True, self.admin, "Presente anterior")
        absent = EventoDefensaService.registrar_asistencia(participants[1], False, self.admin, "Ausencia anterior")
        prior_values = {
            present.pk: (present.fecha_registro_asistencia, present.registrado_por_id, present.observaciones),
            absent.pk: (absent.fecha_registro_asistencia, absent.registrado_por_id, absent.observaciones),
        }
        EventoDefensaService.suspender_evento(ev, self.admin, "Suspensión técnica")
        ev = EventoDefensaService.reprogramar_evento(
            ev,
            timezone.now() - timedelta(minutes=1),
            self.admin,
            "Nueva fecha ya alcanzada para la prueba",
        )
        third = EventoDefensaService.agregar_participante(ev, extra, "TRIBUNAL", self.admin)

        updated = EventoDefensaService.iniciar_evento_con_asistencia(
            ev,
            self.admin,
            [{"participante": third, "presente": True}],
        )

        present.refresh_from_db()
        absent.refresh_from_db()
        third.refresh_from_db()
        self.assertEqual((present.presente, present.fecha_registro_asistencia, present.registrado_por_id, present.observaciones), (True, *prior_values[present.pk]))
        self.assertEqual((absent.presente, absent.fecha_registro_asistencia, absent.registrado_por_id, absent.observaciones), (False, *prior_values[absent.pk]))
        self.assertTrue(present.activo)
        self.assertTrue(absent.activo)
        self.assertEqual(third.presente, True)
        self.assertTrue(third.activo)
        self.assertEqual(EventoDefensaService.validar_quorum(updated)["valido"], True)
        self.assertEqual(AuditLog.objects.filter(accion="ATTENDANCE", modulo="DEFENSAS").count(), 3)

    def test_inicio_combinado_falla_si_falta_decision_pendiente_o_incluye_asistencia_existente(self):
        ev = self.event()
        participants = self.add(ev, ["TRIBUNAL", "TRIBUNAL"])

        with self.assertRaisesMessage(ValidationError, "Confirma la asistencia"):
            EventoDefensaService.iniciar_evento_con_asistencia(
                ev, self.admin, [{"participante": participants[0], "presente": True}],
            )
        ev.refresh_from_db()
        self.assertEqual(ev.estado, "PROGRAMADA")
        self.assertTrue(all(participant.presente is None for participant in participants))

        ev.estado = "EN_CURSO"
        ev.save(update_fields=["estado"])
        existing = EventoDefensaService.registrar_asistencia(participants[0], True, self.admin)
        ev.estado = "SUSPENDIDA"
        ev.save(update_fields=["estado"])
        ev = EventoDefensaService.reprogramar_evento(
            ev, timezone.now() - timedelta(minutes=1), self.admin, "Nueva fecha",
        )
        with self.assertRaisesMessage(ValidationError, "Confirma la asistencia"):
            EventoDefensaService.iniciar_evento_con_asistencia(
                ev,
                self.admin,
                [
                    {"participante": existing, "presente": False},
                    {"participante": participants[1], "presente": True},
                ],
            )
        ev.refresh_from_db()
        existing.refresh_from_db()
        self.assertEqual(ev.estado, "PROGRAMADA")
        self.assertTrue(existing.presente)

    def test_fallo_de_asistencia_combinada_revierte_inicio_y_marcas_parciales(self):
        ev = self.event()
        participants = self.add(ev, ["TRIBUNAL", "TRIBUNAL"])
        registrar = EventoDefensaService.registrar_asistencia
        calls = 0

        def fail_on_second(participant, presente, usuario, observaciones=""):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise ValidationError("Fallo de asistencia simulado.")
            return registrar(participant, presente, usuario, observaciones)

        with patch.object(EventoDefensaService, "registrar_asistencia", side_effect=fail_on_second):
            with self.assertRaisesMessage(ValidationError, "Fallo de asistencia simulado"):
                EventoDefensaService.iniciar_evento_con_asistencia(
                    ev,
                    self.admin,
                    [
                        {"participante": participants[0], "presente": True},
                        {"participante": participants[1], "presente": False},
                    ],
                )

        ev.refresh_from_db()
        self.assertEqual(ev.estado, "PROGRAMADA")
        self.assertIsNone(ev.fecha_inicio_real)
        for participant in participants:
            participant.refresh_from_db()
            self.assertIsNone(participant.presente)
            self.assertIsNone(participant.fecha_registro_asistencia)
            self.assertIsNone(participant.registrado_por_id)
        self.assertFalse(AuditLog.objects.filter(accion__in=("START", "ATTENDANCE"), modulo="DEFENSAS").exists())

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

    def test_participante_rechaza_misma_persona_mediante_asignaciones_distintas(self):
        ev = self.event("DEFENSA_PUBLICA")
        presidente = self.assign["PRESIDENTE"][0]
        secretario = self.assign["SECRETARIO"][0]
        secretario.usuario = presidente.usuario
        secretario.save(update_fields=["usuario"])
        EventoDefensaService.agregar_participante(ev, presidente, "PRESIDENTE", self.admin)
        with self.assertRaisesMessage(ValidationError, "persona ya participa"):
            EventoDefensaService.agregar_participante(ev, secretario, "SECRETARIO", self.admin)

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

    def test_quorum_publico_no_cuenta_dos_roles_de_la_misma_persona(self):
        self.assign["SECRETARIO"][0].usuario = self.assign["PRESIDENTE"][0].usuario
        self.assign["SECRETARIO"][0].save(update_fields=["usuario"])
        ev = self.event("DEFENSA_PUBLICA", "EN_CURSO")
        self.add(ev, ["TRIBUNAL", "TRIBUNAL", "PRESIDENTE", "SECRETARIO"])
        resultado = EventoDefensaService.validar_quorum(ev)
        self.assertFalse(resultado["valido"])
        self.assertTrue(resultado["conflictos_identidad"])

    def test_quorum_exige_dos_tribunales_que_sean_usuarios_distintos(self):
        ev = self.event("DEFENSA_PUBLICA", "EN_CURSO")
        self.add(ev, ["TRIBUNAL", "TRIBUNAL", "PRESIDENTE", "SECRETARIO"])
        repetida = self.assign["TRIBUNAL"][1]
        repetida.activo = False
        repetida.usuario = self.assign["TRIBUNAL"][0].usuario
        repetida.save(update_fields=["activo", "usuario"])
        resultado = EventoDefensaService.validar_quorum(ev)
        self.assertFalse(resultado["valido"])
        self.assertEqual(resultado["detalle"]["TRIBUNAL"], 1)
        self.assertEqual(resultado["faltantes"]["TRIBUNAL"], 1)

    def test_evaluacion_publica_exige_quorum_y_acepta_limites(self):
        for note in (Decimal("0"),Decimal("70")):
            ev=self.public_event_with_quorum()
            evaluation=EvaluacionDefensaService.registrar_evaluacion_publica(ev,self.admin,note)
            self.assertEqual(evaluation.nota_numerica,note)
            ev.activo=False; ev.save(update_fields=["activo"])
        ev=self.event("DEFENSA_PUBLICA","EN_CURSO")
        with self.assertRaisesMessage(ValidationError,"quórum técnico válido"):
            EvaluacionDefensaService.registrar_evaluacion_publica(ev,self.admin,Decimal("50"))

    def test_finalizacion_publica_exige_y_acepta_quorum_publico(self):
        ev=self.event("DEFENSA_PUBLICA","EN_CURSO")
        with self.assertRaisesMessage(ValidationError,"quórum"):
            EventoDefensaService.finalizar_evento(ev,self.admin)
        self.add(ev,["TRIBUNAL","TRIBUNAL","PRESIDENTE","SECRETARIO"])
        self.assertEqual(EventoDefensaService.finalizar_evento(ev,self.admin).estado,"FINALIZADA")

    def test_consolidacion_publica_aprueba_etapa_y_habilita_revision_final(self):
        self.add_private_consolidated_result()
        ev=self.public_event_with_quorum()
        EvaluacionDefensaService.registrar_evaluacion_publica(ev,self.admin,Decimal("60"))
        EventoDefensaService.finalizar_evento(ev,self.admin)
        result=EvaluacionDefensaService.consolidar_evaluacion_evento(ev,self.admin)
        self.assertEqual(result.tipo_evaluacion,"RESULTADO_FINAL")
        self.assertEqual(result.nota_numerica,Decimal("60"))
        self.assertEqual(result.ponderacion,Decimal("70"))
        self.assertTrue(result.es_resultado_final_evento)
        self.follow["DEFENSA_PUBLICA"].refresh_from_db()
        self.assertEqual(self.follow["DEFENSA_PUBLICA"].estado,"APROBADA")
        SeguimientoEtapa.objects.filter(pk__in=[self.follow["PERFIL_PROYECTO"].pk,self.follow["DEFENSA_PRIVADA"].pk]).update(estado="APROBADA")
        revision=WorkflowService.iniciar_etapa(self.follow["REVISION_FINAL_POST_PUBLICA"],self.admin)
        self.assertEqual(revision.estado,"EN_PROCESO")

    def test_consolidacion_publica_rechaza_evento_no_finalizado_y_duplicado(self):
        self.add_private_consolidated_result()
        ev=self.public_event_with_quorum()
        EvaluacionDefensaService.registrar_evaluacion_publica(ev,self.admin,Decimal("60"))
        with self.assertRaisesMessage(ValidationError,"evento finalizado"):
            EvaluacionDefensaService.consolidar_evaluacion_evento(ev,self.admin)
        EventoDefensaService.finalizar_evento(ev,self.admin)
        EvaluacionDefensaService.consolidar_evaluacion_evento(ev,self.admin)
        with self.assertRaisesMessage(ValidationError,"ya tiene una evaluación consolidada"):
            EvaluacionDefensaService.consolidar_evaluacion_evento(ev,self.admin)

    def test_consolidacion_publica_postergada_no_aprueba_etapa(self):
        self.add_private_consolidated_result(Decimal("25"))
        ev=self.public_event_with_quorum()
        EvaluacionDefensaService.registrar_evaluacion_publica(ev,self.admin,Decimal("25"))
        EventoDefensaService.finalizar_evento(ev,self.admin)
        EvaluacionDefensaService.consolidar_evaluacion_evento(ev,self.admin)
        self.follow["DEFENSA_PUBLICA"].refresh_from_db()
        self.assertEqual(self.follow["DEFENSA_PUBLICA"].estado,"EN_PROCESO")
        with self.assertRaisesMessage(ValidationError,"resultado final completo y aprobatorio"):
            WorkflowService.aprobar_etapa(self.follow["DEFENSA_PUBLICA"],self.admin)

    def test_aprobacion_manual_publica_rechaza_precondiciones_prematuras(self):
        ev=self.event("DEFENSA_PUBLICA","EN_CURSO")
        with self.assertRaisesMessage(ValidationError,"evento público finalizado"):
            WorkflowService.aprobar_etapa(self.follow["DEFENSA_PUBLICA"],self.admin)
        ev.estado="FINALIZADA"; ev.fecha_fin_real=timezone.now(); ev.save()
        with self.assertRaisesMessage(ValidationError,"resultado público consolidado válido"):
            WorkflowService.aprobar_etapa(self.follow["DEFENSA_PUBLICA"],self.admin)

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
        EvaluacionDefensa.objects.create(evento=private,tipo_evaluacion="RESULTADO_FINAL",modalidad_registro="CONSENSO",resultado_cualitativo="SUFICIENTE",nota_numerica=Decimal("24"),ponderacion=Decimal("30"),aporte_ponderado=Decimal("24"),semantica_nota="LEGACY_PONDERADA",es_resultado_final_evento=True,registrado_por=self.admin)
        result=EvaluacionDefensaService.calcular_resultado_final(self.post,self.admin)
        self.assertIsNone(result["nota_final"])
        EvaluacionDefensa.objects.create(evento=public,tipo_evaluacion="RESULTADO_FINAL",modalidad_registro="CONSENSO",nota_numerica=Decimal("60"),ponderacion=Decimal("70"),aporte_ponderado=Decimal("60"),semantica_nota="LEGACY_PONDERADA",es_resultado_final_evento=True,registrado_por=self.admin)
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
                self.assertEqual(
                    ModalidadPolicyRegistry.get(self.post).evaluacion_policy.clasificar_nota_final(Decimal(nota)),
                    esperado,
                )


class ApiDefensaTests(DefensaMixin,APITestCase):
    def test_autenticacion_propiedad_y_permisos(self):
        ev=self.event(); url=f"/api/v1/eventos-defensa/{ev.pk}/"
        self.assertEqual(self.client.get(url).status_code,401)
        self.client.force_authenticate(self.student); self.assertEqual(self.client.get(url).status_code,200); self.assertEqual(self.client.post(url+"iniciar/").status_code,403)
        self.client.force_authenticate(self.admin); self.assertEqual(self.client.post(url+"iniciar/").status_code,200)

    def test_acciones_administrativas_aceptan_staff_y_superusuario(self):
        superuser=User.objects.create_superuser(username="superdef",password="secret",role=self.admin.role)
        for user in (self.admin,superuser):
            ev=self.event(); self.client.force_authenticate(user)
            self.assertEqual(self.client.post(f"/api/v1/eventos-defensa/{ev.pk}/iniciar/",{"asistencias":[]},format="json").status_code,200)
            ev.activo=False; ev.save(update_fields=["activo"])

    def test_api_inicio_combinado_devuelve_evento_y_asistencias(self):
        ev = self.event()
        participants = self.add(ev, ["TRIBUNAL", "TRIBUNAL"])
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            f"/api/v1/eventos-defensa/{ev.pk}/iniciar/",
            {"asistencias": [
                {"participante": participants[0].pk, "presente": True},
                {"participante": participants[1].pk, "presente": False},
            ]},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["estado"], "EN_CURSO")
        self.assertEqual({item["presente"] for item in response.data["participantes"]}, {True, False})
        self.assertTrue(all(item["activo"] and item["convocado"] for item in response.data["participantes"]))

    def test_api_inicio_combinado_rechaza_decision_incompleta(self):
        ev = self.event()
        participant = self.add(ev, ["TRIBUNAL"])[0]
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            f"/api/v1/eventos-defensa/{ev.pk}/iniciar/",
            {"asistencias": []},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        ev.refresh_from_db()
        participant.refresh_from_db()
        self.assertEqual(ev.estado, "PROGRAMADA")
        self.assertIsNone(participant.presente)


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

    def test_api_evaluacion_y_consolidacion_publica(self):
        self.add_private_consolidated_result()
        ev=self.public_event_with_quorum()
        self.client.force_authenticate(self.admin)
        evaluate=f"/api/v1/eventos-defensa/{ev.pk}/evaluaciones/publica/"
        self.assertEqual(self.client.post(evaluate,{"nota_publica":"101"},format="json").status_code,400)
        response=self.client.post(evaluate,{"nota_publica":"95"},format="json")
        self.assertEqual(response.status_code,201)
        self.assertEqual(response.data["nota_numerica"],"95.00")
        self.assertEqual(response.data["ponderacion"],"70.00")
        self.assertEqual(response.data["aporte_ponderado"],"66.50")
        self.assertEqual(response.data["semantica_nota"],"BRUTA_100")
        self.assertEqual(self.client.post(f"/api/v1/eventos-defensa/{ev.pk}/finalizar/",{},format="json").status_code,200)
        consolidated=self.client.post(f"/api/v1/eventos-defensa/{ev.pk}/evaluaciones/consolidar/",{},format="json")
        self.assertEqual(consolidated.status_code,200)
        self.assertTrue(consolidated.data["es_resultado_final_evento"])
        self.follow["DEFENSA_PUBLICA"].refresh_from_db()
        self.assertEqual(self.follow["DEFENSA_PUBLICA"].estado,"APROBADA")

    def test_api_nota_privada_bruta_acepta_100_y_devuelve_aporte_y_semantica(self):
        event=self.private_event_with_quorum()
        self.client.force_authenticate(self.admin)
        endpoint=f"/api/v1/eventos-defensa/{event.pk}/evaluaciones/privada/"

        response=self.client.post(endpoint,{"nota_privada":"100","resultado":"SUFICIENTE"},format="json")

        self.assertEqual(response.status_code,201)
        self.assertEqual(response.data["nota_numerica"],"100.00")
        self.assertEqual(response.data["ponderacion"],"30.00")
        self.assertEqual(response.data["aporte_ponderado"],"30.00")
        self.assertEqual(response.data["semantica_nota"],"BRUTA_100")
        event.activo=False; event.save(update_fields=["activo"])
        invalid_event=self.event("DEFENSA_PRIVADA")
        self.add(invalid_event,["TRIBUNAL","TRIBUNAL","DOCENTE_MODALIDAD"])
        invalid=self.client.post(
            f"/api/v1/eventos-defensa/{invalid_event.pk}/evaluaciones/privada/",
            {"nota_privada":"100.01","resultado":"SUFICIENTE"},format="json",
        )
        self.assertEqual(invalid.status_code,400)

    def test_api_resultado_final_expone_semantica_de_cada_evaluacion(self):
        private=self.event("DEFENSA_PRIVADA","FINALIZADA")
        public=self.event("DEFENSA_PUBLICA","FINALIZADA")
        EvaluacionDefensa.objects.create(
            evento=private,tipo_evaluacion="RESULTADO_FINAL",modalidad_registro="CONSENSO",
            resultado_cualitativo="SUFICIENTE",nota_numerica=Decimal("25.00"),
            ponderacion=Decimal("30.00"),aporte_ponderado=Decimal("25.00"),
            semantica_nota="LEGACY_PONDERADA",es_resultado_final_evento=True,registrado_por=self.admin,
        )
        EvaluacionDefensa.objects.create(
            evento=public,tipo_evaluacion="RESULTADO_FINAL",modalidad_registro="CONSENSO",
            nota_numerica=Decimal("95.00"),ponderacion=Decimal("70.00"),
            aporte_ponderado=Decimal("66.50"),semantica_nota="BRUTA_100",
            es_resultado_final_evento=True,registrado_por=self.admin,
        )
        self.client.force_authenticate(self.admin)

        response=self.client.get(f"/api/v1/postulaciones/{self.post.pk}/resultado-final/")

        self.assertEqual(response.status_code,200)
        self.assertEqual(response.data["semantica_privada"],"LEGACY_PONDERADA")
        self.assertEqual(response.data["semantica_publica"],"BRUTA_100")
        self.assertEqual(response.data["aporte_privada"],Decimal("25.00"))
        self.assertEqual(response.data["aporte_publica"],Decimal("66.50"))
        self.assertEqual(response.data["nota_final"],Decimal("91.50"))

    def test_resultado_final_no_admite_put(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.put(f"/api/v1/postulaciones/{self.post.pk}/resultado-final/",{}).status_code,405)


class InicioCombinadoQuorumModalidadesTests(TestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Admin inicio combinado")
        self.student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante inicio combinado")
        self.docente_role = Role.objects.create(codigo="DOCENTE", nombre="Docente inicio combinado")
        self.admin = User.objects.create_user(username="admin_inicio_combinado", role=self.admin_role, is_staff=True)
        self.period = Periodo.objects.create(
            nombre="2026-INICIO-COMBINADO", gestion=2026, semestre="II",
            fecha_inicio="2026-01-01", fecha_fin="2026-12-31",
        )
        self.estado = EstadoPostulacion.objects.create(codigo="REG-INICIO-COMBINADO", nombre="Registrada inicio combinado")

    def _start_and_check_quorum(self, modalidad_codigo, tipo_evento, etapa_codigo, roles):
        modalidad = Modalidad.objects.create(codigo=modalidad_codigo, nombre=modalidad_codigo)
        student = User.objects.create_user(username=f"student_{modalidad_codigo.lower()}", role=self.student_role)
        post = Postulacion.objects.create(
            codigo=f"POST-{modalidad_codigo}", estudiante=student, modalidad=modalidad,
            periodo=self.period, estado_actual=self.estado,
        )
        stage = EtapaModalidad.objects.create(
            modalidad=modalidad, codigo=etapa_codigo, nombre=etapa_codigo,
            orden=1, origen_normativo="Fixture de prueba",
        )
        follow = SeguimientoEtapa.objects.create(postulacion=post, etapa=stage, estado="EN_PROCESO")
        event = EventoDefensa.objects.create(
            postulacion=post, seguimiento_etapa=follow, tipo_evento=tipo_evento,
            estado="PROGRAMADA", fecha_programada=timezone.now() - timedelta(minutes=1),
            lugar="Sala", programado_por=self.admin,
        )
        participants = []
        for index, role in enumerate(roles):
            user = User.objects.create_user(
                username=f"{modalidad_codigo.lower()}_{role.lower()}_{index}",
                role=self.docente_role,
            )
            assignment = AsignacionPostulacion.objects.create(
                postulacion=post, usuario=user, tipo_participacion=role, designado_por=self.admin,
            )
            participants.append(ParticipanteEvento.objects.create(
                evento=event, asignacion=assignment, rol_evento=role,
            ))

        updated = EventoDefensaService.iniciar_evento_con_asistencia(
            event,
            self.admin,
            [{"participante": participant, "presente": True} for participant in participants],
        )

        self.assertEqual(updated.estado, "EN_CURSO")
        self.assertTrue(EventoDefensaService.validar_quorum(updated)["valido"])

    def test_quorum_se_delega_a_policy_de_cada_modalidad(self):
        cases = (
            ("PROYECTO_GRADO", "DEFENSA_PERFIL", "PERFIL_PROYECTO", ("TRIBUNAL", "TRIBUNAL")),
            ("TESIS_GRADO", "DEFENSA_PRIVADA", "DEFENSA_PRIVADA", ("TRIBUNAL", "TRIBUNAL", "DOCENTE_MODALIDAD")),
            ("TRABAJO_DIRIGIDO", "DEFENSA_PERFIL", "PERFIL_TRABAJO_DIRIGIDO", ("TRIBUNAL", "TRIBUNAL", "TRIBUNAL")),
            ("GRADUACION_VIA_DIPLOMADO", "DEFENSA_PUBLICA", "DEFENSA_PUBLICA", ("TRIBUNAL", "TRIBUNAL", "DECANO_FACULTAD")),
        )
        for modalidad_codigo, tipo_evento, etapa_codigo, roles in cases:
            with self.subTest(modalidad=modalidad_codigo):
                self._start_and_check_quorum(modalidad_codigo, tipo_evento, etapa_codigo, roles)
