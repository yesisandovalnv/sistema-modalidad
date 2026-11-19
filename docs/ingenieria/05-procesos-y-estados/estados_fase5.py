"""Transiciones explícitas; una fila = evento, guarda, efecto y evidencia."""
from datos_fase5 import view


def machine(id,title,process,states,rows,refs,limitations):
    aliases={s:'s'+str(i) for i,s in enumerate(states)}
    lines=['hide empty description']
    for s in states: lines.append('state "'+s+'" as '+aliases[s])
    multiple_creation=sum(row[0]=='[*]' for row in rows)>1
    if multiple_creation:
        lines+=['state "Ruta de creación" as creation <<choice>>','[*] --> creation']
    transitions=[]
    for i,(origin,event,guard,action,target,ref,proof) in enumerate(rows,1):
        a=('creation' if multiple_creation else '[*]') if origin=='[*]' else aliases[origin]
        b=aliases[target]
        num=str(i).zfill(2)
        label='T'+num+' '+event.replace(' / ',' o ')+'\\n[G'+num+'] / A'+num
        if id=='DIA-DOC-080' and origin==target:
            lines.append(a+' : '+label)
        else:
            lines.append(a+' --> '+b+' : '+label)
        transitions.append(dict(id=id+'/T'+str(i).zfill(2),origin=origin,event=event,guard=guard,action=action,target=target,reference=ref,proof=proof))
    lines+=['legend bottom','Txx: contrato completo en la ficha.','Gxx = guarda de Txx; Axx = acción de Txx.','Son alias documentales, no variables del código.','No se infieren transiciones a partir de choices.','endlegend']
    view(id,title,'Estados',process,'\n'.join(lines),refs,limitations,transitions)

W='apps/postulantes/workflow.py:WorkflowService.'
D='apps/documentos/services.py:DocumentoService.'
F='apps/postulantes/defensas.py:EventoDefensaService.'
S='apps/postulantes/services.py:PostulacionService.'
machine('DIA-SYS-005','Estado general de postulación: rutas comprobadas','PROC-POS-001',
 ['REGISTRADA','EN_PROCESO','CONCLUIDA','A: valor actual de catálogo','B: valor destino de catálogo','Valor anterior del historial'],[
 ('[*]','crear_postulacion','REGISTRADA configurada; estudiante sin vigente','Crear postulación e historial','REGISTRADA',S+'crear_postulacion','estado_actual=estado_inicial'),
 ('[*]','crear_postulacion_historica','Administración y CONCLUIDA configurada','Crear HISTORICO con vigencia CERRADA; no recorrido operativo','CONCLUIDA',S+'crear_postulacion_historica','estado_actual=estado_final'),
 ('REGISTRADA','iniciar_etapa','Inicio válido y EN_PROCESO configurado; strict=False','Guardar estado general e historial','EN_PROCESO',W+'iniciar_etapa','codigo_estado="EN_PROCESO"'),
 ('EN_PROCESO','concluir_postulacion','Validación de policy y estado CONCLUIDA disponible','Guardar estado general e historial; programar evento','CONCLUIDA',W+'concluir_postulacion','validar_conclusion_academica'),
 ('CONCLUIDA','concluir_postulacion','Ya CONCLUIDA','Retornar sin validar otra vez la policy','CONCLUIDA',W+'concluir_postulacion','return post'),
 ('A: valor actual de catálogo','cambiar_estado vía PATCH','Administración API; B existente y B distinto de A','Guardar estado, historial y auditoría; no gate de conclusión','B: valor destino de catálogo',S+'cambiar_estado','estado_actual = nuevo_estado'),
 ('CONCLUIDA','reabrir_cierre de Proyecto','Cierre aprobado; motivo; historial previo y destino distinto no nulo','Reabrir seguimiento y restaurar estado anterior del historial','Valor anterior del historial','apps/postulantes/cierre.py:CierrePostulacionService.reabrir_cierre','post.estado_actual=target'),
 ],S+'crear_postulacion '+S+'crear_postulacion_historica '+W+'iniciar_etapa '+W+'concluir_postulacion',
 'A/B y valor anterior son parámetros, no códigos nuevos. EN_PROCESO→CONCLUIDA es un recorrido representativo: la conclusión común admite otro origen no concluido si su policy lo valida. El catálogo es abierto; PATCH permite pares distintos existentes. No es máquina exhaustiva ni CONCLUIDA absorbente; no modifica vigencia.')
