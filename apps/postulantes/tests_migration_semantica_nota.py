from importlib import import_module
from types import SimpleNamespace
from unittest.mock import Mock

from django.test import SimpleTestCase


mark_project_legacy_scores = import_module(
    "apps.postulantes.migrations.0016_evaluaciondefensa_semantica_nota"
).mark_project_legacy_scores


class SemanticaNotaMigrationTests(SimpleTestCase):
    def test_backfill_only_updates_the_explicit_semantics_marker(self):
        manager = Mock()
        project_rows = Mock()
        source_rows = Mock()
        consolidated_rows = Mock()
        project_rows.filter.side_effect = [source_rows, consolidated_rows]
        manager.using.return_value = manager
        manager.filter.return_value = project_rows
        apps = SimpleNamespace(
            get_model=Mock(return_value=SimpleNamespace(objects=manager)),
        )
        schema_editor = SimpleNamespace(connection=SimpleNamespace(alias="default"))

        mark_project_legacy_scores(apps, schema_editor)

        manager.filter.assert_called_once_with(
            evento__postulacion__modalidad__codigo="PROYECTO_GRADO",
        )
        self.assertEqual(
            project_rows.filter.call_args_list,
            [
                (( ), {"tipo_evaluacion__in": ("PRIVADA", "PUBLICA")}),
                (( ), {"tipo_evaluacion": "RESULTADO_FINAL", "evento__tipo_evento__in": ("DEFENSA_PRIVADA", "DEFENSA_PUBLICA")}),
            ],
        )
        source_rows.update.assert_called_once_with(semantica_nota="LEGACY_PONDERADA")
        consolidated_rows.update.assert_called_once_with(semantica_nota="LEGACY_PONDERADA")