from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.modalidades.policies import ModalidadPolicyRegistry
from apps.modalidades.proyecto_grado import ProyectoGradoPolicy
from apps.notificaciones.events import EventTypes
from apps.postulantes.defensas import EvaluacionDefensaService
from apps.postulantes.models import (
    EstadoPostulacion, EvaluacionDefensa, EventoDefensa, Postulacion, SeguimientoEtapa,
)
from apps.postulantes.proyecto_grado_workflow import ProyectoGradoWorkflowOrchestrator
from apps.postulantes.workflow import WorkflowService


User = get_user_model()


class ProyectoGradoAutoaperturaTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="admin_auto_pg", is_staff=True)
        self.student = User.objects.create_user(username="student_auto_pg")
        self.modalidad = Modalidad.objects.create(codigo="PROYECTO_GRADO", nombre="Proyecto auto")
        self.periodo = Periodo.objects.create(
            nombre="2026-AUTO", gestion=2026, semestre="II",
            fecha_inicio="2026-07-01", fecha_fin="2026-12-31",
        )
        self.registrada = EstadoPostulacion.objects.create(codigo="REGISTRADA", nombre="Registrada auto")
        self.en_proceso = EstadoPostulacion.objects.create(codigo="EN_PROCESO", nombre="En proceso auto")
        self.concluida = EstadoPostulacion.objects.create(codigo="CONCLUIDA", nombre="Concluida auto")
        self.postulacion = Postulacion.objects.create(
            codigo="PG-AUTO-001", estudiante=self.student, modalidad=self.modalidad,
            periodo=self.periodo, estado_actual=self.registrada,
        )
        for orden, codigo in enumerate(ProyectoGradoWorkflowOrchestrator.ETAPAS, 1):
            EtapaModalidad.objects.create(
                modalidad=self.modalidad, codigo=codigo, nombre=codigo, orden=orden,
                obligatoria=True, permite_repeticion=codigo == "PERFIL_PROYECTO",
                origen_normativo="Normativa PG",
            )

    def etapas(self):
        return {
            item.etapa.codigo: item
            for item in self.postulacion.seguimientos_etapa.select_related("etapa")
        }

    def test_arranque_deja_inscripcion_aprobada_perfil_en_proceso_y_resto_pendiente(self):
        ProyectoGradoWorkflowOrchestrator.inicializar_proceso(self.postulacion, self.admin)
        etapas = self.etapas()

        self.assertEqual(etapas["INSCRIPCION"].estado, "APROBADA")
        self.assertEqual(etapas["PERFIL_PROYECTO"].estado, "EN_PROCESO")
        self.assertTrue(all(etapas[codigo].estado == "PENDIENTE" for codigo in ProyectoGradoWorkflowOrchestrator.ETAPAS[2:]))
        self.assertEqual(etapas["PERFIL_PROYECTO"].abierta_por, self.admin)
        self.assertIsNotNone(etapas["PERFIL_PROYECTO"].fecha_inicio)

    @patch.object(ProyectoGradoPolicy, "validar_aprobacion_etapa", return_value=None)
    @patch("apps.postulantes.workflow.publish_domain_event")
    def test_cadena_autoabre_cada_etapa_una_sola_vez_y_no_concluye(self, publish, _validar):
        ProyectoGradoWorkflowOrchestrator.inicializar_proceso(self.postulacion, self.admin)
        etapas = self.etapas()

        for actual, siguiente in zip(
            ProyectoGradoWorkflowOrchestrator.ETAPAS[1:-1],
            ProyectoGradoWorkflowOrchestrator.ETAPAS[2:],
        ):
            WorkflowService.aprobar_etapa(etapas[actual], self.admin)
            etapas = self.etapas()
            self.assertEqual(etapas[siguiente].estado, "EN_PROCESO")
            self.assertEqual(etapas[siguiente].abierta_por, self.admin)
            self.assertIsNotNone(etapas[siguiente].fecha_inicio)

        cierre = etapas["CIERRE_DOCUMENTAL"]
        fecha_inicio = cierre.fecha_inicio
        ProyectoGradoWorkflowOrchestrator.autoabrir_siguiente(etapas["REVISION_FINAL_POST_PUBLICA"], self.admin)
        cierre.refresh_from_db()
        self.assertEqual(cierre.fecha_inicio, fecha_inicio)

        WorkflowService.aprobar_etapa(cierre, self.admin, actualizar_estado_general=False)
        self.postulacion.refresh_from_db()
        self.assertNotEqual(self.postulacion.estado_actual.codigo, "CONCLUIDA")
        iniciadas = [call for call in publish.call_args_list if call.args[0] == EventTypes.ETAPA_INICIADA]
        self.assertEqual(len(iniciadas), 8)

    def test_arranque_reintentado_no_duplica_inicio(self):
        ProyectoGradoWorkflowOrchestrator.inicializar_proceso(self.postulacion, self.admin)
        perfil = self.etapas()["PERFIL_PROYECTO"]
        fecha_inicio = perfil.fecha_inicio

        ProyectoGradoWorkflowOrchestrator.inicializar_proceso(self.postulacion, self.admin)

        perfil.refresh_from_db()
        self.assertEqual(perfil.estado, "EN_PROCESO")
        self.assertEqual(perfil.fecha_inicio, fecha_inicio)

    def test_historico_no_se_autoabre(self):
        self.postulacion.tipo_registro = Postulacion.TipoRegistroChoices.HISTORICO
        self.postulacion.save(update_fields=["tipo_registro"])
        self.assertIsNone(ProyectoGradoWorkflowOrchestrator.autoabrir_siguiente(
            SeguimientoEtapa(postulacion=self.postulacion, etapa=self.modalidad.etapas.first()), self.admin,
        ))

    @patch.object(ProyectoGradoPolicy, "validar_aprobacion_etapa", return_value=None)
    def test_autoapertura_de_defensa_no_inicia_evento_real(self, _validar):
        ProyectoGradoWorkflowOrchestrator.inicializar_proceso(self.postulacion, self.admin)
        etapas = self.etapas()
        for codigo in ProyectoGradoWorkflowOrchestrator.ETAPAS[1:4]:
            WorkflowService.aprobar_etapa(etapas[codigo], self.admin)
            etapas = self.etapas()
        privada = etapas["DEFENSA_PRIVADA"]
        evento = EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=privada,
            tipo_evento="DEFENSA_PRIVADA", estado="PROGRAMADA",
            fecha_programada=timezone.now(), lugar="Sala", programado_por=self.admin,
        )

        self.assertEqual(privada.estado, "EN_PROCESO")
        self.assertEqual(evento.estado, "PROGRAMADA")
        self.assertIsNone(evento.fecha_inicio_real)
        self.assertIsNone(evento.iniciado_por)

    def _preparar_defensa_para_consolidar(self, codigo_etapa, tipo_evento, tipo_evaluacion, nota):
        WorkflowService.inicializar_flujo(self.postulacion, self.admin)
        etapas = self.etapas()
        orden_objetivo = ProyectoGradoWorkflowOrchestrator.ETAPAS.index(codigo_etapa)
        SeguimientoEtapa.objects.filter(
            pk__in=[etapas[codigo].pk for codigo in ProyectoGradoWorkflowOrchestrator.ETAPAS[:orden_objetivo]],
        ).update(estado="APROBADA")
        objetivo = etapas[codigo_etapa]
        objetivo.estado = "EN_PROCESO"
        objetivo.fecha_inicio = timezone.now()
        objetivo.abierta_por = self.admin
        objetivo.save(update_fields=["estado", "fecha_inicio", "abierta_por", "updated_at"])
        evento = EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=objetivo,
            tipo_evento=tipo_evento, estado="FINALIZADA",
            fecha_programada=timezone.now(), fecha_fin_real=timezone.now(),
            lugar="Sala", programado_por=self.admin,
        )
        evaluacion = EvaluacionDefensa.objects.create(
            evento=evento, tipo_evaluacion=tipo_evaluacion, modalidad_registro="CONSENSO",
            resultado_cualitativo="SUFICIENTE" if tipo_evaluacion == "PRIVADA" else "",
            nota_numerica=nota, ponderacion=Decimal("30") if tipo_evaluacion == "PRIVADA" else Decimal("70"),
            aporte_ponderado=nota, semantica_nota="LEGACY_PONDERADA", registrado_por=self.admin,
        )
        return objetivo, evento, evaluacion

    def test_consolidar_privada_autoabre_defensa_publica(self):
        privada, evento, _evaluacion = self._preparar_defensa_para_consolidar(
            "DEFENSA_PRIVADA", "DEFENSA_PRIVADA", "PRIVADA", Decimal("25"),
        )

        EvaluacionDefensaService.consolidar_evaluacion_evento(evento, self.admin)

        privada.refresh_from_db()
        publica = self.etapas()["DEFENSA_PUBLICA"]
        self.assertEqual(privada.estado, "APROBADA")
        self.assertEqual(publica.estado, "EN_PROCESO")
        self.assertEqual(publica.abierta_por, self.admin)

    def test_consolidar_publica_autoabre_revision_final(self):
        publica, evento, _evaluacion = self._preparar_defensa_para_consolidar(
            "DEFENSA_PUBLICA", "DEFENSA_PUBLICA", "PUBLICA", Decimal("60"),
        )
        privada = self.etapas()["DEFENSA_PRIVADA"]
        evento_privado = EventoDefensa.objects.create(
            postulacion=self.postulacion, seguimiento_etapa=privada,
            tipo_evento="DEFENSA_PRIVADA", estado="FINALIZADA",
            fecha_programada=timezone.now(), fecha_fin_real=timezone.now(),
            lugar="Sala", programado_por=self.admin,
        )
        EvaluacionDefensa.objects.create(
            evento=evento_privado, tipo_evaluacion="RESULTADO_FINAL", modalidad_registro="CONSENSO",
            resultado_cualitativo="SUFICIENTE", nota_numerica=Decimal("25"),
            ponderacion=Decimal("30"), aporte_ponderado=Decimal("25"), semantica_nota="LEGACY_PONDERADA",
            es_resultado_final_evento=True, registrado_por=self.admin,
        )

        EvaluacionDefensaService.consolidar_evaluacion_evento(evento, self.admin)

        publica.refresh_from_db()
        revision = self.etapas()["REVISION_FINAL_POST_PUBLICA"]
        self.assertEqual(publica.estado, "APROBADA")
        self.assertEqual(revision.estado, "EN_PROCESO")
        self.assertEqual(revision.abierta_por, self.admin)


