# Sistemas y reglas de juego

## 1. Turnos
Orden de una ronda:
1. Recibir comando.
2. Validar acción.
3. Si es inválida, informar y no consumir turno.
4. Resolver acción del jugador y costes.
5. Aplicar efectos inmediatos.
6. Resolver estados de fin de turno.
7. Actuar enemigos vivos en orden determinista.
8. Resolver estados de enemigos.
9. Comprobar muerte, victoria, cambios de sala y recompensas.
10. Actualizar presentación.

Las animaciones no deciden resultados de combate. El estado del juego es la fuente de verdad.

## 2. Acciones
- `Move(dx,dy)`: movimiento de una casilla en **8 direcciones** (también diagonales; no se puede cortar la esquina de una pared).
- `Wait`: pasar turno y recuperar 2 de kiro. Además el kiro se recupera solo (1 cada 3 rondas) y la vida, 1 cada 10.
- `BasicAttack(target)`: ataque con arma o combate cuerpo a cuerpo.
- `UseTechnique(techniqueId,target)`: técnica con coste, alcance, área y enfriamiento opcional.
- `UseItem(itemId)`: consumible, poción, pergamino o manual de técnica.
- `EquipWeapon`, `EquipArmor`, `EquipTechnique(techniqueId, replace?)`: cambiar de arma, de vestimenta o una técnica del grimorio por una equipada (gastan un turno).
- `Throw(itemId,target)`: lanzar una arrojadiza (V cambia la elegida sin gastar turno).
- `Purify`, `Upgrade`, `Buy`: purificar o mejorar en una mesa de forja y comprar al mercader.
- `Interact(target)`: cofre, altar, puerta, maestro o salida.
- `Extract`: abandonar el sector por un punto habilitado.

## 3. Recursos
- **Vida:** al llegar a cero, el personaje cae y termina la expedición.
- **Kiro:** energía utilizada para técnicas.
- **Tensión:** recurso opcional que aumenta al forzar técnicas; al superar umbral puede causar agotamiento o efectos adversos. No introducir en el primer prototipo salvo que mejore la diversión.
- **Sellos/cargas:** consumibles o cargas de ciertas técnicas.

La interfaz debe indicar coste antes de confirmar una técnica.

## 4. Afinidades elementales originales
Familias propuestas:
- **Ascua:** daño persistente, explosiones y presión de zona.
- **Marea:** control, desplazamiento y protección.
- **Vendaval:** alcance, líneas de corte y movilidad.
- **Piedra:** barreras, armadura y control del terreno.
- **Rayo:** precisión, interrupción y cadenas rápidas.

Son nombres provisionales. Cada afinidad tendrá técnicas de iniciación, técnicas avanzadas y sinergias. Evitar que una afinidad sea universalmente superior.

## 5. Combate
Fórmula inicial sencilla: `daño = max(1, poder + bonificación - defensa)`. Añadir críticos y variación solo tras probar la legibilidad. Los ataques de área muestran casillas afectadas antes de ejecutar. Los enemigos especiales anuncian ataques potentes un turno antes.

## 6. Técnicas
Cada técnica define:
- ID y nombre original.
- Afinidad/estilo requerido, si corresponde.
- Coste de kiro.
- Alcance y patrón de casillas.
- Daño, curación, estado o utilidad.
- Enfriamiento o límite de uso, si aplica.
- Etiquetas de sinergia.
- Animación y efectos sonoros referenciados por ID.

Categorías: ofensiva, defensa, movilidad, control, apoyo, invocación y transformación.

## 7. Linajes y despertares
Un linaje es una herencia ficticia propia del mundo: puede alterar percepción, cuerpo, sombras, sonido, gravedad u otra regla. No debe ser una copia de un poder ocular o clan reconocible de otra franquicia. Cada linaje incluye pasiva, técnica característica, árbol de evolución y condición de despertar.

Despertar: se obtiene mediante hitos de juego, pruebas o decisiones narrativas. Debe ser comprensible y alcanzable; evitar depender exclusivamente de una probabilidad extremadamente baja.

## 8. Transformaciones
Tipos propuestos:
- **Resonancia:** estado breve que potencia una afinidad.
- **Manto espiritual:** pacto temporal con una entidad.
- **Despertar de linaje:** cambio de reglas y habilidades.
- **Ruptura del Pulso:** modo extremo con coste o consecuencia.

Cada transformación define duración, coste, efecto, limitaciones, señales visuales y forma de terminar. El primer prototipo solo necesita una técnica de ráfaga, no el sistema completo.

