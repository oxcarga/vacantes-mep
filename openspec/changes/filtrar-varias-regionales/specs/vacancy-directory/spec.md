# Spec Delta

## MODIFIED Requirements

### Requirement: El docente filtra por regional y por especialidad
El directorio MUST ofrecer un filtro de regional con cada regional del catálogo, identificada por su etiqueta actual, y un filtro de especialidad con cada especialidad del catálogo, identificada por su texto exacto. El filtro de especialidad MUST aceptar una sola especialidad. El filtro de regional MUST aceptar ninguna, una o varias regionales a la vez. Cada filtro MUST poder quedar en todas. Una regional o especialidad del catálogo MUST poder elegirse aunque no tenga vacantes abiertas.

El control de regional, cerrado y sin regionales elegidas, MUST decir "Todas las regionales". Con una regional elegida, MUST mostrar la etiqueta actual de esa regional. Con dos o más, MUST mostrar la cantidad de regionales elegidas, un espacio y la palabra "regionales". Al abrirlo, cada regional elegida MUST verse marcada y cada regional no elegida MUST verse sin marca. Activar una regional marcada MUST quitarla. Activar una regional sin marca MUST agregarla sin quitar las que ya estaban. Activar "Todas las regionales" MUST dejar el filtro de regional en todas y MUST NOT quitar la especialidad elegida.

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
- **THEN** queda elegida solo la última

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

### Requirement: El directorio muestra los filtros activos y permite limpiarlos
Cuando el docente tiene al menos un filtro distinto de todas, el directorio MUST mostrar cada filtro activo y MUST ofrecer quitar cada uno por separado. Cada regional elegida MUST mostrarse en su propia píldora, con la etiqueta actual de esa regional, en el orden de las etiquetas del catálogo. La especialidad elegida MUST mostrarse en una sola píldora, con su texto exacto, después de las píldoras de regional. Las píldoras de regional MUST usar el color `primary`. La píldora de especialidad MUST usar el color `chart-5`. Quitar la píldora de una regional MUST desmarcarla en el dropdown de regionales, MUST dejar las demás regionales y MUST conservar la especialidad. Si al quitarla queda una sola regional, el control cerrado MUST mostrar la etiqueta de esa regional. Si no queda ninguna, MUST decir "Todas las regionales". Quitar la píldora de especialidad MUST dejar las regionales. El directorio MUST ofrecer una acción "Limpiar filtros" que deja las regionales en todas y la especialidad en todas. El mensaje de filtro sin coincidencias MUST ir acompañado de esa misma acción. Sin filtros activos, el directorio MUST NOT mostrar filtros activos ni la acción "Limpiar filtros".

#### Scenario: Dos filtros activos
- **WHEN** un docente verificado elige una regional y una especialidad
- **THEN** el directorio muestra la píldora de esa regional y la de esa especialidad, cada una con su opción de quitar, y la acción "Limpiar filtros"

#### Scenario: Una píldora por regional
- **WHEN** un docente verificado elige dos regionales y deja la especialidad en todas
- **THEN** el directorio muestra dos píldoras de regional, en el orden del catálogo, cada una con su opción de quitar, y no muestra píldora de especialidad

#### Scenario: Colores distintos
- **WHEN** un docente verificado elige una regional y una especialidad
- **THEN** la píldora de regional usa el color `primary` y la de especialidad usa el color `chart-5`

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
