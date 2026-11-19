"""Recorridos nominales separados y operaciones específicas de cada modalidad."""
import ast
from pathlib import Path
from datos_fase5 import view

ROOT=Path(__file__).resolve().parents[3]
MODALITIES=[
 ('PG','proyecto_grado','Proyecto de Grado','ProyectoGradoPolicy',
  'PG_LEGACY y PG_HITOS_V1 se conservan. PROPUESTA_APROBADA es hito/decisión del régimen correspondiente, no nueva etapa. Memorandos congelan composición y evidencia; su vigencia se calcula. Evaluación admite BRUTA_100 y lectura LEGACY_PONDERADA; no volver a ponderar aportes históricos.',
  'Aprobar revisión final y cierre documental por CierrePostulacionService\nConcluir solo con cierre/etapas obligatorias aprobadas\nReabrir cierre requiere motivo y restaura historial cuando procede'),
 ('TG','tesis_grado','Tesis de Grado','TesisGradoPolicy',
  'Temática y perfil son actos distintos. Dictámenes Tutor/Tribunal se registran con administración y evidencias propias. Evaluación admite consenso o individual bajo su policy y escalas BRUTA_100/MODALIDAD_ESPECIFICA; no aplicar semántica legacy de Proyecto.',
  'WorkflowService.concluir_postulacion\nExigir pública aprobada, resultado consolidado aprobatorio\ny ACTA_DEFENSA actual APR sin corrección vinculada a pública finalizada'),
 ('TD','trabajo_dirigido','Trabajo Dirigido','TrabajoDirigidoPolicy',
  'Institución interna/externa, convenio cuando corresponde y supervisor descrito no equivalen a actor API externo. Informes institucionales se registran por servicio propio. Importa políticas base de Proyecto pero no se generalizan sus reglas.',
  'TrabajoDirigidoService.concluir\nIniciar/aprobar CIERRE_DOCUMENTAL si corresponde sin cambiar estado general\nInvocar conclusión común con nota mínima 51 y ACTA_DEFENSA_TD del intento vigente'),
 ('EG','examen_grado','Examen de Grado','ExamenGradoPolicy',
  'Cuatro áreas con pesos de AREA_DATA, consenso o tres notas individuales. Mínimo 61 por área. Primer insuficiente: POSTERGADA, intento 2 y plazo de 15 días; segundo insuficiente: REPROBADA. No son defensas 30/70 de Proyecto.',
  'ExamenGradoService.concluir\nValidar etapas previas y documentos\nIniciar/aprobar CONCLUSION_ACADEMICA y fijar CONCLUIDA'),
 ('EA','excelencia_academica','Excelencia Académica','ExcelenciaAcademicaPolicy',
  'Criterio inmutable después de seleccionado. RENDIMIENTO_ACADEMICO requiere promedio documentado >=80; RECONOCIMIENTO_CALIDAD no admite nota numérica. FAVORABLE aprueba EVALUACION_TRIBUNAL; DESFAVORABLE no rechaza automáticamente esa etapa.',
  'ExcelenciaAcademicaService.concluir\nExigir etapas previas, resultado FAVORABLE, tribunal y documentos/acta\nIniciar/aprobar CONCLUSION_ACADEMICA y fijar CONCLUIDA'),
 ('DIP','diplomado','Vía Diplomado','DiplomadoPolicy',
  'Cinco módulos; quinto Taller de Investigación. Nota >65 aprueba módulo; guardar módulo no aprueba automáticamente su seguimiento. Defensa y reintento se rigen por Diplomado. Overview puede inicializar módulos auxiliares.',
  'DiplomadoService.conclude\nExigir etapas previas y documentos específicos\nIniciar/aprobar CONCLUSION_ACADEMICA y fijar CONCLUIDA'),
]

