# Inventario académico y anexo técnico de los 118 diagramas

Localizador de los originales: no se duplican fuentes ni SVG. Incluye 102 diagramas UML y 16 modelos ER lógicos complementarios; ER no se contabiliza como UML estándar. Cada registro identifica módulo, modalidad, objetivo, prioridad editorial, complejidad, calidad de presentación, evidencia y recursos. La prioridad expresa papel en la defensa, no importancia funcional absoluta.

| Categoría del registro | Cantidad |
| --- | --- |
| Clases | 15 |
| ER lógico | 15 |
| Clases de diseño | 17 |
| Componentes | 2 |
| Despliegue | 1 |
| Clases / persistencia heredada | 1 |
| ER lógico derivado | 1 |
| Casos de uso | 17 |
| Actividades | 24 |
| Secuencia | 11 |
| Estados | 14 |

Las clases/persistencia heredada se consideran una vista UML de clases con aclaraciones ORM; el ER derivado de intermedia continúa siendo modelo lógico, no esquema físico certificado. La complejidad y la calidad de presentación se interpretan según [el método de evaluación](evaluacion-visual.md). Para figuras no seleccionadas, la calidad visual es evaluación técnica/métrica y revisión previa disponible, no inspección manual ampliada nueva.

## Clases

<a id="dia-usr-001"></a>

### DIA-USR-001 — Clases de dominio: usuarios

