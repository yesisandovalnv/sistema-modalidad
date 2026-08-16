# Pruebas

Backend completo y base reutilizada:

```powershell
python manage.py test
python manage.py test --keepdb
```

Migraciones y políticas:

```powershell
python manage.py migrate --plan
python manage.py makemigrations --check
python manage.py validate_modalidad_policies
```

Frontend:

```powershell
npm run lint
npm run test:run
npm run build
```

Las pruebas de documentos crean archivos temporales; no deben apuntar a `media/` de producción. Para probar una base realmente nueva use una base PostgreSQL separada o permita que `manage.py test` cree y destruya su base de pruebas. Nunca ejecute restauraciones sobre desarrollo.

## Observaciones de pruebas funcionales

### Configuración → Requisitos

- **Hallazgo:** El campo `Requisito.obligatorio` existe globalmente con `default=True`, es editable mediante la API y visible en el listado, pero no es editable desde el frontend y actualmente no interviene en validaciones reales de postulaciones o etapas.
- **Clasificación:** Inconsistencia de contrato/diseño; no constituye un bloqueo E2E inmediato.
- **Decisión pendiente:** Confirmar si la obligatoriedad debe ser global al requisito, contextual por modalidad o contextual por modalidad/etapa.
- **Estado:** No implementar ninguna opción por el momento. Continuar con las pruebas funcionales del sistema.
