# Arquitectura técnica

## 1. Stack recomendado
TypeScript, Phaser 3, Vite y Vitest. Git para control de versiones. IndexedDB para guardado web cuando sea necesario. Capacitor como posible empaquetador móvil tras validar la versión web. Comprobar versiones y compatibilidad vigentes al crear el repositorio.

## 2. Regla principal: core independiente
Las reglas de turnos, movimiento, combate, técnicas, generación y progresión no importan Phaser ni acceden al DOM. Phaser representa el estado y envía comandos. Esto facilita pruebas y futura adaptación.

## 3. Estructura sugerida
```text
src/
  core/          # estado, acciones, turnos, combate, recursos
  content/       # definiciones de técnicas, clanes, enemigos, objetos
  dungeon/       # mapas, salas, generación, pathfinding
  progression/   # experiencia, árboles, despertares, meta-progreso
  entities/      # jugador, enemigos, invocaciones, drops
  platform/      # guardado, audio, dispositivos
  presentation/  # escenas Phaser, cámara, animaciones
  ui/            # HUD, menús, inventario, árboles de técnicas
  tests/
public/
  assets/
    tiles/
    characters/
    enemies/
    effects/
    ui/
    audio/
```

### 3.1 Módulos añadidos en el Hito 6.9
- `core/terrain.ts`: peligros del suelo, combustibles, agua conectada, muros agrietados y tirada por hash de las búsquedas (sin consumir el generador).
- `content/trinkets.ts`: joyas (anillos y colgantes), efectos pasivos, aspectos por semilla y tirada de botín.
- `content/echo.ts`: registro del eco, validación (`parseEcho`), estadísticas y sector del eco. `presentation/echoStore.ts` lo guarda en `localStorage` con `try/catch` (el core no toca el navegador: la escena lo pasa a `createGame({ echo })`).
- `content/allies.ts` (compañeros por afinidad), `content/story.ts` (prisioneros: un `NpcDef` y un diálogo por afinidad), `presentation/art/companions.ts`.
- El generador añade lo nuevo **después**, con semillas propias (`attempt + 9001` extras del sector, `+ 9101` prisionero, `+ 9201` eco): una semilla produce los mismos mapas, enemigos y botín que antes y solo se le suma lo nuevo.
- `SCHEMA_VERSION` = 11 (`GameState` incorpora `hazards`, `hintedSecrets`, `companion` y `echo`; `Player` incorpora `trinkets`, `strength` e `identified`).

### 3.2 Módulos añadidos en el Hito 6.10
- `presentation/audio/`: **sonido sin archivos** sobre Web Audio, separado en piezas que se pueden probar por separado.
  - `soundMap.ts` (puro): traduce eventos del núcleo en efectos (`cuesFor`) y el estado de la partida en un ánimo de música (`moodFor`: explorar / tensión / jefe / apagada) con una tónica por sector.
  - `synth.ts`: tonos con envolvente y ruido filtrado sobre cualquier `BaseAudioContext` (sirve igual con `OfflineAudioContext`, que se usa para medir niveles sin altavoces). Ruido reproducible, sin `Math.random`.
  - `cues.ts`: los 48 efectos. `music.ts`: compositor generativo con su propio generador (`Composer`, jamás el del juego) y la síntesis de cada capa (koto, bajo, shakuhachi, taiko).
  - `engine.ts`: `AudioEngine` (singleton `audio`): crea el contexto con el primer gesto, mezcla con compresor y una reverberación barata, programa la música por adelantado, se suspende con la pestaña oculta y guarda `{music, sfx}` en `localStorage` (`ecos.audio.v1`, con `try/catch`).
  - `GameScene.dispatch` llama a `audio.play(cuesFor(eventos))` y `audio.setMusic(moodFor(estado))`; si una orden es inválida suena `error`. El núcleo no sabe que existe el audio.
- `presentation/art/motion.ts` (`isTeleport`) decide si un cambio de casilla se anima o se dibuja al instante; `art/fx.ts` añade `searchFx` y `secretFx`.
- Núcleo: evento `PlayerSearched { found }` (en `CALM_EVENTS` de `travel.ts`), `Npc.offer`, `Cost.coins/shards`, `Gain.identify/item`, `Hazard` permanente (`PERMANENT_HAZARD`), `Player.wear` ampliado a joyas, `GameState.challenge`.
- El generador sigue sumando lo nuevo con semillas propias (`attempt + 9301` para las ofrendas del altar), de modo que no cambia el resto del mapa.
- `SCHEMA_VERSION` = 12.

## 4. Modelo de datos
Separar definiciones estáticas de instancias de partida. Estado serializable: runId, seed, floor, turn, map, player, enemies, summons, drops, effects y metaProgress. No guardar instancias Phaser.

## 5. Acciones y eventos
El motor procesa comandos y emite eventos como `PlayerMoved`, `TechniqueCast`, `KiroSpent`, `DamageApplied`, `EnemyDefeated`, `AwakeningUnlocked` y `FloorChanged`. La presentación escucha eventos y reproduce animaciones.

## 6. Aleatoriedad
Usar generador pseudoaleatorio con semilla inyectada. Evitar llamadas dispersas a `Math.random()`. Misma semilla y versión de generador deben producir resultados reproducibles.

## 7. Guardado y portabilidad
Definir interfaz `SaveRepository` con save/load/delete/list. La implementación web usa IndexedDB. El core no conoce IndexedDB ni Capacitor. En móvil, reutilizar la misma interfaz con almacenamiento compatible.

## 8. Pruebas y calidad
TypeScript estricto, lint, formato, pruebas unitarias del core y pruebas de conectividad procedural. Mantener cambios pequeños y ejecutables. Registrar procedencia/licencia de cada recurso.
