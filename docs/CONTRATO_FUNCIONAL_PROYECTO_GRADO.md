# Contrato funcional de Proyecto de Grado

**Versión:** Sprint 0.5  
**Estado:** propuesta para validación institucional  
**Alcance:** especificación funcional; no modifica ni sustituye la normativa institucional

## 1. Resumen ejecutivo

Este documento consolida el procedimiento institucional de Proyecto de Grado y lo contrasta con el backend existente. Su finalidad es servir como contrato común para análisis, backend, frontend, pruebas y validación universitaria.

El sistema actual cubre la estructura técnica principal: postulación, flujo secuencial, asignaciones temporales, documentos versionados, observaciones, defensas, quórum, evaluaciones, condiciones, entregas y cierre. No acredita por sí mismo actos institucionales que todavía no están modelados, entre ellos la aprobación formal y originalidad del tema, el dictamen del Consejo Científico, los memorandos de designación, los plazos reglamentarios automáticos y las cartas de conformidad exigidas por el flujo operativo.

Existen contradicciones que este contrato no resuelve: cuatro o seis ejemplares, ponderación privada del 30 % sin nota numérica, tabla final de clasificación, máximo de dos o tres estudiantes, y ciertos detalles sobre composición, designación e intentos. Hasta que la Universidad decida, deben mostrarse como pendientes y no como cumplimiento oficial.

El Sprint 1 puede construir de forma segura un expediente de consulta basado en hechos ya registrados. No debe introducir actos administrativos ni conclusiones normativas inexistentes.

## 2. Fuentes, referencias y criterio de lectura

### 2.1 Fuentes exclusivas

| Código | Fuente | Función en este contrato |
|---|---|---|
| **RE-PG** | `normativa/reglamento_proyecto_grado_2013.doc` | Reglamento específico de Proyecto de Grado. Se citan sus capítulos II a VII. |
| **RG-MG** | `normativa/reglamento_general_modalidades_uabjb.doc` | Reglamento general de modalidades de graduación. Aporta principios comunes, órganos, responsabilidades y etapas generales. |
| **DF-MG** | `normativa/diagrama_flujo_modalidad_graduacion.pdf` | Representación operativa por actores, documentos, decisiones y ciclos de corrección. |
| **SA** | Sistema actual | Modelos, políticas, servicios, serializers, permisos y endpoints vigentes del backend. |

Las referencias entre corchetes identifican la fuente y, cuando es posible, el capítulo o bloque funcional. Ejemplo: **[RE-PG, cap. III]**. No se asignan números de artículo cuando la extracción disponible no permite garantizarlos sin riesgo de cita incorrecta.

### 2.2 Jerarquía normativa adoptada

1. **Documento específico:** RE-PG regula directamente Proyecto de Grado.
2. **Documento general:** RG-MG regula las modalidades de graduación de manera transversal.
3. **Diagrama operativo:** DF-MG detalla secuencias, derivaciones, documentos y responsables; complementa, pero no reemplaza, una disposición expresa.
4. **Regla de aplicación:** cuando RE-PG y RG-MG regulan el mismo punto sin contradicción, se leen conjuntamente. Cuando contradicen, se adopta provisionalmente la regla específica solo para delimitar desarrollo, sin declarar resuelta la cuestión institucional.
5. **Ausencia o contradicción:** ninguna regla se completa por analogía ni por conveniencia técnica. Se registra como pendiente.
6. **Sistema actual:** una validación técnica existente se documenta como decisión del sistema y no se eleva a acto normativo.

### 2.3 Asuntos pendientes de decisión institucional

Permanecen pendientes las cantidades de ejemplares, la forma de obtener el 30 % privado, la clasificación final oficial, el máximo de integrantes, los límites generales de reintentos, las consecuencias automáticas de vencimientos y el procedimiento completo de cambio de tema o modalidad.

## 3. Conceptos y separación de responsabilidades

- **Rol funcional:** conjunto estable de capacidades en el sistema, por ejemplo estudiante, personal o administrador.
- **Cargo institucional:** autoridad desempeñada dentro de la Universidad, por ejemplo Decano, Director o Jefe de Carrera. No debe inferirse únicamente del texto de un rol.
- **Participación temporal:** intervención de una persona en una postulación concreta, por ejemplo Tutor, Tribunal, Presidente, Secretario o Docente de Modalidad. En el backend corresponde a `AsignacionPostulacion`.
- **Evidencia:** registro o documento que demuestra una actuación. Registrar una acción técnica no reemplaza carta, acta, informe, memorando o firma cuando la normativa los exige.
- **Validación manual:** decisión humana registrada por un actor autorizado.
- **Validación automática:** regla que el sistema puede demostrar a partir de datos confiables. No debe declararse automática si depende de documentos externos no integrados.

## 4. Matriz de actores institucionales

