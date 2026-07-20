from importlib import import_module
from types import SimpleNamespace
from unittest.mock import Mock

from django.test import SimpleTestCase


populate_period_fields = import_module(
    "apps.academico.migrations.0004_periodo_gestion_semestre"
).populate_period_fields


class PeriodoBackfillTests(SimpleTestCase):
    def _migration_apps(self, rows):
        manager = Mock()
        manager.order_by.return_value = rows
        periodo_model = SimpleNamespace(objects=manager)
        apps = Mock()
        apps.get_model.return_value = periodo_model
        return apps, manager

    def test_backfill_is_deterministic_and_does_not_use_dates(self):
        apps, manager = self._migration_apps([
            SimpleNamespace(pk=9, nombre="Gestión 2027 - II", fecha_inicio="1999-01-01"),
            SimpleNamespace(pk=3, nombre="Periodo I / 2026", fecha_inicio="2099-12-01"),
        ])

        populate_period_fields(apps, None)

        self.assertEqual(
            [call.kwargs for call in manager.filter.call_args_list],
            [{"pk": 9}, {"pk": 3}],
        )
        self.assertEqual(
            [call.kwargs for call in manager.filter.return_value.update.call_args_list],
            [
                {"gestion": 2027, "semestre": "II"},
                {"gestion": 2026, "semestre": "I"},
            ],
        )

    def test_collision_reports_all_rows_before_any_update(self):
        apps, manager = self._migration_apps([
            SimpleNamespace(pk=1, nombre="2026-I"),
            SimpleNamespace(pk=2, nombre="Gestión 2026 semestre I"),
        ])

        with self.assertRaisesRegex(RuntimeError, r"gestión=2026, semestre=I.*id=1.*id=2"):
            populate_period_fields(apps, None)

        manager.filter.assert_not_called()

    def test_ambiguous_name_reports_diagnostic_before_any_update(self):
        apps, manager = self._migration_apps([
            SimpleNamespace(pk=1, nombre="Periodo sin clasificación"),
            SimpleNamespace(pk=2, nombre="2026-II"),
        ])

        with self.assertRaisesRegex(RuntimeError, r"id=1.*exactamente una gestión"):
            populate_period_fields(apps, None)

        manager.filter.assert_not_called()
