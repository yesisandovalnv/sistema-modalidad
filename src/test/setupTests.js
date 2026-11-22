import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'

// Con varios archivos de prueba en paralelo la máquina va más lenta: findBy/waitFor esperan
// hasta 3 s (antes 1 s). Las pruebas que aciertan siguen respondiendo apenas aparece el elemento.
configure({ asyncUtilTimeout: 3000 })

const storage = new Map()
const localStorageMock = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true })
Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true })

afterEach(() => {
  cleanup()
  localStorage.clear()
})
