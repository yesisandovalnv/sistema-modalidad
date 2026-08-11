# Backlog oficial del proyecto

**Sistema:** Gestión de Modalidades de Graduación

**Ámbito funcional prioritario:** Proyecto de Grado

**Versión:** 1.0 — planificación posterior al Sprint 0.5

**Estado:** vigente para planificación; sujeto al control de cambios de la sección 13

## 1. Propósito y reglas de gobierno

Este documento gobierna la planificación del desarrollo. Su fuente funcional principal es `docs/CONTRATO_FUNCIONAL_PROYECTO_GRADO.md`; su factibilidad se contrasta con la arquitectura, API y frontend existentes. La normativa ya analizada se utiliza únicamente mediante el contrato funcional y sus referencias.

Reglas de uso:

1. Ninguna historia puede ampliar o contradecir el contrato funcional.
2. Una operación técnica no equivale a un acto administrativo formal.
3. No se crea ni presume un endpoint. Cuando no existe, la matriz lo declara expresamente.
4. Las capacidades informativas del frontend no sustituyen los permisos efectivos del API.
5. Las contradicciones institucionales permanecen bloqueadas hasta una decisión documentada.
6. El backlog diferencia funcionalidad existente, cobertura parcial y trabajo pendiente.
7. Los cambios de alcance requieren actualizar el contrato funcional antes o junto con este backlog.

### 1.1 Convenciones

- **Prioridad:** Must Have, Should Have, Could Have o Won't Have por ahora.
- **Estado:** Implementada, Parcial, Pendiente o Bloqueada.
- **Actor administrativo:** usuario con autoridad técnica `is_staff` o `is_superuser`; no acredita por sí solo Dirección, Jefatura o Decanato.
- **Actor asignado:** usuario relacionado temporalmente con una postulación como Tutor, Tribunal, Docente de Modalidad, Presidente o Secretario.
- **Expediente:** composición de datos existentes; no certifica aprobación formal del tema, originalidad, firmas ni legalización.

## 2. Épicas

| ID | Épica | Objetivo y alcance | Prioridad | Dependencias | Estado actual |
|---|---|---|---|---|---|
| EP-01 | Autenticación | Iniciar/cerrar sesión, recuperar identidad y aplicar capacidades efectivas. | Must | API de usuarios, JWT | Implementada |
| EP-02 | Panel principal | Mostrar indicadores institucionales filtrables y advertencias sin modificar datos. | Should | Autenticación, reportes, catálogos | Implementada |
| EP-03 | Postulaciones | Consultar, registrar y actualizar postulaciones dentro del alcance autorizado, sin borrado físico. | Must | Usuarios, catálogos, permisos | Parcial |
| EP-04 | Expediente de Proyecto de Grado | Reunir en una sola vista resumen, flujo, actores, documentos, defensas, condiciones y cierre. | Must | Postulaciones y todas las épicas operativas | Implementada |
| EP-05 | Documentos | Consultar, cargar, versionar, observar y revisar evidencias con trazabilidad. | Must | Postulaciones, catálogos documentales | Parcial |
| EP-06 | Seguimiento | Representar macroetapas, intentos, estados y transiciones autorizadas. | Must | Postulaciones, política de modalidad | Parcial |
| EP-07 | Asignaciones | Consultar y gestionar participaciones temporales sin confundirlas con designaciones formales. | Must | Postulaciones, usuarios | Backend implementado; frontend pendiente |
| EP-08 | Defensas | Programar y administrar eventos, participantes, asistencia, quórum y reprogramación. | Must | Seguimiento, asignaciones | Backend implementado; frontend pendiente |
| EP-09 | Evaluaciones | Registrar y consolidar consensos de Perfil, Privada y Pública con notas directas confirmadas. | Must | Defensas finalizadas, permisos administrativos | Implementada |
| EP-10 | Cierre | Consultar faltantes, aprobar revisión/cierre, concluir y reabrir con advertencias normativas. | Must | Documentos, evaluaciones, condiciones, entregas | Implementada |
| EP-11 | Reportes | Consultar y exportar información institucional según alcance y filtros. | Should | Postulaciones y módulos operativos | Implementada |
| EP-12 | Notificaciones | Informar eventos de dominio al destinatario y gestionar lectura. | Should | Eventos de las épicas operativas | Implementada |
| EP-13 | Catálogos | Administrar periodos, modalidades, requisitos y catálogos documentales con protección referencial. | Should | Autenticación y permisos administrativos | Parcial |
| EP-14 | Usuarios | Exponer identidad propia y, en el futuro, administración controlada de usuarios. | Should | Autenticación, roles | Parcial |
| EP-15 | Roles y capacidades | Mostrar capacidades efectivas y separar rol global, cargo y asignación temporal. | Must | Usuarios y permisos | Parcial |
| EP-16 | Auditoría | Preservar historial inmutable y ofrecer trazabilidad comprensible. | Should | Servicios de dominio y usuarios | Parcial |
| EP-17 | Configuración | Gestionar configuración académica permitida sin convertir decisiones normativas en parámetros arbitrarios. | Should | Catálogos, políticas | Parcial |

## 3. Historias de usuario y criterios de aceptación

### EP-01 — Autenticación

| ID / título | Historia, actor, prioridad, dependencias y estado | Criterios de aceptación |
|---|---|---|
| **US-001 — Iniciar sesión** | Como usuario activo, quiero iniciar sesión con mis credenciales para acceder a las capacidades autorizadas. **Actor:** usuario. **Prioridad:** Must. **Dependencias:** ninguna funcional. **Estado:** Implementada. | Valida credenciales; distingue 401/403 de error de conexión; conserva tokens solo tras éxito; redirige al área protegida; no revela datos sensibles; evita doble envío. |
| **US-002 — Mantener y cerrar sesión** | Como usuario autenticado, quiero recuperar mi perfil y cerrar o perder la sesión de forma segura. **Actor:** usuario. **Prioridad:** Must. **Dependencias:** US-001. **Estado:** Implementada. | Consulta identidad mediante `me`; elimina tokens al cerrar o recibir 401; muestra carga mientras resuelve sesión; no renderiza rutas protegidas sin autenticación; el logout remoto no impide limpiar la sesión local. |

### EP-02 — Panel principal

| ID / título | Historia, actor, prioridad, dependencias y estado | Criterios de aceptación |
|---|---|---|
| **US-003 — Consultar indicadores** | Como personal autorizado, quiero ver indicadores consolidados para conocer el estado de las postulaciones. **Actor:** personal/docente con capacidad. **Prioridad:** Should. **Dependencias:** US-002. **Estado:** Implementada. | Muestra totales, estados, etapas, documentos, defensas y cierre; limita datos por alcance; presenta carga, vacío y error; no permite mutaciones; muestra advertencias del backend. |
| **US-004 — Filtrar el panel** | Como personal autorizado, quiero filtrar indicadores por periodo, modalidad y etapa para analizar un segmento válido. **Actor:** personal/docente. **Prioridad:** Should. **Dependencias:** US-003, US-027. **Estado:** Implementada. | Solo ofrece modalidades y etapas existentes; limpia etapas incompatibles al cambiar modalidad; aplica filtros explícitamente; cancela consultas obsoletas; no duplica solicitudes por una misma acción. |

