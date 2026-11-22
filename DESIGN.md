---
name: Sistema de Modalidad
description: Expediente de graduación de la Carrera de Ingeniería de Sistemas (UABJB), con los colores de la universidad y del sello de carrera acreditada.
colors:
  uab-azul-900: "#02254e"
  uab-azul-950: "#001a3a"
  uab-azul-noche: "#000f22"
  uab-rojo: "#c10202"
  uab-turquesa: "#3bbdc9"
  uab-turquesa-texto: "#167784"
  uab-dorado: "#cc9d3b"
  uab-dorado-texto: "#8a6418"
  uab-azul-web: "#0037dd"
  primary-hover: "#0a3266"
  primary-soft: "#e1e8f2"
  canvas: "#eaf0f7"
  surface: "#f8fafd"
  surface-raised: "#ffffff"
  surface-sunken: "#e1e8f2"
  surface-secondary: "#eef3f9"
  border: "#d3dde9"
  border-strong: "#7a8ba3"
  text-primary: "#0b1f3a"
  text-secondary: "#475a73"
  text-muted: "#5e6e86"
  nav-text: "#d6e2f0"
  nav-meta: "#9fb4cf"
  success: "#15803d"
  success-soft: "#e3f4ec"
  success-text: "#11683f"
  warning: "#e0a526"
  warning-soft: "#fff3d1"
  warning-text: "#7a4f00"
  danger-soft: "#fde8e8"
  danger-text: "#a4161a"
  info-soft: "#ddf3f5"
  info-text: "#0f5f69"
  canvas-dark: "#0a1628"
  surface-dark: "#12233d"
  surface-raised-dark: "#182c4a"
  surface-sunken-dark: "#0d1b31"
  border-dark: "#22395c"
  border-strong-dark: "#5a7193"
  text-primary-dark: "#e6edf7"
  text-secondary-dark: "#a9b8cd"
  text-muted-dark: "#8c9db5"
  primary-hover-dark: "#5fcbd5"
  link-dark: "#7fd3dc"
  chart-1: "#02254e"
  chart-2: "#1b8a96"
  chart-3: "#b5852c"
  chart-4: "#0037dd"
  chart-5: "#7a8ba3"
  chart-6: "#5b3e8f"
  chart-1-dark: "#7fa6e0"
  chart-2-dark: "#3bbdc9"
  chart-3-dark: "#cc9d3b"
  chart-4-dark: "#6f8cff"
  chart-5-dark: "#a9b8cd"
  chart-6-dark: "#b49ae0"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "3.75rem"
    fontWeight: 700
    lineHeight: 1
  headline:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  meta:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "0.08em"
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  panel: "28px"
  full: "9999px"
spacing:
  gutter-mobile: "16px"
  gutter-desktop: "32px"
  card: "24px"
  navbar-height: "64px"
  sidebar-expanded: "272px"
  sidebar-collapsed: "80px"
  touch-target: "44px"
components:
  button-primary:
    backgroundColor: "{colors.uab-azul-900}"
    textColor: "{colors.surface-raised}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.uab-azul-900}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary-hover}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    textColor: "{colors.primary-hover}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card}"
  metric-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.uab-azul-900}"
    rounded: "{rounded.xl}"
    padding: "20px"
  metric-featured:
    backgroundColor: "{colors.uab-azul-900}"
    textColor: "{colors.surface-raised}"
    typography: "{typography.display}"
    rounded: "{rounded.xl}"
    padding: "24px"
  pill-control:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "0 18px"
    height: "{spacing.touch-target}"
  pill-chevron:
    backgroundColor: "{colors.uab-azul-900}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.full}"
    size: "32px"
  button-pill:
    backgroundColor: "{colors.uab-azul-900}"
    textColor: "{colors.surface-raised}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "40px"
  nav-item:
    textColor: "{colors.nav-text}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "0 12px"
    height: "{spacing.touch-target}"
  nav-item-active:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.uab-azul-900}"
    rounded: "{rounded.xl}"
  navbar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.uab-azul-900}"
    height: "{spacing.navbar-height}"
  chip-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success-text}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  chip-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning-text}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  chip-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger-text}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  chip-info:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.info-text}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  chip-neutral:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.uab-azul-900}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
---

# Design System: Sistema de Modalidad

## Overview

**Creative North Star: "La casa de la carrera acreditada"**

El sistema es una oficina de trabajo de la Carrera de Ingeniería de Sistemas de la UABJB, no un producto genérico. Comparte la estructura de su sistema hermano, Fondo de Tiempo Docente: un menú lateral azul marino, un panel de trabajo azulado que se separa del menú con una esquina redondeada grande y, encima, tarjetas claras. Los colores no se inventan: salen del escudo oficial de la UABJB y del sello de la carrera acreditada (aro azul marino, engranaje turquesa, cinta dorada "ACREDITADA", franja roja). No existe manual de identidad visual publicado; la fuente de verdad son los tokens de `src/index.css`.

La densidad es la de una herramienta administrativa que se usa durante horas: texto base de 14 px, una sola familia sans del sistema, superficies planas con una sombra ambiental muy suave teñida de azul marino. El color con intención se concentra en el menú y en los estados; el área de trabajo es casi monocroma (azulados fríos) para que los estados semánticos y la acción principal se lean de inmediato. El mismo esquema existe en modo claro y en modo oscuro, y los dos se mantienen.

Todo se mueve, pero poco y rápido (regla del usuario del 21/11/2026: "todo debe tener animaciones"). Cada pieza rediseñada llega con su animación: el contenido entra subiendo unos píxeles en cascada, los números cuentan hasta su valor, las barras y la dona se llenan y la píldora activa del menú se desliza. El movimiento usa solo `transform`, `opacity` y `clip-path`, la curva `--ease-out` y respeta `prefers-reduced-motion`.

Se rechazan explícitamente el panel gris genérico con un único acento y el degradado celeste y morado del menú anterior.

Muchas pantallas anteriores todavía usan utilidades de Tailwind fijas (`slate-*`, `sky-*`, unos 38 archivos) y `LoginPage.css` conserva un degradado azul-violeta. Es deriva heredada, no el sistema: la autoridad son los tokens de este documento, y esas pantallas se migran a ellos cuando se tocan.

**Key Characteristics:**
- Menú azul marino con degradado vertical, escudo UABJB en placa blanca circular con anillo dorado y elemento activo en píldora blanca con icono turquesa.
- Marco azul en L (menú + barra superior) y, dentro, el panel de trabajo `--canvas` con las dos esquinas izquierdas redondeadas (28 px), siempre visibles: solo el panel se desplaza.
- Tarjetas `--surface` con borde fino y sombra ambiental tenue.
- Estados semánticos en dos versiones: suave (chip) y sólida (aviso).
- Una sola familia tipográfica del sistema; jerarquía por peso y tamaño.
- Toda pantalla consume tokens semánticos, nunca valores hexadecimales ni los primitivos `--uab-*`.
- Una sola tarjeta azul marino por pantalla: la del total, con filete dorado.
- Filtros en forma de píldora sobre fondo hundido, con disco azul marino para el desplegable.
- Movimiento breve con curva de salida en todo lo rediseñado; con "reducir movimiento" queda en fundidos o en estático.

## Colors

Paleta institucional de la UABJB: un azul marino dominante, un turquesa funcional para foco y actividad, un dorado escaso de marca y un único rojo para peligro, sobre neutros azulados fríos.

Los valores se definen en dos capas en `src/index.css`. La capa de **primitivos** (`--uab-*`) guarda los colores medidos del escudo y del sello. La capa **semántica** (`--canvas`, `--surface`, `--text-*`, `--primary`, `--focus`, `--nav-*`, `--success*`, etc.) es la única que usan las pantallas, y es la que cambia en `html.dark`.

### Primary
- **Azul marino UABJB** (`--uab-azul-900`): aro del sello. Es `--primary` en modo claro (botón principal, paginación activa), `--heading` (títulos de página y de tarjeta) y el texto del elemento activo del menú. Contraste 15,2:1 con blanco.
- **Azul marino profundo** (`--uab-azul-950`) y **Azul noche** (`--uab-azul-noche`): final del degradado del menú (claro y oscuro respectivamente) y texto sobre turquesa en el botón principal oscuro.
- **Azul hover** (`--primary-hover`): hover del botón principal y comienzo del degradado del menú en modo claro.
- **Azul suave** (`--primary-soft`): fondo del botón secundario, del avatar de iniciales y hover de los botones de contorno y fantasma.

### Secondary
- **Turquesa del engranaje** (`--uab-turquesa`): solo sobre azul marino. Títulos de sección del menú (`--nav-section`), anillo de foco dentro del menú y selección de texto. En modo oscuro pasa a ser `--primary` y `--focus`. Sobre blanco solo da 2,3:1: nunca como texto sobre claro.
- **Turquesa texto** (`--uab-turquesa-texto`): la versión legible sobre claro (5,2:1). Es `--focus` en modo claro, el icono del elemento activo del menú (`--nav-active-icon`) y el color sólido de información.

### Tertiary
- **Dorado de la cinta "ACREDITADA"** (`--uab-dorado`, expuesto como `--brand-gold`): acento de marca. Aparece en el anillo de la placa del escudo, en el filete de la tarjeta de total (`--brand-gold`, 40 × 4 px) y como tercera serie de gráficos. Su versión **Dorado texto** (`--uab-dorado-texto`, `--brand-gold-text`) existe para el caso raro de texto dorado sobre claro.
- **Azul web UABJB** (`--uab-azul-web`): azul de los botones del sitio institucional; es `--link` en modo claro (enlaces dentro del texto, subrayados).
- **Amarillo del "1"** (`--uab-amarillo`): primitivo reservado para detalles pequeños sobre azul; aún no tiene uso en la interfaz.

