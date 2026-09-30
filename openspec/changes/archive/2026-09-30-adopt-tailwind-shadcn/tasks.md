# Tasks

## 1. Toolchain

- [x] 1.1 Instala Tailwind CSS v4 y `@tailwindcss/postcss` en el workspace `gomep-vacantes`, apunta la fuente sans a la variable Geist de `layout.tsx` y sustituye el reset de `globals.css` por `@import "tailwindcss"` y los tokens claros de shadcn, sin el media query oscuro del starter. Verifica que `npm run build -w gomep-vacantes` termina sin error.
- [x] 1.2 Inicializa shadcn en `apps/gomep-vacantes` con primitivos Radix, `components.json` (RSC, TypeScript, CSS en `src/app/globals.css`, alias `@/components` y `@/lib/utils`), el helper `cn` en `src/lib/utils.ts`, y añade solo `button`, `input`, `label` y `card`, más `lucide-react`. Verifica que esos archivos existen y que `npm run build -w gomep-vacantes` termina sin error.

## 2. Shell

- [x] 2.1 Migra `app-shell` a clases Tailwind y al `Button` de shadcn. Deja el texto "Cerrar sesión" y los `data-testid` `app-nav`, `session-email`, `session-role`, `nav-suscripciones` y `nav-admin`. Añade iconos de lucide-react con `aria-hidden` junto a ese texto. Verifica con Playwright los casos `5.2` y `6.1` de `e2e/app.spec.ts` (emuladores, `npm run test:e2e`).

## 3. Cuenta

- [x] 3.1 Migra la pantalla de inicio (registro, contraseña y magic link) a `Button`, `Input` y `Label`. Conserva los nombres "Entrar", "Crear cuenta" y "Entrar con contraseña", y los `data-testid` `register-form`, `login-form`, `auth-error` y `unverified-message`. Verifica con Playwright el caso `5.1`.
- [x] 3.2 Migra `/verificar` y `/auth/complete` al mismo stack. Conserva `unverified-message` y `link-error`. Verifica con Playwright el caso `5.2`.

## 4. Directorio

- [x] 4.1 Migra la lista de `/vacantes` a Tailwind y `Card` dentro de cada `li`. El contenedor sigue siendo `ul` con `data-testid="vacantes-list"` y cada ficha sigue siendo un `li` con su `data-testid`. Conserva el enlace "Aplicar". Verifica con Playwright los casos `6.1`, `6.3` y `6.4`.
- [x] 4.2 Estiliza con Tailwind los `<select>` nativos de regional y especialidad. No uses el Select de Radix. Conserva `vacantes-regional`, `vacantes-especialidad`, `vacantes-count`, `vacantes-empty` y `vacantes-empty-filter`. Verifica con Playwright los casos `6.5` y `6.6`.

## 5. Suscripciones

- [x] 5.1 Migra `/suscripciones` a `Button`, `Input` o `Label` donde haya campos, y deja los `<select>` nativos con `subscribe-regional` y `subscribe-especialidad`. Conserva el formulario `subscribe-form`, los botones "Agregar" y "Quitar", y los prefijos `sub-active-` y `sub-inactive-`. Verifica con Playwright el caso `6.2`.

## 6. Admin

- [x] 6.1 Migra `/admin` a Tailwind y a los componentes de `components/ui`. Conserva `admin-error`, `admin-vacante-1002` y los prefijos `admin-sub-`, `user-`, `promote-` y `demote-`. Verifica con Playwright los casos `7.1`, `7.2` y `7.3`.

## 7. Cierre

- [x] 7.1 Borra `src/app/page.module.css` cuando ninguna pantalla lo importe y quita de `globals.css` el CSS del starter que el tema de shadcn ya reemplaza. Verifica con una búsqueda que no queden imports de `page.module.css` y con la suite Playwright completa (`npm run test:e2e`).
