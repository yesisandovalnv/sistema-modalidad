import apiClient from './api'

function normalize(error) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  if (status === 401) return { status, message: 'Debes iniciar sesión para consultar este expediente.' }
  if (status === 403) return { status, message: 'No tienes autorización para consultar este expediente.' }
  if (status === 404) return { status, message: 'El expediente solicitado no está disponible.' }
  return { status, message: 'No se pudo cargar el expediente. Intenta nuevamente.' }
}

function optionalResult(result, unavailableMessage) {
  if (result.status === 'fulfilled') return { data: result.value.data, error: '' }
  if (result.reason?.name === 'CanceledError' || result.reason?.code === 'ERR_CANCELED') throw { canceled: true }
  return { data: null, error: unavailableMessage }
}

function normalizeDocuments(error, resource) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  if (status === 401) return { status, message: `Debes iniciar sesión para consultar ${resource}.` }
  if (status === 404) return { status, message: `${resource[0].toUpperCase()}${resource.slice(1)} no disponibles.` }
  return { status, message: `No se pudieron cargar ${resource}. Intenta nuevamente.` }
}

function normalizeAssignments(error) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  if (status === 401) return { status, message: 'Debes iniciar sesiÃ³n para consultar los actores.' }
  if (status === 404) return { status, message: 'Las asignaciones de actores solicitadas no estÃ¡n disponibles.' }
  return { status, message: 'No se pudieron cargar los actores. Comprueba tu conexiÃ³n e intenta nuevamente.' }
}

function normalizeDefenses(error, quorum = false) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  const resource = quorum ? 'el quórum técnico' : 'las defensas'
  if (status === 401) return { status, message: `Debes iniciar sesión para consultar ${resource}.` }
  if (status === 404) return { status, message: quorum ? 'El evento de defensa no está disponible.' : 'Las defensas solicitadas no están disponibles.' }
  return { status, message: `No se pudo consultar ${resource}. Comprueba tu conexión e intenta nuevamente.` }
}

function normalizeUpload(error) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  const data = error?.response?.data
  if (status === 400) return { status, message: 'Revisa los datos del documento.', fields: data && typeof data === 'object' ? data : {} }
  if (status === 401) return { status, message: 'Debes iniciar sesión para cargar documentos.' }
  if (status === 403) return { status, message: 'No tienes autorización para cargar documentos en esta postulación.' }
  if (status === 404) return { status, message: 'La postulación, el tipo documental o el documento ya no está disponible.' }
  return { status, message: 'No se pudo cargar el documento. Comprueba tu conexión e intenta nuevamente.' }
}

function normalizeReview(error) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  const data = error?.response?.data
  if (status === 400 || status === 409) return { status, message: 'La acción no es válida para el estado actual del documento.', fields: data && typeof data === 'object' ? data : {} }
  if (status === 401) return { status, message: 'Debes iniciar sesión para revisar documentos.' }
  if (status === 403) return { status, message: 'No tienes autorización para revisar este documento.' }
  if (status === 404) return { status, message: 'El documento o la observación ya no está disponible.' }
  return { status, message: 'No se pudo completar la revisión. Comprueba tu conexión e intenta nuevamente.' }
}

async function reviewAction(url, payload, signal) {
  try {
    return (await apiClient.post(url, payload, { signal })).data
  } catch (error) {
    throw normalizeReview(error)
  }
}

async function getDocumentResource(url, params, signal, resource) {
  try {
    return (await apiClient.get(url, { params, signal })).data
  } catch (error) {
    throw normalizeDocuments(error, resource)
  }
}

