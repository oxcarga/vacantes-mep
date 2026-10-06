# Diseño

## Contexto

`/suscripciones` es un componente cliente. Con `onSnapshot` lee `regionales`, `especialidades` y las `suscripciones` del docente, y crea o quita mediante `createSubscription` y `removeSubscription`. Hoy pinta dos `<select>` de altura `h-8`, un botón "Agregar" y dos listas de texto: el value de la regional, la especialidad, `expiresAt` cortado a diez caracteres y el `endReason` crudo. `AppShell` ya acepta `description` y no hay que tocarlo.

Restricciones que salen del código y las pruebas:

- `src/lib/palette.test.ts` fija los tokens `color-*`. No se agrega ni se cambia un token.
- La e2e `6.2` usa `selectOption` sobre `subscribe-regional` y `subscribe-especialidad`, pulsa el botón "Agregar", cuenta `[data-testid^='sub-active-']`, pulsa "Quitar" y exige que `[data-testid^='sub-inactive-']` deje de estar vacío.
- `7.3` exige que un admin no vea `subscribe-form` en `/suscripciones`.
- El semillero e2e deja una inactiva de Español en la regional `57` (`endReason: expired`, `expiresAt: 2026-01-31T00:00:00.000Z`). La etiqueta de `57` es "Regional Educación Perez Zeledon".
- `createSubscription` rechaza un par que ya está activo con "Ya tiene una suscripción activa para ese par". Volver a agregar un par inactivo crea un documento nuevo y deja el anterior.

Ver la sección "Por qué" de `proposal.md` para la motivación.

## Objetivos / No objetivos

**Objetivos:**

- Reusar en esta página las clases ya usadas en `/vacantes` (panel, select, ficha, estado vacío, esqueleto, error), copiadas en el archivo, sin un componente compartido.
- Mostrar etiqueta de catálogo, fecha de calendario y motivo en español, y ofrecer "Agregar de nuevo" solo cuando el par no está activo.

**No objetivos:**

- Extraer `EstadoVacio`, el select o la ficha a `components/`. `/vacantes` se queda como está.
- Insignia de días restantes, chips de filtro y vaciar los selects después de agregar.

## Decisiones

### 1. Misma gramática visual, clases copiadas

El panel de alta usa `rounded-xl border bg-muted/50 p-4`. Los selects usan las mismas clases que en `/vacantes`: `appearance-none`, `h-10`, `rounded-lg`, `bg-background`, `ChevronDown` con `pointer-events-none`, `MapPin` en Regional y `GraduationCap` en Especialidad. El error usa `rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive` y conserva `subscribe-error`.

Las fichas van en `grid gap-4 sm:grid-cols-2` dentro de `subs-active` y `subs-history`, que siguen siendo `<ul>`. Cada activa es un `Card` con `border-l-4 border-l-transparent` y `hover:border-l-primary hover:shadow-md`. El historial usa el mismo `Card` sin ese hover: ya no es una suscripción en curso. Los estados vacíos copian el bloque centrado con borde discontinuo y el icono en un círculo `bg-primary/10`.

*Alternativa:* extraer esos bloques a componentes compartidos. Se descarta porque obliga a tocar `/vacantes`, que este cambio no va a maquetar de nuevo.

### 2. Selects nativos y catálogos ordenados

Siguen siendo `<select>` con `subscribe-regional` y `subscribe-especialidad`. La primera opción es "Seleccione". El resto se ordena con `localeCompare(..., "es")` por `label` o por `name`, igual que `/vacantes`.

*Alternativa:* `Select` de Radix. Se descarta porque `selectOption` no funciona con él.

### 3. Ficha activa

- Título: especialidad.
- Cuerpo: `MapPin` más la etiqueta del catálogo (`labelByValue.get(regionalValue) ?? regionalValue`).
- Pie: `CalendarDays` y "Vence el {fecha}", más "Quitar" en `variant="outline"` con `remove-sub-<id>`. El nombre accesible sigue siendo "Quitar".
- La fecha sale de `Intl.DateTimeFormat("es-CR", { timeZone: "America/Costa_Rica", day: "numeric", month: "short", year: "numeric" })`, el mismo formato que "Vista el …" en vacantes. `2026-01-31T00:00:00.000Z` se lee "30 ene 2026".

### 4. Ficha de historial y "Agregar de nuevo"

La ficha muestra especialidad, la misma etiqueta de regional y la frase de motivo: `removed` → "La quitaste", `expired` → "Venció", cualquier otro valor o ausencia → sin frase. El `data-testid` sigue siendo `sub-inactive-<id>`.

"Agregar de nuevo" es un botón sólido, el análogo de "Aplicar", con `data-testid="resubscribe-<id>"`. Al pulsarlo se llama `createSubscription` con el `regionalValue` y la especialidad de esa fila, no con el estado del formulario. Mientras esa petición está en curso, ese botón queda `disabled`.

El botón se renderiza solo si ninguna fila con `status === "active"` tiene el mismo `regionalValue` y la misma especialidad. Varias inactivas del mismo par lo muestran todas hasta que exista una activa.

*Alternativa:* precargar los selects y dejar que el docente pulse "Agregar". Se descarta porque el acuerdo es un clic en la ficha, independiente de lo que el formulario tenga elegido.

### 5. Orden de las fichas

Activas: `createdAt` descendente y, a igualdad, `id` descendente. Historial: `endedAt` descendente y, a igualdad, `id` descendente. Una fecha ausente o inválida va al final.

### 6. Carga

Dos banderas, `subsListas` y `regionalesListas`, se marcan en el primer snapshot o en el error de cada lectura. Con `cargando = !subsListas || !regionalesListas` se muestran dos fichas esqueleto en `subs-loading` (`aria-busy="true"`, `animate-pulse`, bloques `bg-muted`), fuera de `subs-active` y de `subs-history`. Las especialidades no bloquean: la ficha no depende de ese catálogo. El formulario puede pintarse durante la carga; los mensajes vacíos y el conteo, no.

El conteo es `<p aria-live="polite"><span data-testid="subs-count">{n}</span> {n === 1 ? "activa" : "activas"}</p>`.

Los vacíos usan `subs-empty-active` ("No tienes suscripciones activas.") y `subs-empty-history` ("Todavía no hay historial."), cada uno dentro del bloque de estado vacío.

El subtítulo pasado a `AppShell` es "Avisos durante 30 días por un par de regional y especialidad."

Después de un alta exitosa desde el formulario, los selects se quedan como están.

## Riesgos / Compromisos

- [La prueba de carga tiene que retrasar Firestore] → El mismo `page.route` sobre el canal `Listen` que ya usa `/vacantes`. Se comprueba `subs-loading` y la ausencia de `subs-empty-active`, y al soltar las peticiones aparece la ficha o el vacío que corresponda.
- [El semillero ya deja una inactiva de Español / `57`] → Al abrir la página, esa ficha dice "Venció" y ofrece "Agregar de nuevo". `6.2` sigue encontrando un solo "Quitar" porque el historial no usa ese nombre. Al crear la activa de ese par, el botón del historial desaparece; al quitarla, vuelve.
- [Dos clics casi juntos en dos fichas del mismo par] → El segundo puede recibir "Ya tiene una suscripción activa para ese par" si el primero ya escribió. Se muestra en `subscribe-error`. No se cambia el servicio.
- [Parpadeo del esqueleto en cargas rápidas] → Se acepta, igual que en el directorio.

## Plan de migración

No hay datos ni reglas que migrar. Revertir el cambio es revertir el commit.
