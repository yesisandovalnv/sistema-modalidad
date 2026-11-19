---
name: optimizar-navegacion-modalidades
description: Diagnosticar y proponer mejoras de navegación contextual para reducir clics en las modalidades de graduación de sistema-modalidad, abriendo una operación existente cuando el contexto identifica un único destino válido. Diagnóstico de solo lectura por defecto; la implementación requiere autorización expresa para el alcance concreto.
---

# Optimizar navegación entre modalidades

Usa esta skill cuando una acción como «Ir a gestionar», «Disponible», «Continuar» u otra acción contextual envíe al usuario a una sección genérica aunque el expediente permita abrir una operación concreta. Aplica a todas las modalidades, conservando sus flujos y reglas propios.

## Límites

- Leer `AGENTS.md` y las instrucciones aplicables. Las mejoras de interfaz no autorizan cambios a reglas académicas, policies, requisitos, anticipación mínima, composición de tribunales, intentos, estados ni transiciones.
- Preservar los cambios locales y el staging. No limpiar Git, restaurar trabajo ajeno, cambiar de rama ni sobrescribir cambios existentes.
- No modificar otras modalidades cuando el alcance se limite a una modalidad, salvo autorización expresa. El patrón de Proyecto de Grado es referencia técnica, no una regla universal.
- No crear componentes, modales, endpoints, servicios o lógica duplicada si se puede reutilizar una operación existente. No cambiar backend cuando el problema sea exclusivamente de navegación.
- No hacer commit ni push sin autorización expresa.

## Procedimiento

### 1. Diagnóstico de solo lectura

Antes de editar, confirmar la raíz y rama del repositorio, consultar `git status --short --branch` y revisar el diff de los archivos candidatos sin modificarlos. Identificar la modalidad y el recorrido exactos: etapa activa, orientación del expediente, acción y destino visible, actor/permisos relevantes y resultado esperado.

Seguir la acción desde su origen hasta su destino real. Revisar el resumen y la orientación, el componente que presenta la acción, los callbacks/controladores disponibles, la pestaña de destino y la operación existente. Identificar si el destino es, por ejemplo, un modal de defensa, carga documental, gestión de requisitos, programación, evaluación u otra sección. Confirmar el comportamiento actual en código y pruebas; no inferir que modalidades distintas comparten la misma política.

Buscar el patrón existente más cercano. En Proyecto de Grado, Defensa de Perfil, Defensa Privada y Defensa Pública sirven como ejemplos de acceso directo a una defensa identificada; reutiliza sus mecanismos vigentes cuando sean compatibles. Para documentos, programación u otras operaciones, localiza y prefiere su propio controlador existente.

### 2. Criterio de apertura directa

Abrir el destino directamente solo cuando los datos disponibles formen una única entidad válida y la operación corresponda al expediente y al contexto activo. Antes de abrirla, comprobar, según aplique:

- modalidad del expediente;
- etapa activa y su identificador;
- número de intento;
- expediente/postulación asociado;
- tipo de operación o evento;
- estado vigente y si el registro está activo;
- permisos y disponibilidad de la acción orientada.

Excluir registros cancelados cuando no sean elegibles para esa operación. No emparejar por tipo únicamente ni aceptar datos incompletos como equivalentes a una coincidencia. Si no hay coincidencia única, hay ambigüedad o falta contexto fiable, conservar la navegación genérica existente. No alterar reglas para forzar una coincidencia.

Reutilizar componentes, funciones, modales, consultas y callbacks existentes. Mantener accesibilidad, cierre y el comportamiento posterior a la operación. Evitar efectos que abran el destino por render, carga o hash sin una acción explícita del usuario.

### 3. Propuesta y autorización

Después del diagnóstico y antes de editar, presentar al usuario:

1. El problema confirmado y el destino operativo real.
2. El patrón existente que mejor lo resuelve.
3. El cambio mínimo y los archivos concretos que requeriría.
4. El impacto esperado sobre la modalidad solicitada y otras modalidades consumidoras.
5. Las pruebas específicas y regresiones necesarias.

Esperar autorización explícita para ese alcance. La autorización para diagnosticar o crear/invocar esta skill no autoriza cambios funcionales. Si el cambio necesario excede el alcance aprobado, detener solo esa ampliación, diagnosticar su impacto e informar qué autorización adicional hace falta.

Si puede afectarse Proyecto de Grado directa o indirectamente a través de una superficie compartida, aplicar íntegramente el protocolo de autorización reforzada de `AGENTS.md` antes de editar. Si puede afectarse Tesis, respetar sus protecciones y ejecutar su regresión aplicable. No inferir autorización de respuestas genéricas ni reutilizar autorizaciones históricas.

### 4. Implementación autorizada y validación

Tras recibir autorización, editar exclusivamente el alcance aprobado y conservar todos los cambios locales. Mantener fallback genérico cuando falte una coincidencia única. No alterar políticas, reglas académicas, requisitos, endpoints, datos ni transiciones para obtener acceso directo.

Añadir o adaptar pruebas que cubran, según el cambio:

- apertura directa de la entidad correcta mediante la acción contextual y uso del destino existente;
- asociación correcta con modalidad, expediente, etapa e intento activos;
- registros de otros intentos o etapas que no deben abrirse;
- registros cancelados o inactivos que no deben tratarse como vigentes;
- cero coincidencias y coincidencias múltiples con fallback genérico;
- aislamiento de modalidades no incluidas en el alcance;
- permisos y estados en los que la acción no debe abrirse.

Ejecutar las pruebas específicas, las del componente afectado y las regresiones de modalidades que puedan consumir la superficie compartida. Aplicar las regresiones reforzadas de Proyecto de Grado y Tesis que indique `AGENTS.md` cuando corresponda. Revisar `git diff --check`. No presentar pruebas inspeccionadas como ejecutadas ni corregir fallos preexistentes ajenos al alcance sin autorización.

## Informe

Informar la causa, el patrón reutilizado y el comportamiento implementado; listar archivos modificados, pruebas ejecutadas y resultados, regresiones y limitaciones. Confirmar que se preservaron los cambios locales y que no se hizo commit ni push.
