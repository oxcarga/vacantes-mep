# Spec Delta

## ADDED Requirements

### Requirement: El directorio indica que está cargando
Mientras el directorio del docente aún no recibe el primer resultado de vacantes abiertas y el primer resultado del catálogo de regionales, MUST mostrar un indicador de carga. Durante la carga, el directorio MUST NOT mostrar fichas, ni el mensaje de que no hay vacantes abiertas, ni el mensaje de filtro sin coincidencias. Al recibir ambos resultados, el indicador MUST desaparecer y el directorio MUST mostrar las fichas o el mensaje que corresponda. Si alguna de las dos lecturas falla, el indicador MUST desaparecer y el directorio MUST mostrar el error.

#### Scenario: Las vacantes tardan en llegar
- **WHEN** un docente verificado abre el directorio y el primer resultado de vacantes abiertas aún no llega
- **THEN** se ve el indicador de carga y no se ve el mensaje de que no hay vacantes abiertas

#### Scenario: Llega el primer resultado
- **WHEN** llegan el primer resultado de vacantes y el de regionales, y hay vacantes abiertas
- **THEN** el indicador de carga desaparece y se ven las fichas con la etiqueta actual de su regional

#### Scenario: Llega el primer resultado vacío
- **WHEN** llegan el primer resultado de vacantes y el de regionales, y no hay vacantes abiertas
- **THEN** el indicador de carga desaparece y se ve el mensaje de que no hay vacantes abiertas

### Requirement: La ficha marca las vacantes nuevas
La ficha de una vacante abierta MUST mostrar la insignia "Nueva" cuando la fecha de calendario de su `firstSeen` en America/Costa_Rica es la fecha de hoy o la de ayer en America/Costa_Rica. "Hoy" MUST tomarse del reloj del dispositivo al mostrar el directorio. Cuando la fecha de `firstSeen` es posterior a hoy, la ficha MUST mostrar la insignia. Cuando la fecha es anterior a ayer, o cuando `firstSeen` falta o no es una fecha válida, la ficha MUST NOT mostrar la insignia. La insignia MUST NOT reemplazar la fecha de `firstSeen` que la ficha ya muestra.

#### Scenario: Vista hoy
- **WHEN** un docente verificado ve una vacante cuya `firstSeen` cae hoy en America/Costa_Rica
- **THEN** la ficha muestra la insignia "Nueva" y la fecha de `firstSeen`

#### Scenario: Vista ayer cerca de medianoche
- **WHEN** hoy es 2 de enero en America/Costa_Rica y la `firstSeen` de la vacante es el 1 de enero a las 00:05 en America/Costa_Rica
- **THEN** la ficha muestra la insignia "Nueva"

#### Scenario: Vista anteayer
- **WHEN** hoy es 2 de enero en America/Costa_Rica y la `firstSeen` de la vacante es el 31 de diciembre a las 23:55 en America/Costa_Rica
- **THEN** la ficha no muestra la insignia "Nueva"

#### Scenario: Primera vista en el futuro
- **WHEN** la fecha de `firstSeen` en America/Costa_Rica es posterior a hoy
- **THEN** la ficha muestra la insignia "Nueva"

#### Scenario: Primera vista ausente o inválida
- **WHEN** la vacante no trae `firstSeen` o trae un valor que no es fecha
- **THEN** la ficha no muestra la insignia "Nueva"

### Requirement: El directorio muestra los filtros activos y permite limpiarlos
Cuando el docente tiene al menos un filtro distinto de todas, el directorio MUST mostrar cada filtro activo con la etiqueta actual de la regional o el texto de la especialidad, y MUST ofrecer quitar cada uno por separado. Quitar un filtro MUST dejarlo en todas y conservar el otro. El directorio MUST ofrecer una acción "Limpiar filtros" que deja ambos filtros en todas. El mensaje de filtro sin coincidencias MUST ir acompañado de esa misma acción. Sin filtros activos, el directorio MUST NOT mostrar filtros activos ni la acción "Limpiar filtros".

#### Scenario: Dos filtros activos
- **WHEN** un docente verificado elige una regional y una especialidad
- **THEN** el directorio muestra ambos filtros activos, cada uno con su opción de quitar, y la acción "Limpiar filtros"

#### Scenario: Quitar un solo filtro
- **WHEN** hay una regional y una especialidad elegidas y el docente quita la regional
- **THEN** el filtro de regional vuelve a todas, el de especialidad se conserva y la lista muestra las vacantes de esa especialidad en todas las regionales

#### Scenario: Limpiar desde el filtro sin coincidencias
- **WHEN** el filtro no coincide con ninguna vacante y el docente usa "Limpiar filtros"
- **THEN** ambos filtros vuelven a todas, desaparece el mensaje de filtro sin coincidencias y la lista muestra todas las vacantes abiertas

#### Scenario: Sin filtros
- **WHEN** ambos filtros están en todas
- **THEN** no se muestran filtros activos ni la acción "Limpiar filtros"
