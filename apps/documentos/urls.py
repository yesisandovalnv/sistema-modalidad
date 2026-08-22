"""Rutas de la API REST para el módulo de gestión documental."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.documentos import views

router = DefaultRouter()
router.register(r"estados-documento", views.EstadoDocumentoViewSet, basename="estados-documento")
router.register(r"tipos-documento", views.TipoDocumentoViewSet, basename="tipos-documento")
router.register(r"documentos", views.DocumentoPostulacionViewSet, basename="documentos")
router.register(r"versiones", views.VersionDocumentoViewSet, basename="versiones")
router.register(r"observaciones", views.ObservacionDocumentoViewSet, basename="observaciones")
router.register(r"confirmaciones-correccion", views.ConfirmacionCorreccionDocumentoViewSet, basename="confirmaciones-correccion")

urlpatterns = [
    path("", include(router.urls)),
]
