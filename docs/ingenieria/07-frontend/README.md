# Frontend: organización

Estado: IMPLEMENTADO para estructura; diagramas PENDIENTES.

La SPA separa rutas, layouts, contextos/hooks, páginas, componentes, servicios y utilidades. Fuentes: [rutas](../../../src/routes/AppRoutes.jsx), [sesión](../../../src/context/AuthProvider.jsx), [notificaciones](../../../src/context/NotificationProvider.jsx), [expediente](../../../src/pages/postulantes/ExpedientePage.jsx).

ProtectedRoute está dentro de AppRoutes.jsx. Las capacidades guían la interfaz; la API autoriza. Axios adjunta Bearer y coordina refresh; los tokens se guardan en localStorage.

El expediente incorpora defensa, evaluación, dictámenes, correcciones, cierre y componentes específicos. La existencia de pantalla no acredita que todos sus controles estén habilitados para cada rol. Separar navegación y proceso académico.
