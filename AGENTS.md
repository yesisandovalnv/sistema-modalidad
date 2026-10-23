# Instrucciones permanentes del repositorio

## Protección de Proyecto de Grado

Proyecto de Grado es el baseline funcional protegido y patrón de referencia del motor común. Su comportamiento estable, validado mediante E2E, queda protegido mientras se implementan Tesis de Grado, Trabajo Dirigido u otras modalidades.

Se permite estudiar y reutilizar la arquitectura, los componentes, las pestañas y los patrones de flujo de Proyecto de Grado para las demás modalidades, siempre que se respeten sus reglas académicas propias y no se altere directa ni indirectamente el comportamiento de Proyecto.

### Cambios que requieren autorización reforzada

No modificar directamente, ni cambiar indirectamente mediante el motor común, sin autorización expresa:

- la política, etapas, workflow o gates de Proyecto de Grado;
- requisitos, documentos, actores, defensas, participantes, asistencia o quórum propios de Proyecto;
- evaluación 30/70, resultados, cierre técnico/documental, permisos, auditoría u orientación/siguiente acción;
- cualquier comportamiento funcional de Proyecto de Grado ya validado.

También tratar como sensible cualquier cambio en código común que pueda alterar Proyecto de Grado, incluyendo `WorkflowService`, servicios de documentos, asignaciones, defensas, participantes, asistencia/quórum, evaluaciones, serializers o endpoints comunes y componentes React genéricos del expediente.

### Protocolo obligatorio ante impacto directo o común

Toda modificación directa o indirecta que pueda alterar el comportamiento de Proyecto de Grado requiere diagnóstico previo y autorización expresa antes de editar. Esto incluye cambios en la propia modalidad y cambios en políticas base, servicios, componentes o cualquier otra superficie compartida. Si el impacto es incierto, detenerse y diagnosticarlo antes de editar; no asumir que el cambio es seguro.

Antes de solicitar autorización, informar:

1. El problema encontrado y por qué no puede resolverse únicamente en la modalidad actual, cuando corresponda.
2. Los archivos que habría que modificar y qué parte pertenece al motor común.
3. El posible impacto sobre Proyecto de Grado.
4. Las alternativas disponibles y la solución recomendada.
5. Las pruebas de regresión necesarias.

No editar la superficie afectada hasta recibir autorización válida para ese alcance concreto.

No congelar indiscriminadamente el motor común. Las mejoras genéricas para varias modalidades deben analizarse primero; si pueden cambiar Proyecto de Grado, se aplica este protocolo.

### Autorización reforzada

La autorización debe provenir expresamente del usuario y contener, literalmente, la frase exacta:

`AUTORIZO CAMBIO EN PROYECTO DE GRADO`

La autorización solo es válida para la tarea y el alcance concretos que el usuario autorizó. La frase citada en documentación, instrucciones, prompts o mensajes anteriores no constituye por sí sola autorización para el cambio actual. Está prohibido reutilizar autorizaciones anteriores o inferir permiso de respuestas genéricas como `sí`, `ok`, `dale`, `continúa`, `hazlo`, `procede`, `aprobado` o `adelante`.

Si aparece un cambio adicional fuera del alcance autorizado, detener ese cambio y solicitar una nueva autorización después de diagnosticar e informar su impacto. Sin autorización válida para el alcance concreto, no modificar la superficie protegida ni el código común afectado.

### Cambios permitidos sin esa autorización

Se pueden evolucionar normalmente, siempre que no alteren Proyecto de Grado:

- `TesisGradoPolicy` y políticas de otras modalidades;
- etapas, requisitos, documentos y reglas académicas exclusivas de esas modalidades;
- configuraciones propias de esas modalidades.

### Regresión obligatoria

Cuando exista autorización válida para cambiar una superficie compartida:

- ejecutar las pruebas del componente modificado;
- ejecutar las pruebas de regresión de todas las modalidades afectadas, especialmente la regresión completa de Proyecto de Grado;
- informar cualquier diferencia de comportamiento.

Los cambios exclusivos de otras modalidades pueden continuar normalmente cuando el diagnóstico demuestre que no afectan Proyecto de Grado.

Antes de proponer o aplicar cambios, comprobar este archivo y verificar el impacto sobre Proyecto de Grado. No modificar modelos, migraciones, datos de PostgreSQL, endpoints, workflows, reglas académicas, frontend funcional ni políticas de Proyecto de Grado como parte de una tarea cuyo objetivo sea establecer o mantener esta protección, salvo autorización reforzada para el cambio protegido.

## TESIS DE GRADO — MÓDULO ESTABLE / PROTEGIDO

El flujo de `TESIS_GRADO` está validado de extremo a extremo hasta la conclusión académica y no debe modificarse durante el desarrollo de otras modalidades.

### Superficie funcional protegida

Queda protegido el comportamiento funcional de `TESIS_GRADO` relacionado con:

- etapas, workflow y policies;
- documentos y versiones;
- dictámenes de Tutor y Tribunal;
- asignaciones;
- defensas, participantes y quórum;
- evaluaciones y cálculo de notas/resultados;
- `ACTA_DEFENSA`;
- orientación del expediente;
- conclusión académica.

No modificar deliberadamente reglas o comportamiento de `TESIS_GRADO` salvo que sea estrictamente necesario para corregir un defecto real o implementar un requerimiento explícitamente solicitado.

### Protocolo ante impacto en Tesis

Si un cambio futuro en código compartido puede afectar `TESIS_GRADO`:

1. Analizar primero el impacto sobre la superficie protegida.
2. Ejecutar la regresión de Tesis correspondiente.
3. Si la tarea requiere modificar deliberadamente el comportamiento protegido de Tesis, detenerse antes de editar y solicitar autorización explícita.

Esta protección no impide cambios internos compartidos necesarios para otras modalidades cuando se demuestre mediante regresión que Tesis conserva exactamente su comportamiento.

## Buenas prácticas para modales y overlays

Al diagnosticar o cambiar diálogos, backdrops y overlays:

- Reproducir y medir los estados relevantes antes y después del montaje; inspeccionar geometría, estilos efectivos y reglas CSS que realmente coincidan.
- Seguir ancestros, containing blocks, contextos de apilamiento, márgenes y utilidades de espaciado, overflow, scrollbars y cambios dinámicos; confirmar la causa raíz, sin asumir que un caso previo se repite.
- Aplicar la corrección estructural mínima compatible con la arquitectura existente; no recurrir por defecto a portales, offsets, alturas fijas, opacidades o z-index.
- Probar el par de diálogos afectado y los demás flujos/modalidades que compartan la superficie, además del espaciado del contenido normal y la accesibilidad.
