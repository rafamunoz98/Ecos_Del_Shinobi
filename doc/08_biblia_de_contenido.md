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

## 4. Enemigos **[Implementado]**
Base a sector 1; en cada sector posterior ganan +2 de vida y +1 de poder cada dos sectores.

| Enemigo | Vida | Poder | Def. | Aparece | Comportamiento | XP |
|---|---|---|---|---|---|---|
| Acechador de Hollín | 10 | 4 | 0 | Sector 1 | Persigue y golpea al adyacente (alcance de persecución 8) | 4 |
| Cuervo de Sal | 5 | 3 | 0 | Sector 1 | Rápido: se mueve dos veces por ronda; ataca como mucho una | 3 |
| Larva de Piedra | 16 | 4 | 2 | Sector 2 | Lenta: actúa una de cada dos rondas; muy resistente | 6 |
| Tirador de Junco | 7 | 3 | 0 | Sector 2 | Dispara a distancia 5 con línea de visión; retrocede si te acercas a 2 o menos; acorralado, dispara | 5 |
| Monje Hueco | 12 | 6 | 1 | Sector 2 | Canalizador: te ve a ≤ 5 y marca un rombo de radio 1 sobre ti (*Pulso Hueco*); estalla dos rondas después. Percepción 8 | 8 |
| Eco Menor | 6 | 3 | 0 | Solo invocado por el jefe | Persigue y golpea; no da botín de sector | — |

Un enemigo solo persigue si el camino hasta el jugador mide menos que su alcance de persecución; si no, permanece quieto. Los enemigos aturdidos no actúan esa ronda.

## 5. Jefe inicial **[Implementado]**
**El Campanero Sepultado** — 40 vida, poder 7, defensa 2, percepción 10, 30 XP. Vive en la sala de salida del último sector (sin arbustos ni otros enemigos).
- Fase 1 (vida > 2/3): *Campanada*, golpe de área (rombo radio 2) anunciado; avanza solo en rondas pares.
- Fase 2 (vida > 1/3): añade *Onda de la Campana*, una cruz de longitud 4 sobre ti, si estás lejos.
- Fase 3: invoca dos Ecos Menores (una vez).
- Inmune a aturdimiento y empuje. Diálogo al verte, al cambiar de fase y al caer.
- Recompensa: **Sello Antiguo** (reliquia) y la salida queda abierta. El «acceso a una nueva ruta» llega con la progresión (Hito 7).

## 5.1 Eventos y maestros **[Implementado]**
- **Altar del Eco Roto** (sector 1): *Ofrenda de sangre* (−6 vida → +1 poder, +2 kiro máx.), *Plegaria de kiro* (todo el kiro, mín. 3 → curación total), *Ofrenda de acero* (3 shuriken → +1 defensa).
- **Maestra Sayoko** (sector 2): *Filo del Maestro* (+1 poder), *Respiración profunda* (+4 kiro máx.), *Piel de corteza* (+1 def., +4 vida máx.), *Lección adelantada* (técnica avanzada de tu afinidad).
- **Notas de lore** (8 pergaminos, 1–2 por sector): diario del cartógrafo, tablilla de los Custodios, carta de la forja, canto de los Peregrinos, aviso del Círculo, último registro del Campanero, marca del sello y nota arrugada. Se leen en la pestaña Notas del menú.

## 5.4 Botín, llaves y forja **[Implementado]**
Objetos: **moneda**, **esquirla** (material de forja), **llave de hierro** (abre la puerta con candado) y **llave de laca** (abre el cofre lacado). Las mesas de forja son un PNJ sin diálogo que aparece en los sectores 2 y 3. Ver `02_sistemas_y_reglas.md` §11.1–11.3 para probabilidades y costes.

## 5.5 Sigilo, arbustos y puertas **[Implementado]**
Ver `02_sistemas_y_reglas.md` §10.1. Resumen: arbustos y puertas cerradas tapan la visión; esconderse tiene un precio (ves menos); los enemigos solo actúan al verte; atacar a quien no te ha visto hace ×2.

## 6. Objetos y equipo **[Implementado parcialmente]**
Consumibles implementados:
- Tónico de Kiro: recupera 5 de kiro. (tecla 1)
- Ungüento de Musgo: recupera 8 de vida. (tecla 2; se empieza con uno)

Equipo implementado (dos ranuras de las cuatro previstas: arma y vestimenta). La vestimenta se equipa sola si mejora la actual; las armas nuevas se guardan y se equipan desde el menú o con Q.

