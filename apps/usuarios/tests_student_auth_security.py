"""Run directly with Python for security tests with all DB access forbidden."""
if __name__ == '__main__':
    import os
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    os.environ['PYTHON_DOTENV_DISABLED'] = '1'
    import core.settings as defaults
    from django.conf import settings

    settings.configure(**{key: value for key, value in vars(defaults).items()
                          if key.isupper() and key != 'DATABASES'},
                       DATABASES={'default': {'ENGINE': 'django.db.backends.dummy'}})
    import django
    django.setup()
from contextlib import nullcontext
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier, Lock
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase, override_settings
from django.core.exceptions import ValidationError
from django.urls import resolve, reverse
from django.utils import timezone
from rest_framework import serializers
from rest_framework.test import APIRequestFactory

from apps.usuarios import student_auth as auth
from apps.usuarios.serializers import LoginSerializer
from apps.usuarios.views import StudentRecoveryRequestView


@override_settings(SECRET_KEY='test-only-key', EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
                   ROOT_URLCONF='apps.usuarios.urls',
                   DEFAULT_FROM_EMAIL='sender@example.test', STUDENT_CODE_ACCOUNT_LIMIT=5,
                   STUDENT_CODE_ORIGIN_LIMIT=10, STUDENT_CODE_TTL_SECONDS=600)
