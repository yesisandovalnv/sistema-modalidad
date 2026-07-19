import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('auth_access_token')

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

let sessionExpired = false
apiClient.interceptors.response.use((response) => { sessionExpired = false; return response }, (error) => {
  if (error?.response?.status === 401 && !sessionExpired) {
    sessionExpired = true
    localStorage.removeItem('auth_access_token')
    localStorage.removeItem('auth_refresh_token')
    window.dispatchEvent(new Event('auth-session-expired'))
  }
  return Promise.reject(error)
})

export default apiClient