### EP-03 — Postulaciones

| ID / título | Historia, actor, prioridad, dependencias y estado | Criterios de aceptación |
|---|---|---|
| **US-005 — Listar postulaciones por alcance** | Como usuario autenticado, quiero consultar postulaciones relacionadas conmigo para acceder únicamente a información autorizada. **Actor:** estudiante, actor asignado o personal. **Prioridad:** Must. **Dependencias:** US-002. **Estado:** Implementada. | Personal ve el alcance administrativo; estudiante solo las propias; docente solo las asignadas; admite búsqueda y paginación; muestra estudiante, modalidad, periodo y estado con etiquetas legibles; 403 se explica claramente. |
| **US-006 — Registrar una postulación** | Como personal autorizado, quiero registrar una postulación para iniciar su gestión técnica. **Actor:** personal administrativo. **Prioridad:** Must. **Dependencias:** US-005, US-027, US-033. **Estado:** Implementada con límite contractual. | Solo aparece con capacidad efectiva; utiliza estudiante, modalidad y periodo reales; exige campos obligatorios; evita doble envío; conserva errores de campo; no afirma admisión formal, tema aprobado ni exclusividad no validada. |
| **US-007 — Consultar y actualizar datos básicos** | Como personal autorizado o interesado, quiero ver el detalle básico y, si tengo permiso, actualizar datos editables. **Actor:** usuario relacionado/personal. **Prioridad:** Must. **Dependencias:** US-005. **Estado:** Parcial. | Lectura respeta alcance; escritura solo para personal; no ofrece DELETE; distingue datos básicos de actos formales; conserva historial mediante servicios cuando cambia estado; incluye acceso al expediente US-008. |

### EP-04 — Expediente de Proyecto de Grado

| ID / título | Historia, actor, prioridad, dependencias y estado | Criterios de aceptación |
|---|---|---|
| **US-008 — Abrir el expediente** | Como Coordinador o usuario relacionado, quiero abrir el expediente de una postulación para consultar su información desde una sola pantalla. **Actor:** personal, estudiante o actor asignado. **Prioridad:** Must. **Dependencias:** US-005. **Estado:** Pendiente. | Tiene ruta protegida y enlace desde postulación; carga solo una postulación autorizada; muestra resumen, estudiante, modalidad, periodo, estado y macroetapa; funciona en viewport normal/móvil; ofrece estados de carga, vacío, 403 y 404; no repite consultas evitables. |
| **US-009 — Consultar secciones del expediente** | Como usuario relacionado, quiero navegar por historial, observaciones, documentos, seguimiento, asignaciones, defensas, condiciones y cierre. **Actor:** usuario relacionado. **Prioridad:** Must. **Dependencias:** US-008, US-011, US-014, US-016, US-019, US-023. **Estado:** Implementada. | `ExpedientePage` compone una única ruta con resumen, flujo, límites, historial, documentos/versiones/observaciones, actores activos e históricos, defensas/participantes/asistencia/quórum/evaluaciones, resultado final, condiciones, entregas y cierre técnico. Cada sección conserva carga, error, reintento y cancelación independientes; las acciones dependen de capacidades efectivas. |
| **US-010 — Ver límites normativos** | Como usuario del expediente, quiero ver advertencias contractuales para no interpretar registros técnicos como cumplimiento oficial. **Actor:** todos los usuarios del expediente. **Prioridad:** Must. **Dependencias:** US-008, US-025. **Estado:** Pendiente. | Advierte sobre tema/originalidad, 30 % privado, clasificación, ejemplares y grupos cuando corresponda; presenta `nota_final=null` sin cálculo local; no declara plazos automáticos; diferencia cierre técnico de legalización. |

### EP-05 — Documentos

| ID / título | Historia, actor, prioridad, dependencias y estado | Criterios de aceptación |
|---|---|---|
| **US-011 — Consultar documentos y versiones** | Como usuario relacionado, quiero consultar documentos, versiones y observaciones permitidas. **Actor:** estudiante, revisor o personal. **Prioridad:** Must. **Dependencias:** US-005. **Estado:** Parcial. | Lista solo documentos dentro del alcance; muestra tipo, estado, fecha y corrección; permite abrir versiones y observaciones; identifica versión actual; no expone archivos ajenos; admite carga/error/vacío. |
| **US-012 — Cargar documento o nueva versión** | Como estudiante propietario o personal autorizado, quiero cargar una evidencia válida para continuar el flujo documental. **Actor:** estudiante/personal. **Prioridad:** Must. **Dependencias:** US-011, US-027. **Estado:** Parcial. | Usa una postulación seleccionable, no exige conocer ID interno; valida tipo, extensión y tamaño; evita doble envío; conserva error de campo; actualiza lista/versiones; no permite cargar en postulación ajena. |
| **US-013 — Revisar un documento** | Como personal autorizado, quiero aprobar, rechazar u observar documentos para registrar el dictamen técnico. **Actor:** personal administrativo/revisor autorizado. **Prioridad:** Must. **Dependencias:** US-011. **Estado:** Backend implementado; frontend pendiente. | Acciones solo visibles con capacidad efectiva; requieren datos exigidos por API; observación queda asociada a versión; corrección se marca trazablemente; no usa PATCH/DELETE del recurso base; 403 y conflictos se explican. |

### EP-06 — Seguimiento

| ID / título | Historia, actor, prioridad, dependencias y estado | Criterios de aceptación |
|---|---|---|
| **US-014 — Consultar macroetapas e intentos** | Como usuario relacionado, quiero ver el seguimiento secuencial para conocer la situación técnica de la postulación. **Actor:** estudiante, actor asignado o personal. **Prioridad:** Must. **Dependencias:** US-005. **Estado:** Implementada. | Ordena por etapa e intento; muestra estado, inicio, fin y observaciones; usa nombres de macroetapa técnica; no presenta las ocho macroetapas como las veinte etapas normativas; respeta alcance. |
| **US-015 — Gestionar transición de etapa** | Como personal autorizado, quiero iniciar, observar, aprobar, rechazar u omitir una etapa conforme al workflow. **Actor:** personal administrativo. **Prioridad:** Must. **Dependencias:** US-014. **Estado:** Implementada. | Solo muestra transiciones autorizadas; el backend valida orden y precondiciones; `omitir` no se ofrece para etapa obligatoria; solicita observación cuando corresponde; evita doble acción; actualiza estado e historial. |

### EP-07 — Asignaciones

