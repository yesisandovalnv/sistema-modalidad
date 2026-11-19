from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import hashlib

ROOT=Path.cwd(); OUT=ROOT/'docs/ingenieria/presentacion-academica/manuales'; DOCX=OUT/'manual-tecnico.docx'; USER=OUT/'manual-de-usuario.docx'
if not USER.exists(): raise SystemExit('STOP: manual usuario ausente')
USER_HASH=hashlib.sha256(USER.read_bytes()).hexdigest()
IMG=ROOT/'docs/ingenieria/presentacion-academica/fase-9/png'
FIGS=[
('ACA-05--DIA-SYS-006.png','DIA-SYS-006 · Arquitectura de componentes','Vista de componentes de alto nivel, reutilizada de fase 9.'),
('ACA-06--DIA-MOD-002.png','DIA-MOD-002 · Motor común y modalidades','Patrón de especialización; no representa un flujo universal.'),
('ACA-07--DIA-SYS-007.png','DIA-SYS-007 · Despliegue local con Compose','Configuración declarada; no acredita producción.'),
('ACA-08--DIA-POS-001.png','DIA-POS-001 · Expediente e historial','Modelo de dominio, no esquema PostgreSQL instalado.'),
('ACA-10--DIA-DOC-101.png','DIA-DOC-101 · ER lógico documental','Vista lógica; contrastar con modelos/migraciones.'),
('ACA-11--DIA-POS-105.png','DIA-POS-105 · ER lógico de defensas y evaluaciones','Vista lógica; no certifica esquema instalado.'),
('ACA-21--DIA-TG-060.png','DIA-TG-060 · Recorrido específico de Tesis','Modalidad específica; no universalizar.'),
('ACA-22--DIA-TD-060.png','DIA-TD-060 · Recorrido institucional de Trabajo Dirigido','Modalidad específica; no universalizar.'),]
assert all((IMG/f).exists() for f,_,_ in FIGS)

def shade(c,fill):
 p=c._tc.get_or_add_tcPr(); x=OxmlElement('w:shd'); x.set(qn('w:fill'),fill); p.append(x)
def setcell(c,s,b=False,col=None,size=8):
 c.text=''; p=c.paragraphs[0]; p.paragraph_format.space_after=Pt(0); r=p.add_run(str(s)); r.bold=b; r.font.name='Aptos'; r.font.size=Pt(size)
 if col:r.font.color.rgb=RGBColor.from_string(col)
 c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
def table(d,heads,rows,widths=None,size=8):
 t=d.add_table(rows=1,cols=len(heads)); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.style='Table Grid'; t.autofit=False
 h=OxmlElement('w:tblHeader'); h.set(qn('w:val'),'true'); t.rows[0]._tr.get_or_add_trPr().append(h)
 for i,x in enumerate(heads):setcell(t.rows[0].cells[i],x,True,'FFFFFF',size);shade(t.rows[0].cells[i],'17365D')
 for n,row in enumerate(rows):
  cells=t.add_row().cells
  for i,x in enumerate(row):setcell(cells[i],x,size=size); shade(cells[i],'F1F5F9') if n%2 else None
 if widths:
  for row in t.rows:
   for i,w in enumerate(widths):row.cells[i].width=Inches(w)
 d.add_paragraph().paragraph_format.space_after=Pt(1);return t
def para(d,s='',style=None,italic=False):
 p=d.add_paragraph(style=style) if style else d.add_paragraph(); p.paragraph_format.widow_control=True
 if s:p.add_run(s).italic=italic
 return p
def head(d,s,l=1):return d.add_heading(s,l)
def source(d,s):
 p=d.add_paragraph();p.paragraph_format.space_after=Pt(6);r=p.add_run('Fuentes: '+s);r.italic=True;r.font.size=Pt(8);r.font.color.rgb=RGBColor(90,100,110)
def note(d,title,s):
 t=d.add_table(rows=1,cols=1);t.style='Table Grid';c=t.cell(0,0);shade(c,'EAF2F8');c.text='';p=c.paragraphs[0];r=p.add_run(title+' ');r.bold=True;r.font.color.rgb=RGBColor.from_string('17365D');p.add_run(s);d.add_paragraph().paragraph_format.space_after=Pt(1)
def fig(d,n,item,w=5.8):
 fn,title,desc=item;p=d.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER;p.paragraph_format.space_after=Pt(1);p.add_run().add_picture(str(IMG/fn),width=Inches(w))
 p=d.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER;p.paragraph_format.space_after=Pt(1);r=p.add_run(f'Figura {n}. {title}');r.bold=True;r.font.size=Pt(8.5)
 p=d.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER;p.paragraph_format.space_after=Pt(7);r=p.add_run(desc);r.italic=True;r.font.size=Pt(8)
def bullets(d,items,ordered=False):
 for i,s in enumerate(items,1):para(d,(f'{i}. ' if ordered else '• ')+s)

d=Document(); sec=d.sections[0];sec.top_margin=Inches(.72);sec.bottom_margin=Inches(.68);sec.left_margin=Inches(.82);sec.right_margin=Inches(.82);sec.header_distance=Inches(.32);sec.footer_distance=Inches(.32)
st=d.styles['Normal'];st.font.name='Aptos';st.font.size=Pt(9.5);st.font.color.rgb=RGBColor(35,45,55);st.paragraph_format.space_after=Pt(5);st.paragraph_format.line_spacing=1.08
for nm,sz,col in [('Title',28,'17365D'),('Heading 1',16,'17365D'),('Heading 2',12,'245A81'),('Heading 3',10,'245A81')]:
 x=d.styles[nm];x.font.name='Aptos Display' if nm in ('Title','Heading 1') else 'Aptos';x.font.size=Pt(sz);x.font.bold=True;x.font.color.rgb=RGBColor.from_string(col);x.paragraph_format.space_before=Pt(10);x.paragraph_format.space_after=Pt(4)
