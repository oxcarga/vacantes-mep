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
El directorio MUST ofrecer un filtro de regional con cada regional del catálogo, identificada por su etiqueta actual, y un filtro de especialidad con cada especialidad del catálogo, identificada por su texto exacto. El filtro de especialidad MUST aceptar una sola especialidad. El filtro de regional MUST aceptar ninguna, una o varias regionales a la vez, y MUST NOT aceptar más de cinco. Cada filtro MUST poder quedar en todas. Una regional o especialidad del catálogo MUST poder elegirse aunque no tenga vacantes abiertas. Cada filtro MUST poder buscarse por texto dentro de su panel.

El control de regional, cerrado y sin regionales elegidas, MUST decir "Todas las regionales". Con una regional elegida, MUST mostrar la etiqueta actual de esa regional. Con dos o más, MUST mostrar la cantidad de regionales elegidas, un espacio y la palabra "regionales". Al abrirlo, cada regional elegida MUST verse marcada y cada regional no elegida MUST verse sin marca. Activar una regional marcada MUST quitarla. Activar una regional sin marca MUST agregarla sin quitar las que ya estaban, salvo cuando ya hay cinco: entonces MUST NOT agregarla, MUST verse deshabilitada y el panel MUST decir "Máximo 5 regionales". Activar "Todas las regionales" MUST dejar el filtro de regional en todas y MUST NOT quitar la especialidad elegida.

El control de especialidad, cerrado y sin especialidad elegida, MUST decir "Todas las especialidades". Con una especialidad elegida, MUST mostrar su texto exacto. Elegir una especialidad MUST reemplazar la anterior y MUST NOT quitar las regionales. Activar "Todas las especialidades" MUST dejar la especialidad en todas y MUST NOT quitar las regionales.

Sin regionales elegidas, la lista MUST incluir vacantes abiertas de cualquier regional. Con una o más regionales elegidas, la lista MUST incluir las vacantes abiertas cuyo value de catálogo sea el de cualquiera de esas regionales. Con una especialidad elegida, la lista MUST incluir solo vacantes abiertas cuyo texto de especialidad sea ese texto exacto. Con regionales y especialidad elegidas, la lista MUST incluir solo las vacantes que cumplen la especialidad y además están en alguna de las regionales elegidas. Quitar una regional MUST dejar las demás regionales y la especialidad como estaban. Quitar la especialidad MUST dejar las regionales como estaban. Elegir otra especialidad MUST reemplazar la anterior.

#### Scenario: Solo una regional
- **WHEN** un docente verificado elige una regional y deja la especialidad en todas
- **THEN** la lista contiene solo las vacantes abiertas de esa regional, de la más reciente a la más antigua, y el control cerrado muestra la etiqueta de esa regional

#### Scenario: Solo una especialidad
- **WHEN** un docente verificado elige una especialidad y deja la regional en todas
- **THEN** la lista contiene solo las vacantes abiertas de ese texto de especialidad, en cualquier regional, y el control de regional dice "Todas las regionales"

#### Scenario: Regional y especialidad juntas
- **WHEN** un docente verificado elige una regional y una especialidad
- **THEN** la lista contiene solo las vacantes abiertas que cumplen las dos condiciones

#### Scenario: Varias regionales
- **WHEN** un docente verificado elige dos regionales y deja la especialidad en todas
- **THEN** la lista contiene las vacantes abiertas de cualquiera de esas dos regionales, de la más reciente a la más antigua, y el control cerrado dice "2 regionales"

#### Scenario: Varias regionales y una especialidad
- **WHEN** un docente verificado elige dos regionales y una especialidad
- **THEN** la lista contiene solo las vacantes abiertas de esa especialidad cuyo value de catálogo es el de cualquiera de esas dos regionales

#### Scenario: Volver a pulsar una regional marcada
- **WHEN** hay dos regionales elegidas y el docente activa en el dropdown la que ya está marcada
- **THEN** esa regional deja de estar elegida, la otra se conserva y el control cerrado muestra la etiqueta de la que queda

