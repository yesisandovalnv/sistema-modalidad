from django.contrib import admin
from django.urls import include, path
from apps.postulantes.defensas_api import PostulacionEventosView, ResultadoFinalView
from apps.postulantes.cierre_api import CierreAccionView, CierreEstadoView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.academico.views import ModalidadViewSet
from apps.modalidades.examen_grado_api import ExamenGradoOverviewView
from apps.modalidades.excelencia_academica_api import ExcelenciaAcademicaOverviewView
from apps.modalidades.diplomado_api import DiplomadoOverviewView
from apps.modalidades.trabajo_dirigido_api import TrabajoDirigidoOverviewView
from core.health import HealthCheckView

urlpatterns = [
    path('api/health/', HealthCheckView.as_view(), name='health-check'),
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.usuarios.urls')),
    path('api/v1/usuarios/', include('apps.usuarios.catalog_urls')),
    path('api/v1/academico/', include('apps.academico.urls')),
    path('api/v1/modalidades/<int:pk>/capacidades/', ModalidadViewSet.as_view({'get': 'capacidades'}), name='modalidad-capacidades'),
    path('api/v1/notificaciones/', include('apps.notificaciones.urls')),
    path('api/v1/postulaciones/', include('apps.postulantes.urls')),
    path('api/v1/asignaciones/', include('apps.postulantes.asignaciones_urls')),
    path('api/v1/seguimientos-etapa/', include('apps.postulantes.workflow_urls')),
    path('api/v1/eventos-defensa/', include('apps.postulantes.defensas_urls')),
    path('api/v1/gestion-complementaria/', include('apps.postulantes.complementarios_urls')),
    path('api/v1/postulaciones/<int:pk>/eventos-defensa/', PostulacionEventosView.as_view()),
    path('api/v1/postulaciones/<int:pk>/eventos-defensa/programar/', PostulacionEventosView.as_view()),
    path('api/v1/postulaciones/<int:pk>/resultado-final/', ResultadoFinalView.as_view()),
    path('api/v1/postulaciones/<int:pk>/resultado-final/calcular/', ResultadoFinalView.as_view()),
    path('api/v1/postulaciones/<int:pk>/cierre/', CierreEstadoView.as_view()),
    path('api/v1/postulaciones/<int:pk>/cierre/<str:action>/', CierreAccionView.as_view()),
    path('api/v1/postulaciones/<int:pk>/examen/', ExamenGradoOverviewView.as_view()),
    path('api/v1/postulaciones/<int:pk>/examen/areas/<str:area>/evaluar/', ExamenGradoOverviewView.as_view()),
    path('api/v1/postulaciones/<int:pk>/examen/concluir/', ExamenGradoOverviewView.as_view()),
    path('api/v1/postulaciones/<int:pk>/excelencia/', ExcelenciaAcademicaOverviewView.as_view()),
    path('api/v1/postulaciones/<int:pk>/excelencia/configurar/', ExcelenciaAcademicaOverviewView.as_view(), {'action': 'configurar'}),
    path('api/v1/postulaciones/<int:pk>/excelencia/evaluar/', ExcelenciaAcademicaOverviewView.as_view(), {'action': 'evaluar'}),
    path('api/v1/postulaciones/<int:pk>/excelencia/concluir/', ExcelenciaAcademicaOverviewView.as_view(), {'action': 'concluir'}),
    path('api/v1/postulaciones/<int:pk>/diplomado/', DiplomadoOverviewView.as_view()),
    path('api/v1/postulaciones/<int:pk>/diplomado/modulo/', DiplomadoOverviewView.as_view(), {'action': 'modulo'}),
    path('api/v1/postulaciones/<int:pk>/diplomado/concluir/', DiplomadoOverviewView.as_view(), {'action': 'concluir'}),
    path('api/v1/postulaciones/<int:pk>/trabajo-dirigido/', TrabajoDirigidoOverviewView.as_view()),
    path('api/v1/postulaciones/<int:pk>/trabajo-dirigido/institucion/', TrabajoDirigidoOverviewView.as_view(), {'action': 'institucion'}),
    path('api/v1/postulaciones/<int:pk>/trabajo-dirigido/informes/', TrabajoDirigidoOverviewView.as_view(), {'action': 'informe'}),
    path('api/v1/postulaciones/<int:pk>/trabajo-dirigido/concluir/', TrabajoDirigidoOverviewView.as_view(), {'action': 'concluir'}),
    path('api/v1/documentos/', include('apps.documentos.urls')),
    path('api/v1/reportes/', include('apps.reportes.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
