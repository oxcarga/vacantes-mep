# Design

## Context

La ficha del docente en `apps/gomep-vacantes/src/app/vacantes/page.tsx` muestra el ID como texto mono `#${row.id}` debajo del título. `row.id` es el ID del documento en la colección `vacantes`. No hay uso previo de portapapeles ni de toasts en la app. Los iconos ya vienen de `lucide-react`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- Un botón a la derecha de `#id` en cada ficha del docente.
- `navigator.clipboard.writeText` con el ID sin `#`.
- Confirmación local en el mismo botón, sin una librería de toasts.

**Non-Goals:**

- El mismo control en `/admin`.
- Un componente genérico de copiar para el resto de la app.
- Fallback con `document.execCommand`.

## Decisions

### El control vive en la fila del número

La fila actual es un `span` con `#{row.id}`. Pasa a un contenedor `flex items-center` con el número y un `button` a la derecha. El botón usa los iconos `Copy` y `Check` ya disponibles en `lucide-react`, con área táctil de al menos el tamaño de los botones icono de la misma página.

Alternativa: alinear el botón al borde derecho de la tarjeta. Se descarta porque el pedido es que quede al lado del ID, no al borde de la ficha.

### Estado de copiado por ficha

Un componente pequeño, local a la página o en `components/`, guarda si esa ficha acaba de copiar. Al éxito, el icono pasa de `Copy` a `Check` unos 2 segundos y vuelve a `Copy`. El `aria-label` en reposo es `Copiar ID de vacante ${id}`. Durante la confirmación pasa a `ID copiado`. Un `aria-live="polite"` anuncia ese cambio.

`data-testid`: `vacante-${id}-copiar-id`.

Alternativa: un toast. Se descarta porque la app no tiene ese sistema y la confirmación cabe en el botón.

### Solo `clipboard.writeText`

En éxito se llama `navigator.clipboard.writeText(id)`. Si la promesa rechaza, no se muestra el check. El contexto de la app (HTTPS en producción, localhost en desarrollo) permite la Clipboard API. No se añade dependencia.

Alternativa: `execCommand('copy')` como respaldo. Se descarta: el fallo queda cubierto por no mostrar la confirmación, y el respaldo no aporta en los entornos donde corre la app.

### La prueba concede el portapapeles

Playwright no expone el portapapeles sin permiso. El test del docente concede `clipboard-read` y `clipboard-write`, activa el botón de una ficha conocida (por ejemplo `1003`) y lee el portapapeles. El texto esperado es el ID sin `#`. El test también comprueba que la ficha sigue mostrando `#` más el ID.

## Risks / Trade-offs

- [El navegador niega el permiso de portapapeles] → no hay check; el número sigue visible para copiarlo a mano.
- [El check de 2 segundos se pisa si se pulsa otra vez] → cada éxito reinicia el temporizador de esa ficha; no afecta a las demás.
- [Lectores de pantalla y el cambio de icono] → el nombre accesible y `aria-live` anuncian el resultado; el icono solo no basta.

## Migration Plan

Cambio solo de UI. No hay datos que migrar. Revertir es quitar el botón de la ficha.
