from django.urls import path
from apps.reportes.views import DashboardView,PostulacionesReportView,ExportView,ResultadosAcademicosReportView
urlpatterns=[path("dashboard/",DashboardView.as_view(),name="report-dashboard"),path("postulaciones/",PostulacionesReportView.as_view(),name="report-postulaciones"),path("postulaciones/exportar/",ExportView.as_view(),name="report-export"),path("resultados/",ResultadosAcademicosReportView.as_view(),name="report-resultados")]
