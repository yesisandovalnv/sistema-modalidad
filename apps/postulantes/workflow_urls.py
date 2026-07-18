from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.postulantes.views import SeguimientoEtapaViewSet

router = DefaultRouter()
router.register(r"", SeguimientoEtapaViewSet, basename="seguimientos-etapa")

urlpatterns = [
    path("", include(router.urls)),
]
