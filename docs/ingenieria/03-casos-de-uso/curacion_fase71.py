"""Vínculos revisados por estímulo, guarda y aserción; nunca por familia o archivo."""
DIP='apps/modalidades/tests_diplomado.py:DiplomadoTest.'
COMP='apps/postulantes/tests_complementarios.py:'
CIERRE='apps/postulantes/tests_cierre.py:'
ROWS=[]

def row(uc,key,title,implementation,test,assertions,reason,status='VERIFICADO DOCUMENTALMENTE',target=None):
    ROWS.append(dict(uc='UC-'+uc,key=key,title=title,implementation=implementation,test=test,
                     assertions=assertions,reason=reason,status=status,target=target))

ds='apps/modalidades/diplomado_service.py:DiplomadoService.set_module_result'
row('DIP-001','V01','Con etapa de módulo iniciada, solicitar el módulo 6 provoca ValidationError.',ds,
 DIP+'test_crea_exactamente_cinco_modulos_y_no_permite_sexto',['self.assertRaises(ValidationError)'],
 'La prueba inicia la etapa y llama set_module_result con order=6 dentro de assertRaises; la guarda 1<=order<=5 rechaza antes de consultar el módulo.',target='máximo cinco módulos')
row('DIP-001','V02','Con la primera etapa de módulo iniciada, solicitar el módulo 2 provoca ValidationError.',ds,
 DIP+'test_no_permite_registrar_modulo_futuro',['self.assertRaises(ValidationError)'],
 'El helper inicia MODULO_1 por defecto; order=2 no coincide con expected_order y la llamada protegida es set_module_result.',target='correspondiente a la etapa actual')
row('DIP-001','V03','Una nota 65 guarda el módulo como REPROBADO.',ds,
 DIP+'test_nota_65_reprobar_y_bloquea_aprobacion',['self.assertEqual(module.estado, DiplomadoModulo.Estado.REPROBADO)'],
 'La variable module procede de set_module_result(... Decimal("65") ...); se comprueba el estado del módulo. El assertRaises posterior pertenece a WorkflowService y no se usa para atribuir rechazo al guardado del módulo.')
row('DIP-001','V04','Una nota 66 guarda el módulo como APROBADO.',ds,
 DIP+'test_notas_66_y_100_aprueban_modulo',['self.assertEqual(module.estado, DiplomadoModulo.Estado.APROBADO)'],
 'Se selecciona la primera aserción, tras registrar Decimal("66"). La aprobación del seguimiento usa una llamada independiente y no se atribuye al guardado.')
row('DIP-001','P01','Registrar resultado del módulo mediante la operación documentada.',ds,
 DIP+'test_notas_66_y_100_aprueban_modulo',['self.assertEqual(module.estado, DiplomadoModulo.Estado.APROBADO)'],
 'Comprueba un efecto del servicio; no prueba autenticación, serializer, respuesta API ni todas las variantes de registro.','COBERTURA PARCIAL')

cs='apps/postulantes/complementarios.py:CondicionService.verificar_multiples'
row('POS-023','V01','Un lote válido verifica las dos condiciones y registra responsables y dos auditorías.',cs,
 COMP+'ApiTests.test_admin_verifica_condiciones_en_lote',[
 'self.assertEqual(response.status_code,200,response.data)',
 'self.assertEqual((first.estado,second.estado),("CUMPLE","CUMPLE"))',
 'self.assertEqual((first.verificado_por,second.verificado_por),(self.admin,self.admin))',
 'self.assertEqual(AuditLog.objects.filter(modulo="GESTION_COMPLEMENTARIA",accion="VERIFY_CONDITION").count(),2)'],
 'El payload contiene los dos IDs propios y se autentica a admin. Las aserciones comprueban respuesta, estados persistidos, responsables y auditorías después de refrescar.')
row('POS-023','V02','Un lote con una condición ajena devuelve 400 y conserva ambas condiciones pendientes.',cs,
 COMP+'ApiTests.test_lote_requiere_administrador_y_rechaza_ids_de_otra_postulacion',[
 'self.assertEqual(invalid.status_code,400)','self.assertEqual(own.estado,"PENDIENTE")','self.assertEqual(foreign.estado,"PENDIENTE")'],
 'invalid procede del POST autenticado como admin con own y foreign. La guarda compara las filas de la postulación contra los IDs recibidos; se comprueban los dos estados tras refresh.')
