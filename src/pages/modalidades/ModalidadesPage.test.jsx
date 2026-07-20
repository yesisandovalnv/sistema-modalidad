import { render,screen,waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ModalidadesPage from './ModalidadesPage'
import { crudService } from '../../services/crudService'

vi.mock('../../services/crudService',()=>({endpoints:{modalidades:'/modalidades/'},crudService:{list:vi.fn(),create:vi.fn(),update:vi.fn(),remove:vi.fn()}}))
it('renderiza el listado real de modalidades',async()=>{crudService.list.mockResolvedValue({count:1,next:null,previous:null,results:[{id:1,codigo:'PG',nombre:'Proyecto de Grado',descripcion:'Modalidad',activo:true}]});render(<ModalidadesPage/>);await waitFor(()=>expect(screen.getByText('Proyecto de Grado')).toBeInTheDocument());expect(screen.getByRole('button',{name:'Nuevo registro'})).toBeInTheDocument()})
