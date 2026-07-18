from rest_framework.views import exception_handler as drf_exception_handler
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.response import Response


def custom_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    if response is None and isinstance(exc, DjangoValidationError):
        detail = exc.message_dict if hasattr(exc, "message_dict") else exc.messages
        response = Response({"detail": detail, "code": getattr(exc, "code", None) or "validation_error"}, status=400)

    if response is not None and isinstance(response.data, dict):
        response.data['status_code'] = response.status_code

    return response