| ID / título | Historia, actor, prioridad, dependencias y estado | Criterios de aceptación |
|---|---|---|
| **US-016 — Consultar actores asignados** | Como usuario relacionado, quiero ver Tutor, Tribunal y demás participaciones para conocer quién interviene en la postulación. **Actor:** estudiante, asignado o personal. **Prioridad:** Must. **Dependencias:** US-005. **Estado:** Backend implementado; frontend pendiente. | Muestra activas e históricas; indica tipo, orden, fechas y etapa; oculta asignaciones ajenas; distingue participación temporal de cargo/designación formal; no afirma existencia de memorando. |
| **US-017 — Asignar, reemplazar o finalizar actor** | Como personal autorizado, quiero gestionar participaciones temporales conservando trazabilidad. **Actor:** personal administrativo. **Prioridad:** Must. **Dependencias:** US-016, US-033, HT-003. **Estado:** Bloqueada por decisiones institucionales. | Usa usuarios activos y tipos soportados; valida reglas y duplicidad; reemplazo finaliza la asignación previa; exige motivo/observación cuando API lo requiera; no borra historial; actualiza defensas futuras sin alterar actos pasados. |

### EP-08 — Defensas

| ID / título | Historia, actor, prioridad, dependencias y estado | Criterios de aceptación |
|---|---|---|
| **US-018 — Consultar defensas** | Como usuario relacionado, quiero consultar eventos de perfil, privada y pública para conocer su programación y resultado técnico. **Actor:** estudiante, participante o personal. **Prioridad:** Must. **Dependencias:** US-005. **Estado:** Backend implementado; frontend pendiente. | Lista solo eventos autorizados; muestra tipo, intento, fecha, estado, lugar/modalidad, participantes y evaluaciones; distingue programada/suspendida/cancelada/finalizada; no afirma convocatoria formal publicada. |
| **US-019 — Programar y administrar una defensa** | Como personal autorizado, quiero programar, iniciar, finalizar, suspender, cancelar o reprogramar una defensa. **Actor:** personal administrativo. **Prioridad:** Must. **Dependencias:** US-014, US-016. **Estado:** Backend implementado; frontend pendiente. | Selecciona etapa compatible; valida asignaciones mínimas; pública respeta 48 horas; exige lugar o enlace según modalidad técnica; requiere motivo para suspensión/cancelación/reprogramación; impide transiciones inválidas. |
| **US-020 — Gestionar participantes y quórum** | Como personal autorizado, quiero convocar participantes, registrar asistencia y consultar quórum para operar la defensa. **Actor:** personal administrativo; lectura para relacionados. **Prioridad:** Must. **Dependencias:** US-019. **Estado:** Backend implementado; frontend pendiente. | Solo agrega asignaciones activas compatibles; registra asistencia durante evento en curso; muestra faltantes por rol; separa composición formal pendiente de quórum técnico; impide finalizar sin quórum; conserva observaciones. |

### EP-09 — Evaluaciones

| ID / título | Historia, actor, prioridad, dependencias y estado | Criterios de aceptación |
|---|---|---|
| **US-021 — Registrar evaluación de defensa** | Como personal técnico autorizado, quiero registrar la evaluación consensuada del Tribunal para aportar al resultado del evento. **Actor:** personal administrativo; lectura para relacionados. **Prioridad:** Must. **Dependencias:** US-018, US-020. **Estado:** Implementada. | Exige quórum técnico y evento `EN_CURSO` o `FINALIZADA`; registra un único consenso por evento: Perfil cualitativo, Privada cualitativa más nota directa 0–30 y Pública con nota directa 0–70. Tutor, Docente de Modalidad, Presidente y Secretario no califican; evita duplicidad y audita la operación. |
| **US-022 — Consolidar y consultar resultado** | Como personal autorizado o interesado, quiero consolidar el evento y consultar el resultado permitido. **Actor:** personal para consolidar; relacionado para consultar. **Prioridad:** Must. **Dependencias:** US-021. **Estado:** Implementada. | Consolida un evento finalizado con su consenso único. La nota final se calcula exclusivamente en backend como `nota_privada + nota_publica`, sin volver a ponderar; queda `null` si falta alguna. Aplica la escala específica: 0–50 `POSTERGADO`, 51–74 `APROBADO`, 75–89 `APROBACION_PLENA`, 90–100 `APROBACION_PLENA_CON_FELICITACION`. |

### EP-10 — Cierre

| ID / título | Historia, actor, prioridad, dependencias y estado | Criterios de aceptación |
|---|---|---|
| **US-023 — Consultar condiciones, entregas y faltantes** | Como usuario relacionado, quiero consultar el estado de cierre para saber qué controles técnicos faltan. **Actor:** estudiante, asignado o personal. **Prioridad:** Must. **Dependencias:** US-011, US-022. **Estado:** Implementada. | El expediente muestra condiciones, entregas, documentos, etapas y faltantes, con verificador/receptor, fechas y observaciones. Las acciones existentes de verificación y registro son administrativas, rechazan postulaciones no editables y conservan auditoría. La cantidad de ejemplares se presenta como dato técnico/configurado, no como cantidad normativa oficial, y no se denomina el resultado “cierre legal”. |
| **US-024 — Gestionar revisión y cierre** | Como personal autorizado, quiero verificar condiciones/entregas, aprobar revisión final y cierre, concluir o reabrir motivadamente. **Actor:** personal administrativo. **Prioridad:** Must. **Dependencias:** US-023. **Estado:** Implementada. | Las acciones existentes dependen de `puede_gestionar_cierre`; el backend exige resultado final completo y aprobatorio, impide continuar con faltantes, exige motivo para reabrir y todas las etapas obligatorias para concluir. La UI confirma, evita doble envío, conserva errores y refresca parcialmente. Toda acción se audita y se presenta exclusivamente como cierre técnico/documental. |

### EP-11 — Reportes

| ID / título | Historia, actor, prioridad, dependencias y estado | Criterios de aceptación |
|---|---|---|
| **US-025 — Consultar reporte de postulaciones** | Como personal autorizado, quiero consultar una tabla filtrable para analizar postulaciones. **Actor:** personal/docente con capacidad. **Prioridad:** Should. **Dependencias:** US-002. **Estado:** Implementada. | Respeta alcance; filtra, ordena y pagina; muestra Tutor, etapa, avance, documentos, próxima defensa y cierre; usa etiquetas neutrales; maneja vacío, error y cancelación. |
| **US-026 — Exportar reporte CSV** | Como personal autorizado, quiero exportar el reporte filtrado para análisis externo controlado. **Actor:** personal con capacidad de exportación. **Prioridad:** Could. **Dependencias:** US-025. **Estado:** Implementada. | Botón solo con capacidad; conserva filtros; respeta límite del backend; descarga nombre provisto o seguro; informa errores; no exporta datos fuera de alcance. |

### EP-12 — Notificaciones

