from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated


class ReporteViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        return None
