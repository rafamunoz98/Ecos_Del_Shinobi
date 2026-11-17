# Ecos del Shinobi

Roguelike RPG táctico por turnos y casillas, de vista cenital, con ambientación ninja original.
Stack: TypeScript + Phaser 3 + Vite + Vitest. El núcleo de reglas (`src/core`) no depende de Phaser ni del DOM.

## Cómo ejecutarlo

```bash
npm install
npm run dev        # servidor de desarrollo
npm test           # pruebas del núcleo
npm run typecheck
npm run lint
npm run build
```

`?seed=123` en la URL reproduce una expedición concreta.

## Controles (escritorio)

| Tecla | Acción |
|---|---|
| Flechas / WASD | Mover; si hay un enemigo en esa casilla, atacarlo |
| Espacio | Esperar (recupera 1 de kiro) |
| E | Inspeccionar / interactuar (cofre, salida) |
| T | Apuntar la técnica; flechas mueven el cursor, Enter confirma, Esc cancela |
| 1 / 2 | Tónico de Kiro / Ungüento de Musgo |
| Rueda del ratón | Zoom |
| R | Nueva expedición |

## Estado frente a la hoja de ruta

- **Hito 0** Proyecto base, scripts, lint, CI.
- **Hito 1** Mapa de tiles, movimiento ortogonal, colisiones, cámara con zoom, teclado, niebla de guerra.
- **Hito 2** Motor de turnos con comandos validados, enemigo que persigue (Acechador de Hollín), esperar, registro de combate.
- **Hito 3** Vida, daño, ataque básico, kiro, técnica Brasa Circular (área, coste visible, quemadura), muerte y pantalla de resultado.
- **Hito 4 (parcial)** Cofre con botín por tabla, consumibles, salida. Faltan experiencia, equipo y cambio de sector.
- Siguiente: Hito 4 restante y Hito 5 (generación procedural).

## Estructura

```text
src/core/          reglas puras: estado, comandos, turnos, combate, grid, rng
src/content/       datos: técnicas, objetos, enemigos, balance, sala del prototipo
src/dungeon/       parser de salas ASCII (y, más adelante, generador)
src/presentation/  escena Phaser
src/ui/            HUD en DOM y estilos
src/tests/         pruebas (Vitest)
```

## Decisiones aplicadas del documento de decisiones

- Movimiento solo ortogonal.
- Extracción voluntaria no disponible (`Extract` se rechaza con mensaje).
- Mapa con niebla: solo se ve lo visitado; los enemigos solo se dibujan dentro del rango de visión.
- Combate en el mismo mapa, sin pantallas aparte.
- Tamaño de tile: `TILE = 32` en `src/presentation/GameScene.ts`, fácil de cambiar.

## Reglas de calidad del núcleo

Una acción inválida devuelve el mismo estado y no consume turno; una válida activa una sola ronda enemiga.
La aleatoriedad usa una semilla guardada en el estado (nunca `Math.random()`).
El estado es JSON plano, listo para guardado versionado (`schemaVersion`).

## Originalidad

Universo, nombres, técnicas y diseños propios. No se usan recursos de Naruto ni de otras franquicias.
Los gráficos actuales son rectángulos de marcador: el pixel art propio se registrará con autor y licencia.
