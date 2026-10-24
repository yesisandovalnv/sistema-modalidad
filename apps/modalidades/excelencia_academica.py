from decimal import Decimal

from django.core.exceptions import ValidationError

from apps.modalidades.models import ExcelenciaExpediente
from apps.modalidades.policies import BaseModalidadPolicy, BaseRequisitosPolicy, EtapaDefinition


STAGE_DATA = (
    ("INSCRIPCION", "Inscripción", False),
    ("REVISION_REQUISITOS", "Revisión de requisitos", False),
    ("EVALUACION_TRIBUNAL", "Evaluación del tribunal", False),
    ("REGISTRO_ACTA", "Registro del acta", False),
    ("CONCLUSION_ACADEMICA", "Conclusión académica", False),
)
ETAPAS = tuple(
    EtapaDefinition(
        codigo, nombre, orden, inicial=orden == 1, final=codigo == "CONCLUSION_ACADEMICA",
        siguientes_permitidas=(STAGE_DATA[orden][0],) if orden < len(STAGE_DATA) else (),
    )
    for orden, (codigo, nombre, _repetible) in enumerate(STAGE_DATA, start=1)
)

COMMON_DOCUMENTS = (
    "CARTA_EXCELENCIA",
    "RECIBO_MATRICULA_EXC",
    "HISTORIAL_EXCELENCIA",
)
QUALITY_DOCUMENTS = (
    "CERT_DIR_CARRERA",
    "CERT_INST_INVEST",
)
REVIEW_DOCUMENTS = (
    "CERT_PLANIFICACION",
    "SOLVENCIA_UNIV",
    "SOLVENCIA_BIBLIO",
    "TIMBRE_EXCELENCIA",
)
ACTA_DOCUMENT = "ACTA_EXCELENCIA"


class ExcelenciaAcademicaRequisitosPolicy(BaseRequisitosPolicy):
    def get_entregas_requeridas(self, fase=None):
        return ("FOLDER_AMARILLO",) if fase in (None, "INSCRIPCION") else ()

    DOCUMENTS_BY_STAGE = {
        "INSCRIPCION": COMMON_DOCUMENTS,
        "REVISION_REQUISITOS": REVIEW_DOCUMENTS + QUALITY_DOCUMENTS,
        "EVALUACION_TRIBUNAL": (),
        "REGISTRO_ACTA": (ACTA_DOCUMENT,),
        "CONCLUSION_ACADEMICA": (ACTA_DOCUMENT,),
    }

    def get_documentos_requeridos(self, fase=None):
        if fase is not None:
            return tuple(self.DOCUMENTS_BY_STAGE.get(fase, ()))
        return tuple(dict.fromkeys(code for values in self.DOCUMENTS_BY_STAGE.values() for code in values))


