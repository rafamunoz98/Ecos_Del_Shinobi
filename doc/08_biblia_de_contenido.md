# Biblia de contenido inicial

Todo nombre y efecto es original y provisional. Los números se balancearán mediante pruebas.
Las secciones marcadas **[Implementado]** ya existen en el prototipo (`src/content`); el resto es diseño pendiente.

## 1. Estilos de combate
- **Hoja Errante:** espada corta, presión cuerpo a cuerpo y contraataques. **[Implementado como ataque básico + arma]**
- **Puño del Umbral:** combate cercano, interrupción y defensa.
- **Senda del Sello:** trampas, pergaminos y control de zonas.
- **Paso del Viento:** movilidad, alcance y ataques de línea.

Para el primer prototipo implementar solo Hoja Errante.

## 2. Afinidades
| Afinidad | Identidad táctica | Iniciación (nivel 1) | Avanzada (nivel 3) |
|---|---|---|---|
| Ascua | Daño y zonas persistentes | Brasa Circular | Lengua de Fuego |
| Marea | Control y protección | Velo de Corriente | Ola Empujadora |
| Vendaval | Alcance y movilidad | Corte de Aire | Paso de Ráfaga |
| Piedra | Defensa y terreno | Muro de Pizarra | Golpe Sísmico |
| Rayo | Precisión e interrupción | Aguja Resonante | Descarga Estática |

Al empezar cada expedición se sortea una de las cinco (con la semilla) y no hay ninguna desbloqueada de antemano.

### 2.1 Técnicas **[Implementado]**
Fórmula de daño: `max(1, poder de la técnica + bonificación de nivel − defensa)`. La bonificación de nivel es `+1 cada dos niveles` (nivel 1 = 0). "Ignora defensa" no resta la defensa del objetivo.

| Técnica | Afinidad | Kiro | Forma | Efecto |
|---|---|---|---|---|
| Brasa Circular | Ascua | 3 | Área de radio 1 sobre una casilla visible, alcance 4 | 6 de daño y *quemadura* 3 turnos |
| Lengua de Fuego | Ascua | 4 | Línea recta de 5, se detiene en obstáculos | 8 de daño y *quemadura* 2 turnos a todos los de la línea |
| Velo de Corriente | Marea | 2 | Uno mismo | *Protegido* (+2 de defensa) unas 3 rondas |
| Ola Empujadora | Marea | 3 | Línea recta de 4 | 3 de daño y empuja 2 casillas; si choca con un obstáculo, +2 de daño |
| Corte de Aire | Vendaval | 2 | Línea recta de 6 | 5 de daño a todos los de la línea |
| Paso de Ráfaga | Vendaval | 2 | Desplazamiento a una casilla libre visible, alcance 4 | Mueve al jugador al instante (utilidad pura) |
| Muro de Pizarra | Piedra | 3 | Tres casillas en perpendicular, alcance 4 | Barrera 6 rondas: nadie pasa (ni los enemigos), no bloquea la visión |
| Golpe Sísmico | Piedra | 4 | Ráfaga de radio 1 alrededor del jugador | 5 de daño y *aturdido* 1 turno |
| Aguja Resonante | Rayo | 3 | Una casilla visible, alcance 5 | 5 de daño que ignora defensa y *aturdido* 1 turno |
| Descarga Estática | Rayo | 4 | Ráfaga de radio 2 alrededor del jugador (con visión) | 4 de daño que ignora defensa |

Contrajuego previsto: las técnicas de línea exigen alineación; las de área quedan bloqueadas por la línea de visión; la barrera sirve también como trampa para el propio jugador en pasillos.

### 2.2 Estados **[Implementado]**
| Estado | Efecto | Duración |
|---|---|---|
| Quemadura | 1 de daño por ronda (ignora defensa) | Se refresca al máximo, no se acumula |
| Aturdido | El objetivo pierde su próxima acción | 1 turno |
| Protegido | +2 de defensa del jugador | Varias rondas |

## 3. Linajes originales candidatos
| Linaje | Tema | Posible despertar |
|---|---|---|
| Hilo Umbrío | Sombras y ataduras | Doble de Penumbra |
| Oído de Jade | Percepción de vibraciones | Lectura del Pulso |
| Piel de Basalto | Defensa y endurecimiento | Coraza Viviente |
| Voz Hueca | Resonancia y ondas | Campana Interior |

No todos deben estar disponibles al inicio. Cada linaje requiere historia, coste y contrajuego.

## 4. Enemigos **[Implementado salvo Monje Hueco]**
Base a sector 1; en cada sector posterior ganan +2 de vida y +1 de poder cada dos sectores.

