from rest_framework.permissions import BasePermission


class IsActiveUser(BasePermission):
    """Permiso base para restringir el acceso a usuarios activos."""

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and getattr(request.user, "is_active", False))


class IsOwnerOrAdmin(BasePermission):
    """Permiso base para permitir acceso al propietario o a un administrador."""

    def has_object_permission(self, request, view, obj) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(request.user, "is_staff", False):
            return True
        return getattr(obj, "user_id", None) == getattr(request.user, "id", None)
