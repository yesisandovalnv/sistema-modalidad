from rest_framework.permissions import BasePermission, SAFE_METHODS
from core.permissions import is_staff_user


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.method in SAFE_METHODS or is_staff_user(request.user)
