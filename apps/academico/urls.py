from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.academico.views import (
    ModalidadRequisitoViewSet,
    ModalidadViewSet,
    PeriodoViewSet,
    RequisitoViewSet,
)

router = DefaultRouter()
router.register(r"periodos", PeriodoViewSet, basename="periodos")
router.register(r"modalidades", ModalidadViewSet, basename="modalidades")
router.register(r"requisitos", RequisitoViewSet, basename="requisitos")
router.register(r"modalidad-requisitos", ModalidadRequisitoViewSet, basename="modalidad-requisitos")

urlpatterns = [
    path("", include(router.urls)),
]