h=sec.header.paragraphs[0];h.alignment=WD_ALIGN_PARAGRAPH.RIGHT;r=h.add_run('SISTEMA DE MODALIDADES DE GRADUACIÓN  |  MANUAL TÉCNICO');r.font.size=Pt(8);r.font.color.rgb=RGBColor.from_string('607080')
f=sec.footer.paragraphs[0];f.alignment=WD_ALIGN_PARAGRAPH.CENTER;r=f.add_run('Universidad Autónoma del Beni «José Ballivián»  ·  Ingeniería de Sistemas  ·  Página ');r.font.size=Pt(8);fld=OxmlElement('w:fldSimple');fld.set(qn('w:instr'),'PAGE');f._p.append(fld)
# Portada
para(d,'');para(d,'');p=para(d);p.alignment=WD_ALIGN_PARAGRAPH.CENTER;r=p.add_run('UNIVERSIDAD AUTÓNOMA DEL BENI\n«JOSÉ BALLIVIÁN»');r.bold=True;r.font.size=Pt(18);r.font.color.rgb=RGBColor.from_string('17365D')
p=para(d);p.alignment=WD_ALIGN_PARAGRAPH.CENTER;r=p.add_run('CARRERA DE INGENIERÍA DE SISTEMAS');r.bold=True;r.font.size=Pt(12);r.font.color.rgb=RGBColor.from_string('245A81')
for _ in range(2):para(d,'')
p=para(d);p.alignment=WD_ALIGN_PARAGRAPH.CENTER;r=p.add_run('SISTEMA DE MODALIDADES\nDE GRADUACIÓN');r.bold=True;r.font.size=Pt(25);r.font.color.rgb=RGBColor.from_string('17365D')
p=para(d);p.alignment=WD_ALIGN_PARAGRAPH.CENTER;r=p.add_run('MANUAL TÉCNICO');r.bold=True;r.font.size=Pt(22);r.font.color.rgb=RGBColor.from_string('245A81')
for _ in range(5):para(d,'')
p=para(d);p.alignment=WD_ALIGN_PARAGRAPH.CENTER;r=p.add_run('Arquitectura, instalación, configuración y operación\n\nTrinidad, Beni, Bolivia\n2026');r.font.size=Pt(12)
d.add_page_break()

head(d,'Control de versiones')
table(d,['Versión','Fecha','Descripción','Estado'],[['1.0','5 de noviembre de 2026','Primera edición de fase 13, basada en inspección estática del repositorio.','Borrador técnico para revisión académica']],[.7,1.25,3.6,1.2],8)
para(d,'No se consignan autores, tutores ni autoridades porque no fueron proporcionados.')
head(d,'Índice')
TOC=[('1. Introducción',3),('2. Objetivos',3),('3. Alcance',3),('4. Descripción general del sistema',3),('5. Arquitectura de software',3),('6. Tecnologías y versiones',5),('7. Requisitos técnicos',5),('8. Estructura del repositorio',6),('9. Arquitectura del backend',6),('10. Arquitectura del frontend',6),('11. Arquitectura de datos',7),('12. Modelo de base de datos',7),('13. API REST',10),('14. Autenticación',10),('15. Autorización y permisos',10),('16. Configuración de entornos',11),('17. Instalación',11),('18. Ejecución mediante Docker',11),('19. Migraciones',12),('20. Pruebas automatizadas',12),('21. Registro y diagnóstico de errores',13),('22. Respaldo y restauración',13),('23. Seguridad',13),('24. Mantenimiento',14),('25. Consideraciones de despliegue',14),('26. Diagramas UML',17),('27. Glosario',17),('28. Anexos',17),('Referencias técnicas',18)]
toc_paras=[]
for title,page in TOC:
 p=d.add_paragraph();p.paragraph_format.space_after=Pt(1);p.paragraph_format.tab_stops.add_tab_stop(Inches(6.15));p.add_run(title);p.add_run('\t'+str(page))
 toc_paras.append(p)
begin=OxmlElement('w:fldChar');begin.set(qn('w:fldCharType'),'begin')
instr=OxmlElement('w:instrText');instr.set(qn('xml:space'),'preserve');instr.text=' TOC \\o "1-2" \\h \\z \\u '
separate=OxmlElement('w:fldChar');separate.set(qn('w:fldCharType'),'separate')
toc_paras[0]._p.insert(0,begin);toc_paras[0]._p.insert(1,instr);toc_paras[0]._p.insert(2,separate)
end=OxmlElement('w:fldChar');end.set(qn('w:fldCharType'),'end');toc_paras[-1]._p.append(end)
note(d,'Navegación.','Paginación editorial contrastada con el renderizado local de control. Los campos de página se actualizan al abrir en Word.')
d.add_page_break()

