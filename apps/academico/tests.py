from django.core.exceptions import ValidationError
from django.test import SimpleTestCase

from apps.academico.models import Modalidad, ModalidadRequisito, Periodo, Requisito


class PeriodoModelTest(SimpleTestCase):
    """Pruebas básicas para validar la creación y reglas del modelo Periodo."""

    def test_periodo_can_be_instantiated_with_valid_dates(self):
        periodo = Periodo(nombre="2025-I", fecha_inicio="2025-01-01", fecha_fin="2025-06-30")

        self.assertEqual(periodo.nombre, "2025-I")
        self.assertEqual(periodo.fecha_inicio, "2025-01-01")
        self.assertEqual(periodo.fecha_fin, "2025-06-30")
        self.assertTrue(periodo.activo)

    def test_periodo_rejects_invalid_date_range(self):
        periodo = Periodo(nombre="2025-II", fecha_inicio="2025-06-30", fecha_fin="2025-06-01")

        with self.assertRaises(ValidationError):
            periodo.full_clean()


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
