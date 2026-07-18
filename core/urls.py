from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.usuarios.urls')),
    path('api/v1/academico/', include('apps.academico.urls')),
    path('api/v1/postulaciones/', include('apps.postulantes.urls')),
    path('api/v1/asignaciones/', include('apps.postulantes.asignaciones_urls')),
    path('api/v1/seguimientos-etapa/', include('apps.postulantes.workflow_urls')),
    path('api/v1/documentos/', include('apps.documentos.urls')),
    path('api/v1/seguimiento/', include('apps.seguimiento.urls')),
    path('api/v1/reportes/', include('apps.reportes.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