### Neutral
- **Panel azulado** (`--canvas`): fondo del área de trabajo. La barra superior es azul del menú (`--nav-bg-start`). En oscuro, `--canvas-dark`.
- **Papel frío** (`--surface`): tarjetas, ventanas y panel de filtros.
- **Blanco elevado** (`--surface-raised`): menús desplegables y lo que flota sobre las tarjetas.
- **Hundido** (`--surface-sunken`): campos de texto y pistas de barras. **Secundario** (`--surface-secondary`): hover de botones de icono y elementos de lista.
- **Borde** (`--border`) para separadores y bordes de tarjeta; **Borde fuerte** (`--border-strong`, 3,3:1) para el contorno de campos y controles.
- **Tinta** (`--text-primary`, 15,8:1), **Texto secundario** (`--text-secondary`, 6,7:1) para descripciones y rol del usuario, **Texto tenue** (`--text-muted`, 5,0:1) para ayudas, marcas de tiempo y pie de página.
- **Texto del menú** (`--nav-text`) y **Meta del menú** (`--nav-meta`): texto e información secundaria sobre el azul marino.

### Estados semánticos
Cada estado tiene tres tokens: sólido (`--success`, `--warning`, `--danger`, `--info`), fondo suave (`-soft`) y texto (`-text`). Las parejas suave/texto superan 6:1 en ambos modos.
- **Éxito** (verde): Concluida, Aprobado.
- **Aviso** (ámbar `--warning`; su versión sólida lleva texto azul marino, no blanco): Observada, Pendiente de corrección.
- **Peligro** (`--danger` = `--uab-rojo`): Rechazada, Anulada, eliminar, error, insignia de notificaciones no leídas.
- **Información** (turquesa texto): En proceso.
- **Neutro** (`--neutral*`): Registrada, Borrador.
- `--document` y `--delivery` existen como categorías adicionales (azul web y turquesa) para chips y series de gráficos.
- `--evaluation` apunta hoy al dorado y se usa como chip y como borde de modalidad: es deriva frente a la regla de abajo, no un patrón a extender.
- En los indicadores de Inicio cada estado usa su terna: icono en disco `-soft` con color `-text` y barra de proporción en el sólido (En proceso = información, Concluidas = éxito, Rechazadas = peligro, Sin etapa actual = aviso).

### Series de gráficos
Seis series en orden fijo (`--chart-1` a `--chart-6`), definidas para claro y oscuro: azul marino, turquesa oscurecido, dorado oscurecido, azul web, gris azulado (`--border-strong`) y violeta. En modo claro el turquesa y el dorado de las series son versiones más oscuras que los primitivos, para que se lean sobre papel; en oscuro se usan los primitivos tal cual, porque el fondo es azul marino. El violeta es el único tono fuera de la paleta institucional y existe solo como sexta serie. La dona usa hasta seis categorías; con más, la distribución pasa a lista de barras. Cada serie va acompañada en la leyenda de su nombre, su cifra y su porcentaje: el color nunca va solo.

### Named Rules
**The One Red Rule.** `#C10202` es el único rojo del sistema: cubre marca, peligro, error y eliminar. No se usan otros rojos ni rosados.

**The Navy-Only Brights Rule.** Turquesa, dorado y amarillo se usan tal cual solo sobre azul marino. Sobre fondo claro se usan únicamente sus variantes `-texto`, que cumplen WCAG AA (≥ 4,5:1).

**The Gold Is Not A State Rule.** El dorado es acento de marca (anillo del escudo, filete de la tarjeta de total, una serie de gráficos). Nunca comunica un estado de postulación.

**The Semantic Token Rule.** Las pantallas usan solo tokens semánticos. Un `#hex`, un primitivo `--uab-*` o una utilidad de color de Tailwind (`slate-*`, `sky-*`) en una pantalla es un defecto.

## Typography

**Body Font:** system-ui (con -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)

**Character:** Una sola familia sans del sistema, sin fuentes descargadas. Se lee como un documento administrativo bien hecho: neutra, rápida de cargar en celulares de la región y familiar en Windows (Segoe UI) y Android. La jerarquía se construye con peso (400, 500, 600, 700) y tamaño, nunca con una segunda familia.

### Hierarchy
- **Display** (700, 3 rem en celular y 3,75 rem desde 640 px, interlineado 1): solo la cifra de la tarjeta de total, en blanco y alineada a la derecha.
- **Headline** (700, 1,5 rem en celular y 1,875 rem desde 640 px): título de página ("Bienvenido, Lucía"); las cifras de los indicadores de estado y el total de la dona usan 1,875 rem, en `--heading`.
- **Title** (600, 1 rem): nombre de la pantalla en la barra superior y nombre del sistema en el menú; los títulos de tarjeta usan 600 entre 1,125 y 1,25 rem.
- **Body** (400–500, 0,875 rem): texto de trabajo, botones (500) y elementos del menú (500; 600 cuando están activos). Es el tamaño dominante de la aplicación.
- **Meta** (400–600, 0,75 rem): rol del usuario, chips de estado (600), insignias (700, cifras tabulares) y pie de página.
- **Label** (600, 0,6875 rem, interletrado 0,08 em, mayúsculas): exclusivamente los títulos de grupo del menú lateral ("PRINCIPAL", "ADMINISTRACIÓN", "REPORTES"), en turquesa sobre azul.

### Named Rules
**The One Family Rule.** Ninguna pantalla introduce otra familia tipográfica. El contraste viene del peso y del tamaño.

**The Tabular Count Rule.** Las cifras que cambian (insignias, contadores, números que cuentan hasta su valor, porcentajes) usan `tabular-nums` para no mover el diseño.

## Layout

Estructura de tres piezas montada en `MainLayout`: menú lateral fijo, barra superior fija y columna de contenido.

- **Menú lateral:** 272 px expandido y 80 px colapsado en escritorio (≥ 768 px). Al colapsar, las etiquetas se ocultan, la placa del escudo pasa de 120 px a 48 px y los elementos quedan como iconos con `title` y `aria-label`. Bajo 768 px el menú es un panel deslizable de 272 px con velo `--scrim`, botón de cierre circular, foco inicial en ese botón, cierre con Escape y devolución del foco.
- **Barra superior:** 64 px de alto, fondo `--nav-bg-start` (continúa el azul del menú, sin borde), textos e iconos en `--nav-text`/blanco y el rol en `--nav-meta`. A la izquierda, el botón de menú y el nombre de la pantalla actual; a la derecha, tema, campana y control de cuenta (nombre y rol). El nombre y el rol de la persona viven solo aquí, no en el menú.
- **Columna de contenido (panel):** ocupa el alto de la ventana menos la barra y es lo único que se desplaza (`overflow-y: auto`), así sus esquinas superior e inferior izquierdas (`--panel-radius`, 28 px) quedan siempre a la vista sobre el degradado del menú que pinta `.app-shell`. En celular, esquinas superiores de 20 px. Relleno lateral de 16 px en celular y 32 px en escritorio; el contenido empieza 24 px bajo el borde del panel. El panel no es `fixed` ni usa `transform`, para que las ventanas emergentes sigan cubriendo toda la pantalla. Al cambiar de pantalla vuelve arriba.
- **Tarjetas:** relleno interno de 24 px; las rejillas de indicadores separan tarjetas con 16–24 px.
- **Objetivos táctiles:** elementos del menú de 44 px de alto como mínimo; botones de icono de 40 px circulares.
- **Pie de página:** una línea `--text-muted` de 12 px con la institución y la carrera, separada por un borde superior.

### Composición de Inicio
Bloques separados 20 px en vertical y rejillas con 16 px de separación (12 px entre indicadores en celular). Puntos de quiebre de Tailwind: 640, 1024 y 1280 px.
- **Cabecera:** tarjeta de saludo (disco de icono de 56 px en `--surface-sunken` con esquina de 16 px, título y descripción) y, a su derecha desde 1280 px, la tarjeta de total en una columna de 20 rem. Debajo de 1280 px se apilan.
- **Barra de filtros:** panel de píldoras en una sola tarjeta, de 1 a 5 columnas (6 con buscador) según el ancho.
- **Indicadores de estado:** cuatro tarjetas, 2 columnas en celular y 4 desde 1280 px.
- **Distribuciones:** la dona ocupa 2 de 3 columnas desde 1280 px (gráfico de 12 rem a la izquierda y leyenda a la derecha desde 640 px); las listas de etapa y estado se apilan en la tercera.
- **Indicadores operativos:** tres tarjetas de filas etiqueta/cifra separadas por bordes `--border`; la siguiente acción ("Ver documentos", "Ver notificaciones") va al pie de la tarjeta y solo se muestra si el rol tiene el permiso de esa pantalla.

**The Rounded Seam Rule.** En escritorio, la unión entre el marco azul y el panel son siempre las dos esquinas redondeadas de 28 px (arriba y abajo), visibles en todo momento porque solo el panel se desplaza. No se sustituyen por un borde recto ni por una sombra.

## Elevation & Depth

Sistema plano con capas tonales y una sombra ambiental mínima. La profundidad viene del orden de superficies (`--canvas` → `--surface` → `--surface-raised`) y del contraste entre el menú azul marino y el panel claro; la sombra solo separa la tarjeta del panel. En modo oscuro las capas aclaran hacia arriba (`#0A1628` → `#12233D` → `#182C4A`) y la sombra se oscurece.

