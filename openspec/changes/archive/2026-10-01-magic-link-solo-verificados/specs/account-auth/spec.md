# Spec Delta

## MODIFIED Requirements

### Requirement: El primer acceso exige un enlace de verificación por correo
El sistema MUST enviar un enlace de verificación al correo del registro. Hasta confirmar ese enlace, el sistema MUST NOT permitir ver vacantes, crear suscripciones ni abrir la pantalla de admin. Confirmar el enlace MUST marcar el correo como verificado y MUST NOT iniciar sesión por sí solo. Si la persona ya tiene sesión al confirmarlo, el sistema MUST permitir la experiencia de docente. Si no tiene sesión, el sistema MUST indicar que el correo quedó verificado y que puede volver a Entrar a pedir el magic link, y MUST NOT mostrar vacantes, suscripciones ni pantallas de admin.

#### Scenario: Cuenta no verificada bloqueada
- **WHEN** una persona entra antes de confirmar el enlace de verificación
- **THEN** el sistema indica que el correo sigue sin verificar y no muestra vacantes, suscripciones ni pantallas de admin

#### Scenario: El enlace de verificación confirma la cuenta
- **WHEN** una persona con sesión abre un enlace de verificación válido
- **THEN** el sistema marca el correo como verificado y permite la experiencia de docente

#### Scenario: El enlace de verificación sin sesión no entra a la app
- **WHEN** una persona sin sesión abre un enlace de verificación válido
- **THEN** el sistema marca el correo como verificado, indica que ya puede volver a Entrar a pedir el magic link, y no muestra vacantes, suscripciones ni pantallas de admin

### Requirement: En local el magic link aparece bajo Enviar magic link
Cuando la app corre en local y una cuenta con el correo verificado pide un magic link con éxito, el sistema MUST mostrar ese enlace justo debajo del botón «Enviar magic link», como enlace que se puede abrir. Ese enlace MUST ser el de la cuenta de ese correo. Abrirlo MUST iniciar sesión en esa cuenta mientras el enlace sea válido. Si la cuenta existe y el correo no está verificado, el sistema MUST mostrar ahí el enlace de verificación de ese correo, y MUST NOT mostrar un magic link. Si no hay cuenta, el sistema MUST NOT mostrar un enlace. Si el enlace que correspondía no se puede obtener, el sistema MUST indicarlo debajo del botón y MUST NOT mostrar un enlace de otra cuenta. Fuera de local, el sistema MUST NOT mostrar ningún enlace en la pantalla.

#### Scenario: Pedir magic link en local muestra el enlace
- **WHEN** una persona en local pide un magic link para un correo ya verificado
- **THEN** el magic link de ese correo aparece debajo de «Enviar magic link»

#### Scenario: Cuenta sin verificar en local muestra el enlace de verificación
- **WHEN** una persona en local pide un magic link para un correo registrado que aún no está verificado
- **THEN** el enlace de verificación de ese correo aparece debajo de «Enviar magic link» y no aparece un magic link

#### Scenario: Correo sin cuenta en local no muestra enlace
- **WHEN** una persona en local pide un magic link para un correo sin cuenta
- **THEN** debajo de «Enviar magic link» no aparece ningún enlace

#### Scenario: Abrir el magic link local inicia sesión
- **WHEN** una persona verificada abre el magic link mostrado debajo de «Enviar magic link»
- **THEN** el sistema inicia sesión en esa cuenta

#### Scenario: El emulador no devuelve el magic link
- **WHEN** una persona en local pide un magic link para un correo con cuenta y el enlace que correspondía no está disponible
- **THEN** el sistema lo indica debajo de «Enviar magic link» y no muestra un enlace

#### Scenario: Fuera de local el magic link no se muestra
- **WHEN** una persona fuera de local pide un magic link
- **THEN** la pantalla no muestra ningún enlace

## ADDED Requirements

### Requirement: Enviar magic link solo para una cuenta verificada
El sistema MUST generar y enviar un magic link solo cuando el correo pertenece a una cuenta cuyo correo ya está verificado. Si la cuenta existe y el correo no está verificado, el sistema MUST NOT generar un magic link, MUST generar y enviar un enlace de verificación a ese correo, y MUST indicar en la pantalla que primero hay que validar la cuenta. Si no hay cuenta para ese correo, el sistema MUST NOT generar ningún enlace y MUST indicar en la pantalla que hay que registrarse. Si el envío del enlace de verificación falla, el sistema MUST mostrar el error y MUST NOT indicar que el correo fue enviado.

#### Scenario: Cuenta verificada recibe el magic link
- **WHEN** una persona pide un magic link para un correo ya verificado
- **THEN** el sistema envía el magic link de esa cuenta

#### Scenario: Cuenta sin verificar recibe la verificación
- **WHEN** una persona pide un magic link para un correo registrado que aún no está verificado
- **THEN** el sistema envía el enlace de verificación, no envía un magic link, e indica que primero hay que validar la cuenta

#### Scenario: Correo sin cuenta no recibe enlace
- **WHEN** una persona pide un magic link para un correo sin cuenta
- **THEN** el sistema no envía ningún enlace e indica que hay que registrarse

#### Scenario: Falla el envío de la verificación
- **WHEN** una persona pide un magic link para un correo registrado sin verificar y el envío del enlace de verificación falla
- **THEN** el sistema muestra el error y no indica que el correo fue enviado
