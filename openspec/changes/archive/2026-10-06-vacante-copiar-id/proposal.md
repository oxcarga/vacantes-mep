# Proposal

## Resumen

El docente ve el número de cada vacante en la ficha de `/vacantes`, pero no puede copiarlo. Hay que añadir un control al lado de ese número que copie el ID al portapapeles, sin el `#` visible.

## Why

El número de vacante se usa para referirla fuera de la app. Hoy el docente tiene que seleccionarlo a mano en la ficha. Un control de copiar reduce errores al pegarlo en otro sitio.

## What Changes

- Cada ficha del directorio del docente muestra un botón con icono de copiar a la derecha del número de vacante.
- Al activarlo (click o tap), el portapapeles recibe solo el ID, sin `#`.
- El control confirma la copia de forma perceptible y es usable con teclado y lector de pantalla.
- La lista de vacantes del admin no cambia.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `vacancy-directory`: la ficha del docente gana una acción que copia el ID de la vacante al portapapeles.

## Alcance

Fichas de vacantes abiertas en el directorio del docente (`/vacantes` de gomep-vacantes). El número visible sigue mostrando `#` seguido del ID. Lo que se copia es el ID del documento.

## Objetivos

- El docente copia el ID de una vacante con un solo gesto.
- El texto copiado es el ID, sin el prefijo `#`.
- El resultado de la copia se percibe sin salir de la ficha.

## Fuera de alcance

- Copiar el ID desde la lista de vacantes del admin.
- Copiar especialidad, regional, institución u otros campos.
- Compartir la vacante, generar un enlace o un código QR.
- Un sistema de notificaciones o toasts nuevo para el resto de la app.

## Impact

- UI del directorio del docente en `apps/gomep-vacantes`.
- Spec `vacancy-directory` y una prueba Playwright del gesto de copiar.
- Sin cambios de Firestore, Auth ni API.
