import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { clearLegacyThemeOverrides } from './lib/colorThemes'

// Reinicio de la paleta: se borran los colores que guardaba la antigua Configuración → Apariencia.
// Ahora cada usuario elige su tema de color en Mi perfil (se aplica al entrar, en MainLayout).
clearLegacyThemeOverrides()
import { AuthProvider } from './context/AuthProvider'
import { NotificationProvider } from './context/NotificationProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider><NotificationProvider><App /></NotificationProvider></AuthProvider>
  </StrictMode>,
)