- Aporte arquitectónico: Arquitectura de dominio: estructura entidades y referencias del módulo con multiplicidades derivadas del código.
- Categoría: Clases. Módulo: Usuarios y autenticación. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de usuarios.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 872×517 px, 43 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-USR-001-usuarios-clases.puml) · [SVG](../diagramas/renderizados/DIA-USR-001-usuarios-clases.svg) · [Ficha técnica](../diagramas/fichas/DIA-USR-001-usuarios-clases.md).
- Evidencia de código: [apps/usuarios/models.py](../../../apps/usuarios/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-aca-001"></a>

### DIA-ACA-001 — Clases de dominio: academico

- Aporte arquitectónico: Arquitectura de dominio: estructura entidades y referencias del módulo con multiplicidades derivadas del código.
- Categoría: Clases. Módulo: Gestión académica. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de academico.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 586×942 px, 71 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-ACA-001-academico-clases.puml) · [SVG](../diagramas/renderizados/DIA-ACA-001-academico-clases.svg) · [Ficha técnica](../diagramas/fichas/DIA-ACA-001-academico-clases.md).
- Evidencia de código: [apps/academico/models.py](../../../apps/academico/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-001"></a>

### DIA-POS-001 — Clases de dominio: postulaciones

- Aporte arquitectónico: Arquitectura de dominio: estructura entidades y referencias del módulo con multiplicidades derivadas del código.
- Categoría: Clases. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de postulaciones.
- Importancia para defensa: Principal transversal. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 08.
- Complejidad visual orientativa: Media; 1028×755 px, 83 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-POS-001-postulaciones-clases.puml) · [SVG](../diagramas/renderizados/DIA-POS-001-postulaciones-clases.svg) · [Ficha técnica](../diagramas/fichas/DIA-POS-001-postulaciones-clases.md).
- Evidencia de código: [apps/postulantes/models.py](../../../apps/postulantes/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-002"></a>

### DIA-POS-002 — Clases de dominio: etapas

- Aporte arquitectónico: Arquitectura de dominio: estructura entidades y referencias del módulo con multiplicidades derivadas del código.
- Categoría: Clases. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de etapas.
- Importancia para defensa: Principal transversal. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 09.
- Complejidad visual orientativa: Baja; 594×448 px, 39 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-POS-002-etapas-clases.puml) · [SVG](../diagramas/renderizados/DIA-POS-002-etapas-clases.svg) · [Ficha técnica](../diagramas/fichas/DIA-POS-002-etapas-clases.md).
- Evidencia de código: [apps/postulantes/models.py](../../../apps/postulantes/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-003"></a>

### DIA-POS-003 — Clases de dominio: asignaciones-decisiones

- Aporte arquitectónico: Arquitectura de dominio: estructura entidades y referencias del módulo con multiplicidades derivadas del código.
- Categoría: Clases. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de asignaciones-decisiones.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 1149×1020 px, 98 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-POS-003-asignaciones-decisiones-clases.puml) · [SVG](../diagramas/renderizados/DIA-POS-003-asignaciones-decisiones-clases.svg) · [Ficha técnica](../diagramas/fichas/DIA-POS-003-asignaciones-decisiones-clases.md).
- Evidencia de código: [apps/postulantes/models.py](../../../apps/postulantes/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-004"></a>

### DIA-POS-004 — Clases de dominio: condiciones-entregas

- Aporte arquitectónico: Arquitectura de dominio: estructura entidades y referencias del módulo con multiplicidades derivadas del código.
- Categoría: Clases. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de condiciones-entregas.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 623×623 px, 46 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-POS-004-condiciones-entregas-clases.puml) · [SVG](../diagramas/renderizados/DIA-POS-004-condiciones-entregas-clases.svg) · [Ficha técnica](../diagramas/fichas/DIA-POS-004-condiciones-entregas-clases.md).
- Evidencia de código: [apps/postulantes/models.py](../../../apps/postulantes/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-005"></a>

### DIA-POS-005 — Clases de dominio: defensas-evaluaciones

- Aporte arquitectónico: Arquitectura de dominio: estructura entidades y referencias del módulo con multiplicidades derivadas del código.
- Categoría: Clases. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de defensas-evaluaciones.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 1488×795 px, 90 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-POS-005-defensas-evaluaciones-clases.puml) · [SVG](../diagramas/renderizados/DIA-POS-005-defensas-evaluaciones-clases.svg) · [Ficha técnica](../diagramas/fichas/DIA-POS-005-defensas-evaluaciones-clases.md).
- Evidencia de código: [apps/postulantes/models.py](../../../apps/postulantes/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-006"></a>

### DIA-POS-006 — Clases de dominio: dictamenes

- Aporte arquitectónico: Arquitectura de dominio: estructura entidades y referencias del módulo con multiplicidades derivadas del código.
- Categoría: Clases. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de dictamenes.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 742×691 px, 69 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-POS-006-dictamenes-clases.puml) · [SVG](../diagramas/renderizados/DIA-POS-006-dictamenes-clases.svg) · [Ficha técnica](../diagramas/fichas/DIA-POS-006-dictamenes-clases.md).
- Evidencia de código: [apps/postulantes/models.py](../../../apps/postulantes/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-doc-001"></a>

### DIA-DOC-001 — Clases de dominio: documentos-versiones

- Aporte arquitectónico: Arquitectura de dominio: estructura entidades y referencias del módulo con multiplicidades derivadas del código.
- Categoría: Clases. Módulo: Gestión documental. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de documentos-versiones.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 1043×706 px, 67 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-DOC-001-documentos-versiones-clases.puml) · [SVG](../diagramas/renderizados/DIA-DOC-001-documentos-versiones-clases.svg) · [Ficha técnica](../diagramas/fichas/DIA-DOC-001-documentos-versiones-clases.md).
- Evidencia de código: [apps/documentos/models.py](../../../apps/documentos/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-doc-002"></a>

### DIA-DOC-002 — Clases de dominio: observaciones-correcciones

- Aporte arquitectónico: Arquitectura de dominio: estructura entidades y referencias del módulo con multiplicidades derivadas del código.
- Categoría: Clases. Módulo: Gestión documental. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de observaciones-correcciones.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 729×773 px, 66 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-DOC-002-observaciones-correcciones-clases.puml) · [SVG](../diagramas/renderizados/DIA-DOC-002-observaciones-correcciones-clases.svg) · [Ficha técnica](../diagramas/fichas/DIA-DOC-002-observaciones-correcciones-clases.md).
- Evidencia de código: [apps/documentos/models.py](../../../apps/documentos/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-not-001"></a>

### DIA-NOT-001 — Clases de dominio: notificaciones

- Aporte arquitectónico: Arquitectura de dominio: estructura entidades y referencias del módulo con multiplicidades derivadas del código.
- Categoría: Clases. Módulo: Notificaciones. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de notificaciones.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 587×382 px, 32 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-NOT-001-notificaciones-clases.puml) · [SVG](../diagramas/renderizados/DIA-NOT-001-notificaciones-clases.svg) · [Ficha técnica](../diagramas/fichas/DIA-NOT-001-notificaciones-clases.md).
- Evidencia de código: [apps/notificaciones/models.py](../../../apps/notificaciones/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-eg-001"></a>

### DIA-EG-001 — Clases de dominio: examen

- Aporte arquitectónico: Arquitectura de dominio: estructura entidades y referencias del módulo con multiplicidades derivadas del código.
- Categoría: Clases. Módulo: Examen de Grado. Modalidad/ámbito: Examen de Grado.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de examen.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 898×505 px, 42 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-EG-001-examen-clases.puml) · [SVG](../diagramas/renderizados/DIA-EG-001-examen-clases.svg) · [Ficha técnica](../diagramas/fichas/DIA-EG-001-examen-clases.md).
- Evidencia de código: [apps/modalidades/models.py](../../../apps/modalidades/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-ea-001"></a>

### DIA-EA-001 — Clases de dominio: excelencia

- Aporte arquitectónico: Arquitectura de dominio: estructura entidades y referencias del módulo con multiplicidades derivadas del código.
- Categoría: Clases. Módulo: Excelencia Académica. Modalidad/ámbito: Excelencia Académica.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de excelencia.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 617×366 px, 28 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-EA-001-excelencia-clases.puml) · [SVG](../diagramas/renderizados/DIA-EA-001-excelencia-clases.svg) · [Ficha técnica](../diagramas/fichas/DIA-EA-001-excelencia-clases.md).
- Evidencia de código: [apps/modalidades/models.py](../../../apps/modalidades/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-dip-001"></a>

### DIA-DIP-001 — Clases de dominio: diplomado

- Aporte arquitectónico: Arquitectura de dominio: estructura entidades y referencias del módulo con multiplicidades derivadas del código.
- Categoría: Clases. Módulo: Graduación vía Diplomado. Modalidad/ámbito: Graduación vía Diplomado.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de diplomado.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 604×591 px, 35 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-DIP-001-diplomado-clases.puml) · [SVG](../diagramas/renderizados/DIA-DIP-001-diplomado-clases.svg) · [Ficha técnica](../diagramas/fichas/DIA-DIP-001-diplomado-clases.md).
- Evidencia de código: [apps/modalidades/models.py](../../../apps/modalidades/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-td-001"></a>

### DIA-TD-001 — Clases de dominio: trabajo-dirigido

- Aporte arquitectónico: Arquitectura de dominio: estructura entidades y referencias del módulo con multiplicidades derivadas del código.
- Categoría: Clases. Módulo: Trabajo Dirigido. Modalidad/ámbito: Trabajo Dirigido.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de trabajo-dirigido.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 998×497 px, 41 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-TD-001-trabajo-dirigido-clases.puml) · [SVG](../diagramas/renderizados/DIA-TD-001-trabajo-dirigido-clases.svg) · [Ficha técnica](../diagramas/fichas/DIA-TD-001-trabajo-dirigido-clases.md).
- Evidencia de código: [apps/modalidades/models.py](../../../apps/modalidades/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

## ER lógico

<a id="dia-usr-101"></a>

### DIA-USR-101 — ER lógico: usuarios

- Aporte arquitectónico: Arquitectura de datos: documenta claves, cardinalidades y restricciones del módulo sin certificar el esquema físico.
- Categoría: ER lógico. Módulo: Usuarios y autenticación. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de usuarios.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 889×587 px, 40 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-USR-101-usuarios-er.puml) · [SVG](../diagramas/renderizados/DIA-USR-101-usuarios-er.svg) · [Ficha técnica](../diagramas/fichas/DIA-USR-101-usuarios-er.md).
- Evidencia de código: [apps/usuarios/models.py](../../../apps/usuarios/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-aca-101"></a>

### DIA-ACA-101 — ER lógico: academico

- Aporte arquitectónico: Arquitectura de datos: documenta claves, cardinalidades y restricciones del módulo sin certificar el esquema físico.
- Categoría: ER lógico. Módulo: Gestión académica. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de academico.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 642×1118 px, 63 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-ACA-101-academico-er.puml) · [SVG](../diagramas/renderizados/DIA-ACA-101-academico-er.svg) · [Ficha técnica](../diagramas/fichas/DIA-ACA-101-academico-er.md).
- Evidencia de código: [apps/academico/models.py](../../../apps/academico/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-101"></a>

### DIA-POS-101 — ER lógico: postulaciones

- Aporte arquitectónico: Arquitectura de datos: documenta claves, cardinalidades y restricciones del módulo sin certificar el esquema físico.
- Categoría: ER lógico. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de postulaciones.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 1045×830 px, 63 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-POS-101-postulaciones-er.puml) · [SVG](../diagramas/renderizados/DIA-POS-101-postulaciones-er.svg) · [Ficha técnica](../diagramas/fichas/DIA-POS-101-postulaciones-er.md).
- Evidencia de código: [apps/postulantes/models.py](../../../apps/postulantes/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-102"></a>

### DIA-POS-102 — ER lógico: etapas

- Aporte arquitectónico: Arquitectura de datos: documenta claves, cardinalidades y restricciones del módulo sin certificar el esquema físico.
- Categoría: ER lógico. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de etapas.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 670×487 px, 33 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-POS-102-etapas-er.puml) · [SVG](../diagramas/renderizados/DIA-POS-102-etapas-er.svg) · [Ficha técnica](../diagramas/fichas/DIA-POS-102-etapas-er.md).
- Evidencia de código: [apps/postulantes/models.py](../../../apps/postulantes/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-103"></a>

### DIA-POS-103 — ER lógico: asignaciones-decisiones

- Aporte arquitectónico: Arquitectura de datos: documenta claves, cardinalidades y restricciones del módulo sin certificar el esquema físico.
- Categoría: ER lógico. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de asignaciones-decisiones.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 1184×1160 px, 79 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-POS-103-asignaciones-decisiones-er.puml) · [SVG](../diagramas/renderizados/DIA-POS-103-asignaciones-decisiones-er.svg) · [Ficha técnica](../diagramas/fichas/DIA-POS-103-asignaciones-decisiones-er.md).
- Evidencia de código: [apps/postulantes/models.py](../../../apps/postulantes/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-104"></a>

### DIA-POS-104 — ER lógico: condiciones-entregas

- Aporte arquitectónico: Arquitectura de datos: documenta claves, cardinalidades y restricciones del módulo sin certificar el esquema físico.
- Categoría: ER lógico. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de condiciones-entregas.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 634×716 px, 38 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-POS-104-condiciones-entregas-er.puml) · [SVG](../diagramas/renderizados/DIA-POS-104-condiciones-entregas-er.svg) · [Ficha técnica](../diagramas/fichas/DIA-POS-104-condiciones-entregas-er.md).
- Evidencia de código: [apps/postulantes/models.py](../../../apps/postulantes/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-105"></a>

### DIA-POS-105 — ER lógico: defensas-evaluaciones

- Aporte arquitectónico: Arquitectura de datos: documenta claves, cardinalidades y restricciones del módulo sin certificar el esquema físico.
- Categoría: ER lógico. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de defensas-evaluaciones.
- Importancia para defensa: Principal transversal. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 11.
- Complejidad visual orientativa: Media; 1523×864 px, 71 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-POS-105-defensas-evaluaciones-er.puml) · [SVG](../diagramas/renderizados/DIA-POS-105-defensas-evaluaciones-er.svg) · [Ficha técnica](../diagramas/fichas/DIA-POS-105-defensas-evaluaciones-er.md).
- Evidencia de código: [apps/postulantes/models.py](../../../apps/postulantes/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-106"></a>

### DIA-POS-106 — ER lógico: dictamenes

- Aporte arquitectónico: Arquitectura de datos: documenta claves, cardinalidades y restricciones del módulo sin certificar el esquema físico.
- Categoría: ER lógico. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de dictamenes.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 863×780 px, 53 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-POS-106-dictamenes-er.puml) · [SVG](../diagramas/renderizados/DIA-POS-106-dictamenes-er.svg) · [Ficha técnica](../diagramas/fichas/DIA-POS-106-dictamenes-er.md).
- Evidencia de código: [apps/postulantes/models.py](../../../apps/postulantes/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-doc-101"></a>

### DIA-DOC-101 — ER lógico: documentos-versiones

- Aporte arquitectónico: Arquitectura de datos: documenta claves, cardinalidades y restricciones del módulo sin certificar el esquema físico.
- Categoría: ER lógico. Módulo: Gestión documental. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de documentos-versiones.
- Importancia para defensa: Principal transversal. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 10.
- Complejidad visual orientativa: Media; 1068×806 px, 58 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-DOC-101-documentos-versiones-er.puml) · [SVG](../diagramas/renderizados/DIA-DOC-101-documentos-versiones-er.svg) · [Ficha técnica](../diagramas/fichas/DIA-DOC-101-documentos-versiones-er.md).
- Evidencia de código: [apps/documentos/models.py](../../../apps/documentos/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-doc-102"></a>

### DIA-DOC-102 — ER lógico: observaciones-correcciones

- Aporte arquitectónico: Arquitectura de datos: documenta claves, cardinalidades y restricciones del módulo sin certificar el esquema físico.
- Categoría: ER lógico. Módulo: Gestión documental. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de observaciones-correcciones.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 746×811 px, 51 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-DOC-102-observaciones-correcciones-er.puml) · [SVG](../diagramas/renderizados/DIA-DOC-102-observaciones-correcciones-er.svg) · [Ficha técnica](../diagramas/fichas/DIA-DOC-102-observaciones-correcciones-er.md).
- Evidencia de código: [apps/documentos/models.py](../../../apps/documentos/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-not-101"></a>

### DIA-NOT-101 — ER lógico: notificaciones

- Aporte arquitectónico: Arquitectura de datos: documenta claves, cardinalidades y restricciones del módulo sin certificar el esquema físico.
- Categoría: ER lógico. Módulo: Notificaciones. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de notificaciones.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 604×428 px, 26 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-NOT-101-notificaciones-er.puml) · [SVG](../diagramas/renderizados/DIA-NOT-101-notificaciones-er.svg) · [Ficha técnica](../diagramas/fichas/DIA-NOT-101-notificaciones-er.md).
- Evidencia de código: [apps/notificaciones/models.py](../../../apps/notificaciones/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-eg-101"></a>

### DIA-EG-101 — ER lógico: examen

- Aporte arquitectónico: Arquitectura de datos: documenta claves, cardinalidades y restricciones del módulo sin certificar el esquema físico.
- Categoría: ER lógico. Módulo: Examen de Grado. Modalidad/ámbito: Examen de Grado.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de examen.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 952×579 px, 37 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-EG-101-examen-er.puml) · [SVG](../diagramas/renderizados/DIA-EG-101-examen-er.svg) · [Ficha técnica](../diagramas/fichas/DIA-EG-101-examen-er.md).
- Evidencia de código: [apps/modalidades/models.py](../../../apps/modalidades/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-ea-101"></a>

### DIA-EA-101 — ER lógico: excelencia

- Aporte arquitectónico: Arquitectura de datos: documenta claves, cardinalidades y restricciones del módulo sin certificar el esquema físico.
- Categoría: ER lógico. Módulo: Excelencia Académica. Modalidad/ámbito: Excelencia Académica.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de excelencia.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 628×333 px, 22 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-EA-101-excelencia-er.puml) · [SVG](../diagramas/renderizados/DIA-EA-101-excelencia-er.svg) · [Ficha técnica](../diagramas/fichas/DIA-EA-101-excelencia-er.md).
- Evidencia de código: [apps/modalidades/models.py](../../../apps/modalidades/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-dip-101"></a>

### DIA-DIP-101 — ER lógico: diplomado

- Aporte arquitectónico: Arquitectura de datos: documenta claves, cardinalidades y restricciones del módulo sin certificar el esquema físico.
- Categoría: ER lógico. Módulo: Graduación vía Diplomado. Modalidad/ámbito: Graduación vía Diplomado.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de diplomado.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 604×681 px, 31 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-DIP-101-diplomado-er.puml) · [SVG](../diagramas/renderizados/DIA-DIP-101-diplomado-er.svg) · [Ficha técnica](../diagramas/fichas/DIA-DIP-101-diplomado-er.md).
- Evidencia de código: [apps/modalidades/models.py](../../../apps/modalidades/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-td-101"></a>

### DIA-TD-101 — ER lógico: trabajo-dirigido

- Aporte arquitectónico: Arquitectura de datos: documenta claves, cardinalidades y restricciones del módulo sin certificar el esquema físico.
- Categoría: ER lógico. Módulo: Trabajo Dirigido. Modalidad/ámbito: Trabajo Dirigido.
- Funcionalidad/objetivo: Mostrar entidades, relaciones y opcionalidad de trabajo-dirigido.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 1016×455 px, 32 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-TD-101-trabajo-dirigido-er.puml) · [SVG](../diagramas/renderizados/DIA-TD-101-trabajo-dirigido-er.svg) · [Ficha técnica](../diagramas/fichas/DIA-TD-101-trabajo-dirigido-er.md).
- Evidencia de código: [apps/modalidades/models.py](../../../apps/modalidades/models.py); [core/models.py](../../../core/models.py); [core/settings/base.py](../../../core/settings/base.py). El conjunto completo se localiza en la ficha técnica.

## Clases de diseño

<a id="dia-sys-002"></a>

### DIA-SYS-002 — Clases: modelo-base