### Shadow Vocabulary
- **Sombra de tarjeta** (`--card-shadow`: `0 1px 2px rgb(2 37 78 / 6%), 0 4px 16px rgb(2 37 78 / 6%)`; oscuro `0 1px 2px rgb(0 0 0 / 30%), 0 4px 16px rgb(0 0 0 / 22%)`): tarjetas y panel de filtros. Teñida de azul marino, nunca gris neutro.
- **Píldora activa del menú** (`0 2px 8px rgb(0 15 34 / 25%)`): eleva el elemento activo sobre el azul.
- **Placa del escudo** (`0 0 0 2px var(--brand-gold), 0 6px 18px rgb(0 15 34 / 35%)`): el anillo dorado y la sombra que la separa del menú.
- **Botón principal** (`0 1px 2px rgb(2 37 78 / 18%)`): asiento mínimo.
- **Tarjeta de total** (`0 6px 20px rgb(2 37 78 / 22%)`; en oscuro, filo interior blanco al 8 % más `--card-shadow`): la única tarjeta del panel con sombra propia, porque es la única oscura sobre el panel claro.
- **Píldora deslizante del menú** (`.sidebar-indicator`): la misma sombra de la píldora activa, que ahora viaja con ella.

### Named Rules
**The Flat Panel Rule.** El área de trabajo no tiene más de un nivel de sombra a la vez: tarjeta sobre panel. Lo que flota (menú de cuenta) se distingue por `--surface-raised` y borde, no por sombras más pesadas. La tarjeta de total es la excepción registrada, y por eso hay una sola por pantalla.

## Shapes

Esquinas suaves y consistentes, con dos formas especiales. Los controles pequeños (botones) usan 6 px; los campos y el control de cuenta, 8 px; tarjetas, elementos del menú y menús desplegables, 12 px. El panel de filtros y el disco de icono de la cabecera de Inicio usan 16 px. Lo circular se reserva para chips de estado, insignias, botones de icono, la placa del escudo, los campos y botones de la barra de filtros, los discos de icono de los indicadores, y las pistas de barras. Las barras se recortan con `clip-path: inset(… round 9999px)`, así conservan sus extremos redondos mientras crecen. La forma de firma es la esquina de 28 px del panel de trabajo hacia el menú. Los bordes son de 1 px en `--border`; `--border-strong` solo en el contorno de campos y del botón de contorno.

## Components

### Buttons
Sobrios y legibles; la acción principal es azul marino y no compite con el menú.
- **Shape:** esquinas suaves (6 px), relleno 8 × 16 px, texto 14 px de peso 500.
- **Primary:** fondo `--primary` (azul marino en claro, turquesa con texto azul profundo en oscuro), texto `--on-primary`; hover a `--primary-hover`.
- **Secondary:** fondo `--primary-soft`, texto azul marino; hover mezcla turquesa al 24 % con la superficie.
- **Outline:** borde de azul al 42 % sobre `--surface`, texto `--primary-hover`; hover a `--primary-soft`.
- **Ghost:** sin fondo, texto `--primary-hover`; hover a `--primary-soft`. En oscuro, secundario, contorno y fantasma usan `--text-primary`.
- **Focus:** anillo de 2 px en el color de foco con separación de 2 px. Deshabilitado: 50 % de opacidad, sin eventos.
- **En la barra de filtros:** los mismos variantes en píldora (9999 px) de 40 px de alto y 20 px de relleno lateral: "Aplicar filtros" principal, "Limpiar filtros" de contorno y "Filtros avanzados" fantasma alineado a la derecha. En celular ocupan el ancho disponible.
- **Enlace de siguiente acción** (`.action-link`): texto 14 px de peso 600 en `--link` con flecha de 16 px; hover subraya (separación 3 px) y, solo con puntero fino, la flecha avanza 3 px en 160 ms. Foco: contorno `--focus` de 2 px separado 3 px.

### Chips (estado)
- **Style:** píldora (9999 px), relleno 4 × 10 px, 12 px de peso 600, fondo `-soft` y texto `-text` del estado.
- **State:** éxito, aviso, peligro, información, neutro, y las categorías documento y entrega.

### Cards / Containers
- **Corner Style:** 12 px.
- **Background:** `--surface`.
- **Shadow Strategy:** `--card-shadow` (ver Elevation & Depth).
- **Border:** 1 px `--border`.
- **Internal Padding:** 24 px.

### Tarjeta de indicador (`MetricCard`)
- Tarjeta base con 20 px de relleno: etiqueta 14 px de peso 500 en `--text-secondary`, a la derecha un disco de icono de 36 px (icono lucide de 18 px, trazo 1,75) en el `-soft` del estado con su color `-text`, y debajo la cifra Headline en `--heading`.
- Tonos: `primary`, `info`, `success`, `danger`, `warning`.
- Con `total`, una pista de 6 px en `--surface-sunken` con la barra de proporción en el color sólido del tono y el porcentaje (12 px, `--text-muted`, cifras tabulares) a la derecha.

### Tarjeta de total (`MetricCard featured`)
La pieza oscura del panel. Degradado de 160° de `--uab-azul-900` a `--uab-azul-950` (en oscuro, de `#0A3266` a `--uab-azul-900`), texto blanco, esquina de 12 px y relleno de 20–24 px. A la izquierda la etiqueta (14 px, 600), la ayuda en `--nav-meta` (12 px) y el filete dorado `--brand-gold` de 40 × 4 px en píldora; a la derecha, la cifra Display. Una sola por pantalla.

### Inputs / Fields
- **Panel de filtros clásico:** borde `--border-strong` sobre `--surface`, texto `--text-primary`, marcador `--text-muted` con opacidad completa. Foco: borde `--primary` y contorno de 2 px de `--primary` al 28 %, separado 1 px.
- **Campo en píldora** (`.pill-control`, barra de filtros de Inicio y Reportes): 44 px de alto, 9999 px de esquina, fondo `--surface-sunken`, sin borde visible en reposo (borde transparente de 1 px), relleno lateral de 18 px, texto 14 px. Hover: borde `--border-strong`. Foco: borde `--focus` y halo de 3 px de `--focus` al 25 %. Deshabilitado: 60 % de opacidad y cursor no permitido. Todas las transiciones de 150 ms.
- **Desplegable en píldora:** el mismo campo con un disco de 32 px en `--primary` con chevron `--on-primary` (16 px, trazo 2), a 6 px del borde derecho; el campo reserva 48 px a la derecha.
- **Etiquetas:** la etiqueta del campo queda solo para lectores de pantalla; la opción vacía o el marcador dicen qué se filtra ("Todas las modalidades", "Gestión (p. ej. 2026)").

### Navigation
- **Menú lateral:** degradado vertical de `--nav-bg-start` a `--nav-bg-end` (claro `#0A3266` → `#001A3A`; oscuro `#02254E` → `#000F22`). Cabecera centrada con la placa del escudo, "Sistema de Modalidad" (16 px, 600, blanco) e "Ingeniería de Sistemas · UABJB" (12 px, `--nav-meta`). Grupos con título Label turquesa.
- **Elemento:** 44 px de alto, 12 px de esquina, icono lucide de 20 px con trazo 1,75 y texto 14 px de peso 500 en `--nav-text`. Hover: blanco al 8 % y texto blanco. Foco: contorno turquesa de 2 px con separación de 2 px.
- **Activo:** píldora `--nav-active-bg` (blanco; `#E6EDF7` en oscuro), texto azul marino de peso 600, icono `--nav-active-icon` (turquesa texto) y la sombra de píldora. La píldora es una sola pieza (`.sidebar-indicator`) que se desliza con `transform` de una opción a otra en 240 ms; la primera medición no anima. Mientras existe, el elemento activo deja su propio fondo y su sombra (`.has-indicator`); sin ella, el elemento conserva su píldora estática.
- **Insignia de no leídas:** píldora roja `--danger` con texto blanco, cifras tabulares; en el menú colapsado sube a la esquina del icono.
- **Barra superior:** botones de icono circulares de 40 px (`.navbar-control`) en `--nav-text`, hover blanco al 8 % y foco turquesa; la campana marca no leídas con un punto rojo de 10 px con aro del azul de la barra. El control de cuenta abre un menú `--surface-raised` de 256 px con avatar de iniciales, "Mi perfil" y "Cerrar sesión", navegable con flechas, Inicio/Fin y Escape.

### Placa del escudo (Signature Component)
El escudo oficial de la UABJB (`src/assets/uabjb-escudo.webp`, descargado del sitio institucional, no generado) sobre una placa blanca circular de 120 px con anillo dorado de 2 px y sombra azul noche. Es la única aparición del dorado hoy y la marca de identidad del sistema; se reduce a 48 px con el menú colapsado.

### Distribuciones (dona y listas de barras)
- **Dona:** anillo de radio 58 y trazo 18 sobre pista `--surface-sunken`, segmentos en `--chart-1…6` desde las 12 en punto, total en el centro (Headline) con "Postulaciones" debajo; `role="img"` con título que dice el total. La leyenda lista punto de color de 10 px, nombre, cifra en negrita y porcentaje.
- **Lista de barras** (`DistributionList`): título 16 px de peso 600, filas con etiqueta y cifra, pista de 8 px en `--surface-sunken` y barra en `--primary`, proporcional al valor máximo. Con `fill={false}` la tarjeta no se estira a la altura de la fila; con `animate={false}` no tiene entrada propia (se usa debajo del pliegue, donde entra la sección entera).
- **Vacío:** recuadro de borde discontinuo `--border` con "Sin datos disponibles para esta distribución.".

