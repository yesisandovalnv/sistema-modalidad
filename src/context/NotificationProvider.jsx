import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NotificationContext } from './NotificationContext'
import { useAuth } from '../hooks/useAuth'
import { notificacionesService } from '../services/notificacionesService'

export function NotificationProvider({ children }) {
  const { user, loading, hasPermission } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [countLoading, setCountLoading] = useState(false)
  const controller = useRef(null)
  const allowed = Boolean(user) && hasPermission('puede_ver_notificaciones')
  const refreshUnreadCount = useCallback(async () => {
    if (!allowed) { setUnreadCount(0); return 0 }
    controller.current?.abort(); controller.current = new AbortController(); setCountLoading(true)
    try { const data = await notificacionesService.obtenerConteoNoLeidas(controller.current.signal); setUnreadCount(Math.max(0, Number(data.count) || 0)); return data.count }
    catch (error) { if (error?.name !== 'CanceledError' && error?.code !== 'ERR_CANCELED') setUnreadCount((value) => value); return null }
    finally { setCountLoading(false) }
  }, [allowed])
  useEffect(() => { if (!loading) refreshUnreadCount(); return () => controller.current?.abort() }, [loading, refreshUnreadCount])
  const decrementUnread = useCallback(() => setUnreadCount((value) => Math.max(0, value - 1)), [])
  const incrementUnread = useCallback(() => setUnreadCount((value) => value + 1), [])
  const clearUnread = useCallback(() => setUnreadCount(0), [])
  const value = useMemo(() => ({ unreadCount, countLoading, refreshUnreadCount, decrementUnread, incrementUnread, clearUnread }), [unreadCount, countLoading, refreshUnreadCount, decrementUnread, incrementUnread, clearUnread])
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