- Aporte arquitectónico: Arquitectura de comportamiento: localiza contratos, servicios, policies o clases de soporte y su herencia explícita.
- Categoría: Clases de diseño. Módulo: Sistema. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Identificar atributos comunes heredados sin crear una tabla BaseModel.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 462×250 px, 9 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-SYS-002-modelo-base.puml) · [SVG](../diagramas/renderizados/DIA-SYS-002-modelo-base.svg) · [Ficha técnica](../diagramas/fichas/DIA-SYS-002-modelo-base.md).
- Evidencia de código: [core/models.py](../../../core/models.py); [BaseModel (L4)](../../../core/models.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pg-020"></a>

### DIA-PG-020 — Clases: politicas-proyecto_grado

- Aporte arquitectónico: Arquitectura de comportamiento: localiza contratos, servicios, policies o clases de soporte y su herencia explícita.
- Categoría: Clases de diseño. Módulo: Proyecto de Grado. Modalidad/ámbito: Proyecto de Grado.
- Funcionalidad/objetivo: Mostrar especialización propia de PG y herencias explícitas.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 1435×923 px, 73 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-PG-020-politicas-proyecto_grado.puml) · [SVG](../diagramas/renderizados/DIA-PG-020-politicas-proyecto_grado.svg) · [Ficha técnica](../diagramas/fichas/DIA-PG-020-politicas-proyecto_grado.md).
- Evidencia de código: [apps/modalidades/policies.py](../../../apps/modalidades/policies.py); [apps/modalidades/proyecto_grado.py](../../../apps/modalidades/proyecto_grado.py); [ProyectoGradoEvaluacionPolicy (L273)](../../../apps/modalidades/proyecto_grado.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-tg-020"></a>

### DIA-TG-020 — Clases: politicas-tesis_grado

- Aporte arquitectónico: Arquitectura de comportamiento: localiza contratos, servicios, policies o clases de soporte y su herencia explícita.
- Categoría: Clases de diseño. Módulo: Tesis de Grado. Modalidad/ámbito: Tesis de Grado.
- Funcionalidad/objetivo: Mostrar especialización propia de TG y herencias explícitas.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 1552×702 px, 50 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-TG-020-politicas-tesis_grado.puml) · [SVG](../diagramas/renderizados/DIA-TG-020-politicas-tesis_grado.svg) · [Ficha técnica](../diagramas/fichas/DIA-TG-020-politicas-tesis_grado.md).
- Evidencia de código: [apps/modalidades/policies.py](../../../apps/modalidades/policies.py); [apps/modalidades/tesis_grado.py](../../../apps/modalidades/tesis_grado.py); [TesisGradoEvaluacionPolicy (L173)](../../../apps/modalidades/tesis_grado.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-td-020"></a>

### DIA-TD-020 — Clases: politicas-trabajo_dirigido

- Aporte arquitectónico: Arquitectura de comportamiento: localiza contratos, servicios, policies o clases de soporte y su herencia explícita.
- Categoría: Clases de diseño. Módulo: Trabajo Dirigido. Modalidad/ámbito: Trabajo Dirigido.
- Funcionalidad/objetivo: Mostrar especialización propia de TD y herencias explícitas.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 1535×801 px, 58 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-TD-020-politicas-trabajo_dirigido.puml) · [SVG](../diagramas/renderizados/DIA-TD-020-politicas-trabajo_dirigido.svg) · [Ficha técnica](../diagramas/fichas/DIA-TD-020-politicas-trabajo_dirigido.md).
- Evidencia de código: [apps/modalidades/policies.py](../../../apps/modalidades/policies.py); [apps/modalidades/proyecto_grado.py](../../../apps/modalidades/proyecto_grado.py); [apps/modalidades/trabajo_dirigido.py](../../../apps/modalidades/trabajo_dirigido.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-eg-020"></a>

### DIA-EG-020 — Clases: politicas-examen_grado

- Aporte arquitectónico: Arquitectura de comportamiento: localiza contratos, servicios, policies o clases de soporte y su herencia explícita.
- Categoría: Clases de diseño. Módulo: Examen de Grado. Modalidad/ámbito: Examen de Grado.
- Funcionalidad/objetivo: Mostrar especialización propia de EG y herencias explícitas.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 936×448 px, 26 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-EG-020-politicas-examen_grado.puml) · [SVG](../diagramas/renderizados/DIA-EG-020-politicas-examen_grado.svg) · [Ficha técnica](../diagramas/fichas/DIA-EG-020-politicas-examen_grado.md).
- Evidencia de código: [apps/modalidades/examen_grado.py](../../../apps/modalidades/examen_grado.py); [ExamenGradoPolicy (L56)](../../../apps/modalidades/examen_grado.py); [ExamenGradoRequisitosPolicy (L37)](../../../apps/modalidades/examen_grado.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-ea-020"></a>

### DIA-EA-020 — Clases: politicas-excelencia_academica

- Aporte arquitectónico: Arquitectura de comportamiento: localiza contratos, servicios, policies o clases de soporte y su herencia explícita.
- Categoría: Clases de diseño. Módulo: Excelencia Académica. Modalidad/ámbito: Excelencia Académica.
- Funcionalidad/objetivo: Mostrar especialización propia de EA y herencias explícitas.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 971×444 px, 25 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-EA-020-politicas-excelencia_academica.puml) · [SVG](../diagramas/renderizados/DIA-EA-020-politicas-excelencia_academica.svg) · [Ficha técnica](../diagramas/fichas/DIA-EA-020-politicas-excelencia_academica.md).
- Evidencia de código: [apps/modalidades/excelencia_academica.py](../../../apps/modalidades/excelencia_academica.py); [ExcelenciaAcademicaPolicy (L60)](../../../apps/modalidades/excelencia_academica.py); [ExcelenciaAcademicaRequisitosPolicy (L42)](../../../apps/modalidades/excelencia_academica.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-dip-020"></a>

### DIA-DIP-020 — Clases: politicas-diplomado

- Aporte arquitectónico: Arquitectura de comportamiento: localiza contratos, servicios, policies o clases de soporte y su herencia explícita.
- Categoría: Clases de diseño. Módulo: Graduación vía Diplomado. Modalidad/ámbito: Graduación vía Diplomado.
- Funcionalidad/objetivo: Mostrar especialización propia de DIP y herencias explícitas.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 1193×666 px, 47 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-DIP-020-politicas-diplomado.puml) · [SVG](../diagramas/renderizados/DIA-DIP-020-politicas-diplomado.svg) · [Ficha técnica](../diagramas/fichas/DIA-DIP-020-politicas-diplomado.md).
- Evidencia de código: [apps/modalidades/diplomado.py](../../../apps/modalidades/diplomado.py); [DiplomadoEvaluacionPolicy (L107)](../../../apps/modalidades/diplomado.py); [DiplomadoEventoPolicy (L70)](../../../apps/modalidades/diplomado.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-mod-001"></a>

### DIA-MOD-001 — Clases: contratos-politicas

- Aporte arquitectónico: Arquitectura de comportamiento: localiza contratos, servicios, policies o clases de soporte y su herencia explícita.
- Categoría: Clases de diseño. Módulo: Motor de modalidades. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar contratos de extensión sin atribuir a todas las modalidades las reglas de Proyecto.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 1374×923 px, 84 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-MOD-001-contratos-politicas.puml) · [SVG](../diagramas/renderizados/DIA-MOD-001-contratos-politicas.svg) · [Ficha técnica](../diagramas/fichas/DIA-MOD-001-contratos-politicas.md).
- Evidencia de código: [apps/modalidades/policies.py](../../../apps/modalidades/policies.py); [BaseCierrePolicy (L174)](../../../apps/modalidades/policies.py); [BaseEvaluacionPolicy (L109)](../../../apps/modalidades/policies.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-020"></a>

### DIA-POS-020 — Clases: servicios-expediente

- Aporte arquitectónico: Arquitectura de comportamiento: localiza contratos, servicios, policies o clases de soporte y su herencia explícita.
- Categoría: Clases de diseño. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Separar servicios, entrada API y políticas; solo operaciones verificadas.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 1388×542 px, 36 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-POS-020-servicios-expediente.puml) · [SVG](../diagramas/renderizados/DIA-POS-020-servicios-expediente.svg) · [Ficha técnica](../diagramas/fichas/DIA-POS-020-servicios-expediente.md).
- Evidencia de código: [apps/postulantes/asignaciones.py](../../../apps/postulantes/asignaciones.py); [AsignacionService (L16)](../../../apps/postulantes/asignaciones.py); [apps/postulantes/decisiones_academicas.py](../../../apps/postulantes/decisiones_academicas.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-021"></a>

### DIA-POS-021 — Clases: servicios-defensa-cierre

- Aporte arquitectónico: Arquitectura de comportamiento: localiza contratos, servicios, policies o clases de soporte y su herencia explícita.
- Categoría: Clases de diseño. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Separar servicios, entrada API y políticas; solo operaciones verificadas.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 1717×791 px, 44 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-POS-021-servicios-defensa-cierre.puml) · [SVG](../diagramas/renderizados/DIA-POS-021-servicios-defensa-cierre.svg) · [Ficha técnica](../diagramas/fichas/DIA-POS-021-servicios-defensa-cierre.md).
- Evidencia de código: [apps/modalidades/policies.py](../../../apps/modalidades/policies.py); [apps/postulantes/cierre.py](../../../apps/postulantes/cierre.py); [CierrePostulacionService (L103)](../../../apps/postulantes/cierre.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-doc-020"></a>

### DIA-DOC-020 — Clases: servicios-documentales

- Aporte arquitectónico: Arquitectura de comportamiento: localiza contratos, servicios, policies o clases de soporte y su herencia explícita.
- Categoría: Clases de diseño. Módulo: Gestión documental. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Separar servicios, entrada API y políticas; solo operaciones verificadas.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 814×411 px, 15 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-DOC-020-servicios-documentales.puml) · [SVG](../diagramas/renderizados/DIA-DOC-020-servicios-documentales.svg) · [Ficha técnica](../diagramas/fichas/DIA-DOC-020-servicios-documentales.md).
- Evidencia de código: [apps/documentos/services.py](../../../apps/documentos/services.py); [ConfirmacionCorreccionDocumentoService (L908)](../../../apps/documentos/services.py); [DocumentoService (L25)](../../../apps/documentos/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-not-020"></a>

### DIA-NOT-020 — Clases: servicios-eventos-notificaciones

- Aporte arquitectónico: Arquitectura de comportamiento: localiza contratos, servicios, policies o clases de soporte y su herencia explícita.
- Categoría: Clases de diseño. Módulo: Notificaciones. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Separar servicios, entrada API y políticas; solo operaciones verificadas.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 1135×460 px, 30 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-NOT-020-servicios-eventos-notificaciones.puml) · [SVG](../diagramas/renderizados/DIA-NOT-020-servicios-eventos-notificaciones.svg) · [Ficha técnica](../diagramas/fichas/DIA-NOT-020-servicios-eventos-notificaciones.md).
- Evidencia de código: [apps/notificaciones/events.py](../../../apps/notificaciones/events.py); [DomainEvent (L26)](../../../apps/notificaciones/events.py); [DomainEventPublisher (L42)](../../../apps/notificaciones/events.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-usr-020"></a>

### DIA-USR-020 — Clases: autenticacion-autorizacion

- Aporte arquitectónico: Arquitectura de comportamiento: localiza contratos, servicios, policies o clases de soporte y su herencia explícita.
- Categoría: Clases de diseño. Módulo: Usuarios y autenticación. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Separar servicios, entrada API y políticas; solo operaciones verificadas.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 730×570 px, 41 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-USR-020-autenticacion-autorizacion.puml) · [SVG](../diagramas/renderizados/DIA-USR-020-autenticacion-autorizacion.svg) · [Ficha técnica](../diagramas/fichas/DIA-USR-020-autenticacion-autorizacion.md).
- Evidencia de código: [apps/usuarios/services.py](../../../apps/usuarios/services.py); [UserCapabilitiesService (L10)](../../../apps/usuarios/services.py); [apps/usuarios/views.py](../../../apps/usuarios/views.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-eg-021"></a>

### DIA-EG-021 — Clases: servicio-examen

- Aporte arquitectónico: Arquitectura de comportamiento: localiza contratos, servicios, policies o clases de soporte y su herencia explícita.
- Categoría: Clases de diseño. Módulo: Examen de Grado. Modalidad/ámbito: Examen de Grado.
- Funcionalidad/objetivo: Separar servicios, entrada API y políticas; solo operaciones verificadas.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 682×282 px, 11 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-EG-021-servicio-examen.puml) · [SVG](../diagramas/renderizados/DIA-EG-021-servicio-examen.svg) · [Ficha técnica](../diagramas/fichas/DIA-EG-021-servicio-examen.md).
- Evidencia de código: [apps/modalidades/examen_grado_service.py](../../../apps/modalidades/examen_grado_service.py); [ExamenGradoService (L15)](../../../apps/modalidades/examen_grado_service.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-ea-021"></a>

### DIA-EA-021 — Clases: servicio-excelencia

- Aporte arquitectónico: Arquitectura de comportamiento: localiza contratos, servicios, policies o clases de soporte y su herencia explícita.
- Categoría: Clases de diseño. Módulo: Excelencia Académica. Modalidad/ámbito: Excelencia Académica.
- Funcionalidad/objetivo: Separar servicios, entrada API y políticas; solo operaciones verificadas.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 544×266 px, 10 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-EA-021-servicio-excelencia.puml) · [SVG](../diagramas/renderizados/DIA-EA-021-servicio-excelencia.svg) · [Ficha técnica](../diagramas/fichas/DIA-EA-021-servicio-excelencia.md).
- Evidencia de código: [apps/modalidades/excelencia_academica_service.py](../../../apps/modalidades/excelencia_academica_service.py); [ExcelenciaAcademicaService (L13)](../../../apps/modalidades/excelencia_academica_service.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-dip-021"></a>

### DIA-DIP-021 — Clases: servicio-diplomado

- Aporte arquitectónico: Arquitectura de comportamiento: localiza contratos, servicios, policies o clases de soporte y su herencia explícita.
- Categoría: Clases de diseño. Módulo: Graduación vía Diplomado. Modalidad/ámbito: Graduación vía Diplomado.
- Funcionalidad/objetivo: Separar servicios, entrada API y políticas; solo operaciones verificadas.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 462×266 px, 10 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-DIP-021-servicio-diplomado.puml) · [SVG](../diagramas/renderizados/DIA-DIP-021-servicio-diplomado.svg) · [Ficha técnica](../diagramas/fichas/DIA-DIP-021-servicio-diplomado.md).
- Evidencia de código: [apps/modalidades/diplomado_service.py](../../../apps/modalidades/diplomado_service.py); [DiplomadoService (L23)](../../../apps/modalidades/diplomado_service.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-td-021"></a>

### DIA-TD-021 — Clases: servicio-trabajo-dirigido

- Aporte arquitectónico: Arquitectura de comportamiento: localiza contratos, servicios, policies o clases de soporte y su herencia explícita.
- Categoría: Clases de diseño. Módulo: Trabajo Dirigido. Modalidad/ámbito: Trabajo Dirigido.
- Funcionalidad/objetivo: Separar servicios, entrada API y políticas; solo operaciones verificadas.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 462×266 px, 10 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-TD-021-servicio-trabajo-dirigido.puml) · [SVG](../diagramas/renderizados/DIA-TD-021-servicio-trabajo-dirigido.svg) · [Ficha técnica](../diagramas/fichas/DIA-TD-021-servicio-trabajo-dirigido.md).
- Evidencia de código: [apps/modalidades/trabajo_dirigido_service.py](../../../apps/modalidades/trabajo_dirigido_service.py); [TrabajoDirigidoService (L9)](../../../apps/modalidades/trabajo_dirigido_service.py). El conjunto completo se localiza en la ficha técnica.

