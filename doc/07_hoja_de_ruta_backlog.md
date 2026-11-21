# Hoja de ruta y backlog

Los tiempos dependen de experiencia, disponibilidad y producción de arte. Priorizar hitos verificables sobre fechas rígidas.

**Estado (21-nov-2026):** Hitos 0 a 5 completados en el prototipo (código en la raíz de este repositorio), más el **Hito 5.5** (sigilo, armas y arte), el Hito 6 (vertical slice), el **Hito 6.5** (botín, llaves y forja) el **Hito 6.6** (ampliación: 6 sectores, jefes shinobi, objetos sin identificar, tienda y nuevos controles) el **Hito 6.7** (ajustes tras probarlo: jefes rediseñados, segunda afinidad, 6 técnicas, tronco señuelo, identificación por tiempo) el **Hito 6.8** (protagonista por afinidad, diagonal en un turno, clic/toque, confirmación al reiniciar) y el **Hito 6.9** (fuerza y puños, pociones arrojables, ciclo de afinidades, terreno dinámico, precipicios, minidesafíos, buscar, joyas, fusiones, compañero y eco). Siguiente: Hito 7 (progresión permanente).

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
- [x] Guardián de sector: **Campanero Sepultado** (sustituido en el Hito 6.6 por el jefe shinobi Sōkan), tres fases con ataques anunciados (`telegraphs`), inmune a aturdimiento y empuje; la salida del último sector queda sellada mientras viva.
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

## Hito 6.6 — Ampliación tras probar el 6.5 **[Completado]**
- [x] Movimiento en 8 direcciones (Q E Z C, teclado numérico y cruceta táctil con diagonales).
- [x] Cambiar de arrojadiza (V) sin gastar turno.
- [x] Arrastrar el mapa para ver lo ya explorado.
- [x] El kiro se recupera con el tiempo (1 cada 3 rondas; esperar da 2).
- [x] 40 técnicas de afinidad (5 por nivel + 3 que se aprenden por afinidad) y 2 comunes; 4 ranuras, grimorio y sustitución a elección.
- [x] Menos monedas y menos armas/arrojadizas; **tienda tras cada jefe** (mercader).
- [x] Llaves: más visibles, con pista al entrar y marcas en el minimapa.
- [x] Persecución sin límite práctico: los enemigos te siguen incluso a través de puertas.
- [x] 10 shinobi con habilidades propias y monstruos nuevos; **jefes shinobi** Sōkan (sector 3) y Yūgiri (sector 6) en lugar del monstruo-campana.
- [x] Equipo sin identificar con encantamientos y maldiciones (purificación en forja o con pergamino).
- [x] 11 pociones y 12 pergaminos sin identificar al estilo Pixel Dungeon con motivos de ninja; una de cada clase conocida según la afinidad.
- [x] Subida de nivel controlada: un nivel por sector, solo al despejarlo entero.
- [x] 3 sectores más (6 en total) y jefe final; estética de zona estable hasta caer el jefe y distinta después.
**Aceptación:** una expedición completa son seis sectores con dos jefes shinobi, tienda y objetos por descubrir. *(237 pruebas automáticas; comprobado en Chromium de escritorio y móvil.)*
**Pendiente de decidir con el equipo:** equilibrio fino de dificultad (ver «Pendientes conocidos») y qué técnicas deben enseñar los jefes.

