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
        self.trib = [AsignacionPostulacion.objects.create(postulacion=self.post, usuario=self.people[n], tipo_participacion='TRIBUNAL', seguimiento_etapa=theme, orden_cargo=order, designado_por=self.admin) for order, n in enumerate((1,2,3), start=1)]
        self.secretary = AsignacionPostulacion.objects.create(postulacion=self.post, usuario=self.people[4], tipo_participacion='DOCENTE_MODALIDAD', designado_por=self.admin)

    def event(self):
        return EventoDefensaService.programar_evento(self.post, self.private, 'DEFENSA_PRIVADA', timezone.now()-timedelta(minutes=1), self.admin, lugar='Aula')

    def _numeric_event(self):
        event = self.event()
        EventoDefensaService.iniciar_evento(event, self.admin)
        participants = []
        for assignment in self.trib + [self.secretary]:
            participant = EventoDefensaService.agregar_participante(event, assignment, assignment.tipo_participacion, self.admin)
            EventoDefensaService.registrar_asistencia(participant, True, self.admin)
            participants.append(participant)
        EventoDefensaService.finalizar_evento(event, self.admin)
        return event, participants

    def test_nueva_privada_bruta_persiste_y_consolida_sin_doble_ponderacion(self):
        from apps.postulantes.defensas_api import EventoDefensaSerializer
        event, _ = self._numeric_event()
        config = EventoDefensaSerializer(event).data['configuracion_numerica']
        self.assertEqual(config, {'minimo': 0, 'maximo': 100, 'ponderacion': 30, 'semantica_nota': 'BRUTA_100'})
        evaluation = EvaluacionDefensaService.registrar_evaluacion_privada(
            event, self.admin, 'SUFICIENTE', nota=Decimal('95'), semantica_nota='BRUTA_100',
        )
        self.assertEqual(evaluation.nota_numerica, Decimal('95'))
        self.assertEqual(evaluation.aporte_ponderado, Decimal('28.50'))
        result = EvaluacionDefensaService.consolidar_evaluacion_evento(event, self.admin)
        self.assertEqual(result.nota_numerica, Decimal('95'))
        self.assertEqual(result.aporte_ponderado, Decimal('28.50'))
        self.assertEqual(result.semantica_nota, 'BRUTA_100')
        self.assertEqual(EvaluacionDefensaService.calcular_resultado_final(self.post, None, auditar=False)['aporte_privada'], Decimal('28.50'))

    def test_api_privada_con_semantica_explicita(self):
        from rest_framework.test import APIClient
        event, _ = self._numeric_event()
        client = APIClient()
        client.force_authenticate(self.admin)
        url = f'/api/v1/eventos-defensa/{event.pk}/evaluaciones/privada/'
        response = client.post(url, {'resultado': 'SUFICIENTE', 'nota': '95', 'semantica_nota': 'BRUTA_100'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['semantica_nota'], 'BRUTA_100')
        self.assertEqual(Decimal(response.data['aporte_ponderado']), Decimal('28.50'))

    def test_individual_bruta_redondea_promedio_antes_de_aporte(self):
        event, participants = self._numeric_event()
        for note, participant in zip(('20','20','21'), participants[:3]):
            EvaluacionDefensaService.registrar_evaluacion_privada(
                event, self.admin, 'SUFICIENTE', nota=Decimal(note), evaluador=participant,
                modalidad_registro='INDIVIDUAL', semantica_nota='BRUTA_100',
            )
        result = EvaluacionDefensaService.consolidar_evaluacion_evento(event, self.admin)
        self.assertEqual(result.nota_numerica, Decimal('20.33'))
        self.assertEqual(result.aporte_ponderado, Decimal('6.10'))
        self.assertEqual(list(event.evaluaciones.filter(tipo_evaluacion='PRIVADA').order_by('id').values_list('nota_numerica',flat=True)), [Decimal('20'),Decimal('20'),Decimal('21')])

    def test_payload_antiguo_no_se_reinterpreta_y_no_se_mezclan_escalas(self):
        event, participants = self._numeric_event()
        old = EvaluacionDefensaService.registrar_evaluacion_privada(
            event, self.admin, 'SUFICIENTE', nota=Decimal('25'), evaluador=participants[0], modalidad_registro='INDIVIDUAL',
        )
        self.assertEqual(old.semantica_nota, 'MODALIDAD_ESPECIFICA')
        self.assertEqual(old.aporte_ponderado, Decimal('25'))
        from apps.postulantes.defensas_api import EventoDefensaSerializer
        config = EventoDefensaSerializer(event).data['configuracion_numerica']
        self.assertEqual(config['maximo'], 30)
        self.assertEqual(config['semantica_nota'], 'MODALIDAD_ESPECIFICA')
        with self.assertRaises(ValidationError):
            EvaluacionDefensaService.registrar_evaluacion_privada(event, self.admin, 'SUFICIENTE', nota=Decimal('95'), evaluador=participants[1], modalidad_registro='INDIVIDUAL', semantica_nota='BRUTA_100')

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

    def test_resultado_directo_tesis_privada_conserva_escala_ponderacion_y_transicion(self):
        event = self.event()
        updated = EvaluacionDefensaService.registrar_resultado_directo_proyecto(
            event, self.admin, resultado='SUFICIENTE', nota=Decimal('95'),
            semantica_nota='BRUTA_100',
        )
        source = updated.evaluaciones.get(tipo_evaluacion='PRIVADA')
        consolidated = updated.evaluaciones.get(tipo_evaluacion='RESULTADO_FINAL')
        self.assertEqual(updated.estado, EventoDefensa.Estado.FINALIZADA)
        self.assertIsNotNone(updated.fecha_fin_real)
        self.assertEqual(updated.participantes.count(), 0)
        self.assertEqual(source.nota_numerica, Decimal('95'))
        self.assertEqual(source.ponderacion, Decimal('30.00'))
        self.assertEqual(source.aporte_ponderado, Decimal('28.50'))
        self.assertEqual(consolidated.aporte_ponderado, Decimal('28.50'))
        self.private.refresh_from_db()
        self.assertEqual(self.private.estado, SeguimientoEtapa.EstadoChoices.APROBADA)

    def test_resultado_directo_tesis_privada_acepta_escala_especifica_sin_doble_ponderacion(self):
        event = self.event()
        updated = EvaluacionDefensaService.registrar_resultado_directo_proyecto(
            event, self.admin, resultado='SUFICIENTE', nota=Decimal('25'),
            semantica_nota='MODALIDAD_ESPECIFICA',
        )
        result = updated.evaluaciones.get(tipo_evaluacion='RESULTADO_FINAL')
        self.assertEqual(result.nota_numerica, Decimal('25'))
        self.assertEqual(result.aporte_ponderado, Decimal('25'))
        self.assertEqual(updated.participantes.count(), 0)

    def test_resultado_directo_tesis_publica_sigue_bloqueado_por_gate(self):
        public = self.s['DEFENSA_PUBLICA']
        public.estado = SeguimientoEtapa.EstadoChoices.EN_PROCESO
        public.save(update_fields=['estado'])
        private = self.s['DEFENSA_PRIVADA']
        private.estado = SeguimientoEtapa.EstadoChoices.APROBADA
        private.save(update_fields=['estado'])
        with self.assertRaisesMessage(ValidationError, 'Defensa Privada finalizada con resultado SUFICIENTE'):
            EventoDefensaService.programar_evento(
                self.post, public, 'DEFENSA_PUBLICA', timezone.now()-timedelta(minutes=1),
                self.admin, lugar='Auditorio',
            )

    def test_reprogramar_cancelada_conserva_historial_sin_heredar_participantes_ni_evaluaciones(self):
        event = self.event()
        for assignment in self.trib + [self.secretary]:
            EventoDefensaService.agregar_participante(event, assignment, assignment.tipo_participacion, self.admin)
        EvaluacionDefensaService._registrar(
            event, self.admin, 'PRIVADA', 'SUFICIENTE', Decimal('30'), None, 'CONSENSO',
            omitir_quorum=True, permitir_programada=True,
        )
        EventoDefensaService.cancelar_evento(event, self.admin, 'Tribunal no disponible')
        event.refresh_from_db()

        replacement = EventoDefensaService.reprogramar_evento(
            event, timezone.now() + timedelta(days=3), self.admin, 'Nueva fecha acordada',
        )

        event.refresh_from_db()
        replacement.refresh_from_db()
        self.assertEqual(event.estado, EventoDefensa.Estado.CANCELADA)
        self.assertIsNotNone(event.fecha_cancelacion)
        self.assertIsNone(event.fecha_fin_real)
        self.assertEqual(event.participantes.count(), 4)
        self.assertEqual(event.evaluaciones.count(), 1)
        self.assertEqual(replacement.reprogramada_desde_id, event.pk)
        self.assertEqual(replacement.postulacion_id, event.postulacion_id)
        self.assertEqual(replacement.seguimiento_etapa_id, event.seguimiento_etapa_id)
        self.assertEqual(replacement.tipo_evento, event.tipo_evento)
        self.assertEqual(replacement.numero_intento, event.numero_intento)
        self.assertEqual(replacement.participantes.count(), 0)
        self.assertEqual(replacement.evaluaciones.count(), 0)

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
