from rest_framework import serializers


class SeguimientoSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
