import { Link } from 'react-router-dom'
import { ArrowLeft, Check, CircleAlert, CircleCheck, Info as InfoIcon } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { EMPTY } from './reglas'

export function StatusBadge({ value, positive = false, compact = false, tone }) {
  return <span className={`expediente-status ${compact ? 'expediente-status--compact' : ''}`} data-tone={positive ? 'success' : tone || 'neutral'}>{value || EMPTY}</span>
}

// Requisito cumplido / pendiente / informativo: ícono dibujado (no un carácter ✓ ⚠ ℹ).
export function RequirementIcon({ value }) {
  const tone = value === true ? 'success' : value === false ? 'warning' : 'info'
  const Icon = value === true ? CircleCheck : value === false ? CircleAlert : InfoIcon
  return <span className="expediente-req-icon" data-tone={tone} aria-hidden="true"><Icon className="h-4 w-4" strokeWidth={2} /></span>
}

export function StageMarker({ state }) {
  const complete = ['APROBADA', 'COMPLETADA', 'CERRADA'].includes(state)
  const active = ['EN_PROCESO', 'OBSERVADA'].includes(state)
  return <span aria-hidden="true" className="expediente-stage-marker" data-state={complete ? 'complete' : active ? 'active' : 'pending'}>{complete && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
}

export function Score({ label, value, scale, fallback = EMPTY, detail = null, decimalComma = false }) {
  const displayValue = decimalComma && value !== null && value !== undefined ? String(value).replace('.', ',') : value
  return <div className="rounded-lg border border-slate-200 p-4 text-center dark:border-slate-700"><dt className="text-sm font-medium text-slate-500">{label}</dt><dd className="mt-2 text-2xl font-bold">{displayValue ?? fallback}{scale && value !== null && value !== undefined ? <span className="text-sm font-medium text-slate-500"> / {scale}</span> : null}</dd>{detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}</div>
}

export function SectionError({ message, label, onRetry }) {
  return <div role="alert" className="mt-3 rounded-lg border border-red-200 p-3 text-sm"><p>{message}</p><Button className="mt-3" variant="secondary" onClick={onRetry}>{label}</Button></div>
}

export function PartialState({ message, onRetry }) {
  return <div role="status" className="mt-4 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700"><p>{message}</p><button className="mt-3 rounded-md border px-3 py-2 font-medium" onClick={onRetry}>Reintentar</button></div>
}

export function Info({ label, value }) {
  return <div><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 font-medium">{value || EMPTY}</dd></div>
}

export function BackLink() {
  return (
    <Link className="expediente-back" to="/postulantes" aria-label="Volver a postulaciones" title="Volver a postulaciones">
      <ArrowLeft className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
    </Link>
  )
}
