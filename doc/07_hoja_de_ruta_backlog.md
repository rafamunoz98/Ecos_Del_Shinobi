# Hoja de ruta y backlog

Los tiempos dependen de experiencia, disponibilidad y producción de arte. Priorizar hitos verificables sobre fechas rígidas.

## Hito 0 — Preproducción
- [ ] Confirmar nombre provisional, resolución y tamaño de tile.
- [ ] Crear repositorio Git.
- [ ] Crear proyecto TypeScript + Vite + Phaser.
- [ ] Configurar Vitest y lint.
- [ ] Mostrar una escena en navegador.
**Aceptación:** el proyecto arranca y compila.

## Hito 1 — Cuadrícula
- [ ] Mapa de tiles.
- [ ] Movimiento ortogonal.
- [ ] Colisiones.
- [ ] Cámara y escala pixel art.
- [ ] Controles de teclado.
**Aceptación:** moverse por una sala sin atravesar paredes.

## Hito 2 — Turnos y enemigo
- [ ] Modelo de acciones.
- [ ] Motor de turnos.
- [ ] Enemigo que persigue.
- [ ] Esperar turno.
- [ ] Mensajes de combate.
**Aceptación:** cada acción válida provoca exactamente una respuesta enemiga.

## Hito 3 — Combate y kiro
- [ ] Vida y daño.
- [ ] Ataque básico.
- [ ] Reserva de kiro.
- [ ] Una técnica elemental.
- [ ] Muerte y reinicio.
**Aceptación:** combate táctico completo con costes visibles.

## Hito 4 — Recompensas
- [ ] Cofre.
- [ ] Consumible.
- [ ] Equipo básico.
- [ ] Experiencia.
- [ ] Escalera/cambio de sector.
**Aceptación:** explorar, combatir, recoger y avanzar.

## Hito 5 — Generación procedural
- [ ] Generador de salas.
- [ ] Conexión de salas.
- [ ] Entrada y salida alcanzables.
- [ ] Colocación de enemigos y botín.
- [ ] Semilla reproducible.
- [ ] Pruebas sobre muchas semillas.
**Aceptación:** mapas conectados y sin entidades dentro de paredes.

## Hito 6 — Vertical slice ninja
- [ ] Un estilo de combate.
- [ ] Dos afinidades disponibles o una afinidad completa.
- [ ] Tres enemigos.
- [ ] Diez técnicas/objetos combinados.
- [ ] Un guardián de sector.
- [ ] Un evento y un maestro.
- [ ] Resumen de expedición.
**Aceptación:** una expedición corta tiene inicio, decisiones, jefe y final.

## Hito 7 — Progresión
- [ ] Árbol de técnicas.
- [ ] Desbloqueos permanentes.
- [ ] Un linaje original.
- [ ] Una transformación.
- [ ] Refugio básico.
**Aceptación:** una segunda expedición ofrece una opción nueva y perceptible.

## Hito 8 — Beta web
- [ ] Pruebas en navegadores principales.
- [ ] Pruebas táctiles.
- [ ] Guardado y recuperación.
- [ ] Optimización y manejo de errores.
- [ ] Pruebas con jugadores.
- [ ] Revisar privacidad y licencias.

## Hito 9 — Posible app
Solo después de validar la web: integrar Capacitor, adaptar safe areas, pausa/reanudación, almacenamiento, iconos, firma y requisitos vigentes de tiendas.

## No implementar aún
Multijugador, PvP, ranking online, tienda con dinero real, cuentas, mundo abierto completo y decenas de clanes. Primero validar el bucle central.
