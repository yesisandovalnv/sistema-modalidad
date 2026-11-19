# Estructura propuesta del apartado de análisis y diseño

La organización es una propuesta académica, no una plantilla institucional ni una norma universitaria. Deben aprobarse capítulo, numeración, formato y extensión antes de generar Word/PDF.

| Orden | Apartado | Contenido verificable | Figuras y apoyo |
| --- | --- | --- | --- |
| 1 | Contexto, alcance y actores | Problema atendido por el software, límites y siete actores funcionales; separar cargo académico, usuario y autoridad backend. | Figura 01; catálogo de actores. |
| 2 | Requisitos funcionales observados | Presentar objetivos implementados a partir de los 75 UC y RN trazables. No redactarlos como normativa académica validada externamente. | Catálogo funcional y matriz UC→RN→implementación→entidad→prueba. |
| 3 | Casos de uso relevantes | Seguimiento, evidencia documental y defensas; remitir alternativas HTTP a permisos. | Figuras 02–04; especificaciones completas en anexo documental. |
| 4 | Arquitectura del sistema | Responsabilidades de SPA/API/servicios/policies/ORM; decisiones de reutilización; despliegue local y límite de producción. | Figuras 05–07. |
| 5 | Modelo de dominio y datos | Postulación y seguimiento como conceptos; datos de evidencias y defensas como ER lógico complementario. | Figuras 08–11; diccionario y restricciones restantes en anexo. |
| 6 | Procesos del motor común | Alta operativa frente a histórica; operaciones sobre etapas y guardas. | Figuras 12–13. |
| 7 | Interacciones críticas | Carga/archivos, consolidación y conclusión común; atomic, rollback y on_commit según cada recorrido. | Figuras 14–16. |
| 8 | Estados y transiciones | Tres dimensiones independientes: seguimiento, revisión documental y evento de defensa. | Figuras 17–19 con los contratos Txx de sus fichas. |
| 9 | Particularidades de modalidades | Contrastar Proyecto, Tesis, Trabajo Dirigido, Examen, Excelencia y Diplomado; no repetir la arquitectura común en cada subsección. | Figuras 20–25. |
| 10 | Trazabilidad y límites de validación | Distinguir cobertura documental, pruebas existentes y ejecución. Explicar vacíos sin declararlos pruebas aprobadas. | Matriz de fase 7.1 y su informe. |
| Anexo técnico | Catálogo íntegro | Localización de los 118 diagramas, fichas y fuentes; no duplicar imágenes por conveniencia editorial. | inventario-anexos.md. |

## Material de apoyo existente

- [Actores, roles y participantes](../02-actores-permisos/actores-fase-4.md).
- [Permisos backend, incluida ampliación por método/ruta](../02-actores-permisos/matriz-fase-4.md).
- [Catálogo de 75 objetivos](../03-casos-de-uso/catalogo-funcionalidades.md).
- [Trazabilidad funcional](../10-trazabilidad-y-validacion/matriz-fase-4.md).
- [Diccionario de datos](../04-dominio-y-datos/diccionario-fase-3.md).
- [Cobertura dinámica directa/contextual](../10-trazabilidad-y-validacion/matriz-fase-5.md).
- [Escenarios y aserciones](../10-trazabilidad-y-validacion/matriz-escenarios-fase-7-1.md).
- [Cierre documental y vacíos de cobertura](../10-trazabilidad-y-validacion/informe-fase-7-1.md).

## Convenciones para la redacción

Cada figura se cita antes de insertarla, se explica mediante su objetivo y se cierra con una interpretación limitada a lo implementado. Pie propuesto: «Fuente: documentación técnica del sistema, DIA-…, directorio de trabajo sobre HEAD 689eeb56ac6f». La numeración provisional 01–25 se adaptará al capítulo aprobado sin cambiar los DIA. Las figuras ER se rotulan expresamente como modelo lógico derivado del código.

Los contratos Txx deben acompañar a las máquinas de estados o quedar inequívocamente localizables en el anexo del documento definitivo; Gxx/Axx sin sus guardas no son una explicación académica suficiente. Las vistas de coordinación entre solicitudes se explican como procesos humanos/asistidos, sin simular una transacción única del backend.

No se especifican una topología productiva, validación de normativa, resultados de pruebas ni datos instalados que no estén demostrados. La tecnología e infraestructura se describen como implementación/configuración declarada; los cambios visuales y la maquetación son propuestas pendientes.

[Selección](seleccion-diagramas.md) · [Explicaciones](explicacion-diagramas.md).
