from rest_framework.permissions import BasePermission


class IsStaffOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class IsWorkflowAdminOrReadOnlyOwner(BasePermission):
    """Permite lectura autenticada y restringe acciones operativas a administracion."""

    admin_actions = {"iniciar", "observar", "aprobar", "rechazar", "omitir"}

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        action = getattr(view, "action", "")
        if action in self.admin_actions:
            return bool(getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False))
        return True


class IsAssignmentAdminOrRelatedReadOnly(BasePermission):
    """Restringe acciones operativas de asignación a administración."""

    admin_actions = {"asignar", "finalizar", "reemplazar"}

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        action = getattr(view, "action", "")
        if action in self.admin_actions:
            return bool(getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False))
        return True