row('POS-023','V03','Un lote con una condición ya cumplida devuelve 400, conserva estados y no verifica parcialmente.',cs,
 COMP+'ApiTests.test_lote_atomico_falla_si_una_condicion_ya_no_esta_pendiente',[
 'self.assertEqual(response.status_code,400)','self.assertEqual(pending.estado,"PENDIENTE")','self.assertEqual(complete.estado,"CUMPLE")',
 'self.assertFalse(AuditLog.objects.filter(modulo="GESTION_COMPLEMENTARIA",accion="VERIFY_CONDITION").exists())'],
 'La preparación marca complete CUMPLE; el servicio exige que todas estén pendientes antes de resolver. Se asertan los estados persistidos y ausencia de auditoría de verificación.')
row('POS-023','V04','Un estudiante que intenta verificar condiciones en lote recibe 403.',
 'apps/postulantes/complementarios_api.py:RelatedViewSet._admin',
 COMP+'ApiTests.test_lote_requiere_administrador_y_rechaza_ids_de_otra_postulacion',['self.assertEqual(denied.status_code,403)'],
 'denied es el POST del estudiante, anterior a force_authenticate(admin); no se confunde con el 400 de pertenencia posterior.')
row('POS-023','P01','Verificar condiciones complementarias mediante la operación documentada.',
 'apps/postulantes/complementarios.py:CondicionService',
 COMP+'ModelServiceTests.test_verificar_rechazar_listados_y_auditoria',[
 'self.assertEqual(CondicionService.listar_completadas(self.post).count(),1)',
 'self.assertTrue(AuditLog.objects.filter(modulo="GESTION_COMPLEMENTARIA",accion="VERIFY_CONDITION").exists())'],
 'Demuestra listado y auditoría del servicio; no toda la operación API, ni todos los estados/rechazos.','COBERTURA PARCIAL')

es='apps/postulantes/complementarios.py:EntregaFisicaService.registrar_multiples'
row('POS-026','V01','Un lote de entregas registra cantidades 1 y 2 y ambas quedan COMPLETA.',es,
 COMP+'ApiTests.test_admin_registra_entregas_en_lote',[
 'self.assertEqual(response.status_code,200,response.data)',
 'self.assertEqual((first.estado,second.estado),("COMPLETA","COMPLETA"))',
 'self.assertEqual((first.cantidad_recibida,second.cantidad_recibida),(1,2))'],
 'Las cantidades institucionales coinciden con el payload; se asertan estado y cantidades persistidas después de refresh. No demuestra el caso PARCIAL.')
row('POS-026','V02','Un lote con entrega ajena devuelve 400 y conserva ambas pendientes.',es,
 COMP+'ApiTests.test_lote_de_entregas_requiere_administrador_y_respeta_ownership',[
 'self.assertEqual(invalid.status_code,400)',
 'self.assertEqual(own.estado,EntregaFisica.Estado.PENDIENTE)',
 'self.assertEqual(foreign.estado,EntregaFisica.Estado.PENDIENTE)'],
 'invalid corresponde a la llamada admin con dos postulaciones; se comprueba que ninguna entrega cambia.')
row('POS-026','V03','Una entrega ya completa impide procesar el lote y conserva las dos situaciones.',es,
 COMP+'ApiTests.test_lote_de_entregas_es_atomico_si_una_ya_no_esta_pendiente',[
 'self.assertEqual(response.status_code,400)',
 'self.assertEqual(pending.estado,EntregaFisica.Estado.PENDIENTE)',
 'self.assertEqual(complete.estado,EntregaFisica.Estado.COMPLETA)'],
 'La preparación completa una entrega antes del POST. El guardado por lote exige pendientes y los refresh comprueban que no procesa la otra.')
row('POS-026','P01','Recepcionar una entrega física mediante la operación documentada.',
 'apps/postulantes/complementarios.py:EntregaFisicaService.registrar_entrega',
 COMP+'ApiTests.test_admin_registra_entrega',[
 'self.assertEqual(response.status_code,200)','self.assertEqual(response.data["estado"],"COMPLETA")'],
 'Se verifica la respuesta para cantidad institucional 1; no se asertan auditoría, sustitución de cantidades ni todas las variantes.','COBERTURA PARCIAL')
row('POS-027','V01','GET de condiciones sin autenticación devuelve 401.',
 'apps/postulantes/complementarios_api.py:RelatedViewSet',
 COMP+'ApiTests.test_sin_autenticacion',[
 'self.assertEqual(self.client.get("/api/v1/gestion-complementaria/condiciones/").status_code,401)'],
 'La solicitud no autentica usuario y apunta exactamente al listado de condiciones; IsAuthenticated se declara en la base de la vista.')
