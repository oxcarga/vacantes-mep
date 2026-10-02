# Proposal

## Resumen

`gomep-vacantes` usa el tema neutro de shadcn: el botón principal, el anillo de foco y el acento del sidebar son grises. Hay que fijar una paleta azul, en los tokens que ya consume la app, antes de componer pantallas nuevas.

## Why

Sin una paleta escrita, cada pantalla puede teñir `primary` o meter un color suelto. El home que sigue va a apoyarse en esos tokens; conviene dejarlos cerrados antes de maquetar.

## Objetivos

- Dejar por escrito los tokens de color de la app, en claro y en oscuro.
- Reservar el único matiz cromático de marca al azul 255.
- Aplicar esos valores en `globals.css` para que botón, anillo y sidebar los hereden.

## Alcance

Las custom properties de color en `apps/gomep-vacantes/src/app/globals.css` (`:root` y `.dark`) y el mapeo que ya existe en `@theme inline`. No se añaden nombres de color fuera de la lista de shadcn.

## Fuera de alcance

- El layout del home: columnas, pestañas, panel y componentes que aún no están instalados.
- Un toggle de tema o `next-themes`. La app sigue en claro; el bloque `.dark` queda definido para no divergir después.
- Radio, fuente Geist y el marcado de las pantallas.
- `apps/gomep-vacantes-scrapper` y el resto del monorepo.

## What Changes

- `primary`, `primary-foreground`, `ring`, `sidebar-primary`, `sidebar-primary-foreground` y `chart-1` a `chart-5` pasan al azul de matiz 255.
- `background`, `foreground`, `card`, `secondary`, `muted`, `accent`, `destructive`, `border` e `input` se quedan en la escala neutra actual.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna. Este cambio declara `skip_specs: true`. La paleta no altera los requisitos de `account-auth`, `account-roles`, `vacancy-directory`, `subscriptions`, `vacancy-alerts` ni `vacancy-catalogs`.

## Impact

- `apps/gomep-vacantes/src/app/globals.css`.
- Cualquier control que ya use `bg-primary`, `text-primary` o `ring` se ve azul en cuanto se apliquen los tokens. El layout de cada página no cambia en este cambio.
