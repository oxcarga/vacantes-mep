# Diseño

## Contexto

`/vacantes` es un componente cliente que escucha con `onSnapshot` tres colecciones (`vacantes` abiertas, `regionales`, `especialidades`) y filtra en memoria. Hoy pinta `Card` de shadcn apiladas, dos `<select>` nativos y el conteo como número suelto. `AppShell` renderiza el título de cada página, el correo, el rol, "Cerrar sesión" y una navegación sin estado activo. Lo usan cinco rutas.

Restricciones que salen del código y las pruebas:

- `src/lib/palette.test.ts` fija los valores y la lista exacta de tokens `color-*`. No se puede agregar ni cambiar un token.
- Las e2e usan `selectOption` sobre `vacantes-regional` y `vacantes-especialidad`, y eso exige `<select>` nativos.
- `vacantes-count`, `vacantes-empty` y `vacantes-empty-filter` se comparan con `toHaveText` exacto, así que deben contener solo el número o el mensaje.
- Una prueba cuenta `[data-testid^='vacante-']`. Ningún `data-testid` nuevo puede empezar con `vacante-`.
- El helper `login` usa `isVisible()` sobre el botón "Cerrar sesión", y `session-role` se compara con `toHaveText("docente")`.
- La prueba `6.4` lee los `li` de `vacantes-list` para comprobar el orden.

Ver la sección "Por qué" de `proposal.md` para la motivación.

## Objetivos / No objetivos

**Objetivos:**
- Un lenguaje visual reutilizable (panel, chip, ficha, estado vacío) hecho solo con utilidades de Tailwind sobre los tokens existentes.
- Que `AppShell` mejore todas las rutas sin cambiar la API que usan hoy.

**No objetivos:**
- Extraer componentes genéricos nuevos a `components/ui` (badge, skeleton). Se escriben en línea mientras solo los use `/vacantes`.
- Animaciones más allá de transiciones de sombra y borde, y del `animate-pulse` del esqueleto.

## Decisiones

### 1. Color solo con tokens existentes y opacidad

Los tonos suaves salen de modificadores de opacidad: `bg-primary/10 text-primary` para chips de filtro e ícono de estado vacío, `bg-muted/50` para el panel de filtros, `bg-secondary text-secondary-foreground` para los chips de puesto y lecciones. La insignia "Nueva" usa `bg-primary text-primary-foreground`, el único elemento sólido de la ficha además de Aplicar.

*Alternativa:* agregar un token `--success` o `--new`. Se descarta porque rompe `palette.test.ts`, y porque la paleta del proyecto es deliberadamente de un solo matiz.

### 2. `<select>` nativos con estilo

Llevan `appearance-none`, altura `h-10`, `rounded-lg`, `bg-background`, padding a la derecha para un ícono `ChevronDown` superpuesto con `pointer-events-none`, y el ícono de la etiqueta (`MapPin`, `GraduationCap`) a la izquierda del texto del `Label`.

*Alternativa:* `Select` de Radix o shadcn. Se descarta porque `selectOption` no funciona con él, en móvil es peor que el selector del sistema y agrega JavaScript.

### 3. `AppShell`: header fijo, navegación activa y sesión compacta

```
+----------------------------------------------------------------+
| [G] gomep vacantes            ana@mep.cr  [Docente]  [Salir]   |  sticky, bg-background/80, backdrop-blur, border-b
|  Vacantes   Suscripciones                                      |  enlace activo: text-primary + barra inferior 2px
+----------------------------------------------------------------+
|  Título                                                         |
|  Descripción opcional (text-muted-foreground)                   |
|  ...children                                                    |
```

- La firma pasa a `{ title, description?, children }`. `description` es opcional, así que las otras cuatro rutas no cambian.
- La marca es un cuadro `size-8 rounded-lg bg-primary text-primary-foreground` con la "G", más el texto "gomep vacantes".
- La navegación usa `usePathname`. El enlace activo lleva `aria-current="page"` y las clases `text-primary` con un `after:` de 2px en `bg-primary`. Los demás van en `text-muted-foreground hover:text-foreground`. Se conservan `app-nav`, `nav-suscripciones` y `nav-admin`.
- La sesión:
  - `session-email` va con `truncate` y se oculta por debajo de `sm`.
  - `session-role` se muestra como insignia `bg-secondary` y su texto sigue siendo el rol en minúscula; la mayúscula inicial es solo CSS (`capitalize`).
  - "Cerrar sesión" siempre es visible: en móvil queda solo el ícono, con el texto en `sr-only`, así que el nombre accesible no cambia.

*Alternativa:* menú desplegable con correo, rol y cerrar sesión. Se descarta porque oculta "Cerrar sesión", rompe el helper `login` y requiere un componente nuevo.

### 4. "Nueva" como función pura en `src/lib/vacante-nueva.ts`

`esVacanteNueva(firstSeen: string | undefined, ahora: Date): boolean` funciona así:

