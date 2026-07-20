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

export const crudService = {
  list: (path, params, signal) => call(apiClient.get(path, { params: clean(params), signal })),
  detail: (path, id, signal) => call(apiClient.get(`${path}${id}/`, { signal })),
  create: (path, data, config) => call(apiClient.post(path, data, config)),
  update: (path, id, data) => call(apiClient.patch(`${path}${id}/`, data)),
  remove: (path, id) => call(apiClient.delete(`${path}${id}/`)),
  action: (path, id, action, data = {}) => call(apiClient.post(`${path}${id}/${action}/`, data)),
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
}