row('POS-027','P01','Consultar condiciones y entregas según el alcance documentado.',
 'apps/postulantes/complementarios_api.py:RelatedViewSet.get_queryset',
 COMP+'ApiTests.test_estudiante_solo_lee_propias',[
 'self.assertEqual(response.status_code,200)','self.assertEqual(response.data["count"],1)'],
 'La preparación crea una condición propia y otra ajena y autentica al estudiante; verifica cantidad, pero no los IDs devueltos ni las entregas.','COBERTURA PARCIAL')

cl='apps/postulantes/cierre.py:CierrePostulacionService.concluir_postulacion'
row('PG-002','V01','Repetir conclusión conserva CONCLUIDA y el número de historiales de conclusión.',cl,
 CIERRE+'PolicyServiceTests.test_conclusion_idempotente_crea_historial_y_auditoria',[
 'self.assertEqual(self.post.estado_actual.codigo,"CONCLUIDA")',
 'self.assertEqual(HistorialEstado.objects.filter(postulacion=self.post,estado_nuevo=self.concluded).count(),count)'],
 'count se toma entre las dos llamadas. Acredita idempotencia de estado e historial; no se atribuye comprobación de ausencia de auditoría/eventos repetidos.')
row('PG-002','V02','Solicitar conclusión sin los gates de cierre provoca ValidationError.',cl,
 CIERRE+'PolicyServiceTests.test_no_concluye_solo_por_defensa',['self.assertRaises(ValidationError)'],
 'La fixture prepara defensas y revisión pendiente; no aprueba cierre. La llamada bajo assertRaises es concluir_postulacion; el servicio valida puede_concluir antes de cambiar estado.')
row('PG-002','V03','El estudiante que intenta concluir por la API de cierre recibe 403.',
 'apps/postulantes/cierre_api.py:CierreAccionView.post',
 CIERRE+'ApiTests.test_auth_estudiante_y_docente_lectura',[
 'self.assertEqual(self.client.post(url+"concluir/",{}).status_code,403)'],
 'La autenticación de estudiante precede al POST; _admin exige autoridad administrativa aunque el mismo usuario pueda leer.')
row('PG-002','P01','Operar el cierre técnico mediante sus variantes documentadas.',
 'apps/postulantes/cierre_api.py:CierreAccionView.post',
 CIERRE+'ApiTests.test_recorrido_integral_de_cierre_y_reapertura_auditada',[
 'self.assertEqual(concluded.status_code,200)','self.assertTrue(concluded.data["concluida"])',
 'self.assertEqual(reopened.status_code,200)','self.assertFalse(reopened.data["cierre_documental_aprobado"])'],
 'Comprueba un recorrido favorable y reapertura; no todos los errores, todos los efectos persistidos ni todas las combinaciones del caso agrupado.','COBERTURA PARCIAL')

# Contrastes adicionales: la aserción debe observar el resultado de la operación,
# no un preparativo u otra llamada del mismo método de prueba.
row('POS-003','V01','Aprobar la etapa con documento válido devuelve APROBADA con fecha y responsable.',
 'apps/postulantes/workflow.py:WorkflowService.aprobar_etapa',
 'apps/postulantes/tests_workflow.py:DocumentoFinalApprovalPreconditionTest.test_aprueba_etapa_si_documento_cumple_todas_las_precondiciones',[
 'self.assertEqual(actualizado.estado, SeguimientoEtapa.EstadoChoices.APROBADA)',
 'self.assertIsNotNone(actualizado.fecha_fin)','self.assertEqual(actualizado.cerrada_por, self.admin)'],
 'actualizado es el retorno de aprobar_etapa tras preparar documento y versión; las tres propiedades se asertan en ese retorno. No se generaliza esta fixture a toda modalidad.')
row('POS-004','V01','En el contexto de defensa pública de la fixture, la misma persona no puede recibir SECRETARIO tras PRESIDENTE.',
 'apps/postulantes/asignaciones.py:AsignacionService.asignar_actor',
 'apps/postulantes/tests_assignments.py:AsignacionServiceTest.test_rechaza_misma_persona_como_presidente_y_secretario_en_defensa_publica',[
 'self.assertRaisesMessage(ValidationError, "cargo incompatible")'],
 'La llamada dentro de assertRaisesMessage asigna SECRETARIO al mismo docente previamente designado PRESIDENTE; se comprueba el mensaje de incompatibilidad.')
