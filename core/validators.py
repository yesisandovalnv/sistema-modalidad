import re

from django.core.exceptions import ValidationError


def validate_pdf(value) -> None:
    """Valida que un archivo cargado sea un documento PDF."""
    filename = getattr(value, "name", "")
    if not filename.lower().endswith(".pdf"):
        raise ValidationError("El archivo debe ser un PDF.")


def validate_file_size(value, max_size_mb: int = 5) -> None:
    """Valida que un archivo no supere el tamaño máximo permitido en megabytes."""
    size = getattr(value, "size", None)
    if size is None:
        return

    max_size_bytes = max_size_mb * 1024 * 1024
    if size > max_size_bytes:
        raise ValidationError(f"El archivo no debe superar los {max_size_mb} MB.")


def validate_ci(value) -> None:
    """Valida un número de cédula de identidad de forma genérica."""
    if value in (None, ""):
        return

    text = str(value).strip()
    if not re.fullmatch(r"\d{6,10}", text):
        raise ValidationError("La cédula de identidad debe contener solo números y entre 6 y 10 dígitos.")


def validate_ru(value) -> None:
    """Valida un registro único de forma genérica."""
    if value in (None, ""):
        return

    text = str(value).strip().upper()
    if not re.fullmatch(r"[A-Z0-9]{4,12}", text):
        raise ValidationError("El R.U. debe contener solo letras mayúsculas y números.")
