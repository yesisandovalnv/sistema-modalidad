from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.usuarios.views import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    LogoutView,
    MeView,
    StudentActivationConfirmView,
    StudentActivationRequestView,
    StudentOptionViewSet,
    StudentRecoveryConfirmView,
    StudentRecoveryRequestView,
    StudentTokenObtainPairView,
)

router = DefaultRouter()
# Alias heredado. El recurso canónico vive bajo /api/v1/usuarios/.
router.register('estudiantes', StudentOptionViewSet, basename='legacy-student-options')

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('student-login/', StudentTokenObtainPairView.as_view(), name='auth_student_login'),
    path('student-activation/request/', StudentActivationRequestView.as_view(), name='auth_student_activation_request'),
    path('student-activation/confirm/', StudentActivationConfirmView.as_view(), name='auth_student_activation_confirm'),
    path('student-recovery/request/', StudentRecoveryRequestView.as_view(), name='auth_student_recovery_request'),
    path('student-recovery/confirm/', StudentRecoveryConfirmView.as_view(), name='auth_student_recovery_confirm'),
    path('refresh/', CustomTokenRefreshView.as_view(), name='auth_refresh'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('me/', MeView.as_view(), name='auth_me'),
    path('', include(router.urls)),
]
