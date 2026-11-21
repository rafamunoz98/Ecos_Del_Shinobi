# Ideas y mejoras sugeridas

Propuestas basadas en **Pixel Dungeon** (y su continuación Shattered Pixel Dungeon), en el **género ninja** en general (adaptado: nada se copia, todo se reinterpreta con el universo propio de Ecos del Shinobi) y en otros juegos del estilo (Brogue, Dungeon Crawl Stone Soup, Mystery Dungeon, Slay the Spire, Hades, Noita, Into the Breach, Darkest Dungeon). Son **sugerencias, no compromisos**: nada de lo que sigue está implementado salvo que se indique.

**Cómo leer las tablas:** *Impacto* = cuánto cambia la sensación de juego (★ poco, ★★★ mucho). *Coste* = trabajo aproximado (S = horas, M = un par de días, L = un hito entero). *Encaja con* = qué sistema ya existente aprovecha.

**Fecha de redacción:** 21-nov-2026, tras el Hito 6.8 (personajes por afinidad, controles de clic, confirmación de reinicio).

**Actualización (21-nov-2026, Hito 6.9):** el equipo pidió y se implementó: **reacciones entre elementos en el terreno** (§1.2), **fusiones de afinidades** (§1.3, desbloqueo independiente con Manual de Fusión), **descansar/buscar** (§1.4, tecla **H**, con cámaras ocultas), **otros protagonistas como compañeros** (uno solo, el de la afinidad que cubre tu debilidad) y el **eco de la expedición anterior** como mini-jefe (la parte permanente queda para el Hito 7). Se añadieron además los **amuletos** (§3: «Varitas y anillos» → anillos y colgantes, con maldiciones), la **fuerza** para empuñar armas y los **minidesafíos** de sector. Lo demás sigue siendo sugerencia.

---

## 1. Lo más recomendable ahora (alto impacto, bajo coste)

| # | Idea | Origen | Impacto | Coste | Encaja con |
|---|------|--------|---------|-------|------------|
| 1 | **Pasiva y equipo inicial propios de cada protagonista.** Hoy cada uno trae su afinidad (y con ella sus técnicas), pero ninguno tiene rasgos propios. En Shattered Pixel Dungeon cada clase arranca con un kit y una habilidad distintos; aquí bastaría una pasiva por personaje (ver §2). | Shattered PD | ★★★ | S–M | Personajes del Hito 6.8, `heroes.ts` |
| 2 | ✅ *(Hito 6.9)* **Reacciones entre elementos en el terreno.** El fuego quema arbustos (revela y destruye cobertura), el agua moja el suelo y el rayo la electrifica (daño en cadena), el viento dispersa humo y avanza las llamas, la piedra levanta muros. Cada afinidad deja de ser «solo daño» y pasa a cambiar el mapa. | Noita, Brogue | ★★★ | M | Arbustos, zonas persistentes, técnicas con área |
| 3 | ✅ *(Hito 6.9)* **Fusiones de afinidades.** Con la segunda afinidad (recompensa del primer jefe) se desbloquean técnicas que solo existen al combinar dos: Ascua+Piedra, Marea+Vendaval, Rayo+Vendaval, etc. Convierte la elección de afinidad en una decisión de *build*. | Géneros ninja, Hades | ★★★ | M | `affinity2`, `tier2` |
| 4 | ✅ *(Hito 6.9, tecla H)* **Descansar / buscar varios turnos** (tecla `Z` o doble toque sobre uno mismo): espera hasta curarte o hasta que algo aparezca; además revela puertas ocultas cercanas. En Pixel Dungeon es la acción más usada. | Pixel Dungeon, Brogue | ★★ | S | `Wait`, interrupciones de `travel.ts` |
| 5 | **Pellizco para zoom y pulsación larga = Inspeccionar** en el móvil. Ahora que tocar actúa, falta un gesto para *mirar sin gastar turno* (enemigo, objeto, casilla). El zoom táctil sigue siendo solo rueda y +/−. | Shattered PD | ★★★ | S | Sistema de clics del Hito 6.8 |
| 6 | **Diario / catálogo**: lista de enemigos vistos, pociones y pergaminos ya identificados, notas de lore. Ayuda a recordar entre partidas largas y alimenta el bestiario previsto. | Pixel Dungeon | ★★ | S–M | `appearance`, `notes`, menú de Notas |
| 7 | **Ruido y señuelos**: lanzar un objeto (o un kunai) hace ruido y atrae a los enemigos a ese punto; permite rodearlos o tenderles una emboscada. Muy ninja y casi gratis con el sigilo actual. | Tenchu, Mystery Dungeon | ★★ | S–M | Alerta, `lureStep`, arrojadizas |

