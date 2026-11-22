import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { postulacionesService } from '../../../services/postulacionesService'
import { prepararExpediente, closureResponse, defensesResponse, expedienteIdentityCases, futureProfileOrientation, renderApplicationManagerPage, renderAssignmentManagerPage, renderOwnerPage, renderPage, renderReviewerPage, renderStudentPage, response, thesisPublicAuthoritiesResponse, trabajoDirigidoPublicDefenseResponse } from './pruebas/utilidades'

vi.mock('../../../services/postulacionesService', () => import('./pruebas/servicioSimulado'))

describe('ExpedientePage · Resumen y navegación', () => {
  prepararExpediente()

  it('muestra al estudiante una presentación resumida guiada por el contrato multimodalidad', async () => {
    const stages = Array.from({ length: 5 }, (_, index) => ({
      id: 901 + index,
      nombre: `Fase dinámica ${index + 1}`,
      orden: index + 1,
      estado: index < 2 ? 'APROBADA' : index === 2 ? 'EN_PROCESO' : 'PENDIENTE',
      estado_display: index < 2 ? 'Aprobada' : index === 2 ? 'En proceso' : 'Pendiente',
    }))
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, codigo: 'MOD-2030-01', modalidad_detalle: { id: 99, codigo: 'MODALIDAD_FUTURA', nombre: 'Modalidad futura' } },
      flujo: {
        ...response.flujo,
        modalidad: { id: 99, codigo: 'MODALIDAD_FUTURA', nombre: 'Modalidad futura' },
        porcentaje_avance: 40,
        etapas_completadas: 2,
        etapas_totales: 5,
        etapa_actual: stages[2],
        etapas: stages,
        orientacion_etapa_actual: {
          mensaje: 'Completa la actividad indicada por el engine.',
          siguiente_accion: { titulo: 'Continuar actividad', descripcion: 'Sigue la orientación académica vigente.', estado: 'PENDIENTE', estado_display: 'Pendiente' },
          requisitos: [{ tipo: 'ACADEMICO', codigo: 'REQUISITO_DINAMICO', nombre: 'Requisito dinámico', estado: 'PENDIENTE', estado_display: 'Pendiente' }],
        },
      },
    })

    renderStudentPage()

    expect(await screen.findByRole('heading', { name: 'Modalidad futura' })).toBeInTheDocument()
    // El código interno de la postulación ya no se muestra.
    expect(screen.queryByText('MOD-2030-01')).not.toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progreso académico' })).toHaveValue(40)
    expect(screen.getByText('2 de 5 etapas completadas')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fase dinámica 3' })).toBeInTheDocument()
    expect(screen.getByText('Completa la actividad indicada por el engine.')).toBeInTheDocument()
    expect(screen.getByText('Continuar actividad')).toBeInTheDocument()
    expect(screen.getByText('Requisito dinámico')).toBeInTheDocument()
    expect(screen.getAllByText('Fase dinámica 3').find((element) => element.closest('li'))?.closest('li')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('heading', { name: 'Cierre técnico' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Secciones del expediente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Documentos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Defensas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Gestión de actores' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Historial' })).not.toBeInTheDocument()
  })

  it('usa un texto de navegación documental de respaldo', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, orientacion_etapa_actual: {
      mensaje: 'Completa los documentos pendientes.', requisitos: [],
      siguiente_accion: { codigo: 'COMPLETAR_DOCUMENTOS', titulo: 'Completar documentos', estado: 'PENDIENTE', destino: '#documentos' },
    } } })

    renderStudentPage()

    expect(await screen.findByRole('link', { name: 'Ir a documentos' })).toHaveAttribute('href', '/documentos')
  })

  it('no convierte en enlace una acción estudiantil sin destino y conserva la vista simplificada', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, orientacion_etapa_actual: {
      mensaje: 'Espera la revisión administrativa.', requisitos: [],
      siguiente_accion: { codigo: 'ESPERAR_REVISION_DOCUMENTOS', titulo: 'Documentos pendientes de revisión', estado: 'PENDIENTE', accion_label: 'Ir a documentos' },
    } } })

    renderStudentPage()

    expect(await screen.findByText('Documentos pendientes de revisión')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ir a documentos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Secciones del expediente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Documentos' })).not.toBeInTheDocument()
  })

  it('conserva el expediente operativo completo para administración', async () => {
    renderPage()

    expect(await screen.findByRole('navigation', { name: 'Secciones del expediente' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    expect(screen.getByRole('heading', { name: 'Documentos' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Defensas' }))
    expect(screen.getByRole('heading', { name: 'Defensas' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Actores' }))
    expect(screen.getByRole('heading', { name: 'Gestión de actores' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Historial' }))
    expect(screen.getByRole('heading', { name: 'Historial' })).toBeInTheDocument()
  })

  it('ordena las secciones principales y la navegación según la jerarquía del estudiante', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    const { container } = renderOwnerPage('resumen')
    await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })

    const sectionIds = ['resumen', 'documentos', 'defensas', 'actores', 'etapas', 'historial']
    const sections = sectionIds.map((id) => container.querySelector(`#${id}`))
    sections.forEach((section, index) => {
      expect(section, `falta #${sectionIds[index]}`).not.toBeNull()
      expect(container.querySelectorAll(`#${sectionIds[index]}`)).toHaveLength(1)
    })
    sections.slice(0, -1).forEach((section, index) => {
      expect(section.compareDocumentPosition(sections[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    expect(within(sections[0]).getByRole('heading', { name: 'Qué debes hacer ahora' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Etapas' }))
    expect(within(sections[4]).getByRole('heading', { name: 'Etapas del flujo académico' })).toBeInTheDocument()

    const navigation = screen.getByRole('navigation', { name: 'Secciones del expediente' })
    const tabs = within(navigation).getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Resumen', 'Documentos', 'Defensas', 'Actores', 'Etapas', 'Historial', 'Resultado y cierre'])
    expect(tabs.slice(0, 6).map((tab) => tab.getAttribute('href'))).toEqual(sectionIds.map((id) => `#${id}`))
    expect(tabs[4]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[4]).toHaveAttribute('tabindex', '0')
    expect(tabs.filter((_tab, index) => index !== 4).every((tab) => tab.getAttribute('tabindex') === '-1')).toBe(true)

    await userEvent.click(tabs.at(-1))
    expect(tabs.at(-1)).toHaveClass('is-active')
    expect(tabs.slice(0, 6).every((tab) => !tab.classList.contains('is-active'))).toBe(true)
    const future = screen.getByText('Información de etapas posteriores').closest('details')
    expect(future).not.toHaveAttribute('open')
    expect(sections[5].compareDocumentPosition(future) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(future).getByRole('heading', { name: 'Resultado académico técnico' })).toBeInTheDocument()
  })

  it('muestra solo la pestaña activa y conserva el encabezado principal', async () => {
    const { container } = renderPage()
    const header = await screen.findByRole('heading', { name: /Ana P/ })
    const summaryPanel = container.querySelector('#panel-resumen')
    const documentsPanel = container.querySelector('#panel-documentos')
    const actorsPanel = container.querySelector('#panel-actores')

    expect(header).toBeVisible()
    expect(screen.queryByText('EXP-007')).not.toBeInTheDocument()
    expect(screen.getByText('RU-300 - Ana P\u00e9rez')).toBeVisible()
    expect(screen.getByText('Proyecto de Grado')).toBeVisible()
    expect(screen.getByText('Gesti\u00f3n 2026 - Semestre II')).toBeVisible()
    expect(summaryPanel).toBeVisible()
    expect(documentsPanel).not.toBeVisible()
    expect(actorsPanel).not.toBeVisible()
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveClass('is-active')
    expect(screen.getByRole('tab', { name: 'Documentos' })).not.toHaveClass('is-active')

    await userEvent.click(screen.getByRole('tab', { name: 'Documentos' }))
    expect(documentsPanel).toBeVisible()
    expect(summaryPanel).not.toBeVisible()
    expect(window.location.hash).toBe('#documentos')
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveClass('is-active')
    expect(screen.getByRole('tab', { name: 'Resumen' })).not.toHaveClass('is-active')

    await userEvent.click(screen.getByRole('tab', { name: 'Actores' }))
    expect(actorsPanel).toBeVisible()
    expect(documentsPanel).not.toBeVisible()
    expect(header).toBeVisible()
  })

  it.each(expedienteIdentityCases)(
    'oculta el código largo en la cabecera para $modalidadCodigo / $tipoRegistro',
    async ({ modalidadCodigo, modalidadNombre, tipoRegistro }) => {
      postulacionesService.obtenerExpediente.mockResolvedValue({
        ...response,
        detalle: {
          ...response.detalle,
          tipo_registro: tipoRegistro,
          modalidad_detalle: { id: 1, codigo: modalidadCodigo, nombre: modalidadNombre },
        },
        flujo: {
          ...response.flujo,
          modalidad: { id: 1, codigo: modalidadCodigo, nombre: modalidadNombre },
        },
      })

      renderPage()

      expect(await screen.findByRole('heading', { name: /RU-300 - Ana P/ })).toBeVisible()
      expect(screen.queryByText('EXP-007')).not.toBeInTheDocument()
      expect(screen.getAllByText(modalidadNombre).length).toBeGreaterThan(0)
      expect(screen.getByText('Gesti\u00f3n 2026 - Semestre II')).toBeVisible()
      if (tipoRegistro === 'HISTORICO') expect(screen.getByText(/Registro hist/)).toBeVisible()
    },
  )

  it('oculta el código en el encabezado de la vista estudiantil', async () => {
    renderStudentPage()

    expect(await screen.findByRole('heading', { name: 'Proyecto de Grado' })).toBeVisible()
    expect(screen.queryByText('EXP-007')).not.toBeInTheDocument()
    expect(screen.getByText('RU-300 - Ana P\u00e9rez')).toBeVisible()
    expect(screen.getByText('Gesti\u00f3n 2026 - Semestre II')).toBeVisible()
  })

  it('selecciona la pestaña indicada por el hash al abrir el expediente', async () => {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#actores`)
    const { container } = renderPage()

    await screen.findByRole('heading', { name: /Ana P/ })

    expect(screen.getByRole('tab', { name: 'Actores' })).toHaveAttribute('aria-selected', 'true')
    expect(container.querySelector('#panel-actores')).toBeVisible()
    expect(container.querySelector('#panel-resumen')).not.toBeVisible()
  })

  it('permite cambiar pestaña con flechas y teclas Inicio y Fin', async () => {
    renderPage()
    const summaryTab = await screen.findByRole('tab', { name: 'Resumen' })
    summaryTab.focus()

    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#documentos')

    await userEvent.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Resultado y cierre' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Resultado y cierre' })).toHaveAttribute('aria-selected', 'true')

    await userEvent.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveFocus()
  })

  it.each([
    ['PROYECTO_GRADO', 'Proyecto de Grado', null, null],
    ['TESIS_GRADO', 'Tesis de Grado', null, null],
    ['TRABAJO_DIRIGIDO', 'Trabajo Dirigido', 'trabajo', 'Trabajo Dirigido'],
    ['EXAMEN_GRADO', 'Examen de Grado', 'examen', 'Examen de Grado por Contenidos'],
    ['GRADUACION_VIA_DIPLOMADO', 'Graduación Vía Diplomado', 'diplomado', 'Graduación Vía Diplomado'],
    ['EXCELENCIA_ACADEMICA', 'Excelencia Académica', 'excelencia', 'Excelencia Académica'],
  ])('mantiene el panel de modalidad exclusivo de %s', async (code, name, service, heading) => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { codigo: code, nombre: name } },
      flujo: {
        ...response.flujo,
        modalidad: { codigo: code, nombre: name },
        etapa_actual: { ...response.flujo.etapa_actual, codigo: code === 'TRABAJO_DIRIGIDO' ? 'PERFIL_TRABAJO_DIRIGIDO' : 'MODULO_1' },
      },
    })
    if (service === 'trabajo') postulacionesService.obtenerTrabajoDirigido.mockResolvedValue({ institucion: null, informes: [] })
    if (service === 'examen') postulacionesService.obtenerExamenGrado.mockResolvedValue({ areas: [], resultado_final: null, tribunales: [] })
    if (service === 'diplomado') postulacionesService.obtenerDiplomado.mockResolvedValue({ modulos: [] })
    if (service === 'excelencia') postulacionesService.obtenerExcelenciaAcademica.mockResolvedValue({ criterios: [], documentos_requeridos: [] })

    const { container } = renderApplicationManagerPage()
    await screen.findByRole('heading', { name: /Ana P/ })

    if (!service) {
      expect(screen.queryByRole('tab', { name: 'Modalidad' })).not.toBeInTheDocument()
      return
    }

    const modalityTab = await screen.findByRole('tab', { name: 'Modalidad' })
    expect(screen.getAllByRole('tab', { name: 'Resultado y cierre' })).toHaveLength(1)
    await userEvent.click(modalityTab)
    expect(modalityTab).toHaveClass('is-active')
    expect(screen.getByRole('tab', { name: 'Resultado y cierre' })).not.toHaveClass('is-active')
    expect(container.querySelector('#modalidad')).toBeVisible()
    expect(within(container.querySelector('#modalidad')).getByRole('heading', { name: heading })).toBeInTheDocument()
    expect(container.querySelector('#panel-resumen')).not.toBeVisible()
  })

  it('conserva el formulario de Trabajo Dirigido al cambiar de pestaña', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' } },
      flujo: {
        ...response.flujo,
        modalidad: { codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
        etapa_actual: { ...response.flujo.etapa_actual, codigo: 'PERFIL_TRABAJO_DIRIGIDO' },
      },
    })
    postulacionesService.obtenerTrabajoDirigido.mockResolvedValue({ institucion: null, informes: [] })
    renderApplicationManagerPage()

    await userEvent.click(await screen.findByRole('tab', { name: 'Modalidad' }))
    const institutionInput = screen.getByLabelText('Institución')
    await userEvent.type(institutionInput, 'Entidad de prueba')
    await userEvent.click(screen.getByRole('tab', { name: 'Resumen' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Modalidad' }))

    expect(screen.getByLabelText('Institución')).toHaveValue('Entidad de prueba')
  })

  it('conserva la confirmación del informe después del refresco real del expediente', async () => {
    const stage = {
      id: 296,
      codigo: 'DESARROLLO_TRABAJO_DIRIGIDO',
      nombre: 'Desarrollo y seguimiento institucional',
      estado: 'EN_PROCESO',
      numero_intento: 1,
      activo: true,
      acciones_permitidas: [],
    }
    const tdResponse = {
      ...response,
      detalle: { ...response.detalle, modalidad_detalle: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' } },
      flujo: {
        ...response.flujo,
        modalidad: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
        etapa_actual: stage,
        etapas: [stage],
      },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue(tdResponse)
    postulacionesService.obtenerTrabajoDirigido.mockResolvedValue({
      institucion: {
        institucion_nombre: 'Institución', supervisor_nombre: 'Supervisor', institucion_tipo: 'PUBLICA',
        tipo_ejecucion: 'INTERNO', constituida_legalmente: true, actividad_permanente: true,
        convenio_requerido: false, convenio_vigente: false,
      },
      informes: [],
    })
    postulacionesService.registrarInformeTrabajoDirigido.mockResolvedValue({ id: 18, periodo: 'Agosto' })

    renderApplicationManagerPage('trabajo-dirigido')
    await userEvent.type(await screen.findByLabelText('Periodo'), 'Agosto')
    await userEvent.type(screen.getByLabelText('Descripción del desempeño'), 'Buen desempeño')
    await userEvent.type(screen.getByLabelText('Evaluación cualitativa'), 'Suficiente')
    await userEvent.type(screen.getByLabelText('Aporte laboral'), 'Automatización')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar informe' }))

    await waitFor(() => expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Informe periódico registrado correctamente.')).toBeInTheDocument()
    expect(screen.getByLabelText('Periodo')).toHaveValue('')
  })

  it('informa el bloqueo institucional sin ofrecer navegación de gestión a usuarios sin permisos', async () => {
    const stage = {
      id: 293,
      codigo: 'DESARROLLO_TRABAJO_DIRIGIDO',
      nombre: 'Desarrollo y seguimiento institucional',
      estado: 'PENDIENTE',
      numero_intento: 1,
      activo: true,
      acciones_permitidas: [],
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: {
        ...response.detalle,
        modalidad_detalle: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
      },
      flujo: {
        ...response.flujo,
        modalidad: { id: 7, codigo: 'TRABAJO_DIRIGIDO', nombre: 'Trabajo Dirigido' },
        etapa_actual: stage,
        etapas: [stage],
        orientacion_etapa_actual: {
          operacion: 'ORIENTAR_ETAPA',
          mensaje: 'Falta registrar la institución y el supervisor para iniciar Desarrollo.',
          requisitos: [{ tipo: 'INSTITUCION', codigo: 'INSTITUCION_SUPERVISOR_TD', nombre: 'Institución y supervisor', cumplido: false, estado: 'PENDIENTE', estado_display: 'Pendiente de registro', destino: '#trabajo-dirigido' }],
          siguiente_accion: { codigo: 'GESTIONAR_INSTITUCION', titulo: 'Registrar institución y supervisor', descripcion: 'Completa y guarda los datos institucionales necesarios para iniciar Desarrollo', estado: 'PENDIENTE', estado_display: 'Pendiente', destino: '#trabajo-dirigido', accion_label: 'Gestionar institución' },
        },
      },
    })
    postulacionesService.obtenerTrabajoDirigido.mockResolvedValue({ institucion: null, informes: [] })

    renderStudentPage()

    expect(await screen.findByText('Solicita al personal responsable que registre la institución y el supervisor.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Gestionar institución' })).not.toBeInTheDocument()
    expect(screen.queryByText('Registrar institución y supervisor')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar institución' })).not.toBeInTheDocument()
    expect(postulacionesService.iniciarEtapa).not.toHaveBeenCalled()
  })

  it('preserva una siguiente acción posterior declarada por el backend', async () => {
    const profileStage = { id: 11, codigo: 'PERFIL_PROYECTO', nombre: 'Perfil de Proyecto', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const orientation = {
      mensaje: 'Los tribunales están completos. Programa la Defensa de Perfil.',
      requisitos: [{ tipo: 'ACTOR', codigo: 'TRIBUNAL', nombre: 'Tribunales', actual: 2, minimo: 2, cumplido: true, estado_display: '2/2 cumplido', destino: '#actores' }],
      siguiente_accion: { codigo: 'PROGRAMAR_EVENTO', titulo: 'Programar Defensa de Perfil', descripcion: 'Programa la defensa correspondiente a esta etapa.', estado: 'DISPONIBLE', destino: '#defensas', accion_label: 'Ir a programar defensa' },
    }
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [] })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: profileStage, etapas: [profileStage], orientacion_etapa_actual: orientation },
    })
    renderApplicationManagerPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByText('Los tribunales están completos. Programa la Defensa de Perfil.')).toBeInTheDocument()
    expect(within(summary).getByRole('link', { name: 'Ir a programar defensa' })).toHaveAttribute('href', '#defensas')
    expect(within(summary).getByText('2 vigentes')).toBeInTheDocument()
    expect(within(summary).getByText('Mínimo requerido: 2')).toBeInTheDocument()
    expect(within(summary).queryByRole('button', { name: 'Aprobar Perfil de Proyecto' })).not.toBeInTheDocument()
  })

  it('renderiza un solo enlace cuando requisito y siguiente acción comparten destino', async () => {
    const orientation = {
      ...futureProfileOrientation,
      requisitos: [{ ...futureProfileOrientation.requisitos[0], actual: 1, estado_display: '1/2 pendiente' }],
    }
    postulacionesService.obtenerDefensas.mockResolvedValue({ ...defensesResponse, results: [] })
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, orientacion_etapa_actual: orientation },
    })
    renderApplicationManagerPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    const links = within(summary).getAllByRole('link', { name: 'Ir a gestionar' })
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '#actores')
  })

  it('conserva una acción documental propia para el estudiante', async () => {
    const documentOrientation = {
      mensaje: 'Carga el Documento Final.', requisitos: [{ tipo: 'DOCUMENTO', codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', cumplido: false, estado_display: 'Pendiente', destino: '#documentos' }],
      siguiente_accion: { codigo: 'GESTIONAR_DOCUMENTOS', titulo: 'Gestionar documentos', descripcion: 'Carga el Documento Final.', estado: 'PENDIENTE', destino: '#documentos', accion_label: 'Ir a documentos' },
    }
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: { id: 23, codigo: 'DOCUMENTO_FINAL', nombre: 'Documento Final', estado: 'EN_PROCESO' }, orientacion_etapa_actual: documentOrientation } })
    renderOwnerPage('resumen')

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByText('Gestionar documentos')).toBeInTheDocument()
    expect(within(summary).getByRole('region', { name: 'Siguiente acción' })).toHaveAttribute('data-personal-action', 'true')
  })

  it.each([
    ['Debes iniciar sesión para consultar este expediente.', 401],
    ['No tienes autorización para consultar este expediente.', 403],
    ['El expediente solicitado no está disponible.', 404],
    ['No se pudo cargar el expediente. Intenta nuevamente.', undefined],
  ])('muestra error recuperable para respuesta %s', async (message, status) => {
    postulacionesService.obtenerExpediente.mockRejectedValueOnce({ status, message }).mockResolvedValueOnce(response)
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText(/Ana P/)).toBeInTheDocument()
    expect(postulacionesService.obtenerExpediente).toHaveBeenCalledTimes(2)
  })

  it('tolera datos opcionales ausentes sin inventar etiquetas', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      detalle: { codigo: 'EXP-008', estudiante_detalle: null, modalidad_detalle: null, periodo_detalle: null, estado_actual_detalle: null },
      flujo: { modalidad: null, etapa_actual: null, porcentaje_avance: null, etapas: [] },
      resultado: { data: { nota_publica: null, aporte_publica: null, resultado: null, nota_final: null }, error: '' },
      cierre: { data: { advertencias_normativas: [], condiciones_faltantes: [], entregas_faltantes: [], documentos_faltantes: [] }, error: '' },
    })
    renderPage()
    await screen.findByRole('heading', { name: 'No registrado' })
    expect(screen.getAllByText('No registrado').length).toBeGreaterThanOrEqual(5)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('cancela la solicitud al desmontar', async () => {
    let receivedSignal
    postulacionesService.obtenerExpediente.mockImplementation((_id, signal) => {
      receivedSignal = signal
      return new Promise(() => {})
    })
    const view = renderPage()
    await waitFor(() => expect(receivedSignal).toBeDefined())
    view.unmount()
    expect(receivedSignal.aborted).toBe(true)
  })

  it('muestra el valor vigente, el mínimo requerido y el estado del requisito', async () => {
    const privateStage = { id: 12, codigo: 'DEFENSA_PRIVADA', nombre: 'Defensa Privada', estado: 'EN_PROCESO', numero_intento: 1, activo: true }
    const orientation = {
      mensaje: 'Verifica las asignaciones antes de programar.',
      requisitos: [
        { tipo: 'ACTOR', codigo: 'TRIBUNAL', nombre: 'Tribunales', actual: 3, minimo: 2, cumplido: true, estado_display: '3/2 cumplido' },
        { tipo: 'ACTOR', codigo: 'DOCENTE_MODALIDAD', nombre: 'Docente de modalidad', actual: 0, minimo: 1, cumplido: false, estado_display: '0/1 pendiente' },
      ],
      siguiente_accion: { codigo: 'GESTIONAR_ACTORES', titulo: 'Actores de la postulación', estado: 'PENDIENTE', destino: '#actores' },
    }
    postulacionesService.obtenerExpediente.mockResolvedValue({ ...response, flujo: { ...response.flujo, etapa_actual: privateStage, etapas: [privateStage], orientacion_etapa_actual: orientation } })
    renderApplicationManagerPage()

    const summary = (await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).parentElement
    expect(within(summary).getByText('3 vigentes')).toBeInTheDocument()
    expect(within(summary).getByText('Mínimo requerido: 2')).toBeInTheDocument()
    expect(within(summary).getByText('Requisito cumplido')).toBeInTheDocument()
    expect(within(summary).getByText('0 vigentes')).toBeInTheDocument()
    expect(within(summary).getByText('Mínimo requerido: 1')).toBeInTheDocument()
    expect(within(summary).getByText('Pendiente')).toBeInTheDocument()
  })

  it('muestra a estudiantes la orientación y el checklist sin ofrecer acciones administrativas', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(trabajoDirigidoPublicDefenseResponse())
    renderStudentPage({ permissions: ['puede_ver_postulaciones', 'puede_ver_documentos'] })

    expect(await screen.findByText('Completar autoridades')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Checklist documental' })).toBeInTheDocument()
    expect(screen.getByText(/no bloquean la siguiente acción académica/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Completar autoridades' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Completar autoridades' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ir a documentos' })).not.toBeInTheDocument()
  })

  it.each(['ambiguo', 'ausente', 'incompatible'])('conserva navegación segura de Tesis ante seguimiento público %s', async (context) => {
    const base = thesisPublicAuthoritiesResponse()
    if (context === 'ambiguo') base.flujo.etapas.push({ ...base.flujo.etapa_actual, id: 83, numero_intento: 2 })
    if (context === 'ausente') base.flujo.etapa_actual = { ...base.flujo.etapa_actual, id: null }
    if (context === 'incompatible') base.flujo.etapas = [{ ...base.flujo.etapa_actual, id: 83, numero_intento: 2 }]
    postulacionesService.obtenerExpediente.mockResolvedValue(base)
    renderAssignmentManagerPage('resumen')
    expect(await screen.findByRole('link', { name: 'Completar autoridades' })).toHaveAttribute('href', '#actores')
    expect(screen.queryByRole('button', { name: 'Completar autoridades' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mantiene la orientación visible sin accesos repetidos del expediente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: { ...response.flujo.etapa_actual, estado: 'EN_PROCESO' } },
    })
    postulacionesService.obtenerDefensas.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })).toBeInTheDocument()
    expect(screen.queryByText('Accesos del expediente')).not.toBeInTheDocument()
  })

  it('muestra estado vacío sin afectar el expediente', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    postulacionesService.obtenerHistorial.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPage('historial')
    expect(await screen.findByText('No se registraron cambios de estado.')).toBeInTheDocument()
    expect(screen.getByText(/Ana P/)).toBeInTheDocument()
  })

  it('valida motivo y conserva el error de campo al rechazar', async () => {
    postulacionesService.obtenerExpediente.mockResolvedValue(response)
    renderReviewerPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    await userEvent.click(screen.getByRole('button', { name: 'Rechazar documento' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Este campo es obligatorio.')
    expect(postulacionesService.rechazarDocumento).not.toHaveBeenCalled()
  })

  it.each([
    ['cierre no soportado', { soportada: true, configuracion_valida: true, cierre_soportado: false }, { data: { ...closureResponse, cierre_documental_aprobado: true, concluida: false }, error: '' }],
    ['payload de cierre no disponible', { soportada: true, configuracion_valida: true, cierre_soportado: true }, { data: null, error: 'Estado de cierre técnico todavía no disponible' }],
  ])('conserva el fallback seguro cuando %s', async (_case, capabilities, cierre) => {
    const completedStages = Array.from({ length: 8 }, (_, index) => ({ id: 300 + index, codigo: `ETAPA_${index + 1}`, nombre: `Etapa ${index + 1}`, estado: 'APROBADA', activo: true }))
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      flujo: { ...response.flujo, etapa_actual: completedStages.at(-1), porcentaje_avance: 100, etapas: completedStages, orientacion_etapa_actual: null },
      cierre,
    })
    postulacionesService.obtenerCapacidadesModalidad.mockResolvedValue(capabilities)

    renderPage()

    expect(await screen.findByText('No existe una etapa actual disponible.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Gestionar cierre técnico' })).not.toBeInTheDocument()
  })

  it('la cabecera muestra el estado de la etapa junto a ella y el de la postulación en sus datos', async () => {
    const stage = { id: 21, codigo: 'INSCRIPCION', nombre: 'Inscripción', estado: 'PENDIENTE', numero_intento: 1, activo: true }
    postulacionesService.obtenerExpediente.mockResolvedValue({
      ...response,
      detalle: { ...response.detalle, estado_actual_detalle: { id: 1, codigo: 'REGISTRADA', nombre: 'Registrada' } },
      flujo: { ...response.flujo, etapa_actual: stage, etapas: [stage] },
    })
    const { container } = renderApplicationManagerPage('resumen')
    await screen.findByRole('heading', { name: 'Qué debes hacer ahora' })
    expect(container.querySelector('.expediente-hero-aside')).toHaveTextContent('Pendiente')
    expect(container.querySelector('.expediente-hero-aside')).not.toHaveTextContent('Registrada')
    expect(container.querySelector('.expediente-hero-state')).toHaveTextContent('Postulación')
    expect(container.querySelector('.expediente-hero-state')).toHaveTextContent('Registrada')
  })
})
