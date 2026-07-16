from rest_framework import serializers


class ModalidadSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
