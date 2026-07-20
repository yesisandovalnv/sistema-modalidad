from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.postulantes.views import (
    EstadoPostulacionViewSet,
    HistorialEstadoViewSet,
    ObservacionViewSet,
    PostulacionViewSet,
)


router = DefaultRouter()
"""Router principal del módulo de postulaciones."""

router.register(r"observaciones", ObservacionViewSet, basename="observaciones")
router.register(r"estados", EstadoPostulacionViewSet, basename="estados")
router.register(r"historial", HistorialEstadoViewSet, basename="historial")
router.register(r"", PostulacionViewSet, basename="postulaciones")

urlpatterns = [
    path("", include(router.urls)),
]