### Movimiento
Sistema de animación en `src/index.css`, con `--ease-out` (`cubic-bezier(0.22, 1, 0.36, 1)`) en todo lo que entra o se desplaza.
- **Entrada** (`.animate-enter`, fotograma `enter-up`): aparece y sube 8 px en 260 ms; cascada con `--stagger` × 45 ms, de arriba hacia abajo (cabecera, total, filtros, indicadores, gráficos). Usa `animation-fill-mode: backwards`, así no deja ningún `transform` al terminar y no encierra ventanas `fixed`.
- **Debajo del pliegue** (`.animate-fade`, fotograma `fade-in`): la sección entera solo funde, 320 ms tras 360 ms de espera.
- **Barras** (`.bar-fill`, fotograma `bar-grow`): ocupan todo el ancho y se recortan con `clip-path` (`barClip(percent)` en `src/lib/barClip.js`), nunca animando `width`. Crecen en 600 ms tras 150 ms + `--stagger` × 60 ms; al cambiar los datos pasan del valor anterior al nuevo con una transición de `clip-path` de 500 ms.
- **Dona** (`.donut-segment`, fotograma `donut-draw`): cada segmento se dibuja en 700 ms, escalonado 90 ms.
- **Números** (`AnimatedNumber` y `useCountUp`): cuentan desde el valor mostrado hasta el nuevo en 600 ms con curva cúbica de salida. Los lectores de pantalla leen solo el valor final (los intermedios van con `aria-hidden`).
- **Recarga** (`.dashboard-body.is-refreshing`): al aplicar filtros el contenido se queda, baja a 55 % de opacidad en 200 ms y se marca `aria-busy`; el esqueleto solo aparece en la primera carga.
- **Esqueleto** (`.skeleton`): bloque `--surface-sunken` que late en opacidad (1,4 s), escalonado 90 ms.
- **Menú:** píldora activa deslizante (240 ms) y flecha de la siguiente acción (160 ms), ver Navigation y Buttons.
- **Reducir movimiento:** las entradas pasan a fundido sin espera; barras, dona, flecha y píldora quedan estáticas en su valor final; los números aparecen ya en su valor; el esqueleto late a la mitad de velocidad (2,8 s), solo en opacidad.

Las animaciones de datos (barras 500–600 ms, dona 700 ms, conteo 600 ms) y el fundido de 320 ms superan hoy el rango de 150–300 ms de la regla general; son los valores construidos, no una pauta para piezas nuevas.

**The Motion Ships With The Piece Rule.** Toda pieza rediseñada llega con su animación desde el principio: 150–300 ms, curva `--ease-out`, solo `transform`, `opacity` o `clip-path`, y una versión para `prefers-reduced-motion`. Sin animación no está terminada.

**The Final Value Rule.** Lo que se anima comunica igual sin animación: los lectores de pantalla y "reducir movimiento" reciben siempre el valor final, nunca un intermedio.

**The Content Stays Rule.** Al volver a pedir datos no se borra la pantalla: el contenido se atenúa y los valores pasan del anterior al nuevo.

### Pendiente de construir
La tarjeta de total, la cabecera de Inicio en tarjeta y los controles en píldora ya existen y se documentan arriba. Del plan de movimiento (`docs/PLAN_FRONTEND.md`, sección I) siguen pendientes y no deben darse por hechos: ventanas emergentes y confirmaciones (I2), avisos emergentes (I3), menú de usuario y listas desplegables (I5), selector Tarjetas / Lista (I7), entrada escalonada de filas en listas y tablas (I8), hover y presión de botones y tarjetas (I9) y transición de color de los chips de estado (I10). Cuando se construyan, se documentan aquí a partir del código.

## Do's and Don'ts

### Do:
- **Do** usar solo tokens semánticos (`--canvas`, `--surface`, `--text-*`, `--primary`, `--focus`, `--success-soft`, etc.) en pantallas y componentes.
- **Do** probar cada cambio en modo claro y oscuro; los dos se mantienen.
- **Do** acompañar cada estado de color con texto (y punto en los chips): nunca solo color.
- **Do** usar `--focus` para el anillo de teclado (2 px con separación) y el turquesa puro solo dentro del menú.
- **Do** respetar `prefers-reduced-motion`: las transiciones del menú, la barra y la columna (250 ms, `cubic-bezier(0.22, 1, 0.36, 1)`) se anulan; las entradas pasan a fundido y barras, dona, números, flecha y píldora quedan en su valor final.
- **Do** entregar cada pieza rediseñada con su animación (150–300 ms, `--ease-out`, solo `transform`, `opacity` o `clip-path`).
- **Do** hacer crecer las barras con `clip-path` (`barClip`) sobre una barra de ancho completo, nunca animando `width`.
- **Do** usar `--chart-1…6` en ese orden para series de gráficos y acompañar cada color con nombre, cifra y porcentaje.
- **Do** mostrar la siguiente acción solo si el rol tiene permiso para abrir esa pantalla.
- **Do** mantener las dos esquinas de 28 px entre el marco azul y el panel en escritorio (solo el panel se desplaza), y el menú deslizable con velo bajo 768 px.
- **Do** usar el escudo oficial UABJB tal como está en `src/assets/uabjb-escudo.webp`.

### Don't:
- **Don't** usar otro rojo distinto de `#C10202` ni rosados para errores o peligro.
- **Don't** poner turquesa `#3BBDC9`, dorado `#CC9D3B` o amarillo `#FFE858` como texto sobre fondo claro; usar sus variantes `-texto`.
- **Don't** usar el dorado para comunicar un estado.
- **Don't** volver al panel gris genérico con un solo acento ni al degradado celeste y morado.
- **Don't** escribir hexadecimales sueltos ni utilidades `slate-*`/`sky-*` en pantallas nuevas.
- **Don't** repetir el nombre y el rol del usuario en el menú; viven en el control de cuenta de la barra.
- **Don't** introducir una segunda familia tipográfica.
- **Don't** poner más de una tarjeta azul marino por pantalla ni usarla para algo que no sea el total.
- **Don't** dejar un `transform` permanente en contenedores que encierren ventanas `fixed`; las entradas usan `backwards` y terminan sin transformación.
- **Don't** reemplazar el contenido por un esqueleto al filtrar; el esqueleto es solo para la primera carga.
- **Don't** inventar un manual de identidad: si la carrera o la DTIC publican uno, reemplaza estos valores.

### Lista desplegable propia (`Select`) y menús

`src/components/ui/Select.jsx` reemplaza al `<select>` nativo (que el navegador dibuja y no se puede animar ni pintar con la paleta). Patrón WAI-ARIA de combobox de solo selección: botón `role="combobox"` con el aspecto de `.pill-control` y el disco de chevron `--primary` (gira 180° al abrir), panel `role="listbox"` en `--surface-raised` con borde `--border`, esquina de 16 px, sombra azul marino suave y alto máximo de 18 rem; opción activa con fondo `--primary` al 9 % y opción elegida en 600 con check en `--focus`. Teclado completo (flechas, Inicio/Fin, Enter/Espacio, Escape, letra para saltar, Tab elige). Si no cabe abajo, abre hacia arriba.

**Movimiento:** el panel baja desde el campo (`dropdown-in`: opacidad + `translateY(-6px) scale(.97)`, 200 ms, `--ease-out`) y las opciones se acomodan una por una (`option-in`, 240 ms, 30 ms entre cada una, tope de 8). Al cerrar sale en 130 ms. El menú de cuenta usa el mismo panel (`.dropdown-panel`, origen arriba a la derecha) y sus elementos (`.dropdown-item`) entran escalonados. Con "reducir movimiento": solo un fundido de 120 ms.

**Uso:** toda lista desplegable nueva usa `Select`. Ya lo usan los filtros de Inicio y Reportes › Postulaciones; las demás pantallas lo adoptan al rediseñarse. Las del expediente (Proyecto de Grado y Tesis) solo con la autorización de `AGENTS.md`.

### Botón para contraer el menú

Vive arriba a la derecha del menú lateral (centrado cuando está contraído): icono `PanelLeftClose` / `PanelLeftOpen`, 36 px, circular, en `--nav-text`. En el celular el menú se abre con el botón de la barra superior y se cierra con la X del propio menú.

### Filtros con un solo botón (`FilterMenu`)

Patrón tomado del sistema del hostal. `src/components/ui/FilterMenu.jsx`: botón **Filtrar** en píldora (borde `--border-strong`, icono de ajustes, contador `--primary` que aparece con un pequeño salto y disco de chevron que gira) que despliega un panel con columnas separadas por una línea `--border`; las columnas con el mismo `group` se apilan (Gestión + Semestre, Modalidad, Tipo de registro + Etapa) para que el panel entre sin cortarse. Cada opción lleva una marca circular que se rellena de `--primary` al elegirla; tocarla otra vez la desmarca (la API acepta un valor por filtro). Se aplica al instante; abajo aparece "Quitar filtros" en `--danger-text`. `FilterChips` muestra lo elegido como píldoras `--primary-soft` con su ×. En el Inicio el botón va a la derecha de la cabecera y los chips en su propia fila debajo. En celular el panel se apila en una sola columna.

### Pestañas (`Tabs`)

`src/components/ui/Tabs.jsx`: lista en píldora `--surface-sunken` con una píldora `--primary` que se desliza a la pestaña elegida (260 ms, `--ease-out`), texto `--on-primary` en la elegida; el panel entra con un fundido corto. Todos los paneles quedan montados (ocultos con `hidden`). El Inicio usa dos tarjetas con pestañas: "Distribución de postulaciones" (Modalidad, Etapa, Estado, Gestión) e "Indicadores" (Documentos, Defensas, Cierre), para ocupar menos espacio.

### Hover de opciones

En listas, filtros y menús, la opción bajo el cursor o con el foco se pinta de `--primary` con texto `--on-primary` (bien visible), y su check o marca pasa a `--on-primary`.

### Panel con cuatro esquinas

En escritorio el panel de trabajo deja 12 px de azul a la derecha y abajo: sus cuatro esquinas de 28 px quedan siempre visibles. La barra de desplazamiento es delgada.

### Actualización del Dashboard (21/11/2026)