| Actor | Responsabilidad y acciones permitidas | Evidencias que genera | Etapas | Correspondencia actual |
|---|---|---|---|---|
| Estudiante | Elegir modalidad; presentar requisitos, perfil y trabajo; subsanar observaciones; defender; realizar entregas. [RE-PG, caps. II–VII; RG-MG; DF-MG] | Cartas, perfil, documento final, respaldos, solicitudes y correcciones | Todas como interesado | `CustomUser` asociado a `Postulacion.estudiante`; acceso a recursos propios. No es una asignación temporal. |
| Tutor | Orientar perfil y proyecto; emitir conformidad e informe final. [RE-PG, caps. III–IV; DF-MG] | Informes y cartas de conformidad | Perfil, desarrollo, documento final, correcciones | `AsignacionPostulacion(TUTOR)`. El sistema conserva asignación e historial, pero no formaliza firma ni acto de designación. |
| Docente de modalidad | Registrar y hacer seguimiento; recibir documentación; solicitar revisiones; participar como Secretario en defensa privada según RE-PG. [RE-PG, caps. III y VI; RG-MG; DF-MG] | Informe, kardex o seguimiento, cartas de remisión | Inscripción a defensa privada | `AsignacionPostulacion(DOCENTE_MODALIDAD)` y usuario. No existe kardex institucional autónomo. |
| Tribunal | Revisar perfil y documento; observar; evaluar; emitir suficiencia o conformidad. [RE-PG, caps. III, V–VII] | Informes, observaciones, cartas, evaluaciones y firmas | Perfil, revisión, defensas | `AsignacionPostulacion(TRIBUNAL)`, `ParticipanteEvento`, `EvaluacionDefensa`. |
| Presidente | Presidir defensa pública; intervenir con voz según composición reglamentaria. [RE-PG, caps. V–VI] | Participación y firma en acta | Defensa pública | `AsignacionPostulacion(PRESIDENTE)` y participante. No demuestra por sí solo el cargo de Decano o delegado. |
| Secretario | Verificar/registrar acto, leer resultados y dejar constancia de modificaciones. [RE-PG, caps. VI–VII] | Acta, registro de modificaciones, hoja de aprobación | Defensas y cierre | `AsignacionPostulacion(SECRETARIO)` y participante. El backend no gestiona firma ni lectura protocolar. |
| Jefatura de Carrera | Sugerir tribunal, coordinar actores y sustituir justificadamente al Secretario según el caso. [RE-PG, caps. III, V–VI; RG-MG] | Propuesta de tribunal, informes o derivaciones | Designaciones y defensas | No existe cargo/asignación específica. Puede actuar como usuario autorizado, pero el acto institucional no queda tipificado. |
| Dirección de Carrera | Recibir solicitudes, derivar, designar o tramitar designaciones y programar defensas. [RE-PG, caps. II–VI; DF-MG] | Providencias, memorandos, programación | Ingreso, designaciones y defensas | Personal con permisos puede operar endpoints; no existe cargo `DIRECCION` ni cadena formal de aprobación. |
| IIISyP o unidad equivalente | Registrar temas, controlar duplicidad/originalidad y revisar pertinencia/suficiencia. [RG-MG; DF-MG] | Registro de tema, dictamen o acta de revisión | Registro del tema y revisión previa | No existe modelo, servicio ni endpoint específico. |
| Consejo Científico | Considerar pertinencia, sugerir tribunal y emitir actas de suficiencia conforme al diagrama. [DF-MG] | Acta de sesión o dictamen | Tema, perfil y revisión previa | No está representado como órgano ni como acto colegiado. |
| Decanato | Designar tribunal o emitir memorandos; presidir o delegar la presidencia. [RE-PG, caps. V–VI; RG-MG; DF-MG] | Resolución/memorando, delegación | Designación y defensa pública | No existe cargo o acto formal específico; `PRESIDENTE` solo expresa participación temporal. |
| Personal administrativo | Recibir, verificar, registrar, programar y custodiar evidencias dentro de sus competencias. | Registros de verificación, recepción y auditoría | Transversal | Usuarios `is_staff`/`is_superuser` y permisos DRF actuales. Es una capacidad técnica amplia, no prueba un cargo institucional. |

**Inferencia explícita:** cuando el sistema permite actuar a `is_staff`, ello se interpreta únicamente como autorización técnica vigente. No demuestra que la persona ocupe el cargo institucional competente.

### 4.1 Correspondencia técnica de identidad y autorización vigente

| Concepto actual | Alcance real | Correspondencia funcional y límite |
|---|---|---|
| `CustomUser` | Identidad autenticada | Puede representar a cualquier actor, pero por sí sola no acredita cargo ni participación. |
| `Role` con códigos de estudiante (`EST`, `ESTUDIANTE`) | Clasificación funcional y capacidades de estudiante | Corresponde al estudiante. La lectura se limita a recursos propios por los querysets/permisos aplicables. |
| `Role` con códigos docentes (`DOC`, `DOCENTE`) | Clasificación funcional docente | Puede corresponder a Tutor, Tribunal o Docente de Modalidad solo cuando además existe asignación activa en esa postulación. El texto del rol no autoriza escrituras por sí solo. |
| `Role` con códigos administrativos (`ADM`, `ADMIN`, `ADMINISTRACION`, `ADMINISTRADOR`) | Clasificación funcional administrativa | No reemplaza `is_staff`, permisos DRF ni cargo de Dirección, Jefatura o Decanato. |
| `is_staff` / `is_superuser` | Autoridad administrativa técnica usada por los endpoints actuales | Habilita operaciones de gestión. Es más amplia que los cargos normativos y exige futura especialización si la Universidad separa competencias. |
| `AsignacionPostulacion` | Participación temporal e histórica | Códigos vigentes: `TUTOR`, `TRIBUNAL`, `DOCENTE_MODALIDAD`, `PRESIDENTE`, `SECRETARIO`; puede vincularse a una etapa y finalizarse/reemplazarse. |
| `ParticipanteEvento` | Convocatoria y presencia en una defensa concreta | Deriva de una asignación activa y registra rol, convocatoria, asistencia y observaciones. No constituye memorando de designación. |
| Permisos DRF y servicios | Barrera efectiva de lectura/escritura | Son la autorización contractual del API. Las etiquetas del frontend y el nombre de un rol no agregan capacidades. |

## 5. Diagrama textual del flujo funcional

```text
Elección de modalidad
  -> verificación de requisitos de ingreso
  -> registro de tema
  -> revisión de originalidad y pertinencia
       -> observado: corregir y volver a revisión
       -> conforme: designar/aceptar Tutor
  -> elaborar perfil
  -> designar tribunal de perfil
  -> defensa de perfil
       -> insuficiente: corregir y reintentar dentro del régimen aplicable
       -> suficiente: desarrollar proyecto
  -> presentar documento final e informe del Tutor
  -> revisión institucional y del Tribunal
       -> observado: versionar, corregir y volver a revisión
       -> conforme: reunir cartas/evidencias de conformidad
  -> defensa privada
       -> insuficiente: corregir y solicitar nueva fecha
       -> suficiente: ejecutar correcciones y completar requisitos públicos
  -> defensa pública
       -> postergado: aplicar oportunidad reglamentaria pendiente de precisión
       -> aprobado: incorporar correcciones finales
  -> entregar acta, hoja de aprobación, ejemplares y respaldo digital
  -> aprobar revisión final
  -> aprobar cierre documental
  -> concluir postulación
```

