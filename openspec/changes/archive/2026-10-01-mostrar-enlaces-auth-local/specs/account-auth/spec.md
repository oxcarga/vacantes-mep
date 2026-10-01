# Spec Delta

## ADDED Requirements

### Requirement: En local el enlace de verificación aparece bajo Crear cuenta
Cuando la app corre en local —emulador de autenticación y host de loopback, como `localhost` o `127.0.0.1`— y un registro termina con éxito, el sistema MUST mostrar el enlace de verificación de ese correo justo debajo del botón «Crear cuenta», como enlace que se puede abrir. Ese enlace MUST ser el de la cuenta recién creada. El sistema MUST dejar el formulario de registro a la vista y MUST NOT ir a otra pantalla al crear la cuenta. Abrir ese enlace MUST verificar el correo. Si el enlace no se puede obtener, el sistema MUST indicarlo debajo del botón y MUST NOT mostrar un enlace de otra cuenta. Fuera de local, el sistema MUST NOT mostrar el enlace en la pantalla y, tras crear la cuenta, MUST llevar a la persona a la pantalla que indica que el correo sigue sin verificar.

#### Scenario: Registro local muestra el enlace y se queda en el formulario
- **WHEN** una persona en local envía correo, contraseña, teléfono y nombre y pulsa «Crear cuenta»
- **THEN** el enlace de verificación de ese correo aparece debajo de «Crear cuenta» y el formulario de registro sigue a la vista

#### Scenario: Abrir el enlace de verificación local confirma la cuenta
- **WHEN** una persona en local abre el enlace mostrado debajo de «Crear cuenta»
- **THEN** el sistema marca el correo como verificado y permite la experiencia de docente

#### Scenario: El emulador no devuelve el enlace de verificación
- **WHEN** una persona en local crea la cuenta y el enlace de verificación de ese correo no está disponible
- **THEN** el sistema lo indica debajo de «Crear cuenta» y no muestra un enlace

#### Scenario: Fuera de local el registro no muestra el enlace
- **WHEN** una persona fuera de local envía un registro completo y pulsa «Crear cuenta»
- **THEN** la pantalla no muestra el enlace de verificación y pasa a la pantalla de correo sin verificar

### Requirement: En local el magic link aparece bajo Enviar magic link
Cuando la app corre en local y una persona pide un magic link con éxito, el sistema MUST mostrar ese enlace justo debajo del botón «Enviar magic link», como enlace que se puede abrir. Ese enlace MUST ser el de la cuenta de ese correo. Abrirlo MUST iniciar sesión en esa cuenta mientras el enlace sea válido. Si el enlace no se puede obtener, el sistema MUST indicarlo debajo del botón y MUST NOT mostrar un enlace de otra cuenta. Fuera de local, el sistema MUST NOT mostrar el enlace en la pantalla.

#### Scenario: Pedir magic link en local muestra el enlace
- **WHEN** una persona en local pide un magic link para su correo
- **THEN** el magic link de ese correo aparece debajo de «Enviar magic link»

#### Scenario: Abrir el magic link local inicia sesión
- **WHEN** una persona verificada abre el magic link mostrado debajo de «Enviar magic link»
- **THEN** el sistema inicia sesión en esa cuenta

#### Scenario: El emulador no devuelve el magic link
- **WHEN** una persona en local pide un magic link y el enlace de ese correo no está disponible
- **THEN** el sistema lo indica debajo de «Enviar magic link» y no muestra un enlace

#### Scenario: Fuera de local el magic link no se muestra
- **WHEN** una persona fuera de local pide un magic link
- **THEN** la pantalla no muestra el enlace
