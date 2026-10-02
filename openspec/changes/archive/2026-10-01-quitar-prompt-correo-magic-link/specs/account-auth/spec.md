# Spec Delta

## MODIFIED Requirements

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
