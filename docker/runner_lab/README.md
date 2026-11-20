# Fase 11A.1: laboratorio PostgreSQL desechable

Estado posterior: el laboratorio ya está inicializado. Para el cliente interno
actual usar `compose.runner.yml` y consultar
[validación de importación/acceso](../../docs/ingenieria/VALIDACION_IMPORTACION_ACCESO.md).
Los pasos históricos de creación no deben repetirse sobre recursos existentes.

Preparación estática solamente. **No se inició ni se autoriza iniciar el entorno.**
No ejecutar los comandos de arranque, SQL o eliminación sin autorización posterior.

## Arquitectura y límites actuales

Un solo servicio `postgres-lab`, imagen PostgreSQL 15.18, puerto host **5542**
publicado exclusivamente en loopback, puerto interno 5432. Proyecto, red y volumen
usan `sm-runner-lab-<identidad-aleatoria>`. Ningún recurso es externo ni se referencia
otro proyecto. Solo se monta el volumen nuevo y `./init` de esta carpeta, de solo
lectura. No se montan backups, código del sistema, Docker socket, .env existentes
ni directorios de datos del host. La red dedicada es `internal: true`; no hay
otros servicios, dependencias, redes compartidas ni rutas de salida ordinarias.

El init usa únicamente el socket Unix local explícito y credenciales de este
clúster. Borra variables de routing libpq, ignora psqlrc y comprueba alcance,
usuario, base, socket y data_directory antes del SQL. No acepta URLs ni hosts
externos. Si falla el init, no reusar el volumen parcialmente inicializado:
conservarlo para diagnóstico o eliminarlo solo con autorización específica.

**Adaptación 11A.2:** `testing_backend/guard.py` centraliza una lista cerrada:
`legacy` en 127.0.0.1:5541 con modalidad_test y `runner_lab` en 127.0.0.1:5542 con
lab_test_executor. Cada configuración incluye TEST_GUARD con perfil e identificador
esperado obligatorio. El runner comprueba coherencia con TEST_DB_SYSTEM_IDENTIFIER
y vincula la ejecución a ese perfil/clúster. No hay perfil genérico, flags de
desactivación, monkeypatches ni redirecciones. Las conexiones de mantenimiento y
las nuevas conexiones a bases creadas verifican identidad y privilegios.

`settings_runner_lab.py` es independiente, sin importar settings anteriores ni
aplicaciones de negocio. La adaptación solo se validó con mocks. Faltan el
identificador real, secretos y autorización de arranque; no iniciar automáticamente.

## Roles

| Rol | Uso y permisos |
| --- | --- |
| `lab_infra_admin` | Superusuario bootstrap exclusivo del laboratorio. Secreto solo en Docker; no está en settings del runner. Provisionamiento y limpieza autorizados. |
| `lab_test_executor` | LOGIN, NOSUPERUSER, NOCREATEDB inicial, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS. Sin membresías. CONNECT a postgres y EXECUTE sobre pg_control_system(). |

Se revocan permisos PUBLIC sobre postgres, template1 y el esquema public de
postgres. El ejecutor no tiene CREATE allí. Las bases nuevas de pruebas proceden
de template0 y serán propiedad del ejecutor únicamente durante validación.
La inicialización concede el permiso de identidad también en `template0` del
laboratorio, abriendo temporalmente conexiones locales de administrador y
cerrándolas después. Así se hereda el permiso en raíces y clones. Un fallo en
esa fase requiere revisión del volumen parcial; no ejecutar pruebas sobre él.
No se importa ninguna base conservada. Las bases centinela futuras serán
propiedad del administrador, con CONNECT/TEMP/CREATE revocados al ejecutor y
PUBLIC. Su preparación pertenece a la siguiente fase autorizada.

CREATEDB solo se habilitará durante una ventana de validación autorizada y se
revocará al terminar. El runner actual exige CREATEDB y rechazará el rol inicial.
CREATEDB no tiene restricción nativa por prefijo: el rol nunca debe recibir
credenciales o acceso a los clústeres conservados.

## Archivos y secretos

- `compose.yml`: único Compose del laboratorio.
- `environment.example`: plantilla sin credenciales.
- `init/10-lab-roles.sh`: inicialización solo en PGDATA nuevo.
- `validate_static.py`: inspección offline sin Docker ni conexiones.
- `../../settings_runner_lab.py`: settings mínimos, sin apps funcionales.

