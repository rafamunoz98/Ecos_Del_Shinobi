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
| E | Interactuar: abrir cofre, bajar la escalera |
| Z / X / C | Técnica de la ranura 1 / 2 / 3. Las que se apuntan abren el modo de apuntado: flechas, Enter confirma, Esc cancela. En las de línea, las flechas eligen la dirección |
| 1 / 2 | Tónico de Kiro / Ungüento de Musgo |
| Rueda del ratón, + / − | Zoom |
| R | Nueva expedición |

## Estado frente a la hoja de ruta

- **Hito 0** Proyecto base, scripts, lint, CI.
- **Hito 1** Mapa de tiles, movimiento ortogonal, colisiones, cámara con zoom, teclado, niebla de guerra.
- **Hito 2** Motor de turnos con comandos validados, enemigos que persiguen, esperar, registro de combate.
- **Hito 3** Vida, daño, ataque básico, kiro, técnicas con coste y área visibles, muerte y pantalla de resultado.
- **Hito 4** Cofres con botín por sector, consumibles, equipo (arma y vestimenta), experiencia y niveles, escalera al siguiente sector (3 por expedición).
- **Hito 5** Generador procedural de mapas grandes (64×44) con salas y pasillos, entrada/salida alcanzables, enemigos y cofres colocados sin bloquear caminos, semilla reproducible, pruebas sobre 150 semillas × 3 sectores.
- Siguiente: Hito 6 (vertical slice: jefe, evento, maestro, resumen de expedición).

## Contenido

- **Afinidades:** Ascua, Marea, Vendaval, Piedra y Rayo. Se sortea una al empezar cada expedición con la semilla; cada una tiene una técnica de iniciación y una avanzada que se aprende al nivel 3. Detalle en `08_biblia_de_contenido.md` del proyecto.
- **Enemigos:** Acechador de Hollín, Cuervo de Sal, Larva de Piedra y Tirador de Junco.
- **Mapas:** el tamaño de casilla en pantalla (`TILE` en `src/presentation/GameScene.ts`) es solo de presentación; la cámara sigue al jugador y hace zoom, y las reglas no dependen de él. El tamaño del mapa se configura en `src/content/balance.ts`.

## Estructura

```text
src/core/          reglas puras: estado, comandos, turnos, combate, grid, rng
src/content/       datos: técnicas, afinidades, objetos y equipo, enemigos, balance
src/dungeon/       generador de sectores, colocación de enemigos, parser de salas ASCII
src/presentation/  escena Phaser
src/ui/            HUD en DOM y estilos
src/tests/         pruebas (Vitest)
```

## Decisiones aplicadas del documento de decisiones

- Movimiento solo ortogonal.
- Extracción voluntaria no disponible (`Extract` se rechaza con mensaje).
- Mapa con niebla: solo se ve lo visitado; los enemigos solo se dibujan dentro del rango de visión.
- Combate en el mismo mapa, sin pantallas aparte.
- Sin tamaño de tile fijo: mapas grandes con cámara y zoom.

## Reglas de calidad del núcleo

Una acción inválida devuelve el mismo estado y no consume turno; una válida activa una sola ronda enemiga.
La regeneración natural de vida es de 1 cada 10 rondas.
La aleatoriedad usa una semilla guardada en el estado (nunca `Math.random()`).
El estado es JSON plano, listo para guardado versionado (`schemaVersion`).

## Originalidad

Universo, nombres, técnicas y diseños propios. No se usan recursos de Naruto ni de otras franquicias.
Los gráficos actuales son rectángulos de marcador: el pixel art propio se registrará con autor y licencia.
