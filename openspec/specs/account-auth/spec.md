# account-auth Specification

## Purpose

Permitir que un docente cree una cuenta con correo y contraseña, demuestre que es dueño del correo y vuelva a entrar después.

## Requirements

### Requirement: El registro recoge los datos de identidad
El sistema MUST crear una cuenta solo cuando la persona proporcione correo, contraseña, teléfono y nombre. El sistema MUST guardar esos cuatro valores en el perfil de la cuenta. El sistema MUST NOT ofrecer inicio de sesión con Google.

#### Scenario: Registro completo
- **WHEN** un visitante envía correo, contraseña, teléfono y nombre
- **THEN** el sistema crea una cuenta con esos valores en el perfil y verificación de correo pendiente

#### Scenario: Campo faltante
- **WHEN** un visitante envía un registro sin correo, contraseña, teléfono o nombre
- **THEN** el sistema rechaza crear la cuenta e indica qué campo falta

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

### Requirement: Los accesos posteriores usan magic link por correo o la contraseña del registro
Tras verificar el correo, el sistema MUST permitir entrar pidiendo un magic link a ese correo o ingresando la contraseña del registro. Un magic link MUST iniciar sesión solo en la cuenta dueña de ese correo y solo mientras el enlace sea válido. Al completar un magic link, el sistema MUST NOT mostrar un diálogo del navegador que pida o confirme el correo. El sistema MUST iniciar sesión sin ese diálogo cuando el enlace se abre en el mismo navegador donde se pidió, cuando la URL incluye el parámetro `email` de esa cuenta, o cuando ya hay sesión de esa cuenta. Si no está el correo guardado de ese pedido, ni el parámetro `email`, ni una sesión, el sistema MUST rechazar el inicio, MUST NOT crear sesión y MUST NOT mostrar un diálogo. Si el enlace válido ya inició la sesión de esa cuenta, el sistema MUST mantenerla y MUST NOT mostrar el aviso de enlace inválido.

#### Scenario: Inicio con magic link
- **WHEN** una persona verificada pide un magic link y lo abre
- **THEN** el sistema inicia sesión en esa cuenta

#### Scenario: El magic link no pide el correo
- **WHEN** una persona verificada pide un magic link en un navegador y lo abre en ese mismo navegador
- **THEN** el sistema inicia sesión en esa cuenta y no muestra un diálogo para confirmar el correo

#### Scenario: Magic link sin correo guardado ni sesión
- **WHEN** una persona abre un magic link válido sin haberlo pedido en ese navegador, sin el parámetro `email` y sin sesión
- **THEN** el sistema rechaza el inicio, no crea sesión y no muestra un diálogo para escribir el correo

#### Scenario: La sesión ya abierta no produce un error falso
- **WHEN** una persona verificada abre un magic link válido de su cuenta y el sistema ya inició esa sesión
- **THEN** el sistema mantiene la sesión y no muestra el aviso de enlace inválido ni un diálogo

#### Scenario: Inicio con contraseña
- **WHEN** una persona verificada envía el correo y la contraseña del registro
- **THEN** el sistema inicia sesión en esa cuenta

#### Scenario: Magic link vencido o reutilizado
- **WHEN** una persona abre un magic link vencido o ya usado
- **THEN** el sistema rechaza el inicio de sesión y no crea sesión

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
