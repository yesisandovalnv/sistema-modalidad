# Plan de mejora del frontend

**Rama:** `colaborador` · **Equipo:** frontend · **Fecha:** 21/11/2026

**Objetivo:** que el sistema de modalidad se vea y se use "más o menos como" el Sistema de Fondo de Tiempo Docente (FdT), sin alterar el comportamiento validado de Proyecto de Grado ni de Tesis de Grado.

**Referencias:**

- Código de FdT: `../fondo-de-tiempo-docente/frontend/src`.
- Capturas de FdT: `../fondo-de-tiempo-docente/docs/screenshots`.
- Capturas actuales de este sistema: `documentacion/figuras/f*.png`.

Estado de cada punto: **Pendiente**, **En curso** o **Hecho**. Columna **Protegido**: *Sí* cuando el cambio toca el expediente común (Proyecto de Grado o Tesis) y requiere el protocolo de `AGENTS.md`.

---

## 1. Regla de protección (AGENTS.md)

- El expediente es superficie protegida. Incluye [ExpedientePage.jsx](../src/pages/postulantes/ExpedientePage.jsx) y los componentes de defensas, participantes, evaluación, dictámenes, cierre técnico y conclusión. Cambiarlo, aunque sea solo visualmente, exige este protocolo:
  1. Diagnóstico previo.
  2. Autorización con la frase exacta `AUTORIZO CAMBIO EN PROYECTO DE GRADO`.
  3. Regresión de Proyecto y de Tesis.
- El componente `Modal` de [CrudShell.jsx](../src/components/crud/CrudShell.jsx) es común: lo usan 33 ventanas, 18 de ellas del expediente. Todo cambio global en `Modal` (centrado, ancho o portal) cae bajo el protocolo. La alternativa sin autorización es añadir opciones nuevas que conserven el comportamiento actual por defecto.
- El menú lateral, la barra superior, los colores y las pantallas que no son del expediente no cambian el comportamiento de Proyecto. Se pueden rediseñar con normalidad, actualizando las pruebas que dependan de textos.

---

## 2. Lista de hallazgos

### A. Ventanas emergentes (modales)

| ID | Hallazgo | Detalle | Protegido | Estado |
|---|---|---|---|---|
| A1 | **No se centran respecto del contenido** | El velo es `fixed inset-0` y cubre toda la pantalla, menú lateral incluido. La ventana queda centrada en la pantalla y no en el área de trabajo, así que se ve corrida hacia el menú. En FdT, `ModalCentrado` cubre solo el área a la derecha del menú (`left: var(--fondo-sidebar-width)`) y difumina el fondo. | Sí (global) | Pendiente |
| A2 | **Hay que hacer scroll en varias ventanas** | Todas comparten un solo tamaño: `max-w-2xl` (672 px) con `max-h-[90vh]`. Las que tienen contenido largo obligan a desplazarse: cargar documento, detalle de documento, participantes y asistencia, resultado de defensa, importar estudiantes, nueva postulación y detalle de usuario. | Parcial | Pendiente |
| A3 | Sin tamaños | Falta la opción `size` (`sm`, `md`, `lg`, `xl`) para ensanchar solo las ventanas que lo necesitan, con formularios en dos columnas en lugar de uno largo. | No (opción nueva) | Pendiente |
| A4 | Foco | No atrapa el foco, no lo pone en el primer campo y no lo devuelve al botón que abrió la ventana. Solo cierra con Escape y con clic fuera. | Sí (global) | Pendiente |
| A5 | Scroll del fondo | La página de atrás sigue desplazándose con la ventana abierta. | Sí (global) | Pendiente |
| A6 | Aspecto | El cierre es el carácter "×" en lugar de un icono, la cabecera no tiene etiqueta ni subtítulo, y no hay pie con los botones alineados ni estilo común. En FdT, la ventana "Observar Fondo de Tiempo" tiene título, frase de qué pasará, caja de datos y lista de consecuencias. | Parcial | Pendiente |
| A7 | Ventana propia de Notificaciones | [NotificacionesPage.jsx](../src/pages/notifications/NotificacionesPage.jsx) tiene su propia ventana, con el mismo problema de centrado. | No | Pendiente |

