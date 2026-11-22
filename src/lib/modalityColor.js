// Color de cada modalidad (las series de gráficos de DESIGN.md). Lo usan el punto de color de la
// cabecera del Expediente y los botones de modalidad de Postulantes, para que una modalidad se
// reconozca por el mismo color en todo el sistema. El orden es el de las series.
export const MODALITY_COLOR = {
  PROYECTO_GRADO: '--chart-1',
  TESIS_GRADO: '--chart-2',
  TRABAJO_DIRIGIDO: '--chart-3',
  GRADUACION_VIA_DIPLOMADO: '--chart-4',
  EXCELENCIA_ACADEMICA: '--chart-5',
  EXAMEN_GRADO: '--chart-6',
}

const MODALITY_ORDER = Object.keys(MODALITY_COLOR)

// Ordena modalidades del catálogo como sus colores; las desconocidas van al final por nombre.
export function sortModalities(items, codeOf = (item) => item.codigo) {
  const rank = (item) => {
    const index = MODALITY_ORDER.indexOf(codeOf(item))
    return index === -1 ? MODALITY_ORDER.length : index
  }
  return [...items].sort((a, b) => rank(a) - rank(b))
}
