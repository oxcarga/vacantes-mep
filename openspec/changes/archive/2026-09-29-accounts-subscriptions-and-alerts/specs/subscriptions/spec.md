# Delta de especificación

## Propósito

Permitir que un docente verificado vigile pares regional y especialidad durante 30 días, y conservar suscripciones inactivas como historial.

## ADDED Requirements

### Requirement: Un docente puede suscribirse a cualquier par del catálogo
Un docente verificado MUST poder crear una suscripción eligiendo una regional del catálogo de regionales y una especialidad del catálogo de especialidades, incluso un par que nunca haya coincidido en la misma vacante. El docente MUST poder tener más de una suscripción activa. El sistema MUST rechazar una segunda suscripción activa para el mismo docente, regional y especialidad.

#### Escenario: Suscribirse antes de que exista la vacante
- **CUANDO** un docente verificado elige una regional y una especialidad del catálogo que no tienen vacante juntas
- **ENTONCES** el sistema crea una suscripción activa para ese par

#### Escenario: Par activo duplicado
- **CUANDO** un docente ya tiene una suscripción activa para un par y envía otra vez el mismo par
- **ENTONCES** el sistema no crea una segunda suscripción activa

### Requirement: Cada suscripción dura 30 días
El sistema MUST hacer que una suscripción activa venza 30 días después de crearse. Los tiempos MUSTN evaluarse en America/Costa_Rica. Al llegar el instante de vencimiento, el sistema MUST marcar la suscripción como inactiva. Una suscripción inactiva MUST permanecer almacenada como historial y MUST NOT borrarse.

#### Escenario: Termina el plazo
- **CUANDO** han pasado 30 días desde que se creó la suscripción
- **ENTONCES** la suscripción está inactiva y sigue en el historial del docente

### Requirement: Un docente puede quitar una suscripción antes
Un docente verificado MUST poder quitar una de sus suscripciones activas. El sistema MUST marcarla inactiva de inmediato, registrar que la terminó el docente y conservarla en el historial. El sistema MUST NOT enviar más recordatorios de vencimiento para esa suscripción.

#### Escenario: Baja anticipada
- **CUANDO** un docente quita una suscripción activa
- **ENTONCES** la suscripción queda inactiva, atribuida al docente, y sigue listada en el historial

### Requirement: Agregar de nuevo un par inactivo abre un plazo nuevo
El sistema MUST permitir que un docente agregue un par que solo existe como historial inactivo. El sistema MUST crear una suscripción activa nueva con un plazo fresco de 30 días y MUST dejar la fila inactiva anterior sin cambios.

#### Escenario: Suscribirse otra vez tras vencer
- **CUANDO** un docente agrega un par cuya única fila existente está inactiva
- **ENTONCES** existe una suscripción activa nueva por 30 días y la fila inactiva permanece

### Requirement: Cuatro recordatorios de vencimiento
Por cada suscripción activa, el sistema MUST enviar como máximo cuatro correos de recordatorio al correo de la cuenta: cuando falten 7, 3, 2 y 0 días para el vencimiento, medidos en días calendario de America/Costa_Rica. Cada recordatorio MUST enviarse como máximo una vez. Cada recordatorio MUST incluir un enlace para que el docente vuelva a agregar ese par. Si más de un recordatorio vence antes de enviar alguno, el sistema MUST enviar solo el más urgente y MUST marcar los anteriores no enviados como omitidos. El recordatorio del día de vencimiento MUST enviarse mientras la suscripción siga activa.

#### Escenario: Recordatorios en calendario
- **CUANDO** una suscripción activa llega a 7, luego 3, luego 2 días y al día de vencimiento
- **ENTONCES** el docente recibe cuatro correos distintos, uno en cada punto

#### Escenario: Ventanas perdidas se colapsan
- **CUANDO** no se enviaron los recordatorios de 7 y 3 días y la suscripción está a 2 días del vencimiento
- **ENTONCES** el sistema envía solo el recordatorio de 2 días y no envía los de 7 ni 3 días

#### Escenario: Suscripción quitada omite recordatorios restantes
- **CUANDO** un docente quita una suscripción antes de que corresponda un recordatorio
- **ENTONCES** el sistema no envía más recordatorios para esa suscripción
