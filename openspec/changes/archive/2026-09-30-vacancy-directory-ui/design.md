# Diseño

## Contexto

Ver `proposal.md` para el motivo. `/vacantes` ya suscribe `vacantes` con `where("active", "==", true)` y pinta una línea por documento. El admin no usa esa ruta: la página lo redirige a `/admin`. Un docente verificado ya puede leer `regionales` y `especialidades`; la pantalla de suscripciones lo hace con `onSnapshot`. Cada vacante guarda `regional` (etiqueta), `regionalValue`, `especialidad`, `firstSeen` y `fields` (`Institución`, `Clase de Puesto`, `Lecciones`, `Aplicar`).

## Objetivos / Fuera de alcance

**Objetivos:**

- Ordenar y filtrar en el cliente, sobre la suscripción de vacantes abiertas que ya existe.
- Resolver la etiqueta de regional desde el catálogo por `regionalValue`.
- Dejar estables los test ids `vacante-1001` y `vacante-1002` y el comportamiento de la prueba `6.1`.

**Fuera de alcance:**

- Cambiar la consulta Firestore, las reglas, el esquema o el listado de `/admin`.
- Un componente de diseño o una librería de UI.

## Decisiones

### 1. Tres suscripciones y el recorte en memoria

La página mantiene la consulta de vacantes abiertas y añade las mismas lecturas de `regionales` y `especialidades` que ya usa `/suscripciones`. El estado de los dos `<select>` vive en el componente. La lista visible es esa colección abierta, filtrada y ordenada en el render.

Alternativa: `where` compuesto por `regionalValue` y `especialidad`. Exige índice, no puede listar una regional del catálogo que tenga cero abiertas sin una segunda lectura, y deja de ser "todas, las más recientes primero" al cambiar el filtro. Con decenas de vacantes, el cliente basta.

### 2. La regional se compara por value; la especialidad, por texto exacto

El filtro de regional guarda el id del documento de `regionales` (`regionalValue`) y muestra `label`. La ficha usa esa etiqueta actual. Si el value no está en el catálogo, la ficha usa el `regional` guardado en la vacante. El filtro de especialidad guarda `name` y compara con `vacante.especialidad` sin normalizar.

Alternativa: filtrar por la etiqueta `regional`. Un scrape que renombre la etiqueta partiría la lista entre fichas viejas y nuevas del mismo value.

### 3. Orden por `firstSeen` descendente, y el id como desempate

`Date.parse(firstSeen)` descendente. Si empatan, el id de documento descendente, para que la prueba vea un orden fijo. El conteo es el largo de la lista visible.

La fecha de la ficha es solo día, mes y año con `Intl.DateTimeFormat("es-CR", { timeZone: "America/Costa_Rica", day: "numeric", month: "short", year: "numeric" })`.

### 4. La ficha y los vacíos viven en la misma página

Se sigue usando `AppShell` y `page.module.css`. Cada ficha es un `li` con `data-testid={`vacante-${id}`}` dentro de `vacantes-list`. Los controles son `vacantes-regional`, `vacantes-especialidad` y `vacantes-count`.

Textos:

- Sin abiertas, haya o no filtros: `No hay vacantes abiertas.`
- Hay abiertas y el recorte está vacío, solo regional: `No hay vacantes abiertas en {etiqueta}.`
- Solo especialidad: `No hay vacantes abiertas de {nombre}.`
- Ambas: `No hay vacantes abiertas de {nombre} en {etiqueta}.`

Esos tres últimos van en un nodo distinto (`vacantes-empty-filter`) del primero (`vacantes-empty`). Los `<option>` de "todas" usan valor vacío y el texto `Todas las regionales` / `Todas las especialidades`. Aplicar es un enlace con el texto `Aplicar` solo si `fields.Aplicar` trae URL.

### 5. Las pruebas añaden vacantes sin tocar 1001 ni 1002

`6.1` depende de que `1001` esté abierta y `1002` cerrada, las dos de Pérez Zeledón y Español. Las pruebas nuevas siembran otra regional de catálogo sin vacantes, otra especialidad, y una vacante abierta más antigua en otra regional, para orden y filtros. No cambian `1001` ni `1002`.

## Riesgos / Trade-offs

- [Una especialidad abierta que aún no está en el catálogo no sale en el desplegable] → Sigue visible con el filtro en todas. El catálogo se llena en el mismo commit que la vacante; el hueco es transitorio.
- [El filtro en cliente no escala si el directorio pasa de decenas a miles] → Se acepta. Cambiar a consulta por filtro sería otro cambio.
- [La etiqueta del catálogo y `vacante.regional` pueden diferir tras un rename] → La ficha muestra la etiqueta del catálogo cuando el value existe.

## Migración

No hay datos que migrar. Revertir `page.tsx`, los estilos y la prueba nueva devuelve el listado en una línea. Las vacantes de prueba extra no afectan producción.
