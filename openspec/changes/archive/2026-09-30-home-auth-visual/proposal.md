# Proposal

## Resumen

El inicio de `gomep-vacantes` es un formulario estrecho y centrado. Pasa a una pantalla partida: acceso a la izquierda y un panel de marca a la derecha, con el texto de ese panel centrado y en una serif. El registro, la contraseña y el magic link se quedan como están.

## Why

La pantalla de acceso es la primera que ve un docente y hoy no tiene presencia. La paleta ya está definida en el cambio `paleta-app`; falta componer el home con esos tokens y con los bloques de shadcn.

## Objetivos

- Mostrar registro e inicio en dos columnas en pantallas grandes, y solo el formulario en pantallas chicas.
- Centrar el título y las tres líneas del panel de marca, en una serif distinta de la sans del formulario.
- Conservar los flujos, los textos de los botones de envío, los `name` de los inputs y los `data-testid` de los formularios.

## Alcance

Solo `apps/gomep-vacantes`: la página `/`, los componentes de UI que esa página necesite y el ajuste del helper de login en `e2e/app.spec.ts`. Los colores salen de los tokens de `paleta-app`; este cambio no elige otros valores.

## Fuera de alcance

- Rehacer vacantes, suscripciones, admin, verificar o el shell.
- Toggle de tema oscuro.
- Inicio de sesión con Google u otro proveedor.
- Cambiar Firebase Auth, los campos del registro o las redirecciones tras entrar.

## What Changes

- Sustituir el formulario centrado de `/` por el layout de dos columnas del bloque `login-02`, sin botones de redes sociales.
- Cambiar el cambio de modo de dos botones a pestañas «Registrarse» y «Entrar». «Entrar» deja de ser un `button` y pasa a ser una pestaña.
- Componer los campos con `Field`, los avisos con `Alert` y la sesión ya abierta con `Card`.
- Centrar el copy del panel azul y pintarlo con una serif de display. El formulario sigue en Geist.
- Actualizar el login de Playwright para pulsar la pestaña «Entrar».

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna. Este cambio declara `skip_specs: true`. Los requisitos de `account-auth` (registro con correo, contraseña, teléfono y nombre; verificación por enlace; magic link o contraseña; sin Google) no cambian. Tampoco cambian `account-roles`, `vacancy-directory`, `subscriptions`, `vacancy-alerts` ni `vacancy-catalogs`.

## Impact

- `apps/gomep-vacantes/src/app/page.tsx` y `src/app/layout.tsx` (la serif del panel).
- Componentes nuevos en `src/components/ui`: `field`, `tabs` y `alert`. `button`, `input`, `label` y `card` ya están.
- `apps/gomep-vacantes/e2e/app.spec.ts`, en el helper que hoy busca el botón «Entrar».
- Depende de que `globals.css` tenga los tokens de `openspec/changes/paleta-app`. Si aún no están aplicados, se aplican al empezar este cambio, sin redefinirlos.
