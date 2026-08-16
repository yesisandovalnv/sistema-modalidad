from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.usuarios.views import AssignmentCandidateViewSet, RoleAdminViewSet, StudentOptionViewSet, UserAdminViewSet


router = DefaultRouter()
router.register("estudiantes", StudentOptionViewSet, basename="student-options")
router.register("candidatos-asignacion", AssignmentCandidateViewSet, basename="assignment-candidates")
router.register("administracion", UserAdminViewSet, basename="user-admin")
router.register("roles", RoleAdminViewSet, basename="role-admin")

urlpatterns = [path("", include(router.urls))]
