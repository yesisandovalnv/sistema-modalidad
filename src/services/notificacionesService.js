import apiClient from '../api/client'

const base = '/v1/notificaciones/'

function cleanParams(params = {}) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined))
}

function normalize(error) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return error
  const status = error?.response?.status
  const body = error?.response?.data
  const message = typeof body === 'string' ? body : body?.detail || body?.message || 'No se pudo completar la solicitud.'
  return Object.assign(new Error(message), { status, data: body })
}

async function request(promise) {
  try { return (await promise).data } catch (error) { throw normalize(error) }
}

export const notificacionesService = {
  obtenerNotificaciones: (params, signal) => request(apiClient.get(base, { params: cleanParams(params), signal })),
  obtenerNotificacion: (id, signal) => request(apiClient.get(`${base}${id}/`, { signal })),
  obtenerConteoNoLeidas: (signal) => request(apiClient.get(`${base}no-leidas/count/`, { signal })),
  marcarLeida: (id) => request(apiClient.post(`${base}${id}/marcar-leida/`)),
  marcarNoLeida: (id) => request(apiClient.post(`${base}${id}/marcar-no-leida/`)),
  marcarTodasLeidas: () => request(apiClient.post(`${base}marcar-todas-leidas/`)),
}

export { cleanParams }