| ID / título | Historia, actor, prioridad, dependencias y estado | Criterios de aceptación |
|---|---|---|
| **US-027 — Consultar notificaciones propias** | Como usuario, quiero consultar mis notificaciones para conocer eventos relevantes. **Actor:** usuario autenticado. **Prioridad:** Should. **Dependencias:** US-002. **Estado:** Implementada. | Solo muestra destinatario autenticado; permite filtros/paginación y detalle; el badge usa conteo real y accesible; maneja carga, vacío y error. |
| **US-028 — Gestionar estado de lectura** | Como usuario, quiero marcar una, varias o todas mis notificaciones para organizar mi bandeja. **Actor:** destinatario. **Prioridad:** Should. **Dependencias:** US-027. **Estado:** Implementada. | Permite marcar leída/no leída y todas leídas; actualiza badge; no modifica notificaciones ajenas; evita estados visuales contradictorios; maneja error sin perder la bandeja. |

### EP-13 — Catálogos

| ID / título | Historia, actor, prioridad, dependencias y estado | Criterios de aceptación |
|---|---|---|
| **US-029 — Gestionar catálogos académicos** | Como personal autorizado, quiero gestionar periodos, modalidades, requisitos y relaciones modalidad–requisito. **Actor:** personal administrativo. **Prioridad:** Should. **Dependencias:** US-002. **Estado:** Parcial. | Lectura autenticada; escritura solo staff; valida códigos/fechas/relaciones; desactiva cuando corresponda; maneja protección referencial; incluye relación modalidad–requisito, hoy sin pantalla dedicada. |
| **US-030 — Gestionar catálogos documentales y estados** | Como personal autorizado, quiero gestionar tipos y estados de documento/postulación para mantener contratos operativos. **Actor:** personal administrativo. **Prioridad:** Should. **Dependencias:** US-002. **Estado:** Backend implementado; frontend pendiente. | Estados técnicos no se eliminan; tipos referenciados respetan protección; edición exige staff; estudiantes no ven CRUD administrativo; cambios no alteran evidencias históricas. |

### EP-14 — Usuarios

| ID / título | Historia, actor, prioridad, dependencias y estado | Criterios de aceptación |
|---|---|---|
| **US-031 — Consultar perfil propio** | Como usuario, quiero consultar mi identidad y capacidades para entender mi acceso. **Actor:** usuario autenticado. **Prioridad:** Should. **Dependencias:** US-002. **Estado:** Implementada. | Muestra datos de `me` sin secretos/tokens; lista capacidades efectivas; no interpreta el nombre del rol; funciona para perfiles con datos opcionales vacíos. |
| **US-032 — Administrar usuarios** | Como administrador, quiero crear, activar y mantener usuarios para controlar acceso institucional. **Actor:** administrador. **Prioridad:** Won't Have por ahora. **Dependencias:** decisión de alcance y API inexistente. **Estado:** Bloqueada. | No se inicia hasta existir contrato, endpoints y permisos; no reutiliza selector de estudiantes como CRUD; debe separar datos personales, activación y seguridad; deberá auditar cambios. |

### EP-15 — Roles y capacidades

| ID / título | Historia, actor, prioridad, dependencias y estado | Criterios de aceptación |
|---|---|---|
| **US-033 — Aplicar capacidades reales** | Como usuario, quiero que rutas y acciones coincidan con mis permisos efectivos para evitar opciones sistemáticamente prohibidas. **Actor:** todos. **Prioridad:** Must. **Dependencias:** US-002. **Estado:** Implementada con revisión continua. | Rutas usan `requiredPermission`; menú y botones usan capacidades; backend sigue siendo barrera; 403 tiene mensaje claro; rol visible no concede acciones; estudiantes no ven CRUD administrativo. |
| **US-034 — Administrar roles y cargos** | Como autoridad, quiero definir roles/cargos y capacidades para delegar competencias institucionales. **Actor:** autoridad institucional. **Prioridad:** Won't Have por ahora. **Dependencias:** decisión institucional y API inexistente. **Estado:** Bloqueada. | No se inicia sin matriz aprobada; debe separar rol funcional, cargo institucional y asignación; no autoriza por texto; requiere auditoría y pruebas de escalamiento. |

### EP-16 — Auditoría

| ID / título | Historia, actor, prioridad, dependencias y estado | Criterios de aceptación |
|---|---|---|
| **US-035 — Consultar historial inmutable** | Como usuario relacionado, quiero consultar cambios de estado para conocer la trazabilidad de la postulación. **Actor:** estudiante/personal. **Prioridad:** Should. **Dependencias:** US-005. **Estado:** Backend implementado; integración de expediente pendiente. | API es solo lectura; muestra estado anterior/nuevo, fecha, actor y comentario; limita por alcance; no permite crear/editar/eliminar; no lo denomina kardex oficial. |
| **US-036 — Consultar auditoría unificada** | Como auditor autorizado, quiero consultar acciones críticas de dominio para investigar cambios. **Actor:** auditor/administrador. **Prioridad:** Could. **Dependencias:** contrato de auditoría y endpoint inexistente. **Estado:** Bloqueada. | No expone `AuditLog` hasta definir alcance y retención; deberá filtrar datos sensibles; correlacionará acción, usuario, módulo y recurso; será solo lectura y auditable. |

### EP-17 — Configuración

| ID / título | Historia, actor, prioridad, dependencias y estado | Criterios de aceptación |
|---|---|---|
| **US-037 — Configurar periodos y requisitos** | Como personal autorizado, quiero mantener periodos y requisitos para sostener la operación académica. **Actor:** personal administrativo. **Prioridad:** Should. **Dependencias:** US-029, US-033. **Estado:** Implementada. | Ruta protegida; CRUD usa API real; valida gestión/semestre y campos; solo staff escribe; presenta errores del backend; no elimina datos protegidos silenciosamente. |
| **US-038 — Consultar capacidades de modalidad** | Como usuario de filtros o configuración, quiero consultar etapas y capacidades de una modalidad para ofrecer opciones compatibles. **Actor:** usuario autenticado. **Prioridad:** Should. **Dependencias:** US-002, US-029. **Estado:** Parcial. | Consulta modalidad existente; solo ofrece etapas/tipos soportados; no reutiliza reglas de Proyecto de Grado en otras modalidades; maneja modalidad sin capacidades; no habilita decisiones normativas pendientes. |

## 4. Árbol de dependencias

