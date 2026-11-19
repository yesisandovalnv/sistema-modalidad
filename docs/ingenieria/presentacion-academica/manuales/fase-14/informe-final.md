# Informe final — Fase 14

**Proyecto:** Sistema de Modalidades de Graduación  
**Institución:** Universidad Autónoma del Beni «José Ballivián», Ingeniería de Sistemas  
**Rama:** `desarrollo`  
**Fecha de auditoría:** 5 de noviembre de 2026  
**Naturaleza:** auditoría documental, funcional y técnica de solo lectura.

## Estado de los manuales

- **Manual de Usuario:** borrador de 11 páginas y 24 procedimientos según su informe de validación. La revisión documental confirma cobertura de módulos y seis modalidades; no hay capturas incorporadas (0/14 categorías) y los pasos no se verificaron en una sesión real. No listo para presentarse como guía operativa final.
- **Manual Técnico:** borrador técnico de 18 páginas, 28 capítulos y ocho diagramas según su informe de validación. La revisión previa de render fue favorable. Quedan discrepancias documentales y límites runtime: no se ejecutaron instalación, tests, migraciones, despliegue, backup ni restore. Listo para revisión académica como borrador, no como procedimiento operacional certificado.

## Problemas identificados

1. Manual de Usuario sin evidencia visual real y con validación de interfaz pendiente.
2. Diferencia contradictoria en documentación de fase 11 sobre capacidades del rol `ADMINISTRACION`; aún no se probó cuenta real ni acceso por endpoint.
3. Referencias técnicas desalineadas: Node 20/22, `America/La_Paz`/`America/Lima`, access JWT de 15/60 minutos y descripción de policies de modalidades desactualizada en `docs/ARCHITECTURE.md`.
4. Comandos técnicos, migraciones, pruebas y backup/restauración son contenido documentado pero no ejecutado; el restore propuesto usa `--clean` y requiere un destino controlado.
5. No se acreditaron la versión PostgreSQL runtime, versiones dentro de contenedores, esquema aplicado, entorno productivo ni política institucional de respaldo.

## Capturas pendientes

Siguen pendientes CAP-01 a CAP-14 del inventario de usuario. CAP-05 y CAP-12 representan varias vistas por las modalidades descritas. Deben priorizarse acceso, navegación, postulantes, expediente y modalidad, documentos, actores/defensa/evaluación y reportes/notificaciones. No se inició sesión, no se introdujeron credenciales, no se iniciaron servicios y no se modificaron datos. La lentitud de Vite consta como antecedente, sin medición actual.

## Correcciones documentales recomendadas

- Alinear y etiquetar con precisión versiones objetivo, configuración predeterminada y valores runtime pendientes.
- Corregir la documentación arquitectónica de policies de acuerdo con el código actual, distinguiendo implementación de reglas aprobadas.
- Resolver matriz de permisos de `ADMINISTRACION` mediante evidencia de servicio, endpoint y cuenta autorizada antes de publicar.
- Actualizar capturas, pies, referencias e índice del Manual de Usuario después de validarlas.
- Dejar comandos no ejecutados claramente identificados; verificar backup/restore solo en entorno aislado y con autorización apropiada.
- Renderizar e inspeccionar ambos DOCX completos tras cualquier corrección.

## Riesgos para la presentación

- La ausencia de capturas puede impedir que el Manual de Usuario cumpla el propósito de enseñar el uso real de pantallas.
- Afirmar permisos por nombre de rol puede ser inexacto y generar una demostración fallida.
- Contradicciones Node/zona/JWT/arquitectura pueden suscitar observaciones de coherencia técnica.
- Presentar procedimientos de respaldo o despliegue no ejecutados como probados sería una afirmación no sustentada.
- No se verificaron formato institucional oficial, autoría/tutoría, datos académicos externos ni políticas administrativas.

## Plan de cierre

1. Aprobar entorno de demostración, URL, roles/cuentas y registros seguros; no usar datos institucionales modificados.
2. Resolver permisos y discrepancias técnicas con responsable correspondiente, sin alterar configuraciones como parte de esta auditoría.
3. Obtener capturas de solo lectura/formularios vacíos y documentar cualquier operación que requiera escritura como pendiente.
4. Autorizar una fase separada para editar los dos DOCX, actualizar índices, leyendas, matrices y controles de versión.
5. Re-renderizar y revisar visualmente cada página, comprobar privacidad e integridad, y obtener aprobación académica/técnica.

## Archivos creados

1. `README.md`
2. `auditoria-manual-usuario.md`
3. `auditoria-manual-tecnico.md`
4. `plan-capturas-reales.md`
5. `discrepancias-tecnicas.md`
6. `checklist-presentacion-tribunal.md`
7. `informe-final.md`

Todos están dentro de `docs/ingenieria/presentacion-academica/manuales/fase-14/`. En fase 14 no se modificaron los DOCX ni archivos externos a esa carpeta, no se inició sesión ni servicio, no se ejecutaron comandos operativos, y no se modificaron datos.

## Dictamen

La fase 14 documental concluye con ambos documentos preservados como borradores y un plan concreto de cierre. Se detiene aquí; se requiere autorización del usuario antes de modificar los manuales.
