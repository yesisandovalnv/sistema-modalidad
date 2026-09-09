from rest_framework.exceptions import NotFound
from rest_framework.permissions import BasePermission, SAFE_METHODS

from core.permissions import is_staff_user, is_student_user, is_teacher_user


def postulaciones_in_scope(queryset, user):
    """Aplica el alcance tecnico vigente del expediente a un queryset."""
    if is_staff_user(user):
        return queryset
    if is_student_user(user):
        return queryset.filter(estudiante=user)
    if is_teacher_user(user):
        return queryset.filter(asignaciones__usuario=user).distinct()
    return queryset.none()


def get_postulacion_in_scope(queryset, user, pk):
    """Obtiene una postulacion visible sin revelar objetos fuera del alcance."""
    postulacion = postulaciones_in_scope(queryset, user).filter(pk=pk).first()
    if not postulacion:
        raise NotFound("La postulacion no existe.")
    return postulacion


class IsStaffOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (
            request.method in SAFE_METHODS or is_staff_user(request.user)
        ))


class IsWorkflowAdminOrReadOnlyOwner(BasePermission):
    """Permite lectura autenticada y restringe acciones operativas a administracion."""

    admin_actions = {"iniciar", "observar", "aprobar", "rechazar", "omitir"}

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        action = getattr(view, "action", "")
        if action in self.admin_actions:
            return is_staff_user(request.user)
        return True


class IsAssignmentAdminOrRelatedReadOnly(BasePermission):
    """Restringe acciones operativas de asignación a administración."""

    admin_actions = {"asignar", "finalizar", "reemplazar"}

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        action = getattr(view, "action", "")
        if action in self.admin_actions:
            return is_staff_user(request.user)
        return True
