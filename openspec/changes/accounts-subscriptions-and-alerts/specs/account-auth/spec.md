# Delta de especificación

## Propósito

Permitir que un docente cree una cuenta con correo y contraseña, demuestre que es dueño del correo y vuelva a entrar después.

## ADDED Requirements

### Requirement: El registro recoge los datos de identidad
El sistema MUST crear una cuenta solo cuando la persona proporcione correo, contraseña, teléfono y nombre. El sistema MUST guardar esos cuatro valores en el perfil de la cuenta. El sistema MUST NOT ofrecer inicio de sesión con Google.

#### Escenario: Registro completo
- **CUANDO** un visitante envía correo, contraseña, teléfono y nombre
- **ENTONCES** el sistema crea una cuenta con esos valores en el perfil y verificación de correo pendiente

#### Escenario: Campo faltante
- **CUANDO** un visitante envía un registro sin correo, contraseña, teléfono o nombre
- **ENTONCES** el sistema rechaza crear la cuenta e indica qué campo falta

### Requirement: El primer acceso exige un enlace de verificación por correo
El sistema MUST enviar un enlace de verificación al correo del registro. Hasta confirmar ese enlace, el sistema MUST NOT permitir ver vacantes, crear suscripciones ni abrir la pantalla de admin. El sistema MUST iniciar sesión en la cuenta una vez confirmado el enlace.

#### Escenario: Cuenta no verificada bloqueada
- **CUANDO** una persona entra antes de confirmar el enlace de verificación
- **ENTONCES** el sistema indica que el correo sigue sin verificar y no muestra vacantes, suscripciones ni pantallas de admin

#### Escenario: El enlace de verificación confirma la cuenta
- **CUANDO** la persona abre un enlace de verificación válido
- **ENTONCES** el sistema marca el correo como verificado y permite la experiencia de docente

### Requirement: Los accesos posteriores usan magic link por correo o la contraseña del registro
Tras verificar el correo, el sistema MUST permitir entrar pidiendo un magic link a ese correo o ingresando la contraseña del registro. Un magic link MUST iniciar sesión solo en la cuenta dueña de ese correo y solo mientras el enlace sea válido.

#### Escenario: Inicio con magic link
- **CUANDO** una persona verificada pide un magic link y lo abre
- **ENTONCES** el sistema inicia sesión en esa cuenta

#### Escenario: Inicio con contraseña
- **CUANDO** una persona verificada envía el correo y la contraseña del registro
- **ENTONCES** el sistema inicia sesión en esa cuenta

#### Escenario: Magic link vencido o reutilizado
- **CUANDO** una persona abre un magic link vencido o ya usado
- **ENTONCES** el sistema rechaza el inicio de sesión y no crea sesión
