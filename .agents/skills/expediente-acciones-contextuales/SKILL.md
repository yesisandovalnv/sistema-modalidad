---
name: expediente-acciones-contextuales
description: Diagnosticar y proponer mejoras de las acciones de Resumen, Orientación del expediente y Siguiente acción en sistema-modalidad, para cualquier modalidad y etapa. Usar cuando una acción navega innecesariamente a otra pestaña o debe reutilizar una operación contextual existente. Diagnóstico de solo lectura por defecto; implementar únicamente con autorización expresa para el alcance concreto. No usar para cambiar reglas académicas ni reparar datos ajenos al problema.
---

# Acciones contextuales del expediente

## Límites y preparación

1. Leer `AGENTS.md` y las instrucciones aplicables a los archivos involucrados. Inspeccionar las convenciones y pruebas actuales; no asumir que una implementación histórica sigue vigente.
2. Confirmar raíz del repositorio, rama, servicios y entorno objetivo. Registrar `git status --short`, diferencias existentes en los archivos candidatos y `git stash list`. Preservar trabajo local: no limpiar, restaurar, cambiar de rama ni aplicar o alterar el stash.
3. Identificar modalidad, expediente, etapa, intento, actor, texto de acción y resultado esperado. No fijar IDs ni requisitos de un ejemplo anterior. Consultar fuentes conectadas o código antes de pedir información ya disponible.
4. Empezar con diagnóstico exclusivamente de lectura. No enviar solicitudes de escritura, crear documentos, programar defensas, registrar evaluaciones ni avanzar estados para reproducir un fallo sobre datos reales. Consultar PostgreSQL solo si resulta necesario y exclusivamente en modo lectura durante el diagnóstico. No ejecutar semillas ni migraciones.
5. Proyecto de Grado es referencia de arquitectura e interfaz compartida, no fuente de requisitos académicos para las demás modalidades. Cada modalidad conserva sus policies, gates, actores, etapas, intentos y reglas.

## Rastrear el contrato completo

Seguir la acción desde su origen hasta la operación existente. Registrar rutas y líneas verificadas con `rg`; los siguientes archivos son puntos de partida, no garantías sobre su estructura actual:

- `apps/modalidades/policies.py` y la policy de la modalidad: selección de policy, capacidades, orientación, acción recomendada, permisos, requisitos y gates. Inspeccionar también el engine y workflow que intervengan, sin cambiarlos para resolver un síntoma de interfaz.
- `apps/postulantes/views.py`, serializers y servicios: endpoint de flujo/orientación, contrato de la acción y comprobaciones backend. Rastrear el workflow y los servicios de documentos, asignaciones, defensas o evaluaciones que realmente se invoquen.
- `src/services/postulacionesService.js` y servicios relacionados: respuesta real, transformación de datos, payload, errores y solicitudes adicionales.
- `src/pages/postulantes/ExpedientePage.jsx`: componente que presenta Siguiente acción, selección de acción, condiciones de habilitación, callback de clic, navegación, hash y estado de apertura.
- Diálogo, formulario, operación o navegación ya usados por el botón de la pestaña destino. Localizar el controlador que lo abre y cierra, permisos, consulta dinámica de opciones y comportamiento tras éxito.

Comparar el recorrido del botón contextual con el botón de la pestaña. Distinguir datos ausentes o ambiguos, prohibiciones académicas legítimas, permisos insuficientes y una exclusión de interfaz que impide reutilizar una operación disponible. No atribuir el problema a una condición sin comprobar sus consumidores y efectos.

Para cada acción, verificar:

| Acción | Evidencia necesaria antes de proponer apertura directa |
| --- | --- |
| Completar documentos | Capacidad de carga del actor, acción documental aplicable, consulta dinámica por expediente/modalidad, versiones y restricciones por documento. |
| Programar defensa | Tipo de evento autorizado, etapa, seguimiento e intento compatibles, opción inequívoca, gates y defensa existente. |
| Gestionar tribunal | Operación compartida disponible y permisos del actor; requisitos de la modalidad y vigencia de asignaciones. |
| Registrar evaluación | Actor evaluador, evento/etapa/intento correctos, condiciones previas y evaluación existente. |
| Resultado o cierre | Operación permitida por backend o navegación adecuada; distinguir consulta, cierre técnico y conclusión académica. |

La tabla orienta el análisis; no sustituye reglas ni agrega requisitos. Un estado llamado Pendiente no equivale por sí solo a una prohibición: comprobar la semántica de cada acción en su contrato.

## Elegir la integración mínima

