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
El sistema MUST enviar un enlace de verificación al correo del registro. Hasta confirmar ese enlace, el sistema MUST NOT permitir ver vacantes, crear suscripciones ni abrir la pantalla de admin. El sistema MUST iniciar sesión en la cuenta una vez confirmado el enlace.

#### Scenario: Cuenta no verificada bloqueada
- **WHEN** una persona entra antes de confirmar el enlace de verificación
- **THEN** el sistema indica que el correo sigue sin verificar y no muestra vacantes, suscripciones ni pantallas de admin

#### Scenario: El enlace de verificación confirma la cuenta
- **WHEN** la persona abre un enlace de verificación válido
- **THEN** el sistema marca el correo como verificado y permite la experiencia de docente

### Requirement: Los accesos posteriores usan magic link por correo o la contraseña del registro
Tras verificar el correo, el sistema MUST permitir entrar pidiendo un magic link a ese correo o ingresando la contraseña del registro. Un magic link MUST iniciar sesión solo en la cuenta dueña de ese correo y solo mientras el enlace sea válido.

#### Scenario: Inicio con magic link
- **WHEN** una persona verificada pide un magic link y lo abre
- **THEN** el sistema inicia sesión en esa cuenta

#### Scenario: Inicio con contraseña
- **WHEN** una persona verificada envía el correo y la contraseña del registro
- **THEN** el sistema inicia sesión en esa cuenta

#### Scenario: Magic link vencido o reutilizado
- **WHEN** una persona abre un magic link vencido o ya usado
- **THEN** el sistema rechaza el inicio de sesión y no crea sesión
