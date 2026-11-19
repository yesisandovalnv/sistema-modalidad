import { describe, expect, it, vi } from 'vitest'
import apiClient, { refreshClient } from './api'
import { authService } from './authService'

vi.mock('./api', () => ({ default: { post: vi.fn() }, refreshClient: { post: vi.fn() } }))

describe('student recovery transport', () => {
  it('uses the existing public transport so code rejection cannot trigger token refresh', async () => {
    const credentials = { ru: 'RU1', ci: '001' }
    await authService.requestStudentRecovery(credentials)
    expect(refreshClient.post).toHaveBeenCalledWith('/api/v1/auth/student-recovery/request/', credentials)
    const confirm = { ...credentials, code: '123456', password: 'new-password' }
    await authService.confirmStudentRecovery(confirm)
    expect(refreshClient.post).toHaveBeenCalledWith('/api/v1/auth/student-recovery/confirm/', confirm)
    expect(apiClient.post).not.toHaveBeenCalled()
  })
})
