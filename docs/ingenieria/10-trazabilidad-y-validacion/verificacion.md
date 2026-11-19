# Verificación de la fase 2

Fecha: 2026-11-01, America/La_Paz. Alcance: documentación nueva bajo docs/ingenieria/.

## Controles reproducibles

Desde la raíz del repositorio: python docs/ingenieria/10-trazabilidad-y-validacion/verificar.py

El [verificador](verificar.py) solo lee archivos. Comprueba UTF-8 y estructura básica Markdown, enlaces locales, símbolos Python de la matriz, clases de entidades, unicidad en registros canónicos, IDs referenciados, ausencia de fuentes .puml y conservación de huellas iniciales.

## Resultado

Ejecución completada sin errores:

| Control | Resultado |
| --- | --- |
| Markdown legibles y estructura básica | 29 archivos UTF-8 |
| Enlaces locales | 259 destinos válidos en la comprobación inicial |
| Símbolos Python de operaciones, pruebas y entidades | 74 existentes, comprobados mediante AST |
| Registros FUN / UC / RN | 23 / 23 / 23, sin colisiones |
| Entidades / componentes | 40 / 16, sin colisiones |
| Vistas planificadas / discrepancias | 8 / 7, sin colisiones |
| Archivos previos | 1.724 huellas SHA-256 conservadas |
| Diagramas definitivos | Ninguna fuente .puml creada |

El número de enlaces puede aumentar con actualizaciones editoriales; el verificador informa el valor actual. Las huellas cubren archivos listados inicialmente por Git, no archivos ignorados ni estado externo.

## Revisión de contenido y límites

Se distingue implementación, inferencia, propuesta y pendiente. Las pruebas vinculadas están NO EJECUTADAS. Los IDs UC son candidatos y los DIA están planificados; no se presentan como modelos definitivos.

Se revisaron títulos, tablas, navegación, particularidades por modalidad y clasificación de discrepancias. La verificación estructural no equivale a renderizar un sitio Markdown, validar semántica UML ni certificar toda la aplicación. La referencia de una prueba puede respaldar solo parte de una capacidad; las asociaciones a archivos requieren desglosar escenarios posteriormente.

No se ejecutaron pruebas del producto, servicios, migraciones ni instalaciones. No se realizaron commits o push. La fase 3 permanece pendiente de autorización.
