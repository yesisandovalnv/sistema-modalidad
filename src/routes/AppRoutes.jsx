import { useEffect, useState } from 'react'
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
import ProfilePage from '../pages/profile/ProfilePage'
import { crudService, endpoints } from '../services/crudService'

export function ProtectedRoute({children,requiredPermission}){const {loading,isAuthenticated,hasPermission}=useAuth();if(loading)return <div className="p-10 text-center">Cargando sesión…</div>;if(!isAuthenticated)return <Navigate to="/login" replace/>;if(requiredPermission&&!hasPermission(requiredPermission))return <ForbiddenPage/>;return children}
export function InitialRouteResolver(){
 const {loading:authLoading,isAuthenticated,hasPermission}=useAuth();const [state,setState]=useState({loading:true,error:'',destination:''});const [revision,setRevision]=useState(0)
 const canViewDashboard=hasPermission?.('puede_ver_dashboard')===true;const canViewApplications=hasPermission?.('puede_ver_postulaciones')===true
 useEffect(()=>{if(authLoading||!isAuthenticated||canViewDashboard||!canViewApplications)return undefined;const controller=new AbortController();setState({loading:true,error:'',destination:''});crudService.list(endpoints.postulaciones,{page:1,ordering:'-created_at'},controller.signal).then((response)=>{if(controller.signal.aborted)return;const rows=Array.isArray(response)?response:(response.results||[]);const count=Array.isArray(response)?rows.length:(response.count??rows.length);setState({loading:false,error:'',destination:count===1&&rows[0]?.id?`/postulaciones/${rows[0].id}`:'/postulantes'})}).catch((error)=>{if(!controller.signal.aborted&&!error?.canceled)setState({loading:false,error:error?.message||'No se pudo determinar la página inicial.',destination:''})});return()=>controller.abort()},[authLoading,isAuthenticated,canViewDashboard,canViewApplications,revision])
 if(authLoading)return <div className="p-10 text-center" role="status">Cargando sesión…</div>;if(!isAuthenticated)return <Navigate to="/login" replace/>;if(canViewDashboard)return <Navigate to="/dashboard" replace/>;if(!canViewApplications)return <ForbiddenPage/>;if(state.destination)return <Navigate to={state.destination} replace/>;if(state.error)return <div className="mx-auto max-w-xl rounded-xl border border-red-300 bg-red-50 p-8 text-center" role="alert"><h1 className="text-xl font-bold">No se pudo abrir la página inicial</h1><p className="mt-2">{state.error}</p><button type="button" className="mt-5 rounded-md border px-4 py-2" onClick={()=>setRevision((value)=>value+1)}>Reintentar</button></div>;return <div className="p-10 text-center" role="status">Cargando postulaciones…</div>
}
export default function AppRoutes(){return <Routes><Route element={<AuthLayout/>}><Route path="/login" element={<LoginPage/>}/></Route><Route element={<ProtectedRoute><MainLayout/></ProtectedRoute>}>
 <Route path="/perfil" element={<ProfilePage/>}/>
 <Route path="/dashboard" element={<ProtectedRoute requiredPermission="puede_ver_dashboard"><DashboardPage/></ProtectedRoute>}/><Route path="/reportes" element={<Navigate to="/reportes/postulaciones" replace/>}/><Route path="/reportes/postulaciones" element={<ProtectedRoute requiredPermission="puede_ver_reportes"><ReportePostulacionesPage/></ProtectedRoute>}/>
 <Route path="/notificaciones" element={<ProtectedRoute requiredPermission="puede_ver_notificaciones"><NotificacionesPage/></ProtectedRoute>}/>
 <Route path="/postulantes" element={<ProtectedRoute requiredPermission="puede_ver_postulaciones"><PostulantesPage/></ProtectedRoute>}/><Route path="/postulaciones/:id" element={<ProtectedRoute requiredPermission="puede_ver_postulaciones"><ExpedientePage/></ProtectedRoute>}/><Route path="/documentos" element={<ProtectedRoute requiredPermission="puede_ver_documentos"><DocumentosPage/></ProtectedRoute>}/><Route path="/modalidades" element={<ProtectedRoute requiredPermission="puede_ver_modalidades"><ModalidadesPage/></ProtectedRoute>}/><Route path="/seguimiento" element={<ProtectedRoute requiredPermission="puede_ver_seguimiento"><SeguimientoPage/></ProtectedRoute>}/><Route path="/usuarios" element={<ProtectedRoute requiredPermission="puede_gestionar_usuarios"><UsuariosPage/></ProtectedRoute>}/><Route path="/configuracion" element={<ProtectedRoute requiredPermission="puede_ver_configuracion"><ConfiguracionPage/></ProtectedRoute>}/><Route path="/" element={<InitialRouteResolver/>}/>
 </Route><Route path="*" element={<NotFoundPage/>}/></Routes>}