machine('DIA-POS-080','Vigencia independiente de postulación','PROC-POS-001',
 ['VIGENTE','CERRADA','CANCELADA','DADA_DE_BAJA'],[
 ('[*]','crear postulación ordinaria','Alta ordinaria válida','Usar default VIGENTE','VIGENTE','apps/postulantes/models.py:Postulacion','default=VigenciaChoices.VIGENTE'),
 ('[*]','crear histórica','Administración; registro HISTORICO','Asignar CERRADA al crear','CERRADA',S+'crear_postulacion_historica','vigencia=Postulacion.VigenciaChoices.CERRADA'),
 ('VIGENTE','dar_de_baja (servicio)','Objeto válido, motivo, responsable y fecha válidos','Guardar baja y auditoría','DADA_DE_BAJA',S+'dar_de_baja','postulacion.vigencia = Postulacion.VigenciaChoices.DADA_DE_BAJA'),
 ('CERRADA','dar_de_baja (servicio)','Mismas validaciones; servicio solo excluye ya DADA_DE_BAJA','Guardar baja y auditoría','DADA_DE_BAJA',S+'dar_de_baja','if postulacion.vigencia == Postulacion.VigenciaChoices.DADA_DE_BAJA'),
 ('CANCELADA','dar_de_baja (servicio)','Mismas validaciones; sin ruta pública confirmada','Guardar baja y auditoría','DADA_DE_BAJA',S+'dar_de_baja','postulacion.save'),
 ],S+'dar_de_baja apps/postulantes/models.py:Postulacion',
 'No se halló escritor productivo hacia CANCELADA ni cierre automático de vigencia al concluir; CANCELADA queda declarado sin entrada. Baja existe como servicio, no como caso de uso HTTP nuevo. CERRADA→baja refleja la guarda real del servicio, no una regla normativa recomendada.')
rows=[('[*]','inicializar_flujo','Etapas activas y seguimiento no existente','get_or_create intento 1','PENDIENTE',W+'inicializar_flujo','get_or_create')]
rows += [('PENDIENTE','iniciar_etapa','Sin otra EN_PROCESO; previas obligatorias aprobadas; policy de inicio','Guardar fecha_inicio y abierta_por','EN_PROCESO',W+'iniciar_etapa','EstadoChoices.EN_PROCESO')]
rows += [('EN_PROCESO','observar_etapa','Observación no vacía; estado editable','Combinar observaciones','OBSERVADA',W+'observar_etapa','EstadoChoices.OBSERVADA')]
for origin in ['EN_PROCESO','OBSERVADA']:
    for method,target in [('aprobar_etapa','APROBADA'),('rechazar_etapa','RECHAZADA')]:
        rows.append((origin,method,'Editable; aprobar además validar_aprobacion_etapa de policy','Guardar cierre y publicar evento; efectos específicos según acción',target,W+method,'EstadoChoices.'+target))
for origin in ['PENDIENTE','EN_PROCESO','OBSERVADA']:
    rows.append((origin,'omitir_etapa','Editable y etapa no obligatoria','Cerrar con OMITIDA','OMITIDA',W+'omitir_etapa','EstadoChoices.OMITIDA'))
rows.append(('APROBADA','reabrir_cierre (solo Proyecto)','CIERRE_DOCUMENTAL aprobado; policy de cierre y motivo','Limpiar fecha_fin/cerrada_por; conservar intento','EN_PROCESO','apps/postulantes/cierre.py:CierrePostulacionService.reabrir_cierre','stage.estado="EN_PROCESO"'))
machine('DIA-POS-081','Ciclo técnico de un seguimiento','PROC-POS-002',
 ['PENDIENTE','EN_PROCESO','OBSERVADA','APROBADA','RECHAZADA','OMITIDA'],rows,W+'aprobar_etapa '+W+'crear_nuevo_intento',
 'Un único objeto SeguimientoEtapa. Nuevo intento crea otro PENDIENTE y deja el anterior RECHAZADA; no se dibuja como vuelta del mismo objeto. La excepción de reapertura pertenece al cierre de Proyecto, no al motor genérico de todas las etapas.')
rows=[('[*]','carga inicial','Tipo, actor, contexto y archivo válidos','Crear documento en ENV','ENV',D+'subir_documento','estado=estado_env')]
for origin in ['ENV','APR','REC']:
    rows.append((origin,'nueva versión','Documento activo y postulación habilitada; carga/contexto válidos','Desmarcar previas; crear actual y reset de revisión/corrección','ENV',D+'crear_nueva_version','documento.estado = estado_env'))
