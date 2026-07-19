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
