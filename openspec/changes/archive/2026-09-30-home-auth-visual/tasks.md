# Tasks

## 1. Base

- [x] 1.1 Copiar a `globals.css` los tokens de `openspec/changes/paleta-app/design.md` si `--primary` en `:root` sigue neutro, y verificar que el valor claro queda en `oklch(0.42 0.14 255)` y el oscuro en `oklch(0.75 0.12 255)`.
- [x] 1.2 Añadir `field`, `tabs` y `alert` con el CLI de shadcn en `apps/gomep-vacantes`, y verificar que existen `src/components/ui/field.tsx`, `tabs.tsx` y `alert.tsx`.

## 2. Página de inicio

- [x] 2.1 Recomponer la columna de acceso de `page.tsx` con `Tabs`, `Field` y `Alert`, conservar los `name`, los `data-testid` y los textos «Crear cuenta», «Entrar con contraseña», «Enviar magic link» y «Cerrar sesión», cambiar el helper de `e2e/app.spec.ts` para pulsar la pestaña «Entrar», y verificar que pasan las pruebas Playwright 5.1 y 6.1.
- [x] 2.2 Añadir el panel de marca centrado en los dos ejes, con el `h1` «Vacantes del MEP» y las tres líneas, cargando Source Serif 4 solo en ese panel, y verificar con Playwright en Desktop Chrome que el título y las tres líneas son visibles.
