# vacancy-directory Specification

## Purpose

Mostrar vacantes abiertas a los docentes y el historial completo a los admins, sin borrar una vacante al cerrarse.

## Requirements

### Requirement: Un docente ve vacantes abiertas
Un docente verificado MUST poder listar todas las vacantes actualmente abiertas, en todas las regionales. La lista MUST excluir las vacantes cerradas. Un docente MUST NOT necesitar una suscripción para ver esta lista.

#### Scenario: Hay vacantes abiertas y cerradas
- **WHEN** un docente verificado abre el listado de vacantes y hay vacantes abiertas y cerradas almacenadas
- **THEN** la lista contiene las abiertas y omite las cerradas

### Requirement: Un admin ve vacantes abiertas y cerradas
Un admin MUST poder listar todas las vacantes almacenadas, abiertas o cerradas, y MUST poder distinguir las cerradas. Un admin MUST poder listar todas las cuentas, todas las suscripciones incluido historial inactivo, cada regional y cada especialidad.

#### Scenario: Historial de vacantes del admin
- **WHEN** un admin abre el listado de vacantes
- **THEN** la lista incluye vacantes abiertas y cerradas e identifica las cerradas

#### Scenario: Admin lee catálogos y personas
- **WHEN** un admin abre las pantallas de administración
- **THEN** el admin puede ver cuentas, suscripciones activas e inactivas, regionales y especialidades

### Requirement: Cerrar una vacante la conserva
Cuando una vacante desaparece de la página del MEP, el sistema MUST conservar la vacante almacenada y marcarla como cerrada. El sistema MUST NOT borrarla. Un scrape posterior que siga viendo la vacante MUST mantener la hora original de primera vista.

#### Scenario: La vacante sale de la página del MEP
- **WHEN** un scrape ya no encuentra una vacante que antes estaba abierta
- **THEN** la vacante sigue almacenada y queda marcada como cerrada

#### Scenario: La vacante sigue abierta
- **WHEN** un scrape posterior sigue encontrando una vacante ya almacenada
- **THEN** la vacante sigue abierta y su hora de primera vista no cambia

### Requirement: Visitantes sin sesión o sin verificar no ven vacantes
El sistema MUST NOT mostrar datos de vacantes, catálogos, cuentas ni suscripciones a un visitante sin sesión ni a una cuenta cuyo correo no esté verificado.

#### Scenario: Visitante sin sesión
- **WHEN** un visitante sin sesión pide el listado de vacantes
- **THEN** el sistema no devuelve datos de vacantes

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
