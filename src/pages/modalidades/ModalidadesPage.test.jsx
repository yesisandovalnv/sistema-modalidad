import { render,screen,waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ModalidadesPage from './ModalidadesPage'
import { crudService } from '../../services/crudService'
import { AuthContext } from '../../context/AuthContext'

vi.mock('../../services/crudService',()=>({endpoints:{modalidades:'/modalidades/'},crudService:{list:vi.fn(),create:vi.fn(),update:vi.fn(),remove:vi.fn()}}))
const renderPage = (canManage) => render(<AuthContext.Provider value={{ hasPermission: () => canManage }}><ModalidadesPage/></AuthContext.Provider>)

it('renderiza el listado real de modalidades para administración',async()=>{crudService.list.mockResolvedValue({count:1,next:null,previous:null,results:[{id:1,codigo:'PG',nombre:'Proyecto de Grado',descripcion:'Modalidad',activo:true}]});renderPage(true);await waitFor(()=>expect(screen.getByText('Proyecto de Grado')).toBeInTheDocument());expect(screen.getByRole('button',{name:'Nuevo registro'})).toBeInTheDocument()})

it('oculta acciones CRUD cuando el componente se usa sin capacidad administrativa',async()=>{crudService.list.mockResolvedValue({count:1,next:null,previous:null,results:[{id:1,codigo:'PG',nombre:'Proyecto de Grado',descripcion:'Modalidad',activo:true}]});renderPage(false);await waitFor(()=>expect(screen.getByText('Proyecto de Grado')).toBeInTheDocument());expect(screen.queryByRole('button',{name:'Nuevo registro'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Editar'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Eliminar'})).not.toBeInTheDocument()})
