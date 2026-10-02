# Propuesta

## Resumen

El directorio `/vacantes` cumple su función, pero se ve plano: dos selects en fila con un número suelto al lado y fichas de texto corrido sin jerarquía. Además, mientras llega el primer resultado de Firestore muestra "No hay vacantes abiertas.", un falso negativo. Este cambio rediseña la pantalla y el `AppShell` con un estilo limpio sobre la paleta existente, y agrega tres ayudas: estado de carga, insignia "Nueva" y chips de filtros activos.

## Por qué

El docente entra a ver qué salió hace poco y recortar por su regional o especialidad. Hoy tiene que leer cada ficha para saber si es reciente, no ve de un vistazo qué filtros tiene puestos y, al abrir la página, puede creer por un instante que no hay vacantes.

## Qué cambia

- `AppShell`: header fijo con marca, navegación con estado activo y sesión compacta; subtítulo opcional por página.
- Encabezado de `/vacantes` con subtítulo y conteo como frase ("3 vacantes").
- Panel de filtros con íconos, chips de filtros activos que se quitan uno a uno y acción "Limpiar filtros".
- Fichas en cuadrícula con jerarquía clara: especialidad, número, institución, regional, chips de puesto y lecciones, pie con fecha y Aplicar.
- Estado de carga con fichas esqueleto hasta el primer resultado; el mensaje de lista vacía solo aparece después.
- Insignia "Nueva" cuando la fecha de `firstSeen` en America/Costa_Rica es hoy o ayer, o cae en el futuro.
- Estados vacíos con ícono y una acción (ir a Suscripciones, o limpiar filtros).

## Alcance

La pantalla `/vacantes` del docente verificado y el componente `AppShell`, compartido con `/suscripciones`, `/admin`, `/verificar` y `/auth/complete`. El cálculo de "Nueva" y los filtros ocurren en el navegador sobre los datos ya cargados.

## Objetivos

- Distinguir de un vistazo las vacantes vistas hoy o ayer.
- Ver y quitar los filtros activos sin abrir los selects.
- No mostrar "No hay vacantes abiertas." mientras los datos aún cargan.
- Una presentación moderna y consistente que use solo los tokens de color existentes.
- Conservar todo lo que exige hoy la spec `vacancy-directory` y las pruebas e2e actuales.

## Fuera de alcance

- Nuevos tokens de color, modo oscuro conmutable o cambios a `globals.css` fuera de utilidades.
- Rediseño del contenido de `/suscripciones` y `/admin` (solo heredan el nuevo shell).
- Búsqueda por texto, paginación, guardar filtros o vacantes favoritas.
- Cambios a Firestore, reglas, esquema o scraper.
- Reemplazar los selects nativos por componentes de Radix.

## Capacidades

### Capacidades nuevas

Ninguna.

### Capacidades modificadas

- `vacancy-directory`: se agregan el estado de carga del directorio, la insignia "Nueva" por fecha de primera vista y la vista de filtros activos con acción para limpiarlos.

## Impacto

`apps/gomep-vacantes/src/components/app-shell.tsx`, `apps/gomep-vacantes/src/app/vacantes/page.tsx`, una función pura nueva en `src/lib/` con su prueba unitaria, y nuevas pruebas en `e2e/app.spec.ts`. Las pruebas existentes de las secciones 5, 6 y 7 deben seguir pasando sin cambios. No hay dependencias nuevas.
