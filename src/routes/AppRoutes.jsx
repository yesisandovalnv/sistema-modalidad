import { Navigate, Route, Routes } from 'react-router-dom'
import { MainLayout } from '../layouts/MainLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import LoginPage from '../pages/auth/LoginPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import ReportePostulacionesPage from '../pages/reports/ReportePostulacionesPage'
import ForbiddenPage from '../pages/ForbiddenPage'
import NotFoundPage from '../pages/NotFoundPage'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({children}){return localStorage.getItem('auth_access_token')?children:<Navigate to="/login" replace/>}
function ReportsRoute({children}){const {loading,isStudent}=useAuth();if(loading)return <div className="p-10 text-center">Cargando sesión…</div>;return isStudent?<ForbiddenPage/>:children}
const Placeholder=({children})=><div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">{children} en construcción</div>
export default function AppRoutes(){return <Routes><Route element={<AuthLayout/>}><Route path="/login" element={<LoginPage/>}/></Route><Route element={<ProtectedRoute><MainLayout/></ProtectedRoute>}>
 <Route path="/dashboard" element={<ReportsRoute><DashboardPage/></ReportsRoute>}/><Route path="/reportes" element={<Navigate to="/reportes/postulaciones" replace/>}/><Route path="/reportes/postulaciones" element={<ReportsRoute><ReportePostulacionesPage/></ReportsRoute>}/>
 <Route path="/postulantes" element={<Placeholder>Postulantes</Placeholder>}/><Route path="/documentos" element={<Placeholder>Documentos</Placeholder>}/><Route path="/modalidades" element={<Placeholder>Modalidades</Placeholder>}/><Route path="/seguimiento" element={<Placeholder>Seguimiento</Placeholder>}/><Route path="/usuarios" element={<Placeholder>Usuarios</Placeholder>}/><Route path="/configuracion" element={<Placeholder>Configuración</Placeholder>}/>
 </Route><Route path="/" element={<Navigate to="/dashboard" replace/>}/><Route path="*" element={<NotFoundPage/>}/></Routes>}
