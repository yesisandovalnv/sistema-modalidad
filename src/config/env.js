const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL

if (!rawApiBaseUrl) {
  throw new Error('Falta configurar VITE_API_BASE_URL en las variables de entorno')
}

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '')
