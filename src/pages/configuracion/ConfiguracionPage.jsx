import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { useAuth } from '../../hooks/useAuth'
import { endpoints } from '../../services/crudService'
import CatalogPage from '../catalogs/CatalogPage'

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
const documentTypeFields = [
  { name: 'codigo', label: 'Código', required: true },
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'descripcion', label: 'Descripción', type: 'textarea' },
  { name: 'obligatorio', label: 'Obligatorio', type: 'checkbox', default: false },
  { name: 'permite_multiple_version', label: 'Permite múltiples versiones', type: 'checkbox', default: false },
  { name: 'tamano_maximo_mb', label: 'Tamaño máximo (MB)', type: 'number', required: true, min: 1, step: 1, default: 10 },
  { name: 'extensiones_permitidas', label: 'Extensiones permitidas (separadas por comas)', required: true, default: 'pdf,doc,docx' },
]
const documentTypeColumns = [
  { key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Nombre' },
  { key: 'obligatorio', label: 'Obligatorio', render: (value) => value ? 'Sí' : 'No' },
  { key: 'permite_multiple_version', label: 'Múltiples versiones', render: (value) => value ? 'Sí' : 'No' },
  { key: 'tamano_maximo_mb', label: 'Máximo (MB)' }, { key: 'extensiones_permitidas', label: 'Extensiones' },
  { key: 'activo', label: 'Estado', render: (value) => value ? 'Activo' : 'Inactivo' },
]
const prepareDocumentType = (form) => ({
  ...form,
  tamano_maximo_mb: Number(form.tamano_maximo_mb),
  extensiones_permitidas: [...new Set(String(form.extensiones_permitidas).split(',').map((value) => value.trim().toLowerCase()).filter(Boolean))].join(','),
})

export default function ConfiguracionPage() {
  const { hasPermission } = useAuth()
  const canManageDocumentTypes = hasPermission('puede_gestionar_catalogos')
  const [tab, setTab] = useState('periodos')
  return <div className="space-y-5">
    <nav aria-label="Catálogos de configuración" className="flex flex-wrap gap-2">
      <Button variant={tab === 'periodos' ? 'default' : 'secondary'} onClick={() => setTab('periodos')}>Periodos</Button>
      <Button variant={tab === 'requisitos' ? 'default' : 'secondary'} onClick={() => setTab('requisitos')}>Requisitos</Button>
      {canManageDocumentTypes && <Button variant={tab === 'tipos-documento' ? 'default' : 'secondary'} onClick={() => setTab('tipos-documento')}>Tipos de documento</Button>}
    </nav>
    {tab === 'periodos' ? <CatalogPage title="Configuración de periodos" description="Administra periodos académicos existentes." path={endpoints.periodos} fields={periodFields} columns={periodColumns} />
      : tab === 'requisitos' ? <CatalogPage title="Configuración de requisitos" description="Administra el catálogo general de requisitos." path={endpoints.requisitos} fields={requirementFields} columns={requirementColumns} />
        : <CatalogPage title="Tipos de documento" description="Administra los tipos documentales disponibles para la carga de archivos." path={endpoints.tiposDocumento} fields={documentTypeFields} columns={documentTypeColumns} preparePayload={prepareDocumentType} deleteDescription={(name) => `¿Eliminar ${name}? Esta acción es permanente y puede ser rechazada si el tipo está en uso.`} />}
  </div>
}