1. Determinar si corresponde reutilizar un modal, formulario, operación en línea o navegación. No convertir todas las acciones en modales.
2. Preferir el callback y controlador existentes. Ejemplos a verificar: `onOpenDocumentUpload`/`openUpload()`, `getDefenseProgrammingContext()` y `DefenseOperationDialog`. No duplicar estados, formularios, validaciones, consultas ni requisitos.
3. Abrir directamente solo si el contexto fiable, los permisos y las condiciones actuales lo permiten. Conservar el destino de navegación o selector genérico existente cuando falten datos, existan opciones ambiguas o la operación no corresponda. No habilitar en React lo que el backend prohíbe.
4. Mantener las consultas de requisitos y opciones por modalidad/expediente. No copiar reglas de Proyecto a Tesis o Trabajo Dirigido ni eliminar exclusiones por modalidad sin justificar exactamente su función.
5. Evitar aperturas automáticas mediante hash, navegación o efectos de montaje. Comprobar una única apertura y las solicitudes necesarias; preservar protección contra doble envío y tratamiento de errores.
6. Preservar cancelación, cierre, Escape, accesibilidad y devolución del foco al disparador visible, además del comportamiento después de guardar. Si hay un problema visual de overlays, aplicar el diagnóstico de geometría y estilos exigido por `AGENTS.md` antes de proponer cambios estructurales.

## Entregar diagnóstico y obtener autorización

Antes de editar código o datos, presentar causa confirmada con evidencia, componentes y funciones, mecanismo reutilizable, propuesta mínima, archivos exactos, alternativas, impacto por modalidad y pruebas. Si falta evidencia, identificarla sin especular.

Exigir autorización expresa para el alcance concreto. Si ya existe una autorización válida para ese mismo alcance, continuar sin volver a solicitarla. Crear o invocar esta skill no autoriza correcciones funcionales.

Si la propuesta puede alterar Proyecto de Grado directa o indirectamente mediante código compartido, aplicar el protocolo de `AGENTS.md`: informar problema, archivos comunes, impacto, alternativas y regresión antes de editar. La autorización del usuario debe contener literalmente `AUTORIZO CAMBIO EN PROYECTO DE GRADO` y referirse a esta tarea. Una cita de esa frase, una autorización histórica o una respuesta genérica no sirven.

Tesis también es una superficie protegida: cualquier cambio deliberado de su comportamiento requiere autorización explícita para el requerimiento actual. Si aparece un archivo, contrato, dato o regla fuera del alcance autorizado, detener ese cambio y solicitar ampliación con su diagnóstico; no ampliar silenciosamente.

## Implementación autorizada y regresión

Editar únicamente los archivos autorizados, preservando cambios previos. No modificar reglas académicas, permisos backend, contratos API, modelos, datos, seeds o migraciones para simplificar una integración de interfaz. Cualquier necesidad adicional requiere un alcance independiente y explícito. No realizar commit ni push sin autorización específica.

Verificar las pruebas y scripts disponibles antes de ejecutarlos. Usar una base aislada para las pruebas backend; nunca ejecutar pruebas que escriban sobre la base activa. Para una tarea de diagnóstico, entregar el plan de pruebas sin ejecutar operaciones de escritura.

Cubrir según la superficie afectada:

- Apertura desde Siguiente acción y desde el botón original; una sola instancia, consultas necesarias y ausencia de apertura por hash.
- Contexto completo, incompleto y ambiguo; etapa/intento posteriores, operación existente y actor autorizado o no autorizado.
- Gates pendientes, acción ausente, opciones vacías, documentos completos, carga fallida y errores backend; fallback de navegación.
- Payload y contratos compatibles; doble clic/doble envío; éxito, cancelación, Escape y restauración del foco.
- Pruebas del componente modificado y regresión de todas las modalidades afectadas. Si cambia superficie compartida, incluir la regresión completa disponible de Proyecto de Grado, la correspondiente de Tesis y Trabajo Dirigido, además de otras modalidades consumidoras identificadas.
- Lint y build del frontend cuando corresponda; pruebas de orientación/servicios y Django check si hay cambios backend autorizados. Consultar `package.json` y configuración del proyecto, sin inventar comandos.

No debilitar ni eliminar pruebas. Separar fallos atribuibles al cambio de problemas preexistentes de fixtures, configuración o entorno, con evidencia y limitaciones. No resolver fallos ajenos ampliando el alcance.

## Informe final

Entregar causa, comportamiento anterior y propuesto o implementado, archivos y líneas, impacto por modalidad, pruebas con resultados y limitaciones. Confirmar preservación de cambios locales y stash, y ausencia de commit/push. En diagnóstico, detenerse y esperar autorización; después de implementar, detenerse y esperar validación manual.
