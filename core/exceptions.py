from rest_framework.exceptions import APIException


class APIError(APIException):
    """Excepción personalizada para reportar errores de negocio o de infraestructura en la API."""

    status_code = 400
    default_detail = "Ocurrió un error inesperado."
    default_code = "error"
