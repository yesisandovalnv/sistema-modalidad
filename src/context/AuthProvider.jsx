import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext'
import { authService } from '../services/authService'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('auth_access_token')))
  const loadUser = useCallback(async () => {
    if (!localStorage.getItem('auth_access_token')) { setUser(null); setLoading(false); return }
    setLoading(true)
    try { const { data } = await authService.me(); setUser(data) } catch (error) { if (error?.response?.status === 401) setUser(null) } finally { setLoading(false) }
  }, [])
  useEffect(() => {
    loadUser()
    const authenticated = () => loadUser()
    const expired = () => { setUser(null); setLoading(false) }
    window.addEventListener('auth-authenticated', authenticated)
    window.addEventListener('auth-session-expired', expired)
    return () => { window.removeEventListener('auth-authenticated', authenticated); window.removeEventListener('auth-session-expired', expired) }
  }, [loadUser])
  const logout = useCallback(async () => {
    const refresh = localStorage.getItem('auth_refresh_token')
    try { if (refresh) await authService.logout(refresh) } finally { localStorage.removeItem('auth_access_token'); localStorage.removeItem('auth_refresh_token'); setUser(null); setLoading(false) }
  }, [])
  const permissions = useMemo(() => user?.permisos || {}, [user])
  const hasPermission = useCallback((name) => permissions[name] === true, [permissions])
  const value = useMemo(() => ({ user, roleCode: user?.rol?.codigo || '', permissions, isAuthenticated: Boolean(user), loading, hasPermission, logout }), [user, permissions, loading, hasPermission, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
