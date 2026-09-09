from rest_framework.permissions import BasePermission
from core.permissions import is_staff_user, is_teacher_user


class CanViewInstitutionalReports(BasePermission):
    message="No tiene acceso a reportes institucionales."
    def has_permission(self,request,view):
        if not request.user or not request.user.is_authenticated:return False
        return is_staff_user(request.user) or is_teacher_user(request.user)


class CanExportReports(BasePermission):
    message="La exportación institucional requiere permisos administrativos."
    def has_permission(self,request,view): return is_staff_user(request.user)
