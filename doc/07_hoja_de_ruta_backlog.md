# Hoja de ruta y backlog

Los tiempos dependen de experiencia, disponibilidad y producción de arte. Priorizar hitos verificables sobre fechas rígidas.

**Estado (19-nov-2026):** Hitos 0 a 5 completados en el prototipo (código en la raíz de este repositorio), más el **Hito 5.5** (sigilo, armas y arte), el Hito 6 (vertical slice) y el **Hito 6.5** (botín, llaves y forja). Siguiente: Hito 7 (progresión permanente).

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

## Hito 6 — Vertical slice ninja **[Completado]**
- [x] Un estilo de combate. *(Hoja Errante es la base.)*
- [x] Una afinidad por expedición, sorteada entre cinco (cada una con dos técnicas).
- [x] Seis enemigos: Acechador, Cuervo, Larva, Tirador, **Monje Hueco** (ataque anunciado) y Eco Menor (solo lo invoca el jefe).
- [x] Diez técnicas y consumibles combinados.
- [x] Guardián de sector: **Campanero Sepultado**, tres fases con ataques anunciados (`telegraphs`), inmune a aturdimiento y empuje; la salida del último sector queda sellada mientras viva.
- [x] Un evento (**Altar del Eco Roto**, sector 1) y un maestro (**Maestra Sayoko**, sector 2), con decisiones que cuestan algo.
- [x] Diálogos con jefe y PNJ de mazmorra, y notas de lore opcionales (pergaminos que se recogen al pisarlos, pestaña Notas del menú).
- [x] Resumen de expedición: causa de la derrota o victoria, estadísticas, reliquia, botón «Nueva expedición».
**Aceptación:** una expedición corta tiene inicio, decisiones, jefe y final. *(Cumplida; 149 pruebas automáticas.)*
**Pendiente de decidir con el equipo:** artesanía de armas y más retroalimentación visual (ver `11_riesgos_y_decisiones_pendientes.md`).

## Hito 6.5 — Botín, llaves y forja (tras probar el vertical slice) **[Completado]**
- [x] Más arbustos (7 grupos por sector).
- [x] Arrojadizas que se clavan en los enemigos y caen al morir; el senbon sube a 4 de daño (ignora defensa, 40 % de perderse).
- [x] Objetos por el suelo (8–12 por sector) y cofres con botín más potente.
- [x] Puertas con candado + llave de hierro; cámara sellada con 3 tesoros.
- [x] Cofre lacado + llave de laca.
- [x] Monedas, esquirlas y botín de enemigos.
- [x] Mesa de forja (sectores 2 y 3): mejoras de armas hasta +3.
- [x] Revisión de Pixel Dungeon (ver `02_sistemas_y_reglas.md` §11.3).
**Aceptación:** explorar compensa; las armas tienen una progresión dentro de la expedición. *(176 pruebas automáticas.)*

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
- Mejora de armas: implementada (mesas de forja, Hito 6.5). La fabricación desde cero y la alquimia siguen sin decidir.
- Equilibrio del botín: la oferta de monedas/esquirlas y el coste de las mejoras están sin probar con jugadores reales; todo está en `src/content/balance.ts`.