**Armas cuerpo a cuerpo** (se llevan varias, una equipada):
| Arma | Tipo | Poder | Alcance | Aparece desde | Nota |
|---|---|---|---|---|---|
| Tanto gastado (inicial) | Hoja | +0 | 1 | — | |
| Kunai de hierro | Hoja | +1 | 1 | Sector 1 | |
| Hoja afilada | Hoja | +2 | 1 | Sector 2 | |
| Hoja de ceniza | Hoja | +3 | 1 | Sector 3 | |
| Látigo de cadena | Látigo | +0 | 2 | Sector 1 | Línea recta; golpea al primero |
| Lanza de bambú | Lanza | +1 | 2 | Sector 2 | Línea recta; atraviesa |

**Armas arrojadizas** (consumibles; tecla G, se lanzan a una casilla visible y se detienen en el primer enemigo):
| Arma | Daño | Alcance | Probabilidad de perderse | Aparece desde | Nota |
|---|---|---|---|---|---|
| Shuriken (se empieza con 5) | 3 | 5 | 25% | Sector 1 | Si acierta se clava en el enemigo y cae al morir; si falla cae al suelo |
| Kunai arrojadizo | 4 | 4 | 15% | Sector 2 | |
| Senbon | 4 | 6 | 40% | Sector 1 | Ignora la defensa |

**Vestimenta:**
| Vestimenta | Defensa | Aparece desde |
|---|---|---|
| Chaleco acolchado | +1 | Sector 1 |
| Cota de láminas | +2 | Sector 2 |
| Coraza de pizarra | +3 | Sector 3 |

Pendientes de la biblia original: Pergamino de Ceniza (ataque de área de un uso), Sello de Retorno (extracción bajo condición), Talismán de Piedra (talismán), Aguja de Resonancia (revela trampas), Máscara del Eco (modifica una técnica con coste). Cuando existan las ranuras de talismán y sello se incorporarán.

Botín de cofres: tabla ponderada por sector (consumibles frecuentes, equipo mejor solo en sectores profundos). Ningún objeto raro es obligatorio para completar la expedición.

## 7. Progresión durante la expedición **[Implementado]**
- Experiencia necesaria para pasar del nivel N al siguiente: `8 × N`.
- Cada nivel: +4 de vida máxima (y de vida actual), +1 de kiro máximo (y actual), +1 de poder en los niveles pares.
- Nivel 3: se aprende la técnica avanzada de la afinidad.
- Regeneración natural: 1 de vida cada 10 rondas.

## 8. Estructura de una expedición y mapas **[Implementado]**
- Una expedición tiene 3 sectores (por ahora; el último tendrá al Campanero). Cruzar la escalera lleva al siguiente sector conservando el personaje; en el último, gana.
- Cada sector es un mapa grande (64×44 casillas, estilo Pixel Dungeon): hasta 12 salas rectangulares unidas por pasillos de una casilla, más algunos bucles, con grupos de arbustos en las salas y puertas en la boca de algunos pasillos. La entrada está en una sala al azar y la escalera en la sala más lejana por camino.
- Enemigos repartidos por salas (de 4 a 9 por sector), siempre al menos a 6 casillas de la entrada. De 8 a 12 objetos por el suelo, hasta 3 cofres de madera, una cámara sellada con puerta con candado y un cofre lacado (ver §5.4), colocados de modo que nunca corten un camino. Siete grupos de arbustos por sector.
- El tamaño de casilla en pantalla no es fijo: la cámara hace zoom y sigue al jugador; el mapa y las reglas no dependen de él.
- Niebla de guerra: solo se ve lo ya recorrido, y los enemigos solo si están a la vista (radio 7 con línea de visión; los arbustos y puertas cerradas la cortan).
- Misma semilla y sector producen siempre el mismo mapa.

## 9. Transformaciones futuras
- Resonancia de Ascua.
- Manto del Guardián.
- Despertar del Hilo Umbrío.
- Ruptura del Pulso.

Cada una debe tener visual, duración, coste, beneficio, riesgo y condición de desbloqueo.

## 10. Notas de originalidad
Las técnicas siguen la estructura de otros juegos de ninjas (elementos, sellos, linajes), pero los nombres, efectos y números son propios y no reproducen técnicas, clanes, personajes ni símbolos reconocibles de ninguna franquicia. Al añadir contenido nuevo, mantener este criterio.
