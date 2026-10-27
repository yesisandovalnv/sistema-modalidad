import hashlib
import os
from typing import Any, Dict, Optional

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Max, QuerySet
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.documentos.models import (
    ConfirmacionCorreccionDocumento,
    DocumentoPostulacion,
    EstadoDocumento,
    ObservacionDocumento,
    TipoDocumento,
    VersionDocumento,
)
from apps.postulantes.models import Postulacion
from apps.usuarios.models import AuditLog
from apps.notificaciones.events import EventTypes, publish_domain_event
from core.permissions import is_staff_user


class DocumentoService:
    """Servicio centralizado para la lógica de negocio del módulo Documentos."""

    def obtener_capacidad_carga(
        self,
        *,
        postulacion: Postulacion,
        tipo_documento: TipoDocumento,
        usuario: Any,
        documento: Optional[DocumentoPostulacion] = None,
        policy=None,
    ) -> Dict[str, Any]:
        """Resuelve si el actor puede crear ahora una versión sin alterar la aplicabilidad académica."""
        from apps.modalidades.policies import ActorCargaDocumento, ModalidadPolicyRegistry

        es_staff = is_staff_user(usuario)
        if not es_staff and usuario != postulacion.estudiante:
            return {
                "permitida": False,
                "codigo": "NO_AUTORIZADO",
                "mensaje": "El usuario no tiene permisos para cargar este documento.",
            }

        if documento is not None and not documento.activo:
            return {
                "permitida": False,
                "codigo": "DOCUMENTO_INACTIVO",
                "mensaje": "El documento se encuentra inactivo y no admite nuevas versiones.",
            }

        if policy is None and ModalidadPolicyRegistry.has_policy(postulacion):
            policy = ModalidadPolicyRegistry.get(postulacion)
        etapa_codigo = policy.resolver_contexto_documental(postulacion) if policy else None
        actores_permitidos = (
            policy.get_actores_carga_documento(etapa_codigo, tipo_documento.codigo)
            if policy and etapa_codigo else None
        )
        actor_actual = (
            ActorCargaDocumento.ADMINISTRACION
            if es_staff else ActorCargaDocumento.ESTUDIANTE
        )
        if actores_permitidos is not None and actor_actual not in actores_permitidos:
            return {
                "permitida": False,
                "codigo": "ACTOR_CARGA_NO_AUTORIZADO",
                "mensaje": "Este documento debe ser cargado por un actor autorizado.",
                "actores_carga_permitidos": list(actores_permitidos),
            }

        if documento is None:
            return {
                "permitida": True,
                "codigo": "SIN_DOCUMENTO",
                "mensaje": "El documento todavía no fue cargado.",
            }

        estado_codigo = getattr(getattr(documento, "estado", None), "codigo", None)
        if estado_codigo == "REC":
            codigo = "RECHAZADO"
            permitida_estudiante = True
            mensaje = "El documento fue rechazado y admite una nueva versión."
        elif documento.requiere_correccion and estado_codigo == "APR":
            if policy is None:
                policy = ModalidadPolicyRegistry.get(postulacion)
            permitida_estudiante = bool(policy.permite_observacion_post_aprobacion(documento))
            codigo = "CORRECCION_POST_APROBACION" if permitida_estudiante else "DOCUMENTO_APROBADO"
            mensaje = (
                "La corrección post-aprobación autoriza una nueva versión."
                if permitida_estudiante
                else "El documento aprobado no tiene una corrección post-aprobación autorizada."
            )
        elif documento.requiere_correccion:
            codigo = "CORRECCION_REQUERIDA"
            permitida_estudiante = True
            mensaje = "El documento requiere corrección y admite una nueva versión."
        elif estado_codigo == "ENV":
            codigo = "ESPERANDO_REVISION"
            permitida_estudiante = False
            mensaje = "El documento está pendiente de revisión administrativa."
        elif estado_codigo == "APR":
            codigo = "DOCUMENTO_APROBADO"
            permitida_estudiante = False
            mensaje = "El documento está aprobado y no requiere corrección."
        else:
            codigo = "ESTADO_NO_CARGABLE"
            permitida_estudiante = False
            mensaje = "El estado actual del documento no admite una nueva versión."

        if es_staff:
            return {
                "permitida": True,
                "codigo": codigo,
                "mensaje": "La carga administrativa está disponible cuando las reglas académicas vigentes la permitan.",
                **({"excepcion_aplicabilidad": True} if codigo == "CORRECCION_POST_APROBACION" else {}),
            }
        return {
            "permitida": permitida_estudiante,
            "codigo": codigo,
            "mensaje": mensaje,
            **({"excepcion_aplicabilidad": True} if codigo == "CORRECCION_POST_APROBACION" else {}),
        }

    @staticmethod
    def obtener_tipos_documentales_historicos(modalidad):
        """Resuelve los tipos activos de la matriz documental de una modalidad."""
        from apps.academico.models import ModalidadRequisito

        relaciones = list(
            ModalidadRequisito.objects.filter(
                modalidad=modalidad,
                activo=True,
                requisito__activo=True,
            ).select_related("requisito").order_by("orden", "requisito__nombre")
        )
        codigos = [relacion.requisito.codigo for relacion in relaciones]
        tipos = {
            tipo.codigo: tipo
            for tipo in TipoDocumento.objects.filter(codigo__in=codigos, activo=True)
        }
        return [tipos[codigo] for codigo in codigos if codigo in tipos]

    def subir_documento(
        self,
        postulacion: Postulacion,
        tipo_documento: TipoDocumento,
        archivo: Any,
        usuario: Any,
        evento_defensa=None,
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

        if usuario != postulacion.estudiante and not is_staff_user(usuario):
            raise PermissionDenied("El usuario no tiene permisos para subir este documento.")
        if tipo_documento.codigo == "OBSERVACIONES_DEFENSA_PERFIL" and not is_staff_user(usuario):
            raise PermissionDenied("La hoja de observaciones de Defensa de Perfil solo puede cargarla un usuario administrativo.")

        with transaction.atomic():
            # Bloquear la postulación serializa también la primera carga, cuando
            # todavía no existe un DocumentoPostulacion que pueda bloquearse.
            postulacion = Postulacion.objects.select_for_update().get(pk=postulacion.pk)
            self._validar_postulacion_editable(postulacion)
            estado_env = self._obtener_estado_documento("ENV")
            documento = DocumentoPostulacion.all_objects.select_for_update().filter(
                postulacion=postulacion,
                tipo_documento=tipo_documento,
            ).first()
            from apps.modalidades.policies import ModalidadPolicyRegistry
            if ModalidadPolicyRegistry.has_policy(postulacion):
                policy = ModalidadPolicyRegistry.get(postulacion)
                capacidad_carga = self.obtener_capacidad_carga(
                    postulacion=postulacion,
                    tipo_documento=tipo_documento,
                    usuario=usuario,
                    documento=documento,
                    policy=policy,
                )
                es_carga_especial = bool(policy.evento_policy and (
                    evento_defensa is not None
                    or policy.evento_policy.requiere_vinculo_evento_documento(tipo_documento)
                ))
                if es_carga_especial:
                    policy.evento_policy.validar_vinculo_documento(
                        postulacion=postulacion, tipo_documento=tipo_documento,
                        evento_defensa=evento_defensa,
                    )
                if not es_carga_especial:
                    etapa_actual_codigo = policy.resolver_contexto_documental(postulacion)
                    if not etapa_actual_codigo:
                        raise ValidationError(
                            "No se puede cargar un documento ordinario sin un contexto académico válido."
                        )
                    documentos_permitidos = policy.get_documentos_aplicables_para_postulacion(
                        postulacion, etapa_actual_codigo,
                    )
                    if (
                        tipo_documento.codigo not in documentos_permitidos
                        and not capacidad_carga.get("excepcion_aplicabilidad", False)
                    ):
                        raise ValidationError(
                            f"El tipo '{tipo_documento.nombre}' no puede cargarse en la etapa '{etapa_actual_codigo}'. "
                            f"Tipos permitidos: {', '.join(documentos_permitidos) or 'ninguno'}."
                        )
            elif evento_defensa is not None:
                raise ValidationError("La modalidad no admite vincular documentos a eventos.")
            else:
                raise ValidationError(
                    "La modalidad no tiene una policy académica configurada para cargar documentos."
                )
            if not capacidad_carga["permitida"]:
                if capacidad_carga["codigo"] in {
                    "NO_AUTORIZADO",
                    "ACTOR_CARGA_NO_AUTORIZADO",
                }:
                    raise PermissionDenied(capacidad_carga["mensaje"])
                raise ValidationError(capacidad_carga["mensaje"])
            es_carga_inicial = documento is None
            if es_carga_inicial:
                documento = DocumentoPostulacion.objects.create(
                    postulacion=postulacion,
                    tipo_documento=tipo_documento,
                    estado=estado_env,
                    requiere_correccion=False,
                    evento_defensa=evento_defensa,
                )
            else:
                self._validar_documento_activo(documento)
                if (
                    tipo_documento.codigo == "OBSERVACIONES_DEFENSA_PERFIL"
                    and evento_defensa is not None
                    and documento.evento_defensa_id not in (None, evento_defensa.pk)
                ):
                    raise ValidationError("La hoja de observaciones ya está vinculada a otra Defensa de Perfil.")
                if evento_defensa is not None and documento.evento_defensa_id != evento_defensa.pk:
                    documento.evento_defensa = evento_defensa
                    documento.save(update_fields=["evento_defensa", "updated_at"])

            return self.crear_nueva_version(
                documento=documento,
                archivo=archivo,
                usuario=usuario,
                request=request,
                autoaprobar_carga_inicial=(
                    es_carga_inicial
                    and is_staff_user(usuario)
                    and (
                        (not es_carga_especial and evento_defensa is None)
                        or (
                            tipo_documento.codigo == "OBSERVACIONES_DEFENSA_PERFIL"
                            and es_carga_especial
                            and evento_defensa is not None
                        )
                        or (
                            tipo_documento.codigo == "ACTA_DEFENSA_TD"
                            and postulacion.modalidad.codigo == "TRABAJO_DIRIGIDO"
                            and es_carga_especial
                            and evento_defensa is not None
                        )
                        or (
                            tipo_documento.codigo == "ACTA_DEFENSA"
                            and postulacion.modalidad.codigo == "TESIS_GRADO"
                            and self._puede_autoaprobar_acta_tesis(
                                postulacion, evento_defensa, policy,
                            )
                        )
                    )
                ),
            )

    def _puede_autoaprobar_acta_tesis(self, postulacion, evento_defensa, policy):
        """Elegibilidad adicional; no restringe las cargas admitidas por la policy."""
        if postulacion.tipo_registro == Postulacion.TipoRegistroChoices.HISTORICO:
            return False
        if evento_defensa is None:
            return False
        seguimientos = list(postulacion.seguimientos_etapa.select_for_update().filter(
            activo=True, etapa__codigo="DEFENSA_PUBLICA",
        ).order_by("-numero_intento", "-pk"))
        if not seguimientos:
            return False
        seguimiento = seguimientos[0]
        if (
            seguimiento.estado != "APROBADA"
            or sum(s.numero_intento == seguimiento.numero_intento for s in seguimientos) != 1
        ):
            return False
        eventos = list(postulacion.eventos_defensa.select_for_update().filter(
            activo=True, tipo_evento="DEFENSA_PUBLICA",
            numero_intento=seguimiento.numero_intento,
        ))
        if len(eventos) != 1:
            return False
        evento = eventos[0]
        if (
            evento.pk != evento_defensa.pk
            or evento.seguimiento_etapa_id != seguimiento.pk
            or evento.estado != "FINALIZADA"
        ):
            return False
        try:
            policy.validar_aprobacion_etapa(seguimiento)
        except (DjangoValidationError, ValidationError):
            return False
        return True

    def subir_documento_historico(
        self,
        postulacion: Postulacion,
        tipo_documento: TipoDocumento,
        archivo: Any,
        usuario: Any,
        request: Optional[Any] = None,
    ) -> VersionDocumento:
        """Carga un documento permitido por la matriz de modalidad histórica."""
        postulacion = self._validar_postulacion_activa(postulacion)
        if postulacion.tipo_registro != Postulacion.TipoRegistroChoices.HISTORICO:
            raise ValidationError("La ruta histórica solo admite postulaciones HISTORICO.")
        self._validar_usuario_administrativo(usuario)
        if not isinstance(tipo_documento, TipoDocumento) or not tipo_documento.pk or not tipo_documento.activo:
            raise NotFound("El tipo de documento no existe o no está activo.")
        self._validar_archivo(archivo, tipo_documento)

        permitido = tipo_documento in self.obtener_tipos_documentales_historicos(postulacion.modalidad)
        if not permitido:
            raise ValidationError("El tipo de documento no está permitido para la modalidad histórica.")

        with transaction.atomic():
            postulacion = Postulacion.objects.select_for_update().get(pk=postulacion.pk)
            documento = DocumentoPostulacion.all_objects.select_for_update().filter(
                postulacion=postulacion,
                tipo_documento=tipo_documento,
            ).first()
            if documento is None:
                documento = DocumentoPostulacion.objects.create(
                    postulacion=postulacion,
                    tipo_documento=tipo_documento,
                    estado=self._obtener_estado_documento("ENV"),
                    requiere_correccion=False,
                )
            else:
                self._validar_documento_activo(documento)
            return self.crear_nueva_version(
                documento=documento,
                archivo=archivo,
                usuario=usuario,
                request=request,
                allow_historic=True,
            )

    def crear_nueva_version(
        self,
        documento: DocumentoPostulacion,
        archivo: Any,
        usuario: Any,
        request: Optional[Any] = None,
        allow_historic: bool = False,
        autoaprobar_carga_inicial: bool = False,
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
        self._validar_postulacion_para_documento(documento.postulacion, allow_historic)
        nombre_original = self._validar_archivo(archivo, documento.tipo_documento)

        archivo_guardado = None
        storage = None
        try:
            with transaction.atomic():
                documento = DocumentoPostulacion.objects.select_for_update().get(pk=documento.pk)
                self._validar_documento_activo(documento)
                self._validar_postulacion_para_documento(documento.postulacion, allow_historic)

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

                version = VersionDocumento(
                    documento=documento,
                    subido_por=usuario,
                    numero_version=numero_version,
                    nombre_original=nombre_original,
                    tamano_bytes=total_bytes,
                    hash_sha256=sha256.hexdigest(),
                    es_version_actual=True,
                )
                version.archivo.save(nombre_original, archivo, save=False)
                archivo_guardado = version.archivo.name
                storage = version.archivo.storage
                version.save()

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

                if autoaprobar_carga_inicial and version.numero_version == 1:
                    self.aprobar_documento(
                        documento=documento,
                        usuario=usuario,
                        request=request,
                    )

                return version
        except Exception:
            # El storage no se revierte con transaction.atomic(). Solo se elimina
            # el nombre recién creado; nunca se tocan archivos históricos.
            if archivo_guardado and storage:
                storage.delete(archivo_guardado)
            raise

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
            self._validar_estado_revision(documento)
            if version_actual.observaciones.filter(activo=True, corregida=False).exists():
                raise ValidationError("La versión actual tiene observaciones pendientes.")

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
            self._validar_estado_revision(documento)

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
            documento = DocumentoPostulacion.objects.select_for_update().select_related(
                "postulacion", "estado"
            ).get(pk=documento.pk)
            self._validar_documento_activo(documento)
            self._validar_postulacion_editable(documento.postulacion)
            if getattr(documento.estado, "codigo", None) != "ENV":
                from apps.modalidades.policies import ModalidadPolicyRegistry
                policy = ModalidadPolicyRegistry.get(documento.postulacion)
                if not policy.permite_observacion_post_aprobacion(documento):
                    self._validar_estado_revision(documento)

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

            version_observada = observacion.version_documento
            documento = version_observada.documento
            version_actual = self.obtener_version_actual(documento)
            observaciones_pendientes = version_actual.observaciones.filter(
                activo=True,
                corregida=False,
            ).exists()

            documento.requiere_correccion = observaciones_pendientes
            documento.save(update_fields=["requiere_correccion"])

            self._registrar_auditoria(
                usuario_id=getattr(usuario, "id", None),
                accion="CORRECT",
                modulo="DOCUMENTOS",
                descripcion=(
                    f"Observación {observacion.pk} corregida para el documento {documento}. "
                    f"Versión: {version_observada.numero_version}."
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
        if not is_staff_user(usuario):
            raise PermissionDenied("El usuario no tiene permisos administrativos para esta acción.")
        return usuario

    def _validar_estado_revision(self, documento: DocumentoPostulacion) -> None:
        codigo = getattr(documento.estado, "codigo", None)
        if codigo != "ENV":
            raise ValidationError("El documento solo puede revisarse cuando está en estado ENV.")

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

    def _validar_postulacion_para_documento(self, postulacion: Postulacion, allow_historic: bool = False) -> Postulacion:
        if allow_historic and postulacion.tipo_registro == Postulacion.TipoRegistroChoices.HISTORICO:
            return self._validar_postulacion_activa(postulacion)
        return self._validar_postulacion_editable(postulacion)

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
        size = getattr(archivo, "size", None)
        if size is not None and size > tipo_documento.tamano_maximo_mb * 1024 * 1024:
            raise ValidationError(
                f"El archivo supera el tamaño máximo permitido de {tipo_documento.tamano_maximo_mb} MB."
            )
        if extension == "pdf":
            position = archivo.tell() if hasattr(archivo, "tell") else 0
            signature = archivo.read(5)
            archivo.seek(position)
            if signature != b"%PDF-":
                raise ValidationError("El contenido del archivo no corresponde a un PDF válido.")
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


class ConfirmacionCorreccionDocumentoService:
    """Servicio común para registrar subsanaciones documentales trazables."""

    @staticmethod
    @transaction.atomic
    def registrar(*, postulacion, evento_origen, version_observada, version_corregida,
                  confirmado_por, asignacion_confirmante, observaciones=""):
        from apps.modalidades.policies import ModalidadPolicyRegistry
        confirmation = ConfirmacionCorreccionDocumento(
            postulacion=postulacion, evento_origen=evento_origen,
            version_observada=version_observada, version_corregida=version_corregida,
            confirmado_por=confirmado_por, asignacion_confirmante=asignacion_confirmante,
            observaciones=(observaciones or "").strip(),
        )
        confirmation.full_clean()
        ModalidadPolicyRegistry.get(postulacion).validar_confirmacion_correccion(confirmacion=confirmation)
        confirmation.save()
        AuditLog.objects.create(usuario=confirmado_por, accion="CONFIRM_CORRECTION", modulo="DOCUMENTOS", descripcion=f"Confirmación técnica {confirmation.pk} entre versiones {version_observada.pk} y {version_corregida.pk}.")
        return confirmation
