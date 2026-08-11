from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APITestCase

from apps.academico.models import EtapaModalidad,Modalidad,Periodo
from apps.postulantes.cierre import CierrePostulacionService,ProyectoGradoCierrePolicy
from apps.postulantes.models import (AsignacionPostulacion,CondicionPostulacion,EntregaFisica,
    EstadoPostulacion,EvaluacionDefensa,EventoDefensa,HistorialEstado,Postulacion,SeguimientoEtapa)
from apps.usuarios.models import AuditLog,Role

User=get_user_model()

class Base:
    def setUp(self):
        super().setUp(); ar=Role.objects.create(codigo="ADMCIE",nombre="Admin cierre"); sr=Role.objects.create(codigo="ESTCIE",nombre="Estudiante cierre"); dr=Role.objects.create(codigo="DOCCIE",nombre="Docente cierre")
        self.admin=User.objects.create_user(username="admincie",role=ar,is_staff=True); self.student=User.objects.create_user(username="estcie",role=sr); self.other=User.objects.create_user(username="othercie",role=sr); self.doc=User.objects.create_user(username="doccie",role=dr)
        mod=Modalidad.objects.create(codigo="PROYECTO_GRADO",nombre="Proyecto grado cierre"); period=Periodo.objects.create(nombre="2026-CIE",gestion=2026,semestre="I",fecha_inicio="2026-01-01",fecha_fin="2026-12-31")
        self.registered=EstadoPostulacion.objects.create(codigo="REGISTRADA",nombre="Registrada cierre"); self.concluded=EstadoPostulacion.objects.create(codigo="CONCLUIDA",nombre="Concluida cierre")
        self.post=Postulacion.objects.create(codigo="POST-CIE",estudiante=self.student,modalidad=mod,periodo=period,estado_actual=self.registered)
        self.other_post=Postulacion.objects.create(codigo="POST-OTRA-CIE",estudiante=self.other,modalidad=mod,periodo=period,estado_actual=self.registered)
        codes=("INSCRIPCION","PERFIL_PROYECTO","DOCUMENTO_FINAL","REVISION_TRIBUNAL_PREVIA","DEFENSA_PRIVADA","DEFENSA_PUBLICA","REVISION_FINAL_POST_PUBLICA","CIERRE_DOCUMENTAL")
        self.stages={}
        for order,code in enumerate(codes,1):
            stage=EtapaModalidad.objects.create(modalidad=mod,codigo=code,nombre=code,orden=order,obligatoria=True,origen_normativo="Normativa")
            state="APROBADA" if order<=6 else "PENDIENTE"
            self.stages[code]=SeguimientoEtapa.objects.create(postulacion=self.post,etapa=stage,estado=state)
        self.event=EventoDefensa.objects.create(postulacion=self.post,seguimiento_etapa=self.stages["DEFENSA_PUBLICA"],tipo_evento="DEFENSA_PUBLICA",estado="FINALIZADA",fecha_programada="2026-06-01T10:00:00Z",lugar="Sala",programado_por=self.admin)
        self.evaluation=EvaluacionDefensa.objects.create(evento=self.event,tipo_evaluacion="RESULTADO_FINAL",modalidad_registro="CONSENSO",resultado_cualitativo="APROBADO",nota_numerica=Decimal("60"),ponderacion=Decimal("70"),aporte_ponderado=Decimal("60"),es_resultado_final_evento=True,registrado_por=self.admin)
        private_event=EventoDefensa.objects.create(postulacion=self.post,seguimiento_etapa=self.stages["DEFENSA_PRIVADA"],tipo_evento="DEFENSA_PRIVADA",estado="FINALIZADA",fecha_programada="2026-05-01T10:00:00Z",lugar="Sala",programado_por=self.admin)
        EvaluacionDefensa.objects.create(evento=private_event,tipo_evaluacion="RESULTADO_FINAL",modalidad_registro="CONSENSO",resultado_cualitativo="SUFICIENTE",nota_numerica=Decimal("24"),ponderacion=Decimal("30"),aporte_ponderado=Decimal("24"),es_resultado_final_evento=True,registrado_por=self.admin)
        self.assignment=AsignacionPostulacion.objects.create(postulacion=self.post,usuario=self.doc,tipo_participacion="TUTOR",designado_por=self.admin)

    def requirements(self):
        for code,label in CondicionPostulacion.Tipo.choices: CondicionPostulacion.objects.create(postulacion=self.post,codigo=code,tipo=code,nombre=label,estado="CUMPLE",fecha_verificacion="2026-06-01T10:00:00Z",verificado_por=self.admin)
        for code,label in EntregaFisica.Tipo.choices:
            if code!="FOLDER_AMARILLO": EntregaFisica.objects.create(postulacion=self.post,codigo=code,nombre=label,estado="COMPLETA",cantidad_recibida=1,fecha_entrega="2026-06-01T10:00:00Z",recibido_por=self.admin)

