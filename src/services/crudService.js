import apiClient from './api'

const clean = (values = {}) => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '' && value !== null && value !== undefined))
const errorOf = (error) => {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const data = error?.response?.data; const fields = data && typeof data === 'object' ? Object.entries(data).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(' ') : value}`).join(' ') : ''
  const status = error?.response?.status
  const message = status === 403 ? 'No tienes permiso para realizar esta operación.' : fields || 'No se pudo completar la operación.'
  return { status, message, fields: data && typeof data === 'object' ? data : {} }
}
async function call(promise) { try { return (await promise).data } catch (error) { throw errorOf(error) } }

function modalityError(error, resource = 'los requisitos oficiales') {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  const status = error?.response?.status
  const data = error?.response?.data
  const fields = data && typeof data === 'object' ? data : {}
  if (status === 400) return { status, message: 'Revisa el archivo y los datos enviados.', fields }
  if (status === 401) return { status, message: `Debes iniciar sesión para consultar ${resource}.` }
  if (status === 403) return { status, message: `No tienes autorización para gestionar ${resource}.` }
  if (status === 404) return { status, message: 'Los requisitos oficiales no están publicados.' }
  return { status, message: `No se pudieron cargar ${resource}. Intenta nuevamente.` }
}

function downloadFilename(contentDisposition, fallback) {
  const encoded = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encoded) {
    try { return decodeURIComponent(encoded) } catch { return fallback }
  }
  return contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1] || fallback
}

export const crudService = {
  list: (path, params, signal) => call(apiClient.get(path, { params: clean(params), signal })),
  detail: (path, id, signal) => call(apiClient.get(`${path}${id}/`, { signal })),
  create: (path, data, config) => call(apiClient.post(path, data, config)),
  update: (path, id, data) => call(apiClient.patch(`${path}${id}/`, data)),
  remove: (path, id) => call(apiClient.delete(`${path}${id}/`)),
  action: (path, id, action, data = {}) => call(apiClient.post(`${path}${id}/${action}/`, data)),
}

export const modalidadesService = {
  async obtenerDocumentosOficiales(modalidadId, signal) {
    try {
      return (await apiClient.get(`/api/v1/academico/modalidades/${modalidadId}/documentos-oficiales/`, { signal })).data
    } catch (error) {
      if (error?.response?.status === 404) return []
      throw modalityError(error)
    }
  },
  async publicarDocumentoOficial(modalidadId, { archivo, nombre }, signal) {
    const body = new FormData()
    if (archivo) body.append('archivo', archivo)
    if (nombre?.trim()) body.append('nombre', nombre.trim())
    try {
      return (await apiClient.post(`/api/v1/academico/modalidades/${modalidadId}/documentos-oficiales/`, body, { signal })).data
    } catch (error) {
      throw modalityError(error, 'los requisitos oficiales')
    }
  },
  async actualizarDocumentoOficial(modalidadId, documentoId, { archivo, nombre }, signal) {
    const body = new FormData()
    if (archivo) body.append('archivo', archivo)
    if (nombre?.trim()) body.append('nombre', nombre.trim())
    try {
      return (await apiClient.patch(`/api/v1/academico/modalidades/${modalidadId}/documentos-oficiales/${documentoId}/`, body, { signal })).data
    } catch (error) {
      throw modalityError(error, 'los requisitos oficiales')
    }
  },
  async descargarDocumentoOficial(modalidadId, documentoId, fallback = 'requisitos-oficiales.pdf', signal) {
    try {
      const response = await apiClient.get(`/api/v1/academico/modalidades/${modalidadId}/documentos-oficiales/${documentoId}/descargar/`, { signal, responseType: 'blob' })
      return { blob: response.data, filename: downloadFilename(response.headers?.['content-disposition'], fallback) }
    } catch (error) {
      throw modalityError(error, 'la descarga de requisitos oficiales')
    }
  },
}

export async function listAll(path, params = {}, signal) {
  const results = []
  let page = 1
  let hasNext = true
  while (hasNext) {
    const response = await crudService.list(path, { ...params, page, page_size: 100 }, signal)
    if (Array.isArray(response)) return response
    results.push(...(response.results || []))
    hasNext = Boolean(response.next)
    page += 1
  }
  return results
}

export const endpoints = {
  postulaciones: '/api/v1/postulaciones/', modalidades: '/api/v1/academico/modalidades/', periodos: '/api/v1/academico/periodos/', requisitos: '/api/v1/academico/requisitos/',
  documentos: '/api/v1/documentos/documentos/', tiposDocumento: '/api/v1/documentos/tipos-documento/', estadosDocumento: '/api/v1/documentos/estados-documento/', seguimiento: '/api/v1/seguimientos-etapa/',
  estudiantes: '/api/v1/usuarios/estudiantes/',
  usuarios: '/api/v1/usuarios/administracion/', roles: '/api/v1/usuarios/roles/',
}
