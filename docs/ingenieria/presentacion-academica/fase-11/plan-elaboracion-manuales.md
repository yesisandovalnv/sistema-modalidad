# Plan para elaborar los manuales

## Secuencia

1. **Preparar evidencia**: responsable habilita instancia de demostración con datos ficticios/anonimizados y cuentas de los roles. Confirmar versión desplegada y que no se conecta a datos institucionales.
2. **Cerrar verificación funcional**: recorrer los 15 procedimientos de `inventario-procedimientos-usuario.md`, revisar cada modalidad y anotar permiso, precondición, texto visible, errores y resultado. Capturar CAP prioritarias sin enviar operaciones persistentes; escrituras solo con autorización y datos descartables.
3. **Seleccionar cobertura**: ordenar el manual de usuario por tareas esenciales; separar pasos de estudiante y personal, y añadir diferencias por modalidad donde están verificadas.
4. **Recuperar operación técnica**: seguir `README.md`, `docs/ENVIRONMENT.md`, `docs/DEPLOYMENT.md`, Dockerfiles y `docker-compose.yml`; confirmar versiones runtime, secuencia de instalación, migraciones, configuración segura, backup/restauración y mantenimiento en ambiente aislado.
5. **Seleccionar diagramas**: reutilizar referencias de `inventario-diagramas-reutilizables.md` y las figuras de fase 10; revisar proporción/legibilidad y conservar vínculo/fuente.
6. **Redactar DOCX**: crear manual de usuario y técnico con capturas reales, leyendas, pasos, advertencias operativas verificadas y referencias. Mantener las fases 8–10 intactas.
7. **Revisar**: comprobar trazabilidad procedimiento-código-captura, consistencia entre modalidades y roles, privacidad, enlaces, renderizado de página e integridad de imágenes. Validar versión editable y exportación si se solicita.

## Condiciones para iniciar fase 12

- Entorno real navegable y cuentas acordes a rol, sin alterar registros institucionales.
- Capturas aprobadas o mecanismo acordado de anonimización.
- Pasos y mensajes reproducidos; pendientes no redactados como certezas.
- Portada y datos institucionales confirmados.

## Condiciones para iniciar fase 13

- Acordar alcance de instalación local frente a producción.
- Confirmar runtime/infraestructura objetivo y configuración que puede divulgarse.
- Procedimiento autorizado y probado de backup/restauración en entorno aislado, o declarar explícitamente ausencia.
- Elegir diagramas válidos y legibles; incluir solo versiones ya existentes.
- Definir audiencia técnica y formato de entrega.

Los manuales Word no forman parte de la fase 11. Las fases 12 y 13 quedan pendientes de autorización explícita.
