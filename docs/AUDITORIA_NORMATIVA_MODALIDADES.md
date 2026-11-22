# Auditoría: reglamentos de graduación frente al backend

**Fecha:** 22/11/2026
**Alcance:** las seis modalidades. Se comparó cada reglamento de `normativa_*` con su política en `apps/modalidades/`. Solo lectura: no se modificó código.
**Destinatario:** equipo de backend.

> Este documento señala diferencias entre la norma y el sistema. No decide cómo resolverlas: varias dependen de una decisión institucional, como ya advierte `docs/CONTRATO_FUNCIONAL_PROYECTO_GRADO.md` (§2.3).

## 1. Resumen

| Modalidad | Estado general | Hallazgos principales |
|---|---|---|
| Trabajo Dirigido | Completo | Sin hallazgos de peso. |
| Excelencia Académica | Completo | Criterios a)–d) del Art. 2 se verifican manualmente (aceptable). |
| Graduación vía Diplomado | Casi completo | Falta la vigencia de 8 meses para la defensa. |
| Examen de Grado | Parcial | Faltan requisitos del acto (Art. 17) y la variante Seminario de Grado. |
| Tesis de Grado | Parcial | Faltan fólder amarillo, requisitos de defensa (Art. 22) y cierre documental. |
| Proyecto de Grado | Parcial | Requisitos del Art. 32 se exigen en el cierre, no antes de las defensas; sin límite de intentos. |

**Patrón:** las dos modalidades protegidas por `AGENTS.md` (Proyecto de Grado y Tesis) son las que más se apartan de su reglamento, sobre todo en los requisitos previos a la defensa. Ninguna modalidad controla plazos en días salvo Trabajo Dirigido y Examen de Grado.

## 2. Prioridades sugeridas

1. **Requisitos previos a la defensa en Proyecto de Grado y Tesis.** Es el punto de mayor impacto: hoy un postulante puede defender sin acreditar solvencias, admisión ni timbre.
2. **Límite de intentos en Proyecto de Grado**, alineado con Tesis y Trabajo Dirigido, que ya lo tienen.
3. **Fólder amarillo en Tesis** (requisito de inscripción).
4. **Requisitos del acto en Examen de Grado.**
5. **Vigencia de 8 meses en Diplomado.**
6. **Seminario de Grado** (variante de Examen de Grado): requiere definir alcance antes de implementarse.
7. **Plazos en días** (todas las modalidades): requiere decisión institucional sobre si el sistema debe bloquear o solo advertir.

Los puntos 1 y 2 tocan Proyecto de Grado y Tesis: según `AGENTS.md` necesitan diagnóstico previo, autorización expresa y regresión completa de ambas modalidades.

## 3. Detalle por modalidad

### 3.1 Proyecto de Grado
Reglamento: `normativa_proyecto_de_grado/reglamento_proyecto_grado_2013.doc`. Política: `apps/modalidades/proyecto_grado.py`.

**Coincide**
- Requisitos de inscripción: carta, matrícula, historial y fólder amarillo (Art. 11).
- Tribunal de tres docentes; Presidente, Secretario y tribunales deben ser personas distintas (Art. 27).
- Quórum privada: 2 tribunales + docente de modalidad; pública: 2 tribunales + Presidente + Secretario (Arts. 33–34).
- Privada Suficiente/Insuficiente con 30 %; pública con 70 %; nota final por suma (Arts. 42–49).
- Escala: hasta 50 postergado, 51–74 aprobado, 75–89 aprobación plena, 90–100 con felicitación (Arts. 50–51).
- Informe del tribunal antes de la privada; acta y hoja de aprobación al final (Arts. 29 y 54).

**No coincide o falta**
| # | Reglamento | Sistema | Dónde |
|---|---|---|---|
| PG-1 | Art. 32: oficio, historial del plan, informe del tutor, admisión, solvencias, matrícula y timbre son requisitos **de la organización y las defensas**. | Se exigen como condiciones, entregas y documentos del **cierre documental**, después de la defensa pública. | `proyecto_grado.py:436-444` (`ProyectoGradoRequisitosPolicy`) |
| PG-2 | Art. 20: segundo perfil insuficiente obliga a reinscribirse. Art. 52: segunda postergación equivale a reprobado. | No hay límite de intentos (Tesis, Trabajo Dirigido, Examen y Diplomado sí lo tienen). | No existe `validar_nuevo_intento` en la política |
| PG-3 | Plazos: 5 días hábiles (Art. 19), 10 días calendario (Arts. 29–31), 2 semanas (Art. 45), 2 gestiones (Arts. 24 y 55). | No se controlan; solo existe la condición manual `PLAZO_MAXIMO`. | — |
| PG-4 | Art. 25: seis ejemplares. | Cantidad no fijada (el contrato la deja pendiente por una norma que dice cuatro). | — |
| PG-5 | El reglamento no establece anticipación para la defensa pública. | El sistema exige 48 horas. Es decisión del sistema; conviene documentar su fuente. | `MINIMUM_NOTICE_HOURS` |

### 3.2 Tesis de Grado
Reglamento: `normativa_tesis_de_grado/4TESISDEGRADO.doc`. Política: `apps/modalidades/tesis_grado.py`.

