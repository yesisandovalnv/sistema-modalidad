import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ExpedientePage from '../ExpedientePage'
import { postulacionesService } from '../../../services/postulacionesService'
import { AuthContext } from '../../../context/AuthContext'
import { prepararExpediente, defenseRows, deferred, response, selectInitialTab } from './pruebas/utilidades'

vi.mock('../../../services/postulacionesService', () => import('./pruebas/servicioSimulado'))

describe('ExpedientePage · Tesis de Grado', () => {
  prepararExpediente()

  describe('integración UX/UI de Tesis de Grado', () => {
    const thesisStageNames = {
      INSCRIPCION: 'Inscripción',
      TEMATICA_TESIS: 'Temática de Tesis',
      PERFIL_TESIS: 'Perfil de Tesis',
      DOCUMENTO_FINAL: 'Documento Final',
      REVISION_TUTOR: 'Revisión del Tutor',
      REVISION_TRIBUNAL: 'Revisión del Tribunal',
      DEFENSA_PRIVADA: 'Defensa Privada',
      DEFENSA_PUBLICA: 'Defensa Pública',
    }

    const thesisStageCodes = Object.keys(thesisStageNames)

    const thesisResponseFor = (stageCode, orientation, overrides = {}) => ({
      ...response,
      detalle: {
        ...response.detalle,
        modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' },
      },
      flujo: {
        ...response.flujo,
        modalidad: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' },
        etapa_actual: {
          id: 200 + thesisStageCodes.indexOf(stageCode),
          codigo: stageCode,
          nombre: thesisStageNames[stageCode],
          estado: 'EN_PROCESO',
          numero_intento: 1,
          activo: true,
          acciones_permitidas: ['aprobar'],
        },
        porcentaje_avance: Math.round((thesisStageCodes.indexOf(stageCode) / thesisStageCodes.length) * 100),
        etapas: thesisStageCodes.map((code, index) => ({
          id: 200 + index,
          codigo: code,
          nombre: thesisStageNames[code],
          estado: index < thesisStageCodes.indexOf(stageCode) ? 'APROBADA' : code === stageCode ? 'EN_PROCESO' : 'PENDIENTE',
          numero_intento: 1,
          activo: true,
        })),
        orientacion_etapa_actual: orientation,
      },
      resultado: { data: null, error: '' },
      cierre: { data: null, error: '' },
      ...overrides,
    })

    const renderThesis = (hash = 'resumen', permissions = ['puede_cargar_documentos', 'puede_gestionar_asignaciones', 'puede_gestionar_defensas', 'puede_gestionar_evaluaciones', 'puede_gestionar_seguimiento', 'puede_gestionar_cierre'], postulacionId = 7) => {
      const auth = {
        user: { id: 9, rol: { codigo: 'ADM' } },
        roleCode: 'ADM',
        hasPermission: (name) => permissions.includes(name),
      }
      selectInitialTab(hash)
      return render(
        <AuthContext.Provider value={auth}>
          <MemoryRouter initialEntries={['/postulaciones/' + postulacionId]}>
            <Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      )
    }

    it.each([
      ['INSCRIPCION', 'Completar documentos'],
      ['TEMATICA_TESIS', 'Completar tribunales'],
      ['PERFIL_TESIS', 'Completar perfil de Tesis'],
      ['DOCUMENTO_FINAL', 'Completar documentos'],
      ['REVISION_TUTOR', 'Registrar dictamen del Tutor'],
      ['REVISION_TRIBUNAL', 'Registrar dictamen del Tribunal'],
      ['DEFENSA_PRIVADA', 'Gestionar defensa'],
      ['DEFENSA_PUBLICA', 'Programar Defensa Pública'],
    ])('presenta orientación y siguiente acción para %s', async (stageCode, expectedAction) => {
      const orientation = {
        mensaje: `Orientación de ${stageCode}.`,
        requisitos: [{ tipo: 'OPERATIVO', codigo: `${stageCode}_REQUISITO`, nombre: 'Requisito de prueba', cumplido: false, estado_display: 'Pendiente', destino: '#documentos' }],
        siguiente_accion: {
          codigo: stageCode === 'TEMATICA_TESIS' ? 'GESTIONAR_ACTORES' : 'COMPLETAR_DOCUMENTOS',
          titulo: expectedAction,
          descripcion: `Siguiente acción de ${stageCode}.`,
          estado: 'PENDIENTE',
          estado_display: 'Pendiente',
          destino: stageCode === 'TEMATICA_TESIS' ? '#actores' : '#documentos',
          accion_label: stageCode === 'TEMATICA_TESIS' ? 'Ir a actores' : 'Gestionar documentos',
        },
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor(stageCode, orientation))
      renderThesis()

      expect(await screen.findByRole('heading', { name: thesisStageNames[stageCode] })).toBeInTheDocument()
      // En Perfil de Tesis el mensaje general repite la siguiente acción y no se muestra.
      if (stageCode === 'PERFIL_TESIS') expect(screen.queryByText(`Orientación de ${stageCode}.`)).not.toBeInTheDocument()
      else expect(screen.getByText(`Orientación de ${stageCode}.`)).toBeInTheDocument()
      expect(screen.getByText(expectedAction)).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
      expect(document.getElementById('panel-resumen')).toBeVisible()
    })

    it('muestra resolución académica pendiente para Temática insuficiente sin acción de aprobar', async () => {
      const message = 'La Temática obtuvo resultado INSUFICIENTE. La continuación requiere resolución académica conforme al Art. 44 del Reglamento de Tesis.'
      const orientation = {
        mensaje: message,
        requisitos: [{ tipo: 'ACADEMICO', codigo: 'RESOLUCION_ACADEMICA', nombre: 'Resolución académica conforme al Art. 44', cumplido: false, estado_display: 'Pendiente' }],
        siguiente_accion: {
          codigo: 'RESOLUCION_ACADEMICA_PENDIENTE',
          titulo: 'Resolución académica pendiente',
          descripcion: message,
          estado: 'PENDIENTE',
          estado_display: 'Pendiente',
          destino: null,
          accion_label: 'Pendiente de resolución académica',
        },
      }
      const thesisResponse = thesisResponseFor('TEMATICA_TESIS', orientation)
      thesisResponse.flujo.etapa_actual.acciones_permitidas = ['rechazar']
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponse)
      renderThesis()

      expect((await screen.findAllByText(message)).length).toBe(2)
      const nextAction = screen.getByText('Resolución académica pendiente')
        .closest('section[aria-labelledby="next-action-title"]')
      expect(nextAction).not.toBeNull()
      expect(within(nextAction).getByText('Pendiente')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Aprobar etapa' })).not.toBeInTheDocument()
    })

    it('abre directamente documentos dinámicos de TG-2026-02 sin navegar y conserva el contexto al cerrar', async () => {
      const orientation = {
        mensaje: 'Carga los documentos de inscripción pendientes.',
        requisitos: [{ tipo: 'DOCUMENTO', codigo: 'CARTA_SOLICITUD', nombre: 'Carta de solicitud', cumplido: false, estado_display: 'Pendiente', destino: '#documentos' }],
        siguiente_accion: {
          codigo: 'COMPLETAR_DOCUMENTOS',
          titulo: 'Cargar documentos',
          descripcion: 'Completa los documentos de inscripción.',
          estado: 'PENDIENTE',
          destino: '#documentos',
          accion_label: 'Gestionar documentos',
        },
      }
      const thesis = thesisResponseFor('INSCRIPCION', orientation)
      thesis.detalle = { ...thesis.detalle, id: 53, codigo: 'TG-2026-02' }
      thesis.flujo.id = 53
      postulacionesService.obtenerExpediente.mockResolvedValue(thesis)
      postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: [
        { id: 10, codigo: 'CARTA_SOLICITUD', nombre: 'Carta de Solicitud para Tesis', capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' } },
        { id: 11, codigo: 'MATRICULA_VIGENTE', nombre: 'Comprobante de Matrícula Vigente', capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' } },
        { id: 12, codigo: 'HISTORIAL_PRERREQ', nombre: 'Historial Académico de Prerrequisitos', capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' } },
      ] })
      renderThesis('resumen', undefined, 53)

      await userEvent.click(await screen.findByRole('button', { name: 'Gestionar documentos' }))
      const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
      expect(await within(dialog).findByLabelText('Carta de Solicitud para Tesis')).toBeInTheDocument()
      expect(within(dialog).getByLabelText('Comprobante de Matrícula Vigente')).toBeInTheDocument()
      expect(within(dialog).getByLabelText('Historial Académico de Prerrequisitos')).toBeInTheDocument()
      expect(screen.getAllByRole('dialog')).toHaveLength(1)
      expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledTimes(1)
      expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledWith('53', expect.any(AbortSignal))
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument())
      expect(window.location.hash).toBe('#resumen')
      expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    })

    it.each(['vacía', 'completos', 'error'])('presenta respuesta documental %s al abrir directamente desde Tesis', async (mode) => {
      const orientation = {
        requisitos: [], siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Completar documentos', estado: 'PENDIENTE', destino: '#documentos' },
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('INSCRIPCION', orientation))
      if (mode === 'error') postulacionesService.obtenerDocumentosAplicables.mockRejectedValue({ message: 'No se pudieron consultar los documentos aplicables.' })
      else postulacionesService.obtenerDocumentosAplicables.mockResolvedValue({ documentos_aplicables: mode === 'vacía' ? [] : [
        { id: 10, codigo: 'CARTA_SOLICITUD', nombre: 'Carta aprobada', capacidad_carga: { permitida: false, codigo: 'DOCUMENTO_APROBADO' } },
      ] })
      renderThesis()
      await userEvent.click(await screen.findByRole('button', { name: 'Gestionar documentos' }))
      const dialog = screen.getByRole('dialog', { name: 'Cargar documentos' })
      if (mode === 'vacía') expect(await within(dialog).findByText('No hay tipos documentales activos disponibles.')).toBeInTheDocument()
      if (mode === 'error') expect(await within(dialog).findByRole('alert')).toHaveTextContent('No se pudieron consultar los documentos aplicables.')
      if (mode === 'completos') {
        expect(await within(dialog).findByText('No hay documentos pendientes de carga o corrección permitida.')).toBeInTheDocument()
        expect(within(dialog).queryByLabelText('Carta aprobada')).not.toBeInTheDocument()
        expect(within(dialog).getByText('Aprobados (1)')).toBeInTheDocument()
      }
      expect(screen.getAllByRole('dialog')).toHaveLength(1)
      expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledTimes(1)
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('mantiene Cargar documento y no abre el modal automáticamente por hash en Tesis', async () => {
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('INSCRIPCION', {
        requisitos: [], siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', estado: 'PENDIENTE', destino: '#documentos' },
      }))
      renderThesis('documentos')
      const button = await screen.findByRole('button', { name: 'Cargar documento' })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
      await userEvent.click(button)
      await screen.findByRole('dialog', { name: 'Cargar documentos' })
      await userEvent.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(document.activeElement).toBe(button)
      expect(window.location.hash).toBe('#documentos')
      expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledTimes(1)
      await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(postulacionesService.obtenerDocumentosAplicables).toHaveBeenCalledTimes(1)
    })

    it.each(['sin permiso', 'otra acción'])('no abre la carga documental de Tesis con %s', async (mode) => {
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('INSCRIPCION', {
        requisitos: [], siguiente_accion: { codigo: mode === 'otra acción' ? 'APROBAR_ETAPA' : 'COMPLETAR_DOCUMENTOS', titulo: 'Siguiente paso', estado: 'DISPONIBLE', destino: '#documentos' },
      }))
      renderThesis('resumen', mode === 'sin permiso' ? [] : undefined)
      await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })
      expect(screen.queryByRole('button', { name: 'Gestionar documentos' })).not.toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
    })

    it('conserva la navegación documental de Tesis para acciones sin apertura directa', async () => {
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DOCUMENTO_FINAL', {
        requisitos: [], siguiente_accion: { codigo: 'GESTIONAR_DOCUMENTOS', titulo: 'Consultar documentos', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ir a documentos' },
      }))
      renderThesis()
      await userEvent.click(await screen.findByRole('link', { name: 'Ir a documentos' }))
      expect(window.location.hash).toBe('#documentos')
      expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(postulacionesService.obtenerDocumentosAplicables).not.toHaveBeenCalled()
    })

    it('abre y cierra la gestión de tribunales de Temática desde la orientación', async () => {
      const orientation = {
        mensaje: 'Designa los tres tribunales requeridos para la temática.',
        requisitos: [{ tipo: 'OPERATIVO', codigo: 'TRIBUNALES', nombre: 'Tribunales', cumplido: false, estado_display: '0/3', destino: '#actores' }],
        siguiente_accion: {
          codigo: 'GESTIONAR_ACTORES',
          titulo: 'Completar tribunales',
          descripcion: 'Designa los tres tribunales requeridos para la temática.',
          estado: 'PENDIENTE',
          destino: '#actores',
          accion_label: 'Ir a actores',
        },
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('TEMATICA_TESIS', orientation, {
        flujo: {
          ...thesisResponseFor('TEMATICA_TESIS', orientation).flujo,
          gestion_actores: {
            contexto: { seguimiento_etapa: 201, etapa_codigo: 'TEMATICA_TESIS', etapa_nombre: 'Temática de Tesis' },
            posiciones: [
              { clave: 'TRIBUNAL_1', nombre: 'Tribunal 1', tipo_participacion: 'TRIBUNAL', orden_cargo: 1, ambito: 'ETAPA', seguimiento_etapa: 201, estado_ocupacion: 'PENDIENTE', acciones_permitidas: ['ASIGNAR'], habilitada: true },
            ],
          },
        },
      }))
      postulacionesService.obtenerActores.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
      renderThesis()

      await userEvent.click(await screen.findByRole('link', { name: 'Ir a actores' }))
      expect(window.location.hash).toBe('#actores')
      expect(screen.getByRole('tab', { name: 'Actores' })).toHaveAttribute('aria-selected', 'true')
      await userEvent.click(screen.getByRole('button', { name: 'Gestionar actores' }))
      const dialog = await screen.findByRole('dialog', { name: 'Gestionar actores — Temática de Tesis' })
      expect(within(dialog).getByRole('heading', { name: 'Tribunal 1' })).toBeInTheDocument()
      await userEvent.click(within(dialog).getAllByRole('button', { name: 'Cerrar' }).at(-1))
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Gestionar actores — Temática de Tesis' })).not.toBeInTheDocument())
      expect(window.location.hash).toBe('#actores')
    })

    it('muestra el estado vacío de defensas y el error de carga sin ocultar la orientación', async () => {
      const orientation = {
        mensaje: 'La defensa privada todavía no está programada.',
        requisitos: [{ tipo: 'OPERATIVO', codigo: 'DEFENSA', nombre: 'Estado de la defensa', cumplido: false, estado_display: 'Pendiente', destino: '#defensas' }],
        siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', descripcion: 'Programa la defensa privada.', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a defensas' },
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DEFENSA_PRIVADA', orientation))
      postulacionesService.obtenerDefensas.mockRejectedValue(new Error('No se pudo cargar defensas'))
      renderThesis()

      expect(await screen.findByText('La defensa privada todavía no está programada.')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('link', { name: 'Ir a defensas' }))
      expect(window.location.hash).toBe('#defensas')
      expect(screen.getByRole('tab', { name: 'Defensas' })).toHaveAttribute('aria-selected', 'true')
      expect((await screen.findAllByRole('alert')).some((item) => item.textContent.includes('No se pudo cargar defensas'))).toBe(true)
    })

    it('muestra conclusión académica de Tesis después de Defensa Pública aprobada y acta válida', async () => {
      const publicStage = {
        id: 207,
        codigo: 'DEFENSA_PUBLICA',
        nombre: 'Defensa Pública',
        estado: 'APROBADA',
        numero_intento: 1,
        activo: true,
      }
      const acta = {
        id: 501,
        tipo_documento_codigo: 'ACTA_DEFENSA',
        tipo_documento_nombre: 'Acta de Defensa',
        estado_codigo: 'APR',
        requiere_correccion: false,
        evento_defensa: 81,
        activo: true,
        versiones: [{ id: 502, es_version_actual: true, activo: true }],
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DEFENSA_PUBLICA', {
        mensaje: 'Defensa Pública aprobada.',
        requisitos: [],
        siguiente_accion: { codigo: 'APROBAR_ETAPA', titulo: 'Aprobar etapa', descripcion: 'Resultado consolidado.', estado: 'DISPONIBLE', destino: '#resumen' },
      }, {
        flujo: {
          ...thesisResponseFor('DEFENSA_PUBLICA', {}).flujo,
          etapa_actual: publicStage,
          etapas: thesisStageCodes.map((code, index) => ({ id: 200 + index, codigo: code, nombre: thesisStageNames[code], estado: 'APROBADA', activo: true })),
        },
        resultado: { data: { nota_final: '77.00', clasificacion: 'APROBACION_PLENA' }, error: '' },
      }))
      postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 1, next: null, previous: null, results: [acta] })
      postulacionesService.obtenerDefensas.mockResolvedValue({
        count: 1, next: null, previous: null,
        results: [{ ...defenseRows[0], seguimiento_etapa: publicStage.id }],
      })
      renderThesis('resultado-y-cierre')

      expect(await screen.findByRole('heading', { name: 'Conclusión académica' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Concluir académicamente' })).toBeEnabled()
      expect(screen.getByText(/Acta de Defensa vigente vinculada/)).toBeInTheDocument()
    })

    it('no considera válida el acta aprobada del intento público anterior', async () => {
      const oldPublicStage = { id: 207, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'RECHAZADA', numero_intento: 1, activo: true }
      const currentPublicStage = { id: 208, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'APROBADA', numero_intento: 2, activo: true }
      const currentResponse = thesisResponseFor('DEFENSA_PUBLICA', {}, {
        flujo: {
          ...thesisResponseFor('DEFENSA_PUBLICA', {}).flujo,
          etapa_actual: currentPublicStage,
          etapas: [
            ...thesisStageCodes.map((code, index) => ({
              id: code === 'DEFENSA_PUBLICA' ? oldPublicStage.id : 200 + index,
              codigo: code,
              nombre: thesisStageNames[code],
              estado: code === 'DEFENSA_PUBLICA' ? oldPublicStage.estado : 'APROBADA',
              numero_intento: 1,
              activo: true,
            })),
            currentPublicStage,
          ],
        },
        resultado: { data: { nota_final: '77.00', clasificacion: 'APROBACION_PLENA' }, error: '' },
      })
      postulacionesService.obtenerExpediente.mockResolvedValue(currentResponse)
      postulacionesService.obtenerDocumentos.mockResolvedValue({
        count: 1, next: null, previous: null,
        results: [{
          id: 501, tipo_documento_codigo: 'ACTA_DEFENSA', estado_codigo: 'APR',
          requiere_correccion: false, evento_defensa: 81, activo: true,
          versiones: [{ id: 502, es_version_actual: true, activo: true }],
        }],
      })
      postulacionesService.obtenerDefensas.mockResolvedValue({
        count: 2, next: null, previous: null,
        results: [
          { ...defenseRows[0], id: 81, seguimiento_etapa: oldPublicStage.id },
          { ...defenseRows[0], id: 88, seguimiento_etapa: currentPublicStage.id },
        ],
      })
      renderThesis('resultado-y-cierre')

      expect(await screen.findByRole('heading', { name: 'Conclusión académica' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Concluir académicamente' })).toBeDisabled()
      expect(screen.getByText(/El Acta de Defensa vigente debe estar aprobada y vinculada/)).toBeInTheDocument()
    })

    it('no habilita la conclusión cuando el intento público aprobado actual no tiene acta', async () => {
      const publicStage = { id: 207, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'APROBADA', numero_intento: 1, activo: true }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DEFENSA_PUBLICA', {}, {
        flujo: {
          ...thesisResponseFor('DEFENSA_PUBLICA', {}).flujo,
          etapa_actual: publicStage,
          etapas: thesisStageCodes.map((code, index) => ({
            id: 200 + index, codigo: code, nombre: thesisStageNames[code],
            estado: 'APROBADA', numero_intento: 1, activo: true,
          })),
        },
        resultado: { data: { nota_final: '77.00', clasificacion: 'APROBACION_PLENA' }, error: '' },
      }))
      postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
      postulacionesService.obtenerDefensas.mockResolvedValue({
        count: 1, next: null, previous: null,
        results: [{ ...defenseRows[0], seguimiento_etapa: publicStage.id }],
      })
      renderThesis('resultado-y-cierre')

      expect(await screen.findByRole('heading', { name: 'Conclusión académica' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Concluir académicamente' })).toBeDisabled()
      expect(postulacionesService.concluirAcademicamente).not.toHaveBeenCalled()
    })

    it('no ofrece concluir cuando la postulación ya está concluida', async () => {
      const publicStage = { id: 207, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'APROBADA', numero_intento: 1, activo: true }
      const concludedResponse = thesisResponseFor('DEFENSA_PUBLICA', {}, {
        detalle: {
          ...response.detalle,
          modalidad_detalle: { id: 2, codigo: 'TESIS_GRADO', nombre: 'Tesis de Grado' },
          estado_actual_detalle: { id: 5, codigo: 'CONCLUIDA', nombre: 'Concluida' },
        },
        flujo: {
          ...thesisResponseFor('DEFENSA_PUBLICA', {}).flujo,
          etapa_actual: publicStage,
          etapas: thesisStageCodes.map((code, index) => ({
            id: 200 + index, codigo: code, nombre: thesisStageNames[code],
            estado: 'APROBADA', numero_intento: 1, activo: true,
          })),
        },
        resultado: { data: { nota_final: '77.00', clasificacion: 'APROBACION_PLENA' }, error: '' },
      })
      postulacionesService.obtenerExpediente.mockResolvedValue(concludedResponse)
      renderThesis('resultado-y-cierre')

      expect(await screen.findByRole('heading', { name: 'Conclusión académica' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Concluir académicamente' })).not.toBeInTheDocument()
      expect(screen.getByText('La postulación ya está concluida académicamente.')).toBeInTheDocument()
      expect(postulacionesService.concluirAcademicamente).not.toHaveBeenCalled()
    })

    it('evita envíos duplicados mientras la conclusión está pendiente', async () => {
      const pendingConclusion = deferred()
      const publicStage = { id: 207, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'APROBADA', numero_intento: 1, activo: true }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DEFENSA_PUBLICA', {}, {
        flujo: {
          ...thesisResponseFor('DEFENSA_PUBLICA', {}).flujo,
          etapa_actual: publicStage,
          etapas: thesisStageCodes.map((code, index) => ({
            id: 200 + index, codigo: code, nombre: thesisStageNames[code],
            estado: 'APROBADA', numero_intento: 1, activo: true,
          })),
        },
        resultado: { data: { nota_final: '77.00', clasificacion: 'APROBACION_PLENA' }, error: '' },
      }))
      postulacionesService.obtenerDocumentos.mockResolvedValue({
        count: 1, next: null, previous: null,
        results: [{
          id: 501, tipo_documento_codigo: 'ACTA_DEFENSA', estado_codigo: 'APR',
          requiere_correccion: false, evento_defensa: 81, activo: true,
          versiones: [{ id: 502, es_version_actual: true, activo: true }],
        }],
      })
      postulacionesService.obtenerDefensas.mockResolvedValue({
        count: 1, next: null, previous: null,
        results: [{ ...defenseRows[0], seguimiento_etapa: publicStage.id }],
      })
      postulacionesService.concluirAcademicamente.mockReturnValue(pendingConclusion.promise)
      renderThesis('resultado-y-cierre')

      const concludeButton = await screen.findByRole('button', { name: 'Concluir académicamente' })
      await userEvent.click(concludeButton)
      await userEvent.click(concludeButton)

      expect(postulacionesService.concluirAcademicamente).toHaveBeenCalledTimes(1)
      pendingConclusion.resolve({})
      expect(await screen.findByText('La postulación ya está concluida académicamente.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Concluir académicamente' })).toBeDisabled()
      await userEvent.click(screen.getByRole('button', { name: 'Concluir académicamente' }))
      expect(postulacionesService.concluirAcademicamente).toHaveBeenCalledTimes(1)
    })

    it('integra el dictamen del Tutor, refresca el expediente y conserva Documentos', async () => {
      const tutorStage = { id: 210, codigo: 'REVISION_TUTOR', nombre: 'Revisión del Tutor', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
      const orientation = {
        mensaje: 'Registra el dictamen del Tutor sobre el Documento Final.',
        requisitos: [{ tipo: 'DOCUMENTO', codigo: 'INFORME_TUTOR_TESIS', nombre: 'Informe del Tutor', cumplido: true, estado_display: 'Cumplido', destino: '#documentos' }],
        siguiente_accion: { codigo: 'REGISTRAR_DICTAMEN_TUTOR', titulo: 'Registrar dictamen del Tutor', descripcion: 'Registra el dictamen.', estado: 'DISPONIBLE', destino: '#documentos', accion_label: 'Registrar dictamen del Tutor' },
      }
      const tutorResponse = thesisResponseFor('REVISION_TUTOR', orientation, {
        flujo: {
          ...thesisResponseFor('REVISION_TUTOR', orientation).flujo,
          etapas: [tutorStage],
          etapa_actual: tutorStage,
          gestion_actores: { contexto: { seguimiento_etapa: 210, etapa_codigo: 'REVISION_TUTOR' }, posiciones: [] },
        },
      })
      const refreshed = { ...tutorResponse, flujo: { ...tutorResponse.flujo, orientacion_etapa_actual: { ...orientation, siguiente_accion: { ...orientation.siguiente_accion, estado: 'PENDIENTE', titulo: 'Esperar revisión del Tutor' } } } }
      postulacionesService.obtenerExpediente.mockResolvedValueOnce(tutorResponse).mockResolvedValue(refreshed)
      postulacionesService.obtenerDocumentos.mockResolvedValue({
        count: 3, next: null, previous: null, results: [
          { id: 501, tipo_documento_codigo: 'DOCUMENTO_FINAL', tipo_documento_nombre: 'Documento Final', activo: true, versiones: [{ id: 601, numero_version: 2, es_version_actual: true, activo: true }] },
          { id: 502, tipo_documento_codigo: 'INFORME_TUTOR_TESIS', tipo_documento_nombre: 'Informe del Tutor', activo: true, versiones: [{ id: 602, numero_version: 1, nombre_original: 'informe-tutor.pdf', es_version_actual: true, activo: true }] },
        ],
      })
      postulacionesService.obtenerActores.mockResolvedValue({ count: 1, next: null, previous: null, results: [{ id: 701, tipo_participacion: 'TUTOR', usuario_nombre: 'Dra. Tutor', activo: true }] })
      postulacionesService.obtenerDictamenesRevision.mockResolvedValue([])
      postulacionesService.registrarDictamenRevision.mockResolvedValue({ id: 801 })
      const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_seguimiento' }
      selectInitialTab('documentos')
      render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)

      const panel = await screen.findByRole('tabpanel', { name: 'Documentos' })
      const opener = await within(panel).findByRole('button', { name: 'Registrar dictamen' })
      expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
      expect(window.location.hash).toBe('#documentos')
      await userEvent.click(opener)
      const dialog = screen.getByRole('dialog', { name: 'Dictamen del Tutor' })
      await userEvent.selectOptions(within(dialog).getByLabelText('Tutor'), '701')
      await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '602')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar' }))

      await waitFor(() => expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledTimes(1))
      expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledWith(210, expect.objectContaining({ tipo_revision: 'TUTOR', version_documento_revisada: 601, evidencia_version: 602, resultado: 'SUFICIENTE', asignacion_emisora: 701 }), expect.any(AbortSignal))
      await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
      expect(window.location.hash).toBe('#documentos')
      expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
      expect(document.getElementById('panel-documentos')).toBeVisible()
      expect(screen.getByText('Esperar revisión del Tutor')).toBeInTheDocument()
    })

    it('integra el error del dictamen del Tutor sin duplicar solicitudes ni cambiar de panel', async () => {
      const tutorStage = { id: 211, codigo: 'REVISION_TUTOR', nombre: 'Revisión del Tutor', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
      const orientation = { mensaje: 'Registra el dictamen del Tutor.', requisitos: [], siguiente_accion: { codigo: 'REGISTRAR_DICTAMEN_TUTOR', titulo: 'Registrar dictamen del Tutor', estado: 'DISPONIBLE', destino: '#documentos', accion_label: 'Registrar dictamen del Tutor' } }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('REVISION_TUTOR', orientation, { flujo: { ...thesisResponseFor('REVISION_TUTOR', orientation).flujo, etapas: [tutorStage], etapa_actual: tutorStage } }))
      postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 2, next: null, previous: null, results: [
        { id: 511, tipo_documento_codigo: 'DOCUMENTO_FINAL', tipo_documento_nombre: 'Documento Final', activo: true, versiones: [{ id: 611, numero_version: 1, es_version_actual: true, activo: true }] },
        { id: 512, tipo_documento_codigo: 'INFORME_TUTOR_TESIS', tipo_documento_nombre: 'Informe del Tutor', activo: true, versiones: [{ id: 612, numero_version: 1, es_version_actual: true, activo: true }] },
      ] })
      postulacionesService.obtenerActores.mockResolvedValue({ count: 1, next: null, previous: null, results: [{ id: 711, tipo_participacion: 'TUTOR', usuario_nombre: 'Dra. Tutor', activo: true }] })
      postulacionesService.obtenerDictamenesRevision.mockResolvedValue([])
      postulacionesService.registrarDictamenRevision.mockRejectedValue({ message: 'La evidencia no es vigente.', fields: { evidencia_version: ['Selecciona una evidencia vigente.'] } })
      const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_seguimiento' }
      selectInitialTab('documentos')
      render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
      const panel = await screen.findByRole('tabpanel', { name: 'Documentos' })
      const opener = await within(panel).findByRole('button', { name: 'Registrar dictamen' })
      await userEvent.click(opener)
      const dialog = screen.getByRole('dialog', { name: 'Dictamen del Tutor' })
      await userEvent.selectOptions(within(dialog).getByLabelText('Tutor'), '711')
      await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '612')
      const submit = within(dialog).getByRole('button', { name: 'Registrar' })
      await userEvent.click(submit)
      expect(await within(dialog).findByRole('alert')).toHaveTextContent('La evidencia no es vigente.')
      expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledTimes(1)
      expect(window.location.hash).toBe('#documentos')
      expect(document.getElementById('panel-documentos')).toBeVisible()
    })

    it('integra el dictamen del Tribunal, conserva histórico y actualiza la orientación', async () => {
      const tribunalStage = { id: 212, codigo: 'REVISION_TRIBUNAL', nombre: 'Revisión del Tribunal', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
      const orientation = {
        mensaje: 'Registra el dictamen del Tribunal.',
        requisitos: [],
        siguiente_accion: { codigo: 'REGISTRAR_DICTAMEN_TRIBUNAL', titulo: 'Registrar dictamen del Tribunal', estado: 'DISPONIBLE', destino: '#documentos', accion_label: 'Registrar dictamen del Tribunal' },
      }
      const tribunalResponse = thesisResponseFor('REVISION_TRIBUNAL', orientation, {
        flujo: { ...thesisResponseFor('REVISION_TRIBUNAL', orientation).flujo, etapas: [tribunalStage], etapa_actual: tribunalStage },
      })
      const refreshed = { ...tribunalResponse, flujo: { ...tribunalResponse.flujo, orientacion_etapa_actual: { ...orientation, siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar Defensa Privada', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a defensas' } } } }
      postulacionesService.obtenerExpediente.mockResolvedValueOnce(tribunalResponse).mockResolvedValue(refreshed)
      postulacionesService.obtenerDocumentos.mockResolvedValue({ count: 2, next: null, previous: null, results: [
        { id: 521, tipo_documento_codigo: 'DOCUMENTO_FINAL', tipo_documento_nombre: 'Documento Final', activo: true, versiones: [{ id: 621, numero_version: 2, es_version_actual: true, activo: true }] },
        { id: 522, tipo_documento_codigo: 'INFORME_TRIB_TESIS', tipo_documento_nombre: 'Informe del Tribunal', activo: true, versiones: [{ id: 622, numero_version: 1, nombre_original: 'informe-tribunal.pdf', es_version_actual: true, activo: true }] },
      ] })
      postulacionesService.obtenerActores.mockResolvedValue({ count: 3, next: null, previous: null, results: [1, 2, 3].map((order) => ({ id: 720 + order, tipo_participacion: 'TRIBUNAL', orden_cargo: order, usuario_nombre: `Tribunal ${order}`, activo: true })) })
      postulacionesService.obtenerDictamenesRevision.mockResolvedValue([{ id: 901, tipo_revision: 'TRIBUNAL', resultado: 'INSUFICIENTE', resultado_display: 'Insuficiente', version_documento_revisada: 1, evidencia_version: 619, evidencia_version_nombre: 'informe-anterior.pdf', activo: false, observaciones: 'Histórico' }])
      postulacionesService.registrarDictamenRevision.mockResolvedValue({ id: 902 })
      const auth = { user: { id: 9 }, hasPermission: (name) => name === 'puede_gestionar_seguimiento' }
      selectInitialTab('documentos')
      render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/postulaciones/7']}><Routes><Route path="/postulaciones/:id" element={<ExpedientePage />} /></Routes></MemoryRouter></AuthContext.Provider>)
      const panel = await screen.findByRole('tabpanel', { name: 'Documentos' })
      expect(await within(panel).findAllByText('Histórico')).toHaveLength(2)
      const opener = within(panel).getByRole('button', { name: 'Registrar dictamen' })
      await userEvent.click(opener)
      const dialog = screen.getByRole('dialog', { name: 'Dictamen del Tribunal' })
      await userEvent.selectOptions(within(dialog).getByLabelText('Evidencia'), '622')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar' }))
      await waitFor(() => expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledTimes(1))
      expect(postulacionesService.registrarDictamenRevision).toHaveBeenCalledWith(212, expect.objectContaining({ tipo_revision: 'TRIBUNAL', version_documento_revisada: 621, evidencia_version: 622, resultado: 'SUFICIENTE' }), expect.any(AbortSignal))
      await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
      expect(window.location.hash).toBe('#documentos')
      expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('Programar Defensa Privada')).toBeInTheDocument()
    })

    it.each([
      ['TEMATICA_TESIS', 'DEFENSA_TEMATICA', 'resumen', 1],
      ['PERFIL_TESIS', 'DEFENSA_PERFIL', 'defensas', 2],
      ['DEFENSA_PRIVADA', 'DEFENSA_PRIVADA', 'resumen', 2],
      ['DEFENSA_PUBLICA', 'DEFENSA_PUBLICA', 'defensas', 1],
    ])('programa Tesis contextual %s desde %s con intento correcto', async (stageCode, eventType, origin, attempt) => {
      const orientation = {
        tipo_evento: eventType, requisitos: [],
        siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Abrir programación contextual' },
      }
      const thesis = thesisResponseFor(stageCode, orientation)
      thesis.flujo.etapa_actual.numero_intento = attempt
      thesis.flujo.etapas.find((s) => s.codigo === stageCode).numero_intento = attempt
      postulacionesService.obtenerExpediente.mockResolvedValue(thesis)
      let rejectRequest
      postulacionesService.programarDefensa.mockImplementation(() => new Promise((resolve, reject) => { rejectRequest = reject }))
      renderThesis(origin)
      const button = origin === 'resumen'
        ? await screen.findByRole('button', { name: 'Abrir programación contextual' })
        : await screen.findByRole('button', { name: /^Programar Defensa/i })
      await userEvent.click(button)
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText(new RegExp('Intento ' + attempt))).toBeInTheDocument()
      expect(within(dialog).queryByLabelText('Tipo de defensa')).not.toBeInTheDocument()
      fireEvent.change(within(dialog).getByLabelText('Fecha y hora programada'), { target: { value: '2026-10-26T14:00' } })
      fireEvent.change(within(dialog).getByLabelText('Lugar'), { target: { value: 'Sala de Tesis' } })
      const submit = within(dialog).getByRole('button', { name: /^Programar Defensa/i })
      fireEvent.click(submit)
      fireEvent.click(submit)
      expect(postulacionesService.programarDefensa).toHaveBeenCalledTimes(1)
      expect(submit).toBeDisabled()
      expect(postulacionesService.programarDefensa).toHaveBeenCalledWith(7, {
        seguimiento_etapa: thesis.flujo.etapa_actual.id, tipo_evento: eventType,
        fecha_programada: '2026-10-26T14:00', lugar: 'Sala de Tesis', modalidad_evento: 'PRESENCIAL', enlace_virtual: '', observaciones: '',
      }, expect.any(AbortSignal))
      await act(async () => { rejectRequest({ message: 'Gate académico pendiente.', fields: { fecha_programada: ['Fecha no permitida.'] } }) })
      expect(within(dialog).getByText('Gate académico pendiente.')).toBeInTheDocument()
      expect(within(dialog).getByText('Fecha no permitida.')).toBeInTheDocument()
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it.each(['incompleto', 'ambiguo', 'incompatible'])('conserva fallback genérico de Tesis con contexto %s', async (mode) => {
      const orientation = {
        ...(mode === 'incompleto' ? {} : { tipo_evento: mode === 'incompatible' ? 'DEFENSA_PUBLICA' : 'DEFENSA_PRIVADA' }),
        requisitos: [], siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', estado: 'DISPONIBLE', destino: '#defensas' },
      }
      const thesis = thesisResponseFor('DEFENSA_PRIVADA', orientation)
      if (mode === 'ambiguo') thesis.flujo.etapas.push({ ...thesis.flujo.etapa_actual, id: 999, numero_intento: 2 })
      postulacionesService.obtenerExpediente.mockResolvedValue(thesis)
      renderThesis('defensas')
      await userEvent.click(await screen.findByRole('button', { name: 'Programar defensa' }))
      const dialog = screen.getByRole('dialog', { name: 'Programar defensa' })
      expect(within(dialog).getByLabelText('Tipo de defensa')).toBeInTheDocument()
      expect(within(dialog).getByLabelText('Etapa compatible')).toBeInTheDocument()
    })

    it.each(['permiso', 'gate', 'defensa existente'])('no permite programar Tesis con %s', async (reason) => {
      const orientation = {
        tipo_evento: 'DEFENSA_PRIVADA', requisitos: [],
        siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar defensa', estado: reason === 'gate' ? 'PENDIENTE' : 'DISPONIBLE', destino: '#defensas' },
      }
      const thesis = thesisResponseFor('DEFENSA_PRIVADA', orientation)
      postulacionesService.obtenerExpediente.mockResolvedValue(thesis)
      if (reason === 'defensa existente') postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, results: [{ id: 99, seguimiento_etapa: thesis.flujo.etapa_actual.id, tipo_evento: 'DEFENSA_PRIVADA', estado: 'PROGRAMADA', numero_intento: 1, activo: true }] })
      renderThesis('defensas', reason === 'permiso' ? [] : undefined)
      await screen.findByRole('tab', { name: 'Defensas' })
      await waitFor(() => expect(document.getElementById('panel-defensas')).toBeVisible())
      expect(within(document.getElementById('panel-defensas')).queryByRole('button', { name: /^Programar/i })).not.toBeInTheDocument()
      expect(postulacionesService.programarDefensa).not.toHaveBeenCalled()
    })

    it('integra la programación de Defensa Privada de Tesis y conserva el contexto de Defensas', async () => {
      const privateStage = { id: 213, codigo: 'DEFENSA_PRIVADA', nombre: 'Defensa Privada', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
      const orientation = {
        tipo_evento: 'DEFENSA_PRIVADA',
        mensaje: 'La Defensa Privada está lista para programarse.',
        requisitos: [
          { tipo: 'ACTOR', codigo: 'TRIBUNAL', actual: 2, minimo: 2, cumplido: true, estado_display: '2/2 cumplido' },
          { tipo: 'ACTOR', codigo: 'DOCENTE_MODALIDAD', actual: 1, minimo: 1, cumplido: true, estado_display: '1/1 cumplido' },
        ],
        siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar Defensa Privada', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Programar Defensa Privada' },
      }
      const privateDefense = {
        id: 214, postulacion: 7, postulacion_modalidad_codigo: 'TESIS_GRADO', tipo_evento: 'DEFENSA_PRIVADA',
        tipo_display: 'Defensa privada', numero_intento: 1, estado: 'PROGRAMADA', estado_display: 'Programada',
        fecha_programada: '2026-10-22T14:00:00Z', lugar: 'Sala privada', modalidad_display: 'Presencial',
        etapa_codigo: 'DEFENSA_PRIVADA', etapa_nombre: 'Defensa Privada', participantes: [], evaluaciones: [], resultado_consolidado: null,
      }
      const thesis = thesisResponseFor('DEFENSA_PRIVADA', orientation, {
        flujo: { ...thesisResponseFor('DEFENSA_PRIVADA', orientation).flujo, etapas: [privateStage], etapa_actual: privateStage },
      })
      postulacionesService.obtenerExpediente.mockResolvedValue(thesis)
      let programmed = false
      postulacionesService.obtenerDefensas.mockImplementation(() => Promise.resolve({
        count: programmed ? 1 : 0, next: null, previous: null, results: programmed ? [privateDefense] : [],
      }))
      postulacionesService.programarDefensa.mockImplementation(async () => {
        programmed = true
        return privateDefense
      })
      renderThesis('defensas')

      expect(await screen.findByText('La Defensa Privada está lista para programarse.')).toBeInTheDocument()
      expect(window.location.hash).toBe('#defensas')
      expect(screen.getByRole('tab', { name: 'Defensas' })).toHaveAttribute('aria-selected', 'true')
      expect(document.getElementById('panel-defensas')).toBeVisible()
      await userEvent.click(screen.getByRole('button', { name: /Programar defensa/i }))
      const dialog = screen.getByRole('dialog', { name: 'Programar Defensa Privada' })
      expect(within(dialog).queryByLabelText('Tipo de defensa')).not.toBeInTheDocument()
      expect(within(dialog).queryByLabelText('Etapa compatible')).not.toBeInTheDocument()
      await userEvent.clear(within(dialog).getByLabelText('Fecha y hora programada'))
      await userEvent.type(within(dialog).getByLabelText('Fecha y hora programada'), '2026-10-22T14:00')
      await userEvent.type(within(dialog).getByLabelText('Lugar'), 'Sala privada')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Programar Defensa Privada' }))

      await waitFor(() => expect(postulacionesService.programarDefensa).toHaveBeenCalledWith(7, {
        seguimiento_etapa: 213, tipo_evento: 'DEFENSA_PRIVADA', fecha_programada: '2026-10-22T14:00',
        lugar: 'Sala privada', modalidad_evento: 'PRESENCIAL', enlace_virtual: '', observaciones: '',
      }, expect.any(AbortSignal)))
      await waitFor(() => expect(postulacionesService.obtenerDefensas).toHaveBeenCalled())
      expect(screen.queryByRole('dialog', { name: 'Programar Defensa Privada' })).not.toBeInTheDocument()
      expect(window.location.hash).toBe('#defensas')
      expect(document.getElementById('panel-defensas')).toBeVisible()
      expect(await screen.findByText('Programada')).toBeInTheDocument()
    })

    it('usa el resultado directo para la Defensa Pública de Tesis sin participantes ni quórum', async () => {
      const stage = { id: 215, codigo: 'DEFENSA_PUBLICA', nombre: 'Defensa Pública', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
      const orientation = { mensaje: 'Registra el resultado de la Defensa Pública.', requisitos: [], siguiente_accion: { codigo: 'GESTIONAR_DEFENSA', titulo: 'Gestionar Defensa Pública', estado: 'DISPONIBLE', destino: '#defensas' } }
      const defense = {
        id: 216, postulacion: 7, postulacion_modalidad_codigo: 'TESIS_GRADO', tipo_evento: 'DEFENSA_PUBLICA',
        tipo_display: 'Defensa pública', numero_intento: 1, estado: 'PROGRAMADA', estado_display: 'Programada',
        fecha_programada: '2026-10-25T14:00:00Z', lugar: 'Auditorio', modalidad_display: 'Presencial',
        etapa_codigo: 'DEFENSA_PUBLICA', etapa_nombre: 'Defensa Pública', participantes: [],
        composicion_formal: [
          { id: 31, usuario_nombre: 'Tribunal Uno', tipo_participacion: 'TRIBUNAL', rol_display: 'Tribunal', orden_cargo: 1 },
          { id: 32, usuario_nombre: 'Presidente Uno', tipo_participacion: 'PRESIDENTE', rol_display: 'Presidente' },
          { id: 33, usuario_nombre: 'Secretario Uno', tipo_participacion: 'SECRETARIO', rol_display: 'Secretario' },
        ],
        composicion_formal_validacion: { cumple: true, conflictos_identidad: [], requisitos: [] },
        configuracion_numerica: { minimo: 1, maximo: 100, ponderacion: 70, semantica_nota: 'BRUTA_100' },
        evaluaciones: [], resultado_consolidado: null,
      }
      const thesis = thesisResponseFor('DEFENSA_PUBLICA', orientation, { flujo: { ...thesisResponseFor('DEFENSA_PUBLICA', orientation).flujo, etapas: [stage], etapa_actual: stage } })
      postulacionesService.obtenerExpediente.mockResolvedValue(thesis)
      postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [defense] })
      const updated = { ...defense, estado: 'FINALIZADA', resultado_consolidado: { tipo_evaluacion: 'RESULTADO_FINAL', nota_numerica: '80.00' } }
      postulacionesService.registrarResultadoDirectoDefensa.mockResolvedValue(updated)
      postulacionesService.obtenerDefensa.mockResolvedValue(updated)
      renderThesis('defensas')

      await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
      const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
      expect(within(detail).getByText('Tribunal Uno')).toBeInTheDocument()
      expect(within(detail).getByText('Presidente Uno')).toBeInTheDocument()
      expect(within(detail).getByText('Secretario Uno')).toBeInTheDocument()
      expect(within(detail).queryByRole('button', { name: 'Agregar participante' })).not.toBeInTheDocument()
      expect(within(detail).queryByRole('button', { name: 'Registrar asistencia' })).not.toBeInTheDocument()
      expect(within(detail).queryByText(/Qu.rum:/)).not.toBeInTheDocument()
      await userEvent.click(within(detail).getByRole('button', { name: 'Registrar resultado y finalizar' }))
      await userEvent.type(within(detail).getByLabelText(/Nota bruta/), '80')
      await userEvent.click(within(detail).getByRole('button', { name: 'Guardar resultado' }))
      await waitFor(() => expect(postulacionesService.registrarResultadoDirectoDefensa).toHaveBeenCalledWith(
        216, { resultado: '', observaciones: '', nota: '80', semantica_nota: 'BRUTA_100' }, expect.any(AbortSignal),
        { includeFieldErrors: true },
      ))
      expect(postulacionesService.obtenerQuorumDefensa).not.toHaveBeenCalled()
      expect(postulacionesService.registrarAsistenciaDefensa).not.toHaveBeenCalled()
    })

    it('usa composición formal y resultado directo para Defensa de Temática sin participantes ni quórum', async () => {
      const stage = { id: 211, codigo: 'TEMATICA_TESIS', nombre: 'Temática de Tesis', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
      const orientation = { tipo_evento: 'DEFENSA_TEMATICA', mensaje: 'Registra el resultado de la Defensa de Temática.', requisitos: [], siguiente_accion: { codigo: 'GESTIONAR_DEFENSA', titulo: 'Gestionar Defensa de Temática', estado: 'DISPONIBLE', destino: '#defensas' } }
      const defense = {
        id: 212, postulacion: 7, postulacion_modalidad_codigo: 'TESIS_GRADO', tipo_evento: 'DEFENSA_TEMATICA',
        tipo_display: 'Defensa de temática', numero_intento: 1, estado: 'PROGRAMADA', estado_display: 'Programada',
        fecha_programada: '2026-10-25T14:00:00Z', lugar: 'Sala', modalidad_display: 'Presencial',
        etapa_codigo: 'TEMATICA_TESIS', etapa_nombre: 'Temática de Tesis', participantes: [],
        composicion_formal: [
          { id: 31, usuario_nombre: 'Tribunal Uno', tipo_participacion: 'TRIBUNAL', rol_display: 'Tribunal', orden_cargo: 1 },
          { id: 32, usuario_nombre: 'Tribunal Dos', tipo_participacion: 'TRIBUNAL', rol_display: 'Tribunal', orden_cargo: 2 },
          { id: 33, usuario_nombre: 'Tribunal Tres', tipo_participacion: 'TRIBUNAL', rol_display: 'Tribunal', orden_cargo: 3 },
        ],
        composicion_formal_validacion: { cumple: true, conflictos_identidad: [], requisitos: [] },
        evaluaciones: [], resultado_consolidado: null,
      }
      const thesis = thesisResponseFor('TEMATICA_TESIS', orientation, { flujo: { ...thesisResponseFor('TEMATICA_TESIS', orientation).flujo, etapas: [stage], etapa_actual: stage } })
      postulacionesService.obtenerExpediente.mockResolvedValue(thesis)
      postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [defense] })
      const updated = { ...defense, estado: 'FINALIZADA', resultado_consolidado: { tipo_evaluacion: 'RESULTADO_FINAL', resultado_cualitativo: 'SUFICIENTE' } }
      postulacionesService.registrarResultadoDirectoDefensa.mockResolvedValue(updated)
      postulacionesService.obtenerDefensa.mockResolvedValue(updated)
      renderThesis('defensas')

      await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
      const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
      expect(within(detail).getByText('Tribunal Uno')).toBeInTheDocument()
      expect(within(detail).getByText('Tribunal Dos')).toBeInTheDocument()
      expect(within(detail).getByText('Tribunal Tres')).toBeInTheDocument()
      expect(within(detail).queryByRole('button', { name: 'Agregar participante' })).not.toBeInTheDocument()
      expect(within(detail).queryByRole('button', { name: 'Registrar asistencia' })).not.toBeInTheDocument()
      expect(within(detail).queryByText(/Qu.rum:/)).not.toBeInTheDocument()
      await userEvent.click(within(detail).getByRole('button', { name: 'Registrar resultado y finalizar' }))
      await userEvent.click(within(detail).getByRole('button', { name: 'Guardar resultado' }))
      await waitFor(() => expect(postulacionesService.registrarResultadoDirectoDefensa).toHaveBeenCalledWith(
        212, { resultado: 'SUFICIENTE', observaciones: '' }, expect.any(AbortSignal),
        { includeFieldErrors: true },
      ))
      expect(postulacionesService.obtenerQuorumDefensa).not.toHaveBeenCalled()
      expect(postulacionesService.registrarAsistenciaDefensa).not.toHaveBeenCalled()
    })

    const programmedThematic = (overrides = {}) => {
      const stage = { id: 211, codigo: 'TEMATICA_TESIS', nombre: 'Temática de Tesis', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
      const orientation = { mensaje: 'Completa la composición del tribunal y la evaluación de la temática.', requisitos: [], siguiente_accion: { codigo: 'GESTIONAR_DEFENSA', titulo: 'Gestionar defensa', descripcion: 'La defensa está programada y debe gestionarse desde la sección de defensas.', estado: 'PENDIENTE', destino: '#defensas', accion_label: 'Ir a defensas' } }
      const defense = {
        id: 213, postulacion: 7, postulacion_modalidad_codigo: 'TESIS_GRADO', tipo_evento: 'DEFENSA_TEMATICA',
        tipo_display: 'Defensa de temática', seguimiento_etapa: 211, numero_intento: 1, estado: 'PROGRAMADA', estado_display: 'Programada',
        fecha_programada: '2026-10-25T14:00:00Z', lugar: 'Sala', modalidad_display: 'Presencial',
        etapa_codigo: 'TEMATICA_TESIS', etapa_nombre: 'Temática de Tesis', participantes: [], composicion_formal: [],
        composicion_formal_validacion: { cumple: true, conflictos_identidad: [], requisitos: [] },
        evaluaciones: [], resultado_consolidado: null, ...overrides,
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('TEMATICA_TESIS', orientation, { flujo: { ...thesisResponseFor('TEMATICA_TESIS', orientation).flujo, etapas: [stage], etapa_actual: stage } }))
      postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [defense] })
      postulacionesService.obtenerDefensa.mockResolvedValue(defense)
      return defense
    }

    it('presenta la defensa de temática programada en el Resumen y la abre directamente', async () => {
      programmedThematic()
      renderThesis()
      const summary = (await screen.findByText('Continuar Defensa de temática programada')).closest('section')
      expect(within(summary).getByText(/^Programada para el /)).toBeInTheDocument()
      expect(within(summary).queryByText('Pendiente')).not.toBeInTheDocument()
      expect(screen.queryByText('Completa la composición del tribunal y la evaluación de la temática.')).not.toBeInTheDocument()
      await userEvent.click(within(summary).getByRole('button', { name: 'Ir a la defensa' }))
      expect(await screen.findByRole('dialog', { name: 'Detalle de defensa' })).toBeInTheDocument()
    })

    it('no permite registrar el resultado antes de la fecha programada', async () => {
      programmedThematic({ fecha_programada: '2099-11-30T19:00:00Z' })
      renderThesis('defensas')
      await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
      expect(screen.queryByRole('heading', { name: 'Correcciones posteriores a Defensa Privada' })).not.toBeInTheDocument()
      const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
      expect(within(detail).getByRole('button', { name: 'Registrar resultado y finalizar' })).toBeDisabled()
      expect(within(detail).getByText(/^Podrás registrar el resultado desde el /)).toBeInTheDocument()
    })

    it('muestra las correcciones posteriores a Defensa Privada recién desde esa etapa', async () => {
      const orientation = { mensaje: 'Gestiona la Defensa Privada.', requisitos: [], siguiente_accion: { codigo: 'GESTIONAR_DEFENSA', titulo: 'Gestionar defensa', estado: 'DISPONIBLE', destino: '#defensas' } }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DEFENSA_PRIVADA', orientation))
      postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
      renderThesis('defensas')
      expect(await screen.findByRole('heading', { name: 'Correcciones posteriores a Defensa Privada' })).toBeInTheDocument()
    })

    it('presenta el Perfil de Tesis con nombres reales, sin mensaje repetido y con sus documentos', async () => {
      const orientation = {
        mensaje: 'Completa el tutor, los documentos y la defensa del perfil según corresponda.',
        requisitos: [
          { tipo: 'OPERATIVO', codigo: 'TUTOR', nombre: 'Tutor', cumplido: false, estado_display: 'Pendiente', destino: '#actores' },
          { tipo: 'OPERATIVO', codigo: 'PERFIL_TESIS', nombre: 'Perfil Tesis', cumplido: false, estado_display: 'Pendiente de carga o aprobación', destino: '#documentos' },
          { tipo: 'OPERATIVO', codigo: 'INFORME_TUTOR_TESIS', nombre: 'Informe Tutor Tesis', cumplido: false, estado_display: 'Pendiente de carga o aprobación', destino: '#documentos' },
        ],
        siguiente_accion: { codigo: 'COMPLETAR_PERFIL', titulo: 'Completar perfil de Tesis', descripcion: 'Completa el tutor y los documentos requeridos del perfil.', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ir a documentos' },
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('PERFIL_TESIS', orientation))
      renderThesis()
      const requirements = (await screen.findByRole('heading', { name: 'Requisitos de esta etapa' })).closest('section')
      expect(within(requirements).getByText('Perfil de Tesis')).toBeInTheDocument()
      expect(within(requirements).getByText('Informe del Tutor de Tesis')).toBeInTheDocument()
      expect(screen.queryByText('Perfil Tesis')).not.toBeInTheDocument()
      expect(screen.queryByText('Completa el tutor, los documentos y la defensa del perfil según corresponda.')).not.toBeInTheDocument()
      expect(screen.getByText('Completa el tutor y los documentos requeridos del perfil.')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
      const stageDocs = (await screen.findByText('Lo que pide Perfil de Tesis')).closest('section')
      expect(within(stageDocs).getByText('Perfil de Tesis')).toBeInTheDocument()
      expect(within(stageDocs).getByText('Informe del Tutor de Tesis')).toBeInTheDocument()
      expect(within(stageDocs).queryByText('Tutor')).not.toBeInTheDocument()
    })

    it('no repite el mensaje de documentos pendientes cuando solo falta aprobar la etapa', async () => {
      const orientation = {
        mensaje: 'Completa los documentos requeridos para la etapa.',
        requisitos: [{ tipo: 'OPERATIVO', codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', cumplido: true, estado_display: 'Aprobado y vigente', destino: '#documentos' }],
        siguiente_accion: { codigo: 'APROBAR_ETAPA', titulo: 'Aprobar Documento Final', descripcion: 'El Documento Final y el informe del Tutor están completos y aprobados.', estado: 'DISPONIBLE', destino: '#documentos', accion_label: 'Ir a documentos' },
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DOCUMENTO_FINAL', orientation))
      renderThesis('resumen', ['puede_gestionar_postulaciones', 'puede_cargar_documentos'])
      expect(await screen.findByRole('button', { name: 'Aprobar Documento Final' })).toBeInTheDocument()
      expect(screen.getByText('El Documento Final y el informe del Tutor están completos y aprobados.')).toBeInTheDocument()
      expect(screen.queryByText('Completa los documentos requeridos para la etapa.')).not.toBeInTheDocument()
    })

    it('muestra al tutor sin etapa como designado para toda la postulación', async () => {
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DOCUMENTO_FINAL', { mensaje: '', requisitos: [], siguiente_accion: null }))
      postulacionesService.obtenerActores.mockImplementation((_id, activo) => Promise.resolve(activo
        ? { count: 1, next: null, previous: null, results: [{ id: 40, usuario: 43, usuario_nombre: 'Tutor Uno', tipo_participacion: 'TUTOR', tipo_participacion_display: 'Tutor', etapa_nombre: null, activo: true, fecha_inicio: '2026-11-22T10:00:00Z' }] }
        : { count: 0, next: null, previous: null, results: [] }))
      renderThesis('actores')
      expect(await screen.findByText('Tutor Uno')).toBeInTheDocument()
      expect(screen.getByText('Toda la postulación')).toBeInTheDocument()
      expect(screen.queryByText('Sin etapa asociada')).not.toBeInTheDocument()
    })

    it('usa resultado directo cualitativo para Defensa de Perfil de Tesis', async () => {
      const orientation = { mensaje: 'Registra el resultado del Perfil.', requisitos: [], siguiente_accion: { codigo: 'GESTIONAR_DEFENSA', titulo: 'Gestionar defensa', estado: 'DISPONIBLE', destino: '#defensas' } }
      const defense = {
        id: 215, postulacion: 7, postulacion_modalidad_codigo: 'TESIS_GRADO', tipo_evento: 'DEFENSA_PERFIL',
        estado: 'PROGRAMADA', estado_display: 'Programada', fecha_programada: '2026-10-25T14:00:00Z',
        lugar: 'Aula', modalidad_display: 'Presencial', etapa_codigo: 'PERFIL_TESIS', etapa_nombre: 'Perfil de Tesis',
        participantes: [], composicion_formal: [{ id: 31, usuario_nombre: 'Tribunal Uno', rol_display: 'Tribunal' }, { id: 34, usuario_nombre: 'Tutor Uno', rol_display: 'Tutor' }],
        composicion_formal_validacion: { cumple: true, conflictos_identidad: [], requisitos: [] },
        evaluaciones: [], resultado_consolidado: null,
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('PERFIL_TESIS', orientation))
      postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [defense] })
      renderThesis('defensas')
      await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
      const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
      await userEvent.click(within(detail).getByRole('button', { name: 'Registrar resultado y finalizar' }))
      expect(within(detail).getByLabelText('Resultado')).toBeInTheDocument()
      expect(within(detail).getByText('Tribunal Uno')).toBeInTheDocument()
      expect(within(detail).getByText('Tutor Uno')).toBeInTheDocument()
      expect(within(detail).queryByText(/Quórum:/)).not.toBeInTheDocument()
      expect(postulacionesService.obtenerQuorumDefensa).not.toHaveBeenCalled()
    })

    it('presenta resultado directo para Defensa Privada de Tesis y mantiene escala de policy', async () => {
      const orientation = { mensaje: 'Registra el resultado de la Defensa Privada.', requisitos: [], siguiente_accion: { codigo: 'REGISTRAR_EVALUACION', titulo: 'Registrar resultado', estado: 'DISPONIBLE', destino: '#defensas' } }
      const defense = {
        id: 216, postulacion: 7, postulacion_modalidad_codigo: 'TESIS_GRADO', tipo_evento: 'DEFENSA_PRIVADA',
        tipo_display: 'Defensa privada', estado: 'PROGRAMADA', estado_display: 'Programada',
        fecha_programada: '2026-10-25T14:00:00Z', lugar: 'Aula', modalidad_display: 'Presencial',
        etapa_codigo: 'DEFENSA_PRIVADA', etapa_nombre: 'Defensa Privada', participantes: [],
        composicion_formal: [{ id: 31, usuario_nombre: 'Tribunal Uno', rol_display: 'Tribunal' }, { id: 32, usuario_nombre: 'Tribunal Dos', rol_display: 'Tribunal' }, { id: 34, usuario_nombre: 'Secretario Uno', rol_display: 'Docente de modalidad' }],
        composicion_formal_validacion: { cumple: true, conflictos_identidad: [], requisitos: [] },
        configuracion_numerica: { minimo: 0, maximo: 30, ponderacion: 30, semantica_nota: 'MODALIDAD_ESPECIFICA' },
        evaluaciones: [], resultado_consolidado: null,
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DEFENSA_PRIVADA', orientation))
      postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [defense] })
      renderThesis('defensas')

      await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
      const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
      await userEvent.click(within(detail).getByRole('button', { name: 'Registrar resultado y finalizar' }))
      expect(within(detail).getByText('Tribunal Uno')).toBeInTheDocument()
      expect(within(detail).queryByRole('button', { name: 'Agregar participante' })).not.toBeInTheDocument()
      expect(within(detail).queryByText(/Qu.rum:/)).not.toBeInTheDocument()
      expect(within(detail).getByLabelText(/Nota/)).toHaveAttribute('max', '30')
      expect(postulacionesService.obtenerQuorumDefensa).not.toHaveBeenCalled()
    })

    it('reanuda evaluaciones individuales de Defensa Privada de Tesis sin ofrecer consenso', async () => {
      const orientation = {
        mensaje: 'Continúa el resultado de la Defensa Privada.',
        requisitos: [],
        siguiente_accion: { codigo: 'REGISTRAR_EVALUACION', titulo: 'Registrar resultado', estado: 'DISPONIBLE', destino: '#defensas' },
      }
      const privateDefense = {
        id: 216, postulacion: 7, postulacion_modalidad_codigo: 'TESIS_GRADO', tipo_evento: 'DEFENSA_PRIVADA',
        tipo_display: 'Defensa privada', estado: 'EN_CURSO', estado_display: 'En curso',
        fecha_programada: '2026-10-25T14:00:00Z', lugar: 'Aula', modalidad_display: 'Presencial',
        etapa_codigo: 'DEFENSA_PRIVADA', etapa_nombre: 'Defensa Privada',
        participantes: [
          { id: 921, asignacion: 31, usuario_nombre: 'Tribunal Uno', rol_evento: 'TRIBUNAL', activo: true, presente: true },
          { id: 922, asignacion: 32, usuario_nombre: 'Tribunal Dos', rol_evento: 'TRIBUNAL', activo: true, presente: true },
          { id: 923, asignacion: 33, usuario_nombre: 'Tribunal Tres', rol_evento: 'TRIBUNAL', activo: true, presente: true },
        ],
        evaluaciones: [{
          id: 301, evento: 216, evaluador: 921, tipo_evaluacion: 'PRIVADA', modalidad_registro: 'INDIVIDUAL',
          resultado_cualitativo: 'SUFICIENTE', nota_numerica: '20.00', es_resultado_final_evento: false,
        }],
        resultado_consolidado: null,
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DEFENSA_PRIVADA', orientation))
      postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [privateDefense] })
      postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: true, conteos: { TRIBUNAL: 1 }, faltantes: {}, detalle: { TRIBUNAL: 1 } })
      renderThesis('defensas')

      await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
      const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
      expect(within(detail).getByText('1/3 evaluaciones individuales registradas')).toBeInTheDocument()
      expect(within(detail).getByText('Tribunal Uno')).toBeInTheDocument()
      await userEvent.click(within(detail).getByRole('button', { name: 'Registrar siguiente evaluación individual' }))
      expect(within(detail).getByLabelText('Modo')).toHaveValue('INDIVIDUAL')
      expect(within(detail).getByLabelText('Modo')).toBeDisabled()
      expect(within(detail).getByRole('option', { name: 'Tribunal Dos' })).toBeInTheDocument()
      expect(within(detail).queryByRole('option', { name: 'Por consenso' })).not.toBeInTheDocument()
      expect(postulacionesService.registrarEvaluacionDefensa).not.toHaveBeenCalled()
      expect(postulacionesService.finalizarDefensa).not.toHaveBeenCalled()
      expect(postulacionesService.consolidarEvaluacionDefensa).not.toHaveBeenCalled()
    })

    it('registra Defensa Pública de Tesis con resultado directo y muestra la respuesta canónica', async () => {
      const orientation = {
        mensaje: 'Registra el resultado de la Defensa Pública.',
        requisitos: [],
        siguiente_accion: { codigo: 'GESTIONAR_DEFENSA', titulo: 'Gestionar Defensa Pública', estado: 'DISPONIBLE', destino: '#defensas' },
      }
      const publicDefense = {
        id: 217, postulacion: 7, postulacion_modalidad_codigo: 'TESIS_GRADO', tipo_evento: 'DEFENSA_PUBLICA',
        tipo_display: 'Defensa pública', estado: 'EN_CURSO', estado_display: 'En curso',
        fecha_programada: '2026-10-26T14:00:00Z', lugar: 'Auditorio', modalidad_display: 'Presencial',
        etapa_codigo: 'DEFENSA_PUBLICA', etapa_nombre: 'Defensa Pública',
        participantes: [],
        composicion_formal: [
          { id: 931, usuario_nombre: 'Tribunal Uno', tipo_participacion: 'TRIBUNAL', rol_display: 'Tribunal', orden_cargo: 1 },
          { id: 932, usuario_nombre: 'Tribunal Dos', tipo_participacion: 'TRIBUNAL', rol_display: 'Tribunal', orden_cargo: 2 },
          { id: 933, usuario_nombre: 'Tribunal Tres', tipo_participacion: 'TRIBUNAL', rol_display: 'Tribunal', orden_cargo: 3 },
          { id: 934, usuario_nombre: 'Presidente Uno', tipo_participacion: 'PRESIDENTE', rol_display: 'Presidente' },
          { id: 935, usuario_nombre: 'Secretario Uno', tipo_participacion: 'SECRETARIO', rol_display: 'Secretario' },
        ],
        composicion_formal_validacion: { cumple: true, conflictos_identidad: [], requisitos: [] },
        configuracion_numerica: { minimo: 1, maximo: 100, ponderacion: 70, semantica_nota: 'BRUTA_100' },
        evaluaciones: [], resultado_consolidado: null,
      }
      const evaluatedDefense = {
        ...publicDefense,
        estado: 'FINALIZADA', estado_display: 'Finalizada',
        resultado_consolidado: { tipo_evaluacion: 'RESULTADO_FINAL', nota_numerica: '80.00' },
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DEFENSA_PUBLICA', orientation))
      postulacionesService.obtenerDefensas.mockResolvedValue({ count: 1, next: null, previous: null, results: [publicDefense] })
      postulacionesService.obtenerQuorumDefensa.mockResolvedValue({ valido: true, conteos: { TRIBUNAL: 3, PRESIDENTE: 1, SECRETARIO: 1 }, faltantes: {}, detalle: {} })
      postulacionesService.registrarResultadoDirectoDefensa.mockResolvedValue(evaluatedDefense)
      renderThesis('defensas')

      await userEvent.click(await screen.findByRole('button', { name: 'Ver defensa' }))
      const detail = screen.getByRole('dialog', { name: 'Detalle de defensa' })
      await userEvent.click(within(detail).getByRole('button', { name: 'Registrar resultado y finalizar' }))
      const input = within(detail).getByLabelText(/Nota bruta/)
      await userEvent.type(input, '80')
      await userEvent.click(within(detail).getByRole('button', { name: 'Guardar resultado' }))

      await waitFor(() => expect(postulacionesService.registrarResultadoDirectoDefensa).toHaveBeenCalledWith(
        217, { resultado: '', observaciones: '', nota: '80', semantica_nota: 'BRUTA_100' }, expect.any(AbortSignal),
        { includeFieldErrors: true },
      ))
      expect(await within(detail).findByText('Resultado: Consolidado')).toBeInTheDocument()
      expect(window.location.hash).toBe('#defensas')
      expect(document.getElementById('panel-defensas')).toBeVisible()
    })

    it('restaura el foco al botón que abrió el cargador de Tesis', async () => {
      const orientation = {
        mensaje: 'Carga los documentos pendientes.',
        requisitos: [],
        siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Cargar documentos', descripcion: 'Carga documentos.', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Gestionar documentos' },
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DOCUMENTO_FINAL', orientation))
      postulacionesService.obtenerTiposDocumento.mockResolvedValue([
        { id: 102, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', activo: true, capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' } },
      ])
      renderThesis()
      const openButton = await screen.findByRole('button', { name: 'Gestionar documentos' })
      openButton.focus()
      await userEvent.click(openButton)
      const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument())
      expect(document.activeElement).toBe(openButton)
    })

    it.each([
      ['deshabilitado', (button) => { button.disabled = true }],
      ['oculto', (button) => { button.hidden = true }],
      ['desmontado', (button) => { button.remove() }],
    ])('no enfoca el disparador %s al cerrar el cargador', async (_description, invalidateOpener) => {
      const orientation = {
        mensaje: 'Carga los documentos pendientes.',
        requisitos: [],
        siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Cargar documentos', descripcion: 'Carga documentos.', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Gestionar documentos' },
      }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('DOCUMENTO_FINAL', orientation))
      postulacionesService.obtenerTiposDocumento.mockResolvedValue([
        { id: 102, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', activo: true, capacidad_carga: { permitida: true, codigo: 'SIN_DOCUMENTO' } },
      ])
      renderThesis()
      const openButton = await screen.findByRole('button', { name: 'Gestionar documentos' })
      await userEvent.click(openButton)
      const dialog = await screen.findByRole('dialog', { name: 'Cargar documentos' })
      invalidateOpener(openButton)
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cargar documentos' })).not.toBeInTheDocument())
      expect(document.activeElement).not.toBe(openButton)
    })

    it('muestra los dictámenes del Tutor y del Tribunal solo cuando su etapa ya empezó', async () => {
      const orientation = { mensaje: '', requisitos: [], siguiente_accion: null }
      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('INSCRIPCION', orientation))
      const first = renderThesis('documentos')
      await screen.findByRole('heading', { name: 'Documentos' })
      expect(screen.queryByRole('heading', { name: 'Dictamen del Tutor' })).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Dictamen del Tribunal' })).not.toBeInTheDocument()
      first.unmount()

      postulacionesService.obtenerExpediente.mockResolvedValue(thesisResponseFor('REVISION_TUTOR', orientation))
      renderThesis('documentos')
      expect((await screen.findAllByRole('heading', { name: 'Dictamen del Tutor' })).length).toBeGreaterThan(0)
      expect(screen.queryByRole('heading', { name: 'Dictamen del Tribunal' })).not.toBeInTheDocument()
    })
  })
})
