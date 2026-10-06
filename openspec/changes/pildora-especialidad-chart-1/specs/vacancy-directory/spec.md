# Spec Delta

## MODIFIED Requirements

### Requirement: El directorio muestra los filtros activos y permite limpiarlos
Cuando el docente tiene al menos un filtro distinto de todas, el directorio MUST mostrar cada filtro activo y MUST ofrecer quitar cada uno por separado. Cada regional elegida MUST mostrarse en su propia píldora, con la etiqueta actual de esa regional, en el orden de las etiquetas del catálogo. La especialidad elegida MUST mostrarse en una sola píldora, con su texto exacto, después de las píldoras de regional. Las píldoras de regional MUST usar el color `primary`. La píldora de especialidad MUST usar el color `chart-1`. Quitar la píldora de una regional MUST desmarcarla en el dropdown de regionales, MUST dejar las demás regionales y MUST conservar la especialidad. Si al quitarla queda una sola regional, el control cerrado MUST mostrar la etiqueta de esa regional. Si no queda ninguna, MUST decir "Todas las regionales". Quitar la píldora de especialidad MUST dejar las regionales. El directorio MUST ofrecer una acción "Limpiar filtros" que deja las regionales en todas y la especialidad en todas. El mensaje de filtro sin coincidencias MUST ir acompañado de esa misma acción. Sin filtros activos, el directorio MUST NOT mostrar filtros activos ni la acción "Limpiar filtros".

#### Scenario: Dos filtros activos
- **WHEN** un docente verificado elige una regional y una especialidad
- **THEN** el directorio muestra la píldora de esa regional y la de esa especialidad, cada una con su opción de quitar, y la acción "Limpiar filtros"

#### Scenario: Una píldora por regional
- **WHEN** un docente verificado elige dos regionales y deja la especialidad en todas
- **THEN** el directorio muestra dos píldoras de regional, en el orden del catálogo, cada una con su opción de quitar, y no muestra píldora de especialidad

#### Scenario: Colores distintos
- **WHEN** un docente verificado elige una regional y una especialidad
- **THEN** la píldora de regional usa el color `primary` y la de especialidad usa el color `chart-1`

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