head(d,'1. Introducción')
para(d,'Este manual describe la organización técnica del Sistema de Modalidades de Graduación a partir del código, manifiestos de dependencias, configuraciones y documentación de operación presentes en el repositorio. Permite comprender el sistema, reproducir un entorno local de desarrollo de acuerdo con instrucciones existentes y reconocer límites de lo no verificado en ejecución.')
para(d,'El contenido diferencia la configuración declarada de las versiones runtime y del estado real de una instancia. Los procedimientos indicados como documentados no se interpretan como ejecutados durante esta fase.')
source(d,'`README.md`, `docs/ARCHITECTURE.md`, `docs/ENVIRONMENT.md`, auditoría técnica de fase 11.')
head(d,'2. Objetivos')
bullets(d,['Describir arquitectura y responsabilidades de capas/aplicaciones.','Registrar tecnologías y restricciones de versión declaradas.','Documentar instalación, configuración, ejecución, migraciones, pruebas y mantenimiento usando comandos del repositorio.','Explicar controles técnicos de autenticación, autorización y protección de datos con evidencia.','Ofrecer referencias para diagnóstico sin afirmar validaciones no realizadas.'])
source(d,'Manifiestos, `core/`, `apps/`, `src/`, Dockerfiles y guías existentes.')
head(d,'3. Alcance')
para(d,'Cubre el código actual de la rama de trabajo, configuraciones versionadas, seis modalidades registradas y documentación de fases 8–11. Describe desarrollo local y el patrón de despliegue productivo propuesto en `docs/DEPLOYMENT.md`, indicando componentes ausentes o no comprobados.')
note(d,'Límite de evidencia.','No se inspeccionaron contenedores, servidor remoto, base de datos, `.env`, secretos, versiones instaladas ni estado de migraciones. No se ejecutaron migraciones, pruebas, build, respaldos ni restauraciones. Rutas API y roles se describen estáticamente.')
source(d,'`AGENTS.md`, `docs/DEPLOYMENT.md`, `docs/ENVIRONMENT.md`, fase 11.')
head(d,'4. Descripción general del sistema')
para(d,'La aplicación mantiene datos académicos y expedientes de postulaciones asociados a periodo, modalidad y estudiante. Integra usuarios, roles, catálogos, workflow por etapas, asignaciones, documentos versionados, defensas, registros de modalidad, notificaciones y reportes. Django REST Framework publica la API y React entrega la interfaz SPA.')
para(d,'El registro de modalidades se especializa mediante policies y servicios: Proyecto de Grado, Tesis de Grado, Trabajo Dirigido, Examen de Grado, Excelencia Académica y Vía Diplomado. La UI comparte expediente y componentes, pero cada policy decide capacidades de etapa, documentos, eventos, evaluación y cierre; no todo procedimiento es común.')
source(d,'`apps/modalidades/policies.py`, policies por modalidad y `src/pages/postulantes/ExpedientePage.jsx`.')
head(d,'5. Arquitectura de software')
para(d,'La arquitectura es cliente-servidor. React/React Router ejecuta en navegador; solicitudes HTTP pasan por Axios y llegan a `/api/v1/`. Django REST Framework valida/serializa, autoriza y delega dominio en servicios y policies. Django ORM persiste en PostgreSQL y archivos bajo `MEDIA_ROOT` configurado en `core/settings/base.py`.')
fig(d,1,FIGS[0],6.0)
table(d,['Capa','Responsabilidad','Evidencia'],[
('Interfaz','Rutas, layouts, formularios y vistas.','`src/routes/`, `src/pages/`, `src/components/`'),('Servicios frontend','Solicitudes, base URL, JWT y refresh.','`src/services/api.js`, `*Service.js`'),('API REST','Rutas, auth, permisos, serializers y HTTP.','`core/urls.py`, `apps/*/urls.py`, `views.py`'),('Dominio','Validaciones y coordinación de procesos académicos.','`apps/postulantes/`, `documentos/`, `modalidades/`'),('Persistencia','Modelos y archivos multimedia.','`apps/*/models.py`, `migrations/`, `media/`'),('Infraestructura local','DB, backend y Vite dev server.','Compose y Dockerfiles')],[1.1,2.8,2.1],8)
source(d,'`docs/ARCHITECTURE.md` contrastado con código; figura DIA-SYS-006, fase 9.')
head(d,'5.1 Separación compartida y específica por modalidad',2)
para(d,'Recursos comunes modelan postulaciones, etapas, documentos, asignaciones y eventos. `ModalidadPolicyRegistry` selecciona contratos específicos. `apps/modalidades/` mantiene entidades/servicios exclusivos: áreas de Examen, expediente de Excelencia, módulos de Diplomado y datos institucionales/informes de Trabajo Dirigido. Proyecto y Tesis tienen policies propias. Esta composición evita universalizar reglas.')
fig(d,2,FIGS[1],5.6)
source(d,'`apps/modalidades/policies.py`, policies/servicios específicos y figura DIA-MOD-002.')
head(d,'6. Tecnologías y versiones')
table(d,['Tecnología','Declaración verificada','Fuente / límite'],[
('Python','3.12; backend image `python:3.12-slim`.','Runtime no inspeccionado.'),('Django','6.0.7.','requirements; instalado no comprobado.'),('DRF','3.17.1.','requirements.'),('Simple JWT','5.5.1; access 15 min y refresh 7 días en base settings.','Fase 11 registró 60 min; dato desactualizado.'),('React / React DOM','^19.2.7.','package.json; runtime no inspeccionado.'),('React Router DOM','^7.18.1.','package.json.'),('Vite','^8.1.1.','package.json.'),('Tailwind CSS','^4.3.2 y plugin Vite ^4.3.2.','package.json/vite.config.'),('PostgreSQL','Imagen `postgres:15`; psycopg2-binary 2.9.12.','Tag declarado, instancia no inspeccionada.'),('Node.js','README/despliegue: Node 20; Dockerfile: `node:22-alpine`.','Discrepancia por resolver.'),('Docker Compose','Archivo Compose v2 con db/backend/frontend.','Versión CLI no consultada.')],[1.2,2.9,1.8],7.8)
note(d,'Criterio de versión.','Rangos semver y tags describen declaraciones; no acreditan versión instalada.')
source(d,'`requirements.txt`, `package.json`, README, Dockerfiles, Compose, `core/settings/base.py`.')
head(d,'7. Requisitos técnicos')
table(d,['Perfil','Requisitos identificados','Observación'],[
('Desarrollo local','Python 3.12, Node 20 según README, PostgreSQL accesible, npm, Git.','Node 20 vs imagen Node 22 debe resolverse.'),('Compose desarrollo','Docker Engine/Compose compatible; DB 5540, backend 19001, frontend 15174 por defecto.','Puertos parametrizables, no garantizados libres.'),('Despliegue propuesto','Python 3.12 con WSGI; frontend compilado a dist; PostgreSQL externo.','Gunicorn no está en requirements; manifiesto proveedor ausente.')],[1.3,2.8,1.8],8)
para(d,'No se encontraron requisitos mínimos de CPU, RAM, disco, concurrencia ni tamaño operativo; definirlos mediante medición antes de dimensionar infraestructura.')
source(d,'README, `docs/DEPLOYMENT.md`, Dockerfiles y Compose.')
head(d,'8. Estructura del repositorio')
table(d,['Ruta','Contenido'],[
('`core/`','Settings, URLs, health, permisos comunes y utilidades.'),('`apps/usuarios/`','CustomUser, roles, autenticación, capacidades y auditoría.'),('`apps/academico/`','Periodos, modalidades, etapas, requisitos y documentos oficiales.'),('`apps/postulantes/`','Postulaciones, workflow, historial, asignaciones, defensas y cierres.'),('`apps/documentos/`','Documentos, versiones, observaciones y carga/revisión.'),('`apps/modalidades/`','Registry, policies, entidades y servicios por modalidad.'),('`apps/seguimiento/`','App Django habilitada; revisar contenido vigente junto al workflow.'),('`apps/notificaciones/`','Eventos y notificaciones persistidas.'),('`apps/reportes/`','Dashboard, reportes y exportaciones.'),('`src/`','SPA: páginas, layouts, componentes, rutas, servicios, hooks y estilos.'),('`docs/`','Arquitectura, ambiente, pruebas, despliegue e ingeniería.'),('Compose/Dockerfiles','Infraestructura local y entrypoint backend.'),('Manifiestos','requirements y npm/package lockfiles.')],[2.0,4.0],8)
source(d,'Raíz e `INSTALLED_APPS` de settings.')
head(d,'9. Arquitectura del backend')
para(d,'`core.settings` carga settings base y escoge `production.py` cuando `DJANGO_ENV=production`; en otro caso usa desarrollo. `core.wsgi` expone WSGI y `core/urls.py` agrega rutas. Vistas DRF atienden HTTP, serializers validan/representan, permisos autorizan, servicios concentran lógica y modelos representan persistencia.')
table(d,['Módulo','Responsabilidad','Referencias'],[
('usuarios','CustomUser, Role, login, refresh/logout/me, capacidades.','models, views, services, urls'),('academico','Periodos, modalidades, documentos oficiales, etapas/requisitos.','`apps/academico/`'),('postulantes','Expediente, asignaciones, etapas, defensas, decisiones/cierres.','models, workflow, services, APIs'),('documentos','Archivo, versiones/hash, estados, observaciones, corrección.','models, services, views'),('modalidades','Registry, validadores y servicios específicos.','policies y `*_service.py`'),('notificaciones','Eventos de dominio y notificación por usuario.','`apps/notificaciones/`'),('reportes','Dashboard, reportes y exportaciones con límite.','views/services'),('seguimiento','App instalada; revisar junto a workflow de postulantes.','`apps/seguimiento/`')],[1.05,2.6,2.35],7.7)
para(d,'Operaciones que coordinan entidades usan `transaction.atomic` en workflow, asignaciones, documentos y servicios específicos. Comprobar cada servicio concreto antes de asumir atomicidad. Eventos de dominio pueden producir notificaciones tras commit.')
source(d,'settings, `core/urls.py`, `apps/postulantes/workflow.py`, documentos y asignaciones.')
head(d,'10. Arquitectura del frontend')
para(d,'La SPA inicia en `src/main.jsx`; rutas en `src/routes/AppRoutes.jsx`; `AuthLayout` y `MainLayout` separan acceso de experiencia autenticada. Vistas por módulo están en `src/pages/`, reutilizables en `src/components/`; expediente en `src/pages/postulantes/ExpedientePage.jsx` mezcla vistas comunes y particulares.')
para(d,'`src/config/env.js` requiere `VITE_API_BASE_URL`. `src/services/api.js` usa Axios con timeout de 10 s, añade access token Bearer de localStorage y ante 401 intenta renovar; si falla, elimina tokens y emite evento de sesión vencida.')
table(d,['Área','Archivos representativos'],[('Autenticación','`src/pages/auth/`, hooks y auth service'),('Expedientes/modalidad','`src/pages/postulantes/`, `src/pages/modalidades/`'),('Administración','usuarios, catalogs, configuracion'),('Documentos/seguimiento','páginas y componentes de documentos'),('Reportes/notificaciones','`src/pages/reports/`, `notifications/`'),('Diseño compartido','layouts, `components/ui/`, CSS')],[1.5,4.5],8)
source(d,'`AppRoutes.jsx`, `src/services/api.js`, `src/config/env.js`, package.json.')
head(d,'11. Arquitectura de datos')
para(d,'Django ORM define modelos por app y `AUTH_USER_MODEL=usuarios.CustomUser`. Migraciones versionadas describen cambios; PostgreSQL se configura mediante variables DB. Los ficheros subidos viven fuera de tablas, bajo `MEDIA_ROOT` (`media/` por defecto).')
para(d,'Compose declara volumen `sistema_modalidad_data` en datos PostgreSQL y monta `./media` en backend. La guía indica respaldar DB y media en punto temporal consistente.')
source(d,'Settings, `apps/*/models.py`, `migrations/`, Compose y despliegue.')
head(d,'12. Modelo de base de datos')
table(d,['Grupo lógico','Entidades representativas','Relación / nota'],[
('Identidad','Role, CustomUser, AuditLog, StudentLoginThrottle.','Usuario relacionado con rol/bitácora.'),('Académico','Periodo, Modalidad, EtapaModalidad, Requisito, ModalidadRequisito.','Oferta, etapas y requisitos.'),('Expediente','Postulacion, EstadoPostulacion, HistorialEstado, Observacion, SeguimientoEtapa, AsignacionPostulacion.','Postulación conecta estudiante, modalidad y periodo.'),('Documentos','Tipo/EstadoDocumento, DocumentoPostulacion, VersionDocumento, ObservacionDocumento, ConfirmacionCorreccionDocumento, DictamenRevisionDocumento.','Versiones enlazan archivo y metadatos.'),('Defensas','EventoDefensa, ParticipanteEvento, EvaluacionDefensa, decisiones académicas.','Evento vinculado a etapa y asignaciones.'),('Modalidad','ExamenArea/Evaluacion, ExcelenciaExpediente, DiplomadoModulo/Defensa, TrabajoDirigidoExpediente/Informe.','Extensiones ligadas a postulación.'),('Operación','Notificacion, EntregaFisica, CondicionPostulacion, memorandum.','Usos varían por flujo.')],[1.2,2.8,1.8],7.5)
fig(d,3,FIGS[3],5.6);fig(d,4,FIGS[4],5.4);fig(d,5,FIGS[5],5.8)
note(d,'Límite.','DIA-DOC-101 y DIA-POS-105 son ER lógicos. No sustituyen esquema físico ni certifican una instancia; contrastar modelos y migraciones aplicadas con autorización.')
source(d,'Modelos/migraciones apps; inventario fase 10; figuras DIA-POS-001, DIA-DOC-101, DIA-POS-105.')

