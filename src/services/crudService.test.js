import { vi } from 'vitest'
import apiClient from './api'
import { crudService, listAll } from './crudService'

vi.mock('./api',()=>({default:{get:vi.fn(),post:vi.fn(),patch:vi.fn(),delete:vi.fn()}}))
describe('crudService',()=>{
  it('lista conservando filtros válidos y omitiendo vacíos',async()=>{const signal=new AbortController().signal;apiClient.get.mockResolvedValue({data:{count:0,results:[]}});await crudService.list('/items/',{search:'',activo:false,page:1},signal);expect(apiClient.get).toHaveBeenCalledWith('/items/',{params:{activo:false,page:1},signal})})
  it('crea registros',async()=>{apiClient.post.mockResolvedValue({data:{id:1}});await expect(crudService.create('/items/',{nombre:'A'})).resolves.toEqual({id:1})})
  it('actualiza parcialmente',async()=>{apiClient.patch.mockResolvedValue({data:{id:2}});await crudService.update('/items/',2,{nombre:'B'});expect(apiClient.patch).toHaveBeenCalledWith('/items/2/',{nombre:'B'})})
  it('elimina cuando el endpoint lo admite',async()=>{apiClient.delete.mockResolvedValue({data:null});await crudService.remove('/items/',3);expect(apiClient.delete).toHaveBeenCalledWith('/items/3/')})
  it('preserva estado y validaciones del backend',async()=>{apiClient.get.mockRejectedValue({response:{status:400,data:{nombre:['Obligatorio.']}}});await expect(crudService.list('/items/')).rejects.toMatchObject({status:400,message:'nombre: Obligatorio.'})})
  it('recorre todas las páginas del catálogo',async()=>{apiClient.get.mockResolvedValueOnce({data:{results:[{id:1}],next:'next'}}).mockResolvedValueOnce({data:{results:[{id:2}],next:null}});await expect(listAll('/items/')).resolves.toEqual([{id:1},{id:2}]);expect(apiClient.get).toHaveBeenCalledTimes(2)})
})