## 6. Matriz de etapas del flujo oficial propuesto

Los estados indicados son funcionales. Los plazos o límites contradictorios se registran como reglas pendientes y no se convierten en automatismos.

| # / etapa | Objetivo y entrada | Responsable / acciones / evidencias | Resultados, salida y siguiente etapa | Corrección, reintento y regla pendiente |
|---|---|---|---|---|
| 1. Elección de modalidad | Formalizar la opción; estudiante habilitado | Estudiante comunica elección; carta o formulario. [RG-MG; DF-MG] | `REGISTRADA` o `OBSERVADA`; pasa a requisitos | Corregible. Exclusividad entre modalidades requiere control formal. |
| 2. Requisitos de ingreso | Demostrar matrícula y condiciones académicas/documentales | Estudiante presenta; administración verifica carta, matrícula, historial y carpeta. [RE-PG, cap. II] | `CUMPLE`/`NO_CUMPLE`; pasa a tema | Subsanable. Integración automática con historial no existe. |
| 3. Registro del tema | Identificar problema, título, alcance y objetivos | Estudiante presenta ficha; Dirección deriva; unidad registra. [DF-MG] | `REGISTRADO`/`OBSERVADO`; pasa a originalidad | Versionable. Modelo de tema no existe. |
| 4. Originalidad y pertinencia | Evitar duplicidad y validar relevancia/suficiencia | IIISyP/Consejo revisa registro e inventario; emite dictamen. [RG-MG; DF-MG] | `CONFORME`/`OBSERVADO`; pasa a Tutor | Corrección permitida; técnica y umbral de originalidad no definidos. |
| 5. Tutor | Formalizar acompañamiento académico | Dirección designa o tramita; Tutor acepta; memorando/carta. [RE-PG, cap. III; DF-MG] | `ACTIVO`; pasa a perfil | Reemplazo con trazabilidad. Orden exacto de designación pendiente. |
| 6. Elaboración del perfil | Producir perfil con contenido reglamentario | Estudiante y Tutor; perfil e informe/conformidad. [RE-PG, cap. III] | `PRESENTADO`/`OBSERVADO`; pasa a tribunal | Versiones y correcciones permitidas. Contenido se controla manualmente. |
| 7. Tribunal de perfil | Constituir órgano evaluador | Jefatura propone; autoridad designa; memorandos. [RE-PG, caps. III y V; DF-MG] | `DESIGNADO`; pasa a defensa | Reemplazo justificado. Composición formal debe distinguirse del quórum. |
| 8. Defensa del perfil | Determinar suficiencia | Tribunal evalúa cualitativamente; acta de perfil. [RE-PG, cap. III] | `SUFICIENTE` -> desarrollo; `INSUFICIENTE` -> corrección | Primera insuficiencia: cinco días hábiles según RE-PG; máximo efectivo requiere validación. |
| 9. Correcciones del perfil | Subsanar observaciones | Estudiante corrige; Tutor acompaña; nueva versión e informe | `CORREGIDO` o `INSUFICIENTE`; vuelve a defensa | RE-PG dispone reinscripción tras segunda insuficiencia; backend no limita intentos. |
| 10. Desarrollo del proyecto | Elaborar trabajo final aprobado | Estudiante desarrolla; Tutor guía; avances y documento. [RE-PG, cap. IV] | `CONCLUIDO`; pasa a presentación final | Máximo de dos gestiones académicas; cálculo y consecuencias no automatizados. |
| 11. Documento final | Presentar trabajo y respaldo conforme a formato | Estudiante presenta documento, soporte y copias; Tutor entrega informe final. [RE-PG, cap. IV; DF-MG] | `PRESENTADO`/`OBSERVADO`; pasa a revisión | Versionable. Cuatro o seis copias permanece pendiente. |
| 12. Revisión por Tutor y Tribunal | Determinar suficiencia del trabajo | Tutor, unidad/Consejo y Tribunal revisan; informes, observaciones y versiones. [RE-PG, caps. IV–V; DF-MG] | `CONFORME`/`OBSERVADO`; pasa a conformidades | Plazos de diez días calendario y cinco días hábiles no están automatizados. |
| 13. Cartas de conformidad | Reunir autorización documental para defensa | Tribunal/Tutor emiten cartas; estudiante presenta. [DF-MG] | `COMPLETAS`; pasa a privada | DF-MG muestra tres cartas; no existe regla inequívoca en backend. |
| 14. Defensa privada | Evaluar suficiencia previa | Tribunal y Docente de Modalidad; quórum, evaluación y acta. [RE-PG, caps. VI–VII] | `SUFICIENTE`/`INSUFICIENTE`; pasa a correcciones o reintento | RE-PG establece hasta dos semanas para corregir; número total de intentos pendiente. |
| 15. Correcciones posteriores | Incorporar observaciones privadas | Estudiante corrige; Tutor conforma; documento versionado | `CORREGIDO`; pasa a requisitos públicos | Repetible dentro del régimen aprobado. No hay temporizador actual. |
| 16. Requisitos para pública | Completar plan, admisión, solvencias, matrícula, timbre e informes | Estudiante presenta; administración valida. [RE-PG, cap. VI; RG-MG] | `CUMPLE`/`NO_CUMPLE`; pasa a pública | Subsanable; verificaciones actuales son manuales. |
| 17. Defensa pública | Evaluar públicamente y registrar resultado | Presidencia, Secretaría y Tribunal; convocatoria, asistencia, evaluación y acta. [RE-PG, caps. VI–VII; DF-MG] | `APROBADO`/`POSTERGADO`; pasa a corrección o nueva oportunidad | Programación mínima de 48 h proviene de DF-MG. Clasificación final y oportunidad requieren decisión. |
| 18. Correcciones finales | Incorporar modificaciones registradas en acta | Estudiante corrige; Tutor/Tribunal valida; versión final y hoja de aprobación. [RE-PG, cap. VII] | `APROBADA`; pasa a entregas | Correcciones documentales versionables. Firma y legalización son manuales. |
| 19. Entregas físicas/digitales | Custodiar producto final | Estudiante entrega; administración recibe ejemplares, CD/respaldo y demás requisitos. [RE-PG, caps. IV y VII; DF-MG] | `COMPLETA`/`INCOMPLETA`; pasa a cierre | Cantidad de ejemplares no debe fijarse hasta decisión institucional. |
| 20. Cierre académico/documental | Verificar integralidad y concluir expediente | Personal autorizado revisa condiciones, documentos, entregas y etapas; registra cierre | `CONCLUIDA` o `REABIERTA`; fin | Reapertura motivada es decisión técnica actual con auditoría. Trámite legal posterior no queda acreditado. |

