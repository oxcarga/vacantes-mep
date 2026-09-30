# Diseño

## Contexto

Ver `proposal.md` para el motivo. `gomep-vacantes` es Next.js 16 con React 19, alias `@/*` → `./src/*` y un workspace npm. El estilo está en `src/app/page.module.css` (lo importan inicio, verificar, completar enlace, vacantes, suscripciones, admin y `app-shell`) y en el reset de `src/app/globals.css`, que incluye modo oscuro por `prefers-color-scheme`. `layout.tsx` ya carga Geist y Geist Mono como variables CSS. No hay `components.json` ni Tailwind.

Las pruebas e2e en `e2e/app.spec.ts` dependen de nombres accesibles (`Entrar`, `Crear cuenta`, `Entrar con contraseña`, `Cerrar sesión`, `Agregar`, `Quitar`, enlace `Aplicar`), de `<select>` nativos (`selectOption` en `vacantes-regional`, `vacantes-especialidad`, `subscribe-regional`, `subscribe-especialidad`) y de una lista `ul` cuyos hijos son `li` (`vacantes-list` → `locator("li")`).

## Objetivos / Fuera de alcance

**Objetivos:**

- Un solo sistema de UI en esta app: Tailwind CSS v4, componentes shadcn copiados al repo e iconos lucide-react.
- Migrar las pantallas que hoy usan `page.module.css` sin mover test ids, nombres accesibles ni la estructura `ul`/`li` y `<select>` que las pruebas ya usan.

**Fuera de alcance:**

- Elegir Base UI como primitivo de shadcn.
- Sustituir los `<select>` por el Select de Radix.
- Tema oscuro, toggle de tema, react-hook-form, zod en la UI y nuqs.

## Decisiones

### 1. Tailwind v4 solo en `gomep-vacantes`

Se instala Tailwind v4 y `@tailwindcss/postcss` en el workspace `gomep-vacantes`. `globals.css` pasa a `@import "tailwindcss"` y a las variables del tema de shadcn. La fuente sans del tema apunta a la variable Geist que ya define `layout.tsx`. El reset de márgenes y el `font-family: Arial` del starter se eliminan: Tailwind preflight los cubre.

Alternativa: Tailwind en la raíz del monorepo. El scrapper no renderiza UI y arrastraría el toolchain.

### 2. shadcn con primitivos Radix

`npx shadcn@latest init` se corre dentro de `apps/gomep-vacantes` y debe dejar `components.json` con React Server Components, TypeScript, CSS en `src/app/globals.css` y alias `@/components` y `@/lib/utils`. El helper `cn` queda en `src/lib/utils.ts`. Los componentes se copian a `src/components/ui` y no se envuelven en un paquete propio.

La base es Radix, la que el CLI de shadcn usa por defecto y la que un agente reproduce con más ejemplos públicos. Base UI queda descartada para no mezclar dos primitivos en el mismo `components.json`.

Conjunto inicial, el que las pantallas usan hoy: `button`, `input`, `label`, `card`. No se añaden componentes sin una pantalla que los use.

### 3. Los controles que las pruebas tocan siguen siendo elementos nativos

Los filtros y los pares de suscripción siguen siendo `<select>` con las mismas `data-testid`. Se estilan con clases Tailwind. El Select de shadcn es un combobox y rompe `selectOption`.

Los botones de shadcn se usan donde el control ya es un `<button>` con texto visible. El texto del botón no se reemplaza por un icono. Los iconos de lucide-react van junto al texto y con `aria-hidden`, para que `getByRole("button", { name })` siga encontrando "Cerrar sesión", "Entrar", "Crear cuenta", "Agregar" y "Quitar".

La lista de vacantes sigue siendo `ul` > `li`. El `data-testid` de cada ficha permanece en el `li`. `Card` puede envolver el contenido de la ficha, no sustituir el `li`.

### 4. Tema claro, sin modo oscuro del starter

shadcn aporta tokens en `:root` para el tema claro. Se quita el bloque `prefers-color-scheme: dark` de `globals.css`. No hay un tema oscuro diseñado; dejar el media query del starter pelearía con esos tokens.

### 5. lucide-react se usa, no solo se declara

El shell muestra iconos decorativos de lucide junto al texto que ya existe (sesión y navegación). Así la dependencia forma parte de la UI que el agente va a extender, sin cambiar roles accesibles.

## Riesgos / Trade-offs

- [Select de Radix en filtros] → Los `<select>` de vacantes y suscripciones siguen siendo nativos.
- [Botón solo con icono] → El texto accesible actual se conserva; el icono es `aria-hidden`.
- [Ficha como `div`] → El hijo de `vacantes-list` sigue siendo `li`.
- [Se pierde el modo oscuro automático del starter] → Aceptado. El tema de esta entrega es el claro de shadcn.
- [Dos sistemas de estilo a medias] → `page.module.css` se borra en la misma entrega, cuando ninguna pantalla lo importe.

## Plan de migración

1. Configurar Tailwind y shadcn sin quitar todavía `page.module.css`.
2. Pasar el shell y cada pantalla al nuevo stack, de a una, dejando verdes las pruebas e2e de esa pantalla.
3. Borrar `page.module.css` y el CSS de `globals.css` que ya no se usa.
4. Rollback: revertir el cambio. No hay datos ni esquema que migrar.
