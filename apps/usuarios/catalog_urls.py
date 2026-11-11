from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.usuarios.views import (
    AssignmentCandidateViewSet,
    RoleAdminViewSet,
    StudentImportConfirmView,
    StudentImportTemplateView,
    StudentImportValidateView,
    StudentOptionViewSet,
    UserAdminViewSet,
)


router = DefaultRouter()
router.register("estudiantes", StudentOptionViewSet, basename="student-options")
router.register("candidatos-asignacion", AssignmentCandidateViewSet, basename="assignment-candidates")
router.register("administracion", UserAdminViewSet, basename="user-admin")
router.register("roles", RoleAdminViewSet, basename="role-admin")

urlpatterns = [
    path("importar-estudiantes/plantilla/", StudentImportTemplateView.as_view(), name="student-import-template"),
    path("importar-estudiantes/validar/", StudentImportValidateView.as_view(), name="student-import-validate"),
    path("importar-estudiantes/confirmar/", StudentImportConfirmView.as_view(), name="student-import-confirm"),
    path("", include(router.urls)),
]
