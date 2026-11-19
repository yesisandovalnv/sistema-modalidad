# Informe de compatibilidad con Microsoft Word

**Proyecto:** Sistema de Modalidades de Graduación  
**Fecha:** 5 de noviembre de 2026  
**Alcance:** diagnóstico y corrección controlada del Manual Técnico. El documento principal y el Manual de Usuario se conservaron sin cambios.

## Causa identificada

En `word/document.xml`, el campo TOC tenía cuatro elementos (`w:fldChar` de inicio, separación y cierre, y `w:instrText`) insertados directamente como hijos de `w:p`. El generador `_build_manual_tecnico.py` realiza esas inserciones directamente. En WordprocessingML esos elementos deben estar dentro de `w:r`; además, `w:pPr` debe preceder a los runs del párrafo. Los tres elementos del inicio estaban también antes de `w:pPr`.

La misma estructura se encontró en el DOCX principal y en la copia anterior de fase 15. No aparece en el Manual de Usuario ni en los dos DOCX de fase 10 inspeccionados. Esto explica por qué la verificación ZIP/XML y la conversión histórica a PDF podían pasar, mientras Word rechazaba ambos DOCX: esos controles previos no validaban la estructura OOXML del campo. La atribución se basa en el defecto concreto y en que Word abrió el candidato tras repararlo; no se ejecutó un validador OOXML oficial independiente.

## Cambio aplicado al candidato

Se crearon `manual-tecnico-corregido.docx` y una copia de respaldo adicional. Solo se corrigió `word/document.xml` del candidato:

- Se envolvieron los cuatro elementos del campo en runs `w:r`.
- Los tres elementos iniciales se ubicaron después de `w:pPr`; el cierre quedó al final del último párrafo del índice.
- Se conservaron la instrucción TOC y el texto visible del índice para mantenerlo actualizable.

El texto extraído antes y después es idéntico. Permanecen los 28 capítulos, 30 tablas, 8 imágenes/diagramas, 18 relaciones del documento y 4 secciones (vertical, apaisada, apaisada, vertical). Las demás 26 entradas del paquete mantienen el mismo contenido descomprimido. No se alteraron estilos, imágenes, encabezados, pies, páginas apaisadas ni las correcciones documentales de fase 15.

## Validación

| Comprobación | Resultado |
|---|---|
| SHA-256 original | `71E59570C773A3AD86E007085D16D4D84D35E123A9621C0110E51701BF32B81A` |
| SHA-256 del respaldo adicional | `71E59570C773A3AD86E007085D16D4D84D35E123A9621C0110E51701BF32B81A` |
| SHA-256 del candidato | `28A110219CACDE2FCDA5466006243BB21CC61DCA74984CF972A56ADDFFD91427` |
| ZIP/XML | 27 entradas; XML analizables; no se detectaron errores ZIP. |
| Campo TOC | 4 nodos dentro de `w:r`; secuencia begin, instrucción, separate, end; sin nodos de campo directos bajo `w:p`. |
| Texto y estructura | Texto idéntico; 30 tablas, 8 imágenes, 4 secciones; propiedades de párrafo en orden. |
| Relaciones y otros recursos | Las 18 relaciones y las otras entradas del paquete se conservaron. |
| Microsoft Word | Abrió el candidato en modo **Solo lectura**; no mostró error de apertura ni solicitud de reparación/recuperación. |
| Actualización del índice | Word mostró el aviso de actualización de campos; se eligió **No** para no cambiar el candidato durante la validación. La instrucción TOC permanece en el paquete. |
| Revisión visual | Se observaron portada, control de versiones, índice, las figuras apaisadas DIA-TG-060 y DIA-TD-060 y la página de referencias. No se hizo una revisión página por página. |

Word muestra el candidato en **Modo de compatibilidad**. El paquete conserva `compatibilityMode=14`, el mismo valor presente en el original y en los DOCX de fase 10; ese ajuste no se cambió porque no causó el rechazo observado y alterarlo podía modificar la paginación. El modo no impidió abrir el candidato.

## Pendientes y límite de aceptación

El candidato está listo para que el usuario lo pruebe manualmente en Word. La apertura real en esta instalación fue satisfactoria, pero queda pendiente que el usuario confirme su apertura en su flujo habitual y revise todas las páginas. No se actualizó el índice; Word puede solicitar esa acción al abrir el candidato. No se confirmó de nuevo el total de páginas, la paginación final ni la legibilidad detallada de los ocho diagramas.

El PDF existente es anterior a esta corrección y no se usó como validación visual del candidato. No se encontró un ejecutable de LibreOffice disponible para repetir el render. El original y los respaldos de fase 15 existentes permanecen intactos.
