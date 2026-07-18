import hashlib
import os
from typing import Any, Dict, Optional

from django.db import transaction
from django.db.models import Max, QuerySet
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.documentos.models import (
    DocumentoPostulacion,
    EstadoDocumento,
    ObservacionDocumento,
    TipoDocumento,
    VersionDocumento,
)
from apps.postulantes.models import Postulacion
from apps.usuarios.models import AuditLog
from apps.notificaciones.events import EventTypes, publish_domain_event


class DocumentoService:
    """Servicio centralizado para la lógica de negocio del módulo Documentos."""

    def subir_documento(
        self,
        postulacion: Postulacion,
        tipo_documento: TipoDocumento,
        archivo: Any,
        usuario: Any,
        request: Optional[Any] = None,
    ) -> VersionDocumento:
        """Sube un archivo como nueva versión de un documento de postulación.

        Args:
            postulacion: Postulación a la que pertenece el documento.
            tipo_documento: Tipo de documento que se está cargando.
            archivo: Archivo subido por el usuario.
            usuario: Usuario que realiza la carga.
            request: Request opcional para auditoría y contexto adicional.

        Returns:
            VersionDocumento: Instancia de la versión de documento creada.

        Raises:
            NotFound: Si la postulación o el tipo de documento no existen o no están activos.
            PermissionDenied: Si el usuario no tiene permisos para subir el documento.
            ValidationError: Si el archivo no cumple con las reglas del tipo de documento.
        """
        self._validar_postulacion_editable(postulacion)
        if not isinstance(tipo_documento, TipoDocumento) or not tipo_documento.pk or not tipo_documento.activo:
            raise NotFound("El tipo de documento no existe o no está activo.")
        self._validar_archivo(archivo, tipo_documento)
        self._validar_usuario_activo(usuario)

        if usuario != postulacion.estudiante and not (
            getattr(usuario, "is_staff", False) or getattr(usuario, "is_superuser", False)
        ):
            raise PermissionDenied("El usuario no tiene permisos para subir este documento.")

        estado_env = self._obtener_estado_documento("ENV")

        documento, _created = DocumentoPostulacion.objects.get_or_create(
            postulacion=postulacion,
            tipo_documento=tipo_documento,
            defaults={
                "estado": estado_env,
                "requiere_correccion": False,
            },
        )

        return self.crear_nueva_version(
            documento=documento,
            archivo=archivo,
            usuario=usuario,
            request=request,
        )

    def crear_nueva_version(
        self,
        documento: DocumentoPostulacion,
        archivo: Any,
        usuario: Any,
        request: Optional[Any] = None,
    ) -> VersionDocumento:
        """Crea una nueva versión para un documento existente.

        Args:
            documento: DocumentoPostulacion al que se le agregará la versión.
            archivo: Archivo subido para la nueva versión.
            usuario: Usuario que sube la versión.
            request: Request opcional para auditoría y contexto adicional.

        Returns:
            VersionDocumento: Instancia de la versión de documento creada.

        Raises:
            NotFound: Si el documento no existe o no está activo.
            PermissionDenied: Si el usuario no tiene permiso para subir la versión.
            ValidationError: Si el archivo no cumple con los requisitos del tipo de documento.
        """
        self._validar_documento_activo(documento)
        self._validar_usuario_activo(usuario)
        self._validar_postulacion_editable(documento.postulacion)
        nombre_original = self._validar_archivo(archivo, documento.tipo_documento)

        with transaction.atomic():
            documento = DocumentoPostulacion.objects.select_for_update().get(pk=documento.pk)
            self._validar_documento_activo(documento)
            self._validar_postulacion_editable(documento.postulacion)

            estado_env = self._obtener_estado_documento("ENV")

            archivo.seek(0)
            sha256 = hashlib.sha256()
            total_bytes = 0
            chunk = archivo.read(8192)
            while chunk:
                if isinstance(chunk, str):
                    chunk = chunk.encode("utf-8")
                total_bytes += len(chunk)
                sha256.update(chunk)
                chunk = archivo.read(8192)
            archivo.seek(0)

            if total_bytes == 0:
                raise ValidationError("El archivo enviado está vacío.")

            if total_bytes > documento.tipo_documento.tamano_maximo_mb * 1024 * 1024:
                raise ValidationError(
                    f"El archivo supera el tamaño máximo permitido de {documento.tipo_documento.tamano_maximo_mb} MB."
                )

            versiones_qs = VersionDocumento.objects.select_for_update().filter(documento=documento)
            ultimo_numero = versiones_qs.aggregate(max_num=Max("numero_version"))["max_num"]
            numero_version = 1 if ultimo_numero is None else ultimo_numero + 1

            if versiones_qs.exists():
                versiones_qs.update(es_version_actual=False)

            documento.estado = estado_env
            documento.fecha_subida = timezone.now()
            documento.fecha_revision = None
            documento.requiere_correccion = False
            documento.save(update_fields=["estado", "fecha_subida", "fecha_revision", "requiere_correccion"])

            version = VersionDocumento.objects.create(
                documento=documento,
                subido_por=usuario,
                numero_version=numero_version,
                archivo=archivo,
                nombre_original=nombre_original,
                tamano_bytes=total_bytes,
                hash_sha256=sha256.hexdigest(),
                es_version_actual=True,
            )

            self._registrar_auditoria(
                usuario_id=getattr(usuario, "id", None),
                accion="UPLOAD",
                modulo="DOCUMENTOS",
                descripcion=(
                    f"Documento {documento.tipo_documento.nombre} cargado para la postulación "
                    f"{documento.postulacion.codigo} como versión {version.numero_version}."
                ),
                request=request,
            )

            event_type = EventTypes.DOCUMENTO_SUBIDO if version.numero_version == 1 else EventTypes.DOCUMENTO_NUEVA_VERSION
            publish_domain_event(event_type, version, usuario, documento.postulacion,
                {"documento": documento.tipo_documento.nombre}, f"{event_type}:{version.pk}")

            return version

    def aprobar_documento(
        self,
        documento: DocumentoPostulacion,
        usuario: Any,
        comentario: Optional[str] = None,
        request: Optional[Any] = None,
    ) -> DocumentoPostulacion:
        """Aprueba un documento de postulación.

        Args:
            documento: DocumentoPostulacion a aprobar.
            usuario: Usuario administrativo que realiza la aprobación.
            comentario: Observación general opcional asociada a la aprobación.
            request: Request opcional para auditoría y contexto adicional.

        Returns:
            DocumentoPostulacion: Instancia del documento actualizada.

        Raises:
            NotFound: Si el documento no existe o no está activo.
            PermissionDenied: Si el usuario no tiene permisos administrativos.
            ValidationError: Si el documento no tiene versiones, no tiene versión actual,
                ya está aprobado, el estado APR no existe, o la postulación está concluida/rechazada.
        """
        self._validar_documento_activo(documento)
        self._validar_usuario_administrativo(usuario)

        with transaction.atomic():
            documento = DocumentoPostulacion.objects.select_for_update().select_related(
                "postulacion", "estado"
            ).get(pk=documento.pk)
            self._validar_documento_activo(documento)
            self._validar_postulacion_editable(documento.postulacion)

            version_actual = self.obtener_version_actual(documento)
            if documento.estado and getattr(documento.estado, "codigo", None) == "APR":
                raise ValidationError("El documento ya está aprobado.")

            estado_apr = self._obtener_estado_documento("APR")
            documento.estado = estado_apr
            documento.fecha_revision = timezone.now()
            documento.requiere_correccion = False
            if comentario is not None:
                documento.observacion_general = comentario
            documento.save(
                update_fields=[
                    "estado",
                    "fecha_revision",
                    "requiere_correccion",
                    "observacion_general",
                ]
            )

            self._registrar_auditoria(
                usuario_id=getattr(usuario, "id", None),
                accion="APPROVE",
                modulo="DOCUMENTOS",
                descripcion=(
                    f"Documento {documento} aprobado para la postulación {documento.postulacion.codigo}. "
                    f"Versión actual: {version_actual.numero_version}."
                ),
                request=request,
            )

            publish_domain_event(EventTypes.DOCUMENTO_APROBADO, documento, usuario, documento.postulacion,
                {"documento": documento.tipo_documento.nombre}, f"DOCUMENTO_APROBADO:{documento.pk}:{version_actual.pk}")

            return documento

    def rechazar_documento(
        self,
        documento: DocumentoPostulacion,
        usuario: Any,
        motivo: str,
        request: Optional[Any] = None,
    ) -> DocumentoPostulacion:
        """Rechaza un documento de postulación.

        Args:
            documento: DocumentoPostulacion que será rechazado.
            usuario: Usuario administrativo responsable del rechazo.
            motivo: Motivo obligatorio del rechazo.
            request: Request opcional para auditoría y contexto adicional.

        Returns:
            DocumentoPostulacion: Instancia del documento actualizada.

        Raises:
            NotFound: Si el documento no existe o no está activo.
            PermissionDenied: Si el usuario no tiene permisos administrativos.
            ValidationError: Si el motivo está vacío, el documento no tiene versiones,
                no tiene versión actual, ya está rechazado, el estado REC no existe,
                o la postulación está concluida/rechazada.
        """
        self._validar_documento_activo(documento)
        self._validar_usuario_administrativo(usuario)
        if not motivo or not str(motivo).strip():
            raise ValidationError("El motivo del rechazo es obligatorio.")

        with transaction.atomic():
            documento = DocumentoPostulacion.objects.select_for_update().select_related(
                "postulacion", "estado"
            ).get(pk=documento.pk)
            self._validar_documento_activo(documento)
            self._validar_postulacion_editable(documento.postulacion)

            version_actual = self.obtener_version_actual(documento)
            if documento.estado and getattr(documento.estado, "codigo", None) == "REC":
                raise ValidationError("El documento ya está rechazado.")

            estado_rec = self._obtener_estado_documento("REC")
            documento.estado = estado_rec
            documento.fecha_revision = timezone.now()
            documento.requiere_correccion = True
            documento.observacion_general = str(motivo).strip()
            documento.save(
                update_fields=[
                    "estado",
                    "fecha_revision",
                    "requiere_correccion",
                    "observacion_general",
                ]
            )

            self._registrar_auditoria(
                usuario_id=getattr(usuario, "id", None),
                accion="REJECT",
                modulo="DOCUMENTOS",
                descripcion=(
                    f"Documento {documento} rechazado para la postulación {documento.postulacion.codigo}. "
                    f"Versión actual: {version_actual.numero_version}. Motivo: {motivo}"
                ),
                request=request,
            )

            publish_domain_event(EventTypes.DOCUMENTO_RECHAZADO, documento, usuario, documento.postulacion,
                {"documento": documento.tipo_documento.nombre}, f"DOCUMENTO_RECHAZADO:{documento.pk}:{version_actual.pk}")

            return documento

    def registrar_observacion(
        self,
        documento: DocumentoPostulacion,
        usuario: Any,
        comentario: str,
        request: Optional[Any] = None,
    ) -> ObservacionDocumento:
        """Registra una observación sobre la versión actual de un documento.

        Args:
            documento: DocumentoPostulacion sobre el que se genera la observación.
            usuario: Usuario administrativo que registra la observación.
            comentario: Texto de la observación.
            request: Request opcional para auditoría y contexto adicional.

        Returns:
            ObservacionDocumento: Instancia de la observación creada.

        Raises:
            NotFound: Si el documento no existe o no está activo.
            PermissionDenied: Si el usuario no tiene permisos administrativos.
            ValidationError: Si el comentario está vacío o no existe versión actual.
        """
        self._validar_documento_activo(documento)
        self._validar_usuario_administrativo(usuario)
        if not comentario or not str(comentario).strip():
            raise ValidationError("El comentario de la observación es obligatorio.")

        with transaction.atomic():
            documento = DocumentoPostulacion.objects.select_for_update().get(pk=documento.pk)
            self._validar_documento_activo(documento)

            version_actual = self.obtener_version_actual(documento)
            observacion = ObservacionDocumento.objects.create(
                version_documento=version_actual,
                usuario=usuario,
                comentario=str(comentario).strip(),
                leida_por_estudiante=False,
                corregida=False,
            )

            documento.requiere_correccion = True
            documento.save(update_fields=["requiere_correccion"])

            self._registrar_auditoria(
                usuario_id=getattr(usuario, "id", None),
                accion="COMMENT",
                modulo="DOCUMENTOS",
                descripcion=(
                    f"Se registró una observación en el documento {documento}. "
                    f"Versión actual: {version_actual.numero_version}. Comentario: {comentario}"
                ),
                request=request,
            )

            publish_domain_event(EventTypes.DOCUMENTO_OBSERVADO, observacion, usuario, documento.postulacion,
                {"documento": documento.tipo_documento.nombre}, f"DOCUMENTO_OBSERVADO:{observacion.pk}")

            return observacion

    def marcar_observacion_corregida(
        self,
        observacion: ObservacionDocumento,
        usuario: Any,
        request: Optional[Any] = None,
    ) -> ObservacionDocumento:
        """Marca una observación de documento como corregida.

        Args:
            observacion: ObservacionDocumento que se marcará como corregida.
            usuario: Usuario administrativo que realiza la corrección.
            request: Request opcional para auditoría y contexto adicional.

        Returns:
            ObservacionDocumento: Instancia de la observación actualizada.

        Raises:
            NotFound: Si la observación no existe o no está activa.
            PermissionDenied: Si el usuario no tiene permisos administrativos.
            ValidationError: Si la observación ya fue corregida.
        """
        if not isinstance(observacion, ObservacionDocumento) or not observacion.pk:
            raise NotFound("La observación no existe.")
        self._validar_usuario_administrativo(usuario)
        if not observacion.activo:
            raise NotFound("La observación no está activa.")
        if observacion.corregida:
            raise ValidationError("La observación ya está marcada como corregida.")

        with transaction.atomic():
            observacion = ObservacionDocumento.objects.select_for_update().select_related(
                "version_documento", "version_documento__documento"
            ).get(pk=observacion.pk)
            if not observacion.activo:
                raise NotFound("La observación no está activa.")
            if observacion.corregida:
                raise ValidationError("La observación ya está marcada como corregida.")

            observacion.corregida = True
            observacion.fecha_correccion = timezone.now()
            observacion.save(update_fields=["corregida", "fecha_correccion"])

            version_actual = observacion.version_documento
            observaciones_pendientes = version_actual.observaciones.filter(
                activo=True,
                corregida=False,
            ).exists()

            if not observaciones_pendientes:
                documento = version_actual.documento
                documento.requiere_correccion = False
                documento.save(update_fields=["requiere_correccion"])

            self._registrar_auditoria(
                usuario_id=getattr(usuario, "id", None),
                accion="CORRECT",
                modulo="DOCUMENTOS",
                descripcion=(
                    f"Observación {observacion.pk} corregida para el documento {version_actual.documento}. "
                    f"Versión: {version_actual.numero_version}."
                ),
                request=request,
            )

            return observacion

    def obtener_documentos_por_postulacion(
        self,
        postulacion: Postulacion,
    ) -> QuerySet:
        """Obtiene todos los documentos activos de una postulación."""
        self._validar_postulacion_editable(postulacion)
        self._validar_postulacion_activa(postulacion)
        return (
            DocumentoPostulacion.objects.filter(postulacion=postulacion, activo=True)
            .select_related("tipo_documento", "estado", "postulacion")
            .prefetch_related("versiones")
            .order_by("tipo_documento__nombre")
        )

    def obtener_version_actual(
        self,
        documento: DocumentoPostulacion,
    ) -> VersionDocumento:
        """Obtiene la versión actual del documento indicado."""
        self._validar_documento_activo(documento)
        version_actual = VersionDocumento.objects.select_related("documento").filter(
            documento=documento,
            es_version_actual=True,
        ).first()
        if not version_actual:
            raise ValidationError("No existe una versión actual para este documento.")
        return version_actual

    def _validar_documento_activo(self, documento: DocumentoPostulacion) -> DocumentoPostulacion:
        if not isinstance(documento, DocumentoPostulacion) or not documento.pk:
            raise NotFound("El documento de postulación no existe.")
        if not documento.activo:
            raise NotFound("El documento de postulación no está activo.")
        return documento

    def _validar_usuario_activo(self, usuario: Any) -> Any:
        if usuario is None or not getattr(usuario, "is_active", False):
            raise NotFound("El usuario no existe o no está activo.")
        return usuario

    def _validar_usuario_administrativo(self, usuario: Any) -> Any:
        self._validar_usuario_activo(usuario)
        if not (getattr(usuario, "is_staff", False) or getattr(usuario, "is_superuser", False)):
            raise PermissionDenied("El usuario no tiene permisos administrativos para esta acción.")
        return usuario

    def _validar_postulacion_activa(self, postulacion: Postulacion) -> Postulacion:
        if not isinstance(postulacion, Postulacion) or not postulacion.pk:
            raise NotFound("La postulación no existe.")
        if not postulacion.activo:
            raise NotFound("La postulación no existe o no está activa.")
        return postulacion

    def _validar_postulacion_editable(self, postulacion: Postulacion) -> Postulacion:
        postulacion = self._validar_postulacion_activa(postulacion)
        estado_actual = postulacion.estado_actual
        if estado_actual and getattr(estado_actual, "codigo", None) in ("CONCLUIDA", "RECHAZADA"):
            raise ValidationError("La postulación está concluida o rechazada.")
        return postulacion

    def _validar_archivo(self, archivo: Any, tipo_documento: TipoDocumento) -> str:
        if archivo is None:
            raise ValidationError("No se ha enviado ningún archivo.")
        nombre_original = getattr(archivo, "name", None)
        if not nombre_original:
            raise ValidationError("El archivo debe tener nombre original.")

        extension = os.path.splitext(nombre_original)[1].lstrip(".").lower()
        if not extension:
            raise ValidationError("El archivo debe contener una extensión válida.")

        extensiones_permitidas = [
            item.strip().lower()
            for item in (tipo_documento.extensiones_permitidas or "").split(",")
            if item.strip()
        ]
        if extension not in extensiones_permitidas:
            raise ValidationError(
                f"La extensión '{extension}' no está permitida para el tipo de documento {tipo_documento.nombre}."
            )
        return nombre_original

    def _obtener_estado_documento(self, codigo: str) -> EstadoDocumento:
        estado = EstadoDocumento.objects.filter(codigo=codigo, activo=True).first()
        if not estado:
            raise ValidationError(f"No existe el estado {codigo}.")
        return estado

    def _registrar_auditoria(
        self,
        usuario_id: int,
        accion: str,
        modulo: str = "documentos",
        descripcion: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        request: Optional[Any] = None,
    ) -> None:
        """Registra una entrada de auditoría para una acción del servicio."""
        audit_data: Dict[str, Any] = {
            "usuario_id": usuario_id,
            "accion": accion,
            "modulo": modulo,
            "descripcion": descripcion or "",
        }
        if request is not None:
            audit_data["ip_address"] = getattr(request, "META", {}).get("REMOTE_ADDR", "")
            audit_data["metodo_http"] = getattr(request, "method", "")
            audit_data["url"] = getattr(request, "build_absolute_uri", lambda: "")()
        if metadata is not None:
            audit_data["metadata"] = metadata

        AuditLog.objects.create(**audit_data)

    @staticmethod
    def get_dashboard_data() -> Dict[str, str]:
        return {
            "status": "ready",
            "module": "documentos",
        }