- **Nombre:** la pantalla se llama **Dashboard** (menú y barra superior). Notificaciones sale del menú lateral: se abren desde la campana, que muestra el número de no leídas en una insignia roja.
- **Composición simétrica, sin tarjeta de bienvenida ni filtros:** fila de cinco tarjetas iguales (total en azul marino con filete dorado, en la misma forma vertical que las otras: título, cifra, filete; luego En proceso, Concluidas, Rechazadas, Sin etapa actual) y debajo dos tarjetas del mismo ancho y alto con pestañas (Distribución de postulaciones · Indicadores). El título de la página es un `h1` solo para lectores de pantalla. En celular el total ocupa la fila completa y los estados van de dos en dos. Los filtros (`FilterMenu`) quedan para Reportes.
- **Panel:** llega al borde derecho y al de abajo (sin margen azul); se redondean las dos esquinas de arriba y la de abajo a la izquierda. Esto reemplaza "Panel con cuatro esquinas".

### Dashboard: composición vigente (21/11/2026, reemplaza a la anterior)

1. **Cabecera:** tarjeta de bienvenida (icono, saludo, línea de notificaciones no leídas) con el botón **Filtrar** a la derecha y los chips debajo; **a la derecha, siempre, la tarjeta del total** en azul marino (17 rem).
2. **Estados:** cuatro tarjetas iguales (En proceso, Concluidas, Rechazadas, Sin etapa actual).
3. **Dos tarjetas con pestañas** del mismo alto: Distribución de postulaciones · Indicadores. Los indicadores son **mosaicos** (`.indicator-tile`: nombre arriba, cifra de 24 px, fondo `--surface-secondary` con borde) que entran uno por uno; las colecciones (p. ej. defensas por tipo) son una **tabla con borde `--border-strong`** y cabecera `--surface-sunken`. La siguiente acción es un **botón en píldora** (`.action-button`: `--primary-soft` con disco de flecha `--primary`; al pasar el cursor se invierte).
4. **Actividad (tres tarjetas iguales):** Próximas defensas (fecha en bloque `--primary-soft`, en ámbar si ya pasó y sigue programada, con "Por realizar"), Postulaciones recientes (avatar de iniciales `--primary`, chip de estado con su tono) y Pendientes de revisión (documentos enviados, condiciones y entregas físicas, con contador ámbar si hay pendientes). Cada fila abre el expediente o la lista según permiso; cada tarjeta carga sola y muestra su propio esqueleto, vacío o error (`src/pages/dashboard/DashboardActivity.jsx`, `src/services/dashboardService.js`).

### Colores de gráficos validados y tarjetas de actividad (21/11/2026)

- **Series (`--chart-1…6`)**, validadas con la skill `dataviz` (luminosidad, croma ≥ 0,10, separación CVD ≥ 8, visión normal ≥ 15, contraste ≥ 3:1) en claro sobre `#F8FAFD` y en oscuro sobre `#12233D`. Claro: azul UABJB `#2F5FD0`, dorado `#B47B22`, turquesa `#1E9AA6`, vino `#C9566E`, violeta `#7357C6`, verde `#3F9B63`. Oscuro: `#5A84E3`, `#BC8526`, `#26A3B0`, `#D0607A`, `#8A6FD8`, `#44A46B`. **Cada modalidad tiene su color fijo** (Proyecto de Grado 1, Tesis 2, Trabajo Dirigido 3, Diplomado 4, Excelencia 5, Examen de Grado 6): un filtro no repinta las demás. La dona deja 2 px de separación entre segmentos. El azul marino de marca no se usa como serie (es demasiado oscuro para distinguirse en la dona).
- **Tarjetas de actividad:** cabecera con icono en disco `--primary`, título, una línea que explica qué muestra y un contador a la derecha, separada del contenido por una línea; filas divididas por líneas `--border`; en "Pendientes de revisión" cada elemento es un mosaico propio con la cifra en un bloque (ámbar si hay pendientes), icono, nombre, explicación y flecha.

### Filtro del Dashboard sin saltos (21/11/2026)

- El panel de **Filtrar** tiene tamaño fijo (44 rem, tres grupos 0,8 / 1,1 / 1,1). Una columna con muchas opciones (las etapas al elegir modalidad) se desplaza por dentro (alto máximo 17,5 rem); el panel nunca crece ni se corre.
- En la cabecera del Dashboard no hay chips (hacían crecer la tarjeta y movían todo). Lo elegido se resume en la tarjeta del total, bajo su título ("2026 · Proyecto de Grado"; "Sin filtros" si no hay). En Reportes, donde el filtro va en línea, los chips siguen.
- La dona anima el cambio de valores (transición de stroke-dasharray/dashoffset) y vuelve a dibujarse cuando cambian las modalidades presentes.

### Ajustes del Dashboard (21/11/2026, tarde)

- Las pestañas (`Tabs` con `title`) van a la derecha del título de su tarjeta, en la misma fila ("Distribución" · Modalidad/Etapa/Estado/Gestión; "Indicadores" · Documentos/Defensas/Cierre). "Ver documentos" va al pie de Indicadores; "Ver todos" queda en la cabecera de Postulaciones recientes (`ActionButton size="sm"`).
- Próximas defensas usa los mismos mosaicos que Pendientes de revisión (`.pending-tile`): fecha, código con "Por realizar", tipo y lugar, flecha.
- "Quitar filtros" sale del panel: con filtros activos aparece el botón **Limpiar** (`.filter-clear-button`, `--danger-soft`) junto a Filtrar. Al llegar datos de un filtro, el contenido vuelve a entrar con su animación.
- Textos con la ñ y las tildes mal guardadas se reparan al recibir las respuestas de la API (`src/lib/fixMojibake.js`, CP850/CP437/Latin-1). No cambia la base de datos ni el flujo; la corrección definitiva en la base queda para backend.

### Colores de las listas de distribución (21/11/2026)

- **Estado:** cada barra con el color de su estado (En proceso `--info`, Concluida `--success`, Registrada `--neutral`, Rechazada `--danger`, Observada `--warning`).
- **Etapa:** ordenadas de mayor a menor cantidad, en la gama turquesa `--ramp-stage-1…6` (la primera, la más intensa).
- **Gestión:** de la más antigua a la más reciente en la gama dorada `--ramp-year-1…6`.
- Las gamas se validaron con `dataviz --ordinal` (una sola tonalidad, pasos visibles, extremo claro ≥ 2:1) en claro y oscuro, y no se usan sus extremos para que no se vean secas. Cada fila lleva un punto del color de su barra.
- **Etiquetas en español:** `src/lib/spanishLabel.js` arma las etiquetas desde los códigos con tildes y en tipo oración ("DEFENSA_PUBLICA" → "Defensa pública") y completa tildes que faltan en nombres de la base ("Graduacion Via Diplomado" → "Graduación Vía Diplomado").
- **Colores editables a futuro:** todos los colores son variables de `src/index.css`; un panel de administración podría guardarlos en el backend y aplicarlos sobre esas variables al iniciar (validando contraste antes de guardar).

### Sin degradados, formas distintas y colores editables (21/11/2026) — reemplaza lo anterior que lo contradiga

- **Prohibido usar degradados de color** (`linear-gradient`, gamas de tonos de claro a oscuro). El menú, la barra superior, el fondo detrás del panel y la tarjeta del total son de un solo color plano (`--nav-bg` = `--uab-azul-900`; en oscuro `--uab-azul-950`). Se eliminaron `--ramp-stage-*` y `--ramp-year-*`. Para diferenciar se usan **formas**, no más tonos.
- **Distribución, una forma por pestaña:** Modalidad = dona; Etapa = barras horizontales en un solo color (`--info`), de mayor a menor; Estado = barra segmentada 100 % con 2 px de separación y leyenda con porcentajes; Gestión = columnas verticales en `--brand-gold` con la cifra arriba y el año abajo. Las pestañas **cambian solas cada 3 s** (`Tabs autoPlay`), se pausan con el cursor o el foco dentro y no corren con "reducir movimiento".
- **Colores editables (Configuración → Apariencia, solo administradores):** se editan los primitivos `--uab-azul-900`, `--uab-azul-950`, `--uab-turquesa`, `--uab-turquesa-texto`, `--uab-dorado`, `--uab-rojo` y las series `--chart-1…6`; los tokens semánticos derivan de ellos (incluido `--primary-hover` con `color-mix`), así que el cambio llega a todo el sistema al instante. Cada color se valida con contraste WCAG (texto blanco ≥ 4,5:1 sobre azules/rojo, oscuro sobre turquesa, series ≥ 3:1, dorado ≥ 2:1) y no se puede guardar si no se lee. Hoy se guarda en el navegador (`localStorage`, `src/lib/themeConfig.js`); para todos los usuarios falta un endpoint de backend.

### Etapa y Gestión rediseñadas con dataviz (21/11/2026)

- **Etapa = columnas de colores** (`StageColumns`): una columna vertical por etapa, de mayor a menor, cada una con un color plano de la paleta categórica validada (`--chart-1..6`, en orden fijo). La cifra va arriba y el nombre abajo (máximo 2 líneas). Si hay más de 6 etapas, las menores se juntan en "Otras". Las columnas crecen desde la base (`column-grow`, con un retardo escalonado de 80 ms).
- **Gestión = barras horizontales** (`YearBars`): una barra fina por año, del más reciente al más antiguo, sobre un carril `--surface-sunken`, con año y cifra en texto pequeño (13–14 px). Cada año tiene su propio color plano: el año módulo 6 elige un color de `--chart-1..6`, así que un año conserva siempre su color y dos años seguidos nunca coinciden. Las barras se llenan con `bar-grow` (escalonado de 90 ms).
- **Tamaño:** los gráficos de Distribución no se estiran. El panel ocupa el alto libre de la tarjeta (`.tabs-panel--center`) y centra el gráfico con un ancho máximo: dona 34rem, estado 26rem, gestión 24rem y etapa 5,75rem por columna (columnas de 2,75rem de ancho y 11rem de alto).
- No usan degradados ni gamas claro→oscuro. Con movimiento reducido no hay animación.
- **Entrada al elegir la pestaña:** las pestañas de Distribución e Indicadores usan `replayOnSelect`, así que el contenido se vuelve a montar cada vez que se elige su pestaña. Las cifras cuentan desde 0, cada columna o barra crece y su cifra y su nombre suben con un fundido (`chart-rise`, 320 ms). Todo va escalonado 80 ms por elemento, de modo que cada columna entra como una sola pieza.
- *(Reemplaza la versión anterior de mosaicos con énfasis y la de cifra con línea de tendencia, que el usuario descartó.)*
- La rotación automática de Distribución es cada **5 s**.