| Enemigo | Vida | Poder | Def. | Aparece | Comportamiento | XP |
|---|---|---|---|---|---|---|
| Acechador de Hollín | 10 | 4 | 0 | Sector 1 | Persigue y golpea al adyacente (alcance de persecución 8) | 4 |
| Cuervo de Sal | 5 | 3 | 0 | Sector 1 | Rápido: se mueve dos veces por ronda; ataca como mucho una | 3 |
| Larva de Piedra | 16 | 4 | 2 | Sector 2 | Lenta: actúa una de cada dos rondas; muy resistente | 6 |
| Tirador de Junco | 7 | 3 | 0 | Sector 2 | Dispara a distancia 5 con línea de visión; retrocede si te acercas a 2 o menos; acorralado, dispara | 5 |
| **Monje Hueco** (pendiente) | — | — | — | — | Prepara un área de energía y la libera al turno siguiente (Hito 6) | — |

Un enemigo solo persigue si el camino hasta el jugador mide menos que su alcance de persecución; si no, permanece quieto. Los enemigos aturdidos no actúan esa ronda.

## 5. Jefe inicial (Hito 6)
**El Campanero Sepultado**
- Fase 1: golpe cercano anunciado.
- Fase 2: marca una línea de casillas y ejecuta una onda en el turno siguiente.
- Fase 3 opcional: convoca dos ecos menores.
- Recompensa: sello antiguo y acceso a una nueva ruta.

## 6. Objetos y equipo **[Implementado parcialmente]**
Consumibles implementados:
- Tónico de Kiro: recupera 5 de kiro. (tecla 1)
- Ungüento de Musgo: recupera 8 de vida. (tecla 2; se empieza con uno)

Equipo implementado (dos ranuras de las cuatro previstas: arma y vestimenta; se equipa solo lo que mejora lo actual):
| Arma | Bonus de poder | Aparece desde | Vestimenta | Bonus de defensa | Aparece desde |
|---|---|---|---|---|---|
| Tanto gastado (inicial) | +0 | — | — | — | — |
| Kunai de hierro | +1 | Sector 1 | Chaleco acolchado | +1 | Sector 1 |
| Hoja afilada | +2 | Sector 2 | Cota de láminas | +2 | Sector 2 |
| Hoja de ceniza | +3 | Sector 3 | Coraza de pizarra | +3 | Sector 3 |

Pendientes de la biblia original: Pergamino de Ceniza (ataque de área de un uso), Sello de Retorno (extracción bajo condición), Talismán de Piedra (talismán), Aguja de Resonancia (revela trampas), Máscara del Eco (modifica una técnica con coste). Cuando existan las ranuras de talismán y sello se incorporarán.

Botín de cofres: tabla ponderada por sector (consumibles frecuentes, equipo mejor solo en sectores profundos). Ningún objeto raro es obligatorio para completar la expedición.

## 7. Progresión durante la expedición **[Implementado]**
- Experiencia necesaria para pasar del nivel N al siguiente: `8 × N`.
- Cada nivel: +4 de vida máxima (y de vida actual), +1 de kiro máximo (y actual), +1 de poder en los niveles pares.
- Nivel 3: se aprende la técnica avanzada de la afinidad.
- Regeneración natural: 1 de vida cada 10 rondas.

## 8. Estructura de una expedición y mapas **[Implementado]**
- Una expedición tiene 3 sectores (por ahora; el último tendrá al Campanero). Cruzar la escalera lleva al siguiente sector conservando el personaje; en el último, gana.
- Cada sector es un mapa grande (64×44 casillas, estilo Pixel Dungeon): hasta 12 salas rectangulares unidas por pasillos de una casilla, más algunos bucles. La entrada está en una sala al azar y la escalera en la sala más lejana por camino.
- Enemigos repartidos por salas (de 4 a 9 por sector), siempre al menos a 6 casillas de la entrada. De 1 a 5 cofres por sector, colocados de modo que nunca corten un camino.
- El tamaño de casilla en pantalla no es fijo: la cámara hace zoom y sigue al jugador; el mapa y las reglas no dependen de él.
- Niebla de guerra: solo se ve lo ya recorrido, y los enemigos solo si están a la vista (radio 7 con línea de visión).
- Misma semilla y sector producen siempre el mismo mapa.

## 9. Transformaciones futuras
- Resonancia de Ascua.
- Manto del Guardián.
- Despertar del Hilo Umbrío.
- Ruptura del Pulso.

Cada una debe tener visual, duración, coste, beneficio, riesgo y condición de desbloqueo.

## 10. Notas de originalidad
Las técnicas siguen la estructura de otros juegos de ninjas (elementos, sellos, linajes), pero los nombres, efectos y números son propios y no reproducen técnicas, clanes, personajes ni símbolos reconocibles de ninguna franquicia. Al añadir contenido nuevo, mantener este criterio.