---

## 2. Un protagonista distinto de verdad (propuesta de pasivas)

Idea: que el aspecto del Hito 6.8 se acompañe de **una pasiva y un pequeño ajuste de arranque** (todo en `heroes.ts` y `newGame.ts`). Valores orientativos, a probar:

| Protagonista | Afinidad | Pasiva sugerida | Arranque |
|---|---|---|---|
| Ren Sorae | Vendaval | *Paso ligero:* las armas arrojadizas tienen +1 de alcance. | Más shuriken (7) |
| Jūrō Kurobane | Ascua | *Brasa callada:* +20 % de daño a enemigos que arden. | Un pergamino de fuego conocido |
| Tōma Shirasagi | Rayo | *Pulso sereno:* los golpes a enemigos aturdidos o que no te han visto ignoran 1 de defensa extra. | Senbon en vez de shuriken |
| Mizuna Aoyagi | Marea | *Calma del oleaje:* las pociones de sanación curan un 25 % más. | Látigo en vez de tanto |
| Momoka Iwase | Piedra | *Puños de granito:* tras esperar un turno, el siguiente golpe recibido se reduce en 2. | +2 de defensa |

Complementos baratos: diálogo de prólogo propio por personaje, y que **los jefes reaccionen** a quién eres («Sōkan: *otra vez el viento, joven Sorae…*»).

---

## 3. Inspiradas en Pixel Dungeon / Shattered Pixel Dungeon

Ya adoptadas: objetos por el suelo, llaves y cámaras selladas, oro y herrero, pociones y pergaminos sin identificar, equipo maldito, tiendas (ver `02_sistemas_y_reglas.md` §11.6). Lo que queda:

| Idea | Qué aporta | Impacto | Coste | Nota |
|---|---|---|---|---|
| **Trampas** (alarma, red, humo, pinchos) y **acción de buscar** | Lectura del mapa, riesgo al explorar con prisa | ★★ | M | Combinar con el punto 4 de §1 |
| **Mímicos** (cofres que muerden) | Sorpresa sana, la desconfianza hacia los cofres | ★★ | S | Reutiliza `chests` y un enemigo |
| **Monstruos errantes** si te quedas demasiado en un sector | Presión de ritmo sin necesidad de hambre | ★★★ | S–M | Ver «campanas» en §5 |
| **Hambre y comida** | Presión de ritmo clásica | ★ | M | **No recomendada** aquí: cansa en partidas cortas y en móvil. Mejor la presión por campanas |
| **Alquimia con semillas/plantas** | Segundo sistema de objetos | ★★ | L | Para después del Hito 7; combinaría con pociones ya identificadas |
| **Varitas y anillos** → *sellos* y *amuletos* con carga o pasiva | Más ranuras de decisión (2 amuletos) | ★★ | M | Hoy hay reliquias de jefe; los amuletos serían comunes y con riesgo (malditos) |
| **Misiones de PNJ** (rescatar, entregar, matar a un cazarrecompensas) | Objetivos opcionales con recompensa | ★★ | M | Encaja con los altares y maestros actuales |
| **Estandartes de retos** (sin pociones, sin armadura, jefes más duros) | Rejugabilidad | ★★ | S–M | Casi solo condiciones en `newGame` |
| **Semilla diaria** (misma partida para todos ese día, sin servidor) | Motivo para volver cada día | ★★ | S | Semilla = fecha; sin ranking online (no es prioridad) |
| **Sensación del sector** (aviso al entrar: «huele a humo», «hay un eco antiguo») | Atmósfera y pistas | ★ | S | Ya hay pistas de llaves (`hints.ts`) |