### Notificaciones al estilo Facebook (21/11/2026)

- **Campana (`NotificationsMenu`):** ventana flotante sin filtros, con la misma caja y animación que Filtrar. Contiene:
  - Encabezado con "N sin leer" y el botón pequeño **Ver todas**.
  - La lista en dos secciones: **Nuevas** (sin leer, resaltadas y con punto rojo) y **Anteriores**. Cada nivel tiene su propio icono.
  - Al pie, "Marcar todas como leídas".
  - Al elegir una notificación, se abre su detalle en la página (`/notificaciones?ver=id`).
  - Se cierra con Escape (el foco vuelve a la campana), al pulsar fuera o al cambiar de pantalla.
- **Abrir = leída:** abrir una notificación (desde la campana o tocando su fila en la página) la marca como leída sola. No hay botones de leída/no leída.
- **Página:** botón **Volver** (vuelve a la pantalla anterior, o al Dashboard si se entró directo). Barra con `FilterMenu align="start"`: Estado ("Solo sin leer"), Nivel y Tipo, más Desde/Hasta; "Hasta" incluye todo el día. En celular, Filtrar ocupa su propia fila y las fechas van en dos columnas. Cada fila es un botón con una flecha y lleva la etiqueta "Nueva" si no está leída.
- **`FilterMenu` → `align`:** `'end'` (por defecto) abre el panel hacia la izquierda; `'start'` lo abre hacia la derecha.

### Ventanas flotantes (`CenteredModal`) y Mi perfil (21/11/2026)

- **Reglas de Fondo de Tiempo:** la ventana se monta en `<body>` y el fondo cubre solo el área a la derecha del menú lateral (MainLayout publica `html[data-sidebar]`). El fondo se difumina (`blur 6px` sobre azul marino al 32 %) y la ventana queda centrada en esa área. Entra con `modal-in` (sube 10 px y escala de 0,97 a 1, 260 ms) y sale con `modal-out` (180 ms). Escape, pulsar fuera o la X la cierran. El foco entra a la ventana, no se escapa con Tab y vuelve al botón que la abrió. Las nuevas ventanas deben usar este componente.
- **Mi perfil:** se abre desde el menú de usuario en una `CenteredModal` grande. A la izquierda, la tarjeta de identidad: franja azul marino plana, avatar con iniciales y anillo dorado, nombre, rol en una pastilla y @usuario. A la derecha, los bloques Identificación (R.U., C.I.), Contacto (correos) y Cuenta (nombre, usuario, rol, acceso), que entran escalonados. La ruta `/perfil` sigue existiendo con el mismo contenido.

### Dashboard: tarjetas sin barras y celular (21/11/2026)

- **Tarjetas:** la tarjeta "Total postulaciones" ya no lleva el filete dorado ni el texto "Sin filtros", porque el total ya cambia al filtrar. Las tarjetas de estado no llevan barra: solo la cifra y "x % del total".
- **Indicadores:** "Ver documentos" va a la derecha.
- **Celular:** en pantallas de menos de 768 px, Distribución no rota sola (`useMediaQuery`). Se revisó que nada se desborde a lo ancho.

### Filtrar a la medida y colores rápidos en Apariencia (21/11/2026)

- **`FilterMenu`:** el ancho del panel sale del número de columnas: `--n × 14,25rem + 1,25rem`, es decir, 44rem con 3 columnas (Dashboard) y unos 30rem con 2 (Notificaciones). Así no queda espacio vacío a la derecha. Las columnas se reparten 0,8/1,1/1,1 con 3 y 0,85/1,15 con 2; en celular, una sola columna.
- **Apariencia → colores rápidos:** debajo de cada color hay círculos para elegir con un toque, agrupados por origen y separados por una línea fina:
  - **Básicos:** negro y blanco.
  - **UABJB:** azul, turquesa, dorado y rojo.
  - **Sugeridos:** #0b5dd5, #00b6c9, #0e1728 y #00a69b.
  - **Fondo de Tiempo:** #1e3a8a, #172554 y el blanco azulado #dfe8f5.
  - **Hostal:** #1874e6, #1e2a44, #16202e y #f4f5f7.
  El elegido lleva un anillo de foco. El chequeo de contraste sigue igual: si un color no se lee bien, no se puede guardar. La cifra de contraste se corta en lugar de redondearse, para que 4,49:1 no aparezca como 4,5:1.

### Temas de color por usuario en Mi perfil (reemplaza a Configuración → Apariencia) (21/11/2026)

- **Se quitó la pestaña Apariencia** y su paleta editable color por color. Al arrancar, `clearLegacyThemeOverrides()` borra lo que hubiera guardado (`sm_theme_overrides`). Las anotaciones anteriores sobre Apariencia quedan solo como historia.
- **Mi perfil → Tema de color** (`ThemePicker`, `src/lib/colorThemes.js`). Cada usuario elige un tema; se aplica al instante y se guarda por usuario en este navegador (`sm_color_theme:<usuario>`). Al cerrar sesión vuelve al de la UABJB. Temas: UABJB (por defecto, los colores de index.css sin cambios), Negro, Blanco, Azul intenso, Turquesa, Marino oscuro, Verde azulado, Fondo de Tiempo y Hostal.
- **Qué cambia un tema:**
  - Menú lateral y barra superior: `--nav-*`, más `--nav-strong` y `--nav-focus`, que reemplazan al blanco fijo.
  - Botones, pestañas y píldoras activas: `--primary`, `--on-primary`, `--primary-hover` y `--primary-soft`.
  - Cabeceras de marca: `--brand-surface` y `--on-brand-surface` (tarjeta del total, franja del perfil).
  - Títulos (`--heading`) y foco.
- **Qué no cambia nunca:** los colores de errores, eliminar, estados (éxito, advertencia, información), modalidades y gráficos.
- **Letras:** cada tema define solo dos colores por modo (menú y botón), tomados de pasos de la paleta de Tailwind CSS o de los sistemas de referencia. El color del texto se calcula con el contraste WCAG: blanco o casi negro, el que se lea mejor. Los grises del menú se acercan al color fuerte hasta llegar a 4,5:1, y los títulos usan el color del tema solo si llegan a 7:1 sobre la superficie; si no, casi negro. `colorThemes.test.js` comprueba en cada tema, claro y oscuro, que todo texto llegue a 4,5:1 o más.
- **Barra superior:** `.layout-navbar .navbar-control.navbar-control` gana a `html.dark .app-button--ghost`, para que los iconos no desaparezcan en menús claros.

### Temas: solo nombres de color, letra blanca y cambio suave; perfil sin desplazarse (21/11/2026)

- **Temas** (nombre = color; cada opción muestra el color con su letra "Aa", el nombre y qué letra lleva):

  | Tema | Menú | Botón |
  |---|---|---|
  | Azul marino (UABJB, por defecto) | `#02254e` | `#02254e` |
  | Azul noche | `#0e1728` | `#1e293b` |
  | Azul cobalto | `#1e3a8a` | `#1e40af` |
  | Azul intenso | `#0b5dd5` | `#0b5dd5` |
  | Azul brillante | `#1872e3` | `#1872e3` |
  | Turquesa | `#0f7d8a` | `#0f7d8a` |
  | Verde azulado | `#00796b` | `#00796b` |
  | Negro | `#0a0a0a` | `#171717` |
  | Blanco | `#ffffff` | `#0f172a` |

  Todos los temas con color llevan **letra blanca** (≥ 4,5:1); solo Blanco lleva letra negra. Azul brillante es el azul del menú del hostal (`#1874e6`, que da 4,49:1), ajustado a `#1872e3` para llegar a 4,6:1. En modo oscuro, el menú baja a un tono más profundo y el botón sube a uno claro con letra oscura.
- **Cambio suave:** al elegir un tema o pasar entre claro y oscuro, `animateColorChange()` pone `html.theme-transition` durante 450 ms, y fondos, letras, bordes, rellenos y sombras pasan al color nuevo (420 ms, `--ease-out`). No se aplica con movimiento reducido.
- **Mi perfil sin desplazarse:** la tarjeta de identidad es más compacta y está al lado de Identificación, Contacto y Cuenta; la nota "Solo la administración…" va en la cabecera de Cuenta. Los 9 temas van en una sola fila (`repeat(9, 1fr)` desde 1024 px). Entra entero en 1280×720, 1366×768 y 1440×900.
- **Ventana flotante y curvas:** `.modal-overlay` tiene la forma del panel de trabajo: empieza debajo de la barra (`top: --navbar-height`), a la derecha del menú, y tiene las mismas esquinas (`--panel-radius` arriba y abajo a la izquierda). Así las curvas del marco no se borran al abrir una ventana. `.modal-catcher`, una capa transparente sobre la barra, también cierra la ventana.
- **Todo lo de atrás bloqueado:** mientras una `CenteredModal` está abierta, `.app-shell` (menú lateral, barra y página) queda `inert`, sin clics ni teclado. El menú lleva un velo azul marino al 30 % con cursor "no permitido". Al cerrar se restaura el estado anterior; el menú del celular cerrado sigue `inert`. El foco con Tab no sale de la ventana (solo cuenta lo que tiene `tabIndex ≥ 0`), y Escape cierra aunque el foco esté fuera.

