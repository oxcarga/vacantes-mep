# Tasks

## 1. Tokens de claro

- [x] 1.1 Escribe en `:root` de `apps/gomep-vacantes/src/app/globals.css` los valores OKLCH de matiz 255 para `--primary`, `--primary-foreground`, `--ring`, `--sidebar-primary`, `--sidebar-primary-foreground` y `--chart-1` a `--chart-5`, y conserva neutros, `--destructive`, `--radius` y el mapeo de `@theme inline`. Añade un test de node que lee ese archivo y comprueba esos valores y que `--background` sigue en `oklch(1 0 0)`. Verifica que `npm test -w gomep-vacantes` pasa.

## 2. Tokens de oscuro

- [x] 2.1 Escribe en `.dark` del mismo archivo `--primary` en `oklch(0.75 0.12 255)`, `--primary-foreground` en `oklch(0.22 0.04 255)`, y `--ring`, `--sidebar-primary`, `--sidebar-primary-foreground` y `--chart-1` a `--chart-5` según el diseño, y deja el destructivo y los neutros de oscuro como están. Extiende el test de node para ese bloque y para que el archivo no contenga el matiz `264.376`. Verifica que `npm test -w gomep-vacantes` pasa.

## 3. Herencia en el home

- [x] 3.1 Añade una prueba Playwright que abre `/` en escritorio, espera a que desaparezca «Cargando…», y comprueba que el botón «Crear cuenta» y el panel de marca usan `--primary` y `--primary-foreground`, que el texto del campo Nombre sigue en `--foreground` neutro, y que al enfocar ese campo el borde usa `--ring`. Comprueba también que, al añadir la clase `dark` solo dentro de la prueba, los tokens de oscuro coinciden con el diseño, y la quita al terminar. Verifica que la prueba `e2e/palette.spec.ts` pasa.