head(d,'13. API REST')
para(d,'Prefijo general `/api/v1/`; rutas en `core/urls.py` y routers por app. DRF usa JWT y permiso autenticado por defecto, con excepciones/alcances por vista.')
table(d,['Recurso','Ruta representativa','Responsabilidad'],[
('Health','`/api/health/`','Comprobación de aplicación.'),('Auth','`/api/v1/auth/login/`, `student-login/`, `refresh/`, `logout/`, `me/`','Sesión general/estudiante.'),('Académico','`/api/v1/academico/`, `/api/v1/modalidades/{id}/capacidades/`','Catálogos y capacidades.'),('Postulaciones','`/api/v1/postulaciones/`','Expediente y acciones.'),('Workflow','`/api/v1/seguimientos-etapa/`, `/api/v1/asignaciones/`','Etapas y actores.'),('Defensas','`/api/v1/eventos-defensa/`, rutas de postulación','Eventos y evaluación.'),('Modalidades','`/api/v1/postulaciones/{id}/examen/`, `excelencia/`, `diplomado/`, `trabajo-dirigido/`','Operaciones específicas.'),('Documentos','`/api/v1/documentos/`','Carga y versionado.'),('Reportes','`/api/v1/reportes/`','Consultas/exportaciones.'),('Esquema','`/api/schema/`, `/api/docs/`','OpenAPI y Swagger.'),('Admin','`/admin/`','Panel Django.')],[1.1,3.2,1.5],7.5)
para(d,'Inventario orientativo: no contiene todos los métodos ni cuerpos HTTP. Para contrato de release, obtener OpenAPI de instancia acordada y comprobar permisos. No se levantó servidor en esta fase.')
source(d,'`core/urls.py`, routers, vistas y settings drf-spectacular.')
head(d,'14. Autenticación')
para(d,'API con Simple JWT, header `Authorization: Bearer <access>`, access 15 minutos y refresh 7 días, rotación y blacklist. La SPA almacena ambos tokens en localStorage. Login general y estudiantil tienen endpoints distintos; `MeView` devuelve perfil/capacidades.')
note(d,'Tratamiento de credenciales.','No copiar tokens a informes, capturas o logs. El almacenamiento local exige evitar scripts no confiables y usar HTTPS en producción; no se afirma una CSP u otro control no demostrado.')
source(d,'`core/settings/base.py`, `apps/usuarios/views.py`, urls y `src/services/api.js`.')
head(d,'15. Autorización y permisos')
para(d,'Roles del dominio: `ADMINISTRADOR`, `ADMINISTRACION`, `DOCENTE`, `ESTUDIANTE`. `UserCapabilitiesService` genera flags informativos. Docente recibe capacidades de dashboard/reportes; estudiante puede recibir carga de documentos y modalidad; administrador recibe todas las declaradas. Administración no equivale al rol administrador.')
para(d,'Servidor es autoridad. `core.permissions` define permisos base (usuario activo, propiedad/administrador, staff o lectura, staff); vistas añaden restricciones de objeto, propiedad, relación/asignación y policy. Sidebar y ProtectedRoute no sustituyen enforcement del backend. `is_staff_user` considera superusuario o rol de negocio Administrador; Django `is_staff` aplica a Admin.')
note(d,'Procedimiento técnico.','Para documentar una acción, comprobar permiso de vista, queryset, objeto y policy; no inferir acceso solo del botón/capability.')
source(d,'`core/permissions.py`, `apps/usuarios/services.py`, vistas y `src/routes/AppRoutes.jsx`.')
head(d,'16. Configuración de entornos')
para(d,'Settings base carga `.env` desde raíz. Mantenerlo local y privado; `.env.example` sirve de plantilla. Base declara PostgreSQL, zona America/La_Paz, `USE_TZ=True`, static/media y exportación por defecto hasta 5000 filas.')
table(d,['Variable','Uso y evidencia'],[
('`DJANGO_ENV`','Selecciona producción si vale `production`; si no, desarrollo.'),('`SECRET_KEY`','Secreto requerido explícitamente en settings producción.'),('`DEBUG`','Producción fija False; Compose fija True.'),('`ALLOWED_HOSTS`','Hosts explícitos; producción exige lista.'),('`CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`','Orígenes web/CSRF separados por comas.'),('`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`','Conexión PostgreSQL; dentro Compose host `db`, puerto 5432.'),('`FRONTEND_PORT`, `BACKEND_PORT`, `DB_HOST_PORT`','Puertos del host: defaults 15174, 19001, 5540.'),('`VITE_API_BASE_URL`','URL base backend, requerida, sin `/api` final.'),('`TIME_ZONE`','Settings default America/La_Paz; ejemplo también La_Paz.'),('`REPORT_EXPORT_MAX_ROWS`','Límite CSV; default 5000.'),('`DJANGO_SUPERUSER_USERNAME/EMAIL/PASSWORD/CI/RU`','Variables opcionales; entrypoint crea usuario si username/password existen.')],[2.7,3.3],7.6)
note(d,'Discrepancias documentales.','ENVIRONMENT.md dice America/Lima mientras settings y .env.example usan America/La_Paz. README/despliegue indican Node 20, Dockerfile usa Node 22. Auditoría fase 11 reportaba access JWT 60 min frente a 15 min efectivo. README y ARCHITECTURE contienen afirmaciones antiguas sobre policies; prevalecen implementaciones actuales. Se recomienda actualizar esas guías en tarea documental posterior.')
source(d,'`.env.example`, settings, ENVIRONMENT.md, Compose y fase 11.')
head(d,'17. Instalación')
para(d,'Comandos transcritos del README para desarrollo local. No ejecutados. Confirmar DB de desarrollo vacía: migrate cambia esquema y seed escribe catálogos.')
bullets(d,['Crear venv: `python -m venv .venv`.','Instalar: `.venv\\Scripts\\pip install -r requirements.txt`.','Copiar `.env.example` a `.env`; definir valores privados de desarrollo y host PostgreSQL.','Aplicar esquema: `.venv\\Scripts\\python manage.py migrate` (escritura).','Cargar base: `.venv\\Scripts\\python manage.py seed_initial_data` (escritura).','Crear admin: `.venv\\Scripts\\python manage.py createsuperuser`.','Instalar frontend: `npm ci`.','Iniciar Vite: `npm run dev`.'],True)
note(d,'No validado.','No se probó instalación, compatibilidad, conexión o ejecución. Usar ambiente aislado; no emplear credenciales documentales.')
source(d,'`README.md`, `.env.example`; comandos documentados, no ejecutados.')
head(d,'18. Ejecución mediante Docker')
para(d,'`docker compose up -d` inicia DB PostgreSQL 15, backend Django y frontend Vite dev server. Defaults de host: DB 5540, backend 19001, frontend 15174, configurables localmente.')
fig(d,6,FIGS[2],6)
head(d,'18.1 Comportamiento del entrypoint',2)
bullets(d,['Espera conexión PostgreSQL.','Ejecuta `python manage.py migrate` al arrancar backend.','Si existen username/password configurados, crea superusuario si no existe.','Inicia `python manage.py runserver 0.0.0.0:8000`.'],True)
note(d,'Consecuencia.','Arrancar Compose no es solo lectura: puede migrar esquema y crear usuario. No se ejecutó. Compose es de desarrollo (DEBUG True, fallbacks, mounts, servidores de desarrollo), no receta productiva.')
source(d,'Compose, Dockerfiles, `docker/backend/entrypoint.sh`, DIA-SYS-007.')
head(d,'19. Migraciones')
para(d,'Las migraciones versionadas expresan cambios de modelos. Comandos documentados:')
bullets(d,['`python manage.py makemigrations --check`: detecta cambios de modelo no reflejados; no aplica migraciones.','`python manage.py migrate --plan`: presenta plan sin aplicarlo.','`python manage.py migrate`: aplica cambios al esquema; escritura. Compose lo llama automáticamente.'])
para(d,'Antes de operar una instancia: revisar release, backup, plan, ventana, compatibilidad y reversión. Estado instalado y rollback no verificados en esta edición.')
source(d,'README, `docs/TESTING.md`, entrypoint y carpetas migrations.')
head(d,'20. Pruebas automatizadas')
table(d,['Área','Comando documentado','Cautela'],[
('Backend','`python manage.py test`','Suite Django usa base de pruebas; no apuntar a producción.'),('Reusar DB de test','`python manage.py test --keepdb`','Retiene DB de pruebas.'),('Chequeo','`python manage.py check`','Check Django.'),('Policies','`python manage.py validate_modalidad_policies`','Valida registry.'),('Frontend lint','`npm run lint`','oxlint.'),('Frontend tests','`npm run test:run`','Vitest run.'),('Build','`npm run build`','Produce dist.'),('Compose','`docker compose config`','Renderiza configuración.')],[1.35,2.55,2.1],7.8)
note(d,'Estado.','No se ejecutaron pruebas ni build, así que no se afirma que pasen. `docs/TESTING.md` advierte que pruebas documentales generan archivos temporales y no deben apuntar a media productiva.')
source(d,'README, `docs/TESTING.md`, package scripts y suites.')
head(d,'21. Registro y diagnóstico de errores')
para(d,'Settings registran `django` en INFO y `django.request` en WARNING a consola. Comandos documentados de Compose:')
bullets(d,['`docker compose logs --tail=200 backend`','`docker compose logs --tail=200 frontend`','`docker compose logs --tail=200 db`'])
bullets(d,['Anotar hora/endpoint/error sin token o datos personales.','Comparar VITE_API_BASE_URL, puertos y CORS en configuración privada.','Confirmar host/puerto DB y credenciales sin copiarlos a tickets.','Para 401/403 revisar auth, rol, permiso, objeto y policy; 400 indica validación; 5xx requiere revisar servicios.','Consultar OpenAPI de la versión activa para contrato real.'],True)
note(d,'Límite.','No se inspeccionaron logs actuales ni se ejecutaron estos comandos; los errores visibles en interfaz no se verificaron.')
source(d,'Settings, Compose, `core/urls.py`, fase 11.')
head(d,'22. Respaldo y restauración')
para(d,'`docs/DEPLOYMENT.md` documenta un respaldo PostgreSQL y requiere respaldar `MEDIA_ROOT` en el mismo punto temporal. Ejemplos documentados:')
for cmd in ['pg_dump --format=custom --file=backup.dump "$DATABASE_URL"','pg_restore --clean --if-exists --dbname="$RESTORE_DATABASE_URL" backup.dump']:
 p=d.add_paragraph();p.paragraph_format.left_indent=Inches(.25);r=p.add_run(cmd);r.font.name='Consolas';r.font.size=Pt(8.2);r.font.color.rgb=RGBColor.from_string('17365D')