rows += [('ENV','aprobar_documento','Administración; versión actual sin observaciones pendientes','fecha_revision; requiere_correccion=False','APR',D+'aprobar_documento','documento.estado = estado_apr'),('ENV','rechazar_documento','Administración; motivo; versión actual','fecha_revision; requiere_correccion=True','REC',D+'rechazar_documento','documento.estado = estado_rec')]
for origin in ['ENV','APR','REC']:
    rows.append((origin,'registrar_observacion','Administración; comentario; fuera de ENV solo si policy permite postaprobación','Crear observación en actual; requiere_correccion=True; conservar código',origin,D+'registrar_observacion','documento.requiere_correccion = True'))
machine('DIA-DOC-080','Estado de revisión del documento','PROC-DOC-003',['ENV','APR','REC'],rows,D+'aprobar_documento '+D+'registrar_observacion',
 'Códigos operados por servicio, no catálogo físico consultado. No existe aquí transición a OBS. Las operaciones que conservan el código se muestran como transiciones internas, sin acciones entry/exit definidas. Observar en APR/REC es condicional: no prueba que una política concreta admita ambos. Autoaprobación inicial pasa por aprobar_documento. requiere_correccion es otro indicador.')
machine('DIA-DOC-081','Actualidad de una versión documental','PROC-DOC-001',['Actual: es_version_actual=True','No actual: es_version_actual=False'],[
 ('[*]','crear_nueva_version','Archivo y documento válidos','Crear objeto versión nuevo con número, hash y archivo','Actual: es_version_actual=True',D+'crear_nueva_version','es_version_actual=True'),
 ('Actual: es_version_actual=True','cargar otra versión del mismo documento','Nueva carga válida dentro de atomic','Desmarcar versiones existentes; la nueva es otro objeto','No actual: es_version_actual=False',D+'crear_nueva_version','versiones_qs.update(es_version_actual=False)'),
 ],D+'crear_nueva_version','Indicador persistido booleano, sin estados de aprobación propios. No se halló operación de reactivar una versión antigua como actual. No actual no equivale a postulación HISTORICO.')
machine('DIA-DOC-082','Corrección de una observación documental','PROC-DOC-004',['Pendiente: corregida=False','Corregida: corregida=True'],[
 ('[*]','registrar_observacion','Administración; documento/versión habilitados','Crear observación pendiente','Pendiente: corregida=False',D+'registrar_observacion','corregida=False'),
 ('Pendiente: corregida=False','marcar_observacion_corregida','Administración; observación activa y no corregida','Guardar fecha y recalcular pendientes de la versión actual','Corregida: corregida=True',D+'marcar_observacion_corregida','observacion.corregida = True'),
 ],D+'marcar_observacion_corregida','Booleano persistido; sin transición inversa confirmada. La confirmación técnica es otra entidad y no cambia automáticamente este indicador por este método.')
rows=[('[*]','programar_evento','Etapa habilitada; previas aprobadas; policy; sin duplicado activo','Crear evento con default PROGRAMADA','PROGRAMADA',F+'programar_evento','evento.save()'),('PROGRAMADA','iniciar_evento','Postulación activa; fecha alcanzada y policy de inicio','Guardar inicio real y usuario','EN_CURSO',F+'iniciar_evento','evento.estado=evento.Estado.EN_CURSO'),('EN_CURSO','finalizar_evento','Postulación activa; policy y quórum válidos','Guardar fin real y usuario; evento postcommit','FINALIZADA',F+'finalizar_evento','evento.estado=evento.Estado.FINALIZADA')]
for origin in ['PROGRAMADA','EN_CURSO']:
    rows.append((origin,'suspender_evento','Postulación activa; motivo no vacío','Cerrar con SUSPENDIDA y publicar evento','SUSPENDIDA',F+'_cerrar','evento.estado=estado'))
for origin in ['PROGRAMADA','EN_CURSO','SUSPENDIDA']:
    rows.append((origin,'cancelar_evento','Postulación activa; motivo; no FINALIZADA/CANCELADA','Guardar cancelación y publicar evento','CANCELADA',F+'_cerrar','evento.estado=estado'))
for origin in ['PROGRAMADA','SUSPENDIDA']:
    rows.append((origin,'reprogramar_evento','Postulación activa; motivo y nueva fecha validados por policy','Cambiar fecha y limpiar inicio/fin/responsables','PROGRAMADA',F+'reprogramar_evento','evento.estado=evento.Estado.PROGRAMADA'))
