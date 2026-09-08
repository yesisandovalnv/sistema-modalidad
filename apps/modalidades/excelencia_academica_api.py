from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.modalidades.excelencia_academica_service import ExcelenciaAcademicaService
from apps.postulantes.models import Postulacion
from core.permissions import is_staff_user


class ExcelenciaAcademicaOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def _postulacion(self, request, pk):
        postulacion = Postulacion.objects.filter(pk=pk).select_related("modalidad", "estudiante").first()
        if not postulacion:
            raise ValidationError("La postulación no existe.")
        if not is_staff_user(request.user) and postulacion.estudiante_id != request.user.id:
            raise PermissionDenied("No tiene permisos para consultar esta Excelencia Académica.")
        return postulacion

    def get(self, request, pk):
        try:
            return Response(ExcelenciaAcademicaService.overview(self._postulacion(request, pk)))
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)

    def post(self, request, pk, action=None):
        if not is_staff_user(request.user):
            raise PermissionDenied("Solo un usuario administrativo puede operar Excelencia Académica.")
        try:
            postulacion = self._postulacion(request, pk)
            if action == "configurar":
                result = ExcelenciaAcademicaService.configurar_criterio(postulacion, request.data.get("criterio"))
                return Response({"criterio": result.criterio}, status=201)
            if action == "evaluar":
                result = ExcelenciaAcademicaService.registrar_evaluacion(
                    postulacion, request.user, request.data.get("resultado"),
                    request.data.get("promedio_general"), request.data.get("observaciones", ""),
                )
                return Response({"criterio": result.criterio, "resultado": result.resultado, "promedio_general": result.promedio_general}, status=201)
            if action == "concluir":
                stage = ExcelenciaAcademicaService.concluir(postulacion, request.user)
                return Response({"etapa": stage.etapa.codigo, "estado": stage.estado})
            raise ValidationError("La operación de Excelencia Académica no existe.")
        except (DjangoValidationError, TypeError, ValueError) as exc:
            raise ValidationError(exc.message_dict if hasattr(exc, "message_dict") else getattr(exc, "messages", str(exc)))