```text
US-001 Inicio de sesión
└── US-002 Sesión, identidad y capacidades
    ├── US-033 Aplicación de capacidades reales
    │   ├── US-005 Listado de postulaciones por alcance
    │   │   ├── US-006 Registro de postulación
    │   │   ├── US-007 Detalle básico
    │   │   └── US-008 Apertura de expediente
    │   │       ├── US-009 Secciones del expediente
    │   │       └── US-010 Límites normativos
    │   ├── US-011 Documentos y versiones
    │   │   ├── US-012 Carga/versionado
    │   │   └── US-013 Revisión documental
    │   ├── US-014 Seguimiento
    │   │   └── US-015 Transiciones
    │   ├── US-016 Asignaciones
    │   │   └── US-017 Gestión de asignaciones
    │   └── US-018 Consulta de defensas
    │       ├── US-019 Administración de defensa
    │       │   └── US-020 Participantes y quórum
    │       │       └── US-021 Evaluación
    │       │           └── US-022 Consolidación/resultado
    │       └── US-023 Estado de cierre
    │           └── US-024 Gestión de cierre
    ├── US-003 Dashboard
    │   └── US-004 Filtros
    ├── US-025 Reporte
    │   └── US-026 Exportación
    ├── US-027 Notificaciones
    │   └── US-028 Lectura
    ├── US-029 Catálogos académicos
    │   ├── US-030 Catálogos técnicos
    │   ├── US-037 Configuración
    │   └── US-038 Capacidades de modalidad
    └── US-031 Perfil propio
```

Historias bloqueadas fuera del camino crítico actual:

- US-032 depende de un contrato y API de administración de usuarios.
- US-034 depende de una decisión institucional sobre roles y cargos.
- US-036 depende de un contrato de acceso, retención y privacidad de auditoría.
- Las decisiones sobre tema/originalidad, grupos, clasificación, ejemplares, plazos y cambios de modalidad no generan historias implementables hasta actualizar el contrato funcional.

## 5. Priorización MoSCoW

| Categoría | Historias | Justificación |
|---|---|---|
| **Must Have** | US-001, US-002, US-005–US-024, US-033 | Constituyen seguridad, postulación, expediente y procedimiento técnico de Proyecto de Grado. Sin ellas no existe flujo integral utilizable. |
| **Should Have** | US-003, US-004, US-025, US-027–US-031, US-035, US-037, US-038 | Mejoran operación, consulta y administración; varias ya existen y deben preservarse. |
| **Could Have** | US-026, US-036 | Aportan análisis o auditoría avanzada sin bloquear el expediente operativo. US-036 está además bloqueada. |
| **Won't Have por ahora** | US-032, US-034; tema/originalidad formal; grupos; cálculo privado definitivo; clasificación normativa; plazos automáticos; cambio de tema/modalidad | Carecen de contrato institucional aprobado, endpoints o ambos. No deben incorporarse por inferencia. |

## 6. Plan de sprints

Los sprints representan secuencia recomendada, no fechas. Las funcionalidades ya implementadas se consideran línea base y deben someterse a regresión cuando una historia dependiente las reutilice.

### Sprint 0 — Línea base contractual y seguridad (completado)

**Objetivo:** asegurar permisos coherentes, flujo de backend y contrato funcional.

**Historias verificadas:** US-001, US-002, US-005, US-006, US-014, US-015, US-033 y bases backend de US-011–US-024.

**Dependencias:** ninguna.

**Riesgos:** regresiones en aislamiento de estudiante; confusión entre capacidad visual y permiso API.

### Sprint 1 — Expediente de consulta

**Objetivo:** entregar una vista unificada, neutral y segura sin añadir actos institucionales.

**Historias:** US-007, US-008, US-009, US-010, US-035.

**Dependencias:** postulaciones, permisos, endpoints existentes de flujo e historial.

**Riesgos:** exceso de consultas, 403 parciales, etiquetas que aparenten cumplimiento oficial, diseño no adaptable.

### Sprint 2 — Documentos y seguimiento integrados

**Objetivo:** integrar evidencias, versiones, observaciones y macroetapas dentro del expediente.

**Historias:** US-011, US-012, US-013, regresión de US-014 y US-015.

**Dependencias:** Sprint 1, catálogos documentales y permisos.

**Riesgos:** archivos ajenos, carga por ID manual, doble envío, confundir aprobación documental con firma.

### Sprint 3 — Actores y defensas

**Objetivo:** incorporar asignaciones, programación, participantes, asistencia y quórum.

**Historias:** US-016, US-017, US-018, US-019, US-020.

**Dependencias:** Sprints 1–2; etapas y asignaciones activas.

**Riesgos:** confundir quórum con composición formal, mostrar defensa virtual como derecho normativo, reprogramaciones concurrentes.

### Sprint 4 — Evaluación y cierre

**Objetivo:** exponer resultados permitidos y completar el cierre técnico con advertencias.

**Historias:** US-021, US-022, US-023, US-024.

**Dependencias:** Sprint 3; documentos y condiciones coherentes.

**Riesgos:** volver a ponderar las notas directas, usar cero cuando falta una evaluación, concluir con faltantes o presentar cierre técnico como legal.

### Sprint 5 — Analítica y comunicación

**Objetivo:** consolidar experiencia transversal y regresión de capacidades existentes.

**Historias:** US-003, US-004, US-025, US-026, US-027, US-028.

**Dependencias:** datos producidos por Sprints 1–4.

**Riesgos:** indicadores inconsistentes, exportación excesiva, contadores desincronizados, consultas duplicadas.

### Sprint 6 — Administración controlada

**Objetivo:** completar catálogos/configuración soportados y perfil de identidad.

**Historias:** US-029, US-030, US-031, US-037, US-038.

**Dependencias:** capacidades efectivas y protección referencial.

**Riesgos:** eliminar estados técnicos, usar reglas PG en otras modalidades, exponer CRUD administrativo a estudiantes.

### Cola institucional — sin sprint asignado

**Historias:** US-032, US-034, US-036 y futuras historias derivadas de decisiones institucionales.

**Condición de entrada:** contrato funcional actualizado y aprobado; endpoints y permisos diseñados antes de comprometer fechas.

**Riesgo principal:** construir reglas falsas o irreversibles antes de obtener decisión universitaria.

## 7. Matriz técnica por historia

La columna “endpoint” usa exclusivamente rutas existentes. “Ninguno” significa que la historia está bloqueada o que no requiere API propia.

