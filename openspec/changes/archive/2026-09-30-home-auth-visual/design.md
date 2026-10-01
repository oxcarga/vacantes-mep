# Design

## Context

Ver `proposal.md` para el motivo. `src/app/page.tsx` es un cliente con registro, contraseña y magic link, en una columna `max-w-lg`. El modo se cambia con dos `Button`. Los tests de `e2e/app.spec.ts` buscan «Entrar» como `button`, rellenan `input[name=name|phone|email|password]` y assertan «Cargando…», `register-form`, `login-form`, `auth-error`, `auth-info` y `unverified-message`. Playwright usa Desktop Chrome, así que el viewport ya entra en el breakpoint `lg`. Instalados: `button`, `input`, `label`, `card`. `layout.tsx` carga Geist y Geist Mono. Los colores de marca están especificados en `openspec/changes/paleta-app/design.md` y todavía no están aplicados en `globals.css`.

## Goals / Non-Goals

**Goals:**

- Una sola página `/` que conserve los tres estados (cargando, sin configurar, sesión) y los dos modos (registro, entrar).
- El panel de marca centrado en los dos ejes, visible desde `lg`.
- La serif limitada a ese panel.

**Non-Goals:**

- Elegir valores de color distintos a los de `paleta-app`.
- Mostrar el panel en viewports menores que `lg`.

## Decisions

### 1. Layout del bloque login-02, sin redes sociales

La página es `grid min-h-svh lg:grid-cols-2`. La columna izquierda lleva la marca pequeña, las pestañas y el formulario (`max-w-sm`). La derecha es `hidden` hasta `lg` y ahí `flex items-center justify-center text-center` con `bg-primary text-primary-foreground`. El copy del panel es el título «Vacantes del MEP» y tres líneas: plazas abiertas, alertas por regional y especialidad, acceso con correo verificado.

`login-04` (tarjeta con imagen) se descarta: el registro tiene cuatro campos y una foto de stock no dice nada del producto. Los botones de GitHub, Google y similares del bloque oficial no se copian: `account-auth` no admite otro proveedor.

El `h1` «Vacantes del MEP» está en el panel en `lg` y, por debajo de ese breakpoint, encima del formulario. El que no toca se oculta con `hidden`, así que el árbol de accesibilidad ve un solo título.

### 2. Pestañas y campos de shadcn

El modo usa `Tabs` (`Registrarse` | `Entrar`). El valor inicial es `register`, como hoy. Los campos van en `FieldGroup` + `Field` + `FieldLabel` + `Input`, conservando los `name`. El magic link queda bajo un `FieldSeparator`, con el botón outline «Enviar magic link». Errores, el aviso del enlace y Firebase sin configurar usan `Alert`. La sesión abierta usa `Card`. Los `data-testid` actuales se quedan en el mismo nodo que hoy.

Hay que añadir `field`, `tabs` y `alert` con el CLI de shadcn, registro `@shadcn`, dentro de `apps/gomep-vacantes`. No se reescriben `button`, `input`, `label` ni `card`.

### 3. Serif solo en el panel

`layout.tsx` carga Source Serif 4 con `next/font/google` (subset `latin`) en una variable CSS, y el panel la aplica. El formulario sigue en Geist (`font-sans`).

Alternativa: Iowan Old Style o Palatino del sistema, que es lo que muestra el boceto. No están en Linux ni en el navegador de CI, así que el panel se vería en Times. Source Serif 4 se descarga en el build y se ve igual en todos lados. Fraunces queda descartada por más decorativa de lo que pide esta pantalla.

### 4. El helper de Playwright pasa de botón a pestaña

`getByRole("button", { name: "Entrar" })` pasa a `getByRole("tab", { name: "Entrar" })` en el helper `login`. Los botones «Crear cuenta», «Entrar con contraseña», «Enviar magic link» y «Cerrar sesión» no cambian de rol. El registro de las pruebas 5.1 y 5.2 no pulsa «Registrarse»: esa pestaña sigue siendo la inicial.

## Risks / Trade-offs

- [El panel no cabe en el viewport de un test estrecho] → El proyecto de Playwright ya es Desktop Chrome. La aserción del título corre ahí, donde `lg` muestra el panel.
- [Dos `h1` en el DOM] → Uno de los dos lleva `hidden` según el breakpoint, y `display: none` lo saca del árbol accesible.
- [`paleta-app` sigue sin aplicarse y el panel sale gris] → El primer paso copia los tokens de ese diseño a `globals.css` si `--primary` sigue neutro. Este cambio no inventa otros valores.
- [Source Serif 4 pide red en el build] → Es el mismo mecanismo que Geist, ya usado en `layout.tsx`.

## Migration Plan

1. Aplicar los tokens de `paleta-app` si faltan.
2. Añadir `field`, `tabs` y `alert`.
3. Reescribir `page.tsx` y cargar la serif en `layout.tsx`.
4. Ajustar el helper e2e y comprobar registro, login y el título del panel.
5. Rollback: revertir esos archivos. No hay datos ni esquema que migrar.