machine('DIA-POS-082','Ciclo de evento de defensa','PROC-POS-004',['PROGRAMADA','EN_CURSO','FINALIZADA','SUSPENDIDA','CANCELADA'],rows,F+'iniciar_evento '+F+'_cerrar '+F+'reprogramar_evento',
 'No se añade reapertura de FINALIZADA/CANCELADA. Asistencia y evaluación son dimensiones separadas: registrar evaluación admite EN_CURSO/FINALIZADA, consolidar requiere FINALIZADA. No se inventa estado EVALUADA del evento.')
N='apps/notificaciones/services.py:NotificationService.'
machine('DIA-NOT-080','Lectura de notificación propia','PROC-NOT-001',['No leída: leida=False','Leída: leida=True'],[
 ('[*]','crear_notificacion','Destinatario activo; clave aún no existente','get_or_create con default no leído','No leída: leida=False',N+'crear_notificacion','get_or_create'),
 ('No leída: leida=False','marcar_leida / todas','Propietario de notificación; lote solo propias','Guardar fecha_lectura; auditar si cambia','Leída: leida=True',N+'marcar_leida','obj.leida=True'),
 ('Leída: leida=True','marcar_no_leida','Propietario','leida=False; fecha_lectura=None','No leída: leida=False',N+'marcar_no_leida','obj.leida=False'),
 ('Leída: leida=True','marcar_leida','Propietario','Retornar sin modificar ni auditar de nuevo','Leída: leida=True',N+'marcar_leida','if not obj.leida:'),
 ],N+'marcar_leida '+N+'marcar_no_leida','Booleano persistido con actualización idempotente. No se permite eliminar notificaciones por el servicio; no se modela un estado Entregada por correo.')
C='apps/postulantes/complementarios.py:CondicionService.'
machine('DIA-POS-083','Resolución de condición complementaria','PROC-POS-006',['PENDIENTE','CUMPLE','NO_CUMPLE'],[
 ('[*]','crear','Administración API; postulación editable','Crear condición pendiente','PENDIENTE',C+'crear','obj.save()'),
 ('PENDIENTE','verificar','Administración API; postulación editable y condición pendiente','Guardar responsable, fecha y auditoría','CUMPLE',C+'_resolver','obj.estado=estado'),
 ('PENDIENTE','rechazar','Mismas guardas de _resolver','Guardar responsable, fecha y auditoría','NO_CUMPLE',C+'_resolver','obj.estado=estado'),
 ],C+'_resolver','Sin retorno desde CUMPLE/NO_CUMPLE en este servicio. Verificación múltiple valida todas las condiciones antes de resolverlas dentro de atomic.')
E='apps/postulantes/complementarios.py:EntregaFisicaService.'
rows=[('[*]','crear','Postulación editable; administración API','Crear recepción pendiente','PENDIENTE',E+'crear','obj.save()')]
for origin in ['PENDIENTE','PARCIAL','COMPLETA']:
    for target,guard in [('COMPLETA','cantidad institucional None o recibida >= requerida'),('PARCIAL','cantidad institucional definida y recibida < requerida')]:
        rows.append((origin,'registrar_entrega / actualizar','Cantidad recibida > 0; editable; '+guard,'Sustituir cantidad_recibida, responsable, fecha y auditoría',target,E+'registrar_entrega','obj.estado=obj.Estado.COMPLETA'))
machine('DIA-POS-084','Recepción física y cantidades','PROC-POS-006',['PENDIENTE','PARCIAL','COMPLETA'],rows,E+'registrar_entrega',
 'La cantidad recibida se sustituye, no se incrementa. La operación individual permite recalcular desde COMPLETA/PARCIAL; el lote registrar_multiples exige pendientes. No se impone una irreversibilidad inexistente.')
X='apps/modalidades/examen_grado_service.py:ExamenGradoService.'
rows=[('[*]','ensure_areas','Modalidad EXAMEN_GRADO; área ausente','Crear PENDIENTE','PENDIENTE',X+'ensure_areas','get_or_create')]
for origin in ['PENDIENTE','POSTERGADA']:
    rows.append((origin,'registrar_evaluacion','Etapa EN_PROCESO; composición válida; consenso o tres individuales; resultado >=61; plazo si intento 2','Área APROBADA; limpiar plazo y aprobar seguimiento','APROBADA',X+'registrar_evaluacion','area.estado = ExamenArea.Estado.APROBADA'))
