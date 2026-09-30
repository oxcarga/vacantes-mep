# Delta de especificación

## Propósito

Enviar un correo a cada docente que coincida cuando el scrape detecta una vacante recién publicada.

## ADDED Requirements

### Requirement: Un correo por vacante nueva que coincida
Cuando un scrape registra una vacante como recién agregada, el sistema MUST enviar un correo a cada docente verificado con una suscripción activa y no vencida para la regional y especialidad de esa vacante. El correo MUST indicar el número de vacante, especialidad, regional e institución, y MUST incluir el enlace de aplicar guardado para esa vacante. El sistema MUST enviar un correo separado por cada vacante nueva, aunque varias coincidan con la misma suscripción en un scrape.

#### Escenario: Suscriptor que coincide
- **CUANDO** un scrape agrega una vacante y un docente tiene una suscripción activa no vencida para su regional y especialidad
- **ENTONCES** ese docente recibe un correo por esa vacante con número, especialidad, regional, institución y enlace de aplicar

#### Escenario: Varias vacantes nuevas
- **CUANDO** un scrape agrega tres vacantes que coinciden con la misma suscripción activa
- **ENTONCES** ese docente recibe tres correos

### Requirement: Vacantes cerradas, editadas o ya abiertas no generan correo
El sistema MUST NOT enviar correo de vacante cuando cambian los datos de una vacante abierta, cuando una vacante se cierra, ni cuando un docente se suscribe a un par que ya tiene vacantes abiertas. El sistema MUST enviar correo de vacante cuando una vacante antes cerrada se publica de nuevo y el scrape la trata como recién agregada.

#### Escenario: Cambio de detalle
- **CUANDO** un scrape actualiza campos de una vacante que ya estaba abierta
- **ENTONCES** ningún suscriptor recibe correo de vacante por esa actualización

#### Escenario: Cierre
- **CUANDO** un scrape marca una vacante como cerrada
- **ENTONCES** ningún suscriptor recibe correo de vacante por ese cierre

#### Escenario: Suscribirse a un par ya abierto
- **CUANDO** un docente crea una suscripción para un par que ya tiene vacantes abiertas
- **ENTONCES** el sistema no envía correo de vacante por esas vacantes existentes

#### Escenario: Vacante publicada otra vez
- **CUANDO** una vacante que estaba cerrada se publica de nuevo y el scrape la registra como recién agregada
- **ENTONCES** cada suscriptor activo no vencido de ese par recibe un correo

### Requirement: Las suscripciones inactivas no reciben nada
El sistema MUST NOT enviar correos de vacante ni recordatorios de vencimiento a una suscripción inactiva o pasado su instante de vencimiento, aunque el estado inactivo aún no se haya escrito.

#### Escenario: Vencida pero aún no marcada
- **CUANDO** se agrega una vacante que coincide después del instante de vencimiento de una suscripción y antes de marcarla inactiva
- **ENTONCES** el docente no recibe correo de vacante por esa suscripción
