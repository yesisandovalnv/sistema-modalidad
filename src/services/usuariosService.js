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

async function responseError(error) {
  const normalized = messageOf(error)
  const responseData = error?.response?.data
  if (responseData instanceof Blob) {
    try {
      const payload = JSON.parse(await responseData.text())
      const detail = payload?.detail
      const messages = detail ?? Object.entries(payload || {})
        .flatMap(([key, value]) => (Array.isArray(value) ? value : [value]).map((item) => `${key}: ${typeof item === 'object' ? Object.values(item).flat().join(' ') : item}`))
        .join(' ')
      if (messages) normalized.message = String(messages)
    } catch {
      // Keep the generic HTTP error when the response body is not JSON.
    }
  }
  return normalized
}

async function call(request) { try { return (await request).data } catch (error) { throw await responseError(error) } }

function isImportPreview(data) {
  return Boolean(data && typeof data === 'object'
    && typeof data.token === 'string'
    && Array.isArray(data.rows)
    && Number.isInteger(data.total)
    && Number.isInteger(data.valid)
    && Number.isInteger(data.rejected))
}

function isImportResult(data) {
  return Boolean(data && typeof data === 'object'
    && typeof data.lot_id === 'string'
    && Array.isArray(data.rows)
    && Number.isInteger(data.total)
    && Number.isInteger(data.created)
    && Number.isInteger(data.rejected))
}

function requireImportResponse(data, isValid, label) {
  if (!isValid(data)) throw { message: `El servidor devolvió una respuesta inesperada al ${label}.` }
  return data
}

export const usuariosService = {
  listUsers: (params, signal) => call(apiClient.get('/api/v1/usuarios/administracion/', { params, signal })),
  createUser: (data) => call(apiClient.post('/api/v1/usuarios/administracion/', data)),
  updateUser: (id, data) => call(apiClient.patch(`/api/v1/usuarios/administracion/${id}/`, data)),
  listRoles: (params = {}, signal) => call(apiClient.get('/api/v1/usuarios/roles/', { params, signal })),
  createRole: (data) => call(apiClient.post('/api/v1/usuarios/roles/', data)),
  updateRole: (id, data) => call(apiClient.patch(`/api/v1/usuarios/roles/${id}/`, data)),
  downloadStudentTemplate: async () => {
    const data = await call(apiClient.get('/api/v1/usuarios/importar-estudiantes/plantilla/', { responseType: 'blob' }))
    if (!(data instanceof Blob) || data.size === 0) throw { message: 'El servidor devolvió una plantilla Excel vacía o inválida.' }
    return data
  },
  validateStudentImport: async (file) => {
    const body = new FormData()
    body.append('file', file)
    const data = await call(apiClient.post('/api/v1/usuarios/importar-estudiantes/validar/', body))
    return requireImportResponse(data, isImportPreview, 'validar el archivo')
  },
  confirmStudentImport: async (token) => {
    const data = await call(apiClient.post('/api/v1/usuarios/importar-estudiantes/confirmar/', { token }))
    return requireImportResponse(data, isImportResult, 'confirmar la importación')
  },
}
