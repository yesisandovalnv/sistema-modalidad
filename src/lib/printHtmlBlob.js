export function printHtmlBlob(blob, { title, signal } = {}) {
  const url = URL.createObjectURL(blob)
  const iframe = document.createElement('iframe')
  const previouslyFocused = document.activeElement
  let cleaned = false
  let printSettled = false
  let finishScheduled = false
  let frameWindow
  let rejectPrint

  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    iframe.onload = null
    iframe.onerror = null
    signal?.removeEventListener('abort', abort)
    frameWindow?.removeEventListener('afterprint', finishPrint)
    window.removeEventListener('afterprint', finishPrint)
    window.removeEventListener('focus', finishPrint)
    iframe.remove()
    URL.revokeObjectURL(url)
  }

  const abort = () => {
    cleanup()
    if (!printSettled) rejectPrint?.(new DOMException('Impresión cancelada.', 'AbortError'))
  }

  const finishPrint = () => {
    if (finishScheduled || cleaned) return
    finishScheduled = true
    restoreApplicationFocus()
    requestAnimationFrame(cleanup)
  }

  const restoreApplicationFocus = () => {
    window.focus()
    if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
      previouslyFocused.focus({ preventScroll: true })
    }
  }

  iframe.setAttribute('aria-hidden', 'true')
  iframe.setAttribute('title', title)
  Object.assign(iframe.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '1px',
    height: '1px',
    border: '0',
    pointerEvents: 'none',
  })

  return new Promise((resolve, reject) => {
    rejectPrint = reject
    if (signal?.aborted) {
      cleanup()
      reject(new DOMException('Impresión cancelada.', 'AbortError'))
      return
    }
    signal?.addEventListener('abort', abort, { once: true })
    iframe.onload = () => {
      try {
        frameWindow = iframe.contentWindow
        if (!frameWindow) throw new Error('No se pudo acceder al documento de impresión.')

        frameWindow.addEventListener('afterprint', finishPrint, { once: true })
        window.addEventListener('afterprint', finishPrint, { once: true })
        window.addEventListener('focus', finishPrint, { once: true })
        frameWindow.focus()
        frameWindow.print()
        printSettled = true
        resolve()
      } catch (error) {
        printSettled = true
        cleanup()
        reject(error)
      }
    }
    iframe.onerror = () => {
      cleanup()
      reject(new Error('No se pudo cargar el documento de impresión.'))
    }
    iframe.src = url
    document.body.appendChild(iframe)
  })
}
