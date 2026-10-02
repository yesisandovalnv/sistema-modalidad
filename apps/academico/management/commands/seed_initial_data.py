from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.academico.models import EtapaModalidad, Modalidad, ModalidadRequisito, Requisito
from apps.documentos.models import EstadoDocumento, TipoDocumento
from apps.postulantes.models import EstadoPostulacion


OFFICIAL_MODALIDADES = [
    {
        "codigo": "PROYECTO_GRADO",
        "nombre": "Proyecto de Grado",
        "descripcion": "Modalidad oficial de graduacion mediante proyecto de grado.",
    },
    {
        "codigo": "TRABAJO_DIRIGIDO",
        "nombre": "Trabajo Dirigido",
        "descripcion": "Modalidad oficial de graduacion mediante trabajo dirigido.",
    },
    {
        "codigo": "TESIS_GRADO",
        "nombre": "Tesis de Grado",
        "descripcion": "Modalidad oficial de graduacion mediante tesis de grado.",
    },
    {
        "codigo": "GRADUACION_VIA_DIPLOMADO",
        "nombre": "Graduacion Via Diplomado",
        "descripcion": "Modalidad oficial de graduacion mediante diplomado validado.",
    },
    {
        "codigo": "EXCELENCIA_ACADEMICA",
        "nombre": "Excelencia Academica",
        "descripcion": "Modalidad oficial de graduacion por excelencia academica.",
    },
    {
        "codigo": "EXAMEN_GRADO",
        "nombre": "Examen de Grado",
        "descripcion": "Modalidad oficial de graduacion mediante examen de grado.",
    },
]

OFFICIAL_ESTADOS_POSTULACION = [
    {"codigo": "REGISTRADA", "nombre": "Registrada", "descripcion": "Postulacion registrada y pendiente de revision."},
    {"codigo": "EN_PROCESO", "nombre": "En proceso", "descripcion": "Postulacion con flujo academico en proceso."},
    {"codigo": "EN_REVISION", "nombre": "En revision", "descripcion": "Postulacion en revision academica o administrativa."},
    {"codigo": "OBSERVADA", "nombre": "Observada", "descripcion": "Postulacion observada a la espera de subsanacion."},
    {"codigo": "SUBSANADA", "nombre": "Subsanada", "descripcion": "Postulacion subsanada y reenviada para revision."},
    {"codigo": "APROBADA", "nombre": "Aprobada", "descripcion": "Postulacion aprobada para continuar el flujo."},
    {"codigo": "RECHAZADA", "nombre": "Rechazada", "descripcion": "Postulacion rechazada dentro del proceso."},
    {"codigo": "CONCLUIDA", "nombre": "Concluida", "descripcion": "Postulacion concluida y cerrada."},
]

OFFICIAL_ESTADOS_DOCUMENTO = [
    {"codigo": "ENV", "nombre": "Enviado", "descripcion": "Documento enviado por el postulante."},
    {"codigo": "REV", "nombre": "En revision", "descripcion": "Documento en revision."},
    {"codigo": "OBS", "nombre": "Observado", "descripcion": "Documento observado para correccion."},
    {"codigo": "APR", "nombre": "Aprobado", "descripcion": "Documento aprobado."},
    {"codigo": "REC", "nombre": "Rechazado", "descripcion": "Documento rechazado."},
]

