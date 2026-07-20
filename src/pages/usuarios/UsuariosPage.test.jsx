import { render,screen } from '@testing-library/react'
import { AuthContext } from '../../context/AuthContext'
import UsuariosPage from './UsuariosPage'

it('muestra el perfil real y explica el límite contractual',()=>{const user={username:'ana',nombre:'Ana Pérez',rol:{nombre:'Estudiante'},permisos:{puede_ver_notificaciones:true}};render(<AuthContext.Provider value={{user}}><UsuariosPage/></AuthContext.Provider>);expect(screen.getByRole('heading',{name:'Usuarios'})).toBeInTheDocument();expect(screen.getByText('Ana Pérez')).toBeInTheDocument();expect(screen.getByText(/solo expone el perfil autenticado/)).toBeInTheDocument()})