class ExcelenciaAcademicaPolicy(BaseModalidadPolicy):
    codigo = "EXCELENCIA_ACADEMICA"
    etapas = ETAPAS
    requisitos_policy = ExcelenciaAcademicaRequisitosPolicy()

    def validate_configuration(self):
        return [
            error for error in super().validate_configuration()
            if "evaluaciones sin eventos compatibles" not in error
            and "Política de cierre no disponible" not in error
        ]

    def get_capabilities(self, modalidad=None):
        capabilities = super().get_capabilities(modalidad)
        capabilities.evaluaciones_soportadas = True
        capabilities.tipos_evaluacion = ["EXCELENCIA_ACADEMICA"]
        return capabilities

    def get_reglas_asignacion(self):
        return {
            "PRESIDENTE": 1,
            "SECRETARIO": 1,
            "TRIBUNAL": 2,
            "DIRECTOR_INSTITUTO_INVESTIGACION": 1,
        }

    def get_configuracion_actores(self, postulacion=None, seguimiento=None):
        """Declara la composición institucional de Excelencia Académica."""
        identidad_tribunal = {
            "grupo": "TRIBUNAL_EXCELENCIA",
            "unica_persona": True,
        }
        ocupacion_tribunal = {
            "aplica": True,
            "ambito": "POSTULACION",
            "motivo": "YA_TIENE_ASIGNACION_VIGENTE_COMO_TRIBUNAL_EXCELENCIA",
            "relevantes": ["TRIBUNAL"],
        }
        comun = {
            "ambito": "POSTULACION",
            "restriccion_identidad": None,
            "ocupacion_actor": None,
            "obligatoriedad": True,
            "habilitada": True,
            "precondicion": None,
        }
        return {
            "regimen_workflow": getattr(postulacion, "regimen_workflow", None),
            "grupos": [
                {
                    **comun,
                    "restriccion_identidad": identidad_tribunal,
                    "ocupacion_actor": ocupacion_tribunal,
                    "clave": "TRIBUNAL_EXCELENCIA",
                    "tipo_participacion": "TRIBUNAL",
                    "nombre": "Tribunal docente",
                    "minimo": 2,
                    "maximo": 2,
                    "ordenado": True,
                    "ordenes_permitidos": [1, 2],
                    "posiciones": [
                        {
                            "clave": "TRIBUNAL_EXCELENCIA_1",
                            "orden_cargo": 1,
                            "nombre": "Tribunal docente 1",
                        },
                        {
                            "clave": "TRIBUNAL_EXCELENCIA_2",
                            "orden_cargo": 2,
                            "nombre": "Tribunal docente 2",
                        },
                    ],
                },
                {
                    **comun,
                    "clave": "PRESIDENTE_EXCELENCIA",
                    "tipo_participacion": "PRESIDENTE",
                    "nombre": "Presidente",
                    "minimo": 1,
                    "maximo": 1,
                    "ordenado": False,
                    "ordenes_permitidos": [],
                    "posiciones": [{
                        "clave": "PRESIDENTE_EXCELENCIA_1",
                        "orden_cargo": None,
                        "nombre": "Presidente",
                    }],
                },
                {
                    **comun,
                    "clave": "SECRETARIO_EXCELENCIA",
                    "tipo_participacion": "SECRETARIO",
                    "nombre": "Secretario",
                    "minimo": 1,
                    "maximo": 1,
                    "ordenado": False,
                    "ordenes_permitidos": [],
                    "posiciones": [{
                        "clave": "SECRETARIO_EXCELENCIA_1",
                        "orden_cargo": None,
                        "nombre": "Secretario",
                    }],
                },
                {
                    **comun,
                    "clave": "DIRECTOR_INSTITUTO_INVESTIGACION_EXCELENCIA",
                    "tipo_participacion": "DIRECTOR_INSTITUTO_INVESTIGACION",
                    "nombre": "Director del Instituto de Investigación",
                    "minimo": 1,
                    "maximo": 1,
                    "ordenado": False,
                    "ordenes_permitidos": [],
                    "posiciones": [{
                        "clave": "DIRECTOR_INSTITUTO_INVESTIGACION_EXCELENCIA_1",
                        "orden_cargo": None,
                        "nombre": "Director del Instituto de Investigación",
                    }],
                },
            ],
        }

    def get_cierre_policy(self):
        return None

    def usa_conclusion_academica_propia(self):
        return True

    def get_orientacion_etapa_actual(self, *, postulacion, seguimiento):
        if seguimiento is None:
            return None
        expediente = ExcelenciaExpediente.objects.filter(postulacion=postulacion).first()
        if expediente is None:
            requirements = self._requisitos_inscripcion(postulacion) if seguimiento.etapa.codigo == "INSCRIPCION" else []
            return {
                "operacion": "CONFIGURAR_EXCELENCIA",
                "mensaje": "Selecciona el criterio normativo antes de iniciar el flujo.",
                "requisitos": requirements,
                "requisitos_cumplidos": sum(item["cumplido"] for item in requirements),
                "requisitos_totales": len(requirements),
                "permite_aprobar_etapa": False,
                "siguiente_accion": {
                    "codigo": "CONFIGURAR_CRITERIO", "titulo": "Seleccionar criterio",
                    "descripcion": "El criterio seleccionado queda inmutable al iniciar el flujo.",
                    "estado": "PENDIENTE", "estado_display": "Pendiente", "destino": "#excelencia",
                    "accion_label": "Seleccionar criterio",
                },
                "conflictos_identidad": [],
            }
        stage = seguimiento.etapa.codigo
        if stage == "INSCRIPCION":
            return self._orientar_inscripcion(postulacion, expediente)
        requirements = self._stage_requirements(postulacion, expediente, stage)
        missing = any(item.get("cumplido") is False for item in requirements)
        actions = {
            "INSCRIPCION": ("COMPLETAR_DOCUMENTOS", "Completar inscripción", "Carga y aprueba los documentos de inscripción."),
            "REVISION_REQUISITOS": ("COMPLETAR_DOCUMENTOS", "Completar revisión de requisitos", "Carga y aprueba los requisitos documentales de la revisión."),
            "EVALUACION_TRIBUNAL": ("REGISTRAR_EVALUACION_EXCELENCIA", "Registrar evaluación del tribunal", "Registra el resultado normativo del criterio seleccionado."),
            "REGISTRO_ACTA": ("CARGAR_ACTA_EXCELENCIA", "Cargar Acta de Excelencia Académica", "Carga y aprueba el acta que evidencia el resultado registrado."),
            "CONCLUSION_ACADEMICA": ("CONCLUIR_ACADEMICAMENTE", "Concluir académicamente", "Todas las condiciones normativas y el acta están completas."),
        }
        code, title, description = actions[stage]
        missing_actors = stage == "EVALUACION_TRIBUNAL" and any(
            item.get("tipo") == "ACTOR" and item.get("cumplido") is False
            for item in requirements
        )
        if missing_actors:
            code = "GESTIONAR_ACTORES"
            title = "Gestionar actores"
            description = "Completa los actores obligatorios antes de registrar la evaluación del tribunal."
        return {
            "operacion": "ORIENTAR_ETAPA",
            "mensaje": f"Sigue las condiciones normativas de Excelencia Académica mediante {expediente.criterio}.",
            "requisitos": requirements,
            "siguiente_accion": {
                "codigo": code, "titulo": title, "descripcion": description,
                "estado": "PENDIENTE" if missing else "DISPONIBLE",
                "estado_display": "Pendiente" if missing else "Disponible",
                "destino": "#actores" if missing_actors else "#excelencia" if stage in {"EVALUACION_TRIBUNAL", "CONCLUSION_ACADEMICA"} else "#documentos",
                "accion_label": title,
            },
            "conflictos_identidad": [],
        }

    def validar_inicio_etapa(self, seguimiento):
        if not ExcelenciaExpediente.objects.filter(postulacion=seguimiento.postulacion).exists():
            raise ValidationError("Excelencia Académica requiere seleccionar un criterio antes de iniciar el flujo.")

    def validar_aprobacion_etapa(self, seguimiento):
        expediente = ExcelenciaExpediente.objects.filter(postulacion=seguimiento.postulacion).first()
        if not expediente:
            raise ValidationError("El criterio de Excelencia Académica no está configurado.")
        if seguimiento.etapa.codigo == "INSCRIPCION":
            missing = [item["codigo"] for item in self._stage_requirements(
                seguimiento.postulacion, expediente, "INSCRIPCION",
            ) if not item["cumplido"]]
            if missing:
                raise ValidationError({"faltantes": missing})
        if seguimiento.etapa.codigo in {"REVISION_REQUISITOS", "REGISTRO_ACTA"}:
            missing = self._missing_documents(seguimiento.postulacion, expediente, seguimiento.etapa.codigo)
            if missing:
                raise ValidationError({"faltantes": missing})
        if seguimiento.etapa.codigo == "EVALUACION_TRIBUNAL":
            self._validate_tribunal(seguimiento.postulacion)
            if expediente.resultado != ExcelenciaExpediente.Resultado.FAVORABLE:
                raise ValidationError("La evaluación de Excelencia Académica debe ser favorable.")
        if seguimiento.etapa.codigo == "CONCLUSION_ACADEMICA":
            self.validar_conclusion_academica(seguimiento.postulacion)

    def validar_asignacion(self, *, queryset_contexto, tipo_participacion, orden_cargo, **kwargs):
        if tipo_participacion not in self.get_reglas_asignacion():
            raise ValidationError("Excelencia Académica solo admite los actores definidos por su normativa.")
        if tipo_participacion == "TRIBUNAL":
            if orden_cargo not in {1, 2}:
                raise ValidationError("Los dos tribunales docentes requieren órdenes 1 y 2.")
            if queryset_contexto.count() >= 2:
                raise ValidationError("Excelencia Académica admite dos tribunales docentes.")
        elif orden_cargo is not None:
            raise ValidationError("Este actor no admite orden de cargo.")
        elif queryset_contexto.count() >= 1:
            raise ValidationError("Este actor ya está asignado a la postulación.")

    def validar_conclusion_academica(self, postulacion):
        expediente = ExcelenciaExpediente.objects.filter(postulacion=postulacion).first()
        if not expediente:
            raise ValidationError("El criterio de Excelencia Académica no está configurado.")
        previous = {code for code, _name, _repeat in STAGE_DATA[:-1]}
        approved = set(postulacion.seguimientos_etapa.filter(etapa__codigo__in=previous, estado="APROBADA").values_list("etapa__codigo", flat=True))
        if approved != previous:
            raise ValidationError("Todas las etapas previas de Excelencia Académica deben estar aprobadas.")
        if expediente.resultado != ExcelenciaExpediente.Resultado.FAVORABLE:
            raise ValidationError("La evaluación de Excelencia Académica debe ser favorable.")
        self._validate_tribunal(postulacion)
        missing = self._missing_documents(postulacion, expediente, "CONCLUSION_ACADEMICA")
        if missing:
            raise ValidationError({"faltantes": missing})

    def _stage_requirements(self, postulacion, expediente, stage):
        if stage == "INSCRIPCION":
            return self._requisitos_inscripcion(postulacion)
        requirements = []
        for code in self._required_documents(expediente, stage):
            valid = code not in self._missing_documents(postulacion, expediente, stage, only={code})
            requirements.append({
                "tipo": "DOCUMENTO", "codigo": code, "nombre": code.replace("_", " ").title(),
                "cumplido": valid, "estado": "CUMPLIDO" if valid else "PENDIENTE",
                "estado_display": "Aprobado y vigente" if valid else "Pendiente", "destino": "#documentos",
            })
        if stage in {"EVALUACION_TRIBUNAL", "CONCLUSION_ACADEMICA"}:
            for role, minimum in self.get_reglas_asignacion().items():
                actual = postulacion.asignaciones.filter(activo=True, tipo_participacion=role).count()
                requirements.append({
                    "tipo": "ACTOR", "codigo": role, "nombre": dict(self._role_labels()).get(role, role),
                    "actual": actual, "minimo": minimum, "cumplido": actual >= minimum,
                    "estado": "CUMPLIDO" if actual >= minimum else "PENDIENTE",
                    "estado_display": f"{actual}/{minimum}", "destino": "#actores",
                })
        return requirements

    def _requisitos_inscripcion(self, postulacion):
        from apps.documentos.models import TipoDocumento
        from apps.postulantes.models import EntregaFisica

        codes = self.get_documentos_requeridos("INSCRIPCION")
        names = dict(TipoDocumento.objects.filter(codigo__in=codes).values_list("codigo", "nombre"))
        documents = {item.tipo_documento.codigo: item for item in postulacion.documentos.filter(
            activo=True, tipo_documento__codigo__in=codes,
        ).select_related("estado", "tipo_documento")}
        requirements = []
        for code in codes:
            document = documents.get(code)
            presented = bool(document and document.versiones.filter(activo=True, es_version_actual=True).exists())
            approved = bool(presented and document.estado.codigo == "APR" and not document.requiere_correccion)
            if not document:
                label = "No presentado"
            elif document.requiere_correccion or document.estado.codigo in {"OBS", "REC"}:
                label = "Requiere corrección"
            elif not presented:
                label = "Sin versión vigente"
            else:
                label = "Aprobado" if approved else "Pendiente de revisión administrativa"
            requirements.append({
                "tipo": "DOCUMENTO", "codigo": code, "nombre": names.get(code, code.replace("_", " ").title()),
                "cumplido": approved, "presentado": presented,
                "estado": "CUMPLIDO" if approved else "PENDIENTE", "estado_display": label,
                "destino": "#documentos",
            })
        for code in self.get_entregas_requeridas("INSCRIPCION"):
            delivery = postulacion.entregas_fisicas.filter(codigo=code, activo=True).first()
            complete = bool(delivery and delivery.estado == EntregaFisica.Estado.COMPLETA)
            requirements.append({
                "tipo": "ENTREGA_FISICA", "codigo": code,
                "nombre": "Fólder amarillo rotulado con el nombre del postulante y la modalidad elegida",
                "cumplido": complete, "estado": "CUMPLIDO" if complete else "PENDIENTE",
                "estado_display": "Recepción registrada" if complete else "Pendiente de recepción",
                "destino": "#inscripcion-entregas", "cantidad": delivery.cantidad if delivery else None,
            })
        return requirements

    def _orientar_inscripcion(self, postulacion, expediente):
        requirements = self._stage_requirements(postulacion, expediente, "INSCRIPCION")
        completed = sum(item["cumplido"] for item in requirements)
        total = len(requirements)
        documents = [item for item in requirements if item["tipo"] == "DOCUMENTO"]
        if any(not item["presentado"] or item["estado_display"] == "Requiere corrección" for item in documents):
            code, title, description, destination = (
                "COMPLETAR_DOCUMENTOS", "Completar documentos de Inscripción",
                "Presenta o corrige los documentos obligatorios de Inscripción de Excelencia Académica.", "#documentos",
            )
        elif any(not item["cumplido"] for item in documents):
            code, title, description, destination = (
                "GESTIONAR_DOCUMENTOS", "Revisión administrativa de documentos",
                "Los documentos presentados deben ser aprobados por personal administrativo.", "#documentos",
            )
        elif completed < total:
            code, title, description, destination = (
                "GESTIONAR_ENTREGA_FISICA", "Registrar recepción del fólder amarillo",
                "El personal administrativo debe registrar la recepción del fólder rotulado.", "#inscripcion-entregas",
            )
        else:
            code, title, description, destination = (
                "APROBAR_ETAPA", "Aprobar Inscripción",
                "Los requisitos de Inscripción de Excelencia Académica están cumplidos.", "#resumen",
            )
        complete = completed == total
        return {
            "operacion": "ORIENTAR_ETAPA", "mensaje": f"{completed}/{total} requisitos de Inscripción cumplidos. {description}",
            "requisitos": requirements, "requisitos_cumplidos": completed, "requisitos_totales": total,
            "permite_aprobar_etapa": complete, "conflictos_identidad": [],
            "siguiente_accion": {
                "codigo": code, "titulo": title, "descripcion": description,
                "estado": "DISPONIBLE" if complete else "PENDIENTE",
                "estado_display": "Disponible" if complete else "Pendiente", "destino": destination,
                "accion_label": "Ir a recepción física" if code == "GESTIONAR_ENTREGA_FISICA" else "Ir a documentos" if destination == "#documentos" else title,
            },
        }

    def _required_documents(self, expediente, stage):
        documents = list(self.requisitos_policy.get_documentos_requeridos(stage))
        if stage == "REVISION_REQUISITOS" and expediente.criterio == ExcelenciaExpediente.Criterio.RENDIMIENTO_ACADEMICO:
            documents = [code for code in documents if code not in QUALITY_DOCUMENTS]
        return tuple(documents)

    def _missing_documents(self, postulacion, expediente, stage, only=None):
        from apps.documentos.models import DocumentoPostulacion, VersionDocumento
        required = set(only or self._required_documents(expediente, stage))
        valid_codes = set(
            DocumentoPostulacion.objects.filter(
                postulacion=postulacion, activo=True, estado__codigo="APR",
                tipo_documento__codigo__in=required,
            ).filter(
                versiones__activo=True, versiones__es_version_actual=True,
            ).values_list("tipo_documento__codigo", flat=True)
        )
        return sorted(required - valid_codes)

    def _validate_tribunal(self, postulacion):
        for role, minimum in self.get_reglas_asignacion().items():
            count = postulacion.asignaciones.filter(activo=True, tipo_participacion=role).count()
            if count < minimum:
                raise ValidationError({"asignaciones": f"Falta completar {role}: {count}/{minimum}."})

    @staticmethod
    def _role_labels():
        return (
            ("PRESIDENTE", "Presidente"),
            ("SECRETARIO", "Secretario"),
            ("TRIBUNAL", "Tribunal docente"),
            ("DIRECTOR_INSTITUTO_INVESTIGACION", "Director del Instituto de Investigación"),
        )
