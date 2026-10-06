# Spec Delta

## ADDED Requirements

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
