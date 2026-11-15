# Arquitectura técnica

## 1. Objetivo

Compartir la lógica de juego entre navegador y futuras aplicaciones, minimizando dependencias de plataforma.

## 2. Stack propuesto

- TypeScript.
- Phaser 3 para renderizado, escenas, cámara, input y audio.
- Vite como servidor de desarrollo y empaquetador.
- Vitest para pruebas unitarias.
- IndexedDB para partidas locales (puede iniciarse con LocalStorage durante el prototipo).
- Capacitor para empaquetar la aplicación móvil cuando exista una versión web estable.
- Git y GitHub para control de versiones.

Revisar versiones y compatibilidad al iniciar el proyecto; no fijar versiones antiguas copiadas de tutoriales.

## 3. Principio arquitectónico

**Core sin Phaser.** Las reglas del juego no importan clases de Phaser ni acceden al DOM. Phaser consume el estado y envía acciones al core.

Capas:
1. `core/`: reglas puras, turnos, combate, movimiento y estado.
2. `content/`: definiciones de clases, enemigos, objetos y niveles.
3. `platform/`: persistencia, audio y funciones específicas de dispositivo.
4. `presentation/`: escenas Phaser, animaciones, cámara y efectos.
5. `ui/`: HUD, menús, inventario y accesibilidad.

## 4. Estructura recomendada

```text
src/
  core/
    GameState.ts
    TurnEngine.ts
    Action.ts
    CombatSystem.ts
    MovementSystem.ts
    VisibilitySystem.ts
    Random.ts
  content/
    classes/
    enemies/
    items/
    rooms/
    events/
  dungeon/
    DungeonGenerator.ts
    Pathfinding.ts
    TileMap.ts
  entities/
    Player.ts
    Enemy.ts
    ItemDrop.ts
  platform/
    SaveRepository.ts
    AudioService.ts
    DeviceAdapter.ts
  presentation/
    scenes/
    renderers/
    animations/
  ui/
    hud/
    menus/
    inventory/
  tests/
index.html
```

## 5. Modelo de estado

El estado de partida debe ser serializable y no contener objetos Phaser:
- `runId`
- `seed`
- `floor`
- `turn`
- `map`
- `player`
- `enemies`
- `items`
- `effects`
- `metaProgress`

Separar definición estática (`EnemyDefinition`) de instancia en partida (`EnemyState`).

## 6. Acciones y eventos

Las acciones son comandos del jugador. El motor devuelve un nuevo estado y eventos de presentación, por ejemplo:
- `PlayerMoved`
- `AttackResolved`
- `DamageApplied`
- `ItemConsumed`
- `EnemyDied`
- `FloorChanged`

Las escenas Phaser reproducen animaciones al recibir eventos, sin decidir el resultado del combate.

## 7. Aleatoriedad reproducible

Utilizar un generador pseudoaleatorio con semilla. No usar `Math.random()` disperso por el código. Inyectar una interfaz `RandomSource` para pruebas y partidas reproducibles.

## 8. Persistencia

Definir interfaz `SaveRepository` con operaciones `save`, `load`, `delete` y `list`. Implementación web inicial: IndexedDB. La lógica de juego no debe conocer IndexedDB ni Capacitor.

## 9. Adaptación a móvil

- Phaser se renderiza dentro de la app Capacitor.
- Añadir controles táctiles: cruceta o toque de casilla, botones de acción y paneles.
- Adaptar HUD a pantallas pequeñas.
- Gestionar pausa al cambiar de app o bloquear pantalla.
- Probar diferentes relaciones de aspecto y densidades.
- Revisar permisos, políticas de tienda, firma y privacidad antes de publicar.

## 10. Seguridad y backend

Para el juego individual inicial no hace falta backend. Si más adelante hay cuentas, compras, rankings o sincronización:
- validar compras en servidor;
- no confiar en puntuaciones enviadas por cliente;
- proteger datos personales;
- implementar autenticación segura;
- establecer copias de seguridad y política de borrado.

## 11. Calidad de código

- TypeScript en modo estricto.
- Lint y formato automáticos.
- Pruebas unitarias para reglas.
- Pruebas de generación para mapas.
- Evitar dependencias circulares.
- Cada cambio pequeño debe dejar el juego ejecutable.
