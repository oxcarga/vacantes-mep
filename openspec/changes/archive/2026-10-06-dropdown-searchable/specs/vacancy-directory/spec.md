# Spec Delta

## MODIFIED Requirements

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