class PolicyServiceTests(Base,TestCase):
    def test_revision_exige_defensa_evento_y_evaluacion(self):
        self.assertTrue(ProyectoGradoCierrePolicy.evaluar_revision_final(self.post)["cumple"])
        self.stages["DEFENSA_PUBLICA"].estado="PENDIENTE"; self.stages["DEFENSA_PUBLICA"].save()
        self.assertIn("DEFENSA_PUBLICA_APROBADA",ProyectoGradoCierrePolicy.obtener_faltantes_revision_final(self.post))

    def test_revision_rechaza_evento_cancelado_o_evaluacion_invalida(self):
        self.event.estado="CANCELADA"; self.event.save(); self.assertIn("EVENTO_DEFENSA_PUBLICA_FINALIZADO",ProyectoGradoCierrePolicy.obtener_faltantes_revision_final(self.post))
        self.event.estado="FINALIZADA"; self.event.save(); self.evaluation.resultado_cualitativo="POSTERGADO"; self.evaluation.save()
        self.evaluation.nota_numerica=None; self.evaluation.aporte_ponderado=None; self.evaluation.save()
        self.assertIn("EVALUACION_PUBLICA_CONSOLIDADA_VALIDA",ProyectoGradoCierrePolicy.obtener_faltantes_revision_final(self.post))

    def test_revision_exige_resultado_final_completo_y_aprobatorio(self):
        private=self.post.eventos_defensa.get(tipo_evento="DEFENSA_PRIVADA")
        private.evaluaciones.all().delete()
        self.assertIn("RESULTADO_FINAL_COMPLETO",ProyectoGradoCierrePolicy.obtener_faltantes_revision_final(self.post))
        EvaluacionDefensa.objects.create(evento=private,tipo_evaluacion="RESULTADO_FINAL",modalidad_registro="CONSENSO",resultado_cualitativo="INSUFICIENTE",nota_numerica=Decimal("0"),ponderacion=Decimal("30"),aporte_ponderado=Decimal("0"),es_resultado_final_evento=True,registrado_por=self.admin)
        self.evaluation.nota_numerica=Decimal("50"); self.evaluation.aporte_ponderado=Decimal("50"); self.evaluation.save()
        self.assertIn("RESULTADO_FINAL_APROBATORIO",ProyectoGradoCierrePolicy.obtener_faltantes_revision_final(self.post))

    def test_cierre_detecta_condiciones_y_entregas(self):
        self.stages["REVISION_FINAL_POST_PUBLICA"].estado="APROBADA"; self.stages["REVISION_FINAL_POST_PUBLICA"].save()
        result=ProyectoGradoCierrePolicy.evaluar_cierre_documental(self.post)
        self.assertTrue(any(x.startswith("CONDICION:") for x in result["faltantes"])); self.assertTrue(any(x.startswith("ENTREGA:") for x in result["faltantes"]))

    def test_cierre_acepta_requisitos_y_advierte_ejemplares(self):
        self.stages["REVISION_FINAL_POST_PUBLICA"].estado="APROBADA"; self.stages["REVISION_FINAL_POST_PUBLICA"].save(); self.requirements()
        result=ProyectoGradoCierrePolicy.evaluar_cierre_documental(self.post)
        self.assertTrue(result["cumple"]); self.assertTrue(any("EJEMPLARES" in x for x in result["advertencias"]))

    def test_aprobar_revision_no_concluye_ni_aprueba_cierre(self):
        CierrePostulacionService.aprobar_revision_final(self.post,self.admin)
        self.stages["REVISION_FINAL_POST_PUBLICA"].refresh_from_db(); self.stages["CIERRE_DOCUMENTAL"].refresh_from_db(); self.post.refresh_from_db()
        self.assertEqual(self.stages["REVISION_FINAL_POST_PUBLICA"].estado,"APROBADA"); self.assertNotEqual(self.stages["CIERRE_DOCUMENTAL"].estado,"APROBADA"); self.assertNotEqual(self.post.estado_actual.codigo,"CONCLUIDA")

    def test_aprobar_cierre_no_concluye(self):
        CierrePostulacionService.aprobar_revision_final(self.post,self.admin); self.requirements(); CierrePostulacionService.aprobar_cierre_documental(self.post,self.admin)
        self.post.refresh_from_db(); self.stages["CIERRE_DOCUMENTAL"].refresh_from_db(); self.assertEqual(self.stages["CIERRE_DOCUMENTAL"].estado,"APROBADA"); self.assertNotEqual(self.post.estado_actual.codigo,"CONCLUIDA")

    def test_conclusion_idempotente_crea_historial_y_auditoria(self):
        CierrePostulacionService.aprobar_revision_final(self.post,self.admin); self.requirements(); CierrePostulacionService.aprobar_cierre_documental(self.post,self.admin); CierrePostulacionService.concluir_postulacion(self.post,self.admin,"Cierre válido")
        count=HistorialEstado.objects.filter(postulacion=self.post,estado_nuevo=self.concluded).count(); CierrePostulacionService.concluir_postulacion(self.post,self.admin)
        self.post.refresh_from_db(); self.assertEqual(self.post.estado_actual.codigo,"CONCLUIDA"); self.assertEqual(HistorialEstado.objects.filter(postulacion=self.post,estado_nuevo=self.concluded).count(),count); self.assertTrue(AuditLog.objects.filter(accion="CONCLUDE_APPLICATION").exists())

    def test_no_concluye_solo_por_defensa(self):
        with self.assertRaises(ValidationError): CierrePostulacionService.concluir_postulacion(self.post,self.admin)

    def test_reabrir_conserva_datos_y_audita(self):
        CierrePostulacionService.aprobar_revision_final(self.post,self.admin); self.requirements(); CierrePostulacionService.aprobar_cierre_documental(self.post,self.admin); CierrePostulacionService.concluir_postulacion(self.post,self.admin)
        evals=EvaluacionDefensa.objects.count(); conditions=CondicionPostulacion.objects.count(); deliveries=EntregaFisica.objects.count(); history=HistorialEstado.objects.count()
        CierrePostulacionService.reabrir_cierre(self.post,self.admin,"Corrección administrativa"); self.stages["CIERRE_DOCUMENTAL"].refresh_from_db()
        self.assertEqual(self.stages["CIERRE_DOCUMENTAL"].estado,"EN_PROCESO"); self.assertEqual((EvaluacionDefensa.objects.count(),CondicionPostulacion.objects.count(),EntregaFisica.objects.count()),(evals,conditions,deliveries)); self.assertGreaterEqual(HistorialEstado.objects.count(),history); self.assertTrue(AuditLog.objects.filter(accion="REOPEN_CLOSURE").exists())

