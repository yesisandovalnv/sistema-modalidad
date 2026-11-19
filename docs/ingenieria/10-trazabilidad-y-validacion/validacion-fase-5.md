# Entrega, validación y límites — fase 5

Modelado dinámico del directorio de trabajo: HEAD 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19, rama desarrollo. Se identifican 21 familias de procesos y se generan 49 vistas nuevas: 24 actividades, 11 secuencias y 14 diagramas de estados, con 79 contratos de transición. La cobertura vincula los 75 casos de uso existentes; es cobertura por familia y recorridos selectivos, no una afirmación de exhaustividad por payload o variante heredada.

## Entregables

- [Análisis previo e inventario de 21 procesos](../05-procesos-y-estados/analisis-fase-5.md).
- [Registro de las 49 fuentes PlantUML, fichas y SVG](../diagramas/registro-fase-5.md).
- [Galería HTML local de 118 vistas](../diagramas/renderizados/index.html), con búsqueda y acceso a fuentes/fichas.
- [Matriz dinámica de los 75 UC](matriz-fase-5.md), reutilizando RN, servicios/endpoints, entidades y pruebas relacionadas.
- [Cobertura y particularidades de seis modalidades](../09-modalidades/cobertura-fase-5.md).
- [Referencia Git, diferencias y huellas](../00-alcance-y-evidencia/referencia-fase-5.md).

Las fichas contienen objetivo, alcance, tipo UML, UC, RN, componentes, entidades, evidencia por símbolo/línea, archivos de pruebas, limitaciones y versión. Las transiciones se identifican como DIA/Txx y desarrollan origen, evento, guarda, acción, destino y restricción. Gxx/Axx del dibujo son alias documentales de la guarda/acción de su fila Txx, no variables ni métodos inventados.

## Criterios de modelado y coherencia

- Actividades diferencian operación individual de coordinación entre varias solicitudes. Las vistas nominales de modalidad no afirman un método automático que recorra todas las etapas.
- Secuencias separan permisos, serializers, servicios, políticas y persistencia donde el recorrido lo respalda. Las vistas compuestas agrupan participantes identificados; no crean clases nuevas. Las consultas ORM a PostgreSQL son abstracciones de la configuración y código, no SQL capturado de una base instalada.
- Las transacciones se representan solo donde existe atomic; los callbacks esperan el commit exterior. Publicación local posterior al commit conserva semántica síncrona; no se añade broker ni worker.
- Estado general y vigencia de postulación son dimensiones independientes. Nuevo intento crea otro seguimiento; reemplazo crea otra asignación. Corrección documental, revisión del documento y actualidad de versión tampoco son el mismo estado.
- No hay máquina universal de EvaluacionDefensa: tipos, notas, clasificación y consolidado no son un lifecycle persistido. ExamenArea, ExcelenciaExpediente y DiplomadoModulo mantienen sus resultados/estados específicos y escritores comprobados.
- Las seis listas STAGE_DATA se contrastan mediante AST, sin importar políticas ni consultar etapas instaladas. Los regímenes y escalas legacy no se reinterpretan.

## Validaciones reproducibles

Desde la raíz del repositorio, con Python y las herramientas portátiles existentes:

```powershell
python docs/ingenieria/diagramas/renderizar_fase5.py
python docs/ingenieria/10-trazabilidad-y-validacion/revisar_fase5.py --previsualizar
python docs/ingenieria/10-trazabilidad-y-validacion/verificar.py
python docs/ingenieria/10-trazabilidad-y-validacion/validar_fase3.py
python docs/ingenieria/10-trazabilidad-y-validacion/validar_fase4.py
python docs/ingenieria/10-trazabilidad-y-validacion/validar_fase5.py
```

No ejecutar los constructores anteriores: podrían reescribir sus propios entregables. El constructor de fase 5 solo genera fuentes/fichas nuevas e índices autorizados. El verificador de fase 4 admite ahora el registro adicional para comprobar la unión de fuentes y galería, sin modificar diagramas ni sus huellas.

