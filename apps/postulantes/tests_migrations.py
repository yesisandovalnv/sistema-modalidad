import importlib

from django.db import migrations
from django.test import SimpleTestCase

from apps.postulantes.models import DecisionAcademicaEtapa, EvaluacionDefensa, EventoDefensa


class ProyectoGradoDefensaPropuestaMigrationTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.migration = importlib.import_module(
            "apps.postulantes.migrations.0020_proyecto_grado_defensa_propuesta"
        ).Migration

    def test_migration_choices_match_current_models(self):
        event_operation = next(
            operation for operation in self.migration.operations
            if isinstance(operation, migrations.AlterField)
            and operation.model_name == "eventodefensa"
        )
        evaluation_operation = next(
            operation for operation in self.migration.operations
            if isinstance(operation, migrations.AlterField)
            and operation.model_name == "evaluaciondefensa"
        )

        self.assertEqual(
            event_operation.field.choices,
            list(EventoDefensa._meta.get_field("tipo_evento").choices),
        )
        self.assertEqual(
            evaluation_operation.field.choices,
            list(EvaluacionDefensa._meta.get_field("tipo_evaluacion").choices),
        )

    def test_decision_event_link_is_nullable_protected_and_historical_safe(self):
        add_operation = next(
            operation for operation in self.migration.operations
            if isinstance(operation, migrations.AddField)
        )
        model_field = DecisionAcademicaEtapa._meta.get_field("evento_defensa")

        self.assertEqual(add_operation.name, "evento_defensa")
        self.assertTrue(add_operation.field.null)
        self.assertTrue(add_operation.field.blank)
        self.assertTrue(model_field.null)
        self.assertTrue(model_field.blank)
        self.assertEqual(model_field.remote_field.on_delete.__name__, "PROTECT")

    def test_migration_contains_only_reversible_schema_operations(self):
        self.assertTrue(self.migration.dependencies)
        self.assertTrue(all(
            isinstance(operation, (migrations.AddField, migrations.AlterField))
            for operation in self.migration.operations
        ))
