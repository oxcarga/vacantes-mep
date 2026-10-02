# Design

## Context

Ver `proposal.md` para el motivo. `apps/gomep-vacantes/src/app/globals.css` ya declara los tokens de shadcn en `:root` y `.dark`, y `@theme inline` los mapea a utilidades (`bg-primary`, `text-muted-foreground`, `ring`). Hoy `--primary` es gris (`oklch(0.205 0 0)` en claro, `oklch(0.922 0 0)` en oscuro). En oscuro, `--sidebar-primary` es otro azul (`oklch(0.488 0.243 264.376)`), un segundo matiz que esta paleta no conserva. `layout.tsx` no pone la clase `dark`: la app se ve en claro. El bloque `.dark` igual existe y hay que dejarlo en la misma familia.

## Goals / Non-Goals

**Goals:**

- Un solo matiz cromático de marca, 255, en `primary`, `ring`, `sidebar-primary` y `chart-1`…`chart-5`.
- Texto sobre `primary` con contraste de al menos 4.5:1.
- La escala neutra y `destructive` siguen como están, para que el cambio de marca no rehaga bordes, fondos ni errores.

**Non-Goals:**

- Maquetar el home ni instalar componentes.
- Activar el tema oscuro en el HTML.

## Decisions

### 1. El azul vive solo en los tokens semánticos

Los componentes siguen usando `bg-primary`, `text-primary-foreground` y `ring`. El único archivo con valores OKLCH de marca es `globals.css`. Una pantalla nueva no declara otro hex ni otro matiz.

Alternativa: un preset de shadcn con `theme=blue`. Ese preset mueve también neutros, radio y a veces la fuente. Aquí los neutros ya están y solo hace falta el acento.

### 2. Valores que cambian

Claro (`:root`):

| Token | Valor | Sobre |
| --- | --- | --- |
| `--primary` | `oklch(0.42 0.14 255)` | fondo de botón y panel de marca |
| `--primary-foreground` | `oklch(0.985 0 0)` | texto sobre primary (contraste ~8.2:1) |
| `--ring` | `oklch(0.55 0.12 255)` | anillo de foco |
| `--sidebar-primary` | `oklch(0.42 0.14 255)` | igual que primary |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)` | texto sobre ese acento |
| `--chart-1` | `oklch(0.55 0.14 255)` | |
| `--chart-2` | `oklch(0.68 0.10 255)` | |
| `--chart-3` | `oklch(0.42 0.14 255)` | |
| `--chart-4` | `oklch(0.78 0.06 255)` | |
| `--chart-5` | `oklch(0.32 0.08 255)` | |

Oscuro (`.dark`):

| Token | Valor | Sobre |
| --- | --- | --- |
| `--primary` | `oklch(0.75 0.12 255)` | el mismo matiz, más claro, para leerse sobre fondo oscuro |
| `--primary-foreground` | `oklch(0.22 0.04 255)` | texto oscuro sobre ese azul (contraste ~7.8:1). Blanco sobre este primary queda en ~2.1:1 y no se usa |
| `--ring` | `oklch(0.70 0.10 255)` | |
| `--sidebar-primary` | `oklch(0.75 0.12 255)` | sustituye el azul de matiz 264 |
| `--sidebar-primary-foreground` | `oklch(0.22 0.04 255)` | |
| `--chart-1` | `oklch(0.70 0.12 255)` | |
| `--chart-2` | `oklch(0.78 0.08 255)` | |
| `--chart-3` | `oklch(0.62 0.14 255)` | |
| `--chart-4` | `oklch(0.85 0.05 255)` | |
| `--chart-5` | `oklch(0.50 0.10 255)` | |

### 3. Lo que no se toca

Se conservan los neutros y el destructivo actuales: `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--border`, `--input`, y el resto de `--sidebar-*` que no es primary. También `--radius` y las fuentes Geist.

## Risks / Trade-offs

- [El azul se hereda en vacantes, suscripciones y admin en el mismo cambio de CSS] → Es el efecto buscado: una sola paleta. El layout de esas pantallas no se rehace aquí.
- [El bloque `.dark` no se ve hasta que alguien añada la clase] → Los valores quedan escritos para que ese tema no invente otro azul.
- [Gráficas futuras con cinco azules parecidos] → La rampa de `chart-*` distingue por luminosidad dentro del mismo matiz, en vez de abrir verdes o naranjas.

## Migration Plan

1. Sustituir en `globals.css` solo las custom properties listadas arriba, en `:root` y en `.dark`.
2. Comprobar en el home actual que el botón principal y el anillo de foco salen de este azul, y que el texto de los campos sigue en el neutro.
3. Rollback: revertir `globals.css`. No hay datos ni esquema que migrar.
