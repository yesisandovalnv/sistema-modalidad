// Simulación de services/postulacionesService para las pruebas del Expediente.
// Cada archivo de prueba la carga con vi.mock(..., () => import('./pruebas/servicioSimulado')).
import { vi } from 'vitest'

export const humanizeRequirementCode = (value) => {
  const code = String(value || '').split(':').pop()
  const overrides = {
    ACTA_DEFENSA: 'Acta de Defensa',
    CD_RESPALDO: 'CD de respaldo',
    HOJA_APROBACION: 'Hoja de Aprobación',
    INFORME_FINAL_TUTOR: 'Informe Final del Tutor',
    PLAN_ESTUDIOS: 'Plan de estudios',
    PLAZO_MAXIMO: 'Plazo máximo',
  }
  return overrides[code] || code.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export const postulacionesService = {
  obtenerExpediente: vi.fn(), obtenerCapacidadesModalidad: vi.fn(), inicializarFlujo: vi.fn(), iniciarEtapa: vi.fn(), aprobarEtapa: vi.fn(), obtenerHistorial: vi.fn(), obtenerActores: vi.fn(), obtenerDocumentos: vi.fn(),
  obtenerExamenGrado: vi.fn(), concluirExamenGrado: vi.fn(), obtenerExcelenciaAcademica: vi.fn(), concluirExcelenciaAcademica: vi.fn(), obtenerDiplomado: vi.fn(), obtenerTrabajoDirigido: vi.fn(), registrarInformeTrabajoDirigido: vi.fn(), concluirTrabajoDirigido: vi.fn(),
  obtenerVersiones: vi.fn(), descargarVersion: vi.fn(), obtenerObservaciones: vi.fn(), obtenerTiposDocumento: vi.fn(), obtenerTiposDocumentosHistoricos: vi.fn(), cargarDocumento: vi.fn(), subirDocumentoHistorico: vi.fn(),
  aprobarDocumento: vi.fn(), rechazarDocumento: vi.fn(), observarDocumento: vi.fn(), marcarObservacionCorregida: vi.fn(),
  obtenerDefensas: vi.fn(), obtenerQuorumDefensa: vi.fn(), programarDefensa: vi.fn(), iniciarDefensa: vi.fn(), registrarResultadoDirectoDefensa: vi.fn(),
  finalizarDefensa: vi.fn(), suspenderDefensa: vi.fn(), cancelarDefensa: vi.fn(), reprogramarDefensa: vi.fn(),
  registrarEvaluacionDefensa: vi.fn(), consolidarEvaluacionDefensa: vi.fn(), obtenerDefensa: vi.fn(), concluirAcademicamente: vi.fn(),
  obtenerAsignacionesCandidatas: vi.fn(), agregarParticipanteDefensa: vi.fn(), retirarParticipanteDefensa: vi.fn(), registrarAsistenciaDefensa: vi.fn(),
  obtenerCondiciones: vi.fn(), verificarCondicion: vi.fn(), verificarCondiciones: vi.fn(), rechazarCondicion: vi.fn(),
  obtenerEntregas: vi.fn(), crearEntregaFisica: vi.fn(), registrarEntrega: vi.fn(), registrarEntregas: vi.fn(),
  obtenerCierre: vi.fn(), aprobarRevisionFinal: vi.fn(), aprobarCierreDocumental: vi.fn(),
  concluirPostulacion: vi.fn(), reabrirCierre: vi.fn(),
  obtenerCandidatosAsignacion: vi.fn(), obtenerCandidatosElegibles: vi.fn(), obtenerTribunalesActivos: vi.fn(), asignarActor: vi.fn(), reemplazarActor: vi.fn(), finalizarAsignacion: vi.fn(), registrarDecisionAcademica: vi.fn(), obtenerMemorandumsDesignacion: vi.fn(), publicarMemorandumDesignacion: vi.fn(),
  obtenerInformesRevisionTribunal: vi.fn(), registrarInformeRevisionTribunal: vi.fn(), actualizarEvidenciaInformeRevisionTribunal: vi.fn(),
  obtenerDictamenesRevision: vi.fn(), registrarDictamenRevision: vi.fn(),
  obtenerDocumentosAplicables: vi.fn(),
}
