import axios from 'axios'
import { API_BASE_URL } from '../config/env'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

export const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('auth_access_token')
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

let sessionExpired = false
let refreshPromise = null

const AUTH_ENDPOINTS = ['/api/v1/auth/login/', '/api/v1/auth/refresh/', '/api/v1/auth/logout/']
const isAuthEndpoint = (url = '') => AUTH_ENDPOINTS.some((path) => url.includes(path))

function expireSession() {
  if (sessionExpired) return
  sessionExpired = true
  localStorage.removeItem('auth_access_token')
  localStorage.removeItem('auth_refresh_token')
  window.dispatchEvent(new Event('auth-session-expired'))
}

function setAuthorization(config, access) {
  if (typeof config.headers?.set === 'function') config.headers.set('Authorization', `Bearer ${access}`)
  else config.headers = { ...config.headers, Authorization: `Bearer ${access}` }
}

async function refreshAccessToken() {
  const refresh = localStorage.getItem('auth_refresh_token')
  if (!refresh) throw new Error('No refresh token available')
  const { data } = await refreshClient.post('/api/v1/auth/refresh/', { refresh })
  if (!data?.access) throw new Error('Refresh response did not include an access token')
  localStorage.setItem('auth_access_token', data.access)
  if (data.refresh) localStorage.setItem('auth_refresh_token', data.refresh)
  sessionExpired = false
  return data.access
}

apiClient.interceptors.response.use((response) => {
  if (response.config?.url?.includes('/api/v1/auth/login/')) sessionExpired = false
  return response
}, async (error) => {
  const originalRequest = error?.config
  const shouldRefresh = error?.response?.status === 401
    && originalRequest
    && !originalRequest._retry
    && !isAuthEndpoint(originalRequest.url)

  if (!shouldRefresh) {
    if (error?.response?.status === 401 && originalRequest?._retry) expireSession()
    return Promise.reject(error)
  }

  originalRequest._retry = true
  try {
    if (!refreshPromise) refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null })
    const access = await refreshPromise
    setAuthorization(originalRequest, access)
    return apiClient(originalRequest)
  } catch (refreshError) {
    expireSession()
    return Promise.reject(refreshError)
  }
})

export default apiClient
