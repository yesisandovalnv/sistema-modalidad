class UsuarioService:
    @staticmethod
    def get_dashboard_data():
        return {
            "status": "ready",
            "module": "usuarios",
        }


class UserCapabilitiesService:
    """Construye capacidades informativas; no sustituye permisos de API."""

    STUDENT_CODES = {"EST", "ESTUDIANTE"}
    TEACHER_CODES = {"DOC", "DOCENTE"}
    ADMIN_CODES = {"ADM", "ADMIN", "ADMINISTRACION", "ADMINISTRADOR"}
    NAMES = (
        "puede_ver_dashboard",
        "puede_ver_reportes",
        "puede_exportar_reportes",
        "puede_ver_notificaciones",
        "puede_gestionar_postulaciones",
        "puede_gestionar_documentos",
        "puede_gestionar_asignaciones",
        "puede_gestionar_defensas",
        "puede_gestionar_evaluaciones",
        "puede_gestionar_cierre",
    )

    @classmethod
    def resolve(cls, user):
        code = (getattr(getattr(user, "role", None), "codigo", "") or "").strip().upper()
        is_admin = bool(user.is_staff or user.is_superuser or code in cls.ADMIN_CODES)
        is_student = code in cls.STUDENT_CODES
        values = {name: False for name in cls.NAMES}
        values["puede_ver_notificaciones"] = True
        if is_admin:
            values = {name: True for name in cls.NAMES}
            values["puede_exportar_reportes"] = bool(user.is_staff or user.is_superuser)
            return values
        if not is_student:
            values.update(
                puede_ver_dashboard=True,
                puede_ver_reportes=True,
                puede_gestionar_postulaciones=True,
                puede_gestionar_documentos=True,
                puede_gestionar_asignaciones=True,
                puede_gestionar_defensas=True,
                puede_gestionar_evaluaciones=True,
            )
        return values
