from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.usuarios.models import CustomUser, Role


class SeedDemoUsersTests(TestCase):
    def run_command(self):
        stdout = StringIO()
        call_command("seed_demo_users", stdout=stdout)
        return stdout.getvalue()

    def test_creates_active_student_and_role(self):
        self.run_command()

        role = Role.objects.get(codigo="ESTUDIANTE")
        student = CustomUser.objects.get(username="estudiante.demo")
        self.assertEqual(role.nombre, "Estudiante")
        self.assertEqual(student.role, role)
        self.assertEqual(student.nombres, "Ana Maria")
        self.assertEqual(student.apellido_paterno, "Quispe")
        self.assertEqual(student.apellido_materno, "Mamani")
        self.assertEqual(student.ru, "20260001")
        self.assertEqual(student.ci, "9900001")
        self.assertTrue(student.is_active)
        self.assertTrue(student.activo)
        self.assertTrue(student.check_password("EstudianteDemo123!"))

    def test_is_idempotent_and_reactivates_expected_records(self):
        self.run_command()
        student = CustomUser.objects.get(username="estudiante.demo")
        original_id = student.pk
        student.is_active = False
        student.activo = False
        student.save(update_fields=["is_active", "activo"])

        self.run_command()

        self.assertEqual(Role.all_objects.filter(codigo="ESTUDIANTE").count(), 1)
        self.assertEqual(CustomUser.all_objects.filter(username="estudiante.demo").count(), 1)
        student = CustomUser.objects.get(username="estudiante.demo")
        self.assertEqual(student.pk, original_id)
        self.assertTrue(student.is_active)
        self.assertTrue(student.activo)