> Para A1, A4 y A5 hay que seguir las buenas prácticas de modales de `AGENTS.md`. Primero se reproduce y se mide (geometría, bloques contenedores, contextos de apilamiento y scrollbars). Después se aplica la corrección estructural mínima, sin recurrir por defecto a portales, desplazamientos ni `z-index`. La variable `--sidebar-expanded-width` / `--sidebar-collapsed-width` ya existe en [index.css](../src/index.css).

### B. Avisos y errores (sistema de toasts)

| ID | Hallazgo | Detalle | Protegido | Estado |
|---|---|---|---|---|
| B1 | **No hay sistema de avisos emergentes** | No existe una librería ni un componente de avisos. Las acciones correctas no dan ninguna confirmación visible, y los errores salen como texto rojo dentro de la página, a veces lejos de donde se hizo clic. | No (infraestructura) | Pendiente |
| B2 | Tipos de aviso | Como `ToasterSistema` de FdT: **Listo** (verde), **Atención** (rojo), **Aviso** (azul) y **Procesando** (con spinner). Duran 4 s, se cierran con la X y admiten un botón de acción ("Ver", "Corregir"). | No | Pendiente |
| B3 | Errores de la API | [crudService.js](../src/services/crudService.js) normaliza los mensajes, pero cada pantalla decide cómo mostrarlos. Falta una vía común: error de campo junto al campo y error general en aviso. FdT tiene `utils/formErrors.js` para esto. | No | Pendiente |
| B4 | Sesión vencida | [api.js](../src/services/api.js) emite `auth-session-expired`, pero no se muestra ningún aviso de "Tu sesión venció". | No | Pendiente |
| B5 | Errores de pantalla | Solo el detalle de defensa tiene `ErrorBoundary`. Un error de renderizado en cualquier otra pantalla deja la página en blanco. Falta uno global con "Algo salió mal / Reintentar". | No (global, fuera del expediente) | Pendiente |
| B6 | Uso en el expediente | Añadir avisos de éxito o error a las acciones del expediente. | Sí | Pendiente |

### C. Confirmaciones

| ID | Hallazgo | Detalle | Protegido | Estado |
|---|---|---|---|---|
| C1 | `window.confirm` del navegador | Se usa en 6 lugares. Sin estilo, sin detalle y con un aspecto distinto en cada navegador. | Parcial | Pendiente |
| C2 | Ventana de confirmación propia | Como `ModalConfirmar` de FdT: tono rojo (eliminar o quitar) o azul, frase de qué pasará, detalle en lista, error del servidor dentro de la ventana, "Procesando…" mientras trabaja, foco en Cancelar y Enter para confirmar. | No (componente nuevo) | Pendiente |
| C3 | Reemplazar en pantallas libres | Catálogos, Diplomado e importar estudiantes. | No | Pendiente |
| C4 | Reemplazar en el expediente | `ExpedientePage` (2) y `TechnicalClosure`. | Sí | Pendiente |

### D. Estructura visual (al estilo FdT)