Herramientas locales ya disponibles: PlantUML 1.2026.9, Temurin JRE 21.0.13+9 y Graphviz 2.44.1 incorporado. No se instalaron dependencias ni se enviaron código o diagramas a servicios externos. Las previsualizaciones PNG son material auxiliar local ignorado; los SVG y sus fuentes son los entregables versionables.

## Resultados y evidencias

Los informes automáticos conservan salidas y huellas para distinguir validación documental de ejecución funcional:

- [Sintaxis y renderizado](logs-renderizado-fase-5/resultado.json).
- [Control geométrico de textos](logs-renderizado-fase-5/geometria-svg.json).
- [Markdown, enlaces e identificadores](resultado-documental-fase-5.json).
- [Conservación y consistencia de fase 3](resultado-conservacion-fase-3-en-fase-5.json).
- [Conservación y consistencia de fase 4](resultado-conservacion-fase-4-en-fase-5.json).
- [Cobertura, transiciones, referencias, etapas e integridad](resultado-fase-5.json).

La validación geométrica detecta texto fuera de lienzo y solapamientos entre cajas de texto; no demuestra por sí sola corrección semántica ni ausencia de cruces de líneas. Se complementa con revisión visual de las nueve hojas de contacto y vistas densas. La revisión motivó ajustar envoltura de mensajes de secuencia y organización de decisiones; no cambió fuentes o estilo de diagramas previos.

No se ejecutaron pruebas funcionales del producto. Las pruebas enlazadas son archivos existentes por afinidad, sin afirmar cobertura completa de guardas o resultados actuales. No se importó Django ni se accedió a PostgreSQL; no se ejecutaron migraciones. No se modificó código funcional, políticas, modelos ni configuración; no hubo commits ni push.

## Resultado final de los controles

Todos los controles documentales finalizaron sin errores: sintaxis oficial y SVG de las 49 vistas, trazabilidad de 75 UC, unicidad de 79 contratos de transición y contraste de las seis listas de etapas. Se verificaron 252 documentos Markdown propios, 4049 enlaces locales Markdown y 590 enlaces/recursos de galería. Los controles geométricos finales no detectan textos fuera del lienzo ni solapamientos de texto.

Las 213 huellas protegidas de fases previas y las 1724 huellas exteriores permanecen intactas; HEAD, rama y estado Git exterior se conservan. Los controles de fases 3 y 4 siguen pasando. Los ajustes visuales se limitaron a fuentes nuevas; la revisión de documento conserva las operaciones sin cambio de código como transiciones internas para evitar cruces de bucles. Validación documental y visual completada; pruebas funcionales ejecutadas: cero.

## Discrepancias y comportamientos pendientes

El [registro acumulado](../00-alcance-y-evidencia/discrepancias.md) incorpora seis hallazgos dinámicos. Destacan la independencia de vigencia/conclusión, la ausencia de estado OBS al observar documentos, los choices EN_PROCESO sin escritor confirmado para área/módulo, el alcance limitado de compensación de archivos y la falta de outbox/reintento persistente demostrado para notificaciones.

Se mantienen pendientes la caracterización de PUT/PATCH/DELETE heredados de confirmación, edición ordinaria de postulación, contrato refresh/logout, vigencia normativa y datos/esquema efectivamente instalados. La variante local de antelación de Proyecto se conserva sin aval normativo. La existencia de un servicio de baja no acredita endpoint ni permiso de interfaz para ejecutarlo.

## Recomendaciones para la siguiente fase — propuesta

1. Revisar los contratos de transición y guardas con responsables funcionales; registrar discrepancias sin corregir el producto dentro de una tarea documental.
2. Planificar escenarios de pruebas aisladas por transición válida, guarda fallida, rollback, concurrencia y postcommit; enlazar métodos de prueba concretos a los 75 UC.
3. Caracterizar las superficies heredadas y la edición de estado antes de proponer cambios; aplicar las protecciones de Proyecto/Tesis cuando exista impacto funcional.
4. Contrastar esquema físico y despliegue efectivo únicamente con autorización específica y acceso de solo lectura acordado.
5. Mantener un control reproducible que impida fuentes o SVG huérfanos y detecte divergencias entre código, matrices y registros.

La fase 5 se cierra con esta entrega. No se inicia otra fase.
