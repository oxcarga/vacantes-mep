# Delta de especificación

## Propósito

Mantener una lista durable de regionales y especialidades para que los docentes puedan suscribirse antes de que exista una vacante que coincida.

## ADDED Requirements

### Requirement: Cada scrape exitoso hace upsert de regionales
En un scrape exitoso, el sistema MUST registrar cada regional del dropdown del MEP, incluida una regional cuya tabla de vacantes esté vacía. Cada regional MUST identificarse por el value de la opción del dropdown, y el sistema MUST guardar la etiqueta actual con él. El sistema MUST actualizar etiqueta y hora de última vista cuando reaparezca el mismo value. El sistema MUST NOT borrar una regional que falte en un scrape posterior.

#### Escenario: Se conserva una regional vacía
- **CUANDO** un scrape exitoso selecciona una regional del dropdown y su tabla no tiene filas
- **ENTONCES** el catálogo sigue conteniendo esa regional, identificada por su value del dropdown

#### Escenario: Cambio de etiqueta sigue siendo una regional
- **CUANDO** un scrape exitoso posterior devuelve el mismo value del dropdown con otra etiqueta
- **ENTONCES** el catálogo tiene una sola regional para ese value y muestra la etiqueta nueva

#### Escenario: Se retiene una regional que ya no aparece
- **CUANDO** un scrape exitoso ya no incluye un value del dropdown que estaba guardado
- **ENTONCES** esa regional permanece en el catálogo

### Requirement: Cada scrape exitoso hace upsert de especialidades
En un scrape exitoso, el sistema MUST registrar cada texto de especialidad presente en una fila de vacante, usando ese texto exacto como identidad. El sistema MUST refrescar la hora de última vista cuando reaparezca el mismo texto. El sistema MUST NOT fusionar cadenas que difieran en ortografía, mayúsculas o puntuación. El sistema MUST NOT borrar una especialidad ausente en un scrape posterior.

#### Escenario: Se agrega una especialidad nueva
- **CUANDO** un scrape exitoso contiene una vacante cuyo texto de especialidad aún no está en el catálogo
- **ENTONCES** el catálogo contiene ese texto exacto

#### Escenario: Grafías distintas siguen siendo distintas
- **CUANDO** un scrape contiene `Sin Especialidad T-I` y `Sin Especialidad T-Ii`
- **ENTONCES** el catálogo contiene ambas cadenas como especialidades separadas

### Requirement: Un scrape fallido o vacío no cambia los catálogos
El sistema MUST NOT agregar, actualizar ni borrar entradas de catálogo cuando un scrape falla o cuando se rechaza la tabla de vacantes por vacía.

#### Escenario: Scrape fallido
- **CUANDO** un scrape termina en error
- **ENTONCES** regionales y especialidades quedan como antes de esa corrida