## 7. Catálogo funcional de estados

Los códigos siguientes son propuesta de lenguaje común. No implican cambios de modelo.

### 7.1 Estado general de postulación

| Código estable propuesto | Nombre legible | Significado |
|---|---|---|
| `BORRADOR` | Borrador | Registro aún no presentado formalmente. |
| `EN_TRAMITE` | En trámite | Existe procedimiento activo. |
| `OBSERVADA` | Observada | Tiene subsanaciones pendientes que afectan continuidad. |
| `POSTERGADA` | Postergada | Resultado insuficiente que habilita el régimen de nueva oportunidad. |
| `APROBADA_ACADEMICAMENTE` | Aprobada académicamente | Defensa pública aprobada; aún puede faltar corrección o cierre. |
| `CONCLUIDA` | Concluida | Todas las etapas obligatorias y el cierre documental están aprobados. |
| `ANULADA` | Anulada | Terminación trazable distinta de eliminación física; procedimiento institucional pendiente. |

### 7.2 Estado de etapa

El backend ya usa `PENDIENTE`, `EN_PROCESO`, `OBSERVADA`, `APROBADA`, `RECHAZADA` y `OMITIDA`. Son estados técnicos adecuados para seguimiento, pero no nombres oficiales del reglamento. `OMITIDA` solo debe usarse si la etapa está configurada como opcional y existe autorización.

### 7.3 Estado documental

| Código propuesto | Nombre | Uso funcional |
|---|---|---|
| `PENDIENTE` | Pendiente | Evidencia requerida aún no presentada. |
| `PRESENTADO` | Presentado | Archivo recibido, sin dictamen. |
| `EN_REVISION` | En revisión | Bajo evaluación de actor competente. |
| `OBSERVADO` | Observado | Requiere nueva versión o subsanación. |
| `APROBADO` | Aprobado | Evidencia aceptada para el fin correspondiente. |
| `RECHAZADO` | Rechazado | No válido para continuar. |
| `ARCHIVADO` | Archivado | Conservado sin ser versión operativa vigente. |

Los catálogos actuales `EstadoDocumento` y `TipoDocumento` son configurables. La equivalencia exacta debe validarse contra sus códigos activos, especialmente `APR`, utilizado por la política de cierre.

### 7.4 Estado de defensa

Estados técnicos actuales: `PROGRAMADA`, `EN_CURSO`, `FINALIZADA`, `SUSPENDIDA`, `CANCELADA`. La reprogramación es una acción que devuelve el evento a `PROGRAMADA`, no un resultado académico.

### 7.5 Estado de evaluación

- Perfil y privada: `SUFICIENTE` o `INSUFICIENTE`.
- Pública: nota numérica de 1 a 100 y resultado consolidado `APROBADO` o `POSTERGADO` en el backend.
- Clasificaciones `APROBACION_PLENA` y `APROBACION_PLENA_CON_FELICITACION` existen técnicamente, pero no deben presentarse como clasificación oficial hasta resolver los rangos contradictorios.

### 7.6 Estado de cierre

| Código funcional | Significado |
|---|---|
| `PENDIENTE_REVISION_FINAL` | Faltan correcciones o evidencias posteriores a defensa pública. |
| `REVISION_FINAL_APROBADA` | Correcciones y evidencias de revisión final aceptadas. |
| `PENDIENTE_CIERRE_DOCUMENTAL` | Faltan condiciones, documentos o entregas. |
| `CIERRE_DOCUMENTAL_APROBADO` | Expediente documental completo según controles configurados. |
| `CONCLUIDO` | Estado general actualizado después de aprobar todas las etapas. |
| `REABIERTO` | Cierre reabierto con motivo y auditoría. Decisión técnica actual. |

## 8. Matriz de documentos y evidencias

`Obligatorio` refleja la normativa o el flujo, no necesariamente la configuración actual. “Firma” indica evidencia formal, aunque el backend no implemente firma digital.