## Componentes

<a id="dia-sys-006"></a>

### DIA-SYS-006 — Componentes generales

- Aporte arquitectónico: Arquitectura lógica: identifica responsabilidades y dependencias entre componentes y especializaciones.
- Categoría: Componentes. Módulo: Sistema. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Situar SPA, API, seguridad, dominio y almacenamiento.
- Importancia para defensa: Principal transversal. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 05.
- Complejidad visual orientativa: Media; 1383×921 px, 35 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-SYS-006-componentes-general.puml) · [SVG](../diagramas/renderizados/DIA-SYS-006-componentes-general.svg) · [Ficha técnica](../diagramas/fichas/DIA-SYS-006-componentes-general.md).
- Evidencia de código: [apps/documentos/services.py](../../../apps/documentos/services.py); [apps/notificaciones/events.py](../../../apps/notificaciones/events.py); [apps/postulantes/workflow.py](../../../apps/postulantes/workflow.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-mod-002"></a>

### DIA-MOD-002 — Motor y modalidades

- Aporte arquitectónico: Arquitectura lógica: identifica responsabilidades y dependencias entre componentes y especializaciones.
- Categoría: Componentes. Módulo: Motor de modalidades. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar resolución explícita de políticas y límites de reutilización.
- Importancia para defensa: Principal transversal. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 06.
- Complejidad visual orientativa: Media; 1012×597 px, 23 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-MOD-002-componentes-motor.puml) · [SVG](../diagramas/renderizados/DIA-MOD-002-componentes-motor.svg) · [Ficha técnica](../diagramas/fichas/DIA-MOD-002-componentes-motor.md).
- Evidencia de código: [apps/documentos/services.py](../../../apps/documentos/services.py); [apps/modalidades/apps.py](../../../apps/modalidades/apps.py); [apps/modalidades/policies.py](../../../apps/modalidades/policies.py). El conjunto completo se localiza en la ficha técnica.

## Despliegue

<a id="dia-sys-007"></a>

### DIA-SYS-007 — Despliegue Docker de desarrollo declarado

- Aporte arquitectónico: Arquitectura de infraestructura: localiza nodos, comunicaciones y almacenamiento declarados para desarrollo.
- Categoría: Despliegue. Módulo: Sistema. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Separar navegador, publicaciones de puertos, red implícita y volúmenes.
- Importancia para defensa: Principal transversal. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 07.
- Complejidad visual orientativa: Media; 1322×777 px, 41 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-SYS-007-despliegue-docker.puml) · [SVG](../diagramas/renderizados/DIA-SYS-007-despliegue-docker.svg) · [Ficha técnica](../diagramas/fichas/DIA-SYS-007-despliegue-docker.md).
- Evidencia de código: [Dockerfile.backend](../../../Dockerfile.backend); [Dockerfile.frontend](../../../Dockerfile.frontend); [core/settings/production.py](../../../core/settings/production.py). El conjunto completo se localiza en la ficha técnica.

## Clases / persistencia heredada

<a id="dia-usr-021"></a>

### DIA-USR-021 — Herencia y persistencia de autenticación

- Aporte arquitectónico: Arquitectura de autenticación: diferencia herencia del framework, base abstracta y persistencia propia.
- Categoría: Clases / persistencia heredada. Módulo: Usuarios y autenticación. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Explicar la herencia de usuario y M2M de autenticación sin confundir rol académico y permisos Django.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 814×623 px, 41 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-USR-021-herencia-autenticacion.puml) · [SVG](../diagramas/renderizados/DIA-USR-021-herencia-autenticacion.svg) · [Ficha técnica](../diagramas/fichas/DIA-USR-021-herencia-autenticacion.md).
- Evidencia de código: [apps/usuarios/migrations/0001_initial.py](../../../apps/usuarios/migrations/0001_initial.py); [apps/usuarios/models.py](../../../apps/usuarios/models.py); [core/models.py](../../../core/models.py). El conjunto completo se localiza en la ficha técnica.

## ER lógico derivado

<a id="dia-pos-120"></a>

### DIA-POS-120 — ER lógico: intermedia de memorando

- Aporte arquitectónico: Arquitectura de datos: explica la intermediación M2M implícita sin inventar nombre físico de tabla.
- Categoría: ER lógico derivado. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Hacer visible la intermedia implícita de asignaciones sin inventar su nombre físico.
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 466×558 px, 22 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/DIA-POS-120-intermedia-memorandum.puml) · [SVG](../diagramas/renderizados/DIA-POS-120-intermedia-memorandum.svg) · [Ficha técnica](../diagramas/fichas/DIA-POS-120-intermedia-memorandum.md).
- Evidencia de código: [apps/postulantes/migrations/0019_publicacionmemorandumdesignacion.py](../../../apps/postulantes/migrations/0019_publicacionmemorandumdesignacion.py); [apps/postulantes/models.py](../../../apps/postulantes/models.py). El conjunto completo se localiza en la ficha técnica.

## Casos de uso

<a id="dia-sys-001"></a>

### DIA-SYS-001 — Vista general del sistema

