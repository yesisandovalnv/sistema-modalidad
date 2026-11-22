// Vista guardada por pantalla (Postulantes, Actores…): 'tarjetas' o 'lista'.
export function readStoredView(key, fallback = 'tarjetas') {
  try {
    const value = localStorage.getItem(key)
    return value === 'lista' || value === 'tarjetas' ? value : fallback
  } catch { return fallback }
}

export function storeView(key, value) {
  try { localStorage.setItem(key, value) } catch { /* sin almacenamiento: dura hasta recargar */ }
}