| ID | Hallazgo | Detalle | Protegido | Estado |
|---|---|---|---|---|
| D1 | Menú lateral | Pasar del degradado celeste y morado al azul oscuro de FdT (`blue-900` a `blue-950`). Logo grande y perfil (nombre y rol) arriba. Secciones "Principal", "Administración" y "Reportes". Elemento activo en blanco. | No | Hecho (21/11/2026) |
| D2 | Barra superior | Repite "Bienvenido / Sistema de modalidad" en todas las pantallas. FdT no tiene barra en escritorio: el contenido es un panel azulado con esquinas redondeadas junto al menú. Hay que decidir dónde quedan el tema, la cuenta y la campana. | No | Hecho (21/11/2026) |
| D3 | Campana sin función | El botón de notificaciones de la barra superior no hace nada (no tiene `onClick`) y duplica el del menú. | No | Hecho (21/11/2026) |
| D4 | Cabecera de página | Hoy es un título y un subtítulo sueltos (`PageHeader`). Pasaría a una tarjeta con icono, etiqueta en mayúsculas, título y botones, más una tarjeta oscura con el total ("Total postulaciones 7"). | No (Expediente: Sí) | En curso: hecho en Inicio (21/11/2026) |
| D5 | Barra de filtros | Formularios con etiquetas y listas nativas, y botón "Buscar" o "Aplicar filtros". En FdT es una sola barra en forma de píldora: buscador con icono, listas desplegables propias (`FiltroDesplegable`) y filtrado al escribir. | No | En curso: hecho en Inicio y Reportes › Postulaciones (21/11/2026) |
| D6 | Listados | Solo tarjetas grandes en las que el nombre aparece dos veces (título y campo "Estudiante") y el estado es un texto chico abajo a la derecha. Falta el selector **Tarjetas / Lista** y una tabla con avatar de iniciales, estado en color y botones "Ver" y "Editar". | No | Pendiente |
| D7 | Paginación | Hoy es "N resultados · Página X" con Anterior y Siguiente. FdT usa números de página centrados (`Paginacion`). | No | Pendiente |
| D8 | Estados en color | Falta un componente único de estado con punto y color por estado (En proceso, Concluida, Registrada, Observada…). | No | En curso: indicadores de estado del Inicio (21/11/2026) |
| D9 | Listas nativas | Hay `<select>` nativos en 18 archivos y se ven distintos en cada navegador. Reemplazarlos por una lista propia accesible, empezando por las pantallas libres. | Parcial | Pendiente |
| D10 | Carga y vacío | Los estados de carga son solo "Cargando…" en texto. Faltan esqueletos y estados vacíos con icono y acción. | Parcial | En curso: esqueleto del Inicio (21/11/2026) |
| D11 | Animaciones (ver sección I) | No hay transición entre páginas ni números animados en los indicadores (FdT usa `NumeroAnimado`). Hay que respetar `prefers-reduced-motion`. Una transición con `transform` en la página encierra a las ventanas `fixed`; resolver A1 antes. | No | Pendiente |
| D12 | Gráfico de Inicio | La leyenda de la dona parte nombres en tres renglones ("Graduacion / Via / Diplomado"). | No | Hecho (21/11/2026) |
| D13 | Página 403 | [ForbiddenPage.jsx](../src/pages/ForbiddenPage.jsx) dice "Su rol no dispone de acceso a reportes institucionales" en cualquier ruta prohibida. Las páginas 403 y 404 deben tener el estilo nuevo. | No | Pendiente |
| D14 | Pie de página | Solo dice "© 2026 Sistema de modalidad". FdT no tiene pie. Decidir si se quita o se completa (carrera, versión). | No | Hecho (21/11/2026) |
| D15 | Cerrar sesión en el menú | Está comentado en [Sidebar.jsx](../src/components/layout/Sidebar.jsx). FdT tiene "Atrás" abajo. | No | Pendiente |
| D16 | Celular | Revisar menú deslizable, velo, ventanas y tablas en pantallas angostas, como hace FdT con `lg:`. | No | Pendiente |
| D17 | Modo oscuro | FdT fuerza el modo claro; aquí hay modo oscuro. **Decisión pendiente.** | No | Pendiente |

### I. Animaciones (pedido del usuario, 21/11/2026: "todo debe tener animaciones")

Cada pieza que se rediseñe lleva su animación desde el principio, no al final. Se usan las skills `animate` y `choreograph` para diseñarlas y `animation-performance` para revisar su rendimiento.