class OtrasModalidadesSinAutoaperturaTests(TestCase):
    def test_aprobar_etapa_no_abre_la_siguiente_en_otras_modalidades(self):
        admin = User.objects.create_user(username="admin_otras_auto", is_staff=True)
        estado = EstadoPostulacion.objects.create(codigo="REG-OTRAS-AUTO", nombre="Registrada otras auto")
        EstadoPostulacion.objects.create(codigo="EN_PROCESO", nombre="En proceso otras auto")
        periodo = Periodo.objects.create(
            nombre="2026-OTRAS-AUTO", gestion=2026, semestre="II",
            fecha_inicio="2026-07-01", fecha_fin="2026-12-31",
        )
        codigos = (
            "TESIS_GRADO", "TRABAJO_DIRIGIDO", "EXAMEN_GRADO",
            "EXCELENCIA_ACADEMICA", "GRADUACION_VIA_DIPLOMADO",
        )
        for indice, codigo_modalidad in enumerate(codigos):
            with self.subTest(modalidad=codigo_modalidad):
                modalidad = Modalidad.objects.create(codigo=codigo_modalidad, nombre=f"Modalidad {indice}")
                estudiante = User.objects.create_user(username=f"student_otra_auto_{indice}")
                postulacion = Postulacion.objects.create(
                    codigo=f"OTRA-AUTO-{indice}", estudiante=estudiante, modalidad=modalidad,
                    periodo=periodo, estado_actual=estado,
                )
                primera = EtapaModalidad.objects.create(
                    modalidad=modalidad, codigo="INSCRIPCION", nombre="Inscripción",
                    orden=1, origen_normativo="Normativa",
                )
                segunda = EtapaModalidad.objects.create(
                    modalidad=modalidad, codigo=f"SIGUIENTE_{indice}", nombre="Siguiente",
                    orden=2, origen_normativo="Normativa",
                )
                actual = SeguimientoEtapa.objects.create(
                    postulacion=postulacion, etapa=primera, estado="EN_PROCESO",
                    fecha_inicio=timezone.now(), abierta_por=admin,
                )
                siguiente = SeguimientoEtapa.objects.create(postulacion=postulacion, etapa=segunda)

                with patch.object(
                    ModalidadPolicyRegistry.get(modalidad),
                    "validar_aprobacion_etapa",
                    return_value=None,
                ):
                    WorkflowService.aprobar_etapa(actual, admin)

                siguiente.refresh_from_db()
                self.assertEqual(siguiente.estado, "PENDIENTE")
