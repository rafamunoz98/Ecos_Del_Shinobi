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
