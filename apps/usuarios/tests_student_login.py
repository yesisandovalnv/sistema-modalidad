from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

from django.db import close_old_connections
from django.test import TransactionTestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from apps.usuarios.models import CustomUser, Role, StudentLoginThrottle
from apps.usuarios.student_auth import GENERIC_ERROR


class StudentLoginTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        cls.teacher_role = Role.objects.create(codigo="DOCENTE", nombre="Docente")
        cls.admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administrador")
        cls.student = CustomUser.objects.create_user(
            username="student-login", password="Password-unchanged", ru="RU1001", ci="00123456", role=cls.student_role
        )

    def post(self, ru, ci, origin="127.0.0.11"):
        return self.client.post(reverse("auth_student_login"), {"ru": ru, "ci": ci}, format="json", REMOTE_ADDR=origin)

    def assert_generic_rejection(self, response):
        self.assertEqual(response.status_code, 401)
        self.assertEqual(str(response.data["detail"]), GENERIC_ERROR)

    def test_valid_credentials_normalize_ru_and_ci_and_preserve_password(self):
        password_hash = self.student.password
        response = self.post("  ru1001 ", " 00123456 ")
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.student.refresh_from_db()
        self.assertEqual(self.student.password, password_hash)
        self.assertIsNotNone(self.student.last_login)

    def test_tokens_do_not_include_personal_data(self):
        response = self.post("RU1001", "00123456")
        claims = AccessToken(response.data["access"])
        for field in ("ru", "ci", "username", "email", "role", "nombres"):
            self.assertNotIn(field, claims)

    def test_student_tokens_refresh_and_expose_only_student_capabilities(self):
        login = self.post("RU1001", "00123456")
        refreshed = self.client.post(reverse("auth_refresh"), {"refresh": login.data["refresh"]}, format="json")
        self.assertEqual(refreshed.status_code, 200)
        self.assertIn("access", refreshed.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refreshed.data['access']}")
        profile = self.client.get(reverse("auth_me"))
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.data["rol"]["codigo"], "ESTUDIANTE")
        self.assertTrue(profile.data["permisos"]["puede_ver_postulaciones"])
        self.assertFalse(profile.data["permisos"]["puede_gestionar_postulaciones"])
        self.assertFalse(profile.data["permisos"]["puede_gestionar_usuarios"])

    def test_nonexistent_wrong_ci_inactive_and_wrong_role_are_indistinguishable(self):
        inactive = CustomUser.objects.create_user(username="inactive-login", password="x", ru="RU2001", ci="20000001", role=self.student_role, is_active=False)
        inactive.activo = False
        inactive.save(update_fields=["activo"])
        CustomUser.objects.create_user(username="teacher-login", password="x", ru="RU3001", ci="30000001", role=self.teacher_role)
        responses = [
            self.post("UNKNOWN", "99999999", "127.0.0.21"),
            self.post("RU1001", "wrong", "127.0.0.22"),
            self.post("RU2001", "20000001", "127.0.0.23"),
            self.post("RU3001", "30000001", "127.0.0.24"),
        ]
        for response in responses:
            self.assert_generic_rejection(response)

    def test_staff_or_superuser_cannot_use_student_login_even_with_student_role(self):
        CustomUser.objects.create_user(username="privileged-student", password="x", ru="RU4001", ci="40000001", role=self.student_role, is_staff=True)
        self.assert_generic_rejection(self.post("RU4001", "40000001"))

    def test_normalized_ru_ambiguity_is_rejected(self):
        CustomUser.objects.create_user(username="ambiguous-a", password="x", ru="RU5001", ci="50000001", role=self.student_role)
        CustomUser.objects.create_user(username="ambiguous-b", password="x", ru="ru5001", ci="50000002", role=self.student_role)
        self.assert_generic_rejection(self.post("ru5001", "50000001"))

    def test_third_failure_blocks_for_fifteen_minutes_and_success_resets(self):
        for _ in range(3):
            self.assert_generic_rejection(self.post("RU1001", "incorrect"))
        state = StudentLoginThrottle.objects.get(scope=StudentLoginThrottle.Scope.ACCOUNT)
        self.assertEqual(state.failed_attempts, 3)
        self.assertGreater(state.blocked_until, timezone.now() + timedelta(minutes=14))
        self.assert_generic_rejection(self.post("RU1001", "00123456"))

        state.blocked_until = timezone.now() - timedelta(seconds=1)
        state.save(update_fields=["blocked_until"])
        success = self.post("RU1001", "00123456")
        self.assertEqual(success.status_code, 200)
        state.refresh_from_db()
        self.assertEqual(state.failed_attempts, 0)
        self.assertIsNone(state.blocked_until)

    def test_success_resets_first_and_second_failure(self):
        self.assert_generic_rejection(self.post("RU1001", "incorrect"))
        self.assert_generic_rejection(self.post("RU1001", "incorrect"))
        self.assertEqual(self.post("RU1001", "00123456").status_code, 200)
        account = StudentLoginThrottle.objects.get(scope=StudentLoginThrottle.Scope.ACCOUNT)
        self.assertEqual(account.failed_attempts, 0)

    def test_origin_is_limited_without_using_forwarded_for(self):
        for index in range(10):
            response = self.client.post(
                reverse("auth_student_login"),
                {"ru": f"UNKNOWN{index}", "ci": "invalid"},
                format="json",
                REMOTE_ADDR="127.0.0.31",
                HTTP_X_FORWARDED_FOR=f"10.0.0.{index}",
            )
            self.assert_generic_rejection(response)
        origin = StudentLoginThrottle.objects.get(scope=StudentLoginThrottle.Scope.ORIGIN)
        self.assertEqual(origin.failed_attempts, 10)
        self.assertIsNotNone(origin.blocked_until)

    def test_security_logs_do_not_contain_credentials(self):
        with self.assertLogs("security.student_login", level="WARNING") as captured:
            self.post("RU1001", "secret-ci-value")
        output = " ".join(captured.output)
        self.assertNotIn("RU1001", output)
        self.assertNotIn("secret-ci-value", output)

    def test_administrative_login_contract_is_unchanged(self):
        admin = CustomUser.objects.create_user(username="admin-login", password="StrongPass-2026", role=self.admin_role)
        response = self.client.post(reverse("auth_login"), {"username": admin.username, "password": "StrongPass-2026"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.data), {"access", "refresh"})


class StudentLoginConcurrencyTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        CustomUser.objects.create_user(username="concurrent-student", password="x", ru="RU9001", ci="90000001", role=role)

    @staticmethod
    def _failed_request():
        close_old_connections()
        try:
            return APIClient().post(
                reverse("auth_student_login"), {"ru": "RU9001", "ci": "incorrect"}, format="json", REMOTE_ADDR="127.0.0.91"
            ).status_code
        finally:
            close_old_connections()

    def test_three_concurrent_failures_are_not_lost(self):
        with ThreadPoolExecutor(max_workers=3) as executor:
            statuses = list(executor.map(lambda _: self._failed_request(), range(3)))
        self.assertEqual(statuses, [401, 401, 401])
        account = StudentLoginThrottle.objects.get(scope=StudentLoginThrottle.Scope.ACCOUNT)
        self.assertEqual(account.failed_attempts, 3)
        self.assertIsNotNone(account.blocked_until)
