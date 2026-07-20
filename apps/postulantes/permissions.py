from rest_framework.permissions import BasePermission, SAFE_METHODS

from core.permissions import is_staff_user


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
