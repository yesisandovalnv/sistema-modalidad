from django.urls import include,path
from rest_framework.routers import DefaultRouter
from apps.postulantes.defensas_api import EventoDefensaViewSet
router=DefaultRouter(); router.register("",EventoDefensaViewSet,basename="eventos-defensa")
urlpatterns=[path("",include(router.urls))]
