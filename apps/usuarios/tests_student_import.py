import re
from io import BytesIO
from unittest import skipUnless

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core import mail
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from django.db import close_old_connections, connection
from django.db.models.functions import Trim, Upper
from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from openpyxl import load_workbook
from openpyxl import Workbook
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.usuarios.models import AuditLog, CustomUser, Role
from apps.usuarios.student_import import HEADERS, build_template


class StudentImportApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administrador")
        cls.student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        cls.teacher_role = Role.objects.create(codigo="DOCENTE", nombre="Docente")
        cls.admin = CustomUser.objects.create_user("import-admin", password="StrongPass-2026", role=cls.admin_role)
        cls.student = CustomUser.objects.create_user(
            "existing-student", password="OldPass-2026", role=cls.student_role,
            ru="000010", ci="000020",
        )
        cls.student.activo = True
        cls.student.save(update_fields=["activo"])

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    @staticmethod
    def workbook(rows, headers=HEADERS):
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Estudiantes"
        sheet.append(headers)
        for row in rows:
            sheet.append(row)
        output = BytesIO()
        workbook.save(output)
        return SimpleUploadedFile("students.xlsx", output.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

    def validate(self, upload):
        return self.client.post(reverse("student-import-validate"), {"file": upload}, format="multipart")

    def confirm(self, token):
        return self.client.post(reverse("student-import-confirm"), {"token": token}, format="json")

    def activate_imported_user(self, ru, ci):
        response = self.client.post(
            reverse("auth_student_activation_request"),
            {"ru": ru, "ci": ci},
            format="json",
        )
        self.assertEqual(response.status_code, 202, response.data)
        code = re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)
        activated = self.client.post(
            reverse("auth_student_activation_confirm"),
            {
                "ru": ru,
                "ci": ci,
                "code": code,
                "password": "NewStrongPass-2026",
            },
            format="json",
        )
        self.assertEqual(activated.status_code, 200, activated.data)
        return self.client.post(
            reverse("auth_student_login"),
            {"ru": ru, "password": "NewStrongPass-2026"},
            format="json",
        )

    def test_template_has_exact_columns_and_text_identifiers(self):
        workbook = load_workbook(BytesIO(build_template()), data_only=False)
        self.assertEqual(tuple(cell.value for cell in workbook["Estudiantes"][1]), HEADERS)
        self.assertEqual(workbook["Estudiantes"]["D2"].number_format, "@")
        self.assertEqual(workbook["Estudiantes"]["E2"].number_format, "@")
        self.assertIn("Instrucciones", workbook.sheetnames)

    def test_partial_import_creates_student_with_unusable_password_until_email_activation(self):
        response = self.validate(self.workbook([
            ["Ana", "Paz", "Rojas", "00123456", "00098765", "ana@uab.edu", ""],
            ["", "Vera", "Lima", "12345678", "12345678", "", ""],
        ]))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual((response.data["total"], response.data["valid"], response.data["rejected"]), (2, 1, 1))
        self.assertEqual(CustomUser.all_objects.filter(username="00098765").count(), 0)

        result = self.confirm(response.data["token"])
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual((result.data["created"], result.data["rejected"]), (1, 1))
        imported = CustomUser.all_objects.get(username="00098765")
        self.assertEqual(imported.ru, "00098765")
        self.assertEqual(imported.ci, "00123456")
        self.assertEqual(imported.role, self.student_role)
        self.assertTrue(imported.is_active)
        self.assertTrue(imported.activo)
        self.assertFalse(imported.is_staff)
        self.assertFalse(imported.is_superuser)
        self.assertFalse(imported.has_usable_password())
        self.assertEqual(imported.correo_institucional, "ana@uab.edu")
        self.assertEqual(imported.postulaciones.count(), 0)
        self.assertEqual(AuditLog.objects.filter(accion="IMPORTAR_ESTUDIANTES").count(), 1)

        login = self.activate_imported_user("00098765", "00123456")
        self.assertEqual(login.status_code, 200, login.data)
        self.assertEqual(int(AccessToken(login.data["access"])["user_id"]), imported.pk)

    def test_duplicate_rows_ru_ci_and_normalized_ru_are_all_rejected(self):
        response = self.validate(self.workbook([
            ["A", "B", "C", "200001", "AbC100", "", ""],
            ["D", "E", "F", "200002", " abc100 ", "", ""],
            ["G", "H", "I", "200001", "Other", "", ""],
        ]))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["valid"], 0)
        self.assertTrue(all(not row["valid"] for row in response.data["rows"]))

    def test_import_uses_student_login_normalization_and_preserves_ci_zeroes(self):
        response = self.validate(self.workbook([
            ["A", "B", "C", " 00123456 ", "  aBc-00098765  ", "student@example.test", ""],
        ]))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["rows"][0]["ru"], "ABC-00098765")
        self.assertEqual(response.data["rows"][0]["ci"], "00123456")

        result = self.confirm(response.data["token"])
        self.assertEqual(result.data["created"], 1)
        imported = CustomUser.all_objects.get(username="ABC-00098765")
        self.assertEqual(imported.ru, "ABC-00098765")
        self.assertEqual(imported.ci, "00123456")

        login = self.activate_imported_user(" abc-00098765 ", " 00123456 ")
        self.assertEqual(login.status_code, 200, login.data)
        self.assertEqual(int(AccessToken(login.data["access"])["user_id"]), imported.pk)

    def test_existing_ru_normalized_ci_and_derived_username_conflicts_are_rejected(self):
        CustomUser.objects.create_user("USERNAME-CONFLICT", password="x", role=self.teacher_role, ru="OTHER-RU", ci="300001")
        response = self.validate(self.workbook([
            ["A", "B", "C", "400001", " 000010 ", "", ""],
            ["D", "E", "F", " 000020 ", "500001", "", ""],
            ["G", "H", "I", "600001", "username-conflict", "", ""],
        ]))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["valid"], 0)

    def test_numeric_identifiers_and_invalid_emails_are_rejected_without_reconstructing_zeroes(self):
        upload = self.workbook([["A", "B", "C", 12345, 67890, "bad-email", ""]])
        response = self.validate(upload)
        self.assertEqual(response.status_code, 200, response.data)
        errors = " ".join(response.data["rows"][0]["errors"])
        self.assertIn("texto", errors)
        self.assertIn("formato de correo", errors)
        self.assertEqual(CustomUser.all_objects.filter(username="67890").count(), 0)

    def test_confirm_is_idempotent_and_user_without_permission_is_denied(self):
        response = self.validate(self.workbook([["A", "B", "C", "700001", "700002", "", ""]]))
        first = self.confirm(response.data["token"])
        second = self.confirm(response.data["token"])
        self.assertEqual(first.data["created"], 1)
        self.assertTrue(second.data["already_confirmed"])
        self.assertEqual(CustomUser.all_objects.filter(username="700002").count(), 1)
        self.assertEqual(AuditLog.objects.filter(accion="IMPORTAR_ESTUDIANTES").count(), 1)

        self.client.force_authenticate(self.student)
        denied = self.client.get(reverse("student-import-template"))
        self.assertEqual(denied.status_code, 403)

    def test_manual_user_creation_keeps_password_and_role_behavior(self):
        response = self.client.post(reverse("user-admin-list"), {
            "username": "manual-student",
            "nombres": "Manual",
            "role_id": self.student_role.pk,
            "password": "StrongPass-2026",
            "is_active": True,
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        user = CustomUser.all_objects.get(username="manual-student")
        self.assertTrue(user.check_password("StrongPass-2026"))
        self.assertTrue(user.has_usable_password())
        self.assertEqual(user.role, self.student_role)

    def test_invalid_headers_and_empty_files_are_rejected(self):
        bad_headers = self.validate(self.workbook([["A"]], headers=("Nombre",)))
        self.assertEqual(bad_headers.status_code, 400)
        empty = self.validate(self.workbook([]))
        self.assertEqual(empty.status_code, 400)


@skipUnless(connection.vendor == "postgresql", "La prueba concurrente requiere los bloqueos transaccionales de PostgreSQL.")
class StudentImportConcurrencyTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administrador")
        self.student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        self.admin = CustomUser.objects.create_user("race-admin", password="StrongPass-2026", role=self.admin_role)

    @staticmethod
    def workbook_file(ru, ci):
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Estudiantes"
        sheet.append(HEADERS)
        sheet.append(["Concurrente", "Prueba", "Demo", ci, ru, "", ""])
        output = BytesIO()
        workbook.save(output)
        return SimpleUploadedFile("race.xlsx", output.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

    def validate_lot(self, ru, ci):
        client = APIClient()
        client.force_authenticate(self.admin)
        response = client.post(reverse("student-import-validate"), {"file": self.workbook_file(ru, ci)}, format="multipart")
        self.assertEqual(response.status_code, 200, response.data)
        return response.data["token"]

    def confirm_lot(self, token, barrier=None):
        close_old_connections()
        try:
            client = APIClient()
            client.force_authenticate(CustomUser.objects.get(pk=self.admin.pk))
            if barrier:
                barrier.wait(timeout=10)
            response = client.post(reverse("student-import-confirm"), {"token": token}, format="json")
            return response.status_code, response.data
        finally:
            close_old_connections()

    def create_manual_user(self, *, username, ru, ci, barrier=None):
        close_old_connections()
        try:
            client = APIClient()
            client.force_authenticate(CustomUser.objects.get(pk=self.admin.pk))
            if barrier:
                barrier.wait(timeout=10)
            response = client.post(reverse("user-admin-list"), {
                "username": username,
                "password": "StrongPass-2026",
                "nombres": "Registro manual concurrente",
                "ru": ru,
                "ci": ci,
                "role_id": self.student_role.pk,
            }, format="json")
            return response.status_code, response.data
        finally:
            close_old_connections()

    def test_concurrent_batches_cannot_create_equivalent_ru_or_ci(self):
        first = self.validate_lot("Race-0001", "00990011")
        second = self.validate_lot(" race-0001 ", "00990012")
        with ThreadPoolExecutor(max_workers=2) as executor:
            responses = list(executor.map(self.confirm_lot, (first, second)))
        self.assertEqual([status for status, _ in responses], [200, 200])
        self.assertEqual(sum(result["created"] for _, result in responses), 1)
        self.assertEqual(CustomUser.all_objects.annotate(normalized=Upper(Trim("ru"))).filter(normalized="RACE-0001").count(), 1)

    def test_concurrent_batches_cannot_create_same_ci_with_different_ru(self):
        first = self.validate_lot("Race-CI-0001", "00990021")
        second = self.validate_lot("Race-CI-0002", " 00990021 ")
        with ThreadPoolExecutor(max_workers=2) as executor:
            responses = list(executor.map(self.confirm_lot, (first, second)))
        self.assertEqual([status for status, _ in responses], [200, 200])
        self.assertEqual(sum(result["created"] for _, result in responses), 1)
        self.assertEqual(CustomUser.all_objects.filter(ci="00990021").count(), 1)

    def test_concurrent_manual_registration_and_import_cannot_duplicate_ru(self):
        token = self.validate_lot("Cross-RU-9001", "00990031")
        barrier = Barrier(2)
        with ThreadPoolExecutor(max_workers=2) as executor:
            import_future = executor.submit(self.confirm_lot, token, barrier)
            manual_future = executor.submit(
                self.create_manual_user,
                username="manual-cross-ru",
                ru=" cross-ru-9001 ",
                ci="00990032",
                barrier=barrier,
            )
            import_status, import_result = import_future.result(timeout=30)
            manual_status, manual_result = manual_future.result(timeout=30)

        self.assertEqual(import_status, 200, import_result)
        self.assertIn(manual_status, (201, 400), manual_result)
        self.assertEqual(int(import_result["created"] == 1) + int(manual_status == 201), 1)
        self.assertEqual(
            CustomUser.all_objects.annotate(normalized=Upper(Trim("ru")))
            .filter(normalized="CROSS-RU-9001").count(),
            1,
        )

    def test_concurrent_manual_registration_and_import_cannot_duplicate_ci(self):
        token = self.validate_lot("Cross-CI-9001", "00990041")
        barrier = Barrier(2)
        with ThreadPoolExecutor(max_workers=2) as executor:
            import_future = executor.submit(self.confirm_lot, token, barrier)
            manual_future = executor.submit(
                self.create_manual_user,
                username="manual-cross-ci",
                ru="CROSS-CI-MANUAL-9001",
                ci=" 00990041 ",
                barrier=barrier,
            )
            import_status, import_result = import_future.result(timeout=30)
            manual_status, manual_result = manual_future.result(timeout=30)

        self.assertEqual(import_status, 200, import_result)
        self.assertIn(manual_status, (201, 400), manual_result)
        self.assertEqual(int(import_result["created"] == 1) + int(manual_status == 201), 1)
        self.assertEqual(CustomUser.all_objects.filter(ci="00990041").count(), 1)