---

## 4. Inspiradas en el universo ninja (reinterpretadas como originales)

Conviene mantener el principio del proyecto: **nombres, símbolos y diseños propios**. Estas son mecánicas genéricas del género, no contenido de ninguna obra concreta.

| Idea | Cómo sería en Ecos del Shinobi | Impacto | Coste |
|---|---|---|---|
| **Sellos de mano** | Preparar una técnica gasta un turno por sello (1-3): más sellos, más potencia, pero la preparación queda *anunciada* (como los ataques de los jefes) y puede interrumpirse. | ★★★ | M–L |
| **Ciclo de ventaja entre elementos** | Un ciclo propio de las cinco afinidades (cada una gana a una y pierde con otra): ±25 % de daño y un efecto de estado. Se recomienda un ciclo **distinto del de la serie original** para no calcarlo; a decidir con el equipo. | ★★★ | S–M |
| **Compañeros: los otros cuatro protagonistas** | En un sector aparece uno de los otros cuatro personajes pidiendo ayuda; si lo rescatas te acompaña un sector con su afinidad. Aprovecha los sprites nuevos. | ★★★ | M |
| **Rival recurrente** | Un shinobi que te supera al principio y vuelve más fuerte tras cada sector (mini-jefe con diálogo), hasta el duelo final. Da hilo narrativo. | ★★★ | M |
| **Contratos de invocación** | Meta-progresión: se firman con animales (sapo, cuervos, zorro…) y definen qué invocaciones aparecen en las partidas. Hoy ya existen pergaminos de invocación sueltos. | ★★ | M |
| **Genjutsu → «ilusiones»** | Estado que desorienta (los enemigos se atacan o se mueven al azar); contrajuego: herirse a uno mismo lo rompe. | ★★ | S |
| **Ninja médico** | Técnicas y objetos de curación y cura de estados para quien quiera un estilo de apoyo (encaja con Mizuna). | ★★ | S–M |
| **Herramientas ninja**: papel explosivo (trampa que se coloca), bomba de humo (zona de sigilo), abrojos (ralentizan un pasillo) | Amplían las arrojadizas actuales con decisiones tácticas. | ★★ | S–M |
| **Puertas del esfuerzo → «Ruptura del Pulso»** | Transformación de riesgo/recompensa (más poder y velocidad a cambio de vida cada turno). Ya prevista como transformación del Hito 7. | ★★★ | M |
| **Exámenes y misiones por rango** | Cámaras con prueba (sobrevive 10 turnos, cruza sin ser visto) que dan rango y recompensa; el rango desbloquea cosas en el refugio. | ★★ | M |
| **Libro de recompensas** | Enemigos élite marcados que pagan monedas si los derrotas (cazarrecompensas opcional). | ★★ | S |
| **Bestias selladas / Ecos Primordiales** | Poder prestado con coste (ya aparecen en el lore): un evento de sector que ofrece una transformación temporal. | ★★ | M |

---

## 5. Inspiradas en otros juegos