row('POS-006','V01','Programar DEFENSA_PERFIL devuelve ese tipo y registra auditoría PROGRAM.',
 'apps/postulantes/defensas.py:EventoDefensaService.programar_evento',
 'apps/postulantes/tests_defensas.py:ServiciosDefensaTests.test_programacion_y_auditoria',[
 'self.assertEqual(ev.tipo_evento,"DEFENSA_PERFIL")','self.assertTrue(AuditLog.objects.filter(accion="PROGRAM",modulo="DEFENSAS").exists())'],
 'ev es el retorno de la programación con seguimiento de perfil y lugar Sala; las aserciones comprueban tipo y auditoría, no el ciclo completo de defensa.')
row('POS-007','V01','La consolidación de la pública de esta fixture conserva nota 95, ponderación 70, aporte 66.50 y BRUTA_100.',
 'apps/postulantes/defensas.py:EvaluacionDefensaService.consolidar_evaluacion_evento',
 'apps/postulantes/tests_defensas.py:ServiciosDefensaTests.test_consolidado_preserva_nota_bruta_aporte_ponderado_y_semantica',[
 'self.assertEqual(consolidated.nota_numerica,Decimal("95.00"))','self.assertEqual(consolidated.ponderacion,Decimal("70.00"))',
 'self.assertEqual(consolidated.aporte_ponderado,Decimal("66.50"))','self.assertEqual(consolidated.semantica_nota,"BRUTA_100")'],
 'La prueba crea evaluación por consenso con 95, finaliza el evento y observa el consolidado retornado; los valores son del contexto de prueba, no reglas universales.')
ea='apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion'
et='apps/modalidades/tests_excelencia_academica.py:ExcelenciaAcademicaTest.test_rendimiento_requiere_80_y_no_inventa_kardex'
row('EA-001','V01','Con criterio RENDIMIENTO_ACADEMICO preparado, promedio 79.99 se rechaza con el mensaje de mínimo 80.',ea,et,
 ['self.assertRaisesMessage(ValidationError, "igual o superior a 80")'],
 'La llamada protegida solicita FAVORABLE con 79.99; la prueba prepara el criterio de rendimiento. No corresponde al criterio de calidad.')
row('EA-001','V02','Con criterio de rendimiento, promedio 80 se guarda como FAVORABLE.',ea,et,
 ['self.assertEqual(result.promedio_general, Decimal("80.00"))','self.assertEqual(result.resultado, ExcelenciaExpediente.Resultado.FAVORABLE)'],
 'result proviene de registrar_evaluacion con FAVORABLE y Decimal 80; ambas aserciones observan ese retorno, después del rechazo de 79.99.')
row('POS-012','V01','Dos inicializaciones de la fixture devuelven cuatro seguimientos y mantienen cuatro filas, con primer intento pendiente.',
 'apps/postulantes/workflow.py:WorkflowService.inicializar_flujo',
 'apps/postulantes/tests_workflow.py:WorkflowServiceTest.test_inicializar_flujo_crea_etapas_pendientes_e_idempotente',[
 'self.assertEqual(len(seguimientos), 4)',
 'self.assertTrue(all(seguimiento.estado == SeguimientoEtapa.EstadoChoices.PENDIENTE and seguimiento.numero_intento == 1 for seguimiento in seguimientos))',
 'self.assertEqual(SeguimientoEtapa.objects.filter(postulacion=self.postulacion).count(), 4)','self.assertEqual(len(repetido), 4)'],
 'Se observan los dos retornos y el conteo persistido. Cuatro etapas es configuración de esta fixture, no cantidad universal.')
row('POS-019','V01','Agregar participante a un evento FINALIZADA o CANCELADA de la fixture se rechaza con mensaje de estado.',
 'apps/postulantes/defensas.py:EventoDefensaService.agregar_participante',
 'apps/postulantes/tests_defensas.py:ServiciosDefensaTests.test_matriz_de_estados_para_participantes_y_asistencia',[
 'self.assertRaisesMessage(ValidationError,"El evento ya no admite participantes")'],
 'La aserción está en el bucle terminal de dos estados y contiene agregar_participante. Las aserciones sobre asistencia o remover no se atribuyen a agregar.')
