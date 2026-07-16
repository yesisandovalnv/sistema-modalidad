import apiClient from '../api/client'

export const authService = {
  async login(credentials) {
    return apiClient.post('/v1/auth/login/', credentials)
  },
  async me() {
    return apiClient.get('/v1/auth/me/')
  },
}
