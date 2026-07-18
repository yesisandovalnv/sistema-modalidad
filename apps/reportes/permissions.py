from rest_framework.permissions import BasePermission


class CanViewInstitutionalReports(BasePermission):
    message="No tiene acceso a reportes institucionales."
    def has_permission(self,request,view):
        if not request.user or not request.user.is_authenticated:return False
        role=getattr(getattr(request.user,"role",None),"codigo","")
        return bool(request.user.is_staff or request.user.is_superuser or role not in {"EST","ESTUDIANTE"})


class CanExportReports(BasePermission):
    message="La exportación institucional requiere permisos administrativos."
    def has_permission(self,request,view): return bool(request.user and request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser))

