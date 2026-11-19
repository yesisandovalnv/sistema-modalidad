# DIA-USR-070 — Login por contraseña y emisión JWT

- Identificador: DIA-USR-070.
- Tipo UML: Secuencia.
- Objetivo: Documentar el comportamiento implementado de login por contraseña y emisión jwt, con decisiones, guardas y límites de evidencia.
- Alcance: Autenticación y sesión; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-SYS-001.
- Casos relacionados: UC-USR-001, UC-USR-003, UC-USR-004, UC-USR-005, UC-USR-009 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-USR-001.
- Reglas observadas: RN-USR-101, RN-USR-103, RN-USR-104, RN-USR-105, RN-USR-109.
- Componentes: CMP-CORE-001, CMP-USR-001, CMP-WEB-001.
- Entidades relacionadas: ENT-USR-001, ENT-USR-002, ENT-USR-004.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/secuencias/DIA-USR-070.puml) · [SVG](../../renderizados/fase-5/DIA-USR-070.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Vista selectiva de implementación; no certifica ejecución funcional, datos instalados ni normativa vigente.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [LoginSerializer.validate (L49)](../../../../../apps/usuarios/serializers.py).
- [LogoutSerializer (L37)](../../../../../apps/usuarios/serializers.py).
- [UserCapabilitiesService.resolve (L39)](../../../../../apps/usuarios/services.py).
- [authenticate_student (L87)](../../../../../apps/usuarios/student_auth.py).
- [CustomTokenObtainPairView.post (L28)](../../../../../apps/usuarios/views.py).
- [CustomTokenRefreshView.post (L48)](../../../../../apps/usuarios/views.py).
- [LogoutView.post (L72)](../../../../../apps/usuarios/views.py).
- [MeView.get (L95)](../../../../../apps/usuarios/views.py).
- [StudentTokenObtainPairView.post (L60)](../../../../../apps/usuarios/views.py).
- [SIMPLE_JWT (L121)](../../../../../core/settings/base.py).
- [src/context/AuthProvider.jsx (L1)](../../../../../src/context/AuthProvider.jsx).
- [src/pages/auth/LoginPage.jsx (L1)](../../../../../src/pages/auth/LoginPage.jsx).
- [src/services/api.js (L1)](../../../../../src/services/api.js).
- [src/services/authService.js (L1)](../../../../../src/services/authService.js).

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/usuarios/tests_contract.py](../../../../../apps/usuarios/tests_contract.py).
- [apps/usuarios/tests_student_login.py](../../../../../apps/usuarios/tests_student_login.py).
