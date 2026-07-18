import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(Boolean(localStorage.getItem('auth_access_token')))
  useEffect(() => {
    if (!localStorage.getItem('auth_access_token')) { setLoading(false); return }
    authService.me().then(({ data }) => setUser(data)).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])
  const role = String(user?.role || '').toUpperCase()
  const value = useMemo(() => ({ user, loading, isStudent: role.includes('ESTUDIANTE'), isAdmin: role.includes('ADMIN') || role.includes('ADMINISTR'), isTeacher: role.includes('DOCENTE') }), [user, loading, role])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)

