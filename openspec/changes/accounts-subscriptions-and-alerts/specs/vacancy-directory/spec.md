# Delta de especificación

## Propósito

Mostrar vacantes abiertas a los docentes y el historial completo a los admins, sin borrar una vacante al cerrarse.

## ADDED Requirements

### Requirement: Un docente ve vacantes abiertas
Un docente verificado MUST poder listar todas las vacantes actualmente abiertas, en todas las regionales. La lista MUST excluir las vacantes cerradas. Un docente MUST NOT necesitar una suscripción para ver esta lista.

#### Escenario: Hay vacantes abiertas y cerradas
- **CUANDO** un docente verificado abre el listado de vacantes y hay vacantes abiertas y cerradas almacenadas
- **ENTONCES** la lista contiene las abiertas y omite las cerradas

### Requirement: Un admin ve vacantes abiertas y cerradas
Un admin MUST poder listar todas las vacantes almacenadas, abiertas o cerradas, y MUST poder distinguir las cerradas. Un admin MUST poder listar todas las cuentas, todas las suscripciones incluido historial inactivo, cada regional y cada especialidad.

#### Escenario: Historial de vacantes del admin
- **CUANDO** un admin abre el listado de vacantes
- **ENTONCES** la lista incluye vacantes abiertas y cerradas e identifica las cerradas

#### Escenario: Admin lee catálogos y personas
- **CUANDO** un admin abre las pantallas de administración
- **ENTONCES** el admin puede ver cuentas, suscripciones activas e inactivas, regionales y especialidades

### Requirement: Cerrar una vacante la conserva
Cuando una vacante desaparece de la página del MEP, el sistema MUST conservar la vacante almacenada y marcarla como cerrada. El sistema MUST NOT borrarla. Un scrape posterior que siga viendo la vacante MUST mantener la hora original de primera vista.

#### Escenario: La vacante sale de la página del MEP
- **CUANDO** un scrape ya no encuentra una vacante que antes estaba abierta
- **ENTONCES** la vacante sigue almacenada y queda marcada como cerrada

#### Escenario: La vacante sigue abierta
- **CUANDO** un scrape posterior sigue encontrando una vacante ya almacenada
- **ENTONCES** la vacante sigue abierta y su hora de primera vista no cambia

### Requirement: Visitantes sin sesión o sin verificar no ven vacantes
El sistema MUST NOT mostrar datos de vacantes, catálogos, cuentas ni suscripciones a un visitante sin sesión ni a una cuenta cuyo correo no esté verificado.

#### Escenario: Visitante sin sesión
- **CUANDO** un visitante sin sesión pide el listado de vacantes
- **ENTONCES** el sistema no devuelve datos de vacantes