#### Scenario: Todas las regionales
- **WHEN** hay regionales elegidas y una especialidad elegida, y el docente activa "Todas las regionales"
- **THEN** el filtro de regional vuelve a todas, la especialidad se conserva y la lista muestra las vacantes de esa especialidad en cualquier regional

#### Scenario: Catálogo sin vacantes abiertas
- **WHEN** un docente verificado elige una regional del catálogo que no tiene vacantes abiertas
- **THEN** puede elegirla y la lista queda vacía

#### Scenario: La especialidad sigue siendo una
- **WHEN** un docente verificado ya eligió una especialidad y elige otra
- **THEN** queda elegida solo la última y las regionales elegidas se conservan

#### Scenario: Sexta regional
- **WHEN** un docente verificado ya eligió cinco regionales y activa una sexta que no está marcada
- **THEN** la sexta no queda elegida, el control cerrado dice "5 regionales" y el panel dice "Máximo 5 regionales"

#### Scenario: Buscar una regional
- **WHEN** un docente verificado abre el filtro de regional y escribe un texto que, sin distinguir mayúsculas ni tildes, coincide con una sola etiqueta del catálogo
- **THEN** esa regional sigue visible, las que no coinciden no, y "Todas las regionales" sigue visible

#### Scenario: Buscar una especialidad
- **WHEN** un docente verificado abre el filtro de especialidad y elige una especialidad que el texto dejó visible
- **THEN** el control cerrado muestra el texto exacto de esa especialidad y las regionales elegidas se conservan

#### Scenario: Todas las especialidades
- **WHEN** hay una especialidad elegida y regionales elegidas, y el docente activa "Todas las especialidades"
- **THEN** la especialidad vuelve a todas, las regionales se conservan y el control de especialidad dice "Todas las especialidades"

### Requirement: El directorio distingue lista vacía de filtro sin coincidencias
Cuando no hay vacantes abiertas, el directorio MUST indicarlo con un mensaje de que no hay vacantes abiertas. Cuando sí hay vacantes abiertas y el filtro no coincide con ninguna, el directorio MUST mostrar otro mensaje. Si hay una especialidad elegida, ese mensaje MUST nombrarla. Si hay una sola regional elegida, MUST nombrarla. Si hay varias, MUST nombrar cada etiqueta en el orden del catálogo: dos se unen con "o" ("en {primera} o en {segunda}") y tres o más separan las primeras con coma y anteceden la última con "o" ("en {primera}, en {segunda} o en {tercera}"). Ese mensaje MUST NOT ser el de que no hay vacantes abiertas.

#### Scenario: No hay vacantes abiertas
- **WHEN** un docente verificado abre el directorio y no hay vacantes abiertas
- **THEN** no hay fichas y el mensaje indica que no hay vacantes abiertas

#### Scenario: El filtro no coincide
- **WHEN** hay vacantes abiertas y el docente elige una regional y una especialidad cuya intersección está vacía
- **THEN** no hay fichas y el mensaje nombra esa regional y esa especialidad, y no es el mensaje de que no hay vacantes abiertas

#### Scenario: Dos regionales sin coincidencias
- **WHEN** hay vacantes abiertas y el docente elige dos regionales y una especialidad, y ninguna vacante abierta de esa especialidad está en esas regionales
- **THEN** el mensaje nombra la especialidad y las dos regionales en el orden del catálogo, unidas con "o", y no es el mensaje de que no hay vacantes abiertas

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
Cuando el docente tiene al menos un filtro distinto de todas, el directorio MUST mostrar cada filtro activo y MUST ofrecer quitar cada uno por separado. Cada regional elegida MUST mostrarse en su propia píldora, con la etiqueta actual de esa regional, en el orden de las etiquetas del catálogo. La especialidad elegida MUST mostrarse en una sola píldora, con su texto exacto, después de las píldoras de regional. Las píldoras de regional MUST usar el color `primary`. La píldora de especialidad MUST usar el color `secondary`. Quitar la píldora de una regional MUST desmarcarla en el dropdown de regionales, MUST dejar las demás regionales y MUST conservar la especialidad. Si al quitarla queda una sola regional, el control cerrado MUST mostrar la etiqueta de esa regional. Si no queda ninguna, MUST decir "Todas las regionales". Quitar la píldora de especialidad MUST dejar las regionales. El directorio MUST ofrecer una acción "Limpiar filtros" que deja las regionales en todas y la especialidad en todas. El mensaje de filtro sin coincidencias MUST ir acompañado de esa misma acción. Sin filtros activos, el directorio MUST NOT mostrar filtros activos ni la acción "Limpiar filtros".