- Aporte arquitectónico: Arquitectura funcional: delimita objetivos y responsabilidades de actores del módulo; no concede permisos por asociación aislada.
- Categoría: Casos de uso. Módulo: Sistema. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos..
- Importancia para defensa: Principal transversal. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 01.
- Complejidad visual orientativa: Media; 625×994 px, 39 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-4/DIA-SYS-001.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-SYS-001.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-SYS-001.md).
- Evidencia de código: [apps/academico/views.py](../../../apps/academico/views.py); [ModalidadViewSet.capacidades (L142)](../../../apps/academico/views.py); [apps/documentos/services.py](../../../apps/documentos/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-usr-040"></a>

### DIA-USR-040 — Autenticación y usuarios

- Aporte arquitectónico: Arquitectura funcional: delimita objetivos y responsabilidades de actores del módulo; no concede permisos por asociación aislada.
- Categoría: Casos de uso. Módulo: Usuarios y autenticación. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 448×818 px, 28 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-4/DIA-USR-040.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-USR-040.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-USR-040.md).
- Evidencia de código: [apps/usuarios/serializers.py](../../../apps/usuarios/serializers.py); [LoginSerializer.validate (L49)](../../../apps/usuarios/serializers.py); [LogoutSerializer (L37)](../../../apps/usuarios/serializers.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-aca-040"></a>

### DIA-ACA-040 — Gestión académica

- Aporte arquitectónico: Arquitectura funcional: delimita objetivos y responsabilidades de actores del módulo; no concede permisos por asociación aislada.
- Categoría: Casos de uso. Módulo: Gestión académica. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 451×857 px, 29 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-4/DIA-ACA-040.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-ACA-040.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-ACA-040.md).
- Evidencia de código: [apps/academico/serializers.py](../../../apps/academico/serializers.py); [DocumentoOficialModalidadSerializer (L48)](../../../apps/academico/serializers.py); [ModalidadRequisitoSerializer.validate (L148)](../../../apps/academico/serializers.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-040"></a>

### DIA-POS-040 — Postulaciones

- Aporte arquitectónico: Arquitectura funcional: delimita objetivos y responsabilidades de actores del módulo; no concede permisos por asociación aislada.
- Categoría: Casos de uso. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 442×1038 px, 39 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-4/DIA-POS-040.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-POS-040.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-POS-040.md).
- Evidencia de código: [apps/postulantes/permissions.py](../../../apps/postulantes/permissions.py); [postulaciones_in_scope (L7)](../../../apps/postulantes/permissions.py); [apps/postulantes/serializers.py](../../../apps/postulantes/serializers.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-041"></a>

### DIA-POS-041 — Seguimiento de etapas

- Aporte arquitectónico: Arquitectura funcional: delimita objetivos y responsabilidades de actores del módulo; no concede permisos por asociación aislada.
- Categoría: Casos de uso. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos..
- Importancia para defensa: Principal transversal. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 02.
- Complejidad visual orientativa: Baja; 442×838 px, 29 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-4/DIA-POS-041.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-POS-041.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-POS-041.md).
- Evidencia de código: [apps/postulantes/decisiones_academicas.py](../../../apps/postulantes/decisiones_academicas.py); [DecisionAcademicaEtapaService.registrar (L111)](../../../apps/postulantes/decisiones_academicas.py); [apps/postulantes/dictamenes_revision.py](../../../apps/postulantes/dictamenes_revision.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-042"></a>

### DIA-POS-042 — Asignaciones académicas

- Aporte arquitectónico: Arquitectura funcional: delimita objetivos y responsabilidades de actores del módulo; no concede permisos por asociación aislada.
- Categoría: Casos de uso. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 442×729 px, 27 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-4/DIA-POS-042.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-POS-042.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-POS-042.md).
- Evidencia de código: [apps/postulantes/asignaciones.py](../../../apps/postulantes/asignaciones.py); [AsignacionService.asignar_actor (L30)](../../../apps/postulantes/asignaciones.py); [AsignacionService.finalizar_asignacion (L195)](../../../apps/postulantes/asignaciones.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-043"></a>

### DIA-POS-043 — Defensas y evaluaciones

- Aporte arquitectónico: Arquitectura funcional: delimita objetivos y responsabilidades de actores del módulo; no concede permisos por asociación aislada.
- Categoría: Casos de uso. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos..
- Importancia para defensa: Principal transversal. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 04.
- Complejidad visual orientativa: Media; 455×932 px, 35 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-4/DIA-POS-043.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-POS-043.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-POS-043.md).
- Evidencia de código: [apps/postulantes/defensas.py](../../../apps/postulantes/defensas.py); [EvaluacionDefensaService._registrar (L202)](../../../apps/postulantes/defensas.py); [EvaluacionDefensaService.calcular_resultado_final (L263)](../../../apps/postulantes/defensas.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-044"></a>

### DIA-POS-044 — Condiciones y entrega física

- Aporte arquitectónico: Arquitectura funcional: delimita objetivos y responsabilidades de actores del módulo; no concede permisos por asociación aislada.
- Categoría: Casos de uso. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 444×562 px, 20 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-4/DIA-POS-044.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-POS-044.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-POS-044.md).
- Evidencia de código: [apps/postulantes/complementarios.py](../../../apps/postulantes/complementarios.py); [CondicionService (L18)](../../../apps/postulantes/complementarios.py); [EntregaFisicaService (L73)](../../../apps/postulantes/complementarios.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-doc-040"></a>

### DIA-DOC-040 — Gestión documental

- Aporte arquitectónico: Arquitectura funcional: delimita objetivos y responsabilidades de actores del módulo; no concede permisos por asociación aislada.
- Categoría: Casos de uso. Módulo: Gestión documental. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos..
- Importancia para defensa: Principal transversal. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 03.
- Complejidad visual orientativa: Media; 447×942 px, 37 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-4/DIA-DOC-040.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-DOC-040.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-DOC-040.md).
- Evidencia de código: [apps/documentos/services.py](../../../apps/documentos/services.py); [ConfirmacionCorreccionDocumentoService.registrar (L913)](../../../apps/documentos/services.py); [DocumentoService.aprobar_documento (L492)](../../../apps/documentos/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-not-040"></a>

### DIA-NOT-040 — Notificaciones

- Aporte arquitectónico: Arquitectura funcional: delimita objetivos y responsabilidades de actores del módulo; no concede permisos por asociación aislada.
- Categoría: Casos de uso. Módulo: Notificaciones. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 441×383 px, 13 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-4/DIA-NOT-040.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-NOT-040.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-NOT-040.md).
- Evidencia de código: [apps/notificaciones/services.py](../../../apps/notificaciones/services.py); [NotificationService.listar_usuario (L77)](../../../apps/notificaciones/services.py); [NotificationService.marcar_leida (L58)](../../../apps/notificaciones/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-rep-040"></a>

### DIA-REP-040 — Reportes

- Aporte arquitectónico: Arquitectura funcional: delimita objetivos y responsabilidades de actores del módulo; no concede permisos por asociación aislada.
- Categoría: Casos de uso. Módulo: Reportes. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 410×585 px, 22 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-4/DIA-REP-040.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-REP-040.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-REP-040.md).
- Evidencia de código: [apps/reportes/permissions.py](../../../apps/reportes/permissions.py); [CanExportReports.has_permission (L14)](../../../apps/reportes/permissions.py); [apps/reportes/resultados.py](../../../apps/reportes/resultados.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pg-040"></a>

### DIA-PG-040 — Proyecto de Grado

- Aporte arquitectónico: Arquitectura funcional: delimita objetivos y responsabilidades de actores del módulo; no concede permisos por asociación aislada.
- Categoría: Casos de uso. Módulo: Proyecto de Grado. Modalidad/ámbito: Proyecto de Grado.
- Funcionalidad/objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 410×392 px, 15 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-4/DIA-PG-040.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-PG-040.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-PG-040.md).
- Evidencia de código: [apps/postulantes/cierre.py](../../../apps/postulantes/cierre.py); [CierrePostulacionService (L103)](../../../apps/postulantes/cierre.py); [apps/postulantes/cierre_api.py](../../../apps/postulantes/cierre_api.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-tg-040"></a>

### DIA-TG-040 — Tesis de Grado

- Aporte arquitectónico: Arquitectura funcional: delimita objetivos y responsabilidades de actores del módulo; no concede permisos por asociación aislada.
- Categoría: Casos de uso. Módulo: Tesis de Grado. Modalidad/ámbito: Tesis de Grado.
- Funcionalidad/objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 570×298 px, 15 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-4/DIA-TG-040.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-TG-040.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-TG-040.md).
- Evidencia de código: [apps/modalidades/tesis_grado.py](../../../apps/modalidades/tesis_grado.py); [TesisGradoPolicy.validar_conclusion_academica (L809)](../../../apps/modalidades/tesis_grado.py); [apps/postulantes/views.py](../../../apps/postulantes/views.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-td-040"></a>

### DIA-TD-040 — Trabajo Dirigido

- Aporte arquitectónico: Arquitectura funcional: delimita objetivos y responsabilidades de actores del módulo; no concede permisos por asociación aislada.
- Categoría: Casos de uso. Módulo: Trabajo Dirigido. Modalidad/ámbito: Trabajo Dirigido.
- Funcionalidad/objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 410×657 px, 22 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-4/DIA-TD-040.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-TD-040.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-TD-040.md).
- Evidencia de código: [apps/modalidades/trabajo_dirigido_api.py](../../../apps/modalidades/trabajo_dirigido_api.py); [TrabajoDirigidoOverviewView.get (L27)](../../../apps/modalidades/trabajo_dirigido_api.py); [TrabajoDirigidoOverviewView.post (L30)](../../../apps/modalidades/trabajo_dirigido_api.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-eg-040"></a>

### DIA-EG-040 — Examen de Grado

- Aporte arquitectónico: Arquitectura funcional: delimita objetivos y responsabilidades de actores del módulo; no concede permisos por asociación aislada.
- Categoría: Casos de uso. Módulo: Examen de Grado. Modalidad/ámbito: Examen de Grado.
- Funcionalidad/objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 410×567 px, 19 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-4/DIA-EG-040.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-EG-040.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-EG-040.md).
- Evidencia de código: [apps/modalidades/examen_grado_api.py](../../../apps/modalidades/examen_grado_api.py); [ExamenGradoOverviewView.get (L27)](../../../apps/modalidades/examen_grado_api.py); [ExamenGradoOverviewView.post (L33)](../../../apps/modalidades/examen_grado_api.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-ea-040"></a>

### DIA-EA-040 — Excelencia Académica

- Aporte arquitectónico: Arquitectura funcional: delimita objetivos y responsabilidades de actores del módulo; no concede permisos por asociación aislada.
- Categoría: Casos de uso. Módulo: Excelencia Académica. Modalidad/ámbito: Excelencia Académica.
- Funcionalidad/objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 410×654 px, 22 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-4/DIA-EA-040.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-EA-040.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-EA-040.md).
- Evidencia de código: [apps/modalidades/excelencia_academica_api.py](../../../apps/modalidades/excelencia_academica_api.py); [ExcelenciaAcademicaOverviewView.get (L27)](../../../apps/modalidades/excelencia_academica_api.py); [ExcelenciaAcademicaOverviewView.post (L33)](../../../apps/modalidades/excelencia_academica_api.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-dip-040"></a>

### DIA-DIP-040 — Graduación vía Diplomado

- Aporte arquitectónico: Arquitectura funcional: delimita objetivos y responsabilidades de actores del módulo; no concede permisos por asociación aislada.
- Categoría: Casos de uso. Módulo: Graduación vía Diplomado. Modalidad/ámbito: Graduación vía Diplomado.
- Funcionalidad/objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 410×588 px, 20 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-4/DIA-DIP-040.puml) · [SVG](../diagramas/renderizados/fase-4/DIA-DIP-040.svg) · [Ficha técnica](../diagramas/fichas/fase-4/DIA-DIP-040.md).
- Evidencia de código: [apps/modalidades/diplomado_api.py](../../../apps/modalidades/diplomado_api.py); [DiplomadoOverviewView.get (L27)](../../../apps/modalidades/diplomado_api.py); [DiplomadoOverviewView.post (L30)](../../../apps/modalidades/diplomado_api.py). El conjunto completo se localiza en la ficha técnica.

## Actividades

<a id="dia-usr-060"></a>