## Hito 6.7 — Ajustes tras probar el 6.6 **[Completado]**
- [x] Las pociones recogidas ya no revelan lo que son (el aviso usa la apariencia).
- [x] Fuera tónicos y ungüentos: Poción de Sanación y Poción de Kiro Mayor; **una Poción de Sanación asegurada en cada fase** (sectores previos a un jefe).
- [x] Equipo: se identifica tras 20 rondas puestas; lo maldito se revela al equiparlo y no se quita sin purificar.
- [x] Arbustos también en los pasillos (hasta 7 por sector).
- [x] Lanzar Roca sustituye a Fortaleza de Pizarra.
- [x] Línea de visión mutua: los enemigos no disparan ni lanzan ráfagas a través de muros ni esquinas.
- [x] Diagonales: se puede cortar una esquina si una de las dos casillas contiguas está libre.
- [x] Hasta 6 técnicas equipadas (no hay que sustituir ninguna antes de llenarlas).
- [x] Sustitución deja un tronco señuelo que los perseguidores atacan (también el pergamino de Sustitución).
- [x] Manuales de técnica mucho más raros (ni suelo ni jefe: cofres lacados, cámaras selladas y tienda).
- [x] La estética cambia de verdad tras el jefe: Raíces Hundidas pasa a tierra parda con hongos luminosos.
- [x] Los ataques anunciados y los jefes dañan a los aliados (clon, sapo, tronco).
- [x] Jefes rediseñados con mecánicas propias: **Sōkan** (escudo de tablillas, empujón de 3 casillas, robo de kiro, furia en la fase 3) y **Yūgiri** (hilo que arrastra, red que ata, kawarimi con marioneta explosiva, furia desde la fase 2); más vida y daño.
- [x] **Segunda afinidad** como recompensa del primer jefe: eliges entre dos al azar, aprendes su técnica más básica y desbloqueas el resto con cada nivel.
- [x] Arte: tablilla, marioneta, tronco, burbuja de escudo y efectos nuevos; ventana de elección de afinidad (escritorio y móvil).
**Aceptación:** los dos jefes juegan distinto y exigen leer sus señales; una expedición ofrece decisiones de build más tempranas. *(261 pruebas automáticas; comprobado en Chromium de escritorio y móvil. Simulaciones de duelo con un bot que falla el 25 % de las esquivas: Sōkan ≈ 68 % de victorias a nivel 4 y Yūgiri ≈ 88 % a nivel 6, con 2 pociones de sanación.)*
**Pendiente de decidir con el equipo:** equilibrio fino de los jefes con jugadores reales (Sōkan podría resultar duro como primer jefe), y qué técnicas debe enseñar cada jefe además de la afinidad nueva.

## Hito 6.8 — Ajustes tras probar el 6.7 **[Completado]**
- [x] La diagonal cuesta un solo turno: el motor ya lo cumplía (verificado), el fallo era que dos flechas pulsadas a la vez daban dos movimientos; ahora se fusionan en una diagonal (`presentation/chords.ts`).
- [x] **Un protagonista distinto por afinidad**: Ren Sorae (Vendaval, rubio), Jūrō Kurobane (Ascua, moreno de melena larga), Tōma Shirasagi (Rayo, pelo blanco), Mizuna Aoyagi (Marea, mujer de pelo azul) y Momoka Iwase (Piedra, mujer de pelo rosa). Originales; nombre y apodo en el HUD, el menú y el registro inicial.
- [x] **Confirmación al reiniciar** (R o botón del menú) cuando hay una partida en curso.
- [x] **Mover, atacar e interactuar con clic o toque**, con viaje automático interrumpible y camino previsto con el ratón (`core/travel.ts`).
- [x] Lista de ideas y mejoras basada en Pixel Dungeon, el género ninja y otros juegos: `12_ideas_y_mejoras.md`.
**Aceptación:** una diagonal gasta un turno en teclado, clic y táctil; cada afinidad se reconoce a simple vista; no se pierde una partida por pulsar R sin querer. *(289 pruebas automáticas; comprobado en Chromium de escritorio y móvil.)*
**Pendiente de decidir con el equipo:** si los protagonistas tendrán pasivas propias (ver `12_ideas_y_mejoras.md` §2), y falta un gesto para inspeccionar en el móvil (pulsación larga), ya que tocar ahora actúa.