bullets(d,['Respaldar base y media coordinadas; registrar checksums.','Guardar copias con acceso/retención institucional definidos.','Probar restauración en ambiente aislado, nunca sobre producción/desarrollo existentes.','Verificar migraciones, conteos, descargas y `/api/health/` después de restaurar.'],True)
note(d,'Estado.','Comandos no ejecutados. No se encontró evidencia de política institucional, copia reciente, cifrado, retención o restauración exitosa. El mount `./backups:/docker-entrypoint-initdb.d:ro` solo provee scripts de inicialización de DB nueva; no es backup periódico.')
source(d,'`docs/DEPLOYMENT.md`, settings, Compose y fase 11.')
head(d,'23. Seguridad')
table(d,['Control evidenciado','Implementación observada','Límite'],[
('Contraseñas','Validadores Django: similitud, longitud mínima, común y numérico.','Política institucional no evaluada.'),('API','JWT requerido por defecto; endpoints auth definidos.','Revisar excepciones endpoint.'),('Permisos','Roles, DRF, propiedad/asignación y policies.','Capabilities frontend no imponen seguridad.'),('Producción','DEBUG False; exige SECRET_KEY/ALLOWED_HOSTS; SSL redirect y cookies session/CSRF secure; proxy SSL header.','Despliegue/config no auditados.'),('CORS/CSRF','Orígenes desde variables.','Valores reales no consultados.'),('Archivos','Versionado y hash SHA-256 registrado.','Antivirus, sandbox y política integral no acreditados.'),('Logging','Django a consola; AuditLog para acciones instrumentadas.','Retención/acceso/cobertura no comprobados.'),('Datos','CustomUser contiene identificadores/contacto/foto.','No exponer capturas, logs, backups o exportaciones.')],[1.25,2.65,2.1],7.3)
para(d,'Settings de desarrollo y Compose usan DEBUG/fallbacks inseguros para publicación. No reutilizarlos en producción. Mantener secretos privados; proteger `/admin/`, media, backups y logs; servir HTTPS y revisar host, proxy, CORS/CSRF. No se verificaron CSP, HSTS, rate limiting general, antivirus, cifrado de backups ni monitoreo externo, por lo que no se atribuyen al sistema.')
source(d,'Settings production/base, `core/permissions.py`, modelos usuario/documento y Compose.')
head(d,'24. Mantenimiento')
bullets(d,['Revisar dependencias y avisos de seguridad antes de actualizar; conservar lockfiles.','Monitorizar logs, espacio DB/media y health endpoint; solución de métricas/alertas no observada.','Respaldar DB/media y probar restauración conforme a política institucional.','Revisar migraciones y compatibilidad por release; no aplicar fuera de ventana aprobada.','Definir retención para auditoría/notificaciones y acceso a adjuntos/exportaciones.','Mantener separadas las reglas específicas de modalidad; revisar controles AGENTS.md antes de cambios funcionales.'])
source(d,'`docs/TESTING.md`, `docs/DEPLOYMENT.md`, `AGENTS.md`, paquetes y settings.')
head(d,'25. Consideraciones de despliegue')
para(d,'La guía existente propone backend Python 3.12 con requirements, `migrate && collectstatic --noinput`, servidor WSGI (Gunicorn de ejemplo), PostgreSQL externo y variables documentadas. Para frontend: Node 20, `npm ci && npm run build`, publicar `dist`, VITE_API_BASE_URL y rewrite SPA a `/index.html`.')
note(d,'Componentes pendientes.','No hay Gunicorn en requirements, manifiesto de proveedor, config productiva, servidor estático, storage persistente evidenciado ni pipeline comprobado. Compose ejecuta runserver/Vite dev; no es despliegue productivo.')
for number,item in [(7,FIGS[6]),(8,FIGS[7])]:
 sec=d.add_section(WD_SECTION.NEW_PAGE);sec.orientation=1;sec.page_width=Inches(11);sec.page_height=Inches(8.5);sec.top_margin=Inches(.45);sec.bottom_margin=Inches(.4);sec.left_margin=Inches(.55);sec.right_margin=Inches(.55);sec.header_distance=Inches(.2);sec.footer_distance=Inches(.2)
 fig(d,number,item,8.9)
