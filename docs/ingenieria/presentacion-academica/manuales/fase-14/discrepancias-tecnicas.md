# Discrepancias técnicas documentales

La tabla distingue evidencia actual del repositorio, lo que afirma la documentación y lo aún no comprobado en runtime. Los hallazgos son recomendaciones de corrección documental; esta auditoría no altera los archivos citados.

| Tema | Código/configuración actual | Documentación/histórico | Estado runtime | Recomendación |
|---|---|---|---|---|
| Node | `Dockerfile.frontend`: `FROM node:22-alpine`; `package.json` declara Vite 8.1.x, React 19.2.x, Tailwind 4.3.x. CLI local leído: Node 25.6.1/npm 11.9.0. | `README.md` y `docs/DEPLOYMENT.md` declaran Node 20. | Contenedor y despliegue no consultados. Node local no determina versión objetivo. | Acordar versión soportada para desarrollo/CI/imagen; alinear guías sin confundir runtime local y contenedor. |
| Zona horaria | `core/settings/base.py`: `TIME_ZONE=os.getenv("TIME_ZONE", "America/La_Paz")`; `.env.example`: `TIME_ZONE=America/La_Paz`. | `docs/ENVIRONMENT.md` dice `America/Lima`. | `.env` efectivo no se leyó. | Corregir texto de referencia para expresar el default; dejar variable efectiva como configuración de entorno pendiente. |
| Access JWT | `core/settings/base.py`: access 15 minutos; refresh 7 días; rotación y blacklist configuradas. | Fase 11 informa 60 minutos. El informe de validación técnico ya señala 15 minutos. | Settings del proceso activo no se consultaron. | Conservar 15 minutos como valor del código inspeccionado y etiquetar el de 60 como histórico obsoleto; no afirmar runtime. |
| Arquitectura de modalidades | Policies actuales bajo `apps/modalidades/` para Proyecto, Tesis, Trabajo Dirigido y otras modalidades; registro y pruebas en el mismo módulo. | `docs/ARCHITECTURE.md` afirma que varias no tienen normativa implementada. README también limita policy normativa, según revisión previa fase 13. | No se probó el servicio desplegado. | Revisar documentación con cada policy y sus pruebas; precisar diferencias entre policy presente, regla configurada y decisión normativa institucional. |
| Versiones | `.venv`: Python 3.12.7, Django 6.0.7, DRF 3.17.1, SimpleJWT 5.5.1; paquete local React 19.2.7, Vite 8.1.4, Tailwind 4.3.2; Docker CLI 29.8.2/Compose 5.5.1. | Manifiestos y lockfile fijan rangos/resoluciones; Postgres Compose usa `postgres:15`. | Paquetes de contenedor y PostgreSQL servidor no consultados. | En el manual distinguir rango manifestado, lock local, versión instalada en estación e imagen declarada; no llamarlos versiones productivas. |
| Docker/producción | `docker-compose.yml` configura PostgreSQL, backend y frontend para desarrollo; defaults y montaje se describen en validación de fase 13. | `docs/DEPLOYMENT.md` describe WSGI con Gunicorn; validación informa que Gunicorn no está en `requirements.txt` y no hay manifiesto de proveedor encontrado. | No se arrancaron servicios. | Presentar Compose como ejecución local de desarrollo. Documentar producción como no verificada y requerir una receta aprobada completa. |
| Migraciones | Archivos Django de migración en apps; `docker-compose.yml` puede ejecutar migraciones según informe técnico previo. | README/DEPLOYMENT documentan `manage.py migrate`. | No se ejecutó ni se inspeccionó `showmigrations` de una instancia. | Comandos son instrucciones documentadas, no evidencia de estado aplicado. Separar generar migraciones de aplicarlas. |
| Pruebas | Scripts de `package.json` incluyen `vitest` y `vitest run`; hay suites Django y React. | Manual enumera procedimientos de prueba. | En fase 14 no se ejecutaron tests. | Identificar comandos como declarados; evitar reportar resultados o cobertura no obtenidos. |
| Respaldo/restauración | No se encontró evidencia de operación ejecutada en esta fase. | `docs/DEPLOYMENT.md` propone `pg_dump --format=custom` y `pg_restore --clean --if-exists`. | No ejecutados. Restore contiene opción destructiva para objetos existentes en destino. | Etiquetar como procedimiento documentado no probado. Antes de usarlo, destino aislado y aprobación técnica; definir retención/cifrado/recuperación con política institucional. |
| Fase 8 | Informe técnico fase 13 aclara que la carpeta documental real está directamente en `docs/ingenieria/presentacion-academica/`, no existe subcarpeta `fase-8/`. | Algunas instrucciones históricas usan `fase-8/`. | Confirmado por informe anterior; no asumir ruta. | Citar la ruta real inventariada en fase 13 al corregir referencias. |

## Fuente y nivel de confianza

- Configuración del código se verificó leyendo archivos del repositorio; es evidencia estática de la rama actual.
- Versiones de Python y paquetes del `.venv` y paquetes frontend instalados se consultaron localmente sin cambios. No equivalen a inventario de producción.
- No se leyó `.env`, secretos, información de PostgreSQL, estado de contenedores ni logs runtime.
- Los comandos citados no se ejecutaron; no se validó restauración, migración, instalación o despliegue.

## Correcciones recomendadas antes de la edición final

1. Alinear Node objetivo, zona horaria y duración JWT entre manual y guías vigentes.
2. Revisar la explicación de policies y modalidades contra clases/capacidades actuales sin inferir reglas externas al código.
3. Marcar cada instrucción como verificada documentalmente o ejecutada en una instalación concreta.
4. Delimitar claramente desarrollo frente a producción, y no presentar una guía de proveedor incompleta como despliegue validado.
5. Tratar backup/restauración como propuesta técnica pendiente de prueba y política aprobada.
