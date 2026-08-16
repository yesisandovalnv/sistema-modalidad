import apiClient from './api'

function messageOf(error) {
  if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return { canceled: true }
  if (error?.response?.status === 403) return { message: 'No tienes permiso para administrar usuarios y roles.' }
  const data = error?.response?.data
  const labels = { username: 'Usuario', password: 'Contraseña', ci: 'C.I.', ru: 'R.U.', correo_personal: 'Correo personal', correo_institucional: 'Correo institucional', role_id: 'Rol', detail: '' }
  const messages = data && typeof data === 'object' ? Object.entries(data)
    .filter(([key]) => !['status_code', 'code', 'non_field_errors'].includes(key))
    .flatMap(([key, value]) => (Array.isArray(value) ? value : [value]).map((item) => `${labels[key] ?? key}: ${typeof item === 'object' ? Object.values(item).flat().join(' ') : item}`.replace(/^: /, ''))) : []
  if (data?.non_field_errors) messages.push(...(Array.isArray(data.non_field_errors) ? data.non_field_errors : [data.non_field_errors]))
  return { message: messages.join(' ') || 'No se pudo completar la operación.' }
}

async function call(request) { try { return (await request).data } catch (error) { throw messageOf(error) } }
export const usuariosService = {
  listUsers: (params, signal) => call(apiClient.get('/api/v1/usuarios/administracion/', { params, signal })),
  createUser: (data) => call(apiClient.post('/api/v1/usuarios/administracion/', data)),
  updateUser: (id, data) => call(apiClient.patch(`/api/v1/usuarios/administracion/${id}/`, data)),
  listRoles: (params = {}, signal) => call(apiClient.get('/api/v1/usuarios/roles/', { params, signal })),
  createRole: (data) => call(apiClient.post('/api/v1/usuarios/roles/', data)),
  updateRole: (id, data) => call(apiClient.patch(`/api/v1/usuarios/roles/${id}/`, data)),
}