row('POS-020','V01','Registrar asistencia en evento EN_CURSO conserva responsable y fecha de registro.',
 'apps/postulantes/defensas.py:EventoDefensaService.registrar_asistencia',
 'apps/postulantes/tests_defensas.py:ModelosDefensaTests.test_asistencia_registra_responsable_y_fecha',[
 'self.assertEqual(p.registrado_por,self.admin)','self.assertIsNotNone(p.fecha_registro_asistencia)'],
 'p es el retorno de registrar_asistencia con True; las aserciones comprueban responsable y fecha, sin atribuir validación del quórum completo.')
row('POS-022','V01','En la fixture mixta, resultado final combina aporte legacy 25 y aporte nuevo 66.50 en 91.50.',
 'apps/postulantes/defensas.py:EvaluacionDefensaService.calcular_resultado_final',
 'apps/postulantes/tests_defensas.py:ServiciosDefensaTests.test_resultado_final_mixto_usa_aporte_nuevo_y_preserva_nota_legacy',[
 'self.assertEqual(result["aporte_privada"],Decimal("25.00"))','self.assertEqual(result["aporte_publica"],Decimal("66.50"))',
 'self.assertEqual(result["nota_final"],Decimal("91.50"))','self.assertEqual(result["semantica_privada"],"LEGACY_PONDERADA")',
 'self.assertEqual(result["semantica_publica"],"BRUTA_100")'],
 'Las evaluaciones de preparación declaran semánticas diferentes; result es el retorno del cálculo. No se afirma que calcular concluya la postulación.')
row('TD-004','V01','El overview devuelve el periodo del informe institucional registrado en la fixture.',
 'apps/modalidades/trabajo_dirigido_service.py:TrabajoDirigidoService.overview',
 'apps/modalidades/tests_trabajo_dirigido.py:TrabajoDirigidoTest.test_desarrollo_exige_institucion_e_informe_periodico',[
 'self.assertEqual(TrabajoDirigidoService.overview(self.post)["informes"][0]["periodo"], "Agosto 2026")'],
 'Antes de consultar se configura la institución y se registra el informe Agosto 2026; la aserción observa ese campo del overview. No demuestra autorización API ni todos los campos.')
row('EA-003','V01','Tras preparar evaluación favorable y aprobar REGISTRO_ACTA con documento, concluir fija CONCLUIDA.',
 'apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.concluir',
 'apps/modalidades/tests_excelencia_academica.py:ExcelenciaAcademicaTest.test_conclusion_bloqueada_hasta_acta_aprobada',[
 'self.assertEqual(self.post.estado_actual.codigo, "CONCLUIDA")'],
 'La aserción sigue a concluir y refresh_from_db. El assertRaises anterior pertenece a aprobar_etapa antes de adjuntar acta: no demuestra una excepción de concluir.')
row('DIP-003','V01','El overview de la fixture devuelve cinco módulos y reglas 800 horas, 20 créditos y reintento de 30 días.',
 'apps/modalidades/diplomado_service.py:DiplomadoService.overview',
 DIP+'test_overview_expone_horas_creditos_y_modulos',[
 'self.assertEqual(len(data["modulos"]), 5)','self.assertEqual(data["reglas"]["horas_totales"], 800)',
 'self.assertEqual(data["reglas"]["creditos"], 20)','self.assertEqual(data["reglas"]["reintento_dias"], 30)'],
 'data es el retorno del overview; se comprueban los cuatro campos declarados, sin atribuir mutación académica ni verificar la normativa externa.')

REJECTED=[
 {'uc':'UC-TD-002','test':'apps/modalidades/tests_trabajo_dirigido.py:TrabajoDirigidoTest.test_gates_de_aprobacion_de_desarrollo_siguen_exigiendo_convenio_externo','reason':'La excepción asertada procede de validar_aprobacion_etapa, no de registrar_informe. La llamada de registro es preparación.'},
 {'uc':'UC-EG-001','test':'apps/modalidades/tests_examen_grado.py:ExamenGradoContenidosTest.test_reemplazo_antes_de_calificar_mantiene_composicion_evaluable','reason':'La aserción composition[evaluable] precede a registrar_evaluacion; no observa su resultado.'},
 {'uc':'UC-POS-017','test':'apps/postulantes/tests_assignments.py:AsignacionServiceTest.test_permite_rol_historico_finalizado','reason':'presidente.activo observa la asignación posterior, no el resultado ni los efectos de finalizar_asignacion.'},
 {'uc':'UC-DIP-001','test':DIP+'test_nota_fuera_de_rango_es_rechazada','reason':'Decimal fuera de rango se valida en el modelo al guardar. No demuestra el raise de conversión de texto a Decimal de set_module_result; no se vincula a esa excepción.'},
]