| ID | Qué se anima | Cómo |
|---|---|---|
| I1 | Cambio de pantalla | Entrada suave del contenido (aparece y sube unos píxeles, unos 200 ms). Sin `transform` en contenedores que encierren ventanas `fixed` (ver A1). | **Hecho en Inicio (21/11/2026).**
| I2 | Ventanas emergentes y confirmaciones | El velo aparece y la ventana crece levemente al abrir, y sale más rápido al cerrar. |
| I3 | Avisos emergentes (toasts) | Entran desde arriba a la derecha, se apilan y salen deslizándose. El icono hace un pequeño rebote. |
| I4 | Menú lateral | Ancho al colapsar (ya existe), deslizamiento en el celular (ya existe), y la píldora activa se desliza al cambiar de opción. | **Hecho en Inicio (21/11/2026).**
| I5 | Menú de usuario y listas desplegables | Aparecen desde su origen (escala más opacidad). |
| I6 | Indicadores de Inicio y Reportes | Los números cuentan hasta su valor y las barras y la dona se llenan. | **Hecho en Inicio (21/11/2026).**
| I7 | Selector Tarjetas / Lista | El fondo de la opción elegida se desliza, como en FdT. |
| I8 | Listas y tablas | Las filas entran de forma escalonada al cargar o filtrar, y los esqueletos de carga laten suavemente. |
| I9 | Botones y tarjetas | Hover y presión (un leve hundimiento al presionar) y elevación de la tarjeta al pasar el mouse. |
| I10 | Estados | El chip de estado cambia de color con transición, y aparece un indicador de éxito tras guardar. |

**Reglas para todas:**

- Rápidas: 150–300 ms con curva de salida (`--ease-out`), solo `transform` y `opacity`.
- Que no hagan esperar a quien trabaja horas en el sistema.
- Respetar `prefers-reduced-motion`: sin movimiento, solo un cambio de opacidad.

### E. Cuenta y perfil

| ID | Hallazgo | Detalle | Protegido | Estado |
|---|---|---|---|---|
| E1 | Mi perfil | Hoy es una página de solo lectura. FdT tiene la ventana "Mi cuenta" con foto, tarjeta de perfil y bloques por rol. | No | Pendiente |
| E2 | Foto de perfil con recorte | Necesita backend. | — | Backend |
| E3 | Cambio de contraseña, incluso obligatorio en el primer ingreso | Necesita backend. | — | Backend |
| E4 | Elegir el rol activo cuando hay varios cargos | Necesita backend. | — | Backend |

### F. Requiere backend (no es solo frontend)

| ID | Hallazgo | Estado |
|---|---|---|
| F1 | Tiempo real por WebSocket, para que los avisos lleguen al instante ("…observado — Corregir"). El backend no tiene Channels. Mientras tanto, se puede consultar notificaciones cada cierto tiempo y mostrarlas como aviso emergente. | Backend |
| F2 | Chat de observaciones con botón flotante (`BotonFlotanteObservaciones` de FdT). | Backend |
| F3 | Nombres sin tildes en los datos ("Excelencia Academica", "Graduacion Via Diplomado"), que vienen del catálogo. | Backend / datos |

### G. Calidad del código

| ID | Hallazgo | Estado |
|---|---|---|
| G1 | Varios archivos están escritos en una sola línea por componente, por ejemplo [AppRoutes.jsx](../src/routes/AppRoutes.jsx) y [CrudShell.jsx](../src/components/crud/CrudShell.jsx). Eso dificulta revisar y combinar cambios. Darles formato al tocarlos. | Pendiente |
| G2 | Separar `CrudShell` en `components/ui/` (`Modal`, `PageHeader`, `SearchBar`, `DataState`, `Pager`, `Field`), conservando las exportaciones actuales. | Pendiente |
| G3 | Al cambiar textos ("Bienvenido", "Buscar", "Cargando…"), actualizar las pruebas que los buscan (`Navbar.test`, `AppRoutes.test`, etc.). | Pendiente |

### H. Colores institucionales (UABJB, carrera acreditada) — Hecho (21/11/2026)

La estructura visual se toma de FdT, pero los colores son los de la UABJB y del sello de la Carrera de Ingeniería de Sistemas acreditada.

**Fuentes:**