for scope,module,title,policy,special,conclusion in MODALITIES:
    path=ROOT/'apps/modalidades'/f'{module}.py'
    tree=ast.parse(path.read_text(encoding='utf-8-sig'))
    data=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='STAGE_DATA' for t in n.targets))
    codes=[x[0] for x in data]
    body=['|Operación administrativa (varias solicitudes)|','start',':Resolver expediente operativo y modalidad\nNo simular este recorrido para HISTORICO;',
          'if (Policy y etapas activas coherentes) then (sí)','else (no)',':Rechazar por configuración/contexto;','stop','endif',
          ':Recorrer las etapas nominales declaradas;', 'note right']
    body += [f'{i}. {c}' for i,c in enumerate(codes,1)]
    body += ['end note','repeat',':Seleccionar la etapa/contexto operable\ny ejecutar sus operaciones académicas propias;',
             '|Backend común + policy específica|',':Validar documentos, actores, requisitos y estado\nsegún la operación y la policy de esta modalidad;',
             'if (Guarda satisfecha) then (sí)',':Aplicar efectos de la acción solicitada\nAprobación/rechazo no es avance automático universal;',
             'else (no)',':Devolver faltantes/error\nNo dar por aprobada la etapa;','stop','endif',
             '|Operación administrativa (varias solicitudes)|','repeat while (Quedan etapas/operaciones por tramitar) is (sí) not (no)',
             '|Servicio de conclusión específico|',':'+conclusion+';',
             'if (Gates propios satisfechos) then (sí)',':Formalizar CONCLUIDA por la ruta correspondiente;',
             'else (no)',':Rechazar conclusión y conservar el resultado permitido por atomic;','stop','endif','stop']
    refs=f'apps/modalidades/{module}.py:{policy} apps/postulantes/workflow.py:WorkflowService.aprobar_etapa'
    if scope=='PG': refs+=' apps/postulantes/cierre.py:CierrePostulacionService.concluir_postulacion apps/postulantes/proyecto_grado_workflow.py:ProyectoGradoWorkflowOrchestrator.autoabrir_siguiente'
    if scope=='TG': refs+=' apps/postulantes/tesis_grado_workflow.py:TesisGradoWorkflowOrchestrator.inicializar_proceso'
    if scope in {'TD','EG','EA','DIP'}:
        service={'TD':'TrabajoDirigidoService.concluir','EG':'ExamenGradoService.concluir','EA':'ExcelenciaAcademicaService.concluir','DIP':'DiplomadoService.conclude'}[scope]
        refs+=f' apps/modalidades/{module}_service.py:{service}'
    view(f'DIA-{scope}-060','Recorrido nominal y conclusión: '+title,'Actividades','PROC-'+scope+'-001','\n'.join(body),refs,
         'Vista de coordinación académica entre solicitudes; el loop no existe como un único método automático. STAGE_DATA es declaración de código, no esquema instalado. '+special)
    # Metadatos usados por fichas, cobertura y validación independiente del AST.
    from datos_fase5 import VIEWS
    VIEWS[-1]['stage_codes']=codes
    VIEWS[-1]['policy_source']=f'apps/modalidades/{module}.py'
    VIEWS[-1]['particularities']=special

# Cierre de Proyecto es un proceso distinto de la conclusión común.
view('DIA-PG-070','Cierre documental, conclusión y reapertura de Proyecto','Secuencia','PROC-PG-001',r'''
actor Administración as U
participant "ExpedientePage / postulacionesService / apiClient" as FE
participant CierreAccionView as API
participant CierrePostulacionService as S
participant "Policy de cierre de Proyecto" as P
participant WorkflowService as W
database "Postulación / seguimiento / historial\nORM → PostgreSQL" as DB
U -> FE : Seleccionar una acción de cierre
FE -> API : POST cierre/{action}/
API -> API : Exigir administración; validar observaciones/motivo
alt aprobar-cierre-documental
 API -> S : aprobar_cierre_documental()
 group atomic
  S -> DB : Bloquear postulación
  S -> P : evaluar_cierre_documental()
  alt Cumple
   S -> W : Preparar etapa si PENDIENTE\ny aprobar_etapa(actualizar_estado_general=False)
   S -> DB : Auditar y registrar evento postcommit
  else Faltantes
   S --> API : ValidationError / rollback
  end
 end
else concluir
 API -> S : concluir_postulacion()
 group atomic
  S -> DB : Bloquear postulación
  alt estado_actual.codigo == CONCLUIDA
   S --> API : Retornar postulación sin cambios\nSin auditoría ni evento de conclusión
  else No concluida
   S -> P : puede_concluir(post)
   alt No cumple cierre y etapas obligatorias
    S --> API : ValidationError / rollback\nSin actualizar, auditar ni publicar
   else Cumple
    S -> W : _actualizar_estado_general(CONCLUIDA, strict=True)
    S -> DB : Refrescar; auditar; consultar historial\ny registrar evento postcommit
    S --> API : Retornar postulación concluida
   end
  end
 end
else reabrir
 API -> S : reabrir_cierre(motivo)
 group atomic
  S -> DB : Bloquear postulación; exigir cierre APROBADA
  S -> DB : Cierre EN_PROCESO; limpiar fin/responsable\nRestaurar estado anterior si hay destino válido y distinto
  S -> DB : Auditar y registrar evento postcommit
 end
end
API --> FE : Estado de cierre o error
note over API,S : aprobar-revision-final es otra variante del mismo endpoint:\nevaluar_revision_final + preparar/aprobar etapa y auditar.\nNo se fusiona cierre aprobado con conclusión general.
''','apps/postulantes/cierre_api.py:CierreAccionView.post apps/postulantes/cierre.py:CierrePostulacionService.aprobar_cierre_documental apps/postulantes/cierre.py:CierrePostulacionService.reabrir_cierre src/services/postulacionesService.js',
 'Secuencia de variantes independientes, no acciones sucesivas de una sola petición. El callback postcommit se detalla en la vista de notificaciones. Exclusiva de la policy de cierre disponible; no extender a Tesis por analogía.')
