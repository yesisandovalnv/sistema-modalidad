# Plan para capturas reales del Manual de Usuario

**Estado de origen:** inventario de fase 12: 0 imágenes incorporadas y 14 categorías CAP-01–CAP-14 pendientes. La fase 14 no inició navegador ni sesión.

## Reglas de obtención

- Usar únicamente una instancia de demostración aprobada, con cuenta y rol autorizados por el responsable. No introducir credenciales durante esta auditoría.
- No crear, editar, activar, cargar, asignar, emitir, programar, evaluar, exportar ni borrar registros para conseguir una imagen.
- Preferir pantallas de lectura y formularios vacíos antes de guardar. Si llegar a una pantalla requiere una escritura, dejarla pendiente hasta que exista fixture de demostración ya aprobado.
- Mantener el original PNG y su proporción. Numerar la figura, registrar categoría, ruta, pantalla, rol de sesión y fecha; revisar manualmente PII, documentos, nombres, correos, códigos, fechas vinculables, notas, firmas y grupos pequeños.
- No aplicar anonimización que cambie datos en la aplicación. Si una imagen conserva datos sensibles, no incorporarla; acordar una fuente segura primero.
- CAP-05 y CAP-12 requieren evidencia separada por modalidad cuando el manual afirma diferencias para las seis modalidades. 14 categorías no equivalen a 14 archivos.

## Inventario de capturas pendientes

| ID | Pantalla/evidencia | Rol que debe confirmarse | Ruta/pantalla | Datos o estado requerido | ¿Sin escritura? | Riesgo y prioridad |
|---|---|---|---|---|---|---|
| CAP-01 | Acceso general y estudiantil | Sin sesión | `/login` | Formulario vacío, selector de modo | Sí | Bajo, esencial. No mostrar credenciales/autocompletado. |
| CAP-02 | Inicio/dashboard | Usuario con `puede_ver_dashboard` | `/dashboard` | Datos de demostración agregados | Sí | Alto: conteos/grupos pueden identificar. Esencial. |
| CAP-03 | Postulantes / Mi proceso | Personal con permiso y estudiante propietario | `/postulantes` o destino inicial de estudiante | Registros seguros, sin identificadores reales | Sí, si solo lectura | Alto: nombres/códigos. Esencial. |
| CAP-04 | Formulario vacío y validación | Permiso de crear postulación; no determinado en vivo | `/postulantes` > alta | Campos vacíos o fixture; no enviar | Vista vacía sí; probar validación puede enviar | Medio. Si validación exige envío, posponer. |
| CAP-05 | Expediente, pestañas, estado, orientación | Estudiante titular y personal autorizado | `/postulaciones/:id` | Expedientes de demostración; una vista relevante por modalidad | Sí, lectura | Alto: personas, etapas y fechas. Esencial; considerar seis vistas. |
| CAP-06 | Diálogo de carga documental | Estudiante o rol con permiso de carga | Expediente > Documentos | Diálogo sin confirmar, sin archivo real | Sí hasta confirmar | Alto: nombre de archivo y contenido. Esencial. |
| CAP-07 | Documento, versiones y observaciones | Titular o personal con alcance | Expediente > Documentos > detalle | Documento de demostración/redactado y comentarios seguros | Sí, lectura | Alto. Esencial. |
| CAP-08 | Revisión/dictamen vacío | Revisor autorizado por modalidad | Expediente > revisión | Formulario vacío | Sí hasta guardar | Alto. No emitir dictamen. Esencial si el manual enseña revisión. |
| CAP-09 | Actores/asignaciones | Personal autorizado y relación compatible | Expediente > actores/asignaciones | Composición preexistente segura | Sí, lectura | Alto: nombres/correos. Esencial. No asignar. |
| CAP-10 | Defensa/requisitos de programación | Personal autorizado | Expediente > Defensas | Requisitos/evento de demostración ya existente | Sí, lectura | Medio/alto: fecha, lugar, actores. No programar/reprogramar. Esencial si se explica defensa. |
| CAP-11 | Participantes, quórum, evaluación vacía | Personal con permiso de defensa/evaluación | Expediente > Defensas | Formulario vacío y datos de demostración | Sí hasta guardar | Alto: notas, firmas, comentarios. No evaluar. Esencial. |
| CAP-12 | Panel específico de modalidad | Personal/estudiante según acción y modalidad | Expediente > Modalidad | Vista de cada modalidad pertinente, sin completar ni guardar | Sí, lectura/formulario vacío | Alto: institución, proyecto, resultados/participantes. Seis variantes si se afirman. Esencial. |
| CAP-13 | Notificaciones | Usuario autenticado con `puede_ver_notificaciones` | `/notificaciones` | Mensajes no vinculables a una persona | Sí, lectura | Medio: asunto, texto y enlace. |
| CAP-14 | Reporte filtrado | Usuario con `puede_ver_reportes` | `/reportes/postulaciones` o `/reportes/resultados` | Datos agregados de demostración | Sí, sin exportar | Alto: grupos pequeños/resultados. No descargar. Esencial si los reportes se enseñan. |

## Factibilidad y herramientas

Las rutas se derivan de `src/routes/AppRoutes.jsx`, y las categorías/procedimientos de `../inventario-capturas-usuario.md`. La fase 12 informa que Computer Use no pudo determinar con confianza la URL activa de Chrome; no hay captura previa reutilizable declarada. La lentitud grave de Vite es un antecedente histórico y no se midió durante fase 14. No se reinició ni inició servicio, ni se cambió configuración. Herramienta de control de navegador no tuvo sesión confirmada; la captura nativa de pantalla solo debe considerarse una vez accesible la aplicación autorizada.

Por tanto, CAP-01 parece factible sin autenticar cuando la interfaz ya esté abierta; el estado actual del navegador no se conoce. CAP-02–CAP-14 requieren instancia, roles y datos seguros. Ninguna se capturó en esta fase.

## Secuencia recomendada de cierre

1. Responsable confirma URL/entorno de demostración, cuentas autorizadas y qué datos son ficticios o publicables.
2. Capturar CAP-01 con campos vacíos.
3. Con cada rol, completar pantallas de lectura; no probar mutaciones desde la captura.
4. Documentar las seis variantes de CAP-05/CAP-12 de modo separado, si existen y se quieren describir.
5. Revisar PNG a tamaño legible, integridad, datos sensibles y correspondencia con el procedimiento.
6. Insertar solo imágenes aprobadas, numerar pies, actualizar referencias/índice y volver a renderizar el DOCX completo.

**Pendiente de autorización futura:** edición del Manual de Usuario en fase posterior. Este plan no autoriza entrar al sistema ni realizar cambios.
