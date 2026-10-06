# subscriptions Specification

## Purpose

Permitir que un docente verificado vigile pares regional y especialidad durante 30 días, y conservar suscripciones inactivas como historial.

## Requirements

### Requirement: Un docente puede suscribirse a cualquier par del catálogo
Un docente verificado MUST poder crear una suscripción eligiendo una regional del catálogo de regionales y una especialidad del catálogo de especialidades, incluso un par que nunca haya coincidido en la misma vacante. El docente MUST poder tener más de una suscripción activa. El sistema MUST rechazar una segunda suscripción activa para el mismo docente, regional y especialidad.

#### Scenario: Suscribirse antes de que exista la vacante
- **WHEN** un docente verificado elige una regional y una especialidad del catálogo que no tienen vacante juntas
- **THEN** el sistema crea una suscripción activa para ese par

#### Scenario: Par activo duplicado
- **WHEN** un docente ya tiene una suscripción activa para un par y envía otra vez el mismo par
- **THEN** el sistema no crea una segunda suscripción activa

### Requirement: Cada suscripción dura 30 días
El sistema MUST hacer que una suscripción activa venza 30 días después de crearse. Los tiempos MUSTN evaluarse en America/Costa_Rica. Al llegar el instante de vencimiento, el sistema MUST marcar la suscripción como inactiva. Una suscripción inactiva MUST permanecer almacenada como historial y MUST NOT borrarse.

#### Scenario: Termina el plazo
- **WHEN** han pasado 30 días desde que se creó la suscripción
- **THEN** la suscripción está inactiva y sigue en el historial del docente

### Requirement: Un docente puede quitar una suscripción antes
Un docente verificado MUST poder quitar una de sus suscripciones activas. El sistema MUST marcarla inactiva de inmediato, registrar que la terminó el docente y conservarla en el historial. El sistema MUST NOT enviar más recordatorios de vencimiento para esa suscripción.

#### Scenario: Baja anticipada
- **WHEN** un docente quita una suscripción activa
- **THEN** la suscripción queda inactiva, atribuida al docente, y sigue listada en el historial

### Requirement: Agregar de nuevo un par inactivo abre un plazo nuevo
El sistema MUST permitir que un docente agregue un par que solo existe como historial inactivo. El sistema MUST crear una suscripción activa nueva con un plazo fresco de 30 días y MUST dejar la fila inactiva anterior sin cambios.

#### Scenario: Suscribirse otra vez tras vencer
- **WHEN** un docente agrega un par cuya única fila existente está inactiva
- **THEN** existe una suscripción activa nueva por 30 días y la fila inactiva permanece

### Requirement: Cuatro recordatorios de vencimiento
Por cada suscripción activa, el sistema MUST enviar como máximo cuatro correos de recordatorio al correo de la cuenta: cuando falten 7, 3, 2 y 0 días para el vencimiento, medidos en días calendario de America/Costa_Rica. Cada recordatorio MUST enviarse como máximo una vez. Cada recordatorio MUST incluir un enlace para que el docente vuelva a agregar ese par. Si más de un recordatorio vence antes de enviar alguno, el sistema MUST enviar solo el más urgente y MUST marcar los anteriores no enviados como omitidos. El recordatorio del día de vencimiento MUST enviarse mientras la suscripción siga activa.

#### Scenario: Recordatorios en calendario
- **WHEN** una suscripción activa llega a 7, luego 3, luego 2 días y al día de vencimiento
- **THEN** el docente recibe cuatro correos distintos, uno en cada punto

#### Scenario: Ventanas perdidas se colapsan
- **WHEN** no se enviaron los recordatorios de 7 y 3 días y la suscripción está a 2 días del vencimiento
- **THEN** el sistema envía solo el recordatorio de 2 días y no envía los de 7 ni 3 días

#### Scenario: Suscripción quitada omite recordatorios restantes
- **WHEN** un docente quita una suscripción antes de que corresponda un recordatorio
- **THEN** el sistema no envía más recordatorios para esa suscripción

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
Cada suscripción inactiva MUST mostrarse como fila de historial con la especialidad y la misma regla de etiqueta de regional que una ficha activa. Cuando `endReason` es `removed`, la fila MUST decir "La quitaste". Cuando `endReason` es `expired`, la fila MUST decir "Venció". Cuando `endReason` falta o tiene otro valor, la fila MUST omitir esa frase. La fila MUST NOT mostrar los códigos `removed` ni `expired`.

#### Scenario: La quitó el docente
- **WHEN** una suscripción inactiva tiene `endReason` `removed`
- **THEN** la fila de historial dice "La quitaste" y no dice `removed`

