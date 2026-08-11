from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.usuarios.views import AssignmentCandidateViewSet, StudentOptionViewSet


router = DefaultRouter()
router.register("estudiantes", StudentOptionViewSet, basename="student-options")
router.register("candidatos-asignacion", AssignmentCandidateViewSet, basename="assignment-candidates")

urlpatterns = [path("", include(router.urls))]
