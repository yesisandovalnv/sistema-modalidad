class UsuarioService:
    @staticmethod
    def get_dashboard_data():
        return {
            "status": "ready",
            "module": "usuarios",
        }


class UserCapabilitiesService:
    """Construye capacidades informativas; no sustituye permisos de API."""

    STUDENT_CODES = {"ESTUDIANTE"}
    TEACHER_CODES = {"DOCENTE"}
    ADMIN_CODES = {"ADMINISTRADOR"}
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
        "puede_ver_postulaciones",
        "puede_ver_documentos",
        "puede_cargar_documentos",
        "puede_ver_seguimiento",
        "puede_gestionar_seguimiento",
        "puede_gestionar_catalogos",
        "puede_gestionar_usuarios",
        "puede_ver_configuracion",
    )

    @classmethod
    def resolve(cls, user):
        from core.permissions import is_staff_user

        code = (getattr(getattr(user, "role", None), "codigo", "") or "").strip().upper()
        is_admin = is_staff_user(user)
        is_student = code in cls.STUDENT_CODES
        is_teacher = code in cls.TEACHER_CODES
        values = {name: False for name in cls.NAMES}
        if code in cls.ADMIN_CODES | cls.TEACHER_CODES | cls.STUDENT_CODES:
            values["puede_ver_notificaciones"] = True
            values.update(
                puede_ver_postulaciones=True,
                puede_ver_documentos=True,
                puede_cargar_documentos=is_student,
                puede_ver_seguimiento=True,
            )
        if is_admin:
            values = {name: True for name in cls.NAMES}
            values["puede_exportar_reportes"] = True
            return values
        if is_teacher:
            values.update(
                puede_ver_dashboard=True,
                puede_ver_reportes=True,
            )
        return values
