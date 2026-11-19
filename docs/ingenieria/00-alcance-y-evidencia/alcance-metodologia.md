# Alcance y metodología documental

Fase 2 · 2026-11-01 · America/La_Paz.

## Propósito

Establecer bases verificables y mantenibles para documentar el Sistema de Modalidades de Graduación mediante Markdown y PlantUML. El enfoque de paquetes, vistas y trazabilidad es comparable al utilizado en Enterprise Architect; no presupone su repositorio semántico ni sus validaciones.

## Autorización y límites

Solo se crean archivos en docs/ingenieria/: índice, alcance, catálogos, glosario, discrepancias, identificadores, trazabilidad y convenciones. No se modifican código, configuraciones, datos, políticas o documentos anteriores. No se ejecutan migraciones, instalaciones, commits ni push. No se generan diagramas definitivos. La fase 3 requiere autorización independiente.

Proyecto y Tesis son superficies protegidas según [AGENTS.md](../../../AGENTS.md). Describir una regla no autoriza corregirla ni homologarla.

## Clasificación de afirmaciones

| Marca | Significado | Evidencia necesaria |
| --- | --- | --- |
| IMPLEMENTADO | Existe implementación identificable | Ruta y símbolo; no implica prueba aprobada |
| INFERENCIA | Interpretación razonada | Fuentes, razonamiento y límites |
| PROPUESTA | Convención o trabajo futuro | No presentarlo como función del producto |
| PENDIENTE | No confirmado o incompleto | Explicar qué falta verificar |

Implementación, pruebas ejecutadas y vigencia normativa son dimensiones independientes. Un archivo de pruebas no demuestra que actualmente pase.

## Método de trabajo

1. Registrar commit, cambios locales y huellas de archivos.
2. Seguir entradas, modelos, servicios, permisos, políticas y consumidores.
3. Registrar funcionalidades y restricciones con ámbito y símbolos.
4. Asociar pruebas pertinentes, distinguiendo archivo de escenario específico.
5. Registrar contradicciones con documentación anterior sin reescribirla.
6. Separar conceptos compartidos y reglas específicas por modalidad.
7. Verificar enlaces, símbolos, IDs y límites de escritura.

Para describir implementación se contrasta código con contratos de prueba. Un conflicto se registra sin resolverlo automáticamente a favor de uno. Las migraciones explican evolución, pero no acreditan esquema instalado. Los documentos previos son antecedentes; la normativa requiere validación institucional independiente.

## Límites de evidencia

Revisión estática, sin consultar PostgreSQL ni servicios en ejecución. No certifica todos los endpoints, cobertura de pruebas, producción instalada o vigencia normativa. No se usa contenido de backups, datos personales ni secretos de .env. Los directorios temporales inaccesibles no constituyen fuentes funcionales.

## Mantenimiento

Conservar IDs al actualizar. Revisar impacto por modalidad, trazabilidad y discrepancias. Registrar una nueva revisión sin borrar la fotografía inicial. Una relación o regla sin evidencia permanece PENDIENTE.
