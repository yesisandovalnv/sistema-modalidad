from typing import Any

from rest_framework.response import Response


def success_response(message: str, data: Any = None, status: int = 200) -> Response:
    """Devuelve una respuesta estándar exitosa para la API."""
    return Response(
        {
            "success": True,
            "message": message,
            "data": data or {},
        },
        status=status,
    )


def error_response(message: str, data: Any = None, status: int = 400) -> Response:
    """Devuelve una respuesta estándar de error para la API."""
    return Response(
        {
            "success": False,
            "message": message,
            "data": data or {},
        },
        status=status,
    )