**Coincide:** etapas (temática → tutor → perfil → documento final → revisión de tutor → revisión de tribunal → privada → pública); quórum; 30/70; escala; límite de dos intentos para perfil y pública (Arts. 11–12 y 42). La contradicción del Art. 42 (61 frente a 51) está documentada en el resultado y se aplica 51.

**No coincide o falta**
| # | Reglamento | Sistema | Dónde |
|---|---|---|---|
| TG-1 | Art. 4.4: fólder amarillo en la inscripción. | No se exige (no hay entrega física de inscripción). | `TesisGradoRequisitosPolicy`, `tesis_grado.py:420` |
| TG-2 | Art. 22: oficio, historial del plan, informe del tutor, admisión, solvencias, matrícula y timbre para la defensa. | No se exigen en ninguna etapa. | `DOCUMENTS_BY_STAGE`, `tesis_grado.py:427` |
| TG-3 | Arts. 14 y 54-equivalentes: acta, hoja de aprobación, ejemplares y respaldo. | No hay cierre documental (solo conclusión académica). | — |
| TG-4 | Plazos: 15 días del informe del tutor (Art. 17), 10 días (Arts. 19–21), 2 gestiones (Art. 14). | No se controlan. | — |

### 3.3 Trabajo Dirigido
Reglamento: `normativa_trabajo_dirigido/5TRABAJODIRIGIDO.doc`. Política: `apps/modalidades/trabajo_dirigido.py`.

**Coincide:** inscripción con fólder amarillo; convenio institucional (Art. 16); informes de supervisión; requisitos del Art. 30, incluida la carta de conformidad de la institución, exigidos en la etapa de Defensa Pública (`trabajo_dirigido.py:158-171`); plazo de 5 días hábiles para el nuevo perfil; límite de intentos de perfil, privada y pública (`trabajo_dirigido.py:1431-1442`); 30/70 y escala.

**Observación menor:** el Art. 30 enumera los requisitos como "de organización y defensa"; el sistema los exige antes de la pública y no antes de la privada. Conviene confirmar el momento con la carrera.

### 3.4 Excelencia Académica
Reglamento: `noramativa_exelencia_academica/6EXCELENCIAACADEMICA.doc`. Política: `apps/modalidades/excelencia_academica.py` y `excelencia_academica_service.py`.

**Coincide:** dos criterios (rendimiento y reconocimiento a la calidad); promedio general ≥ 80 validado (`excelencia_academica_service.py:90`); certificaciones para calidad; requisitos del Art. 5 (admisión, solvencias, timbre); tribunal con Presidente, Secretario, dos docentes y Director del Instituto de Investigación (Art. 6).

**Observación:** los criterios del Art. 2.1 a)–d) (no reprobar, primera instancia con ≥ 70, no abandonar, tiempo del plan) se verifican manualmente por el tribunal. Es razonable mientras no exista integración con el sistema académico.

### 3.5 Graduación vía Diplomado
Reglamento: `normativa_via_diplomado/REGLAM VIA DIPLOMADO 2026.docx`. Política: `apps/modalidades/diplomado.py`.

**Coincide:** cuatro módulos más Taller de Investigación con monografía (Art. 9.5); requisitos de inscripción y de defensa (Art. 18, incluido el timbre; `diplomado.py:38-51`); aprobación con nota mayor a 65 y segunda oportunidad (Arts. 26–27).

**No coincide o falta**
| # | Reglamento | Sistema |
|---|---|---|
| DI-1 | Art. 17: vigencia de 8 meses desde el último módulo para la defensa final. | No se controla. |
| DI-2 | Art. 19: publicación de la defensa 48 horas antes. | No verificado en esta revisión. |

### 3.6 Examen de Grado
Reglamentos: `normativa_examen_de_grrado/2EXAMENDEGRADO Examen de Contenidos.doc` y `... Seminario de Grado.doc`. Política: `apps/modalidades/examen_grado.py` y `examen_grado_service.py`.

**Coincide:** cuatro áreas en orden (Art. 23); ponderación 15/15/30/40 (Art. 25); nota mínima 61 por área; segundo examen dentro de 15 días y, si vuelve a fallar, cambio de modalidad (Art. 24); tribunal de tres docentes con Presidente y Secretario.

**No coincide o falta**
| # | Reglamento | Sistema | Dónde |
|---|---|---|---|
| EG-1 | Art. 17: historial del plan, admisión, solvencias, matrícula y timbre para el acto. | No se exigen. | `DOCUMENTS_BY_STAGE`, `examen_grado.py:39` |
| EG-2 | Art. 15: Examen de Grado a través de Seminario, con reglamento propio. | No implementado. | — |

## 4. Fuera de alcance y límites de esta revisión

- No se revisó el reglamento general (`reglamento_general_modalidades_uabjb.doc`) artículo por artículo; solo se usó como referencia del contrato funcional.
- No se verificó el contenido interno de los documentos (perfil, documento final), que el sistema controla manualmente.
- No se probaron los flujos en ejecución: la comparación es entre texto del reglamento y código.
- Los textos de los `.doc` se extrajeron con `antiword`; algunas tablas pueden haber perdido formato.
