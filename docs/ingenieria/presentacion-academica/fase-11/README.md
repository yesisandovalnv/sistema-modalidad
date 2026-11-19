# Fase 11 — Auditoría para los manuales

**Estado: auditoría documental completada con limitaciones funcionales y de entorno.** Esta carpeta reúne la recuperación verificable previa a los manuales de usuario y técnico. No contiene los manuales Word ni evidencia de sesiones reales capturadas.

## Entregables

1. [Auditoría funcional](auditoria-funcional.md)
2. [Inventario de procedimientos de usuario](inventario-procedimientos-usuario.md)
3. [Inventario de capturas](inventario-capturas.md)
4. [Auditoría técnica](auditoria-tecnica.md)
5. [Diagramas reutilizables](inventario-diagramas-reutilizables.md)
6. [Discrepancias y pendientes](discrepancias-y-pendientes.md)
7. [Plan de elaboración](plan-elaboracion-manuales.md)
8. [Informe final](informe-final.md)

## Alcance y lectura

La fuente de verdad para las capacidades es el código actual. Las rutas UI se contrastan en `src/routes/AppRoutes.jsx`; roles y permisos, en `core/permissions.py`, `apps/usuarios/services.py` y vistas de cada módulo. Los diagramas y documentos de fases 8–10 son fuentes auxiliares, no prueba de que un procedimiento sea visible o realizable en una sesión actual.

La inspección fue estática. No se inició frontend/backend, no se accedió a PostgreSQL, no se ejecutaron migraciones o pruebas, no se modificaron datos y no se generaron capturas.

## Resultado resumido

- Se identifican pantallas para autenticación, inicio, postulaciones/expedientes, documentos, modalidades, seguimiento, notificaciones, usuarios, configuración, reportes y perfil.
- Se catalogan 15 procedimientos prioritarios en dos grupos de rol, con pantallas de soporte para administración, revisión, asesoría, tribunal y estudiante. El acceso concreto depende de permisos de rol, relación con el expediente y modalidad/etapa.
- Se identifican seis modalidades configurables y controles compartidos; no se presume que todas compartan etapas, defensas, evaluaciones o cierre.
- Se recomienda obtener capturas en un entorno de demostración con datos ya anonimizados y sin operaciones persistentes. No se comprobó que dicho entorno esté disponible.
- Los DOCX de fase 10 están presentes y el informe registra revisión visual completada; un JSON de publicación mantiene una nota de bloqueo de Word que requiere conciliación documental.
