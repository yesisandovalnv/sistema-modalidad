class ActiveQuerySetMixin:
    """Filtra automáticamente los registros activos cuando el modelo lo soporte."""

    def get_queryset(self):
        queryset = super().get_queryset()
        if hasattr(queryset.model, "activo"):
            return queryset.filter(activo=True)
        return queryset


class SerializerContextMixin:
    """Agrega el objeto request al contexto del serializer para vistas futuras."""

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context