| Historia | Endpoint existente | React reutilizable | Modelos / serializers | Permiso efectivo | Pruebas necesarias |
|---|---|---|---|---|---|
| US-001 | `POST /api/v1/auth/login/` | `LoginPage`, `AuthLayout`, `Button` | `CustomUser`; `LoginSerializer` | Usuario activo; endpoint público de credenciales | credenciales, 401/403, red, doble envío, accesibilidad |
| US-002 | `GET /auth/me/`, `POST /auth/refresh/`, `POST /auth/logout/` | `AuthProvider`, `ProtectedRoute`, `MainLayout` | `CustomUser`, `Role`; `UserProfileSerializer`, `UserPermissionsSerializer`, `LogoutSerializer` | autenticado/activo | restauración, expiración, logout, rutas protegidas |
| US-003 | `GET /api/v1/reportes/dashboard/` | `DashboardPage`, `MetricCard`, `DistributionList`, `Card` | agregados; `DashboardSerializer` | `CanViewInstitutionalReports` | alcance por rol, métricas, advertencias, error/vacío |
| US-004 | dashboard; modalidades; `/api/v1/modalidades/{id}/capacidades/` | `ReportFilters` | `Modalidad`, `EtapaModalidad`; serializers de capacidades | lectura autenticada + reportes | filtros válidos, cambio modalidad, cancelación, una consulta |
| US-005 | `GET /api/v1/postulaciones/` | `PostulantesPage`, `SearchBar`, `Pager`, `DataState` | `Postulacion`; `PostulacionSerializer` | `IsStaffOrReadOnly` + queryset propio/asignado | admin/docente/estudiante, búsqueda, paginación, 403 |
| US-006 | `POST /api/v1/postulaciones/`; catálogos y estudiantes | modal/formulario de `PostulantesPage`, `Field`, `Button` | `Postulacion`; `PostulacionSerializer`, `StudentOptionSerializer` | staff; capacidad `puede_gestionar_postulaciones` | permisos, validación, periodos vacíos, doble envío |
| US-007 | `GET/PATCH /api/v1/postulaciones/{id}/` | tarjeta/modal de `PostulantesPage`, `PageHeader` | `Postulacion`; `PostulacionSerializer` | lectura por alcance; PATCH staff; DELETE 405 | detalle propio/asignado, edición staff, ausencia DELETE |
| US-008 | detalle de postulación; `/postulaciones/{id}/flujo/` | `MainLayout`, `PageHeader`, `Card`, `DataState` | `Postulacion`, `SeguimientoEtapa`; `PostulacionSerializer`, `FlujoPostulacionSerializer` | `puede_ver_postulaciones`; objeto por alcance | ruta, 403/404, responsive, carga agregada sin duplicación |
| US-009 | endpoints de historial, documentos, seguimiento, asignaciones, eventos y cierre | patrones de `DocumentosPage`, `SeguimientoPage`, `Card`, `Modal` | modelos de cada sección; serializers respectivos | permiso por recurso y objeto | visibilidad por sección, aislamiento, errores parciales |
| US-010 | `GET /postulaciones/{id}/resultado-final/`, `/cierre/` | `Card`, `ErrorState` | `EvaluacionDefensa`; `ResultadoFinalSerializer`, `CierreEstadoSerializer` | relacionado o staff | nota nula, advertencias, textos contractuales, no cálculo local |
| US-011 | `/documentos/documentos/`, `/{id}/versiones/`, `/documentos/observaciones/` | `DocumentosPage`, `Modal`, tabla, `Pager` | documentos/versiones/observaciones; serializers homónimos | propietario, relacionado autorizado o staff | alcance archivo, versiones, observaciones, vacío/error |
| US-012 | `POST /documentos/documentos/subir/` | formulario de `DocumentosPage`, `Field`, `Modal` | `DocumentoPostulacion`, `VersionDocumento`; `SubirDocumentoSerializer` | propietario o staff; `puede_cargar_documentos` | tipo/tamaño/extensión, ajena 403, versión, doble envío |
| US-013 | `POST /documentos/documentos/{id}/aprobar|rechazar|observar/`; observación `marcar-corregida` | `Modal`, `Button`, `DataState` | documento/observación; serializers de revisión | staff; corregir propietario o staff según servicio | cada acción, 403, trazabilidad, CRUD base 405 |
| US-014 | `GET /api/v1/seguimientos-etapa/`; `/postulaciones/{id}/flujo/` | `SeguimientoPage`, `Pager`, `Modal` | `SeguimientoEtapa`; `SeguimientoEtapaSerializer`, `FlujoPostulacionSerializer` | `IsWorkflowAdminOrReadOnlyOwner` | orden, intentos, alcance, etiquetas técnicas |
| US-015 | `POST /seguimientos-etapa/{id}/iniciar|observar|aprobar|rechazar|omitir/` | acciones de `SeguimientoPage` | seguimiento; serializers de transición | staff; `puede_gestionar_seguimiento` | matriz de transiciones, obligatoria, predecesora, concurrencia |
| US-016 | `/postulaciones/{id}/asignaciones/`, `/activas/`, `GET /asignaciones/` | `Card`, `DataState`, `Modal` | `AsignacionPostulacion`; `AsignacionPostulacionSerializer` | `IsAssignmentAdminOrRelatedReadOnly` | activas/históricas, estudiante/asignado, etiquetas |
| US-017 | `/postulaciones/{id}/asignaciones/asignar/`; `/asignaciones/{id}/finalizar|reemplazar/` | `Modal`, `Field`, `Button` | asignación; serializers `AsignarActor`, `Finalizar`, `Reemplazar` | staff; `puede_gestionar_asignaciones` | duplicidad, usuario activo, rol, reemplazo, 403 |
| US-018 | `GET /postulaciones/{id}/eventos-defensa/`, `GET /eventos-defensa/` | `Card`, `DataState`, `Pager`, `Modal` | evento/participante/evaluación; serializers homónimos | postulación propia, participante o staff | alcance, estados, intentos, detalle |
| US-019 | programar; evento `iniciar|finalizar|suspender|cancelar|reprogramar` | `Modal`, `Field`, `Button` | `EventoDefensa`; `ProgramarSerializer`, `MotivoPayload`, `ReprogramarPayload` | staff; `puede_gestionar_defensas` | secuencia, 48 h, lugar/enlace, motivos, carrera concurrente |
| US-020 | `participantes/agregar`, `remover`, `asistencia`, `quorum` | tabla/lista, `Modal`, `Button` | `ParticipanteEvento`; serializers de participante/asistencia | escritura staff; lectura relacionada | rol compatible, evento en curso, quórum por tipo, finalizar |
| US-021 | `POST /eventos-defensa/{id}/evaluaciones/perfil|privada|publica/` | `Card`, `Field`, `Button` | `EvaluacionDefensa`; payloads por tipo y `EvaluacionDefensaSerializer` | mutación staff/superusuario; lectura relacionada | consenso único, quórum, cualitativa y rangos directos 0–30/0–70 |
| US-022 | `POST .../evaluaciones/consolidar/`; `GET /postulaciones/{id}/resultado-final/` | `Card`, `DataState` | evaluación; `EvaluacionDefensaSerializer`, `ResultadoFinalSerializer` | consolidar staff/superusuario; consultar relacionado | finalizada, suma directa, mínimo 51, escala específica y nota final nula si incompleta |
| US-023 | `GET /postulaciones/{id}/cierre/`; gestión complementaria | `Card`, `DataState`, listas de estado | `CondicionPostulacion`, `EntregaFisica`; `CierreEstado`, `Condicion`, `EntregaSerializer` | relacionado o staff | faltantes, receptores, advertencias, aislamiento |
| US-024 | condiciones `verificar|rechazar`; entregas `registrar|actualizar-cantidad`; cierre acciones | `Modal`, `Field`, `Button` | condiciones, entregas, etapas/historial; serializers de cierre | staff; `puede_gestionar_cierre` | precondiciones, conclusión, reapertura motivada, auditoría |
| US-025 | `GET /api/v1/reportes/postulaciones/` | `ReportePostulacionesPage`, filtros, tabla, paginación | agregados; `ReportePostulacionSerializer` | `CanViewInstitutionalReports` | filtros, orden, paginación, alcance, advertencias |
| US-026 | `GET /reportes/postulaciones/exportar/?formato=csv` | botón exportar de reporte | agregados; `ReportFilterSerializer` | `CanExportReports` | capacidad, filtros, límite, CSV, nombre, error blob |
| US-027 | `GET /notificaciones/`, detalle y `no-leidas/count` | `NotificacionesPage`, `NotificationProvider`, `Sidebar` | `Notificacion`; `NotificacionSerializer` | destinatario autenticado | propiedad, filtros, badge, paginación, accesibilidad |
| US-028 | notificación `marcar-leida|marcar-no-leida`; `marcar-todas-leidas` | `NotificacionesPage`, `NotificationProvider` | `Notificacion`; `NotificacionSerializer` | destinatario | propia/ajena, actualización optimista o recarga, error |
| US-029 | CRUD `/academico/periodos|modalidades|requisitos|modalidad-requisitos/` | `CatalogPage`, `ConfiguracionPage`, `ModalidadesPage` | modelos académicos; serializers homónimos | lectura autenticada; escritura staff | CRUD por rol, relación, protección, desactivación |
| US-030 | CRUD de tipos; estados documento/postulación | `CatalogPage` | `TipoDocumento`, `EstadoDocumento`, `EstadoPostulacion`; serializers homónimos | lectura autenticada; escritura staff; estados DELETE 405 | estudiantes sin CRUD, referencias, desactivación, 405 |
| US-031 | `GET /api/v1/auth/me/` | `UsuariosPage`, `Card` | `CustomUser`, `Role`; `UserProfileSerializer` | usuario autenticado | campos opcionales, capacidades, ausencia secretos |
| US-032 | **Ninguno: API administrativa no existe** | no existe; `UsuariosPage` no es CRUD | contrato/modelos futuros; sin serializer | por definir | pruebas se definen tras contrato; no implementar antes |
| US-033 | `/auth/me/` + permisos de cada recurso | `ProtectedRoute`, `Sidebar`, `useAuth`, `ForbiddenPage` | capacidades; `UserPermissionsSerializer` | permisos DRF son autoridad | rutas, botones, 403, estudiante, docente, staff |
| US-034 | **Ninguno: API de roles/cargos no existe** | no existe | `Role` actual es insuficiente; sin serializer administrativo | por definir | escalamiento, separación cargo/asignación, auditoría futura |
| US-035 | `GET /api/v1/postulaciones/historial/` | `Card`, `DataState`, posible timeline de expediente | `HistorialEstado`; `HistorialEstadoSerializer` | solo lectura por alcance | GET por rol; POST/PATCH/DELETE 405; orden y contenido |
| US-036 | **Ninguno: `AuditLog` no está publicado** | no existe | `AuditLog`; sin serializer/API pública | por definir | privacidad, retención, alcance y solo lectura futuros |
| US-037 | CRUD periodos/requisitos | `ConfiguracionPage`, `CatalogPage` | `Periodo`, `Requisito`; serializers homónimos | `puede_ver_configuracion`; escritura staff | validaciones, 403, referencia, errores de campo |
| US-038 | `GET /api/v1/modalidades/{id}/capacidades/` | `ReportFilters`, futuros selectores compatibles | modalidad/etapas; `ModalidadCapabilitiesSerializer` | autenticado | PG vs otras modalidades, sin etapas, 404/403, cancelación |

