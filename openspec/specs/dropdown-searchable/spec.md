# dropdown-searchable Specification

## Purpose

Elegir una o varias opciones de una lista escribiendo dentro del panel, sin que el control conozca el catálogo que lo usa.

## Requirements

### Requirement: El control muestra el resumen y abre la búsqueda
El control MUST permanecer cerrado hasta que se active su botón. Cerrado, sin valores elegidos, MUST mostrar "Todas las {nombre}" cuando recibe un nombre en plural, y "Todas las [...]" cuando no lo recibe. Con un solo valor elegido MUST mostrar la etiqueta de esa opción. Con dos o más MUST mostrar la cantidad, un espacio y el nombre en plural, o "[...]" si el nombre no llegó. El campo de texto MUST estar oculto mientras el control está cerrado y MUST mostrarse dentro del panel al abrirlo. Al abrir, el foco MUST entrar en ese campo y ninguna fila MUST estar resaltada. El control MUST mostrar las opciones en el orden en que las recibe. La selección MUST ser la lista de valores que recibe, y cada cambio MUST informar la lista completa resultante. El control MUST NOT guardar la selección por su cuenta.

#### Scenario: Cerrado sin elección
- **WHEN** el control no tiene valores elegidos y su nombre es "regionales"
- **THEN** el botón dice "Todas las regionales" y el campo de texto no se ve

#### Scenario: Cerrado sin nombre
- **WHEN** el control no tiene valores elegidos y no recibe nombre
- **THEN** el botón dice "Todas las [...]"

#### Scenario: Abrir enfoca el campo
- **WHEN** se abre el control
- **THEN** el campo de texto se ve dentro del panel, tiene el foco y ninguna fila está resaltada

### Requirement: La búsqueda filtra por etiqueta
El texto escrito MUST dejar visibles solo las opciones cuya etiqueta contiene ese texto, sin distinguir mayúsculas ni tildes: "jose" coincide con "San José" y "nino" con "Niño". Las opciones que no coinciden MUST ocultarse y MUST conservar su elección. La fila que vuelve la selección a todas MUST permanecer visible. Si ninguna opción coincide, el panel MUST mostrar "Sin coincidencias". Marcar o desmarcar una opción MUST conservar el texto. Activar la fila de todas, cerrar con clic afuera o cerrar con Escape MUST borrar el texto. Cerrar MUST NOT cambiar la selección, salvo cuando quien cierra es la fila de todas.

#### Scenario: Coincidencia sin tildes
- **WHEN** el panel está abierto y se escribe "jose" y hay una opción "San José"
- **THEN** "San José" sigue visible y una opción "Alajuela" no

#### Scenario: Nada coincide
- **WHEN** el texto no coincide con ninguna etiqueta
- **THEN** la fila de todas sigue visible y el panel muestra "Sin coincidencias"

#### Scenario: Cerrar borra el texto y conserva la elección
- **WHEN** hay una opción elegida, un texto escrito y se cierra el panel con Escape
- **THEN** el texto desaparece, el botón recupera el foco y la opción sigue elegida

### Requirement: La selección única elige una y cierra
Sin pedir selección múltiple, el control MUST aceptar como máximo un valor. Elegir una opción MUST reemplazar a la anterior, cerrar el panel, borrar el texto y devolver el foco al botón. Un máximo recibido en este modo MUST ignorarse. Activar la fila de todas MUST dejar la selección vacía, cerrar el panel y borrar el texto.

#### Scenario: Elegir reemplaza
- **WHEN** ya hay una opción elegida y se elige otra
- **THEN** queda solo la última, el panel se cierra y el botón muestra la etiqueta de la última

#### Scenario: Todas en selección única
- **WHEN** hay una opción elegida y se activa la fila de todas
- **THEN** la selección queda vacía, el panel se cierra y el botón muestra el texto de todas

### Requirement: La selección múltiple marca sin cerrar y respeta el máximo
Con selección múltiple, activar una opción elegida MUST quitarla y activar una no elegida MUST agregarla, sin quitar las demás y sin cerrar el panel. El máximo MUST ser 5 cuando no se indica otro. Con tantas elegidas como el máximo, una opción no elegida MUST verse deshabilitada y MUST NOT agregarse ni con clic ni con Enter. Las ya elegidas MUST poder quitarse. Quitar una MUST volver a permitir agregar. Mientras se está en el máximo y quedan opciones sin elegir, el panel MUST mostrar "Máximo {máximo} {nombre}", o "Máximo {máximo} [...]" si el nombre no llegó. Activar la fila de todas MUST vaciar la selección, borrar el texto y dejar el panel abierto con todas las opciones visibles.

#### Scenario: Dos opciones
- **WHEN** se marcan dos opciones y el nombre es "regionales"
- **THEN** el panel sigue abierto y el botón dice "2 regionales"

#### Scenario: Tope alcanzado
- **WHEN** el máximo es 5, ya hay cinco elegidas y se activa una sexta que no lo está
- **THEN** la sexta no se agrega, se ve deshabilitada y el panel dice "Máximo 5 regionales" si el nombre es "regionales"

#### Scenario: Liberar un cupo
- **WHEN** hay cinco elegidas y se quita una
- **THEN** desaparece el aviso de máximo y se puede agregar otra

#### Scenario: Todas en selección múltiple
- **WHEN** hay opciones elegidas y se activa la fila de todas
- **THEN** la selección queda vacía, el texto de búsqueda desaparece y el panel sigue abierto

### Requirement: El teclado recorre las filas visibles y Enter las activa
Con el foco en el campo y el texto vacío, Enter MUST NOT cambiar la selección hasta que una flecha resalte una fila. Flecha abajo desde el campo MUST resaltar primero la fila de todas y después las opciones visibles, de arriba abajo. Flecha arriba MUST empezar por la última opción visible. En cuanto el texto deja al menos una opción visible, el resalte MUST pasar a la primera que coincide, y Enter MUST activarla. Si el texto no deja ninguna opción, MUST desaparecer el resalte y Enter MUST NOT cambiar la selección. La barra espaciadora MUST escribir en el campo. Escape MUST cerrar el panel, borrar el texto y devolver el foco al botón. Tab MUST cerrar el panel y llevar el foco al control siguiente. Enter y las flechas sobre una fila deshabilitada por el máximo MUST NOT agregarla.

#### Scenario: Enter con el texto vacío
- **WHEN** el panel acaba de abrirse y se pulsa Enter sin haber usado las flechas
- **THEN** la selección no cambia

#### Scenario: Enter tras escribir
- **WHEN** el texto deja visibles varias opciones
- **THEN** la primera que coincide queda resaltada y Enter la activa

#### Scenario: Escape devuelve el foco
- **WHEN** el panel está abierto y se pulsa Escape
- **THEN** el panel se cierra, el texto desaparece y el foco vuelve al botón
