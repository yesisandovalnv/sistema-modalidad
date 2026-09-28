import os

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.academico.models import Modalidad, ModalidadRequisito, Periodo
from apps.documentos.models import (
    ConfirmacionCorreccionDocumento,
    DocumentoPostulacion,
    ObservacionDocumento,
    TipoDocumento,
    VersionDocumento,
)
from apps.modalidades.models import DiplomadoDefensa, DiplomadoModulo, ExcelenciaExpediente, ExamenArea, TrabajoDirigidoExpediente
from apps.notificaciones.models import Notificacion
from apps.postulantes.models import (
    AsignacionPostulacion,
    CondicionPostulacion,
    DictamenRevisionDocumento,
    EntregaFisica,
    EventoDefensa,
    EvaluacionDefensa,
    InformeRevisionTribunalPrevia,
    ParticipanteEvento,
    Postulacion,
    SeguimientoEtapa,
)

OFFICIAL_MODALIDAD_CODES = [
    "PROYECTO_GRADO",
    "TRABAJO_DIRIGIDO",
    "TESIS_GRADO",
    "GRADUACION_VIA_DIPLOMADO",
    "EXCELENCIA_ACADEMICA",
    "EXAMEN_GRADO",
]


class Command(BaseCommand):
    help = (
        "Borra únicamente datos transaccionales de prueba en desarrollo/test, "
        "conservando modalidades, requisitos oficiales, catálogos y configuración."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Solo reporta conteos sin borrar nada.")
        parser.add_argument("--confirm", action="store_true", help="Requiere confirmación explícita para borrar datos transaccionales.")

    def handle(self, *args, **options):
        env_name = (os.getenv("DJANGO_ENV") or "").strip().lower()
        if env_name == "production" or (not settings.DEBUG and env_name not in {"development", "test", "testing"}):
            raise CommandError("reset_test_data solo puede ejecutarse en entornos de desarrollo o test.")

        dry_run = bool(options.get("dry_run"))
        confirm = bool(options.get("confirm"))

        if dry_run:
            counts = self._collect_counts()
            self._print_counts("before dry-run", counts)
            self.stdout.write(self.style.WARNING("--dry-run: no se modificó ninguna fila ni archivo."))
            return

        if not confirm:
            raise CommandError("Este comando borra datos transaccionales. Reejecútalo con --confirm para confirmar o con --dry-run para previsualizar.")

        before = self._collect_counts()
        self._print_counts("before reset", before)

        with transaction.atomic():
            postulacion_ids = list(Postulacion.objects.values_list("pk", flat=True))
            deleted_count = self._delete_transactional_data(postulacion_ids)

        after = self._collect_counts()
        self._print_counts("after reset", after)
        self.stdout.write(
            self.style.SUCCESS(
                f"Reset completado. Se eliminaron {deleted_count} postulaciones y dependencias transaccionales asociadas."
            )
        )
        self._assert_master_data_preserved(after)

    def _delete_transactional_data(self, postulacion_ids):
        if not postulacion_ids:
            return 0

        # Los modelos con FK directa a Postulacion y CASCADE desaparecen con la postulación
        # cuando se borra la fila padre. Las referencias PROTECT deben eliminase antes.
        Notificacion.objects.filter(postulacion__in=postulacion_ids).delete()
        CondicionPostulacion.objects.filter(postulacion__in=postulacion_ids).delete()
        EntregaFisica.objects.filter(postulacion__in=postulacion_ids).delete()
        ExamenArea.objects.filter(postulacion__in=postulacion_ids).delete()
        DiplomadoModulo.objects.filter(postulacion__in=postulacion_ids).delete()
        DiplomadoDefensa.objects.filter(postulacion__in=postulacion_ids).delete()
        ExcelenciaExpediente.objects.filter(postulacion__in=postulacion_ids).delete()
        TrabajoDirigidoExpediente.objects.filter(postulacion__in=postulacion_ids).delete()

        ConfirmacionCorreccionDocumento.objects.filter(postulacion__in=postulacion_ids).delete()
        DictamenRevisionDocumento.objects.filter(seguimiento_etapa__postulacion__in=postulacion_ids).delete()
        InformeRevisionTribunalPrevia.objects.filter(seguimiento_etapa__postulacion__in=postulacion_ids).delete()

        ObservacionDocumento.objects.filter(version_documento__documento__postulacion__in=postulacion_ids).delete()
        VersionDocumento.objects.filter(documento__postulacion__in=postulacion_ids).delete()
        DocumentoPostulacion.objects.filter(postulacion__in=postulacion_ids).delete()

        ParticipanteEvento.objects.filter(evento__postulacion__in=postulacion_ids).delete()
        EvaluacionDefensa.objects.filter(evento__postulacion__in=postulacion_ids).delete()
        EventoDefensa.objects.filter(postulacion__in=postulacion_ids).delete()

        AsignacionPostulacion.objects.filter(postulacion__in=postulacion_ids).delete()
        SeguimientoEtapa.objects.filter(postulacion__in=postulacion_ids).delete()

        deleted_count, _ = Postulacion.objects.filter(pk__in=postulacion_ids).delete()
        return deleted_count

    def _collect_counts(self):
        return {
            "postulaciones": Postulacion.objects.count(),
            "seguimientos_etapa": SeguimientoEtapa.objects.count(),
            "asignaciones": AsignacionPostulacion.objects.count(),
            "eventos_defensa": EventoDefensa.objects.count(),
            "documentos_postulacion": DocumentoPostulacion.objects.count(),
            "versiones_documentos": VersionDocumento.objects.count(),
            "notificaciones": Notificacion.objects.count(),
            "modalidades": {
                "total": Modalidad.objects.count(),
                "codigos": list(Modalidad.objects.filter(codigo__in=OFFICIAL_MODALIDAD_CODES).order_by("codigo").values_list("codigo", flat=True)),
            },
            "periodos": Periodo.objects.count(),
            "tipo_documento": TipoDocumento.objects.count(),
            "requisitos": ModalidadRequisito.objects.count(),
        }

    def _print_counts(self, label, counts):
        self.stdout.write(self.style.HTTP_INFO(f"--- {label} ---"))
        self.stdout.write(f"Postulaciones: {counts['postulaciones']}")
        self.stdout.write(f"Seguimientos etapa: {counts['seguimientos_etapa']}")
        self.stdout.write(f"Asignaciones: {counts['asignaciones']}")
        self.stdout.write(f"Eventos defensa: {counts['eventos_defensa']}")
        self.stdout.write(f"Documentos de postulación: {counts['documentos_postulacion']}")
        self.stdout.write(f"Versiones de documento: {counts['versiones_documentos']}")
        self.stdout.write(f"Notificaciones: {counts['notificaciones']}")
        self.stdout.write(f"Períodos: {counts['periodos']}")
        self.stdout.write(f"Tipos de documento: {counts['tipo_documento']}")
        self.stdout.write(f"Relaciones modalidad-requisito: {counts['requisitos']}")
        self.stdout.write(f"Modalidades oficiales conservadas: {counts['modalidades']['codigos']}")

    def _assert_master_data_preserved(self, counts):
        expected = set(OFFICIAL_MODALIDAD_CODES)
        actual = set(counts["modalidades"]["codigos"])
        if actual != expected:
            raise CommandError(f"Las 6 modalidades oficiales no se conservaron. Esperadas: {sorted(expected)}; obtenidas: {sorted(actual)}")
        if counts["periodos"] <= 0:
            raise CommandError("Los períodos no se conservaron durante el reset.")
        if counts["tipo_documento"] <= 0:
            raise CommandError("Los tipos de documento no se conservaron durante el reset.")
        if counts["requisitos"] <= 0:
            raise CommandError("Las relaciones modalidad-requisito no se conservaron durante el reset.")

        if counts["modalidades"]["total"] < 6:
            raise CommandError("El número de modalidades del sistema se redujo por debajo de las 6 oficiales.")
