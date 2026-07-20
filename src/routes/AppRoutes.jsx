import { Navigate, Route, Routes } from 'react-router-dom'
import { MainLayout } from '../layouts/MainLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import LoginPage from '../pages/auth/LoginPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import ReportePostulacionesPage from '../pages/reports/ReportePostulacionesPage'
import ForbiddenPage from '../pages/ForbiddenPage'
import NotFoundPage from '../pages/NotFoundPage'
import { useAuth } from '../hooks/useAuth'
import NotificacionesPage from '../pages/notifications/NotificacionesPage'
import PostulantesPage from '../pages/postulantes/PostulantesPage'
import DocumentosPage from '../pages/documentos/DocumentosPage'
import ModalidadesPage from '../pages/modalidades/ModalidadesPage'
import SeguimientoPage from '../pages/seguimiento/SeguimientoPage'
import UsuariosPage from '../pages/usuarios/UsuariosPage'
import ConfiguracionPage from '../pages/configuracion/ConfiguracionPage'
import ExpedientePage from '../pages/postulantes/ExpedientePage'

export function ProtectedRoute({children,requiredPermission}){const {loading,isAuthenticated,hasPermission}=useAuth();if(loading)return <div className="p-10 text-center">Cargando sesión…</div>;if(!isAuthenticated)return <Navigate to="/login" replace/>;if(requiredPermission&&!hasPermission(requiredPermission))return <ForbiddenPage/>;return children}
export default function AppRoutes(){return <Routes><Route element={<AuthLayout/>}><Route path="/login" element={<LoginPage/>}/></Route><Route element={<ProtectedRoute><MainLayout/></ProtectedRoute>}>
 <Route path="/dashboard" element={<ProtectedRoute requiredPermission="puede_ver_dashboard"><DashboardPage/></ProtectedRoute>}/><Route path="/reportes" element={<Navigate to="/reportes/postulaciones" replace/>}/><Route path="/reportes/postulaciones" element={<ProtectedRoute requiredPermission="puede_ver_reportes"><ReportePostulacionesPage/></ProtectedRoute>}/>
 <Route path="/notificaciones" element={<ProtectedRoute requiredPermission="puede_ver_notificaciones"><NotificacionesPage/></ProtectedRoute>}/>
 <Route path="/postulantes" element={<ProtectedRoute requiredPermission="puede_ver_postulaciones"><PostulantesPage/></ProtectedRoute>}/><Route path="/postulaciones/:id" element={<ProtectedRoute requiredPermission="puede_ver_postulaciones"><ExpedientePage/></ProtectedRoute>}/><Route path="/documentos" element={<ProtectedRoute requiredPermission="puede_ver_documentos"><DocumentosPage/></ProtectedRoute>}/><Route path="/modalidades" element={<ProtectedRoute requiredPermission="puede_gestionar_catalogos"><ModalidadesPage/></ProtectedRoute>}/><Route path="/seguimiento" element={<ProtectedRoute requiredPermission="puede_ver_seguimiento"><SeguimientoPage/></ProtectedRoute>}/><Route path="/usuarios" element={<ProtectedRoute requiredPermission="puede_gestionar_usuarios"><UsuariosPage/></ProtectedRoute>}/><Route path="/configuracion" element={<ProtectedRoute requiredPermission="puede_ver_configuracion"><ConfiguracionPage/></ProtectedRoute>}/>
 </Route><Route path="/" element={<Navigate to="/dashboard" replace/>}/><Route path="*" element={<NotFoundPage/>}/></Routes>}
