from rest_framework.permissions import BasePermission, SAFE_METHODS

ADMIN_ROLE_CODE = "ADMINISTRADOR"
TEACHER_ROLE_CODE = "DOCENTE"
STUDENT_ROLE_CODE = "ESTUDIANTE"
KNOWN_ROLE_CODES = {ADMIN_ROLE_CODE, TEACHER_ROLE_CODE, STUDENT_ROLE_CODE}


def get_role_code(user) -> str:
    return (getattr(getattr(user, "role", None), "codigo", "") or "").strip().upper()


def is_admin_role(user) -> bool:
    return get_role_code(user) == ADMIN_ROLE_CODE


def is_teacher_user(user) -> bool:
    return get_role_code(user) == TEACHER_ROLE_CODE


def is_student_user(user) -> bool:
    return get_role_code(user) == STUDENT_ROLE_CODE


class IsActiveUser(BasePermission):
    """Permiso base para restringir el acceso a usuarios activos."""

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and getattr(request.user, "is_active", False))


class IsOwnerOrAdmin(BasePermission):
    """Permiso base para permitir acceso al propietario o a un administrador."""

    def has_object_permission(self, request, view, obj) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if is_staff_user(request.user):
            return True
        return getattr(obj, "user_id", None) == getattr(request.user, "id", None)


def is_staff_user(user) -> bool:
    """Require both the ADMINISTRADOR role and a Django authority flag."""

    return bool(
        user
        and getattr(user, "is_authenticated", False)
        and is_admin_role(user)
        and (getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))
    )


class IsStaffOrReadOnly(BasePermission):
    """Permite lectura autenticada y reserva escrituras ordinarias a Staff."""

    message = "No tiene permiso para modificar este recurso."

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        return request.method in SAFE_METHODS or is_staff_user(request.user)


class IsStaff(BasePermission):
    """Permiso explícito para operaciones administrativas institucionales."""

    message = "Esta operación requiere permisos administrativos."

    def has_permission(self, request, view) -> bool:
        return is_staff_user(request.user)
