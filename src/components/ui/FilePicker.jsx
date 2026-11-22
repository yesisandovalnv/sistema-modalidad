import { useId, useState } from 'react'
import { FileCheck2, FileUp } from 'lucide-react'

function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Selector de archivo del sistema: ícono, nombre del archivo y botón "Elegir archivo".
 * Al elegir uno, el ícono pasa a "archivo listo" y el botón a "Cambiar". El <input type="file">
 * nativo sigue dentro (oculto a la vista, no al teclado ni a los lectores), así el formulario
 * lo envía igual. `file` permite controlarlo desde fuera (p. ej. al quitar la selección).
 */
export function FilePicker({ id, name, label, file: controlledFile, onFile, required, disabled, describedBy, accept, hint = 'PDF, Word o imagen' }) {
  const generatedId = useId()
  const inputId = id || `archivo-${generatedId.replace(/:/g, '')}`
  const [ownFile, setOwnFile] = useState(null)
  const file = controlledFile !== undefined ? controlledFile : ownFile
  return (
    <label htmlFor={inputId} className="file-picker" data-state={file ? 'ready' : 'empty'} data-disabled={disabled || undefined}>
      <input
        id={inputId}
        name={name}
        type="file"
        aria-label={label}
        required={required}
        disabled={disabled}
        accept={accept}
        aria-describedby={describedBy}
        className="file-picker-input"
        onChange={(event) => {
          const next = event.target.files?.[0] || null
          setOwnFile(next)
          onFile?.(next)
        }}
      />
      <span className="file-picker-icon" aria-hidden="true">
        {file ? <FileCheck2 className="h-5 w-5" strokeWidth={1.9} /> : <FileUp className="h-5 w-5" strokeWidth={1.9} />}
      </span>
      <span className="file-picker-text">
        <span className="file-picker-name">{file ? file.name : 'Ningún archivo elegido'}</span>
        <span className="file-picker-hint">{file ? `Listo para cargar · ${formatSize(file.size)}` : hint}</span>
      </span>
      <span className="file-picker-button" aria-hidden="true">{file ? 'Cambiar' : 'Elegir archivo'}</span>
    </label>
  )
}
