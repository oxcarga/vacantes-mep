# account-roles Specification

## Purpose

Separar docentes de admins para que cada cuenta vea solo las pantallas y acciones de su rol.

## Requirements

### Requirement: Las cuentas nuevas son docentes salvo lista de admin
El sistema MUST asignar el rol `docente` a cada cuenta nueva cuyo correo no esté en la lista configurada de admins. El sistema MUST asignar el rol `admin` cuando el correo del registro esté en esa lista. El rol MUST estar disponible para comprobaciones de autorización durante la sesión.

#### Scenario: Registro ordinario
- **WHEN** una persona crea una cuenta con un correo que no está en la lista de admins
- **THEN** el rol de la cuenta es `docente`

#### Scenario: Registro en lista de admins
- **WHEN** una persona crea una cuenta con un correo en la lista de admins
- **THEN** el rol de la cuenta es `admin`

### Requirement: Un admin puede cambiar el rol de otra cuenta
Un admin MUST poder fijar el rol de otra cuenta en `docente` o `admin`. Un docente MUST NOT poder cambiar ningún rol. El sistema MUST rechazar un cambio que deje cero cuentas con rol `admin`.

#### Scenario: Promover un docente
- **WHEN** un admin cambia una cuenta docente a `admin`
- **THEN** esa cuenta puede abrir las pantallas de admin en su siguiente petición autorizada

#### Scenario: Degradar un admin mientras queda otro
- **WHEN** un admin cambia otra cuenta admin a `docente` y queda al menos un admin más
- **THEN** la cuenta degradada pierde las pantallas de admin

#### Scenario: No se puede degradar al último admin
- **WHEN** un admin intenta cambiar la única cuenta admin restante a `docente`
- **THEN** el sistema mantiene esa cuenta como `admin` e informa que no se puede quitar al último admin

### Requirement: Un admin no puede suscribirse
El sistema MUST rechazar solicitudes de crear o quitar suscripciones desde una cuenta admin. Un admin MUST poder leer todas las suscripciones, incluido el historial inactivo.

#### Scenario: Admin intenta suscribirse
- **WHEN** un admin envía un par regional y especialidad
- **THEN** el sistema no crea una suscripción
