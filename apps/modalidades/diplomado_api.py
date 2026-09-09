from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.modalidades.diplomado_service import DiplomadoService
from apps.postulantes.models import Postulacion
from apps.postulantes.permissions import get_postulacion_in_scope
from core.permissions import is_staff_user


class DiplomadoOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def _postulacion(self, request, pk):
        item = get_postulacion_in_scope(
            Postulacion.objects.select_related("modalidad", "estudiante"), request.user, pk
        )
        if not item:
            raise ValidationError("La postulación no existe.")
        if (not is_staff_user(request.user) and item.estudiante_id != request.user.id
                and not item.asignaciones.filter(usuario=request.user).exists()):
            raise PermissionDenied("No tiene permisos para consultar este Diplomado.")
        return item

    def get(self, request, pk):
        return Response(DiplomadoService.overview(self._postulacion(request, pk)))

    def post(self, request, pk, action=None):
        if not is_staff_user(request.user):
            raise PermissionDenied("Solo un usuario administrativo puede operar Diplomado.")
        try:
            item = self._postulacion(request, pk)
            if action == "modulo":
                result = DiplomadoService.set_module_result(item, request.data.get("modulo"), request.data.get("nota"), request.user, request.data.get("observaciones", ""))
                return Response({"modulo": result.orden, "estado": result.estado, "nota": result.nota}, status=201)
            if action == "concluir":
                stage = DiplomadoService.conclude(item, request.user)
                return Response({"etapa": stage.etapa.codigo, "estado": stage.estado})
            raise ValidationError("La operación de Diplomado no existe.")
        except (DjangoValidationError, TypeError, ValueError) as exc:
            raise ValidationError(exc.message_dict if hasattr(exc, "message_dict") else getattr(exc, "messages", str(exc)))
