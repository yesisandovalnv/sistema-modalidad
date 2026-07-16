from rest_framework import serializers


class ReporteSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
