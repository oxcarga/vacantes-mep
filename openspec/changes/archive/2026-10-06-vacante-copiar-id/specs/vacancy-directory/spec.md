# Spec Delta

## ADDED Requirements

### Requirement: La ficha del docente copia el ID de la vacante
En cada ficha de vacante abierta del directorio del docente, el directorio MUST mostrar un control de copiar inmediatamente a la derecha del número de vacante visible. El número visible MUST seguir mostrando el prefijo `#` seguido del ID. Activar el control MUST copiar al portapapeles solo el ID de esa vacante, sin el carácter `#`. El control MUST poder activarse con puntero y con teclado. Su nombre accesible MUST indicar que copia el ID de esa vacante. Cuando la copia tiene éxito, el control MUST mostrar una confirmación perceptible de que el ID se copió. Cuando la copia falla, el control MUST NOT mostrar esa confirmación de éxito. El número visible MUST NOT cambiar al copiar.

#### Scenario: Copiar el ID sin el prefijo
- **WHEN** un docente verificado activa el control de copiar en una ficha cuyo número visible es `#1003`
- **THEN** el portapapeles contiene `1003` y la ficha sigue mostrando `#1003`

#### Scenario: La copia se confirma
- **WHEN** un docente verificado activa el control de copiar y la escritura al portapapeles tiene éxito
- **THEN** el control muestra una confirmación perceptible de que el ID se copió

#### Scenario: La copia falla
- **WHEN** un docente verificado activa el control de copiar y la escritura al portapapeles falla
- **THEN** el control no muestra la confirmación de éxito y la ficha sigue mostrando el número con `#`

#### Scenario: El control se nombra
- **WHEN** un docente verificado enfoca el control de copiar de una vacante
- **THEN** el nombre accesible del control indica que copia el ID de esa vacante