## 9. IA
- Acechador: persigue y golpea al adyacente.
- Tirador: mantiene distancia y busca línea de visión.
- Guardián: protege una zona o invoca defensa.
- Canalizador (Monje Hueco) **[Implementado]**: si te ve a ≤ 5 casillas, marca un rombo de radio 1 centrado en ti; el área estalla cuando el monje ha actuado dos veces más. Aturdirlo o matarlo cancela la marca.
- Shinobi **[Implementado]**: ocho tipos con habilidades propias (kunai, tajo giratorio, salto, pulso, cruz, senbon envenenadas, clones, relámpago en cruz). Ver `08_biblia_de_contenido.md` §4.
- Jefes shinobi (Sōkan y Yūgiri) **[Implementado]**: fases según su vida (>2/3, >1/3, resto). Ver §9.1.
- **Persecución [Implementado]:** al notarte, un enemigo queda alerta 12 rondas y te sigue desde hasta 40 casillas de camino; si te pierde, rastrea tu posición real hasta 18 casillas. Las puertas no los detienen: así siempre pueden alcanzarte para el cuerpo a cuerpo.

Desempates deterministas para reproducir errores.

### 9.1 Ataques anunciados (telegraphs) y jefe **[Implementado]**
- Un ataque anunciado es una marca en el mapa (`state.telegraphs`) con casillas, potencia y cuenta atrás. Empieza en 2; cada acción de su dueño la reduce y al llegar a 0 se libera y daña al jugador si está en alguna casilla marcada (la defensa cuenta). Se dibuja rayada con el número de rondas.
- Aturdir al dueño (salvo al jefe) o matarlo cancela la marca. El procesado de marcas ocurre antes de decidir si el enemigo te ve, así que una marca ya lanzada siempre se resuelve.
- Cada jefe y cada shinobi usa **habilidades** (`SkillDef`): ráfaga alrededor de sí, zona sobre ti, cruz, rayo en línea (8 direcciones), disparo inmediato, salto, invocación. Tienen enfriamiento y, desde cierta fase, nuevas opciones. Las anunciadas dibujan sus casillas y se liberan tras su aviso.
- **Sōkan, Predicador Hueco** (sector 3; 44 vida, poder 7, def. 2) y **Yūgiri, el Hilo Roto** (sector 6; 52 vida, poder 8, def. 2). Inmunes a aturdimiento, empuje y ataduras. Detalle en `08_biblia_de_contenido.md` §5.
- Mientras un jefe viva, la salida de su sector está sellada (`exit_sealed`). Al caer: reliquia, 15 monedas, 3 esquirlas, se cancelan sus ecos, **cambia la estética de la zona** y **aparece un mercader** cerca. El juego se gana al cruzar la salida del sector 6 tras derrotar a Yūgiri.
- Los patrones están pensados para esquivar saliendo de las zonas marcadas o castigar a distancia.

### 9.2 PNJ y decisiones **[Implementado]**
- Los PNJ (`state.npcs`) ocupan casilla y bloquean el paso. `Interact` junto a uno es una acción gratuita: muestra el diálogo, no gasta turno. `Choose {npcId, optionId}` paga el coste de la opción, aplica sus ganancias y marca al PNJ como usado (una vez por PNJ).
- Costes posibles: vida, todo el kiro (con mínimo) u objetos. Ganancias: poder, defensa, vida máx., kiro máx., curación total o técnica avanzada.
- Los diálogos se muestran una sola vez por expedición (`seenDialogues`). Los pergaminos (`state.scrolls`) se recogen al pisarlos y quedan en `player.notes`.
- Estadísticas de expedición (`state.stats`): bajas, cofres, daño hecho y recibido, técnicas y objetos usados, golpes furtivos, decisiones, jefe derrotado y causa de la derrota.

## 10. Estados y terreno
Estados candidatos: quemadura, marca, ralentización, aturdimiento, barrera, sangrado y agotamiento. Cada uno debe definir duración, acumulación y momento de resolución. Terreno: trampas, zonas elementales, obstáculos rompibles y altares.

### 10.1 Visión y sigilo **[Implementado]**
- **Arbustos:** tapan la visión (la tuya y la de los enemigos). Quien está dentro solo es visto desde una casilla de distancia, pero ve menos (radio 3 en lugar de 7).
- **Puertas:** cerradas tapan la visión; se abren mientras alguien está dentro de ellas. Las colocan los generadores en la boca de los pasillos.
- **Percepción:** un enemigo que no te ve no actúa. Te nota si hay línea de visión y distancia ≤ su alcance de percepción (y no estás en un arbusto, salvo adyacente). Al notarte queda *alerta* 12 rondas: persigue hacia donde te vio por última vez y, si te pierde, rastrea tu posición real un buen trecho; acaba rindiéndose.
- **Golpe furtivo:** atacar (cuerpo a cuerpo o lanzando) a un enemigo que no sabe de ti hace ×2 de daño. Un enemigo herido sabe siempre dónde estás.

## 11. Inventario y botín
Ranuras iniciales: arma, vestimenta, talismán y sello (en el prototipo: arma y vestimenta). **Armas cuerpo a cuerpo [Implementado]:** hoja (adyacente), látigo (alcance 2, golpea al primero de la línea) y lanza (alcance 2, atraviesa). Se llevan varias y se equipa una (cambiar gasta un turno). **Arrojadizas [Implementado]:** shuriken, kunai arrojadizo y senbon; se lanzan a una casilla visible y se detienen en el primer enemigo. Si fallan o se pierden, caen al suelo (recogibles al pisarlas); si aciertan y no se rompen, **se clavan en el enemigo** (se ven en su sprite) y **caen al suelo al morir**. Consumibles: tónicos, pergaminos, bombas de humo y kits de sellado. El botín usa tablas configurables; las recompensas raras no deben ser obligatorias para superar el juego.

