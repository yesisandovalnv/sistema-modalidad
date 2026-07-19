# Release Candidate checklist

- [ ] Variables y secretos configurados fuera de Git
- [ ] `DEBUG=False`, hosts, CORS y CSRF correctos
- [ ] PostgreSQL respaldado y restauración ensayada en ambiente separado
- [ ] Media respaldada junto con la base
- [ ] Migraciones desde cero y `makemigrations --check`
- [ ] Seed ejecutado tres veces sin duplicados
- [ ] `collectstatic` y superusuario operativo
- [ ] Suite backend, integración, permisos y aislamiento aprobadas
- [ ] Suite frontend, lint y build aprobados
- [ ] OpenAPI regenerado sin errores
- [ ] `/api/health/` comprueba proceso y base
- [ ] Proyecto de Grado integral aprobado
- [ ] Modalidades no soportadas continúan bloqueadas
- [ ] Reportes, CSV protegido y notificaciones verificados
- [ ] Logs revisados sin tokens, contraseñas ni payloads sensibles
- [ ] Docker/Render probados en el ambiente objetivo
- [ ] Servidor WSGI y persistencia de media definidos
