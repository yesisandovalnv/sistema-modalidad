from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from apps.academico.models import Modalidad, Periodo
from apps.postulantes.defensas import EventoDefensaService, EvaluacionDefensaService
from apps.postulantes.models import AsignacionPostulacion, EstadoPostulacion, EventoDefensa, Postulacion, SeguimientoEtapa
from apps.postulantes.workflow import WorkflowService
from apps.usuarios.models import CustomUser, Role


class TesisDefensaPrivadaTest(TestCase):
    def setUp(self):
        call_command('seed_initial_data', verbosity=0)
        admin_role = Role.objects.create(codigo='ADMINISTRADOR', nombre='Administrador')
        teacher_role = Role.objects.create(codigo='DOCENTE', nombre='Docente')
        self.admin = CustomUser.objects.create_user('tdp-admin', role=admin_role, is_staff=True, ci='99001', ru='R99001')
        self.people = [CustomUser.objects.create_user(f'tdp-{n}', role=teacher_role, ci=f'9901{n}', ru=f'R9901{n}') for n in range(5)]
        self.post = Postulacion.objects.create(codigo='TDP-1', estudiante=self.people[0], modalidad=Modalidad.objects.get(codigo='TESIS_GRADO'), periodo=Periodo.objects.create(nombre='TDP', gestion=2026, semestre='II', fecha_inicio='2026-01-01', fecha_fin='2026-12-31'), estado_actual=EstadoPostulacion.objects.get(codigo='REGISTRADA'))
        self.s = {x.etapa.codigo: x for x in WorkflowService.inicializar_flujo(self.post, self.admin)}
        SeguimientoEtapa.objects.filter(postulacion=self.post, etapa__orden__lte=self.s['REVISION_TRIBUNAL'].etapa.orden).update(estado='APROBADA')
        self.private = self.s['DEFENSA_PRIVADA']; WorkflowService.iniciar_etapa(self.private, self.admin)
        theme = self.s['TEMATICA_TESIS']
        self.trib = [AsignacionPostulacion.objects.create(postulacion=self.post, usuario=self.people[n], tipo_participacion='TRIBUNAL', seguimiento_etapa=theme, designado_por=self.admin) for n in (1,2,3)]
        self.secretary = AsignacionPostulacion.objects.create(postulacion=self.post, usuario=self.people[4], tipo_participacion='DOCENTE_MODALIDAD', designado_por=self.admin)

    def event(self):
        return EventoDefensaService.programar_evento(self.post, self.private, 'DEFENSA_PRIVADA', timezone.now()-timedelta(minutes=1), self.admin, lugar='Aula')

    def test_programacion_y_quorum_especifico(self):
        event = self.event()
        with self.assertRaises(ValidationError): EventoDefensaService.finalizar_evento(event, self.admin)
        EventoDefensaService.iniciar_evento(event, self.admin)
        for assignment in self.trib + [self.secretary]:
            participant = EventoDefensaService.agregar_participante(event, assignment, assignment.tipo_participacion, self.admin)
            EventoDefensaService.registrar_asistencia(participant, True, self.admin)
        self.assertTrue(EventoDefensaService.validar_quorum(event)['valido'])
        EventoDefensaService.finalizar_evento(event, self.admin)
        evaluation = EvaluacionDefensaService.registrar_evaluacion_privada(event, self.admin, 'SUFICIENTE', nota=Decimal('30'), modalidad_registro='CONSENSO')
        self.assertEqual(evaluation.nota_numerica, Decimal('30'))

    def test_sin_secretario_o_tribunales_no_programa(self):
        self.secretary.activo=False; self.secretary.save(update_fields=['activo'])
        with self.assertRaises(ValidationError): self.event()
        self.secretary.activo=True; self.secretary.save(update_fields=['activo'])
        for assignment in self.trib[1:]: assignment.activo=False; assignment.save(update_fields=['activo'])
        with self.assertRaises(ValidationError): self.event()

    def test_publica_permanece_bloqueada(self):
        public = self.s['DEFENSA_PUBLICA']
        with self.assertRaises(ValidationError): WorkflowService.iniciar_etapa(public, self.admin)

    def _complete_private(self, result):
        event = self.event(); EventoDefensaService.iniciar_evento(event, self.admin)
        for assignment in self.trib + [self.secretary]:
            participant = EventoDefensaService.agregar_participante(event, assignment, assignment.tipo_participacion, self.admin)
            EventoDefensaService.registrar_asistencia(participant, True, self.admin)
        EventoDefensaService.finalizar_evento(event, self.admin)
        EvaluacionDefensaService.registrar_evaluacion_privada(event, self.admin, result, nota=Decimal('20'), modalidad_registro='CONSENSO')
        EvaluacionDefensaService.consolidar_evaluacion_evento(event, self.admin)
        return event

    def test_insuficiente_preserva_evento_y_crea_intento_independiente(self):
        first = self._complete_private('INSUFICIENTE')
        self.private.refresh_from_db(); self.assertEqual(self.private.estado, 'RECHAZADA')
        second = SeguimientoEtapa.objects.get(postulacion=self.post, etapa=self.private.etapa, numero_intento=2)
        self.assertEqual(second.estado, 'PENDIENTE')
        self.assertEqual(first.participantes.filter(activo=True).count(), 4)
        self.assertEqual(first.evaluaciones.count(), 2)
        self.assertTrue(EventoDefensa.objects.filter(pk=first.pk, numero_intento=1).exists())

    def test_ausencias_y_faltantes_bloquean_quorum_y_evaluacion(self):
        event = self.event(); EventoDefensaService.iniciar_evento(event, self.admin)
        for assignment in self.trib + [self.secretary]:
            participant = EventoDefensaService.agregar_participante(event, assignment, assignment.tipo_participacion, self.admin)
            EventoDefensaService.registrar_asistencia(participant, assignment != self.secretary, self.admin)
        self.assertFalse(EventoDefensaService.validar_quorum(event)['valido'])
        with self.assertRaises(ValidationError): EvaluacionDefensaService.registrar_evaluacion_privada(event, self.admin, 'SUFICIENTE', nota=Decimal('20'), modalidad_registro='CONSENSO')
        with self.assertRaises(ValidationError): EventoDefensaService.finalizar_evento(event, self.admin)

    def test_participantes_ajenos_o_incompatibles_se_rechazan(self):
        event = self.event()
        other = Postulacion.objects.create(codigo='TDP-2', estudiante=self.people[1], modalidad=self.post.modalidad, periodo=self.post.periodo, estado_actual=self.post.estado_actual)
        foreign = AsignacionPostulacion.objects.create(postulacion=other, usuario=self.people[2], tipo_participacion='TRIBUNAL', designado_por=self.admin)
        with self.assertRaises(ValidationError): EventoDefensaService.agregar_participante(event, foreign, 'TRIBUNAL', self.admin)
        with self.assertRaises(ValidationError): EventoDefensaService.agregar_participante(event, self.secretary, 'PRESIDENTE', self.admin)

    def test_individuales_tres_tercios_promedian_y_preservan_registros(self):
        event = self.event(); EventoDefensaService.iniciar_evento(event, self.admin); participants = []
        for assignment in self.trib + [self.secretary]:
            participant = EventoDefensaService.agregar_participante(event, assignment, assignment.tipo_participacion, self.admin); EventoDefensaService.registrar_asistencia(participant, True, self.admin); participants.append(participant)
        EventoDefensaService.finalizar_evento(event, self.admin)
        for index, participant in enumerate(participants[:3], 1):
            EvaluacionDefensaService.registrar_evaluacion_privada(event, self.admin, 'SUFICIENTE', Decimal(str(index * 10)), evaluador=participant, modalidad_registro='INDIVIDUAL')
            if index < 3:
                with self.assertRaises(ValidationError): EvaluacionDefensaService.consolidar_evaluacion_evento(event, self.admin)
        result = EvaluacionDefensaService.consolidar_evaluacion_evento(event, self.admin)
        self.assertEqual(result.nota_numerica, Decimal('20'))
        self.assertEqual(event.evaluaciones.filter(tipo_evaluacion='PRIVADA').count(), 3)