| Etapa / documento | Tipo y obligatoriedad | Presenta / valida / momento | Versiones / firma / cantidad | Condición para continuar | Soporte actual |
|---|---|---|---|---|---|
| Elección: carta o formulario de modalidad | Administrativo; obligatorio [RG-MG; DF-MG] | Estudiante / Docente-Dirección / inicio | No definida / sí / 1 | Elección registrada | Parcial: documento configurable; no acto específico. |
| Ingreso: matrícula vigente | Académico; obligatorio [RE-PG, cap. II] | Estudiante / administración / inscripción | Renovable / no indicada / copia | `MATRICULA_VIGENTE=CUMPLE` | Parcial: condición manual. |
| Ingreso: historial académico | Académico; obligatorio [RE-PG, caps. II y VI] | Estudiante / administración / ingreso y pública | Actualizable / validación institucional / 1 | Prerrequisitos y plan verificados | Parcial: `PLAN_ESTUDIOS`; sin integración académica. |
| Ingreso: carta a Dirección | Administrativo; obligatorio [RE-PG, caps. II–III] | Estudiante / Dirección / inscripción | Corregible / sí / 1 | Solicitud admitida | No tipificado de forma inequívoca. |
| Tema: ficha de problema, título, alcance y objetivos | Académico; obligatorio según DF-MG | Estudiante / IIISyP-Consejo / registro | Sí / validación / 1 | Tema conforme | No cubierto estructuralmente. |
| Tema: dictamen de originalidad y pertinencia | Acta/dictamen; obligatorio en DF-MG | IIISyP-Consejo / autoridad / antes de perfil | Puede reiterarse / sí / 1 | Tema aceptado | No cubierto. |
| Designación de Tutor | Memorando/designación; obligatorio | Dirección/Decanato según procedimiento / destinatario / antes del trabajo tutorizado | Reemplazable / sí / por designación | Tutor activo | Parcial: asignación, sin memorando. |
| Perfil de proyecto | Académico; obligatorio [RE-PG, cap. III] | Estudiante / Tutor, docente y Tribunal / perfil | Sí / firmas de estudiante y Tutor / copias no fijadas | Perfil defendible | Parcial: documento/versiones, sin control de contenido. |
| Informe o conformidad de Tutor sobre perfil | Informe; obligatorio en el procedimiento | Tutor / Docente-Dirección / antes de defensa de perfil | Sí / sí / 1 | Perfil remitido | Parcial: tipo configurable. |
| Designación de Tribunal | Memorandos; obligatorio [RE-PG, caps. III y V; DF-MG] | Autoridad / miembros / antes de revisión/defensa | Por reemplazo / sí / uno por destinatario | Tribunal formalmente constituido | Parcial: asignaciones, sin acto formal. |
| Acta de defensa de perfil | Acta; obligatoria [DF-MG] | Secretario/docente / autoridad / al finalizar | No; corrección formal / sí / 1 | Resultado registrado | Parcial: `ACTA_DEFENSA` no distingue tipo salvo vínculo al evento. |
| Documento final/borrador | Académico; obligatorio [RE-PG, cap. IV] | Estudiante / Tutor, unidad y Tribunal / revisión | Sí / firma en versión final / 4 o 6 pendiente | Documento conforme | Cubierto parcialmente por documentos/versiones. |
| Informe final de Tutor | Informe; obligatorio [RE-PG, caps. IV y VI] | Tutor / Dirección / presentación final | Puede corregirse / sí / 1 | Habilita revisión/defensa | Cubierto como `INFORME_FINAL_TUTOR` si el tipo está configurado. |
| Acta de revisión de IIISyP/Consejo | Acta; obligatoria en DF-MG | Consejo/unidad / Dirección / revisión previa | Según nueva sesión / sí / 1 | Suficiencia previa | No tipificado; etapa técnica no equivale al acta. |
| Cartas de conformidad | Cartas; DF-MG muestra tres | Miembros del Tribunal / Dirección / antes de privada | Reemitibles / sí / tres según diagrama | Conformidades completas | No existe control de cantidad ni emisor individual. |
| Acta de defensa privada | Acta; obligatoria | Secretaría / autoridad / al finalizar | No / sí / 1 | Resultado y observaciones registrados | Parcial mediante `ACTA_DEFENSA` y evento. |
| Solvencia universitaria | Administrativo; obligatorio [RE-PG, cap. VI; RG-MG] | Estudiante / administración / antes de pública | Renovable / validación / 1 vigente | Condición cumplida | `SOLVENCIA_UNIVERSITARIA`, manual. |
| Solvencia de biblioteca | Administrativo; obligatorio [RE-PG, cap. VI; RG-MG] | Estudiante / administración / antes de pública | Renovable / validación / 1 vigente | Condición cumplida | `SOLVENCIA_BIBLIOTECA`, manual. |
| Certificado de admisión completa | Académico; obligatorio [RE-PG, cap. VI] | Estudiante/Unidad / administración / antes de pública | No indicada / validación / 1 | Condición cumplida | `ADMISION_COMPLETA`, manual. |
| Timbre de defensa pública | Físico/administrativo; obligatorio [RE-PG, cap. VI] | Estudiante / administración / antes de pública | No / no indicada / 1 | Entrega completa | `TIMBRE_UNIVERSITARIO`. |
| Invitación/convocatoria pública | Comunicación; DF-MG exige anticipación mínima de 48 h | Autoridad / comunidad / antes de pública | Reprogramable / autoridad / difusión | Defensa convocada | Parcial: regla de 48 h; no evidencia de publicación. |
| Acta de defensa pública | Acta; obligatoria [RE-PG, caps. VI–VII] | Secretario / Tribunal-autoridad / finalización | Corrección formal / firmas / 1 | Resultado registrado | Parcial: documento vinculado al evento y evaluación. |
| Hoja de aprobación | Académico-legal; obligatoria [RE-PG, cap. VII] | Secretaría/Tribunal / administración / postdefensa | No indicada / sí / 1 | Cierre habilitado | `HOJA_APROBACION` si está configurado y aprobado. |
| Revisión final post pública | Informe/conformidad; requerida técnicamente | Estudiante y revisores / personal autorizado / postdefensa | Sí / según evidencia / 1 vigente | Sin correcciones pendientes | `REVISION_FINAL_POST_PUBLICA`. Es formalización técnica actual. |
| Ejemplares empastados | Entrega física; obligatoria [RE-PG, cap. IV; DF-MG] | Estudiante / administración / cierre | No / recepción / **cantidad pendiente** | Entrega completa | `EJEMPLARES_IMPRESOS`; cantidad no calculada. |
| Respaldo digital/CD | Entrega digital/física; obligatoria [RE-PG, cap. IV; DF-MG] | Estudiante / administración / cierre | Versión final / no indicada / 1 o según formato | Entrega completa | `CD_RESPALDO`. |

## 9. Reglas de negocio

Clasificación: **A** confirmada por normativa; **B** confirmada por más de una fuente; **C** contradictoria; **D** no definida; **E** decisión técnica actual del sistema. Una regla puede combinar categorías cuando se separa la parte normativa de su implementación.

