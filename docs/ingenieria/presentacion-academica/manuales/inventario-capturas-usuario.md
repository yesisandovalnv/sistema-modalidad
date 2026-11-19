# Inventario de capturas del Manual de Usuario

**Estado actual: 0 capturas incorporadas.** No se reutilizaron diagramas UML como sustituto de pantallas. Las referencias CAP corresponden a las 14 categorías de fase 11; no implican que las imágenes existan.

| ID | Captura requerida | Procedimientos del manual | Estado y condición | Privacidad |
| --- | --- | --- | --- | --- |
| CAP-01 | Acceso general y acceso estudiantil | 5.1, 5.2 | Pendiente. Puede hacerse antes de autenticarse; el navegador no quedó accesible. | No mostrar usuario, R.U. o C.I. rellenados. |
| CAP-02 | Inicio/dashboard | 7.1 | Pendiente. Requiere rol de dashboard y conjunto de datos seguro. | Ocultar nombres, códigos y conteos identificables. |
| CAP-03 | Lista de Postulantes / Mi proceso | 7.2 | Pendiente. Requiere cuentas de personal/estudiante. | Anonimizar identidades y códigos. |
| CAP-04 | Formulario vacío de postulación y validación segura | 7.3 | Pendiente. No enviar cambios sobre datos institucionales. | No usar información real; ocultar campos personales. |
| CAP-05 | Expediente con pestañas/estado/orientación | 7.4 y 7.13 | Pendiente. Prever vistas de cada modalidad; solo lectura. | Anonimizar estudiante, docentes, código y fechas vinculables. |
| CAP-06 | Diálogo de carga documental sin confirmar | 7.6 | Pendiente. Mostrar formulario antes de guardar. | Ocultar nombres de archivo/documento con PII. |
| CAP-07 | Detalle, versiones y observaciones | 7.7 | Pendiente. Requiere expediente de demostración/lectura. | No mostrar documento ni observaciones identificables. |
| CAP-08 | Revisión/dictamen vacío | 7.8 | Pendiente. No guardar dictamen de prueba. | Ocultar actores, datos y contenido documental. |
| CAP-09 | Asignaciones y actores | 7.10 | Pendiente. Captura de solo lectura; no cambiar asignación. | Ocultar nombres y correos. |
| CAP-10 | Defensas/requisitos de programación | 7.11 | Pendiente. No programar ni reprogramar. | Ocultar identidad, fecha o ubicación restringida. |
| CAP-11 | Participantes, quórum y evaluación vacía | 7.12 | Pendiente. No registrar nota/evaluación. | Ocultar identidades, notas, firmas y comentarios. |
| CAP-12 | Panel específico por modalidad | 7.13.1–7.13.6 | Pendiente. Idealmente una captura por cada una de las seis modalidades; solo lectura/formulario vacío. | Anonimizar expediente, institución, resultados y participantes. |
| CAP-13 | Notificaciones | 7.14 | Pendiente. Capturar solo contenido no identificable. | Revisar asunto, mensaje y vínculos al expediente. |
| CAP-14 | Reportes filtrados sin exportación | 7.15 | Pendiente. No descargar ni distribuir informes con datos reales. | Ocultar grupos pequeños, nombres, códigos y resultados personales. |

## Condición de captura

Computer Use no pudo determinar con confianza la URL activa de Chrome y detuvo el acceso al navegador. No se intentó introducir credenciales, abrir otra sesión, levantar el servidor ni cambiar configuración. Las capturas quedan pendientes de un entorno de demostración accesible con datos ficticios/anonimizados y autorización para las cuentas correspondientes.

Al completar cada captura, guardar PNG original sin deformación, asignar nombre `CAP-nn`, fecha y rol de sesión, redactar pie descriptivo como “Figura n. …”, revisar PII y reemplazar esta tabla con la ruta del archivo efectivamente incorporado. No editar datos del sistema para construir ejemplos.
