import { useCountUp } from '../../hooks/useCountUp'

const formatter = new Intl.NumberFormat('es-BO')

// Número de indicador que cuenta hasta su valor. Los lectores de pantalla leen siempre
// el valor final, no los intermedios.
export function AnimatedNumber({ value, className = '' }) {
  const final = Number(value) || 0
  const shown = useCountUp(final)
  if (shown === final) return <span className={`tabular-nums ${className}`}>{formatter.format(final)}</span>
  return (
    <span className={`tabular-nums ${className}`}>
      <span aria-hidden="true">{formatter.format(shown)}</span>
      <span className="sr-only">{formatter.format(final)}</span>
    </span>
  )
}