### DIA-USR-060 — Acceso, sesión y renovación

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Usuarios y autenticación. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de acceso, sesión y renovación, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 768×665 px, 15 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-USR-060.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-USR-060.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-USR-060.md).
- Evidencia de código: [LoginSerializer.validate (L49)](../../../apps/usuarios/serializers.py); [LogoutSerializer (L37)](../../../apps/usuarios/serializers.py); [UserCapabilitiesService.resolve (L39)](../../../apps/usuarios/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-usr-061"></a>

### DIA-USR-061 — Mantenimiento de usuarios y roles

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Usuarios y autenticación. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de mantenimiento de usuarios y roles, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 634×883 px, 19 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-USR-061.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-USR-061.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-USR-061.md).
- Evidencia de código: [RoleAdminSerializer (L178)](../../../apps/usuarios/serializers.py); [UserAdminSerializer (L190)](../../../apps/usuarios/serializers.py); [RoleAdminViewSet (L146)](../../../apps/usuarios/views.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-aca-060"></a>

### DIA-ACA-060 — Catálogos y archivo oficial de modalidad

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Gestión académica. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de catálogos y archivo oficial de modalidad, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 727×915 px, 21 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-ACA-060.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-ACA-060.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-ACA-060.md).
- Evidencia de código: [DocumentoOficialModalidadSerializer (L48)](../../../apps/academico/serializers.py); [ModalidadRequisitoSerializer.validate (L148)](../../../apps/academico/serializers.py); [ModalidadSerializer (L28)](../../../apps/academico/serializers.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-sys-003"></a>

### DIA-SYS-003 — Alta operativa frente a registro histórico

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Sistema. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de alta operativa frente a registro histórico, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Principal transversal. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 12.
- Complejidad visual orientativa: Media; 1480×1115 px, 37 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-SYS-003.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-SYS-003.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-SYS-003.md).
- Evidencia de código: [postulaciones_in_scope (L7)](../../../apps/postulantes/permissions.py); [PostulacionService.agregar_observacion (L326)](../../../apps/postulantes/services.py); [PostulacionService.cambiar_estado (L240)](../../../apps/postulantes/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-060"></a>

### DIA-POS-060 — Consulta y gestión del estado general

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de consulta y gestión del estado general, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 694×915 px, 21 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-POS-060.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-060.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-060.md).
- Evidencia de código: [postulaciones_in_scope (L7)](../../../apps/postulantes/permissions.py); [PostulacionService.agregar_observacion (L326)](../../../apps/postulantes/services.py); [PostulacionService.cambiar_estado (L240)](../../../apps/postulantes/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-061"></a>

### DIA-POS-061 — Inscripción, requisitos y aprobación de etapa

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de inscripción, requisitos y aprobación de etapa, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Principal transversal. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 13.
- Complejidad visual orientativa: Media; 724×964 px, 24 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-POS-061.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-061.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-061.md).
- Evidencia de código: [DecisionAcademicaEtapaService.registrar (L111)](../../../apps/postulantes/decisiones_academicas.py); [DictamenRevisionDocumentoService.registrar (L17)](../../../apps/postulantes/dictamenes_revision.py); [RevisionTribunalPreviaService (L16)](../../../apps/postulantes/revision_tribunal.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-062"></a>

### DIA-POS-062 — Rechazo y nuevo intento de etapa

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de rechazo y nuevo intento de etapa, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 673×754 px, 18 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-POS-062.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-062.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-062.md).
- Evidencia de código: [DecisionAcademicaEtapaService.registrar (L111)](../../../apps/postulantes/decisiones_academicas.py); [DictamenRevisionDocumentoService.registrar (L17)](../../../apps/postulantes/dictamenes_revision.py); [RevisionTribunalPreviaService (L16)](../../../apps/postulantes/revision_tribunal.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-063"></a>

### DIA-POS-063 — Decisiones, dictámenes e informes de revisión

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de decisiones, dictámenes e informes de revisión, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 642×915 px, 21 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-POS-063.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-063.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-063.md).
- Evidencia de código: [DecisionAcademicaEtapaService.registrar (L111)](../../../apps/postulantes/decisiones_academicas.py); [DictamenRevisionDocumentoService.registrar (L17)](../../../apps/postulantes/dictamenes_revision.py); [RevisionTribunalPreviaService (L16)](../../../apps/postulantes/revision_tribunal.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-064"></a>

### DIA-POS-064 — Asignación y reemplazo académico

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de asignación y reemplazo académico, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 728×915 px, 21 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-POS-064.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-064.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-064.md).
- Evidencia de código: [AsignacionService.asignar_actor (L30)](../../../apps/postulantes/asignaciones.py); [AsignacionService.finalizar_asignacion (L195)](../../../apps/postulantes/asignaciones.py); [AsignacionService.reemplazar_actor (L233)](../../../apps/postulantes/asignaciones.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-doc-060"></a>

### DIA-DOC-060 — Carga, versionado y autoaprobación específica

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Gestión documental. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de carga, versionado y autoaprobación específica, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 701×1021 px, 25 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-DOC-060.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-DOC-060.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-DOC-060.md).
- Evidencia de código: [DocumentoService.crear_nueva_version (L375)](../../../apps/documentos/services.py); [DocumentoService.subir_documento (L146)](../../../apps/documentos/services.py); [DocumentoService.subir_documento_historico (L331)](../../../apps/documentos/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-doc-061"></a>

### DIA-DOC-061 — Descarga con alcance y publicación vigente

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Gestión documental. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de descarga con alcance y publicación vigente, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 754×826 px, 18 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-DOC-061.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-DOC-061.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-DOC-061.md).
- Evidencia de código: [DocumentoPostulacionViewSet.get_queryset (L82)](../../../apps/documentos/views.py); [VersionDocumentoViewSet.descargar (L305)](../../../apps/documentos/views.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-doc-062"></a>

### DIA-DOC-062 — Aprobar, rechazar u observar un documento

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Gestión documental. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de aprobar, rechazar u observar un documento, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 716×988 px, 23 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-DOC-062.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-DOC-062.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-DOC-062.md).
- Evidencia de código: [DocumentoService.aprobar_documento (L492)](../../../apps/documentos/services.py); [DocumentoService.registrar_observacion (L632)](../../../apps/documentos/services.py); [DocumentoPostulacionViewSet.aprobar (L182)](../../../apps/documentos/views.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-doc-063"></a>

### DIA-DOC-063 — Corrección administrativa y confirmación técnica

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Gestión documental. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de corrección administrativa y confirmación técnica, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 1035×671 px, 23 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-DOC-063.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-DOC-063.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-DOC-063.md).
- Evidencia de código: [ConfirmacionCorreccionDocumentoService.registrar (L913)](../../../apps/documentos/services.py); [DocumentoService.marcar_observacion_corregida (L700)](../../../apps/documentos/services.py); [ConfirmacionCorreccionDocumentoViewSet.create (L384)](../../../apps/documentos/views.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-065"></a>

### DIA-POS-065 — Programar e iniciar una defensa

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de programar e iniciar una defensa, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 971×1385 px, 40 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-POS-065.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-065.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-065.md).
- Evidencia de código: [EventoDefensaService.agregar_participante (L58)](../../../apps/postulantes/defensas.py); [EventoDefensaService.iniciar_evento_con_asistencia (L113)](../../../apps/postulantes/defensas.py); [EventoDefensaService.programar_evento (L25)](../../../apps/postulantes/defensas.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-066"></a>

### DIA-POS-066 — Evaluación, consolidación y resultado

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de evaluación, consolidación y resultado, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 955×1419 px, 42 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-POS-066.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-066.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-066.md).
- Evidencia de código: [EvaluacionDefensaService._registrar (L202)](../../../apps/postulantes/defensas.py); [EvaluacionDefensaService.calcular_resultado_final (L263)](../../../apps/postulantes/defensas.py); [EvaluacionDefensaService.consolidar_evaluacion_evento (L227)](../../../apps/postulantes/defensas.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-067"></a>

### DIA-POS-067 — Condiciones y recepción física

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de condiciones y recepción física, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 1438×1082 px, 48 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-POS-067.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-067.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-067.md).
- Evidencia de código: [CondicionService (L18)](../../../apps/postulantes/complementarios.py); [CondicionService._resolver (L28)](../../../apps/postulantes/complementarios.py); [CondicionService.verificar_multiples (L37)](../../../apps/postulantes/complementarios.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-not-060"></a>

### DIA-NOT-060 — Publicación interna y notificaciones propias

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Notificaciones. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de publicación interna y notificaciones propias, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 1103×590 px, 22 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-NOT-060.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-NOT-060.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-NOT-060.md).
- Evidencia de código: [DomainEventPublisher.publish_after_commit (L57)](../../../apps/notificaciones/events.py); [NotificationService.listar_usuario (L77)](../../../apps/notificaciones/services.py); [NotificationService.marcar_leida (L58)](../../../apps/notificaciones/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-rep-060"></a>

### DIA-REP-060 — Consulta y exportación de reportes

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Reportes. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de consulta y exportación de reportes, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 732×883 px, 19 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-REP-060.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-REP-060.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-REP-060.md).
- Evidencia de código: [CanExportReports.has_permission (L14)](../../../apps/reportes/permissions.py); [ResultadoAcademicoReportService (L95)](../../../apps/reportes/resultados.py); [DashboardService.obtener_dashboard (L162)](../../../apps/reportes/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pg-060"></a>

### DIA-PG-060 — Recorrido nominal y conclusión: Proyecto de Grado

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Proyecto de Grado. Modalidad/ámbito: Proyecto de Grado.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de recorrido nominal y conclusión: proyecto de grado, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Alta; 1945×1195 px, 42 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-PG-060.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-PG-060.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-PG-060.md).
- Evidencia de código: [ProyectoGradoPolicy (L445)](../../../apps/modalidades/proyecto_grado.py); [CierrePostulacionService (L103)](../../../apps/postulantes/cierre.py); [CierrePostulacionService.concluir_postulacion (L152)](../../../apps/postulantes/cierre.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-tg-060"></a>

### DIA-TG-060 — Recorrido nominal y conclusión: Tesis de Grado

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Tesis de Grado. Modalidad/ámbito: Tesis de Grado.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de recorrido nominal y conclusión: tesis de grado, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Principal específica. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 21.
- Complejidad visual orientativa: Alta; 1867×1195 px, 42 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-TG-060.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-TG-060.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-TG-060.md).
- Evidencia de código: [TesisGradoPolicy (L345)](../../../apps/modalidades/tesis_grado.py); [TesisGradoPolicy.validar_conclusion_academica (L809)](../../../apps/modalidades/tesis_grado.py); [TesisGradoWorkflowOrchestrator.inicializar_proceso (L53)](../../../apps/postulantes/tesis_grado_workflow.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-td-060"></a>

### DIA-TD-060 — Recorrido nominal y conclusión: Trabajo Dirigido

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Trabajo Dirigido. Modalidad/ámbito: Trabajo Dirigido.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de recorrido nominal y conclusión: trabajo dirigido, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Principal específica. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 22.
- Complejidad visual orientativa: Alta; 1955×1195 px, 42 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-TD-060.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-TD-060.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-TD-060.md).
- Evidencia de código: [TrabajoDirigidoPolicy (L287)](../../../apps/modalidades/trabajo_dirigido.py); [TrabajoDirigidoOverviewView.get (L27)](../../../apps/modalidades/trabajo_dirigido_api.py); [TrabajoDirigidoOverviewView.post (L30)](../../../apps/modalidades/trabajo_dirigido_api.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-eg-060"></a>

### DIA-EG-060 — Recorrido nominal y conclusión: Examen de Grado

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Examen de Grado. Modalidad/ámbito: Examen de Grado.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de recorrido nominal y conclusión: examen de grado, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Alta; 1904×1195 px, 42 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-EG-060.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-EG-060.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-EG-060.md).
- Evidencia de código: [ExamenGradoPolicy (L56)](../../../apps/modalidades/examen_grado.py); [ExamenGradoOverviewView.get (L27)](../../../apps/modalidades/examen_grado_api.py); [ExamenGradoOverviewView.post (L33)](../../../apps/modalidades/examen_grado_api.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-ea-060"></a>

### DIA-EA-060 — Recorrido nominal y conclusión: Excelencia Académica

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Excelencia Académica. Modalidad/ámbito: Excelencia Académica.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de recorrido nominal y conclusión: excelencia académica, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Alta; 1904×1146 px, 39 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-EA-060.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-EA-060.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-EA-060.md).
- Evidencia de código: [ExcelenciaAcademicaPolicy (L60)](../../../apps/modalidades/excelencia_academica.py); [ExcelenciaAcademicaOverviewView.get (L27)](../../../apps/modalidades/excelencia_academica_api.py); [ExcelenciaAcademicaOverviewView.post (L33)](../../../apps/modalidades/excelencia_academica_api.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-dip-060"></a>

### DIA-DIP-060 — Recorrido nominal y conclusión: Vía Diplomado

- Aporte arquitectónico: Arquitectura de procesos: expresa decisiones y coordinación de operaciones bajo las guardas del módulo.
- Categoría: Actividades. Módulo: Graduación vía Diplomado. Modalidad/ámbito: Graduación vía Diplomado.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de recorrido nominal y conclusión: vía diplomado, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Alta; 1911×1228 px, 44 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/actividades/DIA-DIP-060.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-DIP-060.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-DIP-060.md).
- Evidencia de código: [DiplomadoPolicy (L190)](../../../apps/modalidades/diplomado.py); [DiplomadoOverviewView.get (L27)](../../../apps/modalidades/diplomado_api.py); [DiplomadoOverviewView.post (L30)](../../../apps/modalidades/diplomado_api.py). El conjunto completo se localiza en la ficha técnica.

