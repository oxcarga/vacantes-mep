# Diseño

## Contexto

`/vacantes` filtra en memoria. `regionalValue` es un string y el control es un `<select>` nativo (`vacantes-regional`) que reemplaza la elección en cada cambio. `FiltroActivo` pinta una sola píldora `vacantes-filtro-regional` con `bg-primary/10 text-primary`, la misma clase que `vacantes-filtro-especialidad`. El catálogo de regionales ya llega ordenado por `label` con `localeCompare(..., "es")`.

Restricciones que salen del código y las pruebas:

- `src/lib/palette.test.ts` fija los tokens. `chart-5` ya existe (`oklch(0.32 0.08 255)` en claro). No se agrega ni se cambia un token.
- Las e2e `6.5`, `6.6`, `9.3`, `9.5` y `9.6` llaman `selectOption` sobre `vacantes-regional`. La `9.4` exige que `vacantes-regional` y `vacantes-especialidad` sean `SELECT`.
- `vacantes-empty-filter` se compara con `toHaveText` exacto.
- Una prueba cuenta `[data-testid^='vacante-']`. Ningún `data-testid` nuevo puede empezar con `vacante-`.

Ver la sección "Por qué" de `proposal.md`. El comportamiento exigido está en `specs/vacancy-directory/spec.md`.

## Objetivos / No objetivos

**Objetivos:**

- Un conjunto de `regionalValue` en el cliente, visible a la vez en el dropdown y en las píldoras.
- Dejar `vacantes-especialidad` como `<select>` nativo.

**No objetivos:**

- Un componente de select compartido con `/suscripciones`.
- Librería nueva de combobox.

## Decisiones

### 1. Estado: un conjunto, no un string

`regionalValue: string` pasa a `regionalValues: string[]`, sin duplicados. El filtro conserva la vacante si el conjunto está vacío o si `row.regionalValue` está en él, y después aplica la especialidad igual que hoy. "Limpiar filtros" vacía el arreglo y la especialidad. "Todas las regionales" vacía solo el arreglo.

Las píldoras y el mensaje vacío recorren `regionales` (ya ordenado) y se quedan con las elegidas, para que el orden sea el del catálogo y no el de los clics.

*Alternativa:* guardar un `Set` en el estado. Se descarta porque el estado de React queda más simple como arreglo, y el orden visible sale del catálogo.

### 2. Dropdown propio, no `<select multiple>`

El control cerrado sigue la caja actual (`h-10`, `rounded-lg`, `border-input`, `ChevronDown`, `MapPin`). Es un `button` con `data-testid="vacantes-regional"`, `aria-haspopup="listbox"` y `aria-expanded`. El texto del botón es "Todas las regionales", la etiqueta de la única elegida, o `${n} regionales`.

Al abrirse, un `role="listbox"` con `aria-multiselectable="true"` lista primero "Todas las regionales" (`vacantes-regional-todas`) y luego cada regional (`vacantes-regional-opcion-${id}`, `role="option"`, `aria-selected`). La marca visible es un icono `Check` de lucide. La lista va en un hermano del `Label`, absoluta, con `max-h` y scroll: el catálogo del MEP no cabe en una sola pantalla, y meter las opciones dentro del `Label` activaría el botón al pulsar una opción.

La lista permanece abierta al marcar o desmarcar una regional, para poder sumar varias. Se cierra al pulsar "Todas las regionales", al pulsar otra vez el botón, con Escape o al hacer clic fuera. "Todas las regionales" no queda `aria-selected` cuando hay alguna regional elegida.

*Alternativa:* `<select multiple>`. Se descarta porque deja de verse como dropdown y en escritorio exige Ctrl o Cmd. *Alternativa:* un `<select>` que suma y vuelve a vacío. Se descarta porque la elección no se ve marcada dentro del control. *Alternativa:* Select de Radix. Se descarta porque agrega dependencia y la especialidad debe seguir siendo nativa.

### 3. Píldoras con dos tonos

`FiltroActivo` recibe un tono. Regional: las clases de hoy, `bg-primary/10 text-primary`, y el hover del botón X en `bg-primary/15`. Especialidad: `bg-chart-5/10 text-chart-5` y hover `bg-chart-5/15`. `chart-5` ya está en el tema, así que Tailwind lo resuelve sin tocar `globals.css`.

Cada regional usa `data-testid={`vacantes-filtro-regional-${id}`}`. La de especialidad conserva `vacantes-filtro-especialidad`. Quitar una regional filtra ese id del arreglo; el botón cerrado y `aria-selected` salen de ese mismo arreglo.

*Alternativa:* gris `secondary` para la especialidad. Se descarta porque el docente pidió un color de la paleta, y `chart-5` es el paso cromático más lejos de `primary` sin usar `destructive`.

### 4. Mensaje vacío

Se conserva el texto de una sola regional:

- especialidad y una regional: `No hay vacantes abiertas de ${especialidad} en ${etiqueta}.`
- solo una regional: `No hay vacantes abiertas en ${etiqueta}.`
- solo especialidad: `No hay vacantes abiertas de ${especialidad}.`

Con varias etiquetas en orden de catálogo, dos se unen `en ${a} o en ${b}` y tres o más `en ${a}, en ${b} o en ${c}`. Ese fragmento reemplaza el `en ${etiqueta}` de las frases de arriba. Ejemplo del semillero, Santa Cruz (`62`) y "Regional sin vacantes" (`99`) con Español: `No hay vacantes abiertas de Español en Regional Educación Santa Cruz o en Regional sin vacantes.`

## Riesgos / Trade-offs

- [Las e2e dejan de poder usar `selectOption` en la regional] → Las pruebas de este cambio pulsan el botón y la opción. `vacantes-especialidad` sigue con `selectOption`.
- [`primary` y `chart-5` son el mismo matiz, 255] → Se distinguen por luminosidad. No se agrega otro matiz porque `palette.test.ts` lo fija.
- [La lista de regionales es larga] → `max-h` y scroll dentro del listbox. No se pagina ni se busca.
- [El clic fuera no cierra en algún navegador] → Escape y un segundo clic en el botón también cierran. La prueba cubre Escape.

## Plan de migración

No hay datos ni reglas que migrar: el conjunto vive en el estado del cliente y se pierde al recargar, igual que el string de hoy. Revertir el cambio de `/vacantes` y las e2e devuelve el select de una sola regional.
