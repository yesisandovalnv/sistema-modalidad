import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

// Botón único de "siguiente acción" (Ver documentos, Ver todos los postulantes…): píldora
// --primary-soft con disco de flecha --primary; al pasar el cursor se invierte. Usar este
// componente en todas las pantallas en lugar de enlaces sueltos.
// `state`: estado de navegación opcional (p. ej. { background } para abrir el destino en una ventana).
export function ActionButton({ to, children, size = 'md', state }) {
  return (
    <Link to={to} state={state} className={`action-button ${size === 'sm' ? 'action-button--sm' : ''}`}>
      {children}
      <span className="action-button-arrow" aria-hidden="true"><ArrowRight className="h-4 w-4" strokeWidth={2.25} /></span>
    </Link>
  )
}
