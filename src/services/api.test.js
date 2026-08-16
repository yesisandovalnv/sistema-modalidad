import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient, { refreshClient } from './api'

const response = (config, status = 200, data = {}) => Promise.resolve({ config, status, statusText: String(status), headers: {}, data })
const failure = (config, status, data = {}) => Promise.reject({ config, response: { config, status, data } })

describe('apiClient JWT refresh', () => {
  let expiredEvents

  beforeEach(() => {
    localStorage.clear()
    expiredEvents = vi.fn()
    window.addEventListener('auth-session-expired', expiredEvents)
  })

  afterEach(() => window.removeEventListener('auth-session-expired', expiredEvents))

  it('no refresca una request con access válido', async () => {
    localStorage.setItem('auth_access_token', 'access-vigente')
    const refresh = vi.fn()
    refreshClient.defaults.adapter = refresh
    await apiClient.get('/recurso/', { adapter: (config) => response(config, 200, { ok: true }) })
    expect(refresh).not.toHaveBeenCalled()
  })

  it('refresca, rota tokens y reintenta una sola vez la request original', async () => {
    localStorage.setItem('auth_access_token', 'access-vencido')
    localStorage.setItem('auth_refresh_token', 'refresh-anterior')
    refreshClient.defaults.adapter = vi.fn((config) => response(config, 200, { access: 'access-nuevo', refresh: 'refresh-nuevo' }))
    const resource = vi.fn((config) => resource.mock.calls.length === 1 ? failure(config, 401, { code: 'token_not_valid' }) : response(config, 200, { ok: true }))

    await expect(apiClient.get('/recurso/', { adapter: resource })).resolves.toMatchObject({ data: { ok: true } })
    expect(refreshClient.defaults.adapter).toHaveBeenCalledTimes(1)
    expect(resource).toHaveBeenCalledTimes(2)
    expect(resource.mock.calls[1][0].headers.get('Authorization')).toBe('Bearer access-nuevo')
    expect(localStorage.getItem('auth_access_token')).toBe('access-nuevo')
    expect(localStorage.getItem('auth_refresh_token')).toBe('refresh-nuevo')
    expect(expiredEvents).not.toHaveBeenCalled()
  })

  it('finaliza sesión si el refresh es inválido', async () => {
    localStorage.setItem('auth_access_token', 'access-vencido')
    localStorage.setItem('auth_refresh_token', 'refresh-vencido')
    refreshClient.defaults.adapter = (config) => failure(config, 401, { code: 'token_not_valid' })
    await expect(apiClient.get('/recurso/', { adapter: (config) => failure(config, 401) })).rejects.toBeTruthy()
    expect(localStorage.getItem('auth_access_token')).toBeNull()
    expect(localStorage.getItem('auth_refresh_token')).toBeNull()
    expect(expiredEvents).toHaveBeenCalledTimes(1)
  })

  it('comparte un único refresh entre 401 simultáneos', async () => {
    localStorage.setItem('auth_access_token', 'access-vencido')
    localStorage.setItem('auth_refresh_token', 'refresh-vigente')
    let finishRefresh
    refreshClient.defaults.adapter = vi.fn((config) => new Promise((resolve) => { finishRefresh = () => resolve({ config, status: 200, statusText: '200', headers: {}, data: { access: 'access-nuevo' } }) }))
    const adapters = [vi.fn(), vi.fn()]
    adapters.forEach((adapter) => adapter.mockImplementation((config) => adapter.mock.calls.length === 1 ? failure(config, 401) : response(config)))
    const requests = adapters.map((adapter, index) => apiClient.get(`/recurso/${index}/`, { adapter }))
    await vi.waitFor(() => expect(refreshClient.defaults.adapter).toHaveBeenCalledTimes(1))
    finishRefresh()
    await Promise.all(requests)
    expect(adapters.every((adapter) => adapter.mock.calls.length === 2)).toBe(true)
  })

  it('no crea un loop si la request reintentada también devuelve 401', async () => {
    localStorage.setItem('auth_access_token', 'access-vencido')
    localStorage.setItem('auth_refresh_token', 'refresh-vigente')
    refreshClient.defaults.adapter = (config) => response(config, 200, { access: 'access-nuevo' })
    const resource = vi.fn((config) => failure(config, 401))
    await expect(apiClient.get('/recurso/', { adapter: resource })).rejects.toBeTruthy()
    expect(resource).toHaveBeenCalledTimes(2)
    expect(expiredEvents).toHaveBeenCalledTimes(1)
  })

  it.each([400, 403, 500])('no invalida sesión por status %s', async (status) => {
    localStorage.setItem('auth_access_token', 'access-vigente')
    localStorage.setItem('auth_refresh_token', 'refresh-vigente')
    await expect(apiClient.get('/recurso/', { adapter: (config) => failure(config, status) })).rejects.toBeTruthy()
    expect(localStorage.getItem('auth_access_token')).toBe('access-vigente')
    expect(expiredEvents).not.toHaveBeenCalled()
  })

  it('no invalida sesión por error de red', async () => {
    localStorage.setItem('auth_access_token', 'access-vigente')
    await expect(apiClient.get('/recurso/', { adapter: () => Promise.reject(new Error('network')) })).rejects.toBeTruthy()
    expect(localStorage.getItem('auth_access_token')).toBe('access-vigente')
    expect(expiredEvents).not.toHaveBeenCalled()
  })

  it.each(['/api/v1/auth/login/', '/api/v1/auth/refresh/', '/api/v1/auth/logout/'])('no refresca el endpoint %s', async (url) => {
    localStorage.setItem('auth_access_token', 'access-vencido')
    localStorage.setItem('auth_refresh_token', 'refresh-vigente')
    const refresh = vi.fn()
    refreshClient.defaults.adapter = refresh
    await expect(apiClient.post(url, {}, { adapter: (config) => failure(config, 401) })).rejects.toBeTruthy()
    expect(refresh).not.toHaveBeenCalled()
  })
})