OFFICIAL_TIPOS_DOCUMENTO = [
    {
        "codigo": "CARTA_SOLICITUD_PROYECTO",
        "nombre": "Carta de Solicitud de Proyecto de Grado",
        "descripcion": "Carta dirigida a la Dirección de Carrera con la modalidad y el tema a investigar o los términos de referencia.",
        "obligatorio": True,
        "permite_multiple_version": True,
        "tamano_maximo_mb": 10,
        "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "INFORME_REVISION_TRIBUNAL_PREVIA",
        "nombre": "Informe de Evaluación del Tribunal",
        "descripcion": "Evidencia del resultado suficiente o insuficiente emitido en la revisión previa del tribunal.",
        "obligatorio": True,
        "permite_multiple_version": True,
        "tamano_maximo_mb": 10,
        "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "DOCUMENTO_FINAL",
        "nombre": "Documento Final",
        "descripcion": "Documento académico final de la modalidad de graduación, presentado para revisión y aprobación.",
        "obligatorio": True,
        "permite_multiple_version": True,
        "tamano_maximo_mb": 10,
        "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "ACTA_DEFENSA",
        "nombre": "Acta de Defensa",
        "descripcion": "Acta que registra el resultado de una defensa vinculada a la postulación de Proyecto de Grado.",
        "obligatorio": True,
        "permite_multiple_version": False,
        "tamano_maximo_mb": 10,
        "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "OBSERVACIONES_DEFENSA_PERFIL",
        "nombre": "Hoja de observaciones de Defensa de Perfil",
        "descripcion": "Documento oficial de observaciones entregado por la universidad después de la Defensa de Perfil.",
        "obligatorio": False,
        "permite_multiple_version": True,
        "tamano_maximo_mb": 10,
        "extensiones_permitidas": "pdf",
    },
    {
        "codigo": "HOJA_APROBACION",
        "nombre": "Hoja de Aprobación",
        "descripcion": "Hoja académico-legal que acredita la aprobación posterior a la defensa de Proyecto de Grado.",
        "obligatorio": True,
        "permite_multiple_version": False,
        "tamano_maximo_mb": 10,
        "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "INFORME_FINAL_TUTOR",
        "nombre": "Informe Final del Tutor",
        "descripcion": "Informe final del tutor que respalda la presentación y revisión del Proyecto de Grado.",
        "obligatorio": True,
        "permite_multiple_version": True,
        "tamano_maximo_mb": 10,
        "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "CARTA_SOLICITUD_EXAMEN",
        "nombre": "Carta de Solicitud de Examen de Grado",
        "descripcion": "Solicitud formal para la modalidad Examen de Grado por Contenidos.",
        "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "HISTORIAL_ACADEMICO",
        "nombre": "Historial Académico",
        "descripcion": "Historial académico requerido para Examen de Grado por Contenidos.",
        "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "FOLDER_AMARILLO",
        "nombre": "Fólder Amarillo",
        "descripcion": "Registro documental del fólder amarillo exigido por la normativa de Examen.",
        "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "ACTA_EXAMEN",
        "nombre": "Acta de Examen de Grado",
        "descripcion": "Acta que registra el resultado del Examen de Grado por Contenidos.",
        "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "HOJA_APROBACION_EXAMEN",
        "nombre": "Hoja de Aprobación de Examen de Grado",
        "descripcion": "Hoja de aprobación firmada del Examen de Grado por Contenidos.",
        "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "CARTA_EXCELENCIA",
        "nombre": "Carta de Solicitud de Excelencia Académica",
        "descripcion": "Solicitud a la Dirección de Carrera con el criterio normativo elegido.",
        "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "RECIBO_MATRICULA_EXC",
        "nombre": "Recibo de Matrícula de Excelencia Académica",
        "descripcion": "Fotocopia del recibo de pago de matrícula del periodo vigente.",
        "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "HISTORIAL_EXCELENCIA",
        "nombre": "Historial Académico de Excelencia",
        "descripcion": "Historial académico oficial para acreditar las condiciones normativas.",
        "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "FOLDER_EXCELENCIA",
        "nombre": "Fólder Amarillo de Excelencia Académica",
        "descripcion": "Fólder amarillo rotulado con el nombre del postulante y la modalidad.",
        "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "CERT_DIR_CARRERA",
        "nombre": "Certificación de la Dirección de Carrera",
        "descripcion": "Certificación normativa de actividades documentadas de interacción social.",
        "obligatorio": False, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "CERT_INST_INVEST",
        "nombre": "Certificación del Instituto de Investigación",
        "descripcion": "Certificación normativa de actividades documentadas de investigación.",
        "obligatorio": False, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "CERT_PLANIFICACION",
        "nombre": "Certificado de Planificación Académica",
        "descripcion": "Certificado de no tener pendiente documentación de admisión.",
        "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "SOLVENCIA_UNIV",
        "nombre": "Solvencia Universitaria",
        "descripcion": "Certificado de no tener cuentas pendientes con la Universidad ni la Carrera.",
        "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "SOLVENCIA_BIBLIO",
        "nombre": "Solvencia Bibliotecaria",
        "descripcion": "Certificado de no adeudar libros o documentos de las bibliotecas.",
        "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "TIMBRE_EXCELENCIA",
        "nombre": "Timbre Universitario de Excelencia Académica",
        "descripcion": "Evidencia del pago del valor universitario de la modalidad.",
        "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx",
    },
    {
        "codigo": "ACTA_EXCELENCIA",
        "nombre": "Acta de Excelencia Académica",
        "descripcion": "Acta que registra el resultado de la evaluación de Excelencia Académica.",
        "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx",
    },
    {"codigo": "CARTA_DIPLOMADO", "nombre": "Carta de inscripción a Diplomado", "descripcion": "Carta dirigida a la Dirección de Carrera.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "MATRICULA_DIPLOMADO", "nombre": "Matrícula vigente de Diplomado", "descripcion": "Recibo de matrícula académica vigente.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "SOLICITUD_AREA_DIPL", "nombre": "Solicitud de área de Diplomado", "descripcion": "Solicitud formal a un área afín de formación.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "BOLETA_PROG_DIPL", "nombre": "Boleta de programación de Diplomado", "descripcion": "Boleta otorgada por la Jefatura de Estudios.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "HISTORIAL_DIPLOMADO", "nombre": "Historial académico para Diplomado", "descripcion": "Historial que acredita las asignaturas vencidas.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "CEDULA_IDENTIDAD", "nombre": "Cédula de identidad", "descripcion": "Fotocopia simple de la cédula de identidad.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,jpg,jpeg,png"},
    {"codigo": "ADMISION_DIPL", "nombre": "Admisión completa para Diplomado", "descripcion": "Certificado de documentación de admisión completa.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "SOLVENCIA_DIPLOMADO", "nombre": "Solvencia universitaria y bibliotecaria", "descripcion": "Solvencias exigidas por el Artículo 12.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "MONOGRAFIA_DIPLOMADO", "nombre": "Monografía de Diplomado", "descripcion": "Monografía firmada por el docente del Taller de Investigación.", "obligatorio": True, "permite_multiple_version": True, "tamano_maximo_mb": 20, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "NOTAS_MODULOS_DIPL", "nombre": "Certificado de notas de módulos", "descripcion": "Certificado original de aprobación de todos los módulos.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "CARTA_DEFENSA_DIPL", "nombre": "Carta de solicitud de defensa", "descripcion": "Carta al Vicerrectorado de Posgrado solicitando defensa.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "MATR_DEFENSA_DIPL", "nombre": "Matrícula vigente para defensa", "descripcion": "Recibo de matrícula vigente al momento de la defensa.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "BOLETA_DEFENSA_DIPL", "nombre": "Boleta de programación para defensa", "descripcion": "Boleta vigente de programación de la modalidad.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "TIMBRE_DEFENSA_DIPL", "nombre": "Timbre universitario para defensa", "descripcion": "Timbre por el valor universitario de la defensa pública.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "SOLV_POSGRADO_DIPL", "nombre": "Solvencia económica de Posgrado", "descripcion": "Solvencia económica por el costo total del Diplomado.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "ACTA_DEFENSA_DIPL", "nombre": "Acta de Defensa de Diplomado", "descripcion": "Acta con calificación final y observaciones.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "MONOGRAFIA_EMPAST_D", "nombre": "Monografía empastada de Diplomado", "descripcion": "Cuatro ejemplares físicos para distribución institucional.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 20, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "CARTA_SOLICITUD_TD", "nombre": "Carta de solicitud de Trabajo Dirigido", "descripcion": "Solicitud a la Dirección de Carrera con modalidad y tema o términos de referencia.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "MATRICULA_VIGENTE_TD", "nombre": "Matrícula vigente de Trabajo Dirigido", "descripcion": "Recibo de matrícula del periodo académico vigente.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "HISTORIAL_PRERREQ_TD", "nombre": "Historial de prerrequisitos de Trabajo Dirigido", "descripcion": "Historial que acredita los prerrequisitos de Metodología de la Investigación II.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "FOLDER_AMARILLO_TD", "nombre": "Fólder amarillo de Trabajo Dirigido", "descripcion": "Fólder amarillo rotulado con nombre y modalidad.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,jpg,jpeg,png"},
    {"codigo": "PERFIL_TRABAJO_DIRIGIDO", "nombre": "Perfil de Trabajo Dirigido", "descripcion": "Perfil con la estructura exigida por el Capítulo IV.", "obligatorio": True, "permite_multiple_version": True, "tamano_maximo_mb": 20, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "INFORME_TUTOR_PERFIL_TD", "nombre": "Informe del Tutor sobre el perfil", "descripcion": "Informe que acompaña la presentación del perfil.", "obligatorio": True, "permite_multiple_version": True, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "CONVENIO_TRABAJO_DIRIGIDO", "nombre": "Convenio de Trabajo Dirigido Externo", "descripcion": "Convenio entre la Universidad y la institución para Trabajo Dirigido Externo.", "obligatorio": False, "permite_multiple_version": True, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "INFORME_SUPERVISION_TD", "nombre": "Informe periódico de supervisión institucional", "descripcion": "Informe de desempeño emitido por el supervisor institucional.", "obligatorio": True, "permite_multiple_version": True, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "DOCUMENTO_FINAL_TD", "nombre": "Documento Final de Trabajo Dirigido", "descripcion": "Documento final conforme a la estructura del Capítulo VI.", "obligatorio": True, "permite_multiple_version": True, "tamano_maximo_mb": 20, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "INFORME_FINAL_TUTOR_TD", "nombre": "Informe final del Tutor de Trabajo Dirigido", "descripcion": "Informe suficiente o insuficiente emitido por el Tutor.", "obligatorio": True, "permite_multiple_version": True, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "INFORME_REVISION_TRIBUNAL_TD", "nombre": "Informe de revisión del Tribunal de Trabajo Dirigido", "descripcion": "Dictamen suficiente o insuficiente del Tribunal sobre el documento final.", "obligatorio": True, "permite_multiple_version": True, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "OFICIO_PRESENTACION_TD", "nombre": "Oficio de presentación del Trabajo Final", "descripcion": "Oficio dirigido a la Dirección de Carrera.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "HISTORIAL_PLAN_TD", "nombre": "Historial académico para defensa", "descripcion": "Historial con el plan vencido salvo Modalidad de Graduación.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "INFORME_CONCLUSION_TUTOR_TD", "nombre": "Informe de conclusión del Tutor", "descripcion": "Informe de conclusión del trabajo de investigación.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "CERT_ADMISION_TD", "nombre": "Certificado de admisión completa", "descripcion": "Certificado de Planificación Académica sin documentos pendientes.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "SOLVENCIA_UNIV_TD", "nombre": "Solvencia universitaria de Trabajo Dirigido", "descripcion": "Certificado de no tener cuentas pendientes.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "SOLVENCIA_BIBLIO_TD", "nombre": "Solvencia bibliotecaria de Trabajo Dirigido", "descripcion": "Certificado de no adeudar material bibliográfico.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "MATRICULA_DEFENSA_TD", "nombre": "Matrícula vigente para defensa de Trabajo Dirigido", "descripcion": "Recibo de matrícula como alumno regular.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "TIMBRE_DEFENSA_TD", "nombre": "Timbre universitario para defensa de Trabajo Dirigido", "descripcion": "Pago del valor universitario para la defensa pública.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,jpg,jpeg,png"},
    {"codigo": "CARTA_CONFORMIDAD_INSTITUCION_TD", "nombre": "Carta de conformidad institucional", "descripcion": "Carta de la institución que acredita conformidad con el trabajo realizado.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
    {"codigo": "ACTA_DEFENSA_TD", "nombre": "Acta de Defensa de Trabajo Dirigido", "descripcion": "Acta con el resultado inapelable de la defensa.", "obligatorio": True, "permite_multiple_version": False, "tamano_maximo_mb": 10, "extensiones_permitidas": "pdf,doc,docx"},
]

OFFICIAL_ETAPAS_MODALIDAD = {
    "PROYECTO_GRADO": [
        {
            "codigo": "INSCRIPCION",
            "nombre": "Inscripción",
            "orden": 1,
            "obligatoria": True,
            "permite_repeticion": False,
            "origen_normativo": "Reglamento específico de Proyecto de Grado, Capítulo II.",
        },
        {
            "codigo": "PERFIL_PROYECTO",
            "nombre": "Perfil de Proyecto",
            "orden": 2,
            "obligatoria": True,
            "permite_repeticion": True,
            "origen_normativo": "Reglamento específico de Proyecto de Grado, Capítulo III.",
        },
        {
            "codigo": "DOCUMENTO_FINAL",
            "nombre": "Documento Final",
            "orden": 3,
            "obligatoria": True,
            "permite_repeticion": False,
            "origen_normativo": "Reglamento específico de Proyecto de Grado, Capítulo IV.",
        },
        {
            "codigo": "REVISION_TRIBUNAL_PREVIA",
            "nombre": "Revisión de Tribunal Previa",
            "orden": 4,
            "obligatoria": True,
            "permite_repeticion": False,
            "origen_normativo": "Reglamento específico de Proyecto de Grado, Capítulo V, revisión e informes del tribunal.",
        },
        {
            "codigo": "DEFENSA_PRIVADA",
            "nombre": "Defensa Privada",
            "orden": 5,
            "obligatoria": True,
            "permite_repeticion": False,
            "origen_normativo": "Reglamento específico de Proyecto de Grado, Capítulos VI y VII, más diagrama oficial.",
        },
        {
            "codigo": "DEFENSA_PUBLICA",
            "nombre": "Defensa Pública",
            "orden": 6,
            "obligatoria": True,
            "permite_repeticion": False,
            "origen_normativo": "Reglamento específico de Proyecto de Grado, Capítulos VI y VII, más diagrama oficial.",
        },
        {
            "codigo": "REVISION_FINAL_POST_PUBLICA",
            "nombre": "Revisión Final Post Pública",
            "orden": 7,
            "obligatoria": True,
            "permite_repeticion": False,
            "origen_normativo": "Diagrama oficial, bloque de revisión posterior y correcciones.",
        },
        {
            "codigo": "CIERRE_DOCUMENTAL",
            "nombre": "Cierre Documental",
            "orden": 8,
            "obligatoria": True,
            "permite_repeticion": False,
            "origen_normativo": "Reglamento específico, acta y hoja de aprobación, más cierre del diagrama.",
        },
    ],
    "TESIS_GRADO": [
        {"codigo": "INSCRIPCION", "nombre": "Inscripción", "orden": 1, "obligatoria": True, "permite_repeticion": False,
         "origen_normativo": "Reglamento de Tesis de Grado CIS, Capítulo II."},
        {"codigo": "TEMATICA_TESIS", "nombre": "Temática de Tesis", "orden": 2, "obligatoria": True, "permite_repeticion": False,
         "origen_normativo": "Reglamento de Tesis de Grado CIS, Capítulo III: temática ante tribunal de tres docentes."},
        {"codigo": "PERFIL_TESIS", "nombre": "Perfil de Tesis", "orden": 3, "obligatoria": True, "permite_repeticion": True,
         "origen_normativo": "Reglamento de Tesis de Grado CIS, Capítulo III: suficiente/insuficiente y segunda defensa."},
        {"codigo": "DOCUMENTO_FINAL", "nombre": "Documento Final", "orden": 4, "obligatoria": True, "permite_repeticion": False,
         "origen_normativo": "Reglamento de Tesis de Grado CIS, Capítulo IV."},
        {"codigo": "REVISION_TUTOR", "nombre": "Revisión de Tutor", "orden": 5, "obligatoria": True, "permite_repeticion": False,
         "origen_normativo": "Reglamento de Tesis de Grado CIS, Capítulo V."},
        {"codigo": "REVISION_TRIBUNAL", "nombre": "Revisión de Tribunal", "orden": 6, "obligatoria": True, "permite_repeticion": False,
         "origen_normativo": "Reglamento de Tesis de Grado CIS, Capítulo V."},
        {"codigo": "DEFENSA_PRIVADA", "nombre": "Defensa Privada", "orden": 7, "obligatoria": True, "permite_repeticion": True,
         "origen_normativo": "Reglamento de Tesis de Grado CIS, Capítulos VI y VII; implementación posterior."},
        {"codigo": "DEFENSA_PUBLICA", "nombre": "Defensa Pública", "orden": 8, "obligatoria": True, "permite_repeticion": True,
         "origen_normativo": "Reglamento de Tesis de Grado CIS, Capítulos VI y VII; implementación posterior."},
    ],
    "EXAMEN_GRADO": [
        {"codigo": "INSCRIPCION", "nombre": "Inscripción", "orden": 1, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento de Examen de Grado por Contenidos, Capítulo II."},
        {"codigo": "PREPARACION_EXAMEN", "nombre": "Preparación y habilitación", "orden": 2, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento de Examen de Grado por Contenidos, Capítulo III."},
        {"codigo": "AREA_1", "nombre": "Área 1: Ciencias Básicas y Matemáticas", "orden": 3, "obligatoria": True, "permite_repeticion": True, "origen_normativo": "Reglamento de Examen de Grado por Contenidos, Capítulos III, IV y VII."},
        {"codigo": "AREA_2", "nombre": "Área 2: Ciencias Sociales y Humanísticas", "orden": 4, "obligatoria": True, "permite_repeticion": True, "origen_normativo": "Reglamento de Examen de Grado por Contenidos, Capítulos III, IV y VII."},
        {"codigo": "AREA_3", "nombre": "Área 3: Ciencias de la Ingeniería", "orden": 5, "obligatoria": True, "permite_repeticion": True, "origen_normativo": "Reglamento de Examen de Grado por Contenidos, Capítulos III, IV y VII."},
        {"codigo": "AREA_4", "nombre": "Área 4: Ingeniería Aplicada", "orden": 6, "obligatoria": True, "permite_repeticion": True, "origen_normativo": "Reglamento de Examen de Grado por Contenidos, Capítulos III, IV y VII."},
        {"codigo": "DOCUMENTACION_FINAL", "nombre": "Documentación final", "orden": 7, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento de Examen de Grado por Contenidos, Capítulo VII."},
        {"codigo": "CONCLUSION_ACADEMICA", "nombre": "Conclusión académica", "orden": 8, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento de Examen de Grado por Contenidos, Capítulos VII y IX."},
    ],
    "EXCELENCIA_ACADEMICA": [
        {"codigo": "INSCRIPCION", "nombre": "Inscripción", "orden": 1, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento de Graduación por Excelencia Académica CIS-Ver 2013, Capítulos I y II."},
        {"codigo": "REVISION_REQUISITOS", "nombre": "Revisión de requisitos", "orden": 2, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento de Graduación por Excelencia Académica CIS-Ver 2013, Capítulo II."},
        {"codigo": "EVALUACION_TRIBUNAL", "nombre": "Evaluación del tribunal", "orden": 3, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento de Graduación por Excelencia Académica CIS-Ver 2013, Capítulo II."},
        {"codigo": "REGISTRO_ACTA", "nombre": "Registro del acta", "orden": 4, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento de Graduación por Excelencia Académica CIS-Ver 2013, Capítulo II."},
        {"codigo": "CONCLUSION_ACADEMICA", "nombre": "Conclusión académica", "orden": 5, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento de Graduación por Excelencia Académica CIS-Ver 2013, Capítulos I y III."},
    ],
    "GRADUACION_VIA_DIPLOMADO": [
        {"codigo": "INSCRIPCION", "nombre": "Inscripción", "orden": 1, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento Vía Diplomado 2026, Artículo 12."},
        {"codigo": "MODULO_1", "nombre": "Módulo 1", "orden": 2, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento Vía Diplomado 2026, Artículos 9 y 15."},
        {"codigo": "MODULO_2", "nombre": "Módulo 2", "orden": 3, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento Vía Diplomado 2026, Artículos 9 y 15."},
        {"codigo": "MODULO_3", "nombre": "Módulo 3", "orden": 4, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento Vía Diplomado 2026, Artículos 9 y 15."},
        {"codigo": "MODULO_4", "nombre": "Módulo 4", "orden": 5, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento Vía Diplomado 2026, Artículos 9 y 15."},
        {"codigo": "TALLER_INVESTIGACION", "nombre": "Taller de Investigación", "orden": 6, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento Vía Diplomado 2026, Artículos 9 y 15."},
        {"codigo": "REVISION_MONOGRAFIA", "nombre": "Revisión de Monografía", "orden": 7, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento Vía Diplomado 2026, Artículo 15."},
        {"codigo": "DEFENSA_PUBLICA", "nombre": "Defensa Pública", "orden": 8, "obligatoria": True, "permite_repeticion": True, "origen_normativo": "Reglamento Vía Diplomado 2026, Artículos 18 al 28."},
        {"codigo": "CIERRE_DOCUMENTAL", "nombre": "Cierre documental", "orden": 9, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento Vía Diplomado 2026, Artículos 29 y 30."},
        {"codigo": "CONCLUSION_ACADEMICA", "nombre": "Conclusión académica", "orden": 10, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento Vía Diplomado 2026, Artículo 30."},
    ],
    "TRABAJO_DIRIGIDO": [
        {"codigo": "INSCRIPCION", "nombre": "Inscripción", "orden": 1, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento de Trabajo Dirigido CIS 2013, Capítulo II."},
        {"codigo": "PERFIL_TRABAJO_DIRIGIDO", "nombre": "Perfil de Trabajo Dirigido", "orden": 2, "obligatoria": True, "permite_repeticion": True, "origen_normativo": "Reglamento de Trabajo Dirigido CIS 2013, Capítulo IV."},
        {"codigo": "DESARROLLO_TRABAJO_DIRIGIDO", "nombre": "Desarrollo y seguimiento institucional", "orden": 3, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento de Trabajo Dirigido CIS 2013, Capítulos V y VI."},
        {"codigo": "DOCUMENTO_FINAL", "nombre": "Documento Final", "orden": 4, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento de Trabajo Dirigido CIS 2013, Capítulo VI."},
        {"codigo": "REVISION_TRIBUNAL_PREVIA", "nombre": "Revisión de Tribunal Previa", "orden": 5, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento de Trabajo Dirigido CIS 2013, Capítulo VII."},
        {"codigo": "DEFENSA_PRIVADA", "nombre": "Defensa Privada", "orden": 6, "obligatoria": True, "permite_repeticion": True, "origen_normativo": "Reglamento de Trabajo Dirigido CIS 2013, capítulos de organización y evaluación."},
        {"codigo": "DEFENSA_PUBLICA", "nombre": "Defensa Pública", "orden": 7, "obligatoria": True, "permite_repeticion": True, "origen_normativo": "Reglamento de Trabajo Dirigido CIS 2013, capítulos de organización y evaluación; referencias a Proyecto tratadas como error material de copia."},
        {"codigo": "CIERRE_DOCUMENTAL", "nombre": "Cierre Documental", "orden": 8, "obligatoria": True, "permite_repeticion": False, "origen_normativo": "Reglamento de Trabajo Dirigido CIS 2013, acta y resultado final."},
    ],
}

REQUIREMENTS_JSON_PATH = Path(__file__).resolve().parents[2] / "data" / "requisitos_oficiales.json"


@dataclass
class SeedSummary:
    created: int = 0
    updated: int = 0
    existing: int = 0
    errors: int = 0
    omitted: int = 0


class Command(BaseCommand):
    help = "Carga los catalogos iniciales oficiales del sistema sin duplicar registros."

    def add_arguments(self, parser):
        parser.add_argument(
            "--tipo-documento-codigo",
            dest="tipo_documento_codigo",
            help="Sincroniza únicamente la definición oficial del tipo documental indicado.",
        )

    def handle(self, *args, **options):
        self.summary = SeedSummary()
        self.omitted_sections: list[str] = []

        try:
            with transaction.atomic():
                tipo_documento_codigo = options.get("tipo_documento_codigo")
                if tipo_documento_codigo is not None:
                    self._seed_tipo_documento_codigo(tipo_documento_codigo)
                else:
                    self._seed_modalidades()
                    self._seed_estados_postulacion()
                    self._seed_estados_documento()
                    self._seed_tipos_documento()
                    self._seed_etapas_modalidad()
                    self._seed_official_matrix_catalogs()
        except Exception as exc:
            self.summary.errors += 1
            self.stderr.write(self.style.ERROR(f"Error al cargar catalogos iniciales: {exc}"))
            self._print_summary()
            raise

        self.stdout.write(self.style.SUCCESS("Catalogos iniciales cargados correctamente."))
        self._print_summary()

    def _seed_modalidades(self) -> None:
        self._upsert_records(
            model=Modalidad,
            records=OFFICIAL_MODALIDADES,
            defaults_fields=("nombre", "descripcion", "activo"),
        )

    def _seed_estados_postulacion(self) -> None:
        self._upsert_records(
            model=EstadoPostulacion,
            records=OFFICIAL_ESTADOS_POSTULACION,
            defaults_fields=("nombre", "descripcion", "activo"),
        )

    def _seed_estados_documento(self) -> None:
        self._upsert_records(
            model=EstadoDocumento,
            records=OFFICIAL_ESTADOS_DOCUMENTO,
            defaults_fields=("nombre", "descripcion", "activo"),
        )

    def _seed_tipos_documento(self) -> None:
        for document_data in OFFICIAL_TIPOS_DOCUMENTO:
            self._upsert_tipo_documento(document_data)

    def _seed_tipo_documento_codigo(self, codigo: str) -> None:
        codigo = (codigo or "").strip()
        if not codigo:
            raise CommandError("Debe indicar un código de tipo documental.")

        definition = next((
            document_data
            for document_data in OFFICIAL_TIPOS_DOCUMENTO
            if document_data["codigo"] == codigo
        ), None)
        payload = self._load_requirements_payload()
        for modalidad_data in payload["modalidades"]:
            if not isinstance(modalidad_data, dict):
                continue
            modalidad_codigo = modalidad_data.get("codigo_modalidad")
            document_types = modalidad_data.get("tipos_documento")
            if not isinstance(document_types, list):
                continue
            for document_data in document_types:
                if not isinstance(document_data, dict) or document_data.get("codigo") != codigo:
                    continue
                if not isinstance(modalidad_codigo, str) or not modalidad_codigo.strip():
                    raise CommandError("La definición seleccionada no tiene modalidad oficial válida.")
                definition = self._validate_tipo_documento_data(document_data, modalidad_codigo)

        if definition is None:
            raise CommandError(f"No existe una definición oficial para el tipo documental '{codigo}'.")

        self._upsert_tipo_documento(definition)

    def _seed_etapas_modalidad(self) -> None:
        for codigo_modalidad, etapas in OFFICIAL_ETAPAS_MODALIDAD.items():
            modalidad = Modalidad.all_objects.filter(codigo=codigo_modalidad).first()
            if not modalidad:
                raise CommandError(f"La modalidad '{codigo_modalidad}' no existe en la base de datos.")

            for etapa_data in etapas:
                values = {
                    "nombre": etapa_data["nombre"],
                    "orden": etapa_data["orden"],
                    "obligatoria": etapa_data["obligatoria"],
                    "permite_repeticion": etapa_data["permite_repeticion"],
                    "origen_normativo": etapa_data["origen_normativo"],
                    "activo": True,
                }
                existing = EtapaModalidad.all_objects.filter(
                    modalidad=modalidad,
                    codigo=etapa_data["codigo"],
                ).first()
                _, created = EtapaModalidad.all_objects.update_or_create(
                    modalidad=modalidad,
                    codigo=etapa_data["codigo"],
                    defaults=values,
                )
                self._track_update_or_create(existing=existing, created=created, expected_values=values)

    def _seed_official_matrix_catalogs(self) -> None:
        payload = self._load_requirements_payload()
        modalidades = payload["modalidades"]
        if not modalidades:
            self.omitted_sections.append("No existen requisitos oficiales validados para cargar.")
            self.summary.omitted += 1
            return

        for modalidad_data in modalidades:
            modalidad = self._validate_modalidad_data(modalidad_data)
            for tipo_documento_data in modalidad_data["tipos_documento"]:
                document_data = self._validate_tipo_documento_data(tipo_documento_data, modalidad.codigo)
                self._upsert_tipo_documento(document_data)
                requisito = self._upsert_requisito(document_data)
                self._upsert_modalidad_requisito(
                    modalidad=modalidad,
                    requisito=requisito,
                    orden=document_data["orden"],
                )

    def _load_requirements_payload(self) -> dict[str, Any]:
        requirements_path = self._get_requirements_json_path()
        if not requirements_path.exists():
            raise CommandError(f"No existe el archivo de requisitos oficiales: {requirements_path}")

        try:
            payload = json.loads(requirements_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CommandError("El archivo de requisitos oficiales contiene JSON mal formado.") from exc

        if not isinstance(payload, dict):
            raise CommandError("La estructura principal del JSON de requisitos oficiales es invalida.")

        for field in ("version", "fuente", "modalidades"):
            if field not in payload:
                raise CommandError(f"Falta el campo principal '{field}' en el JSON de requisitos oficiales.")

        if not isinstance(payload["version"], str) or not payload["version"].strip():
            raise CommandError("El campo 'version' debe ser una cadena no vacia.")
        if not isinstance(payload["fuente"], str):
            raise CommandError("El campo 'fuente' debe ser una cadena.")
        if not isinstance(payload["modalidades"], list):
            raise CommandError("El campo 'modalidades' debe ser una lista.")

        return payload

    def _get_requirements_json_path(self) -> Path:
        return REQUIREMENTS_JSON_PATH

    def _validate_modalidad_data(self, modalidad_data: Any) -> Modalidad:
        if not isinstance(modalidad_data, dict):
            raise CommandError("Cada modalidad del JSON debe ser un objeto.")

        codigo_modalidad = modalidad_data.get("codigo_modalidad")
        if not isinstance(codigo_modalidad, str) or not codigo_modalidad.strip():
            raise CommandError("Cada modalidad debe incluir un 'codigo_modalidad' no vacio.")

        tipos_documento = modalidad_data.get("tipos_documento")
        if not isinstance(tipos_documento, list):
            raise CommandError(
                f"La modalidad '{codigo_modalidad.strip()}' debe incluir 'tipos_documento' como lista."
            )

        modalidad = Modalidad.all_objects.filter(codigo=codigo_modalidad.strip()).first()
        if not modalidad:
            raise CommandError(f"La modalidad '{codigo_modalidad.strip()}' no existe en la base de datos.")

        return modalidad

    def _validate_tipo_documento_data(self, tipo_documento_data: Any, modalidad_codigo: str) -> dict[str, Any]:
        if not isinstance(tipo_documento_data, dict):
            raise CommandError(f"Cada tipo_documento de la modalidad '{modalidad_codigo}' debe ser un objeto.")

        codigo = tipo_documento_data.get("codigo")
        nombre = tipo_documento_data.get("nombre")
        obligatorio = tipo_documento_data.get("obligatorio")
        orden = tipo_documento_data.get("orden")
        extensiones_permitidas = tipo_documento_data.get("extensiones_permitidas")
        tamano_maximo_mb = tipo_documento_data.get("tamano_maximo_mb")
        permite_multiple_version = tipo_documento_data.get("permite_multiple_version")
        descripcion = tipo_documento_data.get("descripcion")

        if not isinstance(codigo, str) or not codigo.strip():
            raise CommandError(
                f"La modalidad '{modalidad_codigo}' contiene un tipo_documento con 'codigo' vacio."
            )
        if not isinstance(nombre, str) or not nombre.strip():
            raise CommandError(
                f"El tipo_documento '{codigo if isinstance(codigo, str) else ''}' de la modalidad "
                f"'{modalidad_codigo}' debe incluir un 'nombre' no vacio."
            )
        if descripcion is not None and not isinstance(descripcion, str):
            raise CommandError(
                f"El tipo_documento '{codigo.strip()}' de la modalidad '{modalidad_codigo}' tiene "
                f"una 'descripcion' invalida."
            )
        if not isinstance(obligatorio, bool):
            raise CommandError(
                f"El tipo_documento '{codigo.strip()}' de la modalidad '{modalidad_codigo}' debe definir "
                f"'obligatorio' como booleano."
            )
        if not isinstance(permite_multiple_version, bool):
            raise CommandError(
                f"El tipo_documento '{codigo.strip()}' de la modalidad '{modalidad_codigo}' debe definir "
                f"'permite_multiple_version' como booleano."
            )
        if not isinstance(orden, int) or isinstance(orden, bool) or orden <= 0:
            raise CommandError(
                f"El tipo_documento '{codigo.strip()}' de la modalidad '{modalidad_codigo}' debe definir "
                f"'orden' como entero mayor que cero."
            )
        if not isinstance(tamano_maximo_mb, int) or isinstance(tamano_maximo_mb, bool) or tamano_maximo_mb <= 0:
            raise CommandError(
                f"El tipo_documento '{codigo.strip()}' de la modalidad '{modalidad_codigo}' debe definir "
                f"'tamano_maximo_mb' como entero mayor que cero."
            )
        if not isinstance(extensiones_permitidas, list) or not extensiones_permitidas:
            raise CommandError(
                f"El tipo_documento '{codigo.strip()}' de la modalidad '{modalidad_codigo}' debe incluir "
                f"'extensiones_permitidas' no vacias."
            )
        if any(not isinstance(item, str) or not item.strip() for item in extensiones_permitidas):
            raise CommandError(
                f"El tipo_documento '{codigo.strip()}' de la modalidad '{modalidad_codigo}' contiene "
                f"extensiones invalidas."
            )

        return {
            "codigo": codigo.strip(),
            "nombre": nombre.strip(),
            "descripcion": descripcion.strip() if isinstance(descripcion, str) else "",
            "obligatorio": obligatorio,
            "orden": orden,
            "extensiones_permitidas": ",".join(item.strip().lower() for item in extensiones_permitidas),
            "tamano_maximo_mb": tamano_maximo_mb,
            "permite_multiple_version": permite_multiple_version,
            "activo": True,
        }

    def _upsert_tipo_documento(self, document_data: dict[str, Any]) -> TipoDocumento:
        values = {
            "nombre": document_data["nombre"],
            "descripcion": document_data["descripcion"],
            "obligatorio": document_data["obligatorio"],
            "permite_multiple_version": document_data["permite_multiple_version"],
            "tamano_maximo_mb": document_data["tamano_maximo_mb"],
            "extensiones_permitidas": document_data["extensiones_permitidas"],
            "activo": True,
        }
        existing = TipoDocumento.all_objects.filter(codigo=document_data["codigo"]).first()
        instance, created = TipoDocumento.all_objects.update_or_create(
            codigo=document_data["codigo"],
            defaults=values,
        )
        self._track_update_or_create(existing=existing, created=created, expected_values=values)
        return instance

    def _upsert_requisito(self, document_data: dict[str, Any]) -> Requisito:
        values = {
            "nombre": document_data["nombre"],
            "descripcion": document_data["descripcion"],
            "obligatorio": document_data["obligatorio"],
            "activo": True,
        }
        existing = Requisito.all_objects.filter(codigo=document_data["codigo"]).first()
        instance, created = Requisito.all_objects.update_or_create(
            codigo=document_data["codigo"],
            defaults=values,
        )
        self._track_update_or_create(existing=existing, created=created, expected_values=values)
        return instance

    def _upsert_modalidad_requisito(self, modalidad: Modalidad, requisito: Requisito, orden: int) -> None:
        values = {"orden": orden, "activo": True}
        existing = ModalidadRequisito.all_objects.filter(modalidad=modalidad, requisito=requisito).first()
        _, created = ModalidadRequisito.all_objects.update_or_create(
            modalidad=modalidad,
            requisito=requisito,
            defaults=values,
        )
        self._track_update_or_create(existing=existing, created=created, expected_values=values)

    def _upsert_records(self, model, records: list[dict[str, object]], defaults_fields: tuple[str, ...]) -> None:
        for record in records:
            values = {field: record.get(field) for field in defaults_fields}
            values["activo"] = True
            lookup = {"codigo": record["codigo"]}
            instance = model.all_objects.filter(**lookup).first()
            if instance is None and model is Modalidad:
                instance = model.all_objects.filter(nombre=record["nombre"]).first()
                if instance is not None:
                    instance.codigo = record["codigo"]
                    instance.save(update_fields=["codigo", "updated_at"])
            if instance is None:
                instance = model.all_objects.create(**lookup, **values)
                created = True
            else:
                created = False
            if created:
                self.summary.created += 1
                continue

            updated = self._update_if_changed(instance=instance, values=values)
            if updated:
                self.summary.updated += 1
            else:
                self.summary.existing += 1

    def _update_if_changed(self, instance, values: dict[str, object]) -> bool:
        changed_fields: list[str] = []
        for field, expected in values.items():
            if getattr(instance, field) != expected:
                setattr(instance, field, expected)
                changed_fields.append(field)

        if not changed_fields:
            return False

        instance.save(update_fields=[*changed_fields, "updated_at"])
        return True

    def _track_update_or_create(self, existing, created: bool, expected_values: dict[str, Any]) -> None:
        if created:
            self.summary.created += 1
            return

        if existing is None:
            self.summary.updated += 1
            return

        changed = any(getattr(existing, field) != value for field, value in expected_values.items())
        if changed:
            self.summary.updated += 1
        else:
            self.summary.existing += 1

    def _print_summary(self) -> None:
        self.stdout.write(f"Creados: {self.summary.created}")
        self.stdout.write(f"Actualizados: {self.summary.updated}")
        self.stdout.write(f"Existentes: {self.summary.existing}")
        self.stdout.write(f"Omitidos por falta de matriz oficial: {self.summary.omitted}")
        self.stdout.write(f"Errores: {self.summary.errors}")
        for section in self.omitted_sections:
            self.stdout.write(f"- {section}")