class StudentAuthSecurityTests(SimpleTestCase):
    def setUp(self):
        self.request = APIRequestFactory().post('/', {}, REMOTE_ADDR='192.0.2.1')
        self.user = SimpleNamespace(pk=1, ru='RU1', ci='001', role=SimpleNamespace(codigo='ESTUDIANTE'),
            is_active=True, activo=True, is_staff=False, is_superuser=False,
            correo_institucional='student@example.test', password='old-hash',
            has_usable_password=Mock(return_value=False), set_password=Mock(), save=Mock())
        self.state = SimpleNamespace(last_sent_at=None, request_window_started_at=None,
            requests_in_window=0, used_at=None, activo=True, failed_attempts=0, save=Mock(),
            expires_at=timezone.now() + timedelta(minutes=5), code_digest='')
        for target, options in [
            ('_code_budget', {'return_value': True}),
            ('_find_student', {'return_value': self.user}),
            ('transaction.atomic', {'side_effect': lambda: nullcontext()}),
            ('CustomUser.all_objects', {}),
            ('StudentAccountActivation.objects', {}),
            ('StudentLoginThrottle.objects', {}),
        ]:
            context = patch('apps.usuarios.student_auth.' + target, **options)
            setattr(self, target.split('.')[0] + '_mock', context.start())
            self.addCleanup(context.stop)
        self.CustomUser_mock.select_for_update.return_value.get.return_value = self.user
        manager = self.StudentAccountActivation_mock.select_for_update.return_value
        manager.get_or_create.return_value = (self.state, True)
        manager.filter.return_value.first.return_value = self.state
        self.StudentLoginThrottle_mock.select_for_update.return_value.get_or_create.return_value = (
            SimpleNamespace(last_sent_at=None, request_window_started_at=None, requests_in_window=0,
                used_at=None, activo=True, failed_attempts=0, save=Mock(),
                expires_at=timezone.now() + timedelta(minutes=5), code_digest='',
                window_started_at=None, blocked_until=None), True)

    def request_code(self, purpose='activation'):
        auth._request_student_code(ru='RU1', ci='001', request=self.request, purpose=purpose)

    def confirm(self, purpose='activation', code='123456'):
        auth._confirm_student_code(ru='RU1', ci='001', code=code, password='New-Password-2026',
                                   request=self.request, purpose=purpose)

    def test_unknown_account_never_opens_mail(self):
        self._find_student_mock.return_value = None
        with patch.object(auth, 'get_connection') as connection:
            self.request_code()
        connection.assert_not_called()

    def test_missing_email_or_existing_password_never_opens_activation_mail(self):
        with patch.object(auth, 'get_connection') as connection:
            self.user.correo_institucional = ''
            self.request_code()
            self.user.correo_institucional = 'student@example.test'
            self.user.has_usable_password.return_value = True
            self.request_code()
        connection.assert_not_called()

    def test_budget_and_resend_delay_precede_mail(self):
        with patch.object(auth, 'get_connection') as connection:
            self._code_budget_mock.return_value = False
            self.request_code()
            self._find_student_mock.assert_not_called()
            self._code_budget_mock.return_value = True
            self.state.last_sent_at = timezone.now()
            self.request_code()
        connection.assert_not_called()

    def test_code_is_bound_to_purpose_password_and_email(self):
        digest = auth._code_digest(self.user, '123456', 'activation')
        self.assertEqual(len(digest), 64)
        self.assertNotIn('123456', digest)
        self.assertNotEqual(digest, auth._code_digest(self.user, '123456', 'recovery'))
        self.user.password = 'admin-assigned-hash'
        self.assertNotEqual(digest, auth._code_digest(self.user, '123456', 'activation'))
        self.user.password = 'old-hash'
        self.user.correo_institucional = 'changed@example.test'
        self.assertNotEqual(digest, auth._code_digest(self.user, '123456', 'activation'))

    def test_delivery_failure_is_generic_and_invalidates_code(self):
        with patch.object(auth, 'get_connection', side_effect=OSError('private host')):
            self.request_code()
        self.assertEqual(self.state.code_digest, '')
        self.assertFalse(self.state.activo)

    def test_sent_code_is_hashed_and_expires(self):
        with patch.object(auth.secrets, 'randbelow', return_value=123456), patch.object(auth, 'EmailMessage') as message:
            message.return_value.send.return_value = 1
            self.request_code()
        self.assertEqual(self.state.code_digest, auth._code_digest(self.user, '123456', 'activation'))
        self.assertLessEqual(self.state.expires_at, timezone.now() + timedelta(seconds=600))
        self.assertEqual(message.call_args.kwargs['to'], ['student@example.test'])

    def test_expired_and_exhausted_codes_are_erased(self):
        for expired, attempts in [(True, 0), (False, 5)]:
            self.state.activo = True
            self.state.code_digest = 'digest'
            self.state.expires_at = timezone.now() + timedelta(minutes=-1 if expired else 5)
            self.state.failed_attempts = attempts
            with self.assertRaises(auth.StudentLoginRejected):
                self.confirm()
            self.assertEqual(self.state.code_digest, '')
            self.assertFalse(self.state.activo)
        self.user.set_password.assert_not_called()

    def test_admin_password_change_cannot_be_overwritten_by_activation(self):
        self.state.code_digest = auth._code_digest(self.user, '123456', 'activation')
        self.user.has_usable_password.return_value = True
        self.user.password = 'admin-assigned-hash'
        with self.assertRaises(auth.StudentLoginRejected):
            self.confirm()
        self.user.set_password.assert_not_called()
        self.assertFalse(self.state.activo)

    def test_success_consumes_code_and_replay_fails(self):
        self.state.code_digest = auth._code_digest(self.user, '123456', 'activation')
        with patch.object(auth.password_validation, 'validate_password'):
            self.confirm()
        self.assertEqual(self.state.code_digest, '')
        self.assertIsNotNone(self.state.used_at)
        with self.assertRaises(auth.StudentLoginRejected):
            self.confirm()
        self.user.set_password.assert_called_once_with('New-Password-2026')

    def test_recovery_consumes_code_and_blacklists_refresh_tokens(self):
        self.user.has_usable_password.return_value = True
        self.state.code_digest = auth._code_digest(self.user, '123456', 'recovery')
        with patch.object(auth.password_validation, 'validate_password'), \
                patch('rest_framework_simplejwt.token_blacklist.models.OutstandingToken.objects') as outstanding, \
                patch('rest_framework_simplejwt.token_blacklist.models.BlacklistedToken.objects') as blacklist:
            outstanding.filter.return_value = ['token-one', 'token-two']
            self.confirm('recovery')
        self.assertEqual(blacklist.get_or_create.call_count, 2)
        self.assertFalse(self.state.activo)

    def test_recovery_rejects_code_issued_before_later_password_change(self):
        self.user.has_usable_password.return_value = True
        self.state.code_digest = auth._code_digest(self.user, '123456', 'recovery')
        self.user.password = 'later-password'
        with self.assertRaises(auth.StudentLoginRejected):
            self.confirm('recovery')
        self.user.set_password.assert_not_called()

    def test_recovery_code_at_activation_endpoint_does_not_consume_or_invalidate(self):
        self.state.code_digest = auth._code_digest(self.user, '123456', 'recovery')
        self.user.has_usable_password.return_value = True
        with self.assertRaises(auth.StudentLoginRejected):
            self.confirm('activation')
        self.assertEqual(self.state.code_digest, auth._code_digest(self.user, '123456', 'recovery'))
        self.assertTrue(self.state.activo)
        self.assertIsNone(self.state.used_at)
        self.assertEqual(self.state.failed_attempts, 0)
        self.user.set_password.assert_not_called()

    def test_activation_code_at_recovery_endpoint_does_not_consume_or_invalidate(self):
        self.state.code_digest = auth._code_digest(self.user, '123456', 'activation')
        with self.assertRaises(auth.StudentLoginRejected):
            self.confirm('recovery')
        self.assertEqual(self.state.code_digest, auth._code_digest(self.user, '123456', 'activation'))
        self.assertTrue(self.state.activo)
        self.assertIsNone(self.state.used_at)
        self.assertEqual(self.state.failed_attempts, 0)
        self.user.set_password.assert_not_called()

    def test_wrong_code_for_correct_purpose_counts_as_failure_without_consuming_code(self):
        self.state.code_digest = auth._code_digest(self.user, '123456', 'activation')
        with self.assertRaises(auth.StudentLoginRejected):
            self.confirm('activation', '654321')
        self.assertEqual(self.state.code_digest, auth._code_digest(self.user, '123456', 'activation'))
        self.assertEqual(self.state.failed_attempts, 1)
        self.assertTrue(self.state.activo)
        self.user.set_password.assert_not_called()

    def test_concurrent_confirmation_consumes_code_only_once(self):
        self.state.code_digest = auth._code_digest(self.user, '123456', 'activation')
        lock = Lock()
        barrier = Barrier(2)
        self.transaction_mock.side_effect = lambda: lock

        def attempt():
            barrier.wait(timeout=5)
            try:
                self.confirm()
            except auth.StudentLoginRejected:
                return 'rejected'
            return 'accepted'

        with patch.object(auth.password_validation, 'validate_password'), \
                ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: attempt(), range(2)))

        self.assertCountEqual(results, ['accepted', 'rejected'])
        self.assertEqual(self.user.set_password.call_count, 1)
        self.assertIsNotNone(self.state.used_at)
        self.assertFalse(self.state.activo)

    def test_weak_password_does_not_consume_a_valid_code(self):
        self.state.code_digest = auth._code_digest(self.user, '123456', 'activation')
        with patch.object(auth.password_validation, 'validate_password', side_effect=ValidationError('Weak password')):
            with self.assertRaises(serializers.ValidationError):
                self.confirm()
        self.user.set_password.assert_not_called()
        self.assertTrue(self.state.activo)
        self.assertIsNone(self.state.used_at)

    def test_account_budget_persists_and_blocks_the_next_attempt(self):
        states = [SimpleNamespace(blocked_until=None, window_started_at=None, failed_attempts=0, save=Mock()) for _ in range(2)]
        for _ in range(5):
            with patch.object(auth, '_locked_state', side_effect=states):
                self.assertTrue(ORIGINAL_BUDGET(ru='RU1', request=self.request, stage='confirm'))
        self.assertIsNotNone(states[1].blocked_until)
        with patch.object(auth, '_locked_state', side_effect=states):
            self.assertFalse(ORIGINAL_BUDGET(ru='RU1', request=self.request, stage='confirm'))
        self.assertEqual(states[1].failed_attempts, 5)

    def test_origin_budget_blocks_requests_across_different_accounts(self):
        origin = SimpleNamespace(blocked_until=None, window_started_at=None, failed_attempts=0, save=Mock())
        for index in range(10):
            account = SimpleNamespace(blocked_until=None, window_started_at=None, failed_attempts=0, save=Mock())
            with patch.object(auth, '_locked_state', side_effect=[origin, account]):
                self.assertTrue(ORIGINAL_BUDGET(ru=f'UNKNOWN{index}', request=self.request, stage='request'))
        with patch.object(auth, '_locked_state', side_effect=[origin, account]) as locked:
            self.assertFalse(ORIGINAL_BUDGET(ru='NEW', request=self.request, stage='request'))
        self.assertEqual(locked.call_count, 2)
        self.assertEqual(origin.failed_attempts, 10)

    def test_effective_smtp_settings_read_environment_and_reject_unsafe_configuration(self):
        import os
        import runpy
        from django.core.exceptions import ImproperlyConfigured
        with patch.dict(os.environ, {'PYTHON_DOTENV_DISABLED': '1', 'EMAIL_HOST': 'smtp.example.test',
                'EMAIL_USE_TLS': 'true', 'EMAIL_USE_SSL': 'false', 'EMAIL_TIMEOUT': '7'}, clear=True):
            values = runpy.run_path('core/settings/base.py')
            self.assertEqual(values['EMAIL_HOST'], 'smtp.example.test')
            self.assertEqual(values['EMAIL_TIMEOUT'], 7)
            os.environ['EMAIL_USE_SSL'] = 'true'
            with self.assertRaises(ImproperlyConfigured):
                runpy.run_path('core/settings/base.py')

    def test_generic_login_rejects_students_but_preserves_admin(self):
        with patch('apps.usuarios.serializers.authenticate', return_value=self.user):
            with self.assertRaises(serializers.ValidationError) as student:
                LoginSerializer().validate({'username': 'name', 'password': 'secret'})
            self.user.role.codigo = 'ADMINISTRADOR'
            self.assertIs(LoginSerializer().validate({'username': 'name', 'password': 'secret'})['user'], self.user)
        with patch('apps.usuarios.serializers.authenticate', return_value=None):
            with self.assertRaises(serializers.ValidationError) as unknown:
                LoginSerializer().validate({'username': 'name', 'password': 'secret'})
        self.assertEqual(student.exception.detail, unknown.exception.detail)

    def test_recovery_route_and_generic_request_response(self):
        self.assertEqual(resolve(reverse('auth_student_recovery_request')).func.view_class.__name__, StudentRecoveryRequestView.__name__)
        self.assertNotEqual(reverse('auth_student_recovery_confirm'), reverse('auth_student_activation_confirm'))
        request = APIRequestFactory().post('/', {'ru': 'RU1', 'ci': '001'}, format='json')
        with patch.object(StudentRecoveryRequestView, 'service') as service:
            response = StudentRecoveryRequestView.as_view()(request)
        self.assertEqual(response.status_code, 202)
        self.assertIn('Si los datos', response.data['detail'])
        self.assertIn('request', service.call_args.kwargs)

    def test_budget_enforces_origin_and_account_without_raw_identifiers(self):
        states = [SimpleNamespace(blocked_until=None, window_started_at=None, failed_attempts=0, save=Mock()) for _ in range(2)]
        # Exercise the original helper, bypassing only the setUp mock.
        with patch.object(auth, '_locked_state', side_effect=states) as locked:
            self.assertTrue(ORIGINAL_BUDGET(ru=' ru1 ', request=self.request, stage='request'))
        self.assertEqual([s.failed_attempts for s in states], [1, 1])
        for call in locked.call_args_list:
            self.assertEqual(len(call.args[1]), 64)
        states[0].blocked_until = timezone.now() + timedelta(minutes=1)
        with patch.object(auth, '_locked_state', side_effect=states):
            self.assertFalse(ORIGINAL_BUDGET(ru='RU1', request=self.request, stage='request'))


ORIGINAL_BUDGET = auth._code_budget

if __name__ == '__main__':
    import unittest

    with patch('django.db.backends.base.base.BaseDatabaseWrapper.ensure_connection',
               side_effect=AssertionError('Database access forbidden in unit tests')):
        unittest.main()
