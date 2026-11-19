# Arquitectura y diseño — fase 3

## Vistas implementadas

Los diagramas se organizan en el [registro maestro](../diagramas/README.md). Cada fuente PlantUML incluye ID, objetivo, alcance, fuentes, versión y límites, y tiene ficha Markdown asociada.

- Componentes generales: SPA, API, seguridad, dominio, políticas, documentos, notificaciones, reportes, académico, ORM y archivos.
- Motor de modalidades: registro explícito, seis especializaciones y dependencia de Trabajo Dirigido respecto a clases de Proyecto.
- Despliegue: Docker de desarrollo declarado, navegador, red implícita, publicaciones de puertos, montajes y almacenamiento.
- Clases de dominio: las 40 entidades distribuidas en 15 grupos, con referencias externas abreviadas.
- Clases de diseño: contratos de políticas, especializaciones por modalidad, servicios, entrada de autenticación y permisos.
- Persistencia: ER modular, diccionario completo, autenticación heredada e intermedia conceptual de memorandos.

## Decisiones de representación

Los diagramas de clases muestran atributos y operaciones seleccionados. La selección no es una interfaz pública completa; las fichas lo indican. Las relaciones persistentes provienen de FK, OneToOne y M2M reales. No se representa composición UML simplemente porque exista CASCADE.

Los diagramas de diseño muestran herencias declaradas, atributos, operaciones y asociaciones por instanciación de políticas. Las dependencias por anotación se distinguen de la asociación persistente. Los diagramas de componentes abstraen colaboración; sus flechas no son secuencias de ejecución ni llamadas universales de todas las modalidades.

La herencia y reutilización de Trabajo Dirigido se documentan sin homogeneizar reglas. Cada modalidad conserva su paquete y sus fuentes. Los reportes y documentos no se representan como firma digital, certificación institucional o integración externa de correo.

## Infraestructura

Los valores de puertos del diagrama son defaults de Compose, no configuración efectiva leída de .env. El navegador llama al backend mediante su puerto publicado; no se inventa un proxy frontend/backend. La red default es implícita de Compose; no se afirma su nombre efectivo ni existencia en ejecución.

Producción dispone de configuración Django, pero la topología instalada no se ha comprobado. No se representan balanceadores, nginx, nube, TLS terminado o clúster como implementados. El entrypoint de desarrollo migra y puede crear superusuario; no fue ejecutado.

## Trazabilidad y límites

Versión y variante local: [referencia de fase 3](../00-alcance-y-evidencia/referencia-fase-3.md). Evidencia estructurada: [registro JSON](../diagramas/registro-fase-3.json) y [diccionario lógico](../04-dominio-y-datos/modelo-logico-fase-3.json). Validación: [informe](../10-trazabilidad-y-validacion/validacion-fase-3.md).

La documentación describe código; no valida normativa ni cambios locales. Las vistas funcionales de comportamiento quedan fuera de esta fase.
