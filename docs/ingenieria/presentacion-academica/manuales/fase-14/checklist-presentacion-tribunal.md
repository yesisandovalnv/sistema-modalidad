# Checklist de cierre para presentación ante el tribunal

**Uso:** marcar cada control al completar las correcciones futuras. El estado de esta fase queda expresado en la última columna; no se han editado los manuales.

| Control | Manual Usuario | Manual Técnico | Estado en fase 14 |
|---|---|---|---|
| Portada institucional sin autoría/autoridades inventadas | Revisar en render final | Revisar en render final | Informes previos dicen portada presente; no se re-renderizó. |
| Control de versiones | Confirmar fecha/estado final | Confirmar fecha/estado final | Presente según informes previos. |
| Índice y páginas coherentes | Actualizar índice estático | Actualizar campo TOC | Paginación previa revisada; cualquier edición exige actualizar. |
| Jerarquía de títulos, encabezados y pies | Revisión final | Revisión final | Inspección previa positiva; no se repitió render. |
| Ortografía y vocabulario institucional | Cotejar textos UI y modalidad | Cotejar nomenclatura técnica | Revisión editorial final pendiente. |
| Cobertura de procedimientos | 24 secciones/6 modalidades | Capítulos técnicos 1–28 | Cobertura documental; recorrido no verificado. |
| Permisos/roles | Resolver discrepancia `ADMINISTRACION`; cotejar API | Explicar permisos frontend y backend | Pendiente. No inferir por nombre de rol. |
| Capturas de usuario reales y autorizadas | Incorporar CAP-01–CAP-14 donde aplica | No corresponden | 0 de 14 categorías incorporadas; pendiente esencial. |
| Datos sensibles en imágenes | Revisar nombres, C.I., R.U., correos, documentos, notas, fechas | Confirmar ausencia de secretos | Sin capturas en manual; no se inspeccionó `.env`. |
| Figuras UML y leyendas | No sustituir capturas de interfaz | Confirmar ocho figuras y legibilidad impresa | Ocho figuras presentes según validación previa; impresión no acreditada. |
| Comandos coinciden con archivos actuales | N/A salvo acceso | Revalidar literalmente README, Dockerfiles, Compose, guías y scripts | Configuración estática revisada parcialmente; comandos no ejecutados. |
| Versiones Node, zona y JWT | No aplica | Resolver discrepancias del informe | Pendiente documental; runtime sin verificar. |
| Instalación, migración, tests | N/A | Etiquetar documentado/no ejecutado o verificar en entorno separado | No ejecutados. |
| Backup y restore | N/A | Validación con destino aislado y autorización técnica | No ejecutados; no declarar validados. |
| DOCX abre íntegro | Reabrir entrega final | Reabrir entrega final | Informes previos reportan apertura correcta; hashes actuales conservados al auditar. |
| Render de todas las páginas | Repetir después de insertar capturas | Repetir después de ajustes | Renders anteriores: usuario 11, técnico 18 páginas; fase 14 no generó nuevos renders. |
| Sin páginas vacías, cortes, solapamientos o figuras deformadas | Reinspección completa | Reinspección completa, incluidas páginas apaisadas | Informes previos no observaron defectos; se debe repetir tras cambios. |
| Correspondencia entre manuales | Usar términos/modalidades iguales | Alinear alcance, roles y nomenclatura | Requiere pasada editorial conjunta. |
| Aprobación y versión de entrega | Responsable académico | Responsable técnico/académico | Pendiente; no inventar firmas ni aprobación. |

## Condición de presentación

Con los bloqueadores actuales, ambos documentos deben rotularse como borradores. En particular, el Manual de Usuario requiere evidencia de interfaz y verificación de recorrido; el Técnico requiere resolver discrepancias y distinguir con claridad configuraciones inspeccionadas de entorno real. La checklist no equivale a aprobación académica ni operacional.
