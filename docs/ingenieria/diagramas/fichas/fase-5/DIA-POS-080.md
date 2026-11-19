# DIA-POS-080 — Vigencia independiente de postulación

- Identificador: DIA-POS-080.
- Tipo UML: Estados.
- Objetivo: Documentar el comportamiento implementado de vigencia independiente de postulación, con decisiones, guardas y límites de evidencia.
- Alcance: Registro, consulta y estado general; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-POS-001.
- Casos relacionados: UC-POS-001, UC-POS-002, UC-POS-010, UC-POS-011, UC-POS-024, UC-POS-025 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: ninguno confirmado para los objetivos de esta familia.
- Reglas observadas: RN-POS-101, RN-POS-102, RN-POS-110, RN-POS-111, RN-POS-124, RN-POS-125.
- Componentes: CMP-CORE-001, CMP-POS-001.
- Entidades relacionadas: ENT-ACA-001, ENT-ACA-002, ENT-POS-001, ENT-POS-002, ENT-POS-003, ENT-POS-004, ENT-POS-005, ENT-USR-002, ENT-USR-003.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/estados/DIA-POS-080.puml) · [SVG](../../renderizados/fase-5/DIA-POS-080.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

No se halló escritor productivo hacia CANCELADA ni cierre automático de vigencia al concluir; CANCELADA queda declarado sin entrada. Baja existe como servicio, no como caso de uso HTTP nuevo. CERRADA→baja refleja la guarda real del servicio, no una regla normativa recomendada.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [Postulacion (L159)](../../../../../apps/postulantes/models.py).
- [postulaciones_in_scope (L7)](../../../../../apps/postulantes/permissions.py).
- [PostulacionService.agregar_observacion (L326)](../../../../../apps/postulantes/services.py).
- [PostulacionService.cambiar_estado (L240)](../../../../../apps/postulantes/services.py).
- [PostulacionService.crear_postulacion (L57)](../../../../../apps/postulantes/services.py).
- [PostulacionService.crear_postulacion_historica (L129)](../../../../../apps/postulantes/services.py).
- [PostulacionService.dar_de_baja (L187)](../../../../../apps/postulantes/services.py).
- [HistorialEstadoViewSet.get_queryset (L703)](../../../../../apps/postulantes/views.py).
- [ObservacionViewSet.create (L744)](../../../../../apps/postulantes/views.py).
- [ObservacionViewSet.get_queryset (L731)](../../../../../apps/postulantes/views.py).
- [PostulacionViewSet.create (L174)](../../../../../apps/postulantes/views.py).
- [PostulacionViewSet.get_queryset (L116)](../../../../../apps/postulantes/views.py).
- [PostulacionViewSet.historicas (L240)](../../../../../apps/postulantes/views.py).
- [PostulacionViewSet.partial_update (L263)](../../../../../apps/postulantes/views.py).

## Contrato de transiciones

Origen y destino se refieren a la dimensión de esta vista. `[*]` indica creación, no un estado persistido. Cada Txx del dibujo se desarrolla aquí; las guardas completas incluyen las validaciones del método citado.

| T | Origen | Evento | Guarda | Acción | Destino | Restricción y evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | [*] | crear postulación ordinaria | Alta ordinaria válida | Usar default VIGENTE | VIGENTE | No ejecutar si falla la guarda; [Postulacion (L159)](../../../../../apps/postulantes/models.py) |
| T02 | [*] | crear histórica | Administración; registro HISTORICO | Asignar CERRADA al crear | CERRADA | No ejecutar si falla la guarda; [PostulacionService.crear_postulacion_historica (L129)](../../../../../apps/postulantes/services.py) |
| T03 | VIGENTE | dar_de_baja (servicio) | Objeto válido, motivo, responsable y fecha válidos | Guardar baja y auditoría | DADA_DE_BAJA | No ejecutar si falla la guarda; [PostulacionService.dar_de_baja (L187)](../../../../../apps/postulantes/services.py) |
| T04 | CERRADA | dar_de_baja (servicio) | Mismas validaciones; servicio solo excluye ya DADA_DE_BAJA | Guardar baja y auditoría | DADA_DE_BAJA | No ejecutar si falla la guarda; [PostulacionService.dar_de_baja (L187)](../../../../../apps/postulantes/services.py) |
| T05 | CANCELADA | dar_de_baja (servicio) | Mismas validaciones; sin ruta pública confirmada | Guardar baja y auditoría | DADA_DE_BAJA | No ejecutar si falla la guarda; [PostulacionService.dar_de_baja (L187)](../../../../../apps/postulantes/services.py) |

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/postulantes/tests.py](../../../../../apps/postulantes/tests.py).
- [apps/postulantes/tests_security_contract.py](../../../../../apps/postulantes/tests_security_contract.py).
- [apps/postulantes/tests_us007.py](../../../../../apps/postulantes/tests_us007.py).
- [apps/usuarios/tests_role_authority.py](../../../../../apps/usuarios/tests_role_authority.py).
