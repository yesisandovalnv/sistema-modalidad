import { fireEvent, render, screen } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { printHtmlBlob } from './printHtmlBlob'

function PrintRoute() {
  return <>
    <button type="button" onClick={() => printHtmlBlob(new Blob(['html']), { title: 'Reporte temporal' })}>Imprimir</button>
    <Link to="/inicio">Inicio</Link>
  </>
}

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('React Router navega normalmente despues de cerrar la impresion', async () => {
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:print-navigation'), revokeObjectURL: vi.fn() })
  vi.spyOn(window, 'focus').mockImplementation(() => {})
  render(<MemoryRouter initialEntries={['/reportes']}><Routes>
    <Route path="/reportes" element={<PrintRoute />} />
    <Route path="/inicio" element={<h1>Inicio del sistema</h1>} />
  </Routes></MemoryRouter>)

  fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
  const iframe = document.querySelector('iframe[title="Reporte temporal"]')
  vi.spyOn(iframe.contentWindow, 'focus').mockImplementation(() => {})
  vi.spyOn(iframe.contentWindow, 'print').mockImplementation(() => {})
  fireEvent.load(iframe)

  expect(document.body).toContainElement(iframe)
  iframe.contentWindow.dispatchEvent(new Event('afterprint'))
  await new Promise(requestAnimationFrame)
  expect(document.body).not.toContainElement(iframe)
  fireEvent.click(screen.getByRole('link', { name: 'Inicio' }))
  expect(await screen.findByRole('heading', { name: 'Inicio del sistema' })).toBeInTheDocument()
})
