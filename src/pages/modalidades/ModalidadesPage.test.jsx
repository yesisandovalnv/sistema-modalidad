import { render,screen,waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ModalidadesPage from './ModalidadesPage'
import { crudService } from '../../services/crudService'
import { AuthContext } from '../../context/AuthContext'

vi.mock('../../services/crudService',()=>({endpoints:{modalidades:'/modalidades/'},crudService:{list:vi.fn(),create:vi.fn(),update:vi.fn(),remove:vi.fn()}}))
const renderPage = ({ canView = true, canManage = false } = {}) => render(<AuthContext.Provider value={{ hasPermission: (permission) => permission === 'puede_ver_modalidades' ? canView : permission === 'puede_gestionar_catalogos' ? canManage : false }}><ModalidadesPage/></AuthContext.Provider>)

it('renderiza el listado real de modalidades para administración',async()=>{crudService.list.mockResolvedValue({count:1,next:null,previous:null,results:[{id:1,codigo:'PG',nombre:'Proyecto de Grado',descripcion:'Modalidad',activo:true}]});renderPage({ canManage: true });await waitFor(()=>expect(screen.getByText('Proyecto de Grado')).toBeInTheDocument());expect(screen.getByRole('button',{name:'Nuevo registro'})).toBeInTheDocument()})

it('muestra modalidades en modo consulta sin acciones CRUD',async()=>{crudService.list.mockResolvedValue({count:1,next:null,previous:null,results:[{id:1,codigo:'PG',nombre:'Proyecto de Grado',descripcion:'Modalidad',activo:true}]});renderPage({ canView: true });await waitFor(()=>expect(screen.getByText('Proyecto de Grado')).toBeInTheDocument());expect(screen.getByText('PG')).toBeInTheDocument();expect(screen.getByText('Modalidad')).toBeInTheDocument();expect(screen.getByText('Activa')).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Nuevo registro'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Editar'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Eliminar'})).not.toBeInTheDocument()})
