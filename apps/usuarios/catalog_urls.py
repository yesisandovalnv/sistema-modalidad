from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.usuarios.views import StudentOptionViewSet


router = DefaultRouter()
router.register("estudiantes", StudentOptionViewSet, basename="student-options")

urlpatterns = [path("", include(router.urls))]