#### Scenario: Dos filtros activos
- **WHEN** un docente verificado elige una regional y una especialidad
- **THEN** el directorio muestra la píldora de esa regional y la de esa especialidad, cada una con su opción de quitar, y la acción "Limpiar filtros"

#### Scenario: Una píldora por regional
- **WHEN** un docente verificado elige dos regionales y deja la especialidad en todas
- **THEN** el directorio muestra dos píldoras de regional, en el orden del catálogo, cada una con su opción de quitar, y no muestra píldora de especialidad

#### Scenario: Colores distintos
- **WHEN** un docente verificado elige una regional y una especialidad
- **THEN** la píldora de regional usa el color `primary` y la de especialidad usa el color `secondary`

#### Scenario: Quitar un solo filtro
- **WHEN** hay una regional y una especialidad elegidas y el docente quita la regional
- **THEN** el filtro de regional vuelve a todas, esa regional queda desmarcada en el dropdown, el de especialidad se conserva y la lista muestra las vacantes de esa especialidad en todas las regionales

#### Scenario: Quitar una regional deja las demás
- **WHEN** hay dos regionales y una especialidad elegidas y el docente quita la píldora de una regional
- **THEN** esa regional queda desmarcada en el dropdown, la otra regional y la especialidad siguen, el control cerrado muestra la etiqueta de la regional que queda y la lista muestra las vacantes de esa especialidad en esa regional

#### Scenario: Limpiar desde el filtro sin coincidencias
- **WHEN** el filtro no coincide con ninguna vacante y el docente usa "Limpiar filtros"
- **THEN** las regionales y la especialidad vuelven a todas, desaparece el mensaje de filtro sin coincidencias y la lista muestra todas las vacantes abiertas

#### Scenario: Sin filtros
- **WHEN** las regionales y la especialidad están en todas
- **THEN** no se muestran filtros activos ni la acción "Limpiar filtros"

### Requirement: La ficha del docente copia el ID de la vacante
En cada ficha de vacante abierta del directorio del docente, el directorio MUST mostrar un control de copiar inmediatamente a la derecha del número de vacante visible. El número visible MUST seguir mostrando el prefijo `#` seguido del ID. Activar el control MUST copiar al portapapeles solo el ID de esa vacante, sin el carácter `#`. El control MUST poder activarse con puntero y con teclado. Su nombre accesible MUST indicar que copia el ID de esa vacante. Cuando la copia tiene éxito, el control MUST mostrar una confirmación perceptible de que el ID se copió. Cuando la copia falla, el control MUST NOT mostrar esa confirmación de éxito. El número visible MUST NOT cambiar al copiar.

#### Scenario: Copiar el ID sin el prefijo
- **WHEN** un docente verificado activa el control de copiar en una ficha cuyo número visible es `#1003`
- **THEN** el portapapeles contiene `1003` y la ficha sigue mostrando `#1003`

#### Scenario: La copia se confirma
- **WHEN** un docente verificado activa el control de copiar y la escritura al portapapeles tiene éxito
- **THEN** el control muestra una confirmación perceptible de que el ID se copió

#### Scenario: La copia falla
- **WHEN** un docente verificado activa el control de copiar y la escritura al portapapeles falla
- **THEN** el control no muestra la confirmación de éxito y la ficha sigue mostrando el número con `#`

#### Scenario: El control se nombra
- **WHEN** un docente verificado enfoca el control de copiar de una vacante
- **THEN** el nombre accesible del control indica que copia el ID de esa vacante
