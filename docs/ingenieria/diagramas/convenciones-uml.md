# Convenciones UML y PlantUML

Estado: convenciones adoptadas para fase 3, comprobadas con renderizador local y revisión visual. Resultados en el [informe](../10-trazabilidad-y-validacion/validacion-fase-3.md).

## Paquetes y archivos

Paquetes lógicos: arquitectura, actores, dominio, procesos, API, frontend, infraestructura y modalidades/PG, TG, TD, EG, EA, DIP. No implican nodos desplegables ni namespaces idénticos al código.

Fuentes futuras: DIA-AMBITO-NNN-descripcion.puml; renderizados con igual nombre base. Fuente canónica textual y Markdown para alcance/evidencia. Cada vista responde una pregunta y evita mezclar niveles.

## Metadatos

ID, título, tipo, clasificación, ámbito/modalidad, referencia Git y variante local, fecha, fuentes con símbolos, reglas relacionadas y límites. Alias ASCII estables, etiquetas españolas y leyenda. Conservar dependencias y cardinalidades comprobadas.

## Semántica

- Casos de uso: actores externos y asociaciones por interacción demostrada. include para comportamiento obligatorio reutilizado; extend para extensión condicionada.
- Clases: distinguir entidad, servicio, policy y DTO. Herencia solo real; FK/CASCADE no demuestra composición.
- Actividades: acciones, guardas y responsables demostrados; distinguir actor académico y usuario que registra su decisión.
- Secuencias: participantes reales y orden del código, errores relevantes, transacción y postcommit; sin broker o asincronía inventados.
- Estados: una dimensión por vista; evento [guarda] / efecto. Choices no es matriz de transiciones.
- Componentes: distinguir dependencia, contrato y despliegue; carpeta no equivale a microservicio.
- Despliegue: infraestructura declarada separada de observada; Compose de desarrollo no acredita producción.
- ER: ingeniería de información, PK/FK/UQ, nulabilidad y cardinalidad; separar restricciones físicas y validaciones de aplicación.
- Cada regla específica conserva ámbito; conceptos comunes se referencian por ID.

## Estándar visual

Fondo blanco, texto oscuro y sans serif disponible en entorno fijado. Tamaño legible, nombres cortos, dirección coherente por tipo y leyenda. Colores de apoyo: común azul pálido, específico verde pálido, inferencia ámbar y propuesta gris. Añadir texto o estereotipo para no depender del color.

Objetivo orientativo de 8–15 elementos principales; dividir si pierde legibilidad. Revisar etiquetas, cruces y cardinalidades en SVG a escala habitual. No reducir la fuente para encajar un diagrama gigante.

## Herramientas y reproducibilidad

PlantUML y Markdown son los formatos de fase 3. Herramientas locales autorizadas y fijadas: PlantUML 1.2026.9, Temurin JRE 21.0.13+9 y Graphviz 2.44.1 incluido. Renderizado local con includes restringidos al directorio documental, sin includeurl ni recursos remotos variables. No se modifica el PATH ni se requieren servicios de renderizado externos.

PlantUML renderiza, pero no valida coherencia semántica. La revisión cruzada es obligatoria. No se incluyen plantillas de diagrama para no confundir convenciones con entregables definitivos.

## Actualización de fase 4

Fase 4: asociaciones actor–objetivo sin flechas de flujo; generalización con triángulo al actor o caso general. No se utiliza include/extend sin dependencia obligatoria o extensión condicional demostrada. Autenticación como precondición. Cargos académicos separados de actores API. Los perfiles y variantes HTTP se detallan fuera del dibujo para mantener legibilidad.

## Modelado dinámico de fase 5

Actividades: distinguir coordinación entre varias solicitudes de una transacción real; decisiones por variante. Secuencias: flechas sólidas para llamadas, discontinuas para respuestas; on_commit posterior al commit exterior y síncrono local, sin flecha asíncrona inventada. Estados: una dimensión por vista, Txx desarrollado en tabla con evento, guarda, acción y evidencia; el pseudoinicio no es persistido. Un choice sin escritor no genera transición. Las guardas largas se detallan en fichas para mantener legibilidad.
