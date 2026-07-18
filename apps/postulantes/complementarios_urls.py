from django.urls import include,path
from rest_framework.routers import DefaultRouter
from apps.postulantes.complementarios_api import CondicionViewSet,EntregaFisicaViewSet
router=DefaultRouter(); router.register("condiciones",CondicionViewSet); router.register("entregas-fisicas",EntregaFisicaViewSet)
urlpatterns=[path("",include(router.urls))]
