# DIA-ACA-060 — Catálogos y archivo oficial de modalidad

- Identificador: DIA-ACA-060.
- Tipo UML: Actividades.
- Objetivo: Documentar el comportamiento implementado de catálogos y archivo oficial de modalidad, con decisiones, guardas y límites de evidencia.
- Alcance: Catálogos y documentación oficial; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-ACA-001.
- Casos relacionados: UC-ACA-001, UC-ACA-002, UC-ACA-003, UC-ACA-004, UC-ACA-005, UC-ACA-006, UC-ACA-007, UC-POS-028, UC-DOC-007, UC-DOC-008 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-ACA-001, UC-ACA-002, UC-DOC-008, UC-POS-028.
- Reglas observadas: RN-ACA-101, RN-ACA-102, RN-ACA-103, RN-ACA-104, RN-ACA-105, RN-ACA-106, RN-ACA-107, RN-DOC-107, RN-DOC-108, RN-POS-128.
- Componentes: CMP-ACA-001, CMP-CORE-001.
- Entidades relacionadas: ENT-ACA-001, ENT-ACA-002, ENT-ACA-003, ENT-ACA-004, ENT-ACA-005, ENT-ACA-006, ENT-DOC-001, ENT-DOC-002, ENT-POS-001, ENT-USR-003.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/actividades/DIA-ACA-060.puml) · [SVG](../../renderizados/fase-5/DIA-ACA-060.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Las acciones de un catálogo o ciclo son variantes por solicitud; no ejecución obligatoria de todo CRUD. Guardas académicas delegadas a la política citada.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [DocumentoOficialModalidadSerializer (L48)](../../../../../apps/academico/serializers.py).
- [ModalidadRequisitoSerializer.validate (L148)](../../../../../apps/academico/serializers.py).
- [ModalidadSerializer (L28)](../../../../../apps/academico/serializers.py).
- [PeriodoSerializer.validate (L19)](../../../../../apps/academico/serializers.py).
- [ModalidadRequisitoViewSet (L183)](../../../../../apps/academico/views.py).
- [ModalidadViewSet (L42)](../../../../../apps/academico/views.py).
- [ModalidadViewSet._documento_oficial (L61)](../../../../../apps/academico/views.py).
- [ModalidadViewSet._guardar_documento_oficial (L67)](../../../../../apps/academico/views.py).
- [ModalidadViewSet.capacidades (L142)](../../../../../apps/academico/views.py).
- [ModalidadViewSet.descargar_documento_oficial (L126)](../../../../../apps/academico/views.py).
- [PeriodoViewSet (L28)](../../../../../apps/academico/views.py).
- [EstadoDocumentoViewSet (L34)](../../../../../apps/documentos/views.py).
- [TipoDocumentoViewSet (L48)](../../../../../apps/documentos/views.py).
- [ModalidadPolicyRegistry (L392)](../../../../../apps/modalidades/policies.py).
- [EstadoPostulacionSerializer (L23)](../../../../../apps/postulantes/serializers.py).
- [EstadoPostulacionViewSet (L79)](../../../../../apps/postulantes/views.py).
- [IsStaffOrReadOnly (L57)](../../../../../core/permissions.py).

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/academico/tests.py](../../../../../apps/academico/tests.py).
- [apps/academico/tests_documento_oficial_modalidad.py](../../../../../apps/academico/tests_documento_oficial_modalidad.py).
- [apps/documentos/test_api.py](../../../../../apps/documentos/test_api.py).
- [apps/modalidades/tests_policies.py](../../../../../apps/modalidades/tests_policies.py).
- [apps/postulantes/tests_security_contract.py](../../../../../apps/postulantes/tests_security_contract.py).
