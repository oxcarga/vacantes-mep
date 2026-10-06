# Tasks

## 1. Copiar el ID en la ficha del docente

- [x] 1.1 Añade en cada ficha de `/vacantes` un botón a la derecha del número visible, con `data-testid` `vacante-${id}-copiar-id`, nombre accesible `Copiar ID de vacante ${id}` e icono de copiar. Al activarlo, escribe en el portapapeles solo el ID, sin `#`. Si la escritura tiene éxito, el botón confirma la copia (icono de check y nombre `ID copiado`) unos 2 segundos y el número visible sigue con `#`. Si la escritura falla, no muestra esa confirmación. Verifica con una prueba Playwright en `apps/gomep-vacantes/e2e/app.spec.ts`: con permiso de portapapeles, activar el botón de la vacante `1003` deja `1003` en el portapapeles, la ficha sigue mostrando `#1003`, el nombre accesible indica que copia ese ID y aparece la confirmación de éxito.
