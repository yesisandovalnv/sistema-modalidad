from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import serializers
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema


class HealthCheckSerializer(serializers.Serializer):
    status = serializers.CharField()
    database = serializers.CharField()


class HealthCheckView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)

    @extend_schema(responses=HealthCheckSerializer, description='Comprueba el proceso y una consulta mínima a la base de datos.')
    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
        return Response({'status': 'ok', 'database': 'ok'})
