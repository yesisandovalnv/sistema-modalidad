from django.db import IntegrityError, transaction
from django.test import TestCase

from apps.usuarios.models import CustomUser


class NormalizedIdentifierConstraintTests(TestCase):
    def test_database_rejects_ru_case_and_outer_space_variants(self):
        CustomUser.objects.create_user(
            username="ru-constraint-first", password="x", ru="RU-9001", ci="009001"
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                CustomUser.objects.create_user(
                    username="ru-constraint-second", password="x", ru=" ru-9001 ", ci="009002"
                )

    def test_database_rejects_ci_outer_space_variants(self):
        CustomUser.objects.create_user(
            username="ci-constraint-first", password="x", ru="CI-RU-1", ci="00009001"
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                CustomUser.objects.create_user(
                    username="ci-constraint-second", password="x", ru="CI-RU-2", ci=" 00009001 "
                )

    def test_database_rejects_whitespace_only_identifiers_but_allows_multiple_nulls(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                CustomUser.objects.create_user(
                    username="blank-ru", password="x", ru="   ", ci="BLANK-RU-CI"
                )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                CustomUser.objects.create_user(
                    username="blank-ci", password="x", ru="BLANK-CI-RU", ci=" \t "
                )

        first = CustomUser.objects.create_user(username="null-identifiers-1", password="x")
        second = CustomUser.objects.create_user(username="null-identifiers-2", password="x")
        self.assertIsNone(first.ru)
        self.assertIsNone(first.ci)
        self.assertIsNone(second.ru)
        self.assertIsNone(second.ci)