sec=d.add_section(WD_SECTION.NEW_PAGE);sec.orientation=0;sec.page_width=Inches(8.5);sec.page_height=Inches(11);sec.top_margin=Inches(.72);sec.bottom_margin=Inches(.68);sec.left_margin=Inches(.82);sec.right_margin=Inches(.82);sec.header_distance=Inches(.32);sec.footer_distance=Inches(.32)
para(d,'Las figuras muestran ejemplos de recorrido de modalidad; no sustituyen policies actuales ni contrato API. Cada modalidad puede tener validaciones adicionales.')
source(d,'`docs/DEPLOYMENT.md`, Dockerfiles, `apps/modalidades/`, DIA-TG-060 y DIA-TD-060.')
head(d,'26. Diagramas UML')
para(d,'Se reutilizan ocho PNG de fase 9 conforme a selección de fase 11; originales SVG y PlantUML permanecen en repositorio sin modificación. Fase 10 señala siete figuras que requieren formato grande/enlace para legibilidad: las vistas en página ayudan a lectura y los SVG se mantienen como ampliación vectorial.')
table(d,['Figura','ID','Utilidad'],[('1','DIA-SYS-006','Arquitectura/componentes.'),('2','DIA-MOD-002','Común/específico de modalidad.'),('3','DIA-SYS-007','Compose de desarrollo declarado.'),('4','DIA-POS-001','Expediente e historial.'),('5','DIA-DOC-101','ER lógico documental.'),('6','DIA-POS-105','ER lógico defensas/evaluaciones.'),('7','DIA-TG-060','Particularidades de Tesis.'),('8','DIA-TD-060','Particularidades de Trabajo Dirigido.')],[.7,1.7,3.9],8)
para(d,'Trazabilidad visual: `fase-9/inventario-adaptaciones.md`, `fase-10/inventario-figuras.md`, `fase-11/inventario-diagramas-reutilizables.md`. No se generaron diagramas nuevos.')
source(d,'Fases 8–10; UML/ER lógico, no esquema de instancia.')
head(d,'27. Glosario')
table(d,['Término','Definición'],[('API REST','Interfaz HTTP con rutas y operaciones.'),('Capacidad','Flag de UI; no sustituye permiso backend.'),('Expediente','Postulación y datos académicos/documentales relacionados.'),('JWT','Token firmado usado como credencial.'),('Migración','Cambio versionado del esquema Django.'),('ORM','Mapeo entre objetos Python y DB relacional.'),('Policy','Contrato de dominio propio de modalidad.'),('Refresh token','Token de renovación de sesión.'),('SPA','Aplicación web de una sola página.'),('ER lógico','Vista conceptual; no acredita esquema instalado.'),('MEDIA_ROOT','Directorio de archivos subidos.')],[1.5,4.5],8)
head(d,'28. Anexos')
head(d,'Anexo A. Mapa API',2)
para(d,'Familias registradas en `core/urls.py`; revisar esquema OpenAPI de release para métodos/cuerpos completos.')
table(d,['Base','Módulo'],[('/api/health/','Salud.'),('/api/v1/auth/','Login y sesión.'),('/api/v1/usuarios/','Usuarios.'),('/api/v1/academico/','Catálogos.'),('/api/v1/postulaciones/','Expedientes.'),('/api/v1/asignaciones/','Actores.'),('/api/v1/seguimientos-etapa/','Workflow.'),('/api/v1/eventos-defensa/','Defensas.'),('/api/v1/gestion-complementaria/','Acciones complementarias.'),('/api/v1/documentos/','Documentos.'),('/api/v1/reportes/','Reportes.'),('/api/schema/, /api/docs/','OpenAPI.')],[2.7,3.3],8)
head(d,'Anexo B. Comandos y efectos',2)
table(d,['Propósito','Comando fuente','Efecto'],[('Venv','`python -m venv .venv`','Crea entorno.'),('Instalar backend','`.venv\\Scripts\\pip install -r requirements.txt`','Instala paquetes.'),('Migrar','`python manage.py migrate`','Escribe esquema.'),('Seed','`python manage.py seed_initial_data`','Escribe catálogos.'),('Admin','`python manage.py createsuperuser`','Crea usuario.'),('Frontend','`npm ci`; `npm run dev`','Instala/inicia Vite.'),('Compose','`docker compose up -d`','Inicia; entrypoint migra.'),('Tests/build','`manage.py test`, lint, Vitest, build','No ejecutados en fase.'),('Backup/restore','pg_dump / pg_restore documentados','No ejecutados.')],[1.1,3.0,1.9],7.7)
head(d,'Anexo C. Diagnóstico inicial',2)
bullets(d,['Registrar versión, hora y endpoint sin token/PII.','Revisar logs y health; después comprobar DB/frontend.','Comparar API URL, puertos y CORS con configuración local privada.','Distinguir 401/403, validación 400 y disponibilidad 5xx.','No corregir datos directamente en DB como diagnóstico; escalar con responsable.'],True)
head(d,'Anexo D. Referencias',2)
table(d,['Área','Referencias principales'],[('Docs operación','README, ARCHITECTURE, DEPLOYMENT, ENVIRONMENT, TESTING.'),('Infraestructura','Compose, Dockerfiles, `docker/backend/entrypoint.sh`, `.env.example`.'),('Seguridad/settings','`core/settings/`, `core/permissions.py`, `apps/usuarios/services.py`.'),('API/frontend','`core/urls.py`, `apps/*/urls.py`, `src/routes/AppRoutes.jsx`, `src/services/api.js`.'),('Datos/dominio','modelos, migraciones, `apps/modalidades/`.'),('Ingeniería','`docs/ingenieria/`, fases 9–11.'),('Fase 8','Los Markdown están directamente en `presentacion-academica/`; no hay subdirectorio `fase-8/`.'),('Fase 10','JSON de publicación conserva estados discrepantes; el informe declara finalización; aclaración editorial pendiente.')],[1.4,4.6],7.3)
source(d,'Repositorio inspeccionado el 5 de noviembre de 2026.')

u=OxmlElement('w:updateFields');u.set(qn('w:val'),'true');d.settings._element.append(u)
d.core_properties.title='Manual Técnico — Sistema de Modalidades de Graduación';d.core_properties.subject='Arquitectura, instalación, configuración y mantenimiento';d.core_properties.author='Universidad Autónoma del Beni «José Ballivián»';d.core_properties.keywords='manual técnico, Django, React, PostgreSQL'
d.save(DOCX)
print(f'CREATED {DOCX} ({DOCX.stat().st_size} bytes); USER_HASH_BEFORE={USER_HASH}')