### 11.1 Objetos del suelo, cofres, llaves y monedas **[Implementado]**
Inspirado en Pixel Dungeon: lo normal es encontrar objetos *por el suelo*; los cofres son un extra con cosas mejores.
- **Suelo:** de 6 a 9 objetos por sector (monedas, esquirlas, tónicos, ungüentos, pociones, pergaminos y arrojadizas). Se recogen al pisarlos. Las armas y arrojadizas son escasas.
- **Cofre de madera** (hasta 2 por sector): equipo y reservas grandes. No necesita llave.
- **Puerta con candado:** cierra una *cámara sellada* (75 % de los sectores) con 3 tesoros. Se abre con la **llave de hierro**, que está en una sala con enemigos y brilla en el suelo. Se abre caminando contra ella o con X.
- **Cofre lacado** (60 % de los sectores): solo se abre con la **llave de laca**, en la sala más alejada de la entrada. Contiene equipo de gama alta y manuales de técnica.
- **Las llaves se deshacen al bajar de sector.** Al entrar, el registro dice dónde están las llaves de lo que haya cerrado; se marcan en el minimapa.
- **Monedas y esquirlas:** las monedas salen del suelo, de cámaras y de enemigos (35 %, 1–2; los ecos no sueltan nada) y de los jefes (15). Son pocas a propósito: se gastan en la forja y en la **tienda del mercader que aparece tras cada jefe**.

### 11.2 Mesas de forja **[Implementado]**
Hay mesa de forja en los sectores 2, 3 y 5. Hablar con ella (X o caminar contra ella) es gratis y abre el menú. Cada arma cuerpo a cuerpo se mejora hasta **+3**; cada nivel da +1 de poder. El coste por nivel es de **12 / 20 / 30 monedas** o de **2 / 3 / 4 esquirlas**; mejorar gasta un turno. También **purifica** piezas malditas ya identificadas por **10 monedas**.

### 11.3 Equipo sin identificar, encantamientos y maldiciones **[Implementado]**
Las armas y vestimentas encontradas se ven como «Nombre (?)». Pueden ser corrientes, encantadas (efecto positivo) o malditas (efecto negativo y **pegadas al cuerpo** hasta purificarlas). Equipar una pieza la identifica. No se puede cambiar una ranura mientras lo puesto esté maldito; se rompe con un Sello de Purificación o en la forja. Tabla en `08_biblia_de_contenido.md` §6.2.

### 11.4 Pociones y pergaminos sin identificar **[Implementado]**
11 pociones y 12 pergaminos con apariencias al azar por partida; se identifican al usarlos. Cada afinidad reconoce de entrada una poción y un pergamino. Muchos son invocaciones (sapo, cuervos, clones de sombra) y sellos al estilo ninja. Tabla en `08_biblia_de_contenido.md` §6.3.

### 11.5 Subida de nivel controlada **[Implementado]**
Solo se sube un nivel al **despejar un sector**: derrotar a todos sus enemigos no invocados (`floorKilled === floorEnemies`). Un sector da como mucho un nivel; el nivel 6 se alcanza tras despejar el quinto sector. Cada nivel desbloquea la técnica de nivel de la afinidad (niveles 2–5).

### 11.6 Comparativa con Pixel Dungeon
| Idea de Pixel Dungeon | Estado en Ecos del Shinobi |
|---|---|
| Objetos por el suelo, cofres como extra | **Adoptada** |
| Llaves y cámaras selladas, cofres con llave | **Adoptada** (llave de hierro y de laca; se pierden al bajar; con pista al entrar) |
| Oro y herrero que mejora armas | **Adoptada** (monedas y esquirlas; forja en sectores 2, 3 y 5) |
| Monedas que sueltan los enemigos | **Adoptada** (más escasas) |
| Pociones y pergaminos sin identificar | **Adoptada** (con motivos ninja y una poción y un pergamino conocidos por afinidad) |
| Equipo sin identificar, maldito o encantado | **Adoptada** |
| Tiendas | **Adoptada** (mercader tras cada jefe) |
| Hambre y comida | Propuesta (aumenta presión pero cansa en partidas cortas) |
| Trampas y acción de buscar | Propuesta |
| Cofres trampa (mímicos) | Propuesta |
| Monstruos errantes que castigan quedarse | Propuesta |
| Sensación del piso (aviso al entrar) | Parcial (aviso de llaves) |
| Alquimia / combinar objetos | Propuesta |

## 12. Guardado
Persistir versión de esquema, semilla, sector, mapa, estado del jugador, enemigos, objetos, inventario y meta-progreso. Versionar y migrar datos. No confiar en guardados del cliente para rankings o economía competitiva.