rows += [('PENDIENTE','primera evaluación completa insuficiente','Intento 1; resultado <61','POSTERGADA; intento=2; plazo=now+15 días; rechazar y nuevo seguimiento','POSTERGADA',X+'registrar_evaluacion','area.estado = ExamenArea.Estado.POSTERGADA'),('POSTERGADA','segunda evaluación completa insuficiente','Intento 2 dentro de plazo; resultado <61','REPROBADA y rechazar seguimiento','REPROBADA',X+'registrar_evaluacion','area.estado = ExamenArea.Estado.REPROBADA')]
machine('DIA-EG-080','Estado persistido del área de Examen','PROC-EG-001',['PENDIENTE','POSTERGADA','APROBADA','REPROBADA'],rows,X+'registrar_evaluacion',
 'EN_PROCESO existe como choice de ExamenArea pero no se encontró escritor productivo hacia él; no se conecta por analogía con SeguimientoEtapa. Las evaluaciones individuales incompletas conservan el estado del área y no constituyen otra fase persistida.')
M='apps/modalidades/diplomado_service.py:DiplomadoService.'
rows=[('[*]','ensure_modules','Modalidad correcta y módulo ausente','Crear módulo PENDIENTE','PENDIENTE',M+'ensure_modules','get_or_create')]
for origin in ['PENDIENTE','APROBADO','REPROBADO']:
    for target,guard in [('APROBADO','nota > 65'),('REPROBADO','nota <=65')]:
        rows.append((origin,'set_module_result','Etapa actual EN_PROCESO/OBSERVADA; orden corresponde; nota 0..100; '+guard,'Guardar nota, estado y observaciones; no aprobar seguimiento en este método',target,M+'set_module_result','module.estado = DiplomadoModulo.Estado.APROBADO'))
machine('DIA-DIP-080','Estado persistido de módulo de Diplomado','PROC-DIP-001',['PENDIENTE','APROBADO','REPROBADO'],rows,M+'set_module_result',
 'EN_PROCESO está declarado como choice sin escritor confirmado hacia el estado del módulo. El servicio permite volver a registrar resultado mientras su etapa sea operable; no se inventa una prohibición por el resultado anterior ni aprobación automática del seguimiento.')
A='apps/postulantes/asignaciones.py:AsignacionService.'
machine('DIA-POS-085','Vigencia de una asignación académica','PROC-POS-003',['Activa: activo=True','Finalizada: activo=False'],[
 ('[*]','asignar_actor','Administración API; contexto/ocupación/actor y duplicados válidos','Crear asignación nueva y auditoría','Activa: activo=True',A+'asignar_actor','activo=True'),
 ('Activa: activo=True','finalizar_asignacion','Responsable válido; activa y sin participación en evento activo','Guardar fecha_finalizacion, activo=False y auditoría','Finalizada: activo=False',A+'finalizar_asignacion','asignacion.activo = False'),
 ],A+'finalizar_asignacion '+A+'reemplazar_actor','Reemplazar finaliza el objeto anterior y crea otro; no reactiva el mismo registro. La lectura histórica no equivale a permiso operativo de una asignación activa.')
Q='apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.'
rows=[('[*]','configurar_criterio','Modalidad y criterio válidos; expediente aún no existente; flujo no iniciado','Crear resultado PENDIENTE','PENDIENTE',Q+'configurar_criterio','objects.create')]
for origin in ['PENDIENTE','DESFAVORABLE']:
    for target in ['FAVORABLE','DESFAVORABLE']:
        rows.append((origin,'registrar_evaluacion','Etapa EVALUACION_TRIBUNAL EN_PROCESO; tribunal y documentos; rendimiento >=80 o calidad sin nota','Guardar resultado; solo FAVORABLE aprueba la etapa',target,Q+'registrar_evaluacion','expediente.resultado = resultado'))
machine('DIA-EA-080','Resultado del expediente de Excelencia','PROC-EA-001',['PENDIENTE','FAVORABLE','DESFAVORABLE'],rows,Q+'registrar_evaluacion',
 'Resultado persistido propio de Excelencia, no estado genérico de EvaluacionDefensa. DESFAVORABLE no rechaza automáticamente el seguimiento en registrar_evaluacion; permanece operable mientras la etapa siga EN_PROCESO. La conclusión requiere además etapas previas y acta.')