| Regla | Clase | Contrato funcional y fuente |
|---|---|---|
| Exclusividad de modalidad | A/B | La elección de modalidad es excluyente dentro del procedimiento. [RG-MG; DF-MG] La forma de impedir postulaciones activas simultáneas no está definida. |
| Requisitos académicos | B | Deben verificarse matrícula, prerrequisitos y, antes de defensa, plan aprobado salvo modalidad. [RE-PG, caps. II y VI; RG-MG] |
| Originalidad del tema | B | Debe registrarse y controlarse duplicidad/originalidad por la unidad competente. [RG-MG; DF-MG] Método y umbral: D. |
| Asignación de Tutor | A/B | Tutor designado para orientar y emitir informes. [RE-PG, caps. III–IV; DF-MG] Orden exacto: C/D. |
| Composición formal del Tribunal | A | RE-PG dispone tres docentes relacionados para el Tribunal y autoridades con voz en la composición de defensa. [RE-PG, caps. III y V] |
| Quórum privado | A/E | Normativa: dos miembros del Tribunal más Docente de Modalidad como Secretario. Backend aplica esa composición mínima. [RE-PG, cap. VI] |
| Quórum público | A/E | Normativa: dos miembros, Presidente y Secretario. Backend aplica esa composición mínima. [RE-PG, cap. VI] |
| Anticipación pública | B/E | DF-MG establece publicación/convocatoria con 48 h; backend impide programar con menor anticipación. La publicación misma no se acredita. |
| Plazo de corrección de perfil | A | Cinco días hábiles tras primera insuficiencia. [RE-PG, cap. III] No automatizado. |
| Plazos de revisión final | A | Informe del Tribunal hasta diez días calendario; correcciones hasta diez días y posterior informe hasta cinco días hábiles, según el supuesto. [RE-PG, cap. V] No automatizado. |
| Plazo de corrección privada | A | Hasta dos semanas. [RE-PG, cap. VII] No automatizado. |
| Plazo máximo general | A/E | Dos gestiones académicas para elaborar/defender. [RE-PG, caps. IV y VII] Backend registra `PLAZO_MAXIMO` mediante verificación manual. |
| Intentos de perfil | A/C | RE-PG describe segunda defensa y reinscripción tras segunda insuficiencia. El límite global y su coordinación con otros intentos requiere validación. |
| Intentos de privada/pública | A/D | Hay nueva oportunidad, pero no existe un régimen único y completo para todos los eventos. [RE-PG, cap. VII; RG-MG] |
| Reinscripción | A/D | Se exige en ciertos incumplimientos/insuficiencias, pero faltan transición, periodo y efectos sobre expediente. [RE-PG, caps. III y VII] |
| Cambio de tema | A/D | Aparece como consecuencia después de resultados adversos; procedimiento, conservación de evidencias y autorizaciones no definidos completamente. |
| Cambio de modalidad | A/D | Puede solicitarse al exceder plazo; procedimiento y efectos no definidos completamente. [RE-PG, cap. IV] |
| Evaluación del perfil | A/B/E | Exclusivamente `SUFICIENTE`/`INSUFICIENTE`; backend no admite nota ni ponderación. [RE-PG, caps. III y VII] |
| Evaluación privada | A/C/E | Normativa la define cualitativa y le atribuye 30 %. Backend conserva resultado cualitativo y no inventa nota/aporte. [RE-PG, cap. VII; RG-MG] |
| Evaluación pública | B/E | Numérica 1–100, ponderación 70 % y aprobación mínima 51; backend promedia evaluaciones y calcula aporte público. [RE-PG, cap. VII; RG-MG] |
| Modalidad de evaluación | A/E | Puede ser individual o por consenso; backend soporta ambas. [RE-PG, cap. VI] |
| Nota final | C/E | La suma 30/70 está declarada, pero falta base numérica privada. Backend devuelve `nota_final=null` y explica la limitación. |
| Clasificación final | C | Rangos y denominaciones de RE-PG y RG-MG difieren. No se adopta tabla oficial. |
| Correcciones finales | A/B | Las modificaciones sustantivas deben constar e incorporarse al documento final. [RE-PG, cap. VII; DF-MG] |
| Cierre | A/B/E | Requiere acta, hoja de aprobación, documento final y entregas. Backend añade control secuencial, ausencia de correcciones y auditoría. |
| Trabajo individual o grupal | C | RE-PG admite máximo dos; RG-MG contempla hasta tres. Backend representa un estudiante por postulación. |
| Reapertura del cierre | E | Backend permite reapertura motivada y auditada. No se identifica como acto normativo; requiere política institucional si se expone como trámite oficial. |
| Eventos virtuales o mixtos | E | Backend admite modalidades presencial, virtual y mixta. Las fuentes analizadas no establecen esta regla; no debe presentarse como derecho normativo. |

## 10. Decisiones institucionales pendientes