| Idea | Juego | Qué haría aquí | Impacto | Coste |
|---|---|---|---|---|
| **Eco de tu expedición anterior** | Hades / Spelunky | El nombre del juego pide esto: al morir, tu *eco* (con tu build) aparece como mini-jefe en la siguiente partida; vencerlo da un legado permanente. Une narrativa y meta-progresión (Hito 7). | ★★★ | M–L |
| **Campanas de alarma** | Darkest Dungeon (presión) | Cada sector tiene un contador de «campanas»; si lo agotas llegan refuerzos. Sustituye al hambre, encaja con *La Noche de las Mil Campanas* del lore. | ★★★ | S–M |
| **Elegir 1 de N en cámaras selladas** | Brogue | En lugar de un cofre fijo, una cámara con 3 objetos en jaulas: te llevas solo uno. Decisión pura, cero azar. | ★★ | S |
| **Reliquias con sinergia** | Slay the Spire | Hoy cada jefe da una reliquia; ampliar a 15-20 con efectos que se combinan (p. ej. «tus quemaduras se propagan»). | ★★★ | M |
| **Bendiciones de maestros** | Hades | Los maestros del camino ofrecen una de tres bendiciones por sector (duran la partida). | ★★ | M |
| **Aliados cautivos** | Brogue | Un enemigo encadenado al que puedes liberar y que pelea de tu lado. | ★★ | M |
| **Casas de monstruos / emboscadas** | Mystery Dungeon | Sala llena de enemigos dormidos que se despiertan al coger el botín; premia el sigilo y las áreas. | ★★ | S–M |
| **Telegrafías aún más claras** | Into the Breach | Ya adoptado para jefes; generalizar a los enemigos comunes con ataque cargado y mostrar siempre las casillas amenazadas. | ★★ | S |
| **Estrés / determinación** | Darkest Dungeon | Un medidor opcional que sube con daño recibido y baja al descansar; a cierto nivel da rasgos (positivos o negativos). | ★ | M |
| **Talentos** | Tales of Maj'Eyal, Shattered PD | Árbol de técnicas del Hito 7 con *talentos* de personaje (una elección cada 2 niveles). | ★★★ | L |

---

## 6. Calidad de vida y accesibilidad

- **Viaje automático ya implementado** (clic en casilla lejana): ampliarlo con «ir a la escalera» y «ir al objeto más cercano».
- **Confirmar acciones peligrosas** (tirar objetos valiosos, atravesar trampas conocidas), como el reinicio.
- **Deshacer solo para el viaje y el apuntado** (no para acciones del motor): cancelar con un toque.
- **Modos de daltonismo** y **tamaño de texto** en ajustes; **reducir movimiento** (sin sacudidas ni destellos).
- **Guardado y «Continuar»** (Hito 8): imprescindible en móvil, donde se interrumpe la partida constantemente.
- **Registro filtrable** (combate / objetos / historia) y opción de **registro más corto** en móvil.
- **Atajos configurables** y **acordes** de teclado ya resueltos para las diagonales (dos flechas = una diagonal).

---

## 7. Ruta recomendada

1. **Hito 6.9 (rápido):** §1 completo salvo las reacciones (descanso/búsqueda, pellizco y pulsación larga, diario, ruido), más **pasivas por personaje** (§2). Son cambios pequeños con efecto inmediato en la sensación de juego.
2. **Hito 7 (progresión):** árbol de técnicas + **fusiones de afinidades** + **eco de la expedición anterior** + refugio básico + una transformación («Ruptura del Pulso»). Aquí encajan los **talentos** y los **contratos de invocación**.
3. **Hito 7.5 (profundidad táctica):** **reacciones entre elementos**, ciclo de ventaja, trampas y mímicos, **campanas de alarma**, herramientas ninja.
4. **Hito 8 (beta):** guardado, pruebas táctiles reales, semilla diaria y retos.

## 8. Decisiones que necesito del equipo

- ¿Se aprueban **pasivas por personaje** (§2) o se prefiere mantener a los cinco como solo cosméticos?
- ¿Hambre sí o no? (recomendación: **no**, usar campanas.)
- ¿Ciclo de ventaja entre elementos? Si sí, ¿cuál? (recomendación: uno **propio**, distinto del de la serie.)
- ¿Compañeros y rival con los otros cuatro protagonistas (§4), o reservar a los protagonistas solo como elección inicial?
