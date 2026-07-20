import { useState } from 'react'
import { Button } from '../../components/ui/button'
import CatalogPage from '../catalogs/CatalogPage'
import { endpoints } from '../../services/crudService'

const periodFields = [
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'gestion', label: 'Gestión', type: 'number', required: true },
  { name: 'semestre', label: 'Semestre', type: 'select', required: true, options: [{ value: 'I', label: 'Semestre I' }, { value: 'II', label: 'Semestre II' }] },
  { name: 'fecha_inicio', label: 'Fecha inicial', type: 'date', required: true },
  { name: 'fecha_fin', label: 'Fecha final', type: 'date', required: true },
]
const periodColumns = [
  { key: 'nombre', label: 'Nombre' }, { key: 'gestion', label: 'Gestión' }, { key: 'semestre', label: 'Semestre' },
  { key: 'fecha_inicio', label: 'Inicio' }, { key: 'fecha_fin', label: 'Fin' }, { key: 'activo', label: 'Estado', render: (value) => value ? 'Activo' : 'Inactivo' },
]
const requirementFields = [{ name: 'codigo', label: 'Código', required: true }, { name: 'nombre', label: 'Nombre', required: true }, { name: 'descripcion', label: 'Descripción', type: 'textarea' }]
const requirementColumns = [{ key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Nombre' }, { key: 'descripcion', label: 'Descripción' }, { key: 'obligatorio', label: 'Obligatorio', render: (value) => value ? 'Sí' : 'No' }]

export default function ConfiguracionPage() {
  const [tab, setTab] = useState('periodos')
  return <div className="space-y-5"><nav aria-label="Catálogos de configuración" className="flex gap-2"><Button variant={tab === 'periodos' ? 'default' : 'secondary'} onClick={() => setTab('periodos')}>Periodos</Button><Button variant={tab === 'requisitos' ? 'default' : 'secondary'} onClick={() => setTab('requisitos')}>Requisitos</Button></nav>{tab === 'periodos' ? <CatalogPage title="Configuración de periodos" description="Administra periodos académicos existentes." path={endpoints.periodos} fields={periodFields} columns={periodColumns} /> : <CatalogPage title="Configuración de requisitos" description="Administra el catálogo general de requisitos." path={endpoints.requisitos} fields={requirementFields} columns={requirementColumns} />}</div>
}