### Postulantes con el estilo del Inicio (21/11/2026)

- **Cabecera** (`.postulantes-header`), igual que la del Dashboard: icono en placa, título "Postulantes", descripción, botón "Nueva postulación" (con +) y buscador en píldora con lupa y botón Buscar. A la derecha, la tarjeta del total (`MetricCard featured`, "Postulaciones"), que muestra "Búsqueda: …" cuando hay una búsqueda. El backend solo permite buscar por texto, sin filtros por modalidad, periodo o estado; por eso no hay "Filtrar".
- **Lista:** una tarjeta con filas (`.postulante-row`) que entran escalonadas (`option-in`, 35 ms). Cada fila tiene las iniciales, el nombre (h2), los datos Modalidad, Periodo y Tipo de registro, el estado como píldora con color semántico (`data-tone`: info, success, warning, danger, neutral) y las acciones Detalle y Editar (sobrias) más "Abrir expediente" (`ActionButton` pequeño). En celular, el estado va debajo del nombre y las acciones en su propia fila.
- **Alcance protegido (AGENTS.md):** no se tocó `CrudShell` (encabezado, buscador, modal, DataState), porque también lo usan el Expediente y las pantallas de defensas y evaluación. Los formularios y ventanas de Postulantes (nueva postulación, editar, detalle, registro histórico) siguen iguales en lógica y aspecto. Datos, llamadas al servidor, permisos y textos son los mismos. Regresión completa: mismas fallas previas que en HEAD.

### Postulantes: búsqueda automática, tarjetas o lista, ventanas nuevas y formulario por pasos (21/11/2026)

- **Búsqueda automática:** el buscador de la cabecera (píldora, hasta 20rem) busca solo, 350 ms después de la última tecla, y vuelve a la página 1. No hay botón Buscar. Mientras llegan los resultados, la lista anterior queda atenuada (0,55) en lugar de cambiar por "Cargando…".
- **Estudiantes en tarjetas o lista:** el selector "Tarjetas / Lista" (riel con la opción elegida en `--primary`) se recuerda en `sm_postulantes_vista`. Cada estudiante muestra solo sus iniciales, el nombre (R.U. – nombre) y las acciones: Detalle y Editar como iconos (con nombre accesible) y "Abrir expediente" (`ActionButton` pequeño). Las tarjetas van en grilla de 17,5rem como mínimo; la lista, en filas de hasta dos columnas (30rem como mínimo), con el nombre cortado y el completo en el tooltip. "Nueva postulación" va en la cabecera de la lista, junto al selector.
- **Detalle:** se abre en `CenteredModal`. Tiene una cabecera con iniciales y estudiante, y un bloque con código, modalidad, gestión, **tipo de registro** (que salió de la lista) y estado técnico como píldora de color, más etapa actual, resultado y observaciones.
- **Formularios** (nueva postulación, editar, registro histórico, subir documento): pasan a `CenteredModal` con controles `.form-control` (2,75rem, borde `--border-strong`, foco con anillo). Nueva postulación va en pasos numerados: 1 Tipo de registro (con una ayuda según el tipo), 2 Estudiante (buscador + selector, "N estudiantes disponibles"), 3 Modalidad y periodo, y luego observaciones y el pie con Cancelar/Guardar. La lógica de guardado, las validaciones, las llamadas al servidor y las etiquetas accesibles son las mismas.
- **Regresión completa frente a HEAD:** ninguna falla nueva (42 fallas previas, una menos que en HEAD). Sin cambios en `CrudShell`, `ExpedientePage` ni defensas.

### Postulantes: formulario compacto, desplegable con búsqueda y lista de una columna (21/11/2026)

- **`Select` (desplegable del sistema) ampliado:**
  - `showLabel` muestra la etiqueta encima.
  - `searchable` convierte el campo en texto: al tocarlo se despliega, y lo que se escribe filtra por etiqueta y `keywords`, sin importar tildes ni mayúsculas. Si nada coincide, muestra `emptyText`.
  - Acepta opciones `disabled`.
  - El panel se dibuja en `<body>` con posición fija (`.select-panel--floating`, z 70), así ni la ventana ni las tarjetas lo recortan.
  - Con un desplegable abierto, Escape cierra el desplegable y no la ventana.
  - Todos los desplegables nuevos usan este componente; no se usa `<select>` nativo.
- **Nueva / Editar postulación:** `CenteredModal size="sm"` (34rem), con los campos uno debajo de otro y sin bloques ni pasos:
  - Tipo de registro;
  - Estudiante (desplegable con búsqueda por nombre, R.U. o C.I.; ya no hay un buscador aparte);
  - Modalidad y Gestión/Semestre en dos columnas;
  - Observaciones (2 líneas);
  - el pie con Cancelar y Guardar en píldora.

  Los campos de texto (`.form-control`) tienen el mismo aspecto que los desplegables: fondo `--surface-sunken`, radio 1rem, y anillo de foco. Las modalidades se muestran con tildes (`withAccents`).
- **Lista** = una sola columna (una fila por estudiante). Al pasar de Tarjetas a Lista, cada estudiante se desliza a su nuevo lugar (View Transitions, 380 ms, `view-transition-name` por postulación). Sin la API o con movimiento reducido, el cambio es directo.
- **Pruebas:** el formulario se prueba como lo usa una persona, abriendo el desplegable y tocando la opción (`pick`/`openList`). El envío, los datos y las rutas que se verifican son los mismos. Regresión completa frente a HEAD: ninguna falla nueva.
- **Ajustes (misma fecha):**
  - **Tarjetas** de a 3 (2 en tableta, 1 en celular).
  - **Lista** en una columna de 46rem como máximo, centrada (no de lado a lado).
  - **Cambio de vista** en 650 ms con curva de ida y vuelta, en cascada (28 ms entre estudiantes).
  - **Página** de 15 en tarjetas (5 filas de 3) y 20 en lista (`page_size`).
  - **`PageNav`** solo aparece si hay más de una página: rango "1–15 de 40" y números en píldora, con la página actual en `--primary`.
  - **Nueva postulación** (`size="form"`, 46rem): Estudiante a todo el ancho; Modalidad | Gestión/Semestre; Tipo de registro junto a una nota que explica el tipo elegido; Observaciones (3 líneas).
  - **`Select`** se cierra también cuando el foco sale del campo (Tab, otro campo o cambio de ventana).

### Postulantes: Tarjetas | Lista como Fondo de Tiempo (21/11/2026, reemplaza lo anterior de vistas)

Copia el patrón de Fondo de Tiempo: `SelectorVista`, `Paginacion` y `animate-fondo-entrada` de su `ListaDocentes`.

- **Selector "Tarjetas | Lista" (`ViewToggle`):** riel `--surface-sunken` con borde. El fondo `--primary` de la opción elegida se desliza a la otra en 300 ms (`--ease-out`); la primera posición se pone sin animación. En celular solo lleva los iconos. Se recuerda en `sm_postulantes_vista`.
- **Animación de contenido:** no hay View Transitions. Al cambiar de vista, de página o de búsqueda, el bloque se vuelve a montar y cada estudiante entra con `row-in` (opacidad y 8 px hacia arriba, 320 ms, escalonado 35 ms, hasta 8).
- **Tarjetas** (`.postulantes-cards`): de a 3 (2 desde 768 px, 1 en celular). Cada tarjeta lleva iniciales de 48 px, nombre (R.U. – nombre), modalidad debajo, el estado como píldora arriba a la derecha y, separadas por una línea, las acciones: Detalle, Editar y "Abrir expediente".
- **Lista** (`.postulantes-table`): un bloque tipo tabla, con la fila de títulos Estudiante | Modalidad | Estado | Acciones y filas divididas por una línea y resaltadas al pasar el cursor. Columnas `2.2fr 1.3fr 0.9fr 14.5rem` (acciones de ancho fijo, para que los títulos queden alineados). Desde menos de 1024 px cada fila se apila con su etiqueta.
- **Tamaño de página:** 15 en tarjetas (5 filas de 3) y 20 en lista (`page_size`).
- **Paginación** (`PageNav`): como en Fondo de Tiempo, solo los números en píldoras de 28 px, centrados, con anterior y siguiente. Solo aparece si hay más de una página.
- Código, periodo y tipo de registro se ven en Detalle.

### Postulantes: filtro por modalidad y cierre del desplegable (21/11/2026)

- **Filtrar por modalidad:** usa el mismo `FilterMenu` del Inicio, al lado del buscador, con una columna "Modalidad" y el botón Limpiar. El listado del servidor (`/postulaciones/`) no filtra por modalidad y cambiarlo es código común protegido (AGENTS.md). Por eso, con una modalidad elegida se pide la lista completa (`listAll`, ya acotada por la búsqueda), se filtra en el navegador y se pagina ahí mismo con el mismo tamaño (15 / 20), como en Fondo de Tiempo. Sin filtro sigue paginado en el servidor.
- Las opciones salen del catálogo de modalidades que ya se carga para quien gestiona postulaciones. En solo lectura no se cargan catálogos (US-007), así que no hay filtro.
- La tarjeta del total muestra "Tesis de Grado · Búsqueda: …" cuando aplica.
- El panel de `FilterMenu` tiene un ancho mínimo de 18rem, para que una sola columna no corte nombres como "Graduación Vía Diplomado".
- **`Select`:** solo la caja del campo y el panel cuentan como "dentro". Un clic en la etiqueta de arriba ("Estudiante"), en otro campo o en cualquier parte de la ventana cierra la lista.
- **Varias modalidades a la vez (sin "Limpiar"):**
  - `FilterMenu` acepta columnas `multiple: true`. Su valor es un arreglo, la marca es una casilla cuadrada con ✓ (`.filter-mark--box`) y el contador cuenta cada opción marcada.
  - Las columnas sin `multiple` (Inicio, Notificaciones) siguen siendo de una sola opción.
  - En Postulantes la columna Modalidad es `multiple`, no lleva el botón Limpiar (para quitar el filtro se desmarcan las opciones) y la tarjeta del total lista las modalidades elegidas.
