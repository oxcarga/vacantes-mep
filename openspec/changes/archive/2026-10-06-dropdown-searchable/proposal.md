# Propuesta

## Resumen

En `/vacantes` el filtro de regional es una lista sin búsqueda y el de especialidad es un `<select>` nativo. Con catálogos largos hay que recorrer todas las opciones. Este cambio crea `DropdownSearchable`, un control reutilizable con búsqueda dentro del panel, y lo usa en los dos filtros.

## Por qué

Quien busca una regional o una especialidad concreta hojea la lista completa. Un campo de texto dentro del panel filtra por etiqueta y deja el botón cerrado con el resumen de lo elegido.

## Qué cambia

- Aparece `DropdownSearchable`, controlado por quien lo usa: opciones, nombre en plural, selección única o múltiple, y un máximo que solo cuenta en múltiple.
- El filtro de regional de `/vacantes` usa ese control en selección múltiple, con máximo 5.
- El filtro de especialidad usa el mismo control en selección única. Sigue aceptando una sola especialidad y su valor sigue siendo el texto exacto.
- Con cinco regionales elegidas, las demás se ven deshabilitadas y el panel dice "Máximo 5 regionales".

## Alcance

El componente en la app de vacantes y los dos filtros de `/vacantes` del docente verificado. La lista sigue recortándose en memoria sobre las vacantes abiertas ya cargadas.

## Objetivos

- Buscar por texto dentro de las opciones de regional y de especialidad.
- Conservar varias regionales, ahora con tope de cinco, sus píldoras y "Todas las regionales".
- Conservar una sola especialidad, su píldora `secondary` y "Todas las especialidades".

## Fuera de alcance

- Los `<select>` de `/suscripciones` y de `/admin`.
- Elegir varias especialidades.
- Guardar los filtros en la URL o en Firestore.
- Dependencias nuevas.

## Capacidades

### Capacidades nuevas

- `dropdown-searchable`: control con búsqueda en el panel, selección única o múltiple, y tope solo en múltiple.

### Capacidades modificadas

- `vacancy-directory`: los dos filtros usan ese control; la regional admite como máximo cinco a la vez.

## Impacto

`apps/gomep-vacantes/src/components/dropdown-searchable.tsx`, `src/app/vacantes/page.tsx` y las pruebas e2e que abren `vacantes-regional` o eligen `vacantes-especialidad` con `selectOption`.
