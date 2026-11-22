import { useState } from 'react'
import { CircleCheck, Download, FileSpreadsheet } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Modal } from '../../components/crud/CrudShell'
import { FilePicker } from '../../components/ui/FilePicker'
import { usuariosService } from '../../services/usuariosService'

// Importación de estudiantes desde Excel (Usuarios y Postulantes). Pasos en filas planas separadas
// por filetes, sin recuadros dentro de la ventana; las acciones de cada paso van a la derecha.
export default function StudentImportModal({ onClose, onComplete }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const changeFile = (selected) => {
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
    const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'errores_importacion_estudiantes.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal title="Importar estudiantes" onClose={busy ? () => {} : onClose}>
      <div className="import-steps">
        <section className="import-step" aria-labelledby="import-step-1">
          <span className="import-step-number" aria-hidden="true">1</span>
          <div className="import-step-text">
            <h3 id="import-step-1" className="import-step-title">Descargar plantilla</h3>
            <p className="import-step-hint">Completa una fila por estudiante con sus nombres, R.U. y C.I.</p>
          </div>
          <Button variant="secondary" className="gap-2" onClick={downloadTemplate}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Descargar plantilla Excel
          </Button>
        </section>

        <section className="import-step" aria-labelledby="import-step-2">
          <span className="import-step-number" aria-hidden="true">2</span>
          <div className="import-step-text">
            <h3 id="import-step-2" className="import-step-title">Elegir y validar el archivo</h3>
            <p className="import-step-hint">{file ? (preview ? 'Archivo validado.' : 'Pendiente de validar.') : 'Se revisa antes de crear a nadie.'}</p>
          </div>
          <div className="import-step-body">
            <FilePicker
              label="Archivo Excel de estudiantes"
              file={file}
              onFile={changeFile}
              disabled={busy}
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              hint="Excel (.xlsx)"
            />
            <div className="import-step-actions">
              <Button disabled={!file || busy} onClick={validate}>
                {busy && !preview ? 'Procesando...' : 'Validar archivo'}
              </Button>
            </div>
          </div>
        </section>

        {error && <p role="alert" className="text-sm text-[var(--danger-text)]">{error}</p>}

        {preview && (
          <section className="import-step" aria-labelledby="import-step-3">
            <span className="import-step-number" aria-hidden="true">3</span>
            <div className="import-step-text">
              <h3 id="import-step-3" className="import-step-title">Vista previa</h3>
              <p className="import-step-hint">Total: {preview.total} / Válidos: {preview.valid} / Rechazados: {preview.rejected}</p>
            </div>
            <div className="import-step-body">
              <div className="import-preview">
                <table>
                  <thead><tr>{['Fila', 'Nombre completo', 'RU', 'CI', 'Estado', 'Errores'].map((label) => <th key={label}>{label}</th>)}</tr></thead>
                  <tbody>{preview.rows.map((row) => <tr key={row.row_number}>
                    <td>{row.row_number}</td>
                    <td>{[row.nombres, row.apellido_paterno, row.apellido_materno].filter(Boolean).join(' ')}</td>
                    <td>{row.ru}</td>
                    <td>{row.ci}</td>
                    <td><span className="postulante-status" data-tone={row.valid ? 'success' : 'danger'}>{row.valid ? 'Válido' : 'Rechazado'}</span></td>
                    <td>{row.errors.join(' ')}</td>
                  </tr>)}</tbody>
                </table>
              </div>
              <div className="import-step-actions">
                {preview.rejected > 0 && !result && <Button variant="secondary" onClick={downloadErrors}>Descargar reporte de errores</Button>}
                <Button disabled={!preview.valid || busy} onClick={confirm}>
                  <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                  Confirmar importación ({preview.valid})
                </Button>
              </div>
            </div>
          </section>
        )}

        {result && (
          <section role="status" className="import-result">
            <CircleCheck className="import-result-icon" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 className="import-step-title">Resultado de la importación</h3>
              <p className="import-step-hint">Creados: {result.created} / Rechazados: {result.rejected}{result.already_confirmed ? ' Lote ya confirmado; se muestra el resultado original.' : ''}</p>
            </div>
            <Button variant="secondary" onClick={downloadErrors}>Descargar reporte de errores</Button>
          </section>
        )}
      </div>
    </Modal>
  )
}
