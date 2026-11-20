import apiClient from './api'

export const authService = {
  async login(credentials) {
    return apiClient.post('/api/v1/auth/login/', credentials)
  },
  async studentLogin(credentials) {
    return apiClient.post('/api/v1/auth/student-login/', credentials)
  },
  async requestStudentActivation(credentials) {
    return apiClient.post('/api/v1/auth/student-activation/request/', credentials)
  },
  async confirmStudentActivation(credentials) {
    return apiClient.post('/api/v1/auth/student-activation/confirm/', credentials)
  },
  async requestStudentRecovery(credentials) {
    return apiClient.post('/api/v1/auth/student-recovery/request/', credentials)
  },
  async confirmStudentRecovery(credentials) {
    return apiClient.post('/api/v1/auth/student-recovery/confirm/', credentials)
  },
  async me() {
    return apiClient.get('/api/v1/auth/me/')
  },
  async logout(refresh) {
    return apiClient.post('/api/v1/auth/logout/', { refresh })
  },
}
