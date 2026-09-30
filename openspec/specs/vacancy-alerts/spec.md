# vacancy-alerts Specification

## Purpose

Enviar un correo a cada docente que coincida cuando el scrape detecta una vacante recién publicada.

## Requirements

### Requirement: Un correo por vacante nueva que coincida
Cuando un scrape registra una vacante como recién agregada, el sistema MUST enviar un correo a cada docente verificado con una suscripción activa y no vencida para la regional y especialidad de esa vacante. El correo MUST indicar el número de vacante, especialidad, regional e institución, y MUST incluir el enlace de aplicar guardado para esa vacante. El sistema MUST enviar un correo separado por cada vacante nueva, aunque varias coincidan con la misma suscripción en un scrape.

#### Scenario: Suscriptor que coincide
- **WHEN** un scrape agrega una vacante y un docente tiene una suscripción activa no vencida para su regional y especialidad
- **THEN** ese docente recibe un correo por esa vacante con número, especialidad, regional, institución y enlace de aplicar

#### Scenario: Varias vacantes nuevas
- **WHEN** un scrape agrega tres vacantes que coinciden con la misma suscripción activa
- **THEN** ese docente recibe tres correos

### Requirement: Vacantes cerradas, editadas o ya abiertas no generan correo
El sistema MUST NOT enviar correo de vacante cuando cambian los datos de una vacante abierta, cuando una vacante se cierra, ni cuando un docente se suscribe a un par que ya tiene vacantes abiertas. El sistema MUST enviar correo de vacante cuando una vacante antes cerrada se publica de nuevo y el scrape la trata como recién agregada.

#### Scenario: Cambio de detalle
- **WHEN** un scrape actualiza campos de una vacante que ya estaba abierta
- **THEN** ningún suscriptor recibe correo de vacante por esa actualización

#### Scenario: Cierre
- **WHEN** un scrape marca una vacante como cerrada
- **THEN** ningún suscriptor recibe correo de vacante por ese cierre

#### Scenario: Suscribirse a un par ya abierto
- **WHEN** un docente crea una suscripción para un par que ya tiene vacantes abiertas
- **THEN** el sistema no envía correo de vacante por esas vacantes existentes

#### Scenario: Vacante publicada otra vez
- **WHEN** una vacante que estaba cerrada se publica de nuevo y el scrape la registra como recién agregada
- **THEN** cada suscriptor activo no vencido de ese par recibe un correo

### Requirement: Las suscripciones inactivas no reciben nada
El sistema MUST NOT enviar correos de vacante ni recordatorios de vencimiento a una suscripción inactiva o pasado su instante de vencimiento, aunque el estado inactivo aún no se haya escrito.

#### Scenario: Vencida pero aún no marcada
- **WHEN** se agrega una vacante que coincide después del instante de vencimiento de una suscripción y antes de marcarla inactiva
- **THEN** el docente no recibe correo de vacante por esa suscripción
