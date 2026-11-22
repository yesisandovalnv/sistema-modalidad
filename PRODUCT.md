# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Administración de la carrera:** el administrador o la secretaría registra postulaciones, revisa documentos, asigna actores (tutor, tribunal, docente de modalidad, presidente, secretario), programa defensas y registra resultados. Trabaja en computadora, durante horas, con muchos expedientes a la vez.
- **Estudiantes (postulantes):** consultan "Mi proceso", ven qué falta, suben sus documentos y reciben notificaciones. Entran con su R.U. y C.I., muchas veces desde el celular.
- **Docentes asignados:** tutor, tribunal y docente de modalidad consultan los expedientes que tienen asignados y emiten dictámenes.

Administración y estudiantes pesan lo mismo (confirmado el 21/11/2026). Se usa en computadora y celular.

## Product Purpose

Registrar y seguir el proceso de graduación de la Carrera de Ingeniería de Sistemas de la Universidad Autónoma del Beni "José Ballivián" (UABJB, Trinidad). Cubre seis modalidades: Proyecto de Grado, Tesis de Grado, Trabajo Dirigido, Graduación vía Diplomado, Excelencia Académica y Examen de Grado.

Objetivos:

- Que no se pierdan ni se dupliquen documentos.
- Que las defensas se preparen a tiempo.
- Que cada persona sepa en qué etapa está cada postulante y cuál es la siguiente acción.

## Positioning

Un expediente único por postulación, con un flujo por etapas que aplica la política de cada modalidad según la normativa de la UABJB: requisitos, actores, quórum y cálculo de nota (por ejemplo, 30 % privada y 70 % pública en Proyecto de Grado). Indica a cada rol cuál es la siguiente acción.

## Operating Context

- Oficina de la carrera, defensas presenciales, documentos físicos que se reciben y se cotejan con los digitales, actas de defensa y memorándums.
- Sistema hermano de referencia: **Fondo de Tiempo Docente**, de la misma carrera (`../fondo-de-tiempo-docente`), que sirve de modelo de estructura y de uso.

## Capabilities and Constraints

- **Tecnología:** Django REST Framework más React 19, Vite y Tailwind 4. Permisos por rol desde la API (`puede_*`).
- **Pantallas:**
  - Inicio con indicadores.
  - Postulantes y expediente.
  - Documentos.
  - Modalidades.
  - Seguimiento.
  - Notificaciones.
  - Usuarios.
  - Reportes (postulaciones y resultados académicos).
  - Configuración.
  - Mi perfil.
- **Superficies protegidas por `AGENTS.md`:** Proyecto de Grado y Tesis de Grado. El expediente común solo cambia con la autorización expresa del usuario.
- **Modo claro y oscuro:** se mantienen los dos (decidido el 21/11/2026).
- **Plan de trabajo de frontend:** `docs/PLAN_FRONTEND.md`.

## Brand Commitments

- **Identidad:** Universidad Autónoma del Beni "José Ballivián" (UABJB), Carrera de Ingeniería de Sistemas, acreditada.
- **Logo del sistema:** el logo oficial **UABJB** ("UAB JB · Universidad Autónoma del Beni"), en el menú y en el inicio de sesión (decidido el 21/11/2026). Fuente: `https://www.uabjb.edu.bo/images/Logos/logo_Oficial.png`. El repositorio todavía no tiene una versión en alta resolución.
- **Colores:** los institucionales de la UABJB y del sello de la carrera acreditada (`uab/logo/Logo-ac.png`), detallados en `docs/PLAN_FRONTEND.md` §H. No hay un manual de identidad visual publicado.
- **Idioma:** español de Bolivia, en tono formal-administrativo.

## Evidence on Hand

- Logos: `uab/logo/Logo-ac.png` (sello de la carrera acreditada) y logo oficial UABJB en el sitio institucional.
- Fotos del campus: `uab/`, `src/assets/login-campus-*.webp`.
- Normativas de cada modalidad: `normativa_*`.
- Capturas actuales del sistema: `documentacion/figuras/`.
- No hay manual de identidad visual oficial; no inventar uno.

## Product Principles

1. Siempre se ve el estado y la siguiente acción de cada postulación.
2. La norma manda: el sistema no presume actos administrativos que no ocurrieron.
3. Lo mismo se ve y se nombra igual en todas las modalidades y pantallas.
4. Debe servir tanto al personal que trabaja horas en él como al estudiante que lo consulta desde el celular.

## Accessibility & Inclusion

Contraste WCAG AA (texto ≥ 4,5:1), navegación con teclado en menús y ventanas, y respeto de `prefers-reduced-motion`.
