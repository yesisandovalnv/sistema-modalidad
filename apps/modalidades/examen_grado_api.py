from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.modalidades.examen_grado_service import ExamenGradoService
from apps.postulantes.models import Postulacion
from apps.postulantes.permissions import get_postulacion_in_scope
from core.permissions import is_staff_user


class ExamenGradoOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def _postulacion(self, request, pk):
        postulacion = get_postulacion_in_scope(
            Postulacion.objects.select_related("modalidad", "estudiante"), request.user, pk
        )
        if not postulacion:
            raise ValidationError("La postulación no existe.")
        if (not is_staff_user(request.user) and postulacion.estudiante_id != request.user.id
                and not postulacion.asignaciones.filter(usuario=request.user).exists()):
            raise PermissionDenied("No tiene permisos para consultar este Examen.")
        return postulacion

    def get(self, request, pk):
        try:
            return Response(ExamenGradoService.overview(self._postulacion(request, pk)))
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)

    def post(self, request, pk, area=None):
        if not is_staff_user(request.user):
            raise PermissionDenied("Solo un usuario administrativo puede registrar evaluaciones.")
        try:
            postulacion = self._postulacion(request, pk)
            if area is None:
                stage = ExamenGradoService.concluir(postulacion, request.user)
                return Response({"etapa": stage.etapa.codigo, "estado": stage.estado}, status=200)
            evaluation = ExamenGradoService.registrar_evaluacion(postulacion, area, request.data.get("nota"), request.user, request.data.get("observaciones", ""), request.data.get("evaluador"), request.data.get("modalidad_registro", "INDIVIDUAL"))
        except (DjangoValidationError, TypeError, ValueError) as exc:
            raise ValidationError(exc.message_dict if hasattr(exc, "message_dict") else getattr(exc, "messages", str(exc)))
        return Response({"id": evaluation.id, "area": evaluation.area.codigo, "intento": evaluation.intento, "nota": str(evaluation.nota), "resultado": evaluation.resultado}, status=201)