## Secuencia

<a id="dia-usr-070"></a>

### DIA-USR-070 — Login por contraseña y emisión JWT

- Aporte arquitectónico: Arquitectura de interacciones: ordena colaboraciones y fronteras de transacción del recorrido representado.
- Categoría: Secuencia. Módulo: Usuarios y autenticación. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de login por contraseña y emisión jwt, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 1242×872 px, 82 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/secuencias/DIA-USR-070.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-USR-070.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-USR-070.md).
- Evidencia de código: [LoginSerializer.validate (L49)](../../../apps/usuarios/serializers.py); [LogoutSerializer (L37)](../../../apps/usuarios/serializers.py); [UserCapabilitiesService.resolve (L39)](../../../apps/usuarios/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-usr-071"></a>

### DIA-USR-071 — Refresh compartido y reintento HTTP

- Aporte arquitectónico: Arquitectura de interacciones: ordena colaboraciones y fronteras de transacción del recorrido representado.
- Categoría: Secuencia. Módulo: Usuarios y autenticación. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de refresh compartido y reintento http, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Alta; 1115×1151 px, 128 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/secuencias/DIA-USR-071.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-USR-071.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-USR-071.md).
- Evidencia de código: [LoginSerializer.validate (L49)](../../../apps/usuarios/serializers.py); [LogoutSerializer (L37)](../../../apps/usuarios/serializers.py); [UserCapabilitiesService.resolve (L39)](../../../apps/usuarios/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-sys-004"></a>

### DIA-SYS-004 — Creación operativa y arranque por modalidad

- Aporte arquitectónico: Arquitectura de interacciones: ordena colaboraciones y fronteras de transacción del recorrido representado.
- Categoría: Secuencia. Módulo: Sistema. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de creación operativa y arranque por modalidad, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Alta; 1638×1138 px, 131 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/secuencias/DIA-SYS-004.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-SYS-004.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-SYS-004.md).
- Evidencia de código: [postulaciones_in_scope (L7)](../../../apps/postulantes/permissions.py); [ProyectoGradoWorkflowOrchestrator.inicializar_proceso (L61)](../../../apps/postulantes/proyecto_grado_workflow.py); [PostulacionService.agregar_observacion (L326)](../../../apps/postulantes/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-doc-070"></a>

### DIA-DOC-070 — Carga documental, storage y rollback

- Aporte arquitectónico: Arquitectura de interacciones: ordena colaboraciones y fronteras de transacción del recorrido representado.
- Categoría: Secuencia. Módulo: Gestión documental. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de carga documental, storage y rollback, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Principal transversal. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 14.
- Complejidad visual orientativa: Alta; 2047×1278 px, 152 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/secuencias/DIA-DOC-070.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-DOC-070.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-DOC-070.md).
- Evidencia de código: [DocumentoService.crear_nueva_version (L375)](../../../apps/documentos/services.py); [DocumentoService.subir_documento (L146)](../../../apps/documentos/services.py); [DocumentoService.subir_documento_historico (L331)](../../../apps/documentos/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-070"></a>

### DIA-POS-070 — Aprobación transaccional de etapa

- Aporte arquitectónico: Arquitectura de interacciones: ordena colaboraciones y fronteras de transacción del recorrido representado.
- Categoría: Secuencia. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de aprobación transaccional de etapa, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Alta; 1772×1103 px, 104 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/secuencias/DIA-POS-070.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-070.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-070.md).
- Evidencia de código: [DecisionAcademicaEtapaService.registrar (L111)](../../../apps/postulantes/decisiones_academicas.py); [DictamenRevisionDocumentoService.registrar (L17)](../../../apps/postulantes/dictamenes_revision.py); [RevisionTribunalPreviaService (L16)](../../../apps/postulantes/revision_tribunal.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-071"></a>

### DIA-POS-071 — Reemplazo de asignación académica

- Aporte arquitectónico: Arquitectura de interacciones: ordena colaboraciones y fronteras de transacción del recorrido representado.
- Categoría: Secuencia. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de reemplazo de asignación académica, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Alta; 1438×1089 px, 135 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/secuencias/DIA-POS-071.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-071.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-071.md).
- Evidencia de código: [AsignacionService.asignar_actor (L30)](../../../apps/postulantes/asignaciones.py); [AsignacionService.finalizar_asignacion (L195)](../../../apps/postulantes/asignaciones.py); [AsignacionService.reemplazar_actor (L233)](../../../apps/postulantes/asignaciones.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-072"></a>

### DIA-POS-072 — Inicio de defensa con asistencia pendiente

- Aporte arquitectónico: Arquitectura de interacciones: ordena colaboraciones y fronteras de transacción del recorrido representado.
- Categoría: Secuencia. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de inicio de defensa con asistencia pendiente, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Alta; 1360×1027 px, 122 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/secuencias/DIA-POS-072.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-072.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-072.md).
- Evidencia de código: [EventoDefensaService.agregar_participante (L58)](../../../apps/postulantes/defensas.py); [EventoDefensaService.iniciar_evento_con_asistencia (L113)](../../../apps/postulantes/defensas.py); [EventoDefensaService.programar_evento (L25)](../../../apps/postulantes/defensas.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-073"></a>

### DIA-POS-073 — Consolidación y efectos académicos

- Aporte arquitectónico: Arquitectura de interacciones: ordena colaboraciones y fronteras de transacción del recorrido representado.
- Categoría: Secuencia. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de consolidación y efectos académicos, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Principal transversal. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 15.
- Complejidad visual orientativa: Alta; 1460×1297 px, 106 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/secuencias/DIA-POS-073.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-073.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-073.md).
- Evidencia de código: [EvaluacionDefensaService._registrar (L202)](../../../apps/postulantes/defensas.py); [EvaluacionDefensaService.calcular_resultado_final (L263)](../../../apps/postulantes/defensas.py); [EvaluacionDefensaService.consolidar_evaluacion_evento (L227)](../../../apps/postulantes/defensas.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-074"></a>

### DIA-POS-074 — Conclusión común validada por modalidad

- Aporte arquitectónico: Arquitectura de interacciones: ordena colaboraciones y fronteras de transacción del recorrido representado.
- Categoría: Secuencia. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de conclusión común validada por modalidad, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Principal transversal. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 16.
- Complejidad visual orientativa: Alta; 1398×1042 px, 105 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/secuencias/DIA-POS-074.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-074.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-074.md).
- Evidencia de código: [DecisionAcademicaEtapaService.registrar (L111)](../../../apps/postulantes/decisiones_academicas.py); [DictamenRevisionDocumentoService.registrar (L17)](../../../apps/postulantes/dictamenes_revision.py); [RevisionTribunalPreviaService (L16)](../../../apps/postulantes/revision_tribunal.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-not-070"></a>

### DIA-NOT-070 — Callbacks después del commit y deduplicación

- Aporte arquitectónico: Arquitectura de interacciones: ordena colaboraciones y fronteras de transacción del recorrido representado.
- Categoría: Secuencia. Módulo: Notificaciones. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de callbacks después del commit y deduplicación, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Alta; 1423×974 px, 115 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/secuencias/DIA-NOT-070.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-NOT-070.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-NOT-070.md).
- Evidencia de código: [DomainEventPublisher.publish (L50)](../../../apps/notificaciones/events.py); [DomainEventPublisher.publish_after_commit (L57)](../../../apps/notificaciones/events.py); [NotificationService.crear_notificacion (L35)](../../../apps/notificaciones/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pg-070"></a>

### DIA-PG-070 — Cierre documental, conclusión y reapertura de Proyecto

- Aporte arquitectónico: Arquitectura de interacciones: ordena colaboraciones y fronteras de transacción del recorrido representado.
- Categoría: Secuencia. Módulo: Proyecto de Grado. Modalidad/ámbito: Proyecto de Grado.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de cierre documental, conclusión y reapertura de proyecto, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Principal específica. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 20.
- Complejidad visual orientativa: Alta; 1265×1652 px, 196 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/secuencias/DIA-PG-070.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-PG-070.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-PG-070.md).
- Evidencia de código: [CierrePostulacionService (L103)](../../../apps/postulantes/cierre.py); [CierrePostulacionService.aprobar_cierre_documental (L143)](../../../apps/postulantes/cierre.py); [CierrePostulacionService.reabrir_cierre (L163)](../../../apps/postulantes/cierre.py). El conjunto completo se localiza en la ficha técnica.

## Estados

<a id="dia-sys-005"></a>

