import CatalogPage from '../catalogs/CatalogPage'
import { endpoints } from '../../services/crudService'

export default function ModalidadesPage(){return <CatalogPage title="Modalidades" description="Catálogo de modalidades registrado por el backend." path={endpoints.modalidades} fields={[{name:'codigo',label:'Código',required:true},{name:'nombre',label:'Nombre',required:true},{name:'descripcion',label:'Descripción',type:'textarea'}]} columns={[{key:'codigo',label:'Código'},{key:'nombre',label:'Nombre'},{key:'descripcion',label:'Descripción'},{key:'activo',label:'Estado',render:v=>v?'Activa':'Inactiva'}]}/>} 
