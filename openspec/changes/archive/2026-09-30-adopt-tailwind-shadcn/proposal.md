# Proposal

## Resumen

`gomep-vacantes` pinta sus pantallas con un CSS module compartido (`page.module.css`). Un agente que escriba UI a partir de ahora debe usar un solo sistema: Tailwind CSS v4, componentes shadcn/ui en el repo e iconos de lucide-react.

## Why

Hoy el estilo vive en clases de un module CSS. Un agente no tiene componentes que leer ni un vocabulario de clases estable, así que cada pantalla nueva tiende a inventar CSS. Hace falta fijar el stack de UI antes de seguir construyendo pantallas.

## Objetivos

- Dejar Tailwind, shadcn/ui y lucide-react instalados y configurados en `apps/gomep-vacantes`.
- Pasar las pantallas actuales de `page.module.css` a ese stack, sin cambiar los flujos ya especificados.
- Conservar los `data-testid` que usan las pruebas Playwright.

## Alcance

La app `apps/gomep-vacantes`: layout, shell y las pantallas de inicio, verificación, completar enlace, vacantes, suscripciones y admin.

## Fuera de alcance

- Formularios con react-hook-form, validación zod en la UI y estado de URL con nuqs.
- Funciones de producto nuevas (filtros, roles, suscripciones, alertas).
- `apps/gomep-vacantes-scrapper` y el resto del monorepo.
- Cambiar Firebase Auth, Firestore o el esquema compartido.

## What Changes

- Añadir Tailwind CSS v4, shadcn/ui y lucide-react como stack de UI de `gomep-vacantes`.
- Sustituir `page.module.css` y el CSS de layout que solo existe para esas clases por utilidades Tailwind y componentes en `components/ui`.
- Rehacer la presentación de inicio, verificar, completar enlace, vacantes, suscripciones, admin y el shell. Los flujos, textos de requisito y `data-testid` se mantienen.
- Los iconos de la interfaz salen de lucide-react.

## Capabilities

### New Capabilities

Ninguna. No hay comportamiento de producto nuevo.

### Modified Capabilities

Ninguna. Los requisitos de `account-auth`, `account-roles`, `vacancy-directory`, `subscriptions`, `vacancy-alerts` y `vacancy-catalogs` no cambian. Esas specs no fijan la librería de UI. Este cambio declara `skip_specs: true`.

## Impact

- Dependencias y configuración de `apps/gomep-vacantes` (Tailwind, shadcn, lucide-react).
- `src/app/globals.css`, `src/app/layout.tsx`, `src/components/app-shell.tsx` y las páginas que importan `page.module.css`.
- Se elimina `src/app/page.module.css` cuando ninguna pantalla lo importe.
- Las pruebas e2e existentes deben seguir pasando sobre los mismos `data-testid`.