class ApiTests(Base,APITestCase):
    def test_auth_estudiante_y_docente_lectura(self):
        url=f"/api/v1/postulaciones/{self.post.pk}/cierre/"; self.assertEqual(self.client.get(url).status_code,401)
        self.client.force_authenticate(self.student); self.assertEqual(self.client.get(url).status_code,200); self.assertEqual(self.client.post(url+"concluir/",{}).status_code,403)
        self.client.force_authenticate(self.doc); self.assertEqual(self.client.get(url).status_code,200)

    def test_estudiante_no_ve_ajena_y_patch_no_permitido(self):
        self.client.force_authenticate(self.student); self.assertEqual(self.client.get(f"/api/v1/postulaciones/{self.other_post.pk}/cierre/").status_code,404); self.assertEqual(self.client.patch(f"/api/v1/postulaciones/{self.post.pk}/cierre/",{}).status_code,405)

    def test_admin_opera_y_error_contiene_faltantes(self):
        self.client.force_authenticate(self.admin); url=f"/api/v1/postulaciones/{self.post.pk}/cierre/"
        self.assertEqual(self.client.post(url+"aprobar-revision-final/",{}).status_code,200)
        response=self.client.post(url+"aprobar-cierre-documental/",{}); self.assertEqual(response.status_code,400); self.assertIn("faltantes",response.data)

    def test_recorrido_integral_de_cierre_y_reapertura_auditada(self):
        self.client.force_authenticate(self.admin); url=f"/api/v1/postulaciones/{self.post.pk}/cierre/"
        self.assertEqual(self.client.get(url).data["puede_aprobar_revision_final"],True)
        self.assertEqual(self.client.post(url+"aprobar-revision-final/",{"observaciones":"Revisión completa"}).status_code,200)
        self.requirements()
        self.assertEqual(self.client.post(url+"aprobar-cierre-documental/",{"observaciones":"Entregas verificadas"}).status_code,200)
        concluded=self.client.post(url+"concluir/",{"observaciones":"Conclusión técnica"})
        self.assertEqual(concluded.status_code,200); self.assertTrue(concluded.data["concluida"])
        reopened=self.client.post(url+"reabrir/",{"motivo":"Corrección documental"})
        self.assertEqual(reopened.status_code,200); self.assertFalse(reopened.data["cierre_documental_aprobado"])
        self.assertTrue(AuditLog.objects.filter(accion="APPROVE_FINAL_REVIEW").exists())
        self.assertTrue(AuditLog.objects.filter(accion="APPROVE_DOCUMENTARY_CLOSURE").exists())
        self.assertTrue(AuditLog.objects.filter(accion="CONCLUDE_APPLICATION").exists())
        self.assertTrue(AuditLog.objects.filter(accion="REOPEN_CLOSURE").exists())