## 8. Estrategia de pruebas transversal

Cada historia aplicable debe considerar:

- backend por administrador, personal, docente/asignado y estudiante;
- aislamiento de datos y respuesta 403/404 según contrato;
- métodos no soportados con 405;
- servicio de dominio y transacciones en operaciones críticas;
- serializers y errores de campo;
- frontend de ruta, capacidad, carga, vacío, error y éxito;
- interacción con teclado y etiquetas accesibles;
- viewport habitual de escritorio y móvil;
- cancelación de consultas y prevención de doble envío;
- ausencia de cálculos o afirmaciones normativas locales;
- regresión OpenAPI cuando cambie el contrato del API.

## 9. Deuda técnica y restricciones

### 9.0 Historias técnicas resueltas

| ID | Historia técnica | Estado | Alcance |
|---|---|---|---|
| **HT-001** | Estabilizar la autorización por objeto del expediente | Resuelta | Unifica el alcance de lectura de detalle, flujo, resultado final y cierre: personal o superusuario, estudiante propietario y actores con asignación activa o histórica. Los usuarios autenticados no relacionados reciben `404` y los anónimos `401`. Es la política técnica vigente mientras no exista una disposición institucional explícita sobre revocación del acceso histórico. No implementa ni cierra US-010. |
| **HT-002** | Estabilizar consulta de asignaciones activas e históricas | Resuelta | Define `GET /api/v1/asignaciones/?postulacion={id}` como contrato canónico, paginado y de solo lectura para US-016. Incluye asignaciones vigentes e históricas, conserva acceso por participación histórica, aplica alcance por postulación y devuelve etiquetas legibles. No implementa ni cierra US-016 y no habilita acciones de US-017. |
| **HT-003** | Preparar catálogo seguro de candidatos para asignaciones | Resuelta | Define `GET /api/v1/usuarios/candidatos-asignacion/` como contrato paginado, buscable, de solo lectura y exclusivo para staff/superusuario. Expone una representación mínima de usuarios activos, con rol y no estudiantes. Estar incluido no certifica elegibilidad para una participación. Estabiliza claves de error de las acciones existentes sin implementar el frontend ni desbloquear US-017. |
| **HT-004** | Estabilizar consulta de defensas del expediente | Resuelta | Define `GET /api/v1/eventos-defensa/?postulacion={id}` como contrato canónico, paginado y de solo lectura, con orden predeterminado `-fecha_programada,-id`, alcance uniforme para personal, propietario, actor activo o histórico y participante, serializers explícitos y quórum exclusivamente técnico. Conserva la consulta contextual no paginada por compatibilidad. No implementa ni cierra US-018 y no habilita acciones de US-019, US-020 o US-021. |
| **HT-005** | Estabilizar administración técnica de defensas | Resuelta | Mantiene las acciones administrativas existentes reservadas a staff/superusuario y alinea `puede_gestionar_defensas` con esa autoridad. Impide acciones sobre postulaciones inactivas, inicio anticipado y suspensión repetida; reprogramar limpia metadatos del ciclo anterior y la duplicidad concurrente produce un error funcional controlado. Conserva auditoría, notificaciones y reglas de quórum vigentes. No implementa el frontend de US-019 ni historias posteriores. |
| **HT-006** | Estabilizar gestión técnica de participantes y asistencia | Resuelta | Estabiliza altas, retiros lógicos, reactivación, asistencia y quórum técnico sobre los endpoints existentes. Permite altas y retiros en `PROGRAMADA`, `EN_CURSO` y `SUSPENDIDA`; la asistencia solo en `EN_CURSO`; rechaza mutaciones en estados terminales. Conserva historial, controla duplicados y reutiliza el registro inactivo al reactivar. No implementa el frontend ni amplía US-020. |

