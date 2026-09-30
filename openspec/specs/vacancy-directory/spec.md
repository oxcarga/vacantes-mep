# vacancy-directory Specification

## Purpose

Mostrar vacantes abiertas a los docentes y el historial completo a los admins, sin borrar una vacante al cerrarse.

## Requirements

### Requirement: Un docente ve vacantes abiertas
Un docente verificado MUST poder listar todas las vacantes actualmente abiertas, en todas las regionales. La lista MUST excluir las vacantes cerradas. Un docente MUST NOT necesitar una suscripción para ver esta lista.

#### Scenario: Hay vacantes abiertas y cerradas
- **WHEN** un docente verificado abre el listado de vacantes y hay vacantes abiertas y cerradas almacenadas
- **THEN** la lista contiene las abiertas y omite las cerradas

### Requirement: Un admin ve vacantes abiertas y cerradas
Un admin MUST poder listar todas las vacantes almacenadas, abiertas o cerradas, y MUST poder distinguir las cerradas. Un admin MUST poder listar todas las cuentas, todas las suscripciones incluido historial inactivo, cada regional y cada especialidad.

#### Scenario: Historial de vacantes del admin
- **WHEN** un admin abre el listado de vacantes
- **THEN** la lista incluye vacantes abiertas y cerradas e identifica las cerradas

#### Scenario: Admin lee catálogos y personas
- **WHEN** un admin abre las pantallas de administración
- **THEN** el admin puede ver cuentas, suscripciones activas e inactivas, regionales y especialidades

### Requirement: Cerrar una vacante la conserva
Cuando una vacante desaparece de la página del MEP, el sistema MUST conservar la vacante almacenada y marcarla como cerrada. El sistema MUST NOT borrarla. Un scrape posterior que siga viendo la vacante MUST mantener la hora original de primera vista.

#### Scenario: La vacante sale de la página del MEP
- **WHEN** un scrape ya no encuentra una vacante que antes estaba abierta
- **THEN** la vacante sigue almacenada y queda marcada como cerrada

#### Scenario: La vacante sigue abierta
- **WHEN** un scrape posterior sigue encontrando una vacante ya almacenada
- **THEN** la vacante sigue abierta y su hora de primera vista no cambia

### Requirement: Visitantes sin sesión o sin verificar no ven vacantes
El sistema MUST NOT mostrar datos de vacantes, catálogos, cuentas ni suscripciones a un visitante sin sesión ni a una cuenta cuyo correo no esté verificado.

#### Scenario: Visitante sin sesión
- **WHEN** un visitante sin sesión pide el listado de vacantes
- **THEN** el sistema no devuelve datos de vacantes
