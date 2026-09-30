# Spec Delta

## ADDED Requirements

### Requirement: La vacante abierta se muestra como ficha
El directorio del docente MUST mostrar cada vacante abierta como ficha. La ficha MUST incluir la especialidad, el número de vacante, la etiqueta actual de la regional en el catálogo y la fecha de calendario de `firstSeen` en America/Costa_Rica. Cuando el documento traiga institución, clase de puesto o lecciones, la ficha MUST mostrarlos. Cuando falte uno de esos tres, la ficha MUST omitirlo. Cuando exista un enlace Aplicar, la ficha MUST ofrecerlo como acción para abrir esa URL. Cuando no exista, la ficha MUST NOT mostrar esa acción. La fecha MUST corresponder a la primera vez que el sistema vio la vacante, no a una hora de publicación del MEP.

#### Scenario: Ficha con datos completos
- **WHEN** un docente verificado ve una vacante abierta con institución, clase de puesto, lecciones y enlace Aplicar
- **THEN** la ficha muestra especialidad, número, institución, etiqueta de regional, clase de puesto, lecciones, la fecha de `firstSeen` y la acción Aplicar

#### Scenario: Ficha sin datos opcionales
- **WHEN** un docente verificado ve una vacante abierta sin institución, clase de puesto, lecciones ni enlace Aplicar
- **THEN** la ficha muestra especialidad, número, etiqueta de regional y la fecha de `firstSeen`, y no muestra la acción Aplicar

### Requirement: El directorio ordena por primera vista
Al abrir el directorio, el docente MUST ver todas las vacantes abiertas, de la `firstSeen` más reciente a la más antigua. El mismo orden MUST aplicarse a la lista ya filtrada. El directorio MUST mostrar cuántas vacantes están en la lista visible.

#### Scenario: Hay vacantes de distinta primera vista
- **WHEN** un docente verificado abre el directorio sin filtros y hay vacantes abiertas con distinta `firstSeen`
- **THEN** la de `firstSeen` más reciente aparece antes que la más antigua, y el conteo es el de todas las abiertas

### Requirement: El docente filtra por regional y por especialidad
El directorio MUST ofrecer un filtro de regional con cada regional del catálogo, identificada por su etiqueta actual, y un filtro de especialidad con cada especialidad del catálogo, identificada por su texto exacto. Cada filtro MUST poder quedar en todas. Una regional o especialidad del catálogo MUST poder elegirse aunque no tenga vacantes abiertas. Con una regional elegida, la lista MUST incluir solo vacantes abiertas de ese value de catálogo. Con una especialidad elegida, la lista MUST incluir solo vacantes abiertas cuyo texto de especialidad sea ese texto exacto. Con ambos elegidos, la lista MUST incluir solo la intersección. Quitar un filtro MUST volver a mostrar las vacantes que cumplen el filtro que sigue activo.

#### Scenario: Solo una regional
- **WHEN** un docente verificado elige una regional y deja la especialidad en todas
- **THEN** la lista contiene solo las vacantes abiertas de esa regional, de la más reciente a la más antigua

#### Scenario: Solo una especialidad
- **WHEN** un docente verificado elige una especialidad y deja la regional en todas
- **THEN** la lista contiene solo las vacantes abiertas de ese texto de especialidad, en cualquier regional

#### Scenario: Regional y especialidad juntas
- **WHEN** un docente verificado elige una regional y una especialidad
- **THEN** la lista contiene solo las vacantes abiertas que cumplen las dos condiciones

#### Scenario: Catálogo sin vacantes abiertas
- **WHEN** un docente verificado elige una regional del catálogo que no tiene vacantes abiertas
- **THEN** puede elegirla y la lista queda vacía

### Requirement: El directorio distingue lista vacía de filtro sin coincidencias
Cuando no hay vacantes abiertas, el directorio MUST indicarlo con un mensaje de que no hay vacantes abiertas. Cuando sí hay vacantes abiertas y el filtro no coincide con ninguna, el directorio MUST mostrar otro mensaje, que nombra la regional elegida, la especialidad elegida, o ambas. Ese mensaje MUST NOT ser el de que no hay vacantes abiertas.

#### Scenario: No hay vacantes abiertas
- **WHEN** un docente verificado abre el directorio y no hay vacantes abiertas
- **THEN** no hay fichas y el mensaje indica que no hay vacantes abiertas

#### Scenario: El filtro no coincide
- **WHEN** hay vacantes abiertas y el docente elige una regional y una especialidad cuya intersección está vacía
- **THEN** no hay fichas y el mensaje nombra esa regional y esa especialidad, y no es el mensaje de que no hay vacantes abiertas
