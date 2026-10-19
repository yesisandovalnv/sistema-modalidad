# Instrucciones permanentes del repositorio

## Protección de Proyecto de Grado

Proyecto de Grado es el baseline funcional estable y validado mediante E2E. Su comportamiento queda protegido mientras se implementan Tesis de Grado u otras modalidades.

### Cambios que requieren autorización reforzada

No modificar directamente, ni cambiar indirectamente mediante el motor común, sin autorización expresa:

- la política, etapas, workflow o gates de Proyecto de Grado;
- requisitos, documentos, actores, defensas, participantes, asistencia o quórum propios de Proyecto;
- evaluación 30/70, resultados, cierre técnico/documental, permisos, auditoría u orientación/siguiente acción;
- cualquier comportamiento funcional de Proyecto de Grado ya validado.

También tratar como sensible cualquier cambio en código común que pueda alterar Proyecto de Grado, incluyendo `WorkflowService`, servicios de documentos, asignaciones, defensas, participantes, asistencia/quórum, evaluaciones, serializers o endpoints comunes y componentes React genéricos del expediente.

### Protocolo obligatorio ante impacto común

Si una tarea de otra modalidad requiere modificar código común con posible impacto en Proyecto de Grado:

1. Detener la implementación de ese cambio.
2. Reportar antes de editar:
   - A. el problema encontrado;
   - B. por qué no puede resolverse solo en la política de la modalidad actual;
   - C. los archivos que habría que modificar;
   - D. qué parte pertenece al motor común;
   - E. el posible impacto sobre Proyecto de Grado;
   - F. las alternativas disponibles;
   - G. la solución recomendada;
   - H. las pruebas de regresión necesarias.
3. No implementar el cambio hasta recibir autorización válida.

No congelar indiscriminadamente el motor común. Las mejoras genéricas para varias modalidades deben analizarse primero; si pueden cambiar Proyecto de Grado, se aplica este protocolo.

### Autorización reforzada

La única autorización válida para un cambio que pueda alterar Proyecto de Grado es la frase exacta:

`AUTORIZO CAMBIO EN PROYECTO DE GRADO`

Las respuestas `sí`, `ok`, `dale`, `continúa`, `hazlo`, `procede`, `aprobado` o `adelante` no autorizan ese cambio. Si la frase exacta no aparece, no modificar la superficie protegida ni el código común afectado.

### Cambios permitidos sin esa autorización

Se pueden evolucionar normalmente, siempre que no alteren Proyecto de Grado:

- `TesisGradoPolicy` y políticas de otras modalidades;
- etapas, requisitos, documentos y reglas académicas exclusivas de esas modalidades;
- configuraciones propias de esas modalidades.

### Regresión obligatoria

Cuando exista autorización para cambiar el motor común:

- ejecutar las pruebas del componente modificado;
- ejecutar la regresión completa de Proyecto de Grado;
- ejecutar las pruebas de la modalidad que originó el cambio;
- informar cualquier diferencia de comportamiento.

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
