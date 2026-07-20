import apiClient from './api'

export const authService = {
  async login(credentials) {
    return apiClient.post('/api/v1/auth/login/', credentials)
  },
  async me() {
    return apiClient.get('/api/v1/auth/me/')
  },
  async logout(refresh) {
    return apiClient.post('/api/v1/auth/logout/', { refresh })
  },
}
