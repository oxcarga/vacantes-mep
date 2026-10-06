# Diseño

## Contexto

En `/vacantes` el filtro de regional ya es un listbox propio: botón `vacantes-regional`, lista `vacantes-regional-lista`, opciones `vacantes-regional-opcion-{id}` y fila `vacantes-regional-todas`. El estado abierto, el clic afuera y Escape viven en la página. La especialidad es un `<select>` `vacantes-especialidad` cuyo valor es el texto exacto (`row.name`), no el id del documento. Los catálogos llegan ordenados con `localeCompare(..., "es")`. Las píldoras y el recorte de la lista se quedan en la página.

No hay Combobox ni `cmdk`. El paquete `radix-ui` ya está; no hace falta otra dependencia. Un conteo de fichas usa `[data-testid^='vacante-']`: un id nuevo puede empezar por `vacantes-`, y no por `vacante-`.

Ver `proposal.md`. El comportamiento está en `specs/dropdown-searchable/spec.md` y `specs/vacancy-directory/spec.md`.

## Objetivos / No objetivos

**Objetivos:**

- Un solo control controlado, con la misma caja cerrada que el select actual.
- Sacar de la página el panel, la búsqueda, el teclado y el tope.
- Dejar en la página las píldoras, el recorte de vacantes y el orden de los catálogos.

**No objetivos:**

- Sustituir los `<select>` de `/suscripciones` y `/admin`.
- Ordenar opciones dentro del control.

## Decisiones

### 1. API controlada

El componente vive en `apps/gomep-vacantes/src/components/dropdown-searchable.tsx`.

```tsx
type DropdownOption = { value: string; label: string };

type DropdownSearchableProps = {
  options: DropdownOption[];
  value: string[];
  onChange: (value: string[]) => void;
  nombre?: string;
  multiple?: boolean;
  max?: number;
  idPrefix: string;
};
```

`multiple` por defecto es `false`. `max` solo se lee si `multiple` es verdadero; si no llega, es 5. En selección única se ignora. El resumen cerrado usa `nombre` o `"[...]"`. Con un valor, muestra la etiqueta de esa opción; si el valor no está en `options`, muestra el propio valor. Con varios, muestra `${value.length} ${nombre}`.

La página no ordena `value`. Las píldoras siguen recorriendo el catálogo.

*Alternativa:* un `<select>` nativo con `datalist`. Se descarta porque no cubre varias regionales, las marcas ni la fila fija de todas.

### 2. El foco se queda en el campo

El botón conserva `aria-haspopup="listbox"` y `aria-expanded`. Al abrir, el input recibe el foco y el placeholder es "Buscar". Las filas no entran en el tabulador (`tabIndex={-1}`), así Tab cierra el panel al salir del campo y cae en el control siguiente. Flechas y Enter mueven un resalte (`aria-activedescendant`) sin sacar el foco del campo, para que la barra espaciadora escriba. La fila resaltada lleva anillo de foco y, si hace falta, `scrollIntoView`. Escape devuelve el foco al botón. Cerrado, la lista no está en el DOM, para que `toHaveCount(0)` siga valiendo.

La comparación dobla a NFD, quita marcas combinantes y pasa a minúsculas. Así "jose" encuentra "San José" y "nino" encuentra "Niño". El orden de `options` no se toca.

*Alternativa:* `cmdk`. Se descarta: el listbox actual ya existe y la propuesta no agrega dependencias.

### 3. Ids que ya usan las pruebas

`idPrefix` arma los ids: `{prefix}`, `{prefix}-lista`, `{prefix}-opcion-{value}`, `{prefix}-todas`, `{prefix}-buscar` y `{prefix}-maximo`. Regional usa `vacantes-regional`. Especialidad usa `vacantes-especialidad`, así el botón conserva el id y pasa de `SELECT` a `BUTTON`.

En la página:

- Regional: `multiple`, `max={5}`, `nombre="regionales"`, `value` es el id de catálogo.
- Especialidad: sin `multiple`, `nombre="especialidades"`, `value` es `[texto]` o `[]`, y `onChange` guarda `next[0] ?? ""`.

Las etiquetas con icono se quedan fuera del componente. Si `value` trae más entradas que `max`, se muestran todas y no se agregan más hasta bajar del tope: el control no borra selección que no hizo el usuario.

### 4. Pruebas que dejan de usar `selectOption`

`elegirRegional` y `todasLasRegionales` siguen sirviendo: en múltiple el panel no se cierra al marcar. Hace falta `elegirEspecialidad` y `todasLasEspecialidades`, que abren el botón, y en el caso de elegir escriben en `{prefix}-buscar` antes de pulsar la opción. `9.4` y el final de `9.13` pasan a esperar `BUTTON` en los dos. `9.13` deja de usar `toHaveValue` y `selectOption` sobre la especialidad; el botón cerrado muestra el texto. `10.1` no cambia: sus `<select>` son los de suscripciones.

## Riesgos / Trade-offs

- [Las e2e de especialidad llaman `selectOption`] → Un helper nuevo y el ajuste de `9.4` y `9.13` en la misma tarea que cablea el filtro.
- [Tab podría caer en una fila] → Las filas no son tabulables; el único tabulado del panel es el campo.
- ["ñ" se pliega a "n"] → Es la regla de la spec. Una búsqueda de "n" también muestra etiquetas con "ñ".

## Migración

No hay datos que migrar. El tope de cinco solo vive en el cliente: no recorta documentos. Revertir es volver el filtro de especialidad a `<select>` y el de regional al listbox sin búsqueda.
