# Hoja de ruta y backlog

Los tiempos dependen de experiencia, disponibilidad y producción de arte. Priorizar hitos verificables sobre fechas rígidas.

**Estado (17-nov-2026):** Hitos 0 a 5 completados en el prototipo (código en la raíz de este repositorio), más el **Hito 5.5** (sigilo, armas y arte). Siguiente: Hito 6.

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

## Hito 5.5 — Sigilo, armas y arte (tras probar el prototipo)
- [x] Arbustos y puertas: tapan la visión, se puede esconder uno, los enemigos solo actúan si te ven (alerta, rastro, golpe furtivo ×2).
- [x] Armas cuerpo a cuerpo: hoja, látigo (alcance 2) y lanza (atraviesa); equipar gasta un turno.
- [x] Armas arrojadizas: shuriken, kunai arrojadizo y senbon; se gastan o se recogen del suelo.
- [x] Menú de personaje (Tab): Estado, Técnicas, Objetos, Armas y Mapa, con descripciones y acciones.
- [x] Motor gráfico propio (vectorial, por sector), personajes y enemigos animados, luz/niebla, efectos de técnicas y armas.
- [x] Controles con ratón/táctil: barra de acciones pulsable y cruceta en pantallas táctiles.
**Aceptación:** esconderse y sorprender es una opción real; el aspecto ya no es de rectángulos de marcador.

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
- Controles táctiles: hay cruceta y barra de acciones pulsables; falta pulirlos con pruebas en dispositivos reales (Hito 8).
- Arte: ya es propio y procedural (ver `05_direccion_artistica_audio.md`). Faltan más fotogramas de animación, altar, sprites de jefe y audio.
- Sigilo: revisar con jugadores si el alcance de percepción (8) y las 8 rondas de alerta son justos; los arbustos podrían tener un coste adicional.
- Fabricación de armas (crafteo): no implementada; decidir si se quiere (materiales, mejora) o si basta con encontrarlas en cofres.