- **Sin resultados (`EmptyResults`):** Postulantes ya no usa el vacío de `DataState` (común con el Expediente, no se toca). Dibuja su propio bloque: borde punteado, 15rem de alto mínimo (la tarjeta no se encoge de golpe), icono en un círculo `--primary-soft` que aparece con un pequeño salto, título y sugerencia según el caso. Los casos son: búsqueda o filtro sin coincidencias ("No hay estudiantes que coincidan" + "Prueba con otro nombre, R.U. o C.I., o marca otras modalidades en Filtrar"), estudiante sin postulaciones o sin registros. Entra con `row-in`, como las tarjetas.

### Expediente en ventana flotante desde Postulantes (21/11/2026, con autorización "AUTORIZO CAMBIO EN PROYECTO DE GRADO")

- **Cómo se abre:** "Abrir expediente" en Postulantes navega a `/postulaciones/:id` con `state.background`. `AppRoutes` sigue dibujando la pantalla de atrás (`<Routes location={background}>`) y abre `ExpedienteModal` en una segunda ruta. La ventana es `CenteredModal size="xl"` (96rem, alto fijo, se desplaza por dentro) con el `ExpedientePage` tal cual: mismas pestañas con `#`, enlaces y ventanas internas. Cerrar (X, Escape o clic fuera) vuelve a la pantalla de atrás con `replace`. Con un enlace directo, sin pantalla de atrás, el Expediente sigue siendo una página. Con la misma exigencia de permiso (`puede_ver_postulaciones`).
- **`CenteredModal` convive con ventanas internas:**
  - Si hay otra ventana `aria-modal` abierta, Escape y Tab son de esa ventana.
  - `layer="page"` (z 45) deja la ventana por debajo de las internas (z 50), incluso de las que se dibujan en `<body>` (dictamen).
  - El tinte, el difuminado y el fundido van en `.modal-overlay::before`, y la entrada de la ventana usa `backwards`: así ni el fondo ni la ventana se convierten en marco de las ventanas internas con posición fija, que siguen cubriendo toda la pantalla como en la página.
- **Sin cambios en** `ExpedientePage.jsx`, `CrudShell`, defensas ni dictámenes.
- **Regresión completa frente a HEAD:** ninguna falla nueva; Expediente 666/666 pruebas que pasan, igual que antes.
- **Revisión en el sistema** (Proyecto de Grado y Tesis): pestañas, "Cargar documento" encima, Escape (cierra primero la interna y después el Expediente) y enlace directo.
- **Observación:** "Cargar documento" deja salir el foco con Tab también en su página. Ya ocurría antes y es del Expediente, que está protegido; no se cambió.

### Rediseño visual del Expediente — parte 1: cabecera y pestañas (21/11/2026, autorizado)

- **Cabecera** (`.expediente-hero`, entra con `animate-enter`):
  - Iniciales del estudiante en un círculo `--primary-soft` con anillo dorado.
  - Etiqueta de la modalidad con su punto de color fijo (`MODALITY_COLOR`, los mismos `--chart-*` del Inicio) y, si corresponde, la etiqueta "Registro histórico" (`--info-soft`).
  - Nombre (h1, 24 px), periodo y estado (`StatusBadge` → `.expediente-status`: neutral o éxito con ✓, mismo texto).
  - Debajo, separadas por una línea, la etapa actual (con "Aprobar etapa" si corresponde) y el avance: `<progress>` nativo, el mismo para lectores de pantalla, pintado plano con `--primary` sobre `--surface-sunken`.
  - El aviso de registro histórico es un bloque `--info-soft`. Los botones de iniciar o aprobar no cambian.
- **Pestañas** (`ExpedienteNav`): riel `.tabs-list` con la píldora `--primary` que se desliza a la pestaña activa (como las del Inicio), fijas arriba al desplazarse. La pestaña activa lleva la clase `is-active` (antes, la línea `after:bg-blue-600`). Teclado (flechas, Inicio y Fin), `#` en la dirección y `aria-selected` no cambian.
- **En la ventana flotante:** "Volver a postulaciones" se oculta, porque ya está la X; en la página sigue. La ventana se titula solo "Expediente".
- **Pruebas:** en `ExpedientePage.test.jsx` solo se cambió la marca visual de la pestaña activa (8 aserciones: `after:bg-blue-600` → `is-active`). El Expediente sigue con 666 pruebas que pasan y las mismas fallas previas.

### Rediseño del Expediente — dos columnas, contenido con tokens y botones en píldora (21/11/2026, autorizado)

- **Dos columnas** (`.expediente-layout`, desde 900 px): a la izquierda la ficha (iniciales y estado arriba; modalidad, nombre, periodo, etapa actual y avance) y las secciones en columna, con la píldora que se desliza de arriba abajo (las flechas ↑ y ↓ también cambian de sección). A la derecha, el contenido de la sección.
  - En la ventana flotante (60rem × 46rem como máximo), cada columna se desplaza por su cuenta: la ficha y las secciones quedan siempre a la vista.
  - En la página, la columna izquierda queda fija al bajar.
  - En celular, una sola columna con las pestañas horizontales.
- **Contenido con los colores del sistema:** las utilidades sueltas del Expediente (slate, sky, amber, emerald, red, blue y sus `dark:`) se traducen a tokens en `.expediente-root` (superficies, bordes, `--info/--warning/--success/--danger`, títulos `--heading`, esquinas de 14–20 px). Sigue el modo oscuro y el tema de color sin tocar la lógica ni el marcado.
- **Botones del sistema en píldora** (todas las pantallas): `.app-button--*` con 40 px de alto mínimo, radio completo y peso 600. Secundario sobre `--surface-sunken`; contorno `--border-strong`. Los de solo icono (barra superior) no llevan el relleno lateral.
- **Pruebas:** Expediente 666 que pasan (igual que antes); ninguna falla nueva en defensas, evaluación, cierre, dictámenes, rutas ni componentes.

### El Expediente vuelve a ser página (22/11/2026)

- Por la cantidad de contenido y de ventanas internas, "Abrir expediente" lleva a la **página** del Expediente, en la misma pestaña. Para la consulta rápida sin salir de la lista sigue la ventana flotante **Detalle** (el ojo).
- Se quitaron `ExpedienteModal`, la segunda ruta con `state.background` en `AppRoutes` y sus pruebas. `CenteredModal` conserva `layer` y la convivencia con ventanas internas, que no estorban.
- En la página, "← Volver a postulaciones" es una píldora del tamaño de su texto. El diseño de dos columnas sigue igual, con la ficha y las secciones fijas a la izquierda al bajar. En celular va una sola columna; la ficha muestra iniciales y estado arriba, y el nombre y los datos debajo.

### Sin botón de modo oscuro en la barra; Expediente más ancho y Actores en tarjetas (22/11/2026)

- **Barra superior sin el botón de modo claro/oscuro.** La opción pasa a Mi perfil → Tema de color, como interruptor "Modo oscuro" (`.mode-switch`, `role="switch"`).
- **Expediente:**
  - **Ancho:** llega hasta 96rem, para aprovechar las pantallas anchas.
  - **Sin huecos:** las secciones vacías (`.expediente-main > :empty`), por ejemplo en registros históricos, ya no dejan espacio.
  - **Actores:** los grupos "Participación actual" y "Participaciones anteriores" van uno debajo del otro, con contador decorativo (`aria-hidden`). Los actores son tarjetas en una grilla (`minmax(17rem, 1fr)`), cada una con iniciales, cargo, nombre y los datos "Designado desde", "Estado" (píldora de color), fechas y observaciones.
- **Pruebas:** una prueba del Expediente que buscaba la modalidad en toda la página pasa a buscarla dentro de la ficha del estudiante, porque la sección de Trabajo Dirigido también la nombra en su propio título. Expediente: 666 pruebas que pasan, igual que antes.

## Expediente rehecho (secciones compactas)

- **Cabecera de sección** (`.expediente-card`): título y descripción a la izquierda, acción arriba a la derecha (`.expediente-card-action`); en celular la acción baja a su propia fila.
- **Volver** vive en la columna izquierda, encima de la tarjeta del postulante; no ocupa una línea entera.
- **Resumen**: tarjeta neutra con franja de color arriba (sin fondo celeste). Desde 1280px se divide en dos columnas: a la izquierda la etapa y la siguiente acción, a la derecha los requisitos. La "Siguiente acción" usa superficie neutra con acento dorado a la izquierda.
- **Documentos y Defensas**: cada elemento es su propia tarjeta con aire entre los datos; "Ver defensa" arriba a la derecha de cada defensa.
- **Actores**: selector Tarjetas | Lista (el mismo `ViewToggle` de Postulantes, vista guardada en `sm_actores_vista`); en lista, una fila por actor.
- **Etapas e Historial**: grilla de tarjetas compactas; todas las etapas a la vista sin desplazarse.
- **Resultado y cierre**: bloques separados; dentro del cierre, cada parte es una sección del mismo bloque (sin tarjeta dentro de tarjeta).
- **Paginación única** (`Pagination` de `ReportComponents`): la misma de Postulantes en todo el sistema, centrada y solo cuando hay más de una página.
- `ViewToggle` coloca la píldora directamente en el DOM (sin estado de React) y espera a tener tamaño si está oculto.