1. Convierte las dos fechas a una clave `YYYY-MM-DD` con `Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica" })`.
2. Calcula la clave de ayer restando un día a la clave de hoy con aritmética UTC sobre la fecha, no restando 24 horas al instante.
3. Devuelve `claveFirstSeen >= claveAyer`. Las claves ISO se comparan como texto, y la comparación cubre también el futuro.
4. Si la entrada falta o es inválida, devuelve `false`.

La página toma `ahora` una sola vez con `useState(() => new Date())`, porque la spec pide la fecha del dispositivo al mostrar el directorio.

*Alternativas:* calcular "hoy" en el servidor, o recalcularlo con un temporizador. Se descartan: la página ya es cliente, y una pestaña abierta varios días es un caso marginal.

### 5. Carga hasta tener vacantes y regionales

Dos banderas, `vacantesListas` y `regionalesListas`, se marcan en el primer snapshot o en el callback de error de cada lectura. El catálogo de regionales gana un manejador de error que alimenta el mismo `error`.

- Con `cargando = !vacantesListas || !regionalesListas`, se muestran 4 fichas esqueleto (`animate-pulse`, bloques `bg-muted`) en un contenedor `data-testid="vacantes-loading"` con `aria-busy="true"`. Ese contenedor queda fuera de `vacantes-list`.
- Mientras carga, no se renderizan `vacantes-list`, `vacantes-empty` ni `vacantes-empty-filter`.
- Esperar a las regionales evita mostrar por un instante la etiqueta vieja de la regional, que la spec prohíbe en la ficha.
- Las especialidades no bloquean la carga, porque la ficha no depende de ese catálogo.

### 6. Filtros activos y "Limpiar filtros"

Bajo los selects, si hay al menos un filtro activo, aparece una fila con:

- Un chip por filtro: `data-testid="vacantes-filtro-regional"` y `vacantes-filtro-especialidad`, con la clase `bg-primary/10 text-primary rounded-full`.
- Dentro de cada chip, un `<button>` con ícono `X` y `aria-label="Quitar filtro: <etiqueta>"`.
- Un botón `variant="ghost"` "Limpiar filtros" (`vacantes-limpiar`).

El estado sin coincidencias agrega como hermano de `vacantes-empty-filter` un botón "Limpiar filtros" (`vacantes-empty-filter-limpiar`).

### 7. Conteo, ficha y estados vacíos

- **Conteo:** `<p aria-live="polite"><span data-testid="vacantes-count">{n}</span> {n === 1 ? "vacante" : "vacantes"}</p>`.
- **Lista:** `vacantes-list` sigue siendo `<ul>` con un `<li data-testid="vacante-<id>">` por ficha, en `grid gap-4 sm:grid-cols-2`.
- **Ficha:**
  - El `Card` lleva `border-l-4 border-l-transparent` siempre y `hover:border-l-primary hover:shadow-md transition`. El borde fijo transparente evita saltos de layout al pasar el cursor.
  - En la cabecera van la especialidad (`CardTitle`), la insignia "Nueva" si aplica y `#<id>` en `font-mono text-muted-foreground`.
  - En el cuerpo, la institución con `Building2` y la regional con `MapPin`, más los chips de clase de puesto y lecciones (`<n> lecciones`). Cada uno se omite si falta.
  - El pie (`CardFooter`) lleva la fecha con `CalendarDays` ("Vista el …") y Aplicar con `ExternalLink` (`aria-hidden`). El nombre accesible sigue siendo "Aplicar" y el botón ocupa todo el ancho en móvil.
- **Estados vacíos:** son un bloque centrado con un ícono en un círculo `bg-primary/10`.
  - Sin vacantes, el texto de `vacantes-empty` no cambia y se agrega un enlace hermano a `/suscripciones` con la frase "Le avisamos cuando salga una".
  - Sin coincidencias, el texto de `vacantes-empty-filter` tampoco cambia, y se agrega el botón descrito en la decisión 6.

## Riesgos / Compromisos

- [Probar la carga exige retrasar Firestore] → En e2e, `page.route` retiene las peticiones del canal `Listen` al emulador hasta comprobar `vacantes-loading`, y después las libera. Si la interceptación del canal resulta inestable, se retiene la respuesta de la ruta `/vacantes` del primer `goto`, o se cubre el estado con la prueba de que `vacantes-empty` nunca aparece antes que las fichas.
- [La prueba de "Nueva" depende del reloj real] → Los bordes de medianoche y el futuro se prueban en la unidad con un `ahora` fijo. La e2e solo mueve temporalmente el `firstSeen` de `1001` a la hora real y lo restaura en `finally`, el mismo patrón que la `6.6`.
- [El nuevo shell cambia `/admin` y `/suscripciones`] → Las pruebas 6.2, 7.x y 5.x deben pasar sin cambios. Cualquier ajuste a ellas es señal de una regresión.
- [Parpadeo del esqueleto en cargas rápidas] → Se acepta. No se agrega un retraso mínimo artificial.
- [`capitalize` en el rol] → `toHaveText` lee `textContent`, que no cambia con CSS, así que `session-role` sigue siendo `docente`.

## Plan de migración

No hay datos ni reglas que migrar. El despliegue es el de siempre y la reversión consiste en revertir el commit.
