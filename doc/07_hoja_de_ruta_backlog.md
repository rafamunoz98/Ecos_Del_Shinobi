# Hoja de ruta y backlog

Los tiempos dependen de experiencia, disponibilidad y producción de arte. Priorizar hitos verificables sobre fechas rígidas.

**Estado (17-nov-2026):** Hitos 0 a 5 completados en el prototipo (código en la raíz de este repositorio). Siguiente: Hito 6.

## Hito 0 — Preproducción
- [x] Confirmar nombre provisional, resolución y tamaño de tile. *(Nombre provisional; el tile de pantalla no es fijo: zoom de cámara.)*
- [x] Crear repositorio Git.
- [x] Crear proyecto TypeScript + Vite + Phaser.
- [x] Configurar Vitest y lint.
- [x] Mostrar una escena en navegador. *(Probado con un Phaser sustituto sobre Chromium; falta una primera ejecución con `npm run dev` y Phaser real.)*
**Aceptación:** el proyecto arranca y compila.

## Hito 1 — Cuadrícula
- [x] Mapa de tiles.
- [x] Movimiento ortogonal.
- [x] Colisiones.
- [x] Cámara y escala pixel art. *(Zoom con rueda y +/−.)*
- [x] Controles de teclado.
**Aceptación:** moverse por una sala sin atravesar paredes.

## Hito 2 — Turnos y enemigo
- [x] Modelo de acciones.
- [x] Motor de turnos.
- [x] Enemigo que persigue.
- [x] Esperar turno.
- [x] Mensajes de combate.
**Aceptación:** cada acción válida provoca exactamente una respuesta enemiga.

## Hito 3 — Combate y kiro
- [x] Vida y daño.
- [x] Ataque básico.
- [x] Reserva de kiro.
- [x] Una técnica elemental. *(Hecho: diez, dos por afinidad.)*
- [x] Muerte y reinicio.
**Aceptación:** combate táctico completo con costes visibles.

## Hito 4 — Recompensas
- [x] Cofre.
- [x] Consumible.
- [x] Equipo básico. *(Arma y vestimenta, se equipa lo mejor.)*
- [x] Experiencia. *(Niveles, mejora de recursos y técnica avanzada al nivel 3.)*
- [x] Escalera/cambio de sector.
**Aceptación:** explorar, combatir, recoger y avanzar.

## Hito 5 — Generación procedural
- [x] Generador de salas.
- [x] Conexión de salas.
- [x] Entrada y salida alcanzables.
- [x] Colocación de enemigos y botín.
- [x] Semilla reproducible.
- [x] Pruebas sobre muchas semillas. *(150 semillas × 3 sectores.)*
**Aceptación:** mapas conectados y sin entidades dentro de paredes.

## Hito 6 — Vertical slice ninja
- [ ] Un estilo de combate. *(Hoja Errante ya es la base.)*
- [ ] Dos afinidades disponibles o una afinidad completa. *(Hay cinco con dos técnicas cada una; falta pulir y equilibrar.)*
- [ ] Tres enemigos. *(Hay cuatro; falta el Monje Hueco con ataque anunciado.)*
- [ ] Diez técnicas/objetos combinados. *(Hay diez técnicas y dos consumibles.)*
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
- [ ] Pruebas táctiles. *(Todos los dispositivos móviles son objetivo: hace falta un esquema de control táctil.)*
- [ ] Guardado y recuperación.
- [ ] Optimización y manejo de errores.
- [ ] Pruebas con jugadores.
- [ ] Revisar privacidad y licencias.

## Hito 9 — Posible app
Solo después de validar la web: integrar Capacitor, adaptar safe areas, pausa/reanudación, almacenamiento, iconos, firma y requisitos vigentes de tiendas.

## No implementar aún
Multijugador, PvP, ranking online, tienda con dinero real, cuentas, mundo abierto completo y decenas de clanes. Primero validar el bucle central.

## Pendientes conocidos del prototipo
- Equilibrio: simulaciones con un bot sencillo muestran que el sector 2 (primer encuentro con Tirador y Larva) es el pico de dificultad; revisar con jugadores reales.
- Un tirador que retrocede puede alargar la persecución si el jugador no tiene kiro; valorar si debe dejar de huir al quedarse sin espacio o tras N retrocesos.
- Controles táctiles: el prototipo solo se maneja con teclado; el maquetado ya se adapta a pantallas estrechas.
- Gráficos de marcador (rectángulos): sustituir por pixel art propio registrando autoría y licencia.