### DIA-SYS-005 — Estado general de postulación: rutas comprobadas

- Aporte arquitectónico: Arquitectura de ciclo de vida: separa estados, eventos y guardas de una dimensión concreta; no universaliza choices.
- Categoría: Estados. Módulo: Sistema. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de estado general de postulación: rutas comprobadas, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 481×892 px, 76 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-SYS-005.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-SYS-005.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-SYS-005.md).
- Evidencia de código: [CierrePostulacionService.reabrir_cierre (L163)](../../../apps/postulantes/cierre.py); [postulaciones_in_scope (L7)](../../../apps/postulantes/permissions.py); [PostulacionService.agregar_observacion (L326)](../../../apps/postulantes/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-080"></a>

### DIA-POS-080 — Vigencia independiente de postulación

- Aporte arquitectónico: Arquitectura de ciclo de vida: separa estados, eventos y guardas de una dimensión concreta; no universaliza choices.
- Categoría: Estados. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de vigencia independiente de postulación, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 603×550 px, 62 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-POS-080.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-080.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-080.md).
- Evidencia de código: [Postulacion (L159)](../../../apps/postulantes/models.py); [postulaciones_in_scope (L7)](../../../apps/postulantes/permissions.py); [PostulacionService.agregar_observacion (L326)](../../../apps/postulantes/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-081"></a>

### DIA-POS-081 — Ciclo técnico de un seguimiento

- Aporte arquitectónico: Arquitectura de ciclo de vida: separa estados, eventos y guardas de una dimensión concreta; no universaliza choices.
- Categoría: Estados. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de ciclo técnico de un seguimiento, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Principal transversal. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 17.
- Complejidad visual orientativa: Alta; 1048×733 px, 104 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-POS-081.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-081.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-081.md).
- Evidencia de código: [CierrePostulacionService.reabrir_cierre (L163)](../../../apps/postulantes/cierre.py); [DecisionAcademicaEtapaService.registrar (L111)](../../../apps/postulantes/decisiones_academicas.py); [DictamenRevisionDocumentoService.registrar (L17)](../../../apps/postulantes/dictamenes_revision.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-doc-080"></a>

### DIA-DOC-080 — Estado de revisión del documento

- Aporte arquitectónico: Arquitectura de ciclo de vida: separa estados, eventos y guardas de una dimensión concreta; no universaliza choices.
- Categoría: Estados. Módulo: Gestión documental. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de estado de revisión del documento, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Principal transversal. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 18.
- Complejidad visual orientativa: Media; 624×556 px, 63 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-DOC-080.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-DOC-080.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-DOC-080.md).
- Evidencia de código: [DocumentoService.aprobar_documento (L492)](../../../apps/documentos/services.py); [DocumentoService.crear_nueva_version (L375)](../../../apps/documentos/services.py); [DocumentoService.rechazar_documento (L562)](../../../apps/documentos/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-doc-081"></a>

### DIA-DOC-081 — Actualidad de una versión documental

- Aporte arquitectónico: Arquitectura de ciclo de vida: separa estados, eventos y guardas de una dimensión concreta; no universaliza choices.
- Categoría: Estados. Módulo: Gestión documental. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de actualidad de una versión documental, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 393×482 px, 33 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-DOC-081.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-DOC-081.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-DOC-081.md).
- Evidencia de código: [DocumentoService.crear_nueva_version (L375)](../../../apps/documentos/services.py); [DocumentoService.subir_documento (L146)](../../../apps/documentos/services.py); [DocumentoService.subir_documento_historico (L331)](../../../apps/documentos/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-doc-082"></a>

### DIA-DOC-082 — Corrección de una observación documental

- Aporte arquitectónico: Arquitectura de ciclo de vida: separa estados, eventos y guardas de una dimensión concreta; no universaliza choices.
- Categoría: Estados. Módulo: Gestión documental. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de corrección de una observación documental, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 428×465 px, 24 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-DOC-082.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-DOC-082.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-DOC-082.md).
- Evidencia de código: [ConfirmacionCorreccionDocumentoService.registrar (L913)](../../../apps/documentos/services.py); [DocumentoService.marcar_observacion_corregida (L700)](../../../apps/documentos/services.py); [DocumentoService.registrar_observacion (L632)](../../../apps/documentos/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-082"></a>

### DIA-POS-082 — Ciclo de evento de defensa

- Aporte arquitectónico: Arquitectura de ciclo de vida: separa estados, eventos y guardas de una dimensión concreta; no universaliza choices.
- Categoría: Estados. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de ciclo de evento de defensa, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Principal transversal. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 19.
- Complejidad visual orientativa: Media; 834×737 px, 91 nodos de texto. Calidad: Vector verificado técnicamente; encaje y lectura de página pendientes.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-POS-082.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-082.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-082.md).
- Evidencia de código: [EventoDefensaService._cerrar (L173)](../../../apps/postulantes/defensas.py); [EventoDefensaService.agregar_participante (L58)](../../../apps/postulantes/defensas.py); [EventoDefensaService.finalizar_evento (L162)](../../../apps/postulantes/defensas.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-not-080"></a>

### DIA-NOT-080 — Lectura de notificación propia

- Aporte arquitectónico: Arquitectura de ciclo de vida: separa estados, eventos y guardas de una dimensión concreta; no universaliza choices.
- Categoría: Estados. Módulo: Notificaciones. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de lectura de notificación propia, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 344×471 px, 44 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-NOT-080.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-NOT-080.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-NOT-080.md).
- Evidencia de código: [NotificationService.crear_notificacion (L35)](../../../apps/notificaciones/services.py); [NotificationService.listar_usuario (L77)](../../../apps/notificaciones/services.py); [NotificationService.marcar_leida (L58)](../../../apps/notificaciones/services.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-083"></a>

### DIA-POS-083 — Resolución de condición complementaria

- Aporte arquitectónico: Arquitectura de ciclo de vida: separa estados, eventos y guardas de una dimensión concreta; no universaliza choices.
- Categoría: Estados. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de resolución de condición complementaria, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 412×465 px, 33 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-POS-083.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-083.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-083.md).
- Evidencia de código: [CondicionService (L18)](../../../apps/postulantes/complementarios.py); [CondicionService._resolver (L28)](../../../apps/postulantes/complementarios.py); [CondicionService.crear (L21)](../../../apps/postulantes/complementarios.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-084"></a>

### DIA-POS-084 — Recepción física y cantidades

- Aporte arquitectónico: Arquitectura de ciclo de vida: separa estados, eventos y guardas de una dimensión concreta; no universaliza choices.
- Categoría: Estados. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de recepción física y cantidades, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Media; 699×609 px, 89 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-POS-084.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-084.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-084.md).
- Evidencia de código: [CondicionService (L18)](../../../apps/postulantes/complementarios.py); [EntregaFisicaService (L73)](../../../apps/postulantes/complementarios.py); [EntregaFisicaService.crear (L76)](../../../apps/postulantes/complementarios.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-eg-080"></a>

### DIA-EG-080 — Estado persistido del área de Examen

- Aporte arquitectónico: Arquitectura de ciclo de vida: separa estados, eventos y guardas de una dimensión concreta; no universaliza choices.
- Categoría: Estados. Módulo: Examen de Grado. Modalidad/ámbito: Examen de Grado.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de estado persistido del área de examen, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Principal específica. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 23.
- Complejidad visual orientativa: Media; 630×633 px, 60 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-EG-080.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-EG-080.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-EG-080.md).
- Evidencia de código: [ExamenGradoOverviewView.get (L27)](../../../apps/modalidades/examen_grado_api.py); [ExamenGradoOverviewView.post (L33)](../../../apps/modalidades/examen_grado_api.py); [ExamenGradoService.concluir (L139)](../../../apps/modalidades/examen_grado_service.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-dip-080"></a>

### DIA-DIP-080 — Estado persistido de módulo de Diplomado

- Aporte arquitectónico: Arquitectura de ciclo de vida: separa estados, eventos y guardas de una dimensión concreta; no universaliza choices.
- Categoría: Estados. Módulo: Graduación vía Diplomado. Modalidad/ámbito: Graduación vía Diplomado.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de estado persistido de módulo de diplomado, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Principal específica. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 25.
- Complejidad visual orientativa: Media; 490×609 px, 65 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-DIP-080.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-DIP-080.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-DIP-080.md).
- Evidencia de código: [DiplomadoOverviewView.get (L27)](../../../apps/modalidades/diplomado_api.py); [DiplomadoOverviewView.post (L30)](../../../apps/modalidades/diplomado_api.py); [DiplomadoService.conclude (L85)](../../../apps/modalidades/diplomado_service.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-pos-085"></a>

### DIA-POS-085 — Vigencia de una asignación académica

- Aporte arquitectónico: Arquitectura de ciclo de vida: separa estados, eventos y guardas de una dimensión concreta; no universaliza choices.
- Categoría: Estados. Módulo: Expedientes y seguimiento. Modalidad/ámbito: Transversal; aplicación según permisos y policy.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de vigencia de una asignación académica, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Anexo de profundización. Detalle especializado o vista alternativa que profundiza la arquitectura sin repetir el hilo principal.
- Complejidad visual orientativa: Baja; 394×465 px, 24 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-POS-085.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-POS-085.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-POS-085.md).
- Evidencia de código: [AsignacionService.asignar_actor (L30)](../../../apps/postulantes/asignaciones.py); [AsignacionService.finalizar_asignacion (L195)](../../../apps/postulantes/asignaciones.py); [AsignacionService.reemplazar_actor (L233)](../../../apps/postulantes/asignaciones.py). El conjunto completo se localiza en la ficha técnica.

<a id="dia-ea-080"></a>

### DIA-EA-080 — Resultado del expediente de Excelencia

- Aporte arquitectónico: Arquitectura de ciclo de vida: separa estados, eventos y guardas de una dimensión concreta; no universaliza choices.
- Categoría: Estados. Módulo: Excelencia Académica. Modalidad/ámbito: Excelencia Académica.
- Funcionalidad/objetivo: Documentar el comportamiento implementado de resultado del expediente de excelencia, con decisiones, guardas y límites de evidencia..
- Importancia para defensa: Principal específica. Vista seleccionada por su aporte al hilo de análisis/diseño. Figura 24.
- Complejidad visual orientativa: Media; 522×603 px, 49 nodos de texto. Calidad: Vector; orientación y tamaño por verificar en maquetación.
- Recursos originales: [PlantUML](../diagramas/fuentes/fase-5/estados/DIA-EA-080.puml) · [SVG](../diagramas/renderizados/fase-5/DIA-EA-080.svg) · [Ficha técnica](../diagramas/fichas/fase-5/DIA-EA-080.md).
- Evidencia de código: [ExcelenciaAcademicaOverviewView.get (L27)](../../../apps/modalidades/excelencia_academica_api.py); [ExcelenciaAcademicaOverviewView.post (L33)](../../../apps/modalidades/excelencia_academica_api.py); [ExcelenciaAcademicaService.concluir (L106)](../../../apps/modalidades/excelencia_academica_service.py). El conjunto completo se localiza en la ficha técnica.
