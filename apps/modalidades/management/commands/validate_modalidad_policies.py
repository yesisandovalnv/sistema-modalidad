from django.core.management.base import BaseCommand, CommandError
from apps.modalidades.validators import ModalidadConfigurationValidator


class Command(BaseCommand):
    help = "Valida las policies de modalidad sin modificar la base de datos."
    def handle(self, *args, **options):
        invalid = False
        for result in ModalidadConfigurationValidator.validate_all():
            for warning in result.advertencias: self.stdout.write(self.style.WARNING(f"[{result.codigo}] ADVERTENCIA: {warning}"))
            for error in result.errores:
                invalid = True
                self.stderr.write(self.style.ERROR(f"[{result.codigo}] ERROR: {error}"))
        if invalid: raise CommandError("La configuración de modalidades contiene errores.")
        self.stdout.write(self.style.SUCCESS("Configuración de modalidades válida."))

