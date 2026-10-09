import { afterEach, describe, expect, it, vi } from 'vitest'
import { printHtmlBlob } from './printHtmlBlob'

describe('printHtmlBlob', () => {
  afterEach(() => {
    document.body.replaceChildren()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function stubObjectUrl(url = 'blob:print-report') {
    const createObjectURL = vi.fn(() => url)
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    return { createObjectURL, revokeObjectURL }
  }

  it('mantiene el documento hasta afterprint, restaura el foco y limpia los recursos', async () => {
    const { revokeObjectURL } = stubObjectUrl()
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    const focusWindow = vi.spyOn(window, 'focus').mockImplementation(() => {})

    const printing = printHtmlBlob(new Blob(['html']), { title: 'Reporte temporal' })
    const iframe = document.querySelector('iframe[title="Reporte temporal"]')
    vi.spyOn(iframe.contentWindow, 'focus').mockImplementation(() => {})
    const print = vi.spyOn(iframe.contentWindow, 'print').mockImplementation(() => {})

    iframe.focus()
    iframe.dispatchEvent(new Event('load'))
    await printing

    expect(print).toHaveBeenCalledOnce()
    expect(document.body).toContainElement(iframe)
    expect(revokeObjectURL).not.toHaveBeenCalled()

    iframe.contentWindow.dispatchEvent(new Event('afterprint'))
    await new Promise(requestAnimationFrame)

    expect(focusWindow).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(trigger)
    expect(document.body).not.toContainElement(iframe)
    expect(revokeObjectURL).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:print-report')
  })

  it('no elimina el iframe cuando print retorna antes de abrir el dialogo', async () => {
    const { revokeObjectURL } = stubObjectUrl()
    const printing = printHtmlBlob(new Blob(['html']), { title: 'Reporte temporal' })
    const iframe = document.querySelector('iframe[title="Reporte temporal"]')
    vi.spyOn(iframe.contentWindow, 'focus').mockImplementation(() => {})
    vi.spyOn(iframe.contentWindow, 'print').mockImplementation(() => {})
    iframe.dispatchEvent(new Event('load'))
    await printing

    expect(document.body).toContainElement(iframe)
    expect(revokeObjectURL).not.toHaveBeenCalled()

    window.dispatchEvent(new Event('focus'))
    await new Promise(requestAnimationFrame)
    expect(document.body).not.toContainElement(iframe)
    expect(revokeObjectURL).toHaveBeenCalledOnce()
  })

  it('limpia y rechaza si falla la carga o la impresion', async () => {
    const { revokeObjectURL } = stubObjectUrl()
    const loadFailure = printHtmlBlob(new Blob(['html']), { title: 'Fallo de carga' })
    const firstIframe = document.querySelector('iframe[title="Fallo de carga"]')
    firstIframe.dispatchEvent(new Event('error'))
    await expect(loadFailure).rejects.toThrow('No se pudo cargar')
    expect(document.body).not.toContainElement(firstIframe)

    const printFailure = printHtmlBlob(new Blob(['html']), { title: 'Fallo de impresion' })
    const secondIframe = document.querySelector('iframe[title="Fallo de impresion"]')
    vi.spyOn(secondIframe.contentWindow, 'focus').mockImplementation(() => {})
    vi.spyOn(secondIframe.contentWindow, 'print').mockImplementation(() => { throw new Error('Chrome no pudo imprimir') })
    secondIframe.dispatchEvent(new Event('load'))
    await expect(printFailure).rejects.toThrow('Chrome no pudo imprimir')
    expect(document.body).not.toContainElement(secondIframe)
    expect(revokeObjectURL).toHaveBeenCalledTimes(2)
  })

  it('permite cancelar y limpiar antes de que cargue el iframe', async () => {
    const { revokeObjectURL } = stubObjectUrl()
    const controller = new AbortController()
    const printing = printHtmlBlob(new Blob(['html']), { title: 'Reporte cancelado', signal: controller.signal })
    const iframe = document.querySelector('iframe[title="Reporte cancelado"]')

    controller.abort()

    await expect(printing).rejects.toMatchObject({ name: 'AbortError' })
    expect(document.body).not.toContainElement(iframe)
    expect(revokeObjectURL).toHaveBeenCalledOnce()
  })
})
