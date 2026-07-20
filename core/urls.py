from django.contrib import admin
from django.urls import include, path
from apps.postulantes.defensas_api import PostulacionEventosView, ResultadoFinalView
from apps.postulantes.cierre_api import CierreAccionView, CierreEstadoView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.academico.views import ModalidadViewSet
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
    path('api/v1/documentos/', include('apps.documentos.urls')),
    path('api/v1/seguimiento/', include('apps.seguimiento.urls')),
    path('api/v1/reportes/', include('apps.reportes.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
