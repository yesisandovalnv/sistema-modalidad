// Repara textos que llegaron de la base de datos con la ñ y las tildes mal codificadas
// ("Inscripci├│n" → "Inscripción", "IngenierÔö£┬ía" → "Ingeniería"). Pasó porque textos
// UTF-8 se leyeron como CP850/CP437 (consola de Windows) o Latin-1 antes de guardarse.
//
// Solo cambia un texto si tiene las marcas típicas de ese error y al revertirlo resulta UTF-8
// válido; si no, lo deja igual. No toca la base de datos ni los códigos (que son ASCII).

const CP437_HIGH = 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ '
const CP437_BYTE = new Map([...CP437_HIGH].map((char, index) => [char, 0x80 + index]))
// CP850: la página de códigos de la consola en español (aquí 'é' dañada se ve como '├®').
const CP850_HIGH = "\u00c7\u00fc\u00e9\u00e2\u00e4\u00e0\u00e5\u00e7\u00ea\u00eb\u00e8\u00ef\u00ee\u00ec\u00c4\u00c5\u00c9\u00e6\u00c6\u00f4\u00f6\u00f2\u00fb\u00f9\u00ff\u00d6\u00dc\u00f8\u00a3\u00d8\u00d7\u0192\u00e1\u00ed\u00f3\u00fa\u00f1\u00d1\u00aa\u00ba\u00bf\u00ae\u00ac\u00bd\u00bc\u00a1\u00ab\u00bb\u2591\u2592\u2593\u2502\u2524\u00c1\u00c2\u00c0\u00a9\u2563\u2551\u2557\u255d\u00a2\u00a5\u2510\u2514\u2534\u252c\u251c\u2500\u253c\u00e3\u00c3\u255a\u2554\u2569\u2566\u2560\u2550\u256c\u00a4\u00f0\u00d0\u00ca\u00cb\u00c8\u0131\u00cd\u00ce\u00cf\u2518\u250c\u2588\u2584\u00a6\u00cc\u2580\u00d3\u00df\u00d4\u00d2\u00f5\u00d5\u00b5\u00fe\u00de\u00da\u00db\u00d9\u00fd\u00dd\u00af\u00b4\u00ad\u00b1\u2017\u00be\u00b6\u00a7\u00f7\u00b8\u00b0\u00a8\u00b7\u00b9\u00b3\u00b2\u25a0\u00a0"
const CP850_BYTE = new Map([...CP850_HIGH].map((char, index) => [char, 0x80 + index]))
const MARKERS = /[├┬┼┤┐└┘│─ÔÃÂ]/
const decoder = typeof TextDecoder === 'function' ? new TextDecoder('utf-8', { fatal: true }) : null

function decodeWith(text, toByte) {
  const bytes = new Uint8Array(text.length)
  for (let index = 0; index < text.length; index += 1) {
    const byte = toByte(text[index])
    if (byte === undefined) return null
    bytes[index] = byte
  }
  try {
    return decoder.decode(bytes)
  } catch {
    return null
  }
}

const cp437Byte = (char) => {
  const code = char.charCodeAt(0)
  return code < 0x80 ? code : CP437_BYTE.get(char)
}
const cp850Byte = (char) => {
  const code = char.charCodeAt(0)
  return code < 0x80 ? code : CP850_BYTE.get(char)
}
const latin1Byte = (char) => {
  const code = char.charCodeAt(0)
  return code <= 0xff ? code : undefined
}

export function fixMojibake(text) {
  if (typeof text !== 'string' || !decoder || !MARKERS.test(text)) return text
  let current = text
  // Hasta tres pasadas: hay textos que se dañaron dos veces.
  for (let pass = 0; pass < 3 && MARKERS.test(current); pass += 1) {
    const next = decodeWith(current, cp850Byte) ?? decodeWith(current, cp437Byte) ?? decodeWith(current, latin1Byte)
    if (!next || next === current) break
    current = next
  }
  return current
}

/** Recorre una respuesta JSON y repara cada texto. Devuelve el mismo objeto si no cambió nada. */
export function fixMojibakeDeep(value) {
  if (typeof value === 'string') return fixMojibake(value)
  if (Array.isArray(value)) {
    let changed = false
    const next = value.map((item) => {
      const fixed = fixMojibakeDeep(item)
      if (fixed !== item) changed = true
      return fixed
    })
    return changed ? next : value
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    let changed = false
    const next = {}
    for (const [key, item] of Object.entries(value)) {
      const fixed = fixMojibakeDeep(item)
      if (fixed !== item) changed = true
      next[key] = fixed
    }
    return changed ? next : value
  }
  return value
}
