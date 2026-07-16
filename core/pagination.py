from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """Paginación estándar reutilizable para la API del sistema."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
