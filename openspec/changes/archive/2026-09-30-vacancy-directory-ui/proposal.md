# Propuesta

## Resumen

El listado de vacantes del docente es una línea por vacante: número, especialidad, regional, institución y un enlace Aplicar. Con unas 60 vacantes abiertas en 22 regionales, esa lista no deja ver qué apareció hace poco ni quedarse solo con una regional o una especialidad.

## Por qué

El docente abre el directorio para ver qué se publicó hace poco y, desde ahí, recortar por su regional o por especialidad. Hoy no hay orden ni filtros, y los datos para una ficha (puesto, lecciones, institución, enlace) ya están en el documento y casi no se muestran.

## Qué cambia

- Cada vacante abierta se muestra como ficha: especialidad, número, institución, regional, clase de puesto, lecciones, fecha de primera vista y Aplicar como acción principal.
- Al entrar, se ven todas las abiertas, de la más reciente a la más antigua según `firstSeen`.
- Un filtro de regional y uno de especialidad, tomados de los catálogos completos. Se combinan: la ficha aparece solo si cumple ambos. Cada filtro puede quedar en "todas".
- Si el recorte no tiene vacantes, un mensaje distinto de "no hay vacantes abiertas".

## Alcance

La pantalla `/vacantes` de `gomep-vacantes`, para un docente verificado. El filtrado ocurre en el navegador sobre las vacantes abiertas ya cargadas.

## Objetivos

- Ver primero lo visto hace poco, en todas las regionales.
- Elegir cualquier regional del catálogo, aunque no tenga vacantes abiertas, y ver solo esa.
- Elegir cualquier especialidad del catálogo y combinarla con la regional.
- Leer en la ficha institución, puesto, lecciones y el enlace Aplicar.

## Fuera de alcance

- El listado de vacantes del admin, la pantalla de administración y las suscripciones.
- Guardar una regional preferida en el perfil.
- Búsqueda por texto de institución o número.
- Consultas nuevas a Firestore o índices. Las cerradas siguen fuera de esta pantalla.
- Tratar `firstSeen` como la hora de publicación del MEP. Es la primera vez que el scraper vio la vacante.

## Capacidades

### Capacidades nuevas

Ninguna.

### Capacidades modificadas

- `vacancy-directory`: El docente sigue viendo solo vacantes abiertas, ahora en fichas ordenadas por primera vista y filtrables por regional y especialidad del catálogo.

## Impacto

`apps/gomep-vacantes/src/app/vacantes/page.tsx` y estilos de esa pantalla. La prueba Playwright `6.1` sigue comprobando que la cerrada no aparece; hace falta cubrir orden y filtros. No cambian reglas, esquema ni el scraper.
