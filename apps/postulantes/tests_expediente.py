from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.postulantes.models import (
    AsignacionPostulacion,
    EstadoPostulacion,
    EvaluacionDefensa,
    EventoDefensa,
    HistorialEstado,
    Postulacion,
    SeguimientoEtapa,
)
from apps.postulantes.serializers import HistorialEstadoSerializer
from apps.usuarios.models import AuditLog, CustomUser


class ExpedienteAccessContractTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.staff = CustomUser.objects.create_user("exp-staff", is_staff=True)
        cls.superuser = CustomUser.objects.create_superuser("exp-superuser")
        cls.owner = CustomUser.objects.create_user(
            "exp-owner", nombres="Ana", apellido_paterno="Pérez", ru="RU-100"
        )
        cls.other = CustomUser.objects.create_user("exp-other")
        cls.assigned = CustomUser.objects.create_user("exp-assigned")
        cls.historical = CustomUser.objects.create_user("exp-historical")
        cls.unassigned = CustomUser.objects.create_user("exp-unassigned")
        cls.modalidad = Modalidad.objects.create(
            codigo="PROYECTO_GRADO", nombre="Proyecto de Grado"
        )
        cls.periodo = Periodo.objects.create(
            nombre="2026-II",
            gestion=2026,
            semestre="II",
            fecha_inicio="2026-07-01",
            fecha_fin="2026-12-31",
        )
        cls.estado = EstadoPostulacion.objects.create(
            codigo="EN_PROCESO", nombre="En proceso"
        )
        cls.postulacion = Postulacion.objects.create(
            codigo="EXP-001",
            estudiante=cls.owner,
            modalidad=cls.modalidad,
            periodo=cls.periodo,
            estado_actual=cls.estado,
        )
        cls.ajena = Postulacion.objects.create(
            codigo="EXP-002",
            estudiante=cls.other,
            modalidad=cls.modalidad,
            periodo=cls.periodo,
            estado_actual=cls.estado,
        )
        cls.inscripcion = EtapaModalidad.objects.create(
            modalidad=cls.modalidad,
            codigo="INSCRIPCION",
            nombre="Inscripción",
            orden=1,
            origen_normativo="Contrato funcional, etapa de inscripción",
        )
        cls.perfil = EtapaModalidad.objects.create(
            modalidad=cls.modalidad,
            codigo="PERFIL_PROYECTO",
            nombre="Perfil de Proyecto",
            orden=2,
            origen_normativo="Contrato funcional, etapa de perfil",
        )
        cls.defensa_publica = EtapaModalidad.objects.create(
            modalidad=cls.modalidad,
            codigo="DEFENSA_PUBLICA",
            nombre="Defensa publica",
            orden=3,
            origen_normativo="Contrato funcional, defensa publica",
        )
        SeguimientoEtapa.objects.create(
            postulacion=cls.postulacion,
            etapa=cls.inscripcion,
            estado=SeguimientoEtapa.EstadoChoices.APROBADA,
        )
        SeguimientoEtapa.objects.create(
            postulacion=cls.postulacion,
            etapa=cls.perfil,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
        )
        seguimiento_publico = SeguimientoEtapa.objects.create(
            postulacion=cls.postulacion,
            etapa=cls.defensa_publica,
            estado=SeguimientoEtapa.EstadoChoices.APROBADA,
        )
        AsignacionPostulacion.objects.create(
            postulacion=cls.postulacion,
            usuario=cls.assigned,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
            designado_por=cls.staff,
        )
        asignacion_historica = AsignacionPostulacion.objects.create(
            postulacion=cls.postulacion,
            usuario=cls.historical,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TRIBUNAL,
            designado_por=cls.staff,
        )
        asignacion_historica.activo = False
        asignacion_historica.save(update_fields=["activo"])
        evento = EventoDefensa.objects.create(
            postulacion=cls.postulacion,
            seguimiento_etapa=seguimiento_publico,
            tipo_evento=EventoDefensa.Tipo.DEFENSA_PUBLICA,
            estado=EventoDefensa.Estado.FINALIZADA,
            fecha_programada=timezone.now(),
            lugar="Sala",
            programado_por=cls.staff,
        )
        EvaluacionDefensa.objects.create(
            evento=evento,
            tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL,
            modalidad_registro=EvaluacionDefensa.ModalidadRegistro.CONSENSO,
            resultado_cualitativo=EvaluacionDefensa.Resultado.APROBADO,
            nota_numerica=Decimal("60.00"),
            ponderacion=Decimal("70.00"),
            aporte_ponderado=Decimal("60.00"),
            es_resultado_final_evento=True,
            registrado_por=cls.staff,
        )
        cls.estado_inicial = EstadoPostulacion.objects.create(
            codigo="REGISTRADA_EXP", nombre="Registrada"
        )
        cls.historial_inicial = HistorialEstado.objects.create(
            postulacion=cls.postulacion,
            estado_anterior=None,
            estado_nuevo=cls.estado_inicial,
            usuario=cls.owner,
            comentario="",
        )
        cls.historial_actual = HistorialEstado.objects.create(
            postulacion=cls.postulacion,
            estado_anterior=cls.estado_inicial,
            estado_nuevo=cls.estado,
            usuario=cls.staff,
            comentario="Inicio de revisión",
        )
        cls.historial_ajeno = HistorialEstado.objects.create(
            postulacion=cls.ajena,
            estado_anterior=None,
            estado_nuevo=cls.estado,
            usuario=cls.other,
            comentario="Registro ajeno",
        )

    def client_for(self, user=None):
        client = APIClient()
        if user:
            client.force_authenticate(user)
        return client

    def urls(self, postulacion=None):
        postulacion = postulacion or self.postulacion
        base = f"/api/v1/postulaciones/{postulacion.pk}/"
        return base, f"{base}flujo/"

    def expediente_urls(self, pk=None):
        pk = pk or self.postulacion.pk
        base = f"/api/v1/postulaciones/{pk}/"
        return (base, f"{base}flujo/", f"{base}resultado-final/", f"{base}cierre/")

    def assert_access(self, user, expected):
        detail, flow = self.urls()
        client = self.client_for(user)
        self.assertEqual(client.get(detail).status_code, expected)
        self.assertEqual(client.get(flow).status_code, expected)

    def test_anonymous_receives_401_for_detail_and_flow(self):
        detail, flow = self.urls()
        client = self.client_for()
        self.assertEqual(client.get(detail).status_code, 401)
        self.assertEqual(client.get(flow).status_code, 401)

    def test_staff_owner_and_assigned_actor_access_detail_and_flow(self):
        for user in (self.staff, self.owner, self.assigned):
            with self.subTest(user=user.username):
                self.assert_access(user, 200)

    def test_other_student_and_unassigned_actor_cannot_access(self):
        for user in (self.other, self.unassigned):
            with self.subTest(user=user.username):
                self.assert_access(user, 404)

    def test_detail_exposes_basic_readable_data(self):
        detail, _ = self.urls()
        data = self.client_for(self.owner).get(detail).data
        self.assertEqual(data["codigo"], "EXP-001")
        self.assertEqual(data["estudiante_detalle"]["nombre_completo"], "Ana Pérez")
        self.assertEqual(data["estudiante_detalle"]["ru"], "RU-100")
        self.assertEqual(data["modalidad_detalle"]["nombre"], "Proyecto de Grado")
        self.assertEqual(data["periodo_detalle"]["gestion"], 2026)
        self.assertEqual(data["periodo_detalle"]["semestre"], "II")
        self.assertEqual(data["estado_actual_detalle"]["nombre"], "En proceso")

    def test_flow_exposes_modality_current_stage_progress_and_ordered_stages(self):
        _, flow = self.urls()
        data = self.client_for(self.assigned).get(flow).data
        self.assertEqual(data["modalidad"]["codigo"], "PROYECTO_GRADO")
        self.assertEqual(data["etapa_actual"]["codigo"], "PERFIL_PROYECTO")
        self.assertEqual(data["porcentaje_avance"], 66.67)
        self.assertEqual([item["codigo"] for item in data["etapas"]], ["INSCRIPCION", "PERFIL_PROYECTO", "DEFENSA_PUBLICA"])

    def test_matriz_canonicamente_autorizada_en_los_cuatro_endpoints(self):
        for user in (self.staff, self.superuser, self.owner, self.assigned, self.historical):
            with self.subTest(user=user.username):
                client = self.client_for(user)
                self.assertEqual(
                    [client.get(url).status_code for url in self.expediente_urls()],
                    [200, 200, 200, 200],
                )

    def test_matriz_oculta_objetos_a_usuarios_no_relacionados(self):
        for user in (self.other, self.unassigned):
            with self.subTest(user=user.username):
                client = self.client_for(user)
                self.assertEqual(
                    [client.get(url).status_code for url in self.expediente_urls()],
                    [404, 404, 404, 404],
                )

    def test_matriz_anonima_e_inexistente_es_uniforme(self):
        self.assertEqual(
            [self.client_for().get(url).status_code for url in self.expediente_urls()],
            [401, 401, 401, 401],
        )
        client = self.client_for(self.staff)
        self.assertEqual(
            [client.get(url).status_code for url in self.expediente_urls(999999)],
            [404, 404, 404, 404],
        )

    def test_consultas_conservan_resultado_cierre_y_no_auditan(self):
        client = self.client_for(self.historical)
        before = AuditLog.objects.count()
        detail = client.get(self.expediente_urls()[0])
        flow = client.get(self.expediente_urls()[1])
        result = client.get(self.expediente_urls()[2])
        closure = client.get(self.expediente_urls()[3])
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(flow.status_code, 200)
        self.assertIsNone(result.data["nota_final"])
        self.assertEqual(result.data["aporte_publica"], Decimal("60.00"))
        self.assertIn("advertencias_normativas", closure.data)
        self.assertIn("condiciones_faltantes", closure.data)
        self.assertEqual(AuditLog.objects.count(), before)

    def test_metodos_no_permitidos_del_expediente_se_conservan(self):
        client = self.client_for(self.staff)
        detail, flow, result, closure = self.expediente_urls()
        self.assertEqual(client.delete(detail).status_code, 405)
        self.assertEqual(client.patch(flow, {}).status_code, 405)
        self.assertEqual(client.put(result, {}).status_code, 405)
        self.assertEqual(client.patch(closure, {}).status_code, 405)

    def test_historial_filtra_exactamente_y_expone_etiquetas_legibles(self):
        response = self.client_for(self.staff).get(
            "/api/v1/postulaciones/historial/",
            {"postulacion": self.postulacion.pk, "ordering": "fecha_cambio"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual([item["postulacion"] for item in response.data["results"]], [self.postulacion.pk] * 2)
        first, last = response.data["results"]
        self.assertIsNone(first["estado_anterior"])
        self.assertIsNone(first["estado_anterior_nombre"])
        self.assertEqual(first["estado_nuevo_nombre"], "Registrada")
        self.assertEqual(first["actor_nombre"], "Ana Pérez")
        self.assertEqual(last["estado_anterior_nombre"], "Registrada")
        self.assertEqual(last["estado_nuevo_nombre"], "En proceso")
        self.assertEqual(last["actor_nombre"], "exp-staff")
        historial_sin_actor = type("HistorialSinActor", (), {"usuario": None})()
        self.assertIsNone(HistorialEstadoSerializer().get_actor_nombre(historial_sin_actor))

    def test_historial_respeta_alcance_canonico_y_no_audita_get(self):
        url = "/api/v1/postulaciones/historial/"
        for user in (self.staff, self.superuser, self.owner, self.assigned, self.historical):
            with self.subTest(user=user.username):
                before = AuditLog.objects.count()
                response = self.client_for(user).get(url, {"postulacion": self.postulacion.pk})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data["count"], 2)
                self.assertEqual(AuditLog.objects.count(), before)
        for user in (self.other, self.unassigned):
            with self.subTest(user=user.username):
                response = self.client_for(user).get(url, {"postulacion": self.postulacion.pk})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data["count"], 0)
        self.assertEqual(self.client_for().get(url).status_code, 401)
        self.assertEqual(self.client_for(self.owner).get(f"{url}{self.historial_ajeno.pk}/").status_code, 404)

    def test_historial_conserva_paginacion_y_solo_lectura(self):
        HistorialEstado.objects.bulk_create([
            HistorialEstado(
                postulacion=self.postulacion,
                estado_anterior=self.estado_inicial,
                estado_nuevo=self.estado,
                usuario=self.staff,
                comentario=f"Cambio {index}",
            )
            for index in range(20)
        ])
        url = "/api/v1/postulaciones/historial/"
        client = self.client_for(self.staff)
        first = client.get(url, {"postulacion": self.postulacion.pk, "ordering": "fecha_cambio"})
        second = client.get(url, {"postulacion": self.postulacion.pk, "ordering": "fecha_cambio", "page": 2})
        self.assertEqual(first.data["count"], 22)
        self.assertEqual(len(first.data["results"]), 20)
        self.assertEqual(len(second.data["results"]), 2)
        self.assertIsNotNone(first.data["next"])
        self.assertIsNotNone(second.data["previous"])
        detail = f"{url}{self.historial_inicial.pk}/"
        self.assertEqual(client.post(url, {}).status_code, 405)
        self.assertEqual(client.put(detail, {}).status_code, 405)
        self.assertEqual(client.patch(detail, {}).status_code, 405)
        self.assertEqual(client.delete(detail).status_code, 405)
