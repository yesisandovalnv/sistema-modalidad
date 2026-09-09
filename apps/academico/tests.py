from django.core.exceptions import ValidationError
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APITestCase
from apps.usuarios.models import CustomUser, Role

from apps.academico.models import EtapaModalidad, Modalidad, ModalidadRequisito, Periodo, Requisito


class PeriodoModelTest(TestCase):
    """Pruebas básicas para validar la creación y reglas del modelo Periodo."""

    def test_periodo_can_be_instantiated_with_valid_dates(self):
        periodo = Periodo(nombre="2025-I", gestion=2025, semestre="I", fecha_inicio="2025-01-01", fecha_fin="2025-06-30")

        self.assertEqual(periodo.nombre, "2025-I")
        self.assertEqual(periodo.fecha_inicio, "2025-01-01")
        self.assertEqual(periodo.fecha_fin, "2025-06-30")
        self.assertTrue(periodo.activo)

    def test_periodo_rejects_invalid_date_range(self):
        periodo = Periodo(nombre="2025-II", gestion=2025, semestre="II", fecha_inicio="2025-06-30", fecha_fin="2025-06-01")

        with self.assertRaises(ValidationError):
            periodo.full_clean()


class PeriodoApiTest(APITestCase):
    def setUp(self):
        admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administrador")
        self.client.force_authenticate(CustomUser.objects.create_user(username="period-admin", role=admin_role, is_staff=True))

    def test_periodo_exposes_gestion_semestre_and_filters_active(self):
        Periodo.objects.create(nombre="2026-II", gestion=2026, semestre="II", fecha_inicio="2026-07-01", fecha_fin="2026-12-31")
        response = self.client.get("/api/v1/academico/periodos/?activo=true")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"][0]["gestion"], 2026)
        self.assertEqual(response.data["results"][0]["semestre"], "II")

    def test_api_requires_gestion_and_semestre_for_new_period(self):
        response = self.client.post("/api/v1/academico/periodos/", {"nombre":"2027-I", "fecha_inicio":"2027-01-01", "fecha_fin":"2027-06-30"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("gestion", response.data)


class ModalidadModelTest(SimpleTestCase):
    """Pruebas básicas para validar la creación del modelo Modalidad."""

    def test_modalidad_can_be_instantiated_with_basic_fields(self):
        modalidad = Modalidad(codigo="MOD-01", nombre="Presencial", descripcion="Modalidad presencial")

        self.assertEqual(modalidad.codigo, "MOD-01")
        self.assertEqual(modalidad.nombre, "Presencial")
        self.assertEqual(modalidad.descripcion, "Modalidad presencial")
        self.assertTrue(modalidad.activo)


class RequisitoModelTest(SimpleTestCase):
    """Pruebas básicas para validar la creación del modelo Requisito."""

    def test_requisito_can_be_instantiated_with_basic_fields(self):
        requisito = Requisito(codigo="REQ-01", nombre="Fotocopia de CI", descripcion="Documento de identidad", obligatorio=True)

        self.assertEqual(requisito.codigo, "REQ-01")
        self.assertEqual(requisito.nombre, "Fotocopia de CI")
        self.assertEqual(requisito.obligatorio, True)
        self.assertTrue(requisito.activo)


class ModalidadRequisitoModelTest(SimpleTestCase):
    """Pruebas básicas para validar la creación del modelo ModalidadRequisito."""

    def test_modalidad_requisito_can_be_instantiated_with_basic_fields(self):
        modalidad = Modalidad(codigo="MOD-02", nombre="Virtual")
        requisito = Requisito(codigo="REQ-02", nombre="Pago de trámite")
        relacion = ModalidadRequisito(modalidad=modalidad, requisito=requisito, orden=1)

        self.assertEqual(relacion.modalidad, modalidad)
        self.assertEqual(relacion.requisito, requisito)
        self.assertEqual(relacion.orden, 1)
        self.assertTrue(relacion.activo)

    def test_modalidad_requisito_rejects_zero_order(self):
        modalidad = Modalidad(codigo="MOD-03", nombre="Semipresencial")
        requisito = Requisito(codigo="REQ-03", nombre="Certificado de estudioso")
        relacion = ModalidadRequisito(modalidad=modalidad, requisito=requisito, orden=0)

        with self.assertRaises(ValidationError):
            relacion.full_clean()


class EtapaModalidadModelTest(TestCase):
    """Pruebas para la configuración de etapas por modalidad."""

    def setUp(self) -> None:
        self.modalidad = Modalidad.objects.create(codigo="PG", nombre="Proyecto de Grado")
        self.otra_modalidad = Modalidad.objects.create(codigo="TD", nombre="Trabajo Dirigido")

    def test_etapa_modalidad_normaliza_codigo_y_campos(self):
        etapa = EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo=" perfil_proyecto ",
            nombre="  Perfil de Proyecto  ",
            orden=1,
            origen_normativo="  Capítulo III  ",
        )

        self.assertEqual(etapa.codigo, "PERFIL_PROYECTO")
        self.assertEqual(etapa.nombre, "Perfil de Proyecto")
        self.assertEqual(etapa.origen_normativo, "Capítulo III")
        self.assertTrue(etapa.activo)

    def test_etapa_modalidad_rechaza_orden_invalido(self):
        etapa = EtapaModalidad(
            modalidad=self.modalidad,
            codigo="INSCRIPCION",
            nombre="Inscripción",
            orden=0,
            origen_normativo="Capítulo II",
        )

        with self.assertRaises(ValidationError):
            etapa.full_clean()

    def test_etapa_modalidad_exige_unicidad_por_modalidad(self):
        EtapaModalidad.objects.create(
            modalidad=self.modalidad,
            codigo="INSCRIPCION",
            nombre="Inscripción",
            orden=1,
            origen_normativo="Capítulo II",
        )

        etapa_codigo_duplicado = EtapaModalidad(
            modalidad=self.modalidad,
            codigo="inscripcion",
            nombre="Inscripción duplicada",
            orden=2,
            origen_normativo="Capítulo II",
        )
        etapa_orden_duplicado = EtapaModalidad(
            modalidad=self.modalidad,
            codigo="PERFIL",
            nombre="Perfil",
            orden=1,
            origen_normativo="Capítulo III",
        )
        etapa_otra_modalidad = EtapaModalidad(
            modalidad=self.otra_modalidad,
            codigo="INSCRIPCION",
            nombre="Inscripción",
            orden=1,
            origen_normativo="Capítulo II",
        )

        with self.assertRaises(ValidationError):
            etapa_codigo_duplicado.full_clean()
        with self.assertRaises(ValidationError):
            etapa_orden_duplicado.full_clean()

        etapa_otra_modalidad.full_clean()
