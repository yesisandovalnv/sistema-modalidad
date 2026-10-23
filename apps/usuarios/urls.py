from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.usuarios.views import CustomTokenObtainPairView, CustomTokenRefreshView, LogoutView, MeView, StudentOptionViewSet, StudentTokenObtainPairView

router = DefaultRouter()
# Alias heredado. El recurso canónico vive bajo /api/v1/usuarios/.
router.register('estudiantes', StudentOptionViewSet, basename='legacy-student-options')

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('student-login/', StudentTokenObtainPairView.as_view(), name='auth_student_login'),
    path('refresh/', CustomTokenRefreshView.as_view(), name='auth_refresh'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('me/', MeView.as_view(), name='auth_me'),
    path('', include(router.urls)),
]
