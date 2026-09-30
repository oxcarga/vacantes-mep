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