### 9.1 Mejoras pendientes

- Componer el expediente sin disparar solicitudes duplicadas ni crear un endpoint agregado no diseñado.
- Sustituir la carga documental por ID manual por selección contextual desde la postulación.
- Completar frontend de revisión documental, asignaciones, defensas, evaluaciones, condiciones, entregas y cierre.
- Completar pantallas de modalidad–requisito y catálogos técnicos.
- Uniformar mensajes 403; `ForbiddenPage` conserva texto específico de reportes.
- Incrementar pruebas de páginas operativas actualmente sin cobertura frontend dedicada.
- Mantener neutralidad de etiquetas entre estados técnicos y actos institucionales.

### 9.2 Limitaciones normativas

- La nota privada 0–30 es una decisión directa del Tribunal; no existe ni debe inventarse una fórmula automática desde observaciones.
- La tabla de clasificación final es contradictoria.
- La cantidad oficial de ejemplares es cuatro o seis según fuentes distintas.
- El máximo grupal es dos o tres; el sistema actual solo soporta una persona.
- Composición formal y quórum deben permanecer separados.
- Plazos, prórrogas, reintentos y consecuencias no forman una política completa automatizable.
- Tema, originalidad, Consejo Científico, memorandos y firmas no están modelados como actos formales.

### 9.3 Decisiones institucionales necesarias

Se mantienen las preguntas de `CONTRATO_FUNCIONAL_PROYECTO_GRADO.md`, en particular: jerarquía vigente, ejemplares, evaluación privada, rangos, grupos, órganos competentes, cartas de conformidad, reintentos, cómputo de plazos, cambios de tema/modalidad y validez de defensas virtuales/mixtas.

Para desbloquear US-017 permanecen pendientes: roles elegibles por tipo de participación; incompatibilidades entre participaciones; cardinalidad de Presidente y Secretario; composición de Tribunal fuera de Perfil; obligatoriedad del motivo al finalizar o reemplazar; y política de notificaciones durante un reemplazo.

### 9.4 Riesgos arquitectónicos

- `is_staff` concentra competencias administrativas más amplias que los cargos normativos.
- `Role` es informativo para capacidades; no representa cargos ni autorizaciones granulares.
- Las ocho macroetapas técnicas condensan veinte etapas funcionales.
- Los catálogos configurables pueden modificarse sin versionado normativo por periodo.
- Un expediente compuesto desde numerosos recursos puede sufrir inconsistencias temporales o sobreconsulta.
- La configuración de tipos documentales condiciona el cierre; ausencia de tipos produce advertencias o brechas.
- Otras modalidades no tienen política normativa y no deben heredar Proyecto de Grado.

### 9.5 Futuras ampliaciones condicionadas

- registro versionado del tema y dictamen de originalidad;
- órganos colegiados, sesiones y actas;
- memorandos, designaciones y firmas;
- calendario académico y vencimientos;
- proyectos grupales;
- cambios trazables de tema/modalidad y reinscripción;
- administración de usuarios, roles y cargos;
- consulta autorizada de auditoría;
- clasificación y nota final cuando exista decisión oficial.

## 10. Definition of Ready

Una historia puede ingresar a un sprint cuando:

- tiene actor, valor, prioridad y criterios de aceptación aprobados;
- sus dependencias Must están terminadas o comprometidas antes;
- el contrato funcional respalda sus reglas;
- las decisiones institucionales requeridas están resueltas;
- los endpoints existentes están identificados o, si se requiere un cambio de API, existe diseño contractual previo;
- permisos y alcance de datos están definidos;
- se conocen estados de carga, vacío, error y autorización;
- no contiene una contradicción normativa sin marcar.

## 11. Definition of Done

Una historia solo puede marcarse como terminada cuando, según su alcance:

1. Backend funcional y reglas de dominio aplicadas.
2. Frontend funcional, adaptable y accesible.
3. Permisos verificados en backend y capacidades coherentes en frontend.
4. Pruebas backend por roles relevantes aprobadas.
5. Pruebas frontend de ruta, renderizado e interacción aprobadas.
6. Aislamiento de datos y casos 403/404/405 comprobados.
7. OpenAPI actualizado y validado si el contrato del API cambió.
8. Documentación funcional/técnica actualizada.
9. `python manage.py check` aprobado.
10. `python manage.py makemigrations --check` sin cambios inesperados.
11. `python manage.py test` completamente verde.
12. `npm run lint` limpio.
13. `npm run test:run` completamente verde.
14. `npm run build` exitoso.
15. `git diff --check` sin errores.
16. Sin pruebas eliminadas, desactivadas o marcadas como `skip` para ocultar fallos.
17. Sin deuda crítica de seguridad, integridad, accesibilidad o normativa.
18. La demostración confirma todos los criterios de aceptación.

Para historias exclusivamente documentales o bloqueadas no se simula cumplimiento técnico: se consideran terminadas solo cuando su entregable documental está aprobado o su condición institucional queda formalmente resuelta.

## 12. Criterios de éxito del roadmap

- El expediente permite consultar la realidad registrada sin reinterpretarla.
- Ningún estudiante accede a información ajena.
- Ninguna acción visible termina sistemáticamente en 403.
- Todas las transiciones críticas dependen del backend.
- Los resultados de defensa respetan tipo cualitativo/numérico.
- El cierre informa faltantes y advertencias antes de permitir conclusión.
- Las decisiones institucionales pendientes permanecen visibles y fuera del código.
- Las otras modalidades no reutilizan políticas de Proyecto de Grado.

## 13. Gobierno y control de cambios

Este backlog es la referencia oficial de priorización. Todo cambio debe:

1. identificar la historia y épica afectadas;
2. citar el cambio del contrato funcional o la decisión institucional;
3. actualizar prioridad, criterios, dependencias, sprint y matriz técnica;
4. evaluar permisos, migraciones, compatibilidad de API y frontend;
5. mantener trazabilidad con pruebas y documentación;
6. registrar explícitamente historias retiradas o pospuestas, sin borrarlas del historial del proyecto.

Una decisión universitaria no se aplica directamente al código: primero actualiza el contrato funcional, luego este backlog y finalmente ingresa a planificación técnica.