| Punto | Fuentes en tensión y alternativas | Impacto backend / frontend | Recomendación técnica provisional | Decisión requerida |
|---|---|---|---|---|
| Cuatro o seis ejemplares | RE-PG: seis; DF-MG: cuatro. Alternativas 4, 6 o cantidad configurable por periodo. | Backend debe validar cantidad; frontend mostrar requisito exacto. | Mantener `EJEMPLARES_IMPRESOS` sin mínimo automático y advertencia visible. | Cantidad vigente y desde qué gestión aplica. |
| 30 % privado sin nota | RE-PG/RG-MG ponderan 30/70; RE-PG expresa privada cualitativa. Alternativas: rúbrica numérica, equivalencia aprobada o resultado final no sumable. | Afecta modelo de evaluación, cálculo, reportes y UI. | Conservar privada cualitativa, aporte privado y nota final nulos. | Instrumento oficial que produzca el 30 % o confirmación de que no se calcula. |
| Clasificación final | RE-PG: 51–74, 75–89, 90–100; RG-MG usa otros cortes/nombres. | Cambia códigos, reportes, certificados y etiquetas. | Mostrar nota pública y `APROBADO/POSTERGADO`, sin clasificación honorífica oficial. | Tabla, nombres y norma vigente. |
| Dos o tres estudiantes | RE-PG máximo 2; RG-MG máximo 3. | Requiere relación múltiple estudiante–proyecto, permisos y documentos grupales. | Mantener alcance individual del sistema y declarar no soportado. | Máximo vigente y reglas de evaluación/abandono grupal. |
| Tribunal formal frente a quórum | RE-PG designa tres docentes, pero permite sesiones con dos más actores específicos. | Debe separar miembros designados de presentes mínimos. | Exigir composición formal cuando se modele el acto; usar política actual solo para quórum. | Composición por evento, suplencias y derecho a voz/voto. |
| Orden de designaciones | RE-PG ubica Tutor tras aprobación de propuesta; DF-MG combina designaciones alrededor del perfil. | Afecta precondiciones y orden del expediente. | No bloquear automáticamente por orden no confirmado; registrar fechas y evidencias. | Secuencia oficial Tutor/Tribunal/Consejo/Dirección. |
| Máximo de reintentos | RE-PG precisa algunos segundos intentos; no hay régimen uniforme. | Afecta unicidad, transiciones y acciones visibles. | Registrar `numero_intento` sin imponer máximo global. | Límite por perfil, privada, pública y total. |
| Plazos e incumplimiento | Hay 5 días hábiles, 10 calendario, 5 hábiles, 2 semanas y 2 gestiones; consecuencias incompletas. | Requiere calendario académico, feriados, alertas y transiciones. | Mostrar fechas como información; ninguna aprobación automática por plazo. | Cómputo, autoridad que prorroga y consecuencia de cada vencimiento. |
| Cambio de tema/modalidad | RE-PG permite o exige cambios en ciertos casos, sin flujo técnico completo. | Requiere transición trazable y destino de documentos/evaluaciones. | No editar destructivamente la postulación ni reutilizar evidencias de forma implícita. | Solicitud, aprobadores, conservación, nuevo periodo y número de oportunidades. |
| Actos de IIISyP/Consejo | DF-MG los incorpora; el detalle normativo no define todos sus datos. | Requiere órgano, sesión, miembros, dictamen y acta. | No equiparar aprobación de etapa con aprobación colegiada. | Unidad equivalente vigente y contenido mínimo del dictamen. |
| Defensa virtual/mixta | Backend la soporta; fuentes no la regulan. | Acción técnica visible podría aparentar validez normativa. | Ocultarla o marcarla como opción administrativa no validada en el incremento inicial. | Si está autorizada y bajo qué resolución. |

## 11. Correspondencia normativa–backend

| Etapa o regla | Modelo actual | Servicio/política | Endpoint principal | Cobertura | Brecha y riesgo | Cambio futuro recomendado |
|---|---|---|---|---|---|---|
| Elección/inscripción | `Postulacion`, `Periodo`, `Modalidad` | `PostulacionService`, workflow | `/api/v1/postulaciones/` | Parcialmente cubierto | No carta ni exclusividad global; postulación técnica puede confundirse con admisión formal. | Incorporar acto/evidencia y regla institucional cuando se valide. |
| Flujo PG | `EtapaModalidad`, `SeguimientoEtapa` | `ProyectoGradoPolicy`, `WorkflowService` | `/postulaciones/{id}/flujo/`; `/seguimientos-etapa/{id}/...` | Cubierto con decisión técnica | Ocho macroetapas agrupan veinte etapas funcionales. | Mantener mapeo explícito y añadir hitos solo tras aprobación. |
| Requisitos | `ModalidadRequisito`, `CondicionPostulacion` | `ProyectoGradoRequisitosPolicy`, `CondicionService` | `/gestion-complementaria/condiciones/` | Parcialmente cubierto | Verificación manual; no evidencia académica integrada. | Relacionar condición, evidencia, vigencia y validador. |
| Tema/originalidad | Ninguno específico | Ninguno | Ninguno | No cubierto | No puede demostrarse tema aprobado/original. | Modelo versionado de tema y dictamen institucional. |
| Tutor/Tribunal | `AsignacionPostulacion` | Servicio de asignaciones | `/postulaciones/{id}/asignaciones/`; `/asignaciones/{id}/...` | Parcialmente cubierto | No propuesta, memorando, aceptación o cargo emisor. | Asociar evidencia de designación y autoridad competente. |
| Documentos/versiones | `DocumentoPostulacion`, `VersionDocumento`, `ObservacionDocumento` | `DocumentoService` | `/documentos/documentos/`; acciones aprobar/rechazar/observar | Cubierto | Tipos configurables no equivalen a contenido/formato reglamentario. | Matriz de requisitos por etapa y acto, sin duplicar archivos. |
| Perfil | Seguimiento, documento, evento, evaluación | Workflow y servicios de defensa | `/eventos-defensa/`; evaluaciones `perfil` | Parcialmente cubierto | No controla contenido, plazo ni segundo intento máximo. | Precondiciones normativas configurables después de validación. |
| Revisión previa | Etapa `REVISION_TRIBUNAL_PREVIA` | Workflow/documentos | `/seguimientos-etapa/`; `/documentos/` | Parcialmente cubierto | No representa sesión/acta del Consejo ni tres conformidades. | Modelar dictámenes y conformidades por emisor. |
| Defensa privada | `EventoDefensa`, participantes, evaluación | `EventoDefensaService`, `EvaluacionDefensaService` | `/eventos-defensa/{id}/...` | Cubierto | Plazo/protocolo no controlados; 30 % irresoluble. | Mantener cualitativa y añadir plazos solo con decisión formal. |
| Defensa pública | Evento, participantes, evaluación | Política de evento/evaluación | Programar, quórum, asistencia, evaluar y consolidar | Cubierto | 48 h sí; publicación, protocolo y clasificación no. | Evidencia de convocatoria y tabla institucional futura. |
| Resultado final | `EvaluacionDefensa` | `calcular_resultado_final` | `/postulaciones/{id}/resultado-final/` | Cubierto con decisión técnica no normativa | `nota_final=null`; evita un cálculo falso. | Implementar únicamente con instrumento privado aprobado. |
| Correcciones | Versiones, observaciones, seguimiento | Documento/Workflow | `/documentos/.../observar`; `/observaciones/.../marcar-corregida` | Cubierto | No hay fecha límite ni firma del revisor. | Incorporar vencimientos y conformidad cuando se definan. |
| Entregas | `EntregaFisica` | `EntregaFisicaService` | `/gestion-complementaria/entregas-fisicas/` | Parcialmente cubierto | Cantidad oficial pendiente. | Regla versionada por periodo después de resolución. |
| Cierre | Seguimientos, condiciones, entregas y documentos | `ProyectoGradoCierrePolicy`, `CierrePostulacionService` | `/postulaciones/{id}/cierre/` y acciones | Cubierto con decisión técnica | Comprueba configuración actual, no legalización institucional. | Mantener advertencias y añadir evidencia legal si se requiere. |
| Historial/auditoría | `HistorialEstado`, `AuditLog`, observaciones | Workflow y servicios | `/postulaciones/historial/`, recursos relacionados | Cubierto | No es kardex institucional firmado. | Vista unificada; denominación neutral “historial”. |
| Reintentos | `numero_intento` en etapa/evento | Workflow/defensas | `nuevo-intento`, reprogramar | Parcialmente cubierto | Sin máximo normativo uniforme. | Política por etapa una vez validada. |
| Cambio tema/modalidad | No existe flujo específico | Ninguno | Ninguno | No cubierto | Edición directa perdería trazabilidad contractual. | Caso de uso formal con solicitud, resolución y vínculo entre expedientes. |
| Trabajo grupal | `Postulacion.estudiante` | — | Postulaciones | No cubierto | Solo un estudiante; riesgo de falsa expectativa. | No abordar hasta decidir máximo y reglas grupales. |

