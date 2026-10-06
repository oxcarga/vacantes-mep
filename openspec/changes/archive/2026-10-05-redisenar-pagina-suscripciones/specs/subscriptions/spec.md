# Spec Delta

## ADDED Requirements

### Requirement: La ficha activa muestra la regional y la fecha de vencimiento
Cada suscripción activa del docente MUST mostrarse como ficha. La ficha MUST incluir la especialidad, la etiqueta actual de esa regional en el catálogo y la fecha de calendario de `expiresAt` en America/Costa_Rica, presentada como "Vence el" seguido de esa fecha. La fecha MUST ser la del calendario de Costa Rica, no el prefijo UTC del instante. Cuando el value de la regional no está en el catálogo, la ficha MUST mostrar ese value. Cuando sí está, la ficha MUST NOT mostrar el value como nombre de la regional. La ficha MUST ofrecer quitar esa suscripción con la acción "Quitar".

#### Scenario: Regional del catálogo
- **WHEN** un docente verificado tiene una suscripción activa cuya regional en el catálogo se llama "Regional Educación Perez Zeledon"
- **THEN** la ficha muestra "Regional Educación Perez Zeledon" y no muestra el value de esa regional como su nombre

#### Scenario: El instante UTC cae en el día anterior en Costa Rica
- **WHEN** una suscripción activa tiene `expiresAt` igual a `2026-01-31T00:00:00.000Z`
- **THEN** la ficha muestra que vence el 30 ene 2026

#### Scenario: Regional ausente del catálogo
- **WHEN** el value de la regional de una suscripción activa no existe en el catálogo
- **THEN** la ficha muestra ese value

### Requirement: El historial explica el cierre en español
Cada suscripción inactiva MUST mostrarse como ficha de historial con la especialidad y la misma regla de etiqueta de regional que una ficha activa. Cuando `endReason` es `removed`, la ficha MUST decir "La quitaste". Cuando `endReason` es `expired`, la ficha MUST decir "Venció". Cuando `endReason` falta o tiene otro valor, la ficha MUST omitir esa frase. La ficha MUST NOT mostrar los códigos `removed` ni `expired`.

#### Scenario: La quitó el docente
- **WHEN** una suscripción inactiva tiene `endReason` `removed`
- **THEN** la ficha de historial dice "La quitaste" y no dice `removed`

#### Scenario: Venció el plazo
- **WHEN** una suscripción inactiva tiene `endReason` `expired`
- **THEN** la ficha de historial dice "Venció" y no dice `expired`

#### Scenario: Motivo ausente
- **WHEN** una suscripción inactiva no tiene `endReason`
- **THEN** la ficha no dice "La quitaste", ni "Venció", ni un código de motivo

### Requirement: La página cuenta las suscripciones activas
Después de cargar, la página MUST mostrar cuántas suscripciones activas tiene el docente. Una se nombra "activa" y cualquier otro número, incluido cero, se nombra "activas".

#### Scenario: Una sola activa
- **WHEN** el docente tiene una suscripción activa
- **THEN** la página muestra el número 1 junto a la palabra "activa"

#### Scenario: Ninguna activa
- **WHEN** el docente no tiene suscripciones activas
- **THEN** la página muestra el número 0 junto a la palabra "activas"

### Requirement: La página distingue la lista vacía del historial vacío
Cuando no hay suscripciones activas, la página MUST indicarlo con "No tienes suscripciones activas." Cuando no hay suscripciones inactivas, la página MUST indicarlo con "Todavía no hay historial." Esos dos mensajes MUST poder aparecer juntos o por separado. Un mensaje MUST NOT sustituir al otro.

#### Scenario: Solo historial
- **WHEN** el docente no tiene activas y sí tiene inactivas
- **THEN** se ve "No tienes suscripciones activas." y no se ve "Todavía no hay historial."

#### Scenario: Solo activas
- **WHEN** el docente tiene activas y no tiene inactivas
- **THEN** se ve "Todavía no hay historial." y no se ve "No tienes suscripciones activas."

### Requirement: La página indica que está cargando
Mientras la página aún no recibe el primer resultado de las suscripciones del docente y el primer resultado del catálogo de regionales, MUST mostrar un indicador de carga. Durante la carga, la página MUST NOT mostrar fichas activas, fichas de historial, el conteo, ni los mensajes de lista vacía o de historial vacío. Al recibir ambos resultados, el indicador MUST desaparecer y la página MUST mostrar las fichas, el conteo y los mensajes que correspondan. Si alguna de las dos lecturas falla, el indicador MUST desaparecer y la página MUST mostrar el error. El catálogo de especialidades MUST NOT retrasar el fin de la carga.

#### Scenario: Las suscripciones tardan en llegar
- **WHEN** un docente verificado abre la página y el primer resultado de sus suscripciones aún no llega
- **THEN** se ve el indicador de carga y no se ve "No tienes suscripciones activas."

#### Scenario: Llega el primer resultado
- **WHEN** llegan el primer resultado de suscripciones y el de regionales, y hay una suscripción activa
- **THEN** el indicador de carga desaparece y se ve la ficha con la etiqueta actual de su regional

#### Scenario: Falla la lectura
- **WHEN** falla la lectura de suscripciones o la de regionales
- **THEN** el indicador de carga desaparece y se ve el error

### Requirement: Los catálogos del formulario van en orden alfabético
Las opciones de regional del formulario MUST listar cada regional del catálogo por su etiqueta actual, ordenadas con el alfabeto español. Las opciones de especialidad MUST listar cada especialidad por su nombre, ordenadas con el alfabeto español. La opción vacía de cada select MUST permanecer la primera.

#### Scenario: Etiquetas fuera de orden de llegada
- **WHEN** el catálogo de regionales llega con una etiqueta que alfabéticamente va antes que otra recibida primero
- **THEN** el select de regional muestra esas etiquetas en orden alfabético español, debajo de la opción vacía

### Requirement: El historial ofrece agregar de nuevo cuando el par no está activo
Cada ficha de historial cuyo par de regional y especialidad no tiene una suscripción activa del mismo docente MUST ofrecer la acción "Agregar de nuevo". Esa acción MUST crear una suscripción activa nueva para el par guardado en esa fila, con un plazo fresco de 30 días, y MUST dejar la fila inactiva sin cambios. MUST NOT usar la regional ni la especialidad elegidas en el formulario. Cuando ya existe una suscripción activa de ese mismo par, la ficha de historial MUST NOT ofrecer "Agregar de nuevo". Si hay varias fichas de historial del mismo par, cada una MUST ofrecer la acción mientras ninguna activa de ese par exista, y MUST dejar de ofrecerla en cuanto exista una.

#### Scenario: Reabrir un par vencido
- **WHEN** el docente usa "Agregar de nuevo" en una ficha inactiva y no tiene una activa de ese par
- **THEN** aparece una suscripción activa nueva de ese par y la ficha inactiva sigue en el historial

#### Scenario: El par ya está activo
- **WHEN** el docente ya tiene una suscripción activa para el mismo par de una ficha inactiva
- **THEN** esa ficha de historial no ofrece "Agregar de nuevo"

#### Scenario: Quitar la activa devuelve la acción
- **WHEN** el docente quita la suscripción activa de un par que también está en el historial
- **THEN** la ficha de historial vuelve a ofrecer "Agregar de nuevo"

#### Scenario: El formulario tiene otra selección
- **WHEN** el formulario tiene elegida otra regional u otra especialidad y el docente usa "Agregar de nuevo"
- **THEN** la suscripción nueva usa el par de la ficha de historial
