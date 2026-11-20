"""Mocked auth/import review inside lab client; all DB connections forbidden.

These characterize current behavior, including defects; they are NOT E2E tests.
"""
from io import BytesIO
import os
import unittest
from unittest.mock import MagicMock, patch

os.environ['DJANGO_SETTINGS_MODULE'] = 'settings_runner_lab_functional'
os.environ['PYTHON_DOTENV_DISABLED'] = '1'


class ReadOnlyContractReview(unittest.TestCase):
    def test_effective_settings_include_logout_blacklist_dependency(self):
        from django.conf import settings
        from rest_framework_simplejwt.tokens import RefreshToken
        self.assertIn('rest_framework_simplejwt.token_blacklist', settings.INSTALLED_APPS)
        self.assertTrue(hasattr(RefreshToken, 'blacklist'))

    def test_characterizes_smtp_settings_missing_from_effective_package(self):
        import core.settings as effective
        self.assertTrue(effective.__file__.endswith('/core/settings/__init__.py'))
        self.assertFalse(hasattr(effective, 'EMAIL_HOST'))

    def test_characterizes_generic_login_bypass_for_student(self):
        from apps.usuarios.models import CustomUser, Role
        from apps.usuarios.serializers import LoginSerializer
        student = CustomUser(username='synthetic-review', is_active=True,
                             role=Role(codigo='ESTUDIANTE', nombre='Estudiante'))
        with patch('apps.usuarios.serializers.authenticate', return_value=student), \
             patch('apps.usuarios.student_auth.authenticate_student') as student_guard:
            serializer = LoginSerializer(data={'username': student.username, 'password': 'synthetic'})
            self.assertTrue(serializer.is_valid(), serializer.errors)
            self.assertIs(serializer.validated_data['user'], student)
            student_guard.assert_not_called()

    def test_unknown_activation_opens_delivery_before_eligibility(self):
        from apps.usuarios.student_auth import request_student_activation
        delivery = MagicMock()
        with patch('apps.usuarios.student_auth.get_connection', return_value=delivery), \
             patch('apps.usuarios.student_auth._find_student', return_value=None):
            request_student_activation(ru='SYNTHETIC_UNKNOWN', ci='0000')
        delivery.open.assert_called_once()
        delivery.close.assert_called_once()
        delivery.send_messages.assert_not_called()

    def test_existing_password_cannot_request_activation(self):
        from apps.usuarios.student_auth import request_student_activation
        student = MagicMock()
        student.has_usable_password.return_value = True
        delivery = MagicMock()
        with patch('apps.usuarios.student_auth.get_connection', return_value=delivery), \
             patch('apps.usuarios.student_auth._find_student', return_value=student):
            request_student_activation(ru='SYNTHETIC_EXISTING', ci='0000')
        delivery.send_messages.assert_not_called()

    def workbook(self, rows):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from openpyxl import Workbook
        from apps.usuarios.student_import import HEADERS
        workbook = Workbook()
        workbook.active.append(HEADERS)
        for row in rows:
            workbook.active.append(row)
        output = BytesIO()
        workbook.save(output)
        workbook.close()
        return SimpleUploadedFile('synthetic.xlsx', output.getvalue())

    def validate_rows(self, rows):
        from apps.usuarios.student_import import validate_workbook
        # Only existing-record lookups are mocked; real XLSX parser/validation runs.
        with patch('apps.usuarios.student_import._existing_conflicts', return_value={}):
            return validate_workbook(self.workbook(rows))

    def test_xlsx_valid_and_incomplete_rows(self):
        result = self.validate_rows([
            ['Ana', 'Perez', 'Lopez', '0010', 'ru0010', 'ana@example.test', ''],
            ['', 'Perez', 'Lopez', '0011', 'ru0011', '', ''],
        ])
        self.assertEqual((result['valid'], result['rejected']), (1, 1), result['rows'])
        self.assertEqual(result['rows'][0]['ci'], '0010')
        self.assertEqual(result['rows'][0]['ru'], 'RU0010')
        self.assertIn('Nombres es obligatorio.', result['rows'][1]['errors'])

    def test_xlsx_duplicate_ru_and_ci_rejected(self):
        result = self.validate_rows([
            ['Ana', 'Perez', 'Lopez', '0010', 'ru0010', '', ''],
            ['Bea', 'Perez', 'Lopez', '0010', ' RU0010 ', '', ''],
        ])
        self.assertEqual((result['valid'], result['rejected']), (0, 2))
        for row in result['rows']:
            self.assertTrue(any('RU duplicado' in error for error in row['errors']))
            self.assertTrue(any('CI duplicado' in error for error in row['errors']))


if __name__ == '__main__':
    import django
    with patch('psycopg2.connect', side_effect=AssertionError('DATABASE ACCESS FORBIDDEN')), \
         patch('django.db.backends.base.base.BaseDatabaseWrapper.ensure_connection',
               side_effect=AssertionError('DATABASE ACCESS FORBIDDEN')):
        django.setup()
        unittest.main(verbosity=2)
