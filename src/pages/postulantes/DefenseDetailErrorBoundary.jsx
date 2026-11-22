import { Component } from 'react'
import { Modal } from '../../components/crud/CrudShell'
import { Button } from '../../components/ui/button'

/** Isolates rendering failures in the Proyecto de Grado defense detail. */
export default class DefenseDetailErrorBoundary extends Component {
  // Recuerda la defensa actual: el aviso de error se reinicia solo al abrir otra defensa.
  state = { hasError: false, resetKey: this.props.resetKey }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) {
      return { hasError: false, resetKey: props.resetKey }
    }
    return null
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    const stackFrames = typeof error?.stack === 'string'
      ? error.stack.split('\n').slice(1).join('\n')
      : ''
    // Do not log the defense object or the exception message, which may contain personal data.
    console.error('Error al renderizar el detalle de defensa de Proyecto de Grado', {
      errorName: error?.name || 'Error',
      stackFrames,
      componentStack: errorInfo?.componentStack || '',
    })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return <Modal title="Detalle de defensa" onClose={this.props.onClose}>
      <section role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
        <h3 className="font-bold">No se pudo abrir el detalle de la defensa</h3>
        <p className="mt-1 text-sm">Ocurrió un error al mostrar esta defensa. El expediente sigue disponible; cierra este mensaje para regresar.</p>
        <Button className="mt-3" variant="secondary" onClick={this.props.onClose}>Volver al expediente</Button>
      </section>
    </Modal>
  }
}
