from typing import Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.postulantes.models import EstadoPostulacion, HistorialEstado, Observacion, Postulacion
from apps.usuarios.models import AuditLog, CustomUser
from core.permissions import is_staff_user


class PostulacionService:
    """Servicio de negocio para la gestión de postulaciones.

    Centraliza la lógica de negocio del módulo de postulaciones para
    mantener la capa de vistas y serializadores libre de reglas de
    negocio complejas.
    """

    @staticmethod
    def _registrar_auditoria(
        usuario: CustomUser,
        accion: str,
        modulo: str,
        descripcion: str,
        request: Any = None,
    ) -> AuditLog:
        """Crea un registro de auditoría para una acción del módulo.

        Args:
            usuario: Usuario que ejecuta la acción.
            accion: Código de la acción a registrar.
            modulo: Módulo donde ocurre la acción.
            descripcion: Texto descriptivo de la acción.
            request: Objeto de solicitud preparado para futuras integraciones.

        Returns:
            AuditLog: Instancia creada del registro de auditoría.
        """
        return AuditLog.objects.create(
            usuario=usuario,
            accion=accion,
            modulo=modulo,
            descripcion=descripcion,
        )

    @staticmethod
    def _es_conflicto_postulacion_vigente(error: IntegrityError) -> bool:
        causa = error.__cause__
        diagnostico = getattr(causa, "diag", None)
        return getattr(diagnostico, "constraint_name", None) == (
            "unique_postulacion_vigente_por_estudiante"
        )

    @staticmethod
    def crear_postulacion(*args: Any, **kwargs: Any) -> Postulacion:
        """Crea una nueva postulación con estado inicial y trazabilidad.

        Recibe los datos validados desde un serializer, crea la postulación,
        asigna el estado inicial REGISTRADA, registra el primer cambio en el
        historial y deja un registro de auditoría.
        """
        if not args:
            raise ValueError("Se requieren datos para crear la postulación.")

        datos = args[0]
        usuario = datos.get("usuario")
        estudiante = datos.get("estudiante")
        modalidad = datos.get("modalidad")
        periodo = datos.get("periodo")
        codigo = datos.get("codigo")
        observaciones_generales = datos.get("observaciones_generales")

        if not isinstance(usuario, CustomUser):
            raise ValidationError("El usuario responsable de la creación es obligatorio.")
        if not estudiante or not modalidad or not periodo or not codigo:
            raise ValidationError("Faltan datos obligatorios para crear la postulación.")

        with transaction.atomic():
            estudiante = CustomUser.objects.select_for_update().get(pk=estudiante.pk)
            estado_inicial = EstadoPostulacion.objects.filter(codigo="REGISTRADA").first()
            if not estado_inicial:
                raise ValidationError("No existe el estado inicial REGISTRADA.")

            postulacion_existente = Postulacion.vigentes().filter(estudiante=estudiante).exists()
            if postulacion_existente:
                raise ValidationError("El estudiante ya tiene una postulación vigente.")

            try:
                with transaction.atomic():
                    postulacion = Postulacion.objects.create(
                        codigo=codigo,
                        estudiante=estudiante,
                        modalidad=modalidad,
                        periodo=periodo,
                        observaciones_generales=observaciones_generales,
                        estado_actual=estado_inicial,
                    )
            except IntegrityError as exc:
                if not PostulacionService._es_conflicto_postulacion_vigente(exc):
                    raise
                raise ValidationError(
                    "El estudiante ya tiene una postulación vigente."
                ) from exc

            PostulacionService.registrar_historial(
                {
                    "postulacion": postulacion,
                    "estado_anterior": None,
                    "estado_nuevo": estado_inicial,
                    "usuario": usuario,
                    "comentario": "Postulación creada con estado inicial REGISTRADA.",
                }
            )
            PostulacionService._registrar_auditoria(
                usuario=usuario,
                accion="crear_postulacion",
                modulo="postulaciones",
                descripcion=f"Se creó la postulación {postulacion.codigo} para el estudiante {estudiante}",
            )

            return postulacion

    @staticmethod
    def crear_postulacion_historica(*args: Any, **kwargs: Any) -> Postulacion:
        """Incorpora un proceso concluido sin crear seguimiento operativo."""
        if not args:
            raise ValueError("Se requieren datos para crear la postulación histórica.")

        datos = args[0]
        usuario = datos.get("usuario")
        estudiante = datos.get("estudiante")
        modalidad = datos.get("modalidad")
        periodo = datos.get("periodo")
        codigo = datos.get("codigo")
        observaciones_generales = datos.get("observaciones_generales")

        if not is_staff_user(usuario):
            raise ValidationError("Solo un usuario administrativo puede crear postulaciones históricas.")
        if not estudiante or not modalidad or not periodo or not codigo:
            raise ValidationError("Faltan datos obligatorios para crear la postulación histórica.")

        with transaction.atomic():
            estudiante = CustomUser.objects.select_for_update().get(pk=estudiante.pk)
            estado_final = EstadoPostulacion.objects.filter(codigo="CONCLUIDA").first()
            if not estado_final:
                raise ValidationError("No existe el estado final CONCLUIDA.")
            try:
                historico = Postulacion.objects.create(
                    codigo=codigo,
                    estudiante=estudiante,
                    modalidad=modalidad,
                    periodo=periodo,
                    observaciones_generales=observaciones_generales,
                    estado_actual=estado_final,
                    vigencia=Postulacion.VigenciaChoices.CERRADA,
                    tipo_registro=Postulacion.TipoRegistroChoices.HISTORICO,
                )
            except IntegrityError as exc:
                if not PostulacionService._es_conflicto_postulacion_vigente(exc):
                    raise
                raise ValidationError("El estudiante ya tiene una postulación vigente.") from exc

            PostulacionService.registrar_historial({
                "postulacion": historico,
                "estado_anterior": None,
                "estado_nuevo": estado_final,
                "usuario": usuario,
                "comentario": "Postulación histórica incorporada como proceso concluido.",
            })
            PostulacionService._registrar_auditoria(
                usuario=usuario,
                accion="crear_postulacion_historica",
                modulo="postulaciones",
                descripcion=f"Se incorporó la postulación histórica {historico.codigo} para el estudiante {estudiante}",
            )
            return historico

    @staticmethod
    def dar_de_baja(*args: Any, **kwargs: Any) -> Postulacion:
        """Da de baja una postulación con trazabilidad de dominio completa."""
        if not args:
            raise ValueError("Se requieren datos para dar de baja la postulación.")

        datos = args[0]
        postulacion = datos.get("postulacion")
        motivo_baja = (datos.get("motivo_baja") or "").strip()
        baja_por = datos.get("baja_por")
        fecha_baja = datos.get("fecha_baja")

        if not isinstance(postulacion, Postulacion):
            raise ValidationError("La postulación es obligatoria.")
        if postulacion.vigencia == Postulacion.VigenciaChoices.DADA_DE_BAJA:
            raise ValidationError("La postulación ya se encuentra dada de baja.")
        if not motivo_baja:
            raise ValidationError("El motivo de baja es obligatorio.")
        if not isinstance(baja_por, CustomUser):
            raise ValidationError("El usuario responsable de la baja es obligatorio.")
        if not fecha_baja:
            raise ValidationError("La fecha de baja es obligatoria.")
        if isinstance(fecha_baja, str):
            fecha_baja = parse_datetime(fecha_baja)
        if not fecha_baja:
            raise ValidationError("La fecha de baja no es válida.")
        if timezone.is_naive(fecha_baja):
            fecha_baja = timezone.make_aware(fecha_baja)

        with transaction.atomic():
            postulacion.vigencia = Postulacion.VigenciaChoices.DADA_DE_BAJA
            postulacion.fecha_baja = fecha_baja
            postulacion.motivo_baja = motivo_baja
            postulacion.baja_por = baja_por
            postulacion.save(update_fields=[
                "vigencia",
                "fecha_baja",
                "motivo_baja",
                "baja_por",
                "updated_at",
            ])
            PostulacionService._registrar_auditoria(
                usuario=baja_por,
                accion="dar_de_baja",
                modulo="postulaciones",
                descripcion=(
                    f"Se dio de baja la postulación {postulacion.codigo}. "
                    f"Motivo: {motivo_baja}. Fecha de baja: {fecha_baja.isoformat()}."
                ),
            )

        return postulacion

    @staticmethod
    def cambiar_estado(*args: Any, **kwargs: Any) -> Postulacion:
        """Cambia el estado actual de una postulación y registra el cambio.

        Recibe la postulación, el nuevo estado, el usuario que realiza la
        acción y un comentario opcional. Valida que el cambio sea distinto
        al estado actual, actualiza la postulación y deja trazabilidad.
        """
        if not args:
            raise ValueError("Se requieren datos para cambiar el estado de la postulación.")

        datos = args[0]
        postulacion = datos.get("postulacion")
        nuevo_estado = datos.get("nuevo_estado")
        usuario = datos.get("usuario")
        comentario = datos.get("comentario")

        if not isinstance(postulacion, Postulacion):
            raise ValidationError("La postulación es obligatoria.")
        if not isinstance(nuevo_estado, EstadoPostulacion):
            raise ValidationError("El estado nuevo es obligatorio.")
        if not isinstance(usuario, CustomUser):
            raise ValidationError("El usuario responsable del cambio es obligatorio.")

        with transaction.atomic():
            estado_actual = postulacion.estado_actual
            if estado_actual == nuevo_estado:
                raise ValidationError("El estado nuevo debe ser diferente al estado actual.")

            postulacion.estado_actual = nuevo_estado
            postulacion.save(update_fields=["estado_actual", "updated_at"])

            PostulacionService.registrar_historial(
                {
                    "postulacion": postulacion,
                    "estado_anterior": estado_actual,
                    "estado_nuevo": nuevo_estado,
                    "usuario": usuario,
                    "comentario": comentario or "Cambio de estado registrado.",
                }
            )
            PostulacionService._registrar_auditoria(
                usuario=usuario,
                accion="cambiar_estado",
                modulo="postulaciones",
                descripcion=(
                    f"Se cambió el estado de la postulación {postulacion.codigo} "
                    f"de {estado_actual} a {nuevo_estado}"
                ),
            )

            return postulacion

    @staticmethod
    def registrar_historial(*args: Any, **kwargs: Any) -> HistorialEstado:
        """Crea un registro de historial para un cambio de estado.

        Centraliza la persistencia de los registros de trazabilidad del
        módulo de postulaciones sin envolver el proceso en transacciones,
        para que el método que lo invoque defina el alcance transaccional.
        """
        if not args:
            raise ValueError("Se requieren datos para registrar el historial.")

        datos = args[0]
        postulacion = datos.get("postulacion")
        estado_anterior = datos.get("estado_anterior")
        estado_nuevo = datos.get("estado_nuevo")
        usuario = datos.get("usuario")
        comentario = datos.get("comentario")

        if not isinstance(postulacion, Postulacion):
            raise ValidationError("La postulación es obligatoria.")
        if not isinstance(estado_nuevo, EstadoPostulacion):
            raise ValidationError("El estado nuevo es obligatorio.")
        if not isinstance(usuario, CustomUser):
            raise ValidationError("El usuario que realiza el cambio es obligatorio.")

        return HistorialEstado.objects.create(
            postulacion=postulacion,
            estado_anterior=estado_anterior,
            estado_nuevo=estado_nuevo,
            usuario=usuario,
            comentario=comentario or "Registro de historial generado.",
        )

    @staticmethod
    def agregar_observacion(*args: Any, **kwargs: Any) -> Observacion:
        """Registra una observación sobre una postulación.

        Valida que la postulación exista y que el comentario no esté vacío,
        crea la observación con el estado de lectura inicial en False y deja
        una auditoría para el seguimiento del proceso de revisión.
        """
        if not args:
            raise ValueError("Se requieren datos para agregar una observación.")

        datos = args[0]
        postulacion = datos.get("postulacion")
        usuario = datos.get("usuario")
        comentario = datos.get("comentario")

        if not isinstance(postulacion, Postulacion):
            raise ValidationError("La postulación es obligatoria.")
        if not isinstance(usuario, CustomUser):
            raise ValidationError("El usuario que registra la observación es obligatorio.")
        if not comentario or not str(comentario).strip():
            raise ValidationError("El comentario es obligatorio.")

        with transaction.atomic():
            observacion = Observacion.objects.create(
                postulacion=postulacion,
                usuario=usuario,
                comentario=str(comentario).strip(),
                leida_estudiante=False,
            )
            PostulacionService._registrar_auditoria(
                usuario=usuario,
                accion="CREAR",
                modulo="POSTULACIONES",
                descripcion=f"Se agregó una observación a la postulación {postulacion.codigo}",
            )
            return observacion

    @staticmethod
    def obtener_postulacion(*args: Any, **kwargs: Any) -> None:
        """Obtiene una postulación por identificador o criterio específico.

        En futuras iteraciones se encargará de consultar y devolver una
        postulación con sus relaciones necesarias.
        """
        raise NotImplementedError("La lógica de obtención de postulaciones aún no está implementada.")

    @staticmethod
    def listar_postulaciones(*args: Any, **kwargs: Any) -> None:
        """Lista postulaciones según filtros o criterios definidos.

        Este método queda preparado para soportar búsquedas, filtros y
        paginación cuando se implemente la capa de presentación.
        """
        raise NotImplementedError("La lógica de listado de postulaciones aún no está implementada.")
