// Las barras ocupan todo el ancho y se recortan: así crecen con clip-path (sin animar `width`)
// y, al cambiar los datos, pasan del valor anterior al nuevo.
export function barClip(percent) {
  const safe = Math.min(100, Math.max(0, Number(percent) || 0))
  return `inset(0 ${100 - safe}% 0 0 round 9999px)`
}