export const postulacionesService = {
  async obtenerDetalle(id, signal) {
    try {
      return (await apiClient.get(`/api/v1/postulaciones/${id}/`, { signal })).data
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') throw { canceled: true }
      const status = error?.response?.status
      if (status === 403) throw { status, message: 'No tienes autorización para consultar esta postulación.' }
      if (status === 404) throw { status, message: 'La postulación solicitada no está disponible.' }
      throw { status, message: 'No se pudo cargar el detalle. Intenta nuevamente.' }
    }
  },
  async obtenerExpediente(id, signal) {
    try {
      const [detalle, flujo, resultado, cierre] = await Promise.allSettled([
        apiClient.get(`/api/v1/postulaciones/${id}/`, { signal }),
        apiClient.get(`/api/v1/postulaciones/${id}/flujo/`, { signal }),
        apiClient.get(`/api/v1/postulaciones/${id}/resultado-final/`, { signal }),
        apiClient.get(`/api/v1/postulaciones/${id}/cierre/`, { signal }),
      ])
      if (detalle.status === 'rejected') throw detalle.reason
      if (flujo.status === 'rejected') throw flujo.reason
      return {
        detalle: detalle.value.data,
        flujo: flujo.value.data,
        resultado: optionalResult(resultado, 'Resultado final todavía no disponible'),
        cierre: optionalResult(cierre, 'Estado de cierre técnico todavía no disponible'),
      }
    } catch (error) {
      throw normalize(error)
    }
  },
  async obtenerHistorial(id, page, signal) {
    try {
      return (await apiClient.get('/api/v1/postulaciones/historial/', {
        params: { postulacion: id, ordering: 'fecha_cambio', page },
        signal,
      })).data
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') throw { canceled: true }
      const status = error?.response?.status
      if (status === 401) throw { status, message: 'Debes iniciar sesión para consultar el historial.' }
      if (status === 404) throw { status, message: 'El historial solicitado no está disponible.' }
      throw { status, message: 'No se pudo cargar el historial. Intenta nuevamente.' }
    }
  },
  async obtenerActores(postulacion, activo, page, signal) {
    try {
      return (await apiClient.get('/api/v1/asignaciones/', {
        params: { postulacion, activo, page },
        signal,
      })).data
    } catch (error) {
      throw normalizeAssignments(error)
    }
  },
  async obtenerDefensas(postulacion, page, signal) {
    try {
      return (await apiClient.get('/api/v1/eventos-defensa/', {
        params: { postulacion, ordering: '-fecha_programada,-id', page },
        signal,
      })).data
    } catch (error) {
      throw normalizeDefenses(error)
    }
  },
  async obtenerQuorumDefensa(evento, signal) {
    try {
      return (await apiClient.get(`/api/v1/eventos-defensa/${evento}/quorum/`, { signal })).data
    } catch (error) {
      throw normalizeDefenses(error, true)
    }
  },
  obtenerDocumentos(postulacion, page, signal) {
    return getDocumentResource('/api/v1/documentos/documentos/', { postulacion, ordering: '-fecha_subida', page }, signal, 'los documentos')
  },
  obtenerVersiones(documento, page, signal) {
    return getDocumentResource('/api/v1/documentos/versiones/', { documento, ordering: 'numero_version', page }, signal, 'las versiones')
  },
  obtenerObservaciones(versionDocumento, page, signal) {
    return getDocumentResource('/api/v1/documentos/observaciones/', { version_documento: versionDocumento, ordering: 'fecha_observacion', page }, signal, 'las observaciones')
  },
  async obtenerTiposDocumento(signal) {
    try {
      return (await apiClient.get('/api/v1/documentos/tipos-documento/', { params: { activo: true, page_size: 100, ordering: 'nombre' }, signal })).data
    } catch (error) {
      throw normalizeDocuments(error, 'los tipos documentales')
    }
  },
  async cargarDocumento({ postulacionId, tipoDocumentoId, archivo }, signal) {
    const body = new FormData()
    body.append('postulacion_id', String(postulacionId))
    body.append('tipo_documento_id', String(tipoDocumentoId))
    body.append('archivo', archivo)
    try {
      return (await apiClient.post('/api/v1/documentos/documentos/subir/', body, { signal })).data
    } catch (error) {
      throw normalizeUpload(error)
    }
  },
  aprobarDocumento(documentoId, comentario, signal) {
    return reviewAction(`/api/v1/documentos/documentos/${documentoId}/aprobar/`, { comentario }, signal)
  },
  rechazarDocumento(documentoId, motivo, signal) {
    return reviewAction(`/api/v1/documentos/documentos/${documentoId}/rechazar/`, { motivo }, signal)
  },
  observarDocumento(documentoId, comentario, signal) {
    return reviewAction(`/api/v1/documentos/documentos/${documentoId}/observar/`, { comentario }, signal)
  },
  marcarObservacionCorregida(observacionId, signal) {
    return reviewAction(`/api/v1/documentos/observaciones/${observacionId}/marcar-corregida/`, {}, signal)
  },
}
