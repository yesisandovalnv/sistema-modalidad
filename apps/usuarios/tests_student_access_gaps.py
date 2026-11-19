"""PostgreSQL regression cases; require an explicitly authorized lab DB window."""
import re
from datetime import timedelta

from django.core import mail
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from django.test import override_settings

from apps.usuarios.models import CustomUser, Role, StudentAccountActivation


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
                   DEFAULT_FROM_EMAIL='sender@example.test')
class StudentAccessGapTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        role = Role.objects.create(codigo='ESTUDIANTE', nombre='Estudiante')
        cls.student = CustomUser.objects.create_user(
            username='gap-student', password=None, ru='GAP001', ci='000901',
            role=role, correo_institucional='gap@example.test')

    def request_code(self):
        response = self.client.post(reverse('auth_student_activation_request'),
                                    {'ru': 'GAP001', 'ci': '000901'}, format='json')
        self.assertEqual(response.status_code, 202)
        return re.search(r'\b(\d{6})\b', mail.outbox[-1].body).group(1)

    def confirm(self, code):
        return self.client.post(reverse('auth_student_activation_confirm'), {
            'ru': 'GAP001', 'ci': '000901', 'code': code,
            'password': 'New-Student-Safe-2026'}, format='json')

    def test_expired_code_does_not_set_password(self):
        code = self.request_code()
        StudentAccountActivation.objects.filter(user=self.student).update(
            expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.confirm(code).status_code, 401)
        self.student.refresh_from_db()
        self.assertFalse(self.student.has_usable_password())

    def test_existing_usable_password_keeps_login_but_cannot_reactivate(self):
        self.student.set_password('Existing-Student-Safe-2026')
        self.student.save(update_fields=['password'])
        response = self.client.post(reverse('auth_student_activation_request'),
                                    {'ru': 'GAP001', 'ci': '000901'}, format='json')
        self.assertEqual(response.status_code, 202)
        self.assertEqual(len(mail.outbox), 0)
        login = self.client.post(reverse('auth_student_login'),
                                 {'ru': 'GAP001', 'password': 'Existing-Student-Safe-2026'},
                                 format='json')
        self.assertEqual(login.status_code, 200)

    def test_generic_login_must_not_bypass_blocked_student(self):
        self.student.set_password('Existing-Student-Safe-2026')
        self.student.save(update_fields=['password'])
        for _ in range(3):
            failed = self.client.post(reverse('auth_student_login'),
                                      {'ru': 'GAP001', 'password': 'wrong'}, format='json')
            self.assertEqual(failed.status_code, 401)
        response = self.client.post(reverse('auth_login'),
                                    {'username': 'gap-student', 'password': 'Existing-Student-Safe-2026'},
                                    format='json')
        self.assertEqual(response.status_code, 400)

    def test_admin_password_change_must_invalidate_pending_activation(self):
        code = self.request_code()
        self.student.set_password('Admin-Assigned-Safe-2026')
        self.student.save(update_fields=['password'])
        self.assertEqual(self.confirm(code).status_code, 401)

    def recovery_code(self):
        self.student.set_password('Existing-Student-Safe-2026')
        self.student.save(update_fields=['password'])
        response = self.client.post(reverse('auth_student_recovery_request'),
            {'ru': 'GAP001', 'ci': '000901'}, format='json')
        self.assertEqual(response.status_code, 202)
        return re.search(r'\b(\d{6})\b', mail.outbox[-1].body).group(1)

    def confirm_recovery(self, code):
        return self.client.post(reverse('auth_student_recovery_confirm'), {
            'ru': 'GAP001', 'ci': '000901', 'code': code,
            'password': 'Recovered-Student-Safe-2026'}, format='json')

    def test_recovery_preserves_jwt_contract_and_revokes_old_refresh(self):
        code = self.recovery_code()
        login = self.client.post(reverse('auth_student_login'), {
            'ru': 'GAP001', 'password': 'Existing-Student-Safe-2026'}, format='json')
        self.assertEqual(login.status_code, 200)
        self.assertEqual(self.confirm_recovery(code).status_code, 200)
        self.assertEqual(self.confirm_recovery(code).status_code, 401)
        self.assertEqual(self.client.post(reverse('auth_refresh'), {
            'refresh': login.data['refresh']}, format='json').status_code, 401)
        login = self.client.post(reverse('auth_student_login'), {
            'ru': 'GAP001', 'password': 'Recovered-Student-Safe-2026'}, format='json')
        self.assertEqual(login.status_code, 200)
        self.assertEqual(set(login.data), {'access', 'refresh'})

    def test_recovery_code_expires_without_changing_password(self):
        code = self.recovery_code()
        StudentAccountActivation.objects.filter(user=self.student).update(
            expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.confirm_recovery(code).status_code, 401)
        self.student.refresh_from_db()
        self.assertTrue(self.student.check_password('Existing-Student-Safe-2026'))

    def test_recovery_code_cannot_override_later_admin_password(self):
        code = self.recovery_code()
        self.student.set_password('Later-Admin-Safe-2026')
        self.student.save(update_fields=['password'])
        self.assertEqual(self.confirm_recovery(code).status_code, 401)
        self.student.refresh_from_db()
        self.assertTrue(self.student.check_password('Later-Admin-Safe-2026'))

    def test_unknown_and_no_email_recovery_have_identical_responses(self):
        unknown = self.client.post(reverse('auth_student_recovery_request'),
            {'ru': 'UNKNOWN', 'ci': '000901'}, format='json')
        self.student.correo_institucional = ''
        self.student.save(update_fields=['correo_institucional'])
        missing = self.client.post(reverse('auth_student_recovery_request'),
            {'ru': 'GAP001', 'ci': '000901'}, format='json')
        self.assertEqual(unknown.status_code, missing.status_code)
        self.assertEqual(unknown.data, missing.data)
        self.assertEqual(len(mail.outbox), 0)