## 12. Alcance aprobado para el Sprint 1

### 12.1 Puede construirse de forma segura

Una vista de expediente de solo composición/consulta que muestre:

- resumen y código de postulación;
- datos del estudiante respetando aislamiento y permisos;
- modalidad y periodo;
- etapa actual y macroflujo existente;
- Tutor y demás asignaciones activas/históricas;
- historial de estados y auditoría expuesta por contrato;
- observaciones generales y documentales;
- documentos, versiones y estado de revisión;
- seguimiento por etapa e intentos existentes;
- defensas programadas, participantes, asistencia, quórum y evaluaciones existentes;
- condiciones manuales y entregas registradas;
- estado y faltantes del cierre;
- advertencias normativas devueltas por el backend.

La interfaz debe usar capacidades reales del backend, distinguir lectura de acciones y explicar los `403`. Las etiquetas deben describir datos registrados, no certificar validez institucional.

### 12.2 No puede afirmarse ni implementarse como cumplimiento oficial

- aprobación formal del tema;
- originalidad o ausencia de duplicidad certificada;
- aprobación del IIISyP o Consejo Científico;
- emisión de memorandos, firmas o resoluciones no registradas;
- cumplimiento automático de plazos;
- número máximo definitivo de oportunidades;
- cálculo final del 30 % privado;
- clasificación normativa definitiva;
- cantidad oficial de ejemplares;
- soporte de proyectos grupales;
- validez normativa de defensas virtuales o mixtas;
- cierre legal universitario por el solo cierre técnico del expediente.

### 12.3 Criterios de aceptación del incremento

1. Todo dato mostrado procede de un endpoint vigente y respeta permisos.
2. El estudiante solo ve recursos propios.
3. La etapa funcional se presenta como macroetapa técnica cuando corresponda.
4. Las verificaciones manuales identifican estado, fecha y responsable.
5. Las advertencias normativas no se ocultan.
6. `nota_final=null` se presenta como pendiente institucional, sin cálculo local.
7. No se muestran etiquetas honoríficas como oficiales.
8. No se confunde una asignación con memorando o designación formal.
9. No se confunde aprobación documental con firma o legalización.
10. No se agregan operaciones de tema, grupo, cambio o plazo sin contrato aprobado.

## 13. Preguntas para validación con la Universidad

1. ¿Se ratifica que RE-PG prevalece sobre RG-MG en todos los puntos específicos de Proyecto de Grado?
2. ¿Cuántos ejemplares impresos son obligatorios actualmente: cuatro, seis u otra cantidad?
3. ¿Qué instrumento produce la nota correspondiente al 30 % de la defensa privada?
4. Si la privada continúa siendo cualitativa, ¿cómo se calcula oficialmente la nota final?
5. ¿Cuál es la tabla vigente de rangos, denominaciones y menciones?
6. ¿El máximo vigente por Proyecto de Grado es uno, dos o tres estudiantes?
7. ¿Qué composición formal debe designarse para perfil, privada y pública, y cuál es el quórum de cada evento?
8. ¿Quién propone, quién designa y quién notifica Tutor y Tribunal en cada etapa?
9. ¿Cuál es el nombre y competencia vigente del IIISyP o unidad equivalente?
10. ¿Qué datos y firma debe contener el dictamen de originalidad y pertinencia?
11. ¿Se exige un acta formal del Consejo Científico y en qué etapas?
12. ¿Son exactamente tres las cartas de conformidad? ¿Quién emite cada una?
13. ¿Cuál es el máximo de intentos para perfil, privada y pública?
14. ¿Cómo se computan días hábiles, días calendario y gestiones académicas?
15. ¿Quién puede conceder prórrogas y qué evidencia debe registrarse?
16. ¿Qué ocurre con documentos, notas e intentos al reinscribir al estudiante?
17. ¿Cuál es el procedimiento formal para cambiar de tema?
18. ¿Cuál es el procedimiento formal para cambiar de modalidad?
19. ¿Debe conservarse una relación entre la postulación anterior y la nueva?
20. ¿Qué evidencia constituye la convocatoria pública y quién certifica las 48 horas?
21. ¿Están autorizadas las defensas virtuales o mixtas? ¿Bajo qué norma?
22. ¿Qué firmas deben ser digitales, manuscritas o solo registradas como recepción?
23. ¿Qué acto determina la conclusión académica y cuál determina el cierre legal/documental?
24. ¿El historial técnico puede reconocerse como kardex o se requiere un documento institucional adicional?

## 14. Criterio de uso y control de cambios

Este contrato puede utilizarse para Sprint 1 solo en los límites de la sección 12. Toda respuesta institucional deberá incorporarse con referencia a resolución, reglamento, acta o comunicación oficial y deberá actualizar, como mínimo, la decisión correspondiente, la regla de negocio, la etapa, la evidencia, la cobertura backend y el impacto frontend.

Hasta entonces, toda inferencia permanece identificada como tal y ninguna operación técnica se considera equivalente a un acto administrativo formal.