## Hito 6.9 — Fuerza, terreno vivo, joyas, fusiones, compañero y eco **[Completado]**
Pedido el 21-nov-2026 (pociones arrojables y minidesafíos de nivel) más las ideas de `12_ideas_y_mejoras.md` que el equipo eligió. Se entregó en tres bloques.
**Bloque 1 — Fuerza y afinidades**
- [x] **Se empieza sin arma, a puños.** Cada arma exige **Fuerza** (base 3): kunai/látigo 3, lanza 4, hoja afilada 4, hoja de ceniza 5. La **Poción de Fuerza** (+1) es única por jefe y está asegurada en la fase, antes de llegar a él; **mejorar un arma en la forja baja 1 su requisito por nivel**. Sin Fuerza suficiente no se puede empuñar.
- [x] **Las pociones se lanzan** (Tab → Objetos → Lanzar; alcance 5, radio 1): la Ígnea quema, la de Hiel envenena, la Niebla ciega, la Estridente atrae; las buenas se derraman sin efecto. Beberse una mala te daña a ti. Nueva **Poción de Levitación**.
- [x] **Ciclo de afinidades** Marea > Ascua > Vendaval > Piedra > Rayo > Marea: todos los enemigos tienen afinidad; ×1,5 al vencerla y ×0,75 al perder. Gema y flecha sobre cada enemigo, y armas encantadas con afinidad.
**Bloque 2 — Terreno vivo y minidesafíos**
- [x] **Reacciones en el terreno** (idea §1.2): el fuego prende arbustos, zarzas y puertas y se propaga; el agua deja charcos; el rayo electrifica el agua conectada (también te daña si estás dentro y no levitas); el viento aviva las llamas; la roca y los Sellos Explosivos derriban **muros agrietados**.
- [x] **Precipicios**: se puede saltar al sector de abajo (confirmación previa) a cambio de **la mitad de tu vida máxima** (nunca mata: deja al menos 1). Aterrizas lejos de los enemigos y estos no actúan esa ronda. La levitación permite cruzarlos (si caduca sobre el vacío, caes).
- [x] **Minidesafío por sector** (zarzal que quemar, muro agrietado que derribar, isla de vacío que cruzar levitando) con **el objeto necesario asegurado y a la vista** en el mismo sector (brilla en el suelo) y un cofre de recompensa.
- [x] **Buscar** (tecla **H**, botón 🔍): varias rondas tanteando las paredes; **cámaras ocultas** (cofre, alijo, santuario, tesoro, biblioteca, emboscada), casi siempre con algo bueno. Caminar junto a una pared secreta también puede revelarla.
**Bloque 3 — Joyas, fusiones, compañero y eco**
- [x] **Joyas**: ranuras de **anillo** y **colgante** con efectos pasivos (14 joyas, 5 malditas con precio oculto), identificadas al ponerlas y purificables (§11.8 de `02_sistemas_y_reglas.md`).
- [x] **Técnicas de fusión** (idea §1.3): una por pareja de afinidades (10), solo para quien domina **ambas**, que se **desbloquean aparte** con un **Manual de Fusión** (mercader tras el primer jefe y bibliotecas ocultas desde el sector 4).
- [x] **Compañero único**: un **prisionero** atado en el sector 2, de la afinidad que **cubre tu debilidad**; lo liberas y te sigue entre sectores (idea «otros protagonistas como compañeros»).
- [x] **Eco de la expedición anterior** (parte del §4 de `12_ideas_y_mejoras.md`): al morir se guarda en el navegador y la siguiente expedición lo encuentra como mini-jefe en un sector sin jefe; al vencerlo suelta tu equipo, purificado.
- [x] Corregido sobre la marcha: la tecla de Buscar chocaba con la diagonal Z (↙); ahora es **H**.
**Aceptación:** una expedición ofrece decisiones nuevas en cada sector (qué quemar, qué cruzar, qué rescatar, qué joya llevarte) sin que nada obligatorio dependa de la suerte. *(386 pruebas automáticas; comprobado en Chromium de escritorio y móvil. Duelo contra el eco con un bot que no esquiva: ~90 % de victorias con hoja y cota, ~65 % a puños y sin armadura, y 72–100 % con compañero.)*
**Pendiente de decidir con el equipo:** el legado **permanente** del eco (hoy solo suelta el equipo; el resto es del Hito 7); si el compañero debe poder equiparse o tener técnicas propias; cuántas técnicas de fusión por partida (hoy una, la de tu pareja de afinidades); equilibrio de precios de joyas, manual de fusión (60 monedas) y purificación con jugadores reales.

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
- Equilibrio: un bot ingenuo que carga contra todo muere casi siempre en el sector 1 o 2 (los enemigos ahora te persiguen desde lejos); el sector 1 se limitó a 5 enemigos. Falta probarlo con jugadores reales: todo está en `src/content/balance.ts` y `enemies.ts`.
- Economía: monedas escasas a propósito; vigilar que la tienda (tras Sōkan y Yūgiri) ofrezca decisiones reales y no sea inalcanzable.
- Grimorio: con 6 ranuras y dos afinidades (5 técnicas por nivel cada una), el grimorio se llenará en la segunda zona; valorar si hacen falta más ranuras desbloqueables en el Hito 7.
- Un tirador que retrocede puede alargar la persecución si el jugador no tiene kiro; valorar si debe dejar de huir al quedarse sin espacio o tras N retrocesos.
- Controles táctiles: hay cruceta, barra de acciones pulsables y toque sobre el mapa (mover, atacar, viajar); faltan zoom con pellizco, pulsación larga para inspeccionar y pruebas en dispositivos reales (Hito 8).
- Arte: ya es propio y procedural (ver `05_direccion_artistica_audio.md`). Faltan más fotogramas de animación, altar, sprites de jefe y audio.
- Sigilo: revisar con jugadores si el alcance de percepción (8) y las 8 rondas de alerta son justos; los arbustos podrían tener un coste adicional.
- Mejora de armas: implementada (mesas de forja, Hito 6.5). La fabricación desde cero y la alquimia siguen sin decidir.
- Equilibrio del botín: la oferta de monedas/esquirlas y el coste de las mejoras están sin probar con jugadores reales; todo está en `src/content/balance.ts`.
