# Validación y entrega de fase 4

75 casos de uso confirmados por análisis estático, siete actores funcionales, 17 diagramas modulares y 75 especificaciones. Se preservan los 23 IDs candidatos y se incorporan 52 desgloses u omisiones. Tesis especializa la conclusión común; el conteo no equivale a endpoints diferentes.

## Entrega

- [Índice funcional y fichas](../03-casos-de-uso/README-fase-4.md).
- [Registro de fuentes, fichas y SVG](../diagramas/registro-fase-4.md).
- [Galería HTML local: 69 vistas](../diagramas/renderizados/index.html).
- [Siete actores y clasificación académica](../02-actores-permisos/actores-fase-4.md).
- [Matriz de permisos](../02-actores-permisos/matriz-fase-4.md): 77 filas, separando GET/POST de resultado final y candidatos globales/contextuales.
- [75 reglas observadas](reglas-fase-4.md) y [75 cadenas de trazabilidad](matriz-fase-4.md).
- [Revisión de las 52 vistas y 23 candidatos](../00-alcance-y-evidencia/revision-fase-4.md).
- [HEAD, rama, cambios y huellas](../00-alcance-y-evidencia/referencia-fase-4.md).

## Procedimiento reproducible

Desde la raíz del repositorio, con las herramientas existentes:

```powershell
python docs/ingenieria/diagramas/renderizar_fase4.py
python docs/ingenieria/10-trazabilidad-y-validacion/revisar_fase4.py --previsualizar
python docs/ingenieria/10-trazabilidad-y-validacion/verificar.py
python docs/ingenieria/10-trazabilidad-y-validacion/validar_fase3.py
python docs/ingenieria/10-trazabilidad-y-validacion/validar_fase4.py
```

El renderizador solo procesa las fuentes nuevas. No descargar dependencias ni usar servicios externos. El constructor documental es opcional, reescribe únicamente entregables de fase 4 e índices autorizados; no ejecutar el constructor de fase 3 para esta entrega. El validador de fase 3 se limita ahora a sus fuentes planas; el de fase 4 comprueba la unión completa de 69 fuentes para detectar archivos huérfanos.

## Resultados

Validación completada sin errores: 190 documentos Markdown propios, 2503 enlaces locales Markdown, 345 enlaces/recursos de galería y 150 referencias funcionales a símbolos contrastados mediante AST. Los 75 casos tienen ficha, regla y cadena de trazabilidad; 33 archivos de pruebas existentes se relacionan sin afirmar cobertura de cada variante. Los 17 SVG tienen sintaxis válida, cero textos fuera del lienzo y cero avisos de solapamiento de texto. Se revisaron visualmente las tres hojas de contacto, incluidas las vistas más densas y las seis modalidades.

Se conservan las 158 huellas protegidas de fase 3 y las 1724 huellas exteriores, así como HEAD, rama y estado Git exterior. El control de fase 3 sigue pasando para 52 vistas, 40 modelos, 172 apariciones de relaciones y 221 operaciones. Los 98 RN registrados son los 23 históricos y los 75 observados en fase 4; 73 DIA incluyen 69 fuentes efectivas, tres reservas futuras y el atlas documental.

Resultados finales y evidencias automáticas en los informes JSON enlazados a continuación. Sintaxis mediante PlantUML oficial local 1.2026.9; SVG mediante Temurin JRE 21.0.13+9 y Graphviz 2.44.1 ya disponibles. Revisión geométrica de textos y revisión visual mediante PNG/hojas de contacto. La heurística geométrica detecta cajas de texto, no sustituye la revisión humana ni prueba ausencia de cruces de líneas.

- [Resultado de renderizado local](logs-renderizado-fase-4/resultado.json).
- [Geometría SVG](logs-renderizado-fase-4/geometria-svg.json).
- [Control documental general](resultado-documental-fase-4.json).
- [Control de conservación de fase 3](resultado-conservacion-fase-3.json).
- [Control funcional, trazabilidad e integridad](resultado-fase-4.json).

No se ejecutaron pruebas del producto; las referencias a pruebas solo confirman archivos existentes y relacionados. No se importó Django, no se accedió a PostgreSQL y no se validó normativa ni infraestructura real de producción. No se alteró código funcional, políticas ni configuraciones; no se instalaron dependencias, ni se realizaron commits o push.

## Pendientes y discrepancias

Consultar el [registro acumulado](../00-alcance-y-evidencia/discrepancias.md). Quedan por caracterizar las mutaciones heredadas de confirmación de corrección, las variantes ordinarias de edición de postulación, el contrato de refresh/logout, efectos auxiliares de consultas y cobertura de escenarios de pruebas. La divergencia entre PATCH de estado y conclusión por workflow se registra sin modificarla. La variante local de Proyecto de Grado conserva el valor existente y no recibe aval normativo por esta documentación.

## Recomendaciones para fase 5 — propuesta sin ejecución

1. Priorizar actividades y secuencias de carga/revisión documental, transición de etapa y conclusión; usar las fichas como contratos observados.
2. Construir máquinas de estados separadas de postulación, seguimiento, documento y defensa, con referencias a sus guardas; mantener seis políticas académicas distintas.
3. Caracterizar con pruebas aisladas las superficies pendientes y conciliar permiso backend, capacidad visual y expectativa académica; cualquier cambio funcional requiere autorización propia y protección aplicable de Proyecto/Tesis.
4. Desglosar archivos de pruebas en escenarios concretos por flujo y error, sin confundir referencia documental con resultado de ejecución.
5. Mantener la misma referencia de directorio de trabajo y actualizar huellas ante cambios autorizados.

La fase 4 termina con esta entrega. No se inicia la fase 5.
