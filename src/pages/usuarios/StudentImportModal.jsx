import { useRef, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Modal } from '../../components/crud/CrudShell'
import { usuariosService } from '../../services/usuariosService'

export default function StudentImportModal({ onClose, onComplete }) {
  const fileInput = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selectFile = () => {
    if (!fileInput.current) return
    fileInput.current.value = ''
    fileInput.current.click()
  }

  const changeFile = (event) => {
    const selected = event.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setPreview(null)
    setResult(null)
    setError('')
  }

  const downloadTemplate = async () => {
    setError('')
    try {
      const blob = await usuariosService.downloadStudentTemplate()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'plantilla_estudiantes.xlsx'
      link.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(requestError.message || 'No se pudo descargar la plantilla.')
    }
  }

  const validate = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    setPreview(null)
    setResult(null)
    try {
      setPreview(await usuariosService.validateStudentImport(file))
    } catch (requestError) {
      setError(requestError.message || 'No se pudo validar el archivo.')
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    if (!preview?.valid || !window.confirm(`¿Confirmas la creación de ${preview.valid} estudiantes válidos?`)) return
    setBusy(true)
    setError('')
    try {
      const confirmation = await usuariosService.confirmStudentImport(preview.token)
      setResult(confirmation)
      onComplete()
    } catch (requestError) {
      setError(requestError.message || 'No se pudo confirmar la importación.')
    } finally {
      setBusy(false)
    }
  }

  const downloadErrors = () => {
    const rows = (result?.rows || preview?.rows || []).filter((row) => (
      !row.created && (row.errors || []).length
    ))
    const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const csv = ['Fila;Errores', ...rows.map((row) => `${row.row_number};${quote((row.errors || []).join(' | '))}`)].join('\r\n')
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'errores_importacion_estudiantes.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal title="Importar estudiantes" onClose={busy ? () => {} : onClose}>
      <div className="mt-4 space-y-4 text-sm">
        <section className="rounded-lg border p-3">
          <h3 className="font-semibold">1. Descargar plantilla</h3>
          <Button variant="outline" className="mt-2" onClick={downloadTemplate}>Descargar plantilla Excel</Button>
        </section>
        <section className="rounded-lg border p-3">
          <h3 className="font-semibold">2. Seleccionar y validar archivo</h3>
          <Button type="button" variant="outline" className="mt-2" disabled={busy} onClick={selectFile}>Seleccionar archivo Excel</Button>
          <input
            ref={fileInput}
            hidden
            type="file"
            aria-label="Archivo Excel de estudiantes"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={changeFile}
          />
          <p className="mt-1 text-slate-500">
            {file ? `${file.name} / ${(file.size / 1024).toFixed(1)} KB / ${preview ? 'Validado' : 'Pendiente de validar'}` : 'Sin archivo seleccionado'}
          </p>
          <Button className="mt-2" variant="secondary" disabled={!file || busy} onClick={validate}>
            {busy ? 'Procesando...' : 'Validar archivo'}
          </Button>
        </section>
        {error && <p role="alert" className="text-red-600">{error}</p>}
        {preview && <section>
          <h3 className="font-semibold">Vista previa</h3>
          <p className="mt-1">Total: {preview.total} / Válidos: {preview.valid} / Rechazados: {preview.rejected}</p>
          <div className="mt-2 max-h-64 overflow-auto rounded-lg border">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-100"><tr>{['Fila', 'Nombre completo', 'RU', 'CI', 'Estado', 'Errores'].map((label) => <th className="p-2" key={label}>{label}</th>)}</tr></thead>
              <tbody>{preview.rows.map((row) => <tr className="border-t align-top" key={row.row_number}>
                <td className="p-2">{row.row_number}</td>
                <td className="p-2">{[row.nombres, row.apellido_paterno, row.apellido_materno].filter(Boolean).join(' ')}</td>
                <td className="p-2">{row.ru}</td>
                <td className="p-2">{row.ci}</td>
                <td className="p-2">{row.valid ? 'Válido' : 'Rechazado'}</td>
                <td className="p-2">{row.errors.join(' ')}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button disabled={!preview.valid || busy} onClick={confirm}>Confirmar importación ({preview.valid})</Button>
            {preview.rejected > 0 && !result && <Button variant="outline" onClick={downloadErrors}>Descargar reporte de errores</Button>}
          </div>
        </section>}
        {result && <section role="status" className="rounded-lg border p-3">
          <h3 className="font-semibold">Resultado de la importación</h3>
          <p>Creados: {result.created} / Rechazados: {result.rejected}{result.already_confirmed ? ' Lote ya confirmado; se muestra el resultado original.' : ''}</p>
          <Button variant="outline" className="mt-2" onClick={downloadErrors}>Descargar reporte de errores</Button>
        </section>}
      </div>
    </Modal>
  )
}