#### Scenario: Venció el plazo
- **WHEN** una suscripción inactiva tiene `endReason` `expired`
- **THEN** la fila de historial dice "Venció" y no dice `expired`

#### Scenario: Motivo ausente
- **WHEN** una suscripción inactiva no tiene `endReason`
- **THEN** la fila no dice "La quitaste", ni "Venció", ni un código de motivo

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
Mientras la página aún no recibe el primer resultado de las suscripciones del docente y el primer resultado del catálogo de regionales, MUST mostrar un indicador de carga. Durante la carga, la página MUST NOT mostrar fichas activas, filas de historial, el conteo, ni los mensajes de lista vacía o de historial vacío. Al recibir ambos resultados, el indicador MUST desaparecer y la página MUST mostrar las fichas, el conteo y los mensajes que correspondan. Si alguna de las dos lecturas falla, el indicador MUST desaparecer y la página MUST mostrar el error. El catálogo de especialidades MUST NOT retrasar el fin de la carga.

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
Cada fila de historial cuyo par de regional y especialidad no tiene una suscripción activa del mismo docente MUST ofrecer la acción "Agregar de nuevo". Esa acción MUST crear una suscripción activa nueva para el par guardado en esa fila, con un plazo fresco de 30 días, y MUST dejar la fila inactiva sin cambios. MUST NOT usar la regional ni la especialidad elegidas en el formulario. Cuando ya existe una suscripción activa de ese mismo par, la fila de historial MUST NOT ofrecer "Agregar de nuevo". Si hay varias filas de historial del mismo par, cada una MUST ofrecer la acción mientras ninguna activa de ese par exista, y MUST dejar de ofrecerla en cuanto exista una.

#### Scenario: Reabrir un par vencido
- **WHEN** el docente usa "Agregar de nuevo" en una fila inactiva y no tiene una activa de ese par
- **THEN** aparece una suscripción activa nueva de ese par y la fila inactiva sigue en el historial

#### Scenario: El par ya está activo
- **WHEN** el docente ya tiene una suscripción activa para el mismo par de una fila inactiva
- **THEN** esa fila de historial no ofrece "Agregar de nuevo"

#### Scenario: Quitar la activa devuelve la acción
- **WHEN** el docente quita la suscripción activa de un par que también está en el historial
- **THEN** la fila de historial vuelve a ofrecer "Agregar de nuevo"

#### Scenario: El formulario tiene otra selección
- **WHEN** el formulario tiene elegida otra regional u otra especialidad y el docente usa "Agregar de nuevo"
- **THEN** la suscripción nueva usa el par de la fila de historial

### Requirement: El historial se muestra en filas
Cada suscripción inactiva MUST mostrarse como una fila de una lista vertical de una sola columna, bajo el título "Historial". La fila MUST incluir la especialidad, la etiqueta de la regional con la misma regla que una ficha activa, y la frase de motivo: "La quitaste" cuando `endReason` es `removed`, "Venció" cuando es `expired`, y ninguna frase cuando falta o tiene otro valor. La fila MUST NOT mostrar los códigos `removed` ni `expired`. La lista MUST NOT colocar esas filas en una cuadrícula de varias columnas ni con el tratamiento de ficha de las suscripciones activas. En un viewport estrecho la fila MUST seguir siendo una entrada de esa lista. Las suscripciones activas MUST seguir mostrándose como fichas. Cuando el par de la fila no tiene una suscripción activa del mismo docente, "Agregar de nuevo" MUST estar en esa fila.

#### Scenario: Historial y activas a la vez
- **WHEN** un docente verificado tiene al menos una suscripción activa y al menos una inactiva, y la página se ve en un viewport ancho
- **THEN** la activa se muestra como ficha y la inactiva como fila de una lista de una sola columna

#### Scenario: Dos inactivas quedan una bajo la otra
- **WHEN** el docente tiene dos suscripciones inactivas y la página se ve en un viewport ancho
- **THEN** las dos filas quedan una debajo de la otra y no una al lado de la otra

#### Scenario: La fila dice el motivo
- **WHEN** una suscripción inactiva tiene `endReason` `removed`
- **THEN** su fila dice "La quitaste" y no dice `removed`

#### Scenario: Agregar de nuevo sigue en la fila
- **WHEN** el par de una fila de historial no tiene una suscripción activa del mismo docente
- **THEN** "Agregar de nuevo" está en esa fila

#### Scenario: Historial vacío
- **WHEN** el docente no tiene suscripciones inactivas
- **THEN** se ve "Todavía no hay historial." y no hay filas de historial
