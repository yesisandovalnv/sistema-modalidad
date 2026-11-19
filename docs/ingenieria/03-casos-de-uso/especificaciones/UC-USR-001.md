# UC-USR-001 — Iniciar sesión con usuario y contraseña

## Identidad y estado

- Identificador: UC-USR-001.
- Objetivo: Tokens emitidos y last_login actualizado; no se crea un usuario.
- Actor principal: ACT-SYS-001 — Solicitante de acceso. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Iniciar sesión con usuario y contraseña mediante `POST /api/v1/auth/login/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

Sin sesión previa; credenciales o token refresh válidos según la operación. Sin expedientes; no autoriza operaciones académicas.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar username y password.
2. Validar credenciales mediante LoginSerializer.
3. Actualizar last_login del usuario aceptado.
4. Emitir refresh y access mediante RefreshToken.for_user.

## Flujos alternativos

El acceso estudiantil por R.U./C.I. es un caso separado; no es registro de cuentas.

## Excepciones

Ámbito: `POST /api/v1/auth/login/`. La guarda de acceso es el perfil `PUBLIC` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `serializers.ValidationError('Credenciales inválidas.')` — [LoginSerializer.validate](../../../../apps/usuarios/serializers.py); línea 56; método citado.
- `serializers.ValidationError('Usuario inactivo.')` — [LoginSerializer.validate](../../../../apps/usuarios/serializers.py); línea 58; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Tokens emitidos y last_login actualizado; no se crea un usuario. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-USR-101: El acceso por contraseña usa authenticate; no exige autoridad administrativa para emitir JWT.

Perfil documental `PUBLIC`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [CustomTokenObtainPairView.post](../../../../apps/usuarios/views.py); colaboración: [LoginSerializer.validate](../../../../apps/usuarios/serializers.py).
- Entidades: ENT-USR-002 (CustomUser). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/usuarios/tests_contract.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-USR-001.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-USR-001-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-USR-001-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-USR-001-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-USR-001-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-USR-001-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
