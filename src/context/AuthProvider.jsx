import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext'
import { authService } from '../services/authService'

export function AuthProvider({ children }) {
  const hasToken = Boolean(localStorage.getItem('auth_access_token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(hasToken)
  useEffect(() => {
    if (!hasToken) { setLoading(false); return }
    authService.me().then(({ data }) => setUser(data)).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [hasToken])
  const permissions = useMemo(() => user?.permisos || {}, [user])
  const hasPermission = useCallback((name) => permissions[name] === true, [permissions])
  const value = useMemo(() => ({ user, roleCode: user?.rol?.codigo || '', permissions, isAuthenticated: Boolean(user), loading, hasPermission }), [user, permissions, loading, hasPermission])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