- El sello [uab/logo/Logo-ac.png](../uab/logo/Logo-ac.png), con colores medidos sobre la imagen.
- El logo oficial y la hoja de estilos del sitio [uabjb.edu.bo](https://www.uabjb.edu.bo/) (`images/Logos/logo_Oficial.png`).

No se encontró un manual de identidad visual publicado. Si la Dirección de la carrera o la DTIC lo tiene, debe reemplazar esta tabla.

| Token | Color | Origen | Uso | Contraste |
|---|---|---|---|---|
| `--uab-azul-900` | `#02254E` | Aro azul marino del sello | Menú lateral, botón principal, títulos, tarjeta de total | 15,2:1 con blanco |
| `--uab-azul-950` | `#001A3A` | Fondo oscuro del sello (`#000F22`) | Final del degradado del menú, modo oscuro | 17,4:1 con blanco |
| `--uab-rojo` | `#C10202` | "UAB" del logo oficial y franja roja del sello | Acento de marca y peligro (eliminar) | 6,4:1 con blanco |
| `--uab-turquesa` | `#3BBDC9` | Engranaje del sello | Elemento activo y detalles **sobre azul**; nunca texto sobre blanco | 6,8:1 sobre azul, 2,3:1 sobre blanco |
| `--uab-turquesa-texto` | `#167784` | Turquesa oscurecido | Enlaces y texto turquesa sobre fondo claro | 5,2:1 con blanco |
| `--uab-dorado` | `#CC9D3B` | Cinta "ACREDITADA" | Detalles **sobre azul** (líneas, insignias, "Concluida") | 6,1:1 sobre azul |
| `--uab-dorado-texto` | `#8A6418` | Dorado oscurecido | Texto dorado sobre fondo claro | 5,4:1 con blanco |
| `--uab-amarillo` | `#FFE858` | Barra amarilla del "1" | Solo detalles pequeños sobre azul (foco, punto de estado) | 12,3:1 sobre azul |
| `--uab-azul-web` | `#0037DD` | Botones del sitio uabjb.edu.bo | Opcional: botón secundario o enlaces | 8,1:1 con blanco |

**Reglas:**

- El rojo `#C10202` es el único rojo del sistema. Cubre peligro, error y eliminar, y también la marca. No se usan otros rojos o rosados.
- Turquesa, dorado y amarillo solo como texto sobre azul, o en sus versiones `-texto` sobre fondo claro (WCAG AA ≥ 4,5:1).
- El dorado es acento de marca, no un estado. Va en el filete de la tarjeta de total, el anillo del logo y una serie de los gráficos.
- Los valores se definen una sola vez como variables en [index.css](../src/index.css), reemplazando el degradado celeste y morado actual (`--sidebar-bg*`). Las pantallas usan solo los tokens semánticos, nunca un hexadecimal suelto.

#### Reparto de colores por rol (definido con `impeccable`, 21/11/2026)

Contrastes verificados por cálculo (WCAG 2.x). La dirección visual está registrada en `.impeccable/surfaces/src-layouts-mainlayout-jsx.md`.

| Rol (token) | Claro | Oscuro | Dónde se usa |
|---|---|---|---|
| `--canvas` | `#EAF0F7` | `#0A1628` | Panel de trabajo detrás de las tarjetas (el "azulado" de FdT) |
| `--surface` | `#F8FAFD` | `#12233D` | Tarjetas, ventanas, barra superior |
| `--surface-raised` | `#FFFFFF` | `#182C4A` | Menús desplegables, avisos y lo que flota |
| `--surface-sunken` | `#E1E8F2` | `#0D1B31` | Campos de texto, buscador en píldora, pistas de barras |
| `--border` | `#D3DDEA` | `#22395C` | Separadores y bordes de tarjeta |
| `--border-strong` | `#7A8BA3` (3,3:1) | `#5A7193` (3,2:1) | Borde de campos y controles |
| `--text` | `#0B1F3A` (15,8:1) | `#E6EDF7` (13,4:1) | Texto principal |
| `--text-secondary` | `#475A73` (6,7:1) | `#A9B8CD` (7,8:1) | Descripciones y etiquetas |
| `--text-muted` | `#5E6E86` (5,0:1) | `#8C9DB5` (5,7:1) | Ayudas y marcas de tiempo |
| `--heading` | `#02254E` | `#FFFFFF` | Títulos de página y de tarjeta |
| `--primary` / `--on-primary` | `#02254E` / `#FFFFFF` (15,2:1) | `#3BBDC9` / `#001A3A` (7,7:1) | Botón principal, paginación activa, selector Tarjetas/Lista |
| `--primary-hover` | `#0A3266` | `#5FCBD5` | Hover del botón principal |
| `--secondary` / `--on-secondary` | `#167784` / `#FFFFFF` (5,2:1) | `#167784` / `#FFFFFF` | Segunda acción ("Generar…", "Exportar") |
| `--link` | `#0037DD` (7,8:1) | `#7FD3DC` (9,2:1) | Enlaces dentro del texto |
| `--focus` | `#167784` (5,0:1) | `#3BBDC9` (7,0:1) | Anillo de foco de teclado (2 px más separación) |
| `--danger` / `--on-danger` | `#C10202` / `#FFFFFF` (6,4:1) | igual | Eliminar, error, aviso "Atención" |
| `--brand-gold` | `#CC9D3B` (sobre azul 6,1:1) | `#CC9D3B` (6,3:1) | Filete de la tarjeta de total, anillo del logo |
| `--brand-gold-text` | `#8A6418` (5,1:1) | `#CC9D3B` | Texto dorado sobre claro (poco uso) |
| **Menú** `--nav-bg-start` → `--nav-bg-end` | Degradado `#0A3266` → `#001A3A` | `#02254E` → `#000F22` | Fondo del menú lateral (ajustado en la revisión para que el degradado se note) |
| `--nav-text` | `#D6E2F0` (11,6:1) | igual | Elementos del menú |
| `--nav-section` | `#3BBDC9` (6,8:1) | igual | Títulos "PRINCIPAL", "ADMINISTRACIÓN", "REPORTES" |
| `--nav-meta` | `#9FB4CF` (7,2:1) | igual | Rol del usuario bajo el nombre |
| `--nav-hover` | blanco al 8 % | blanco al 8 % | Hover del elemento |
| `--nav-active-bg` / `-text` / `-icon` | `#FFFFFF` / `#02254E` / `#167784` | `#E6EDF7` / `#001A3A` / `#167784` | Píldora del elemento activo |
| **Tarjeta de total** | Fondo `#02254E`, número blanco, filete `--brand-gold` | Fondo `#001A3A` | "Total postulaciones" en la cabecera |

**Estados semánticos** (chips de estado, avisos, mensajes):

| Estado | Suave claro (texto / fondo) | Suave oscuro (texto / fondo) | Sólido (aviso emergente) | Estados de postulación |
|---|---|---|---|---|
| Éxito | `#11683F` / `#E3F4EC` (6,0:1) | `#6FD39A` / `#0F2E24` (8,0:1) | `#15803D`, texto blanco (5,0:1) | Concluida, Aprobado |
| Aviso | `#7A4F00` / `#FFF3D1` (6,4:1) | `#F2C75C` / `#33280B` (9,0:1) | `#E0A526`, texto `#001A3A` (7,9:1) | Observada, Pendiente de corrección |
| Error / peligro | `#A4161A` / `#FDE8E8` (6,6:1) | `#FF9B9B` / `#3A1418` (8,1:1) | `#C10202`, texto blanco (6,4:1) | Rechazada, Anulada |
| Información | `#0F5F69` / `#DDF3F5` (6,4:1) | `#7FD3DC` / `#0D2E36` (8,4:1) | `#167784`, texto blanco (5,2:1) | En proceso |
| Neutro | `#02254E` / `#E1E8F2` (12,4:1) | `#A9B8CD` / `#182C4A` | — | Registrada, Borrador |

Cada chip lleva **punto más texto**, nunca solo color. **Gráficos:** las seis series de modalidad se definen después con la skill `dataviz`, partiendo de azul marino, turquesa, dorado y azul web.

---

## 3. Fases

1. **Base común, sin tocar el expediente.**
   - Colores institucionales (H), menú lateral y barra superior (D1, D2, D3, D15).
   - Avisos emergentes (B1–B5).
   - Ventana de confirmación (C2).
   - Opción `size` en `Modal` (A3).
   - Estados en color, paginación y barra de filtros (D5, D7, D8).
2. **Pantallas libres.** Inicio, Postulantes (tarjetas y lista), Documentos, Modalidades, Seguimiento, Usuarios, Reportes, Notificaciones, Mi cuenta, y las páginas 403 y 404 (D4, D6, D9–D13, E1, A2 y C3 en estas pantallas).
3. **Ventanas globales y expediente, con autorización.** Centrado, foco y scroll de la ventana (A1, A4, A5), y aspecto del expediente (A2, A6, B6, C4, D4). Requiere la frase de autorización y la regresión de Proyecto y Tesis.
4. **Con backend.** E2–E4 y F1–F3.

---

## 4. Skills a usar

Son sistemas de gestión, no sitios web. Conviene usar las skills pensadas para pantallas de aplicación y dejar fuera las de landing o marca.

| Skill | Para qué |
|---|---|
| `impeccable` | Diseñar, criticar y pulir pantallas de aplicación (dashboard, listados, formularios). Fijar el sistema de diseño (colores, tipografía, espaciado). |
| `design-taste-frontend` | Solo su modo para pantallas de aplicación (dashboards, administración, configuración), con revisión sobre capturas. |
| `emil-design-eng` | Detalle de componentes: estados de botón, ventanas, popovers, transiciones. |
| `web-design-guidelines` | Auditar la accesibilidad y las buenas prácticas de cada pantalla terminada. |
| `ask-sonner` | Si se elige Sonner como librería de avisos (B1). La alternativa es `react-hot-toast`, como en FdT. |
| `break-ui` | Probar cada pantalla con datos extremos: nombres largos, cero registros, muchos registros. |
| `unslop` | Quitar lo que se vea genérico o "hecho por IA". |
| `dataviz` | Gráficos e indicadores de Inicio y Reportes (D12). |
| `animate`, `choreograph`, `animation-performance` | Transiciones de página, entrada de ventanas y números animados (D11). |
| `find-animation-opportunities`, `improve-animations` | Revisar qué conviene animar y qué no. |
| `mobile-native` | Ajustes para celular (D16). |
| `simplify` / `code-review` | Revisar cada cambio antes de hacer commit. |

**No aplican:** `awesome-design-md` (estilos de marcas), `image-to-code` (sitios web), `hyperframes`, ni el modo landing de `design-taste-frontend`.

---

## 5. Decisiones pendientes

1. **Modo oscuro (D17):** se mantiene (decidido el 21/11/2026). El estilo FdT se adapta también al tema oscuro.
2. **Librería de avisos (B1):** Sonner, salvo que el equipo prefiera `react-hot-toast`, como en FdT. Sonner trae accesibilidad, avisos de "Procesando" que pasan a éxito o error, y botón de acción, y tenemos la skill `ask-sonner`. El aspecto se personaliza igual al de FdT.
3. **Barra superior (D2):** se mantiene (decidido el 21/11/2026). Se rediseña: más delgada, sin el "Bienvenido / Sistema de modalidad" repetido y con la campana funcionando.
4. **Fase 3 (ventanas globales y expediente):** queda fuera hasta que el usuario dé la autorización expresa de `AGENTS.md` para ese alcance. Las fases 1 y 2 no la necesitan.

## 6. Pruebas en cada cambio

- `npm run lint`, `npm run test:run` y `npm run build`.
- Revisión visual en escritorio (menú expandido y contraído) y en celular.
- Al tocar `Modal` o cualquier componente usado por el expediente: regresión completa de Proyecto de Grado y de Tesis de Grado (`AGENTS.md`).