`lab.env.local` y `secrets.local/` quedan ignorados por las reglas existentes
`*.local`. No crearlos copiando .env ni usar contraseñas del sistema. Compose
secrets en modo local son archivos montados, no una bóveda cifrada: restringir
acceso al directorio en Windows. No publicar `docker compose config` con secretos
externos interpolados ni copiar archivos locales a un repositorio.

## Validación estática autorizada ahora

Desde la raíz del repositorio:

```powershell
.venv/Scripts/python.exe -B docker/runner_lab/validate_static.py
git check-ignore docker/runner_lab/lab.env.local docker/runner_lab/secrets.local/admin_password docker/runner_lab/secrets.local/executor_password
```

El script solo lee archivos; no importa settings, no abre sockets ni ejecuta SQL.
No determina disponibilidad del puerto, existencia de volúmenes ni conectividad
real. Tampoco valida con el motor de Docker la semántica del Compose.

## Procedimiento exacto de preparación e inicio FUTURO

**Requiere autorización explícita para iniciar y crear el nuevo entorno.**
Comandos PowerShell desde la raíz del repositorio; no usar el Compose principal.

1. Generar configuración y secretos exclusivos (no sobrescribe archivos previos):

```powershell
$labDir = Join-Path (Get-Location) 'docker/runner_lab'
$labEnv = Join-Path $labDir 'lab.env.local'
$labCompose = Join-Path $labDir 'compose.yml'
$labSecrets = Join-Path $labDir 'secrets.local'
if ((Test-Path -LiteralPath $labEnv) -or (Test-Path -LiteralPath $labSecrets)) { throw 'Ya hay configuración local; revisar sin sobrescribir.' }
$labRandom = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$labBytes = New-Object byte[] 6
$labRandom.GetBytes($labBytes)
$labId = ([BitConverter]::ToString($labBytes)).Replace('-', '').ToLowerInvariant()
$labProject = "sm-runner-lab-$labId"
$labUtf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($labEnv, "LAB_INSTANCE_ID=$labId`nLAB_SYSTEM_IDENTIFIER=`n", $labUtf8)
New-Item -ItemType Directory -Path $labSecrets -ErrorAction Stop | Out-Null
foreach ($labSecretName in @('admin_password', 'executor_password')) {
    $labSecretBytes = New-Object byte[] 48
    $labRandom.GetBytes($labSecretBytes)
    [System.IO.File]::WriteAllText((Join-Path $labSecrets $labSecretName), [Convert]::ToBase64String($labSecretBytes), $labUtf8)
}
$labRandom.Dispose()
$env:LAB_INSTANCE_ID = $labId
```

2. Comprobar recursos y rechazar reutilización **antes** de `up`:

```powershell
if (Get-NetTCPConnection -LocalPort 5542 -State Listen -ErrorAction SilentlyContinue) { throw 'Puerto ocupado; no cambiarlo improvisadamente.' }
$labVolumes = docker volume ls --format '{{.Name}}'
if ($LASTEXITCODE -ne 0) { throw 'No se pudo comprobar Docker.' }
if ($labVolumes -contains "${labProject}_data") { throw 'Volumen preexistente: abortar.' }
$labNetworks = docker network ls --format '{{.Name}}'
if ($LASTEXITCODE -ne 0) { throw 'No se pudo comprobar redes.' }
if ($labNetworks -contains "${labProject}_network") { throw 'Red preexistente: abortar.' }
$labContainers = docker ps -a --filter "label=com.docker.compose.project=$labProject" --format '{{.ID}}'
if ($LASTEXITCODE -ne 0 -or $labContainers) { throw 'Proyecto preexistente o consulta fallida.' }
docker compose --env-file $labEnv -p $labProject -f $labCompose config --quiet
if ($LASTEXITCODE -ne 0) { throw 'Compose inválido.' }
```

Verificar que nadie crea recursos con esos nombres entre preflight y arranque;
usar una identidad nueva si hay duda. No usar override files ni otro `-p`.

3. Solo tras autorización, iniciar, revisar montajes/red/puerto y leer identidad:

