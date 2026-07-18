from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.postulantes.views import AsignacionPostulacionViewSet


router = DefaultRouter()
router.register(r"", AsignacionPostulacionViewSet, basename="asignaciones")

urlpatterns = [
    path("", include(router.urls)),
]
