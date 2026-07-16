def get_default_context() -> dict:
    """Devuelve un contexto base para futuras utilidades compartidas."""
    return {}


def normalize_text(value: str) -> str:
    """Normaliza texto para uso futuro en validaciones o transformaciones."""
    return value.strip() if isinstance(value, str) else ""