```powershell
docker compose --env-file $labEnv -p $labProject -f $labCompose up -d --wait
if ($LASTEXITCODE -ne 0) { throw 'Falló el arranque; revisar, no reintentar con datos previos.' }
docker compose --env-file $labEnv -p $labProject -f $labCompose ps
$labContainer = docker compose --env-file $labEnv -p $labProject -f $labCompose ps -q postgres-lab
docker inspect $labContainer --format '{{json .Mounts}} {{json .NetworkSettings.Networks}}'
$labCluster = docker compose --env-file $labEnv -p $labProject -f $labCompose exec -T postgres-lab psql -X -h /var/run/postgresql -p 5432 -U lab_infra_admin -d postgres -Atc 'SELECT system_identifier FROM pg_control_system();'
if ($LASTEXITCODE -ne 0 -or $labCluster -notmatch '^[0-9]+$') { throw 'No se acreditó identidad.' }
[System.IO.File]::WriteAllText($labEnv, "LAB_INSTANCE_ID=$labId`nLAB_SYSTEM_IDENTIFIER=$labCluster`n", $labUtf8)
```

Guardar la identidad solo después de comprobar que es un clúster nuevo, que los
montajes son los previstos y que solo pertenece a la red del laboratorio.
La imagen puede requerir descarga. No iniciar pruebas automáticamente después.

## Ventana de validación FUTURA (no autorizada en esta fase)

Tras revisar la adaptación 11A.2, validar el endpoint y obtener autorización de
pruebas reales, habilitar temporalmente CREATEDB por socket local:

```powershell
docker compose --env-file $labEnv -p $labProject -f $labCompose exec -T postgres-lab psql -X -h /var/run/postgresql -p 5432 -U lab_infra_admin -d postgres -v ON_ERROR_STOP=1 -c 'ALTER ROLE lab_test_executor CREATEDB;'
```

El plan necesita un harness de integración **todavía no implementado**. Usar
settings_runner_lab, sin aplicaciones de negocio. No ejecutar manage.py test sin
settings ni ejecutar suites funcionales. El harness no debe llamar al runner si
el perfil, identificador esperado o endpoint no coinciden con el laboratorio.

Orden mínimo: verificar identidad y privilegios; verificar denegación al usar
otro clúster/puerto/rol; crear centinelas sintéticos como administrador; probar
colisión raíz y clon, noinput y keepdb; ejecutar dos controladores concurrentes;
probar workers spawn Windows; interrumpir antes/después de CREATE, marca y DROP;
simular pérdida de conexión; alterar evidencia solo en bases sintéticas; verificar
conservación de centinelas y bases inciertas y limpieza exclusiva de las propias.
Registrar catálogo, OIDs, propietarios, comentarios y contenido antes/después.
No probar endpoints erróneos mediante conexión a los clústeres existentes:
simularlos o usar únicamente destinos del laboratorio.

Revocar CREATEDB al terminar, incluso si falla la validación:

```powershell
docker compose --env-file $labEnv -p $labProject -f $labCompose exec -T postgres-lab psql -X -h /var/run/postgresql -p 5432 -U lab_infra_admin -d postgres -v ON_ERROR_STOP=1 -c 'ALTER ROLE lab_test_executor NOCREATEDB;'
```

## Eliminación FUTURA

Requiere autorización específica para eliminar este entorno y su volumen. Volver
a cargar exclusivamente lab.env.local, validar el ID con `^[a-f0-9]{12}$`, formar
`sm-runner-lab-<ID>` y comprobar mediante inspect nombres y etiquetas
`sm.scope=runner-lab-11a1` y `com.docker.compose.project`. Si falta evidencia,
abortar. No usar prune, comodines, Compose principal ni borrar directorios PGDATA.

Tras esas comprobaciones y autorización:

```powershell
docker compose --env-file $labEnv -p $labProject -f $labCompose down --volumes
```

Conservar evidencias de validación fuera del volumen antes de eliminarlo. Borrar
secretos locales solo tras una revisión de sus rutas absolutas y autorización.

## Riesgos restantes

La inspección estática no acredita aislamiento efectivo del Docker Desktop del
host. `internal: true` y ausencia de redes compartidas aíslan el tráfico ordinario,
pero el administrador del host puede reconectar redes, y debe verificarse la
accesibilidad al gateway/puertos publicados del host antes de cualquier test.
Si la política del host permite llegar desde la red interna a otros PostgreSQL,
será necesario bloquearlo en firewall o usar una VM/daemon Docker dedicado;
no afirmar aislamiento de red absoluto sin esa comprobación autorizada.

Loopback permite conexiones de procesos locales: mantener secretos exclusivos.
Una etiqueta de imagen no es un digest inmutable; fijarlo tras verificar origen
y disponibilidad antes del arranque autorizado. Docker secrets locales no cifran
archivos. Un fallo a mitad del init deja un volumen parcial. La adaptación del
runner solo tiene validación con mocks y el harness real está pendiente. Nada de esto autoriza
modificar entornos existentes ni iniciar automáticamente una fase posterior.
