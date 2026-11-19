# Identificadores y registro maestro

Estado: PROPUESTA adoptada para documentación, sin cambiar identificadores del producto.

Formato TIPO-AMBITO-NNN; secuencia independiente por tipo/ámbito. Ámbitos: CORE, USR, ACA, POS, DOC, MOD, NOT, REP, SEG, WEB, PG, TG, TD, EG, EA, DIP y SYS. Discrepancias: DISC-NNN.

| Prefijo | Elemento | Registro canónico |
| --- | --- | --- |
| FUN | Funcionalidad observada | [Catálogo funcional](../03-casos-de-uso/catalogo-funcionalidades.md) |
| UC | Caso de uso candidato/especificado | Mismo catálogo; candidatos en fase 2 |
| RN | Regla académica o restricción técnica observada | [Matriz](matriz.md) |
| CMP | Componente lógico | [Módulos](../01-arquitectura/catalogo-modulos.md) y paquetes por modalidad |
| ENT | Entidad persistente | [Entidades](../04-dominio-y-datos/catalogo-entidades.md) |
| DIA | Vista planificada o generada | [Registro de diagramas](../diagramas/README.md) |
| DISC | Discrepancia | [Registro](../00-alcance-y-evidencia/discrepancias.md) |

## Mantenimiento

Un ID identifica un elemento, aunque se cite varias veces. Conservarlo al mover o renombrar. No reutilizar retirados: registrar motivo y sucesor. No regenerar IDs de entidades por orden alfabético; nuevas entradas usan siguiente número libre.

Conceptos comunes conservan ID; reglas distintas reciben ámbito de modalidad. Referenciar ruta y símbolo cualificado; líneas auxiliares. UC reservado no implica especificación terminada; DIA reservado no implica diagrama creado.

La matriz contiene la primera relación FUN/UC/RN/implementación/pruebas. ENT/CMP/DIA se ampliarán al modelar. Registrar vacíos sin inventar relaciones. No insertar IDs en código fuente en esta fase.

## Actualización de fase 4

Fase 4: ACT identifica actores funcionales en el [registro canónico](../02-actores-permisos/actores-fase-4.md); UC/FUN mantienen los 23 IDs y amplían a 72. RN de la serie 100+ registra 72 reglas observadas sin reutilizar los RN iniciales. DIA de fase 4 se registra en [su índice](../diagramas/registro-fase-4.md).

## Actualización de fase 4

Fase 4: ACT identifica actores funcionales en el [registro canónico](../02-actores-permisos/actores-fase-4.md); UC/FUN mantienen los 23 IDs y amplían a 75. RN de la serie 100+ registra 75 reglas observadas sin reutilizar los RN iniciales. DIA de fase 4 se registra en [su índice](../diagramas/registro-fase-4.md).

## Registro dinámico de fase 5

PROC identifica familias en el [inventario](../05-procesos-y-estados/analisis-fase-5.md). Nuevos DIA en el [registro dinámico](../diagramas/registro-fase-5.md): serie 060 para actividades, 070 para secuencias y 080 para estados, por ámbito; las tres reservas SYS se materializan en su tipo correspondiente. Cada Txx es local a su diagrama, con clave global DIA/Tx en el registro JSON. No se renumeran los 75 UC, sus FUN ni las reglas anteriores.
