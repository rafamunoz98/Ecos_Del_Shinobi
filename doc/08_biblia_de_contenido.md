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
Cada afinidad tiene **ocho técnicas propias**: cinco se desbloquean por nivel (1 a 5; se sube un nivel por sector despejado) y tres hay que **aprender** (manuales o maestros). Además hay dos técnicas **comunes** que cualquiera puede aprender. Solo se pueden llevar **4 técnicas equipadas** (teclas 1–4); el resto queda en el **grimorio** y se cambia por una equipada desde el menú (Tab → Técnicas), gastando un turno. Una técnica aprendida sin ranura libre abre el menú para elegir cuál sustituir.

| Afinidad | Identidad táctica | Iniciación (nivel 1) |
|---|---|---|
| Ascua | Daño y zonas persistentes | Brasa Circular |
| Marea | Control, protección y curación | Velo de Corriente |
| Vendaval | Alcance y movilidad | Corte de Aire |
| Piedra | Defensa y terreno | Muro de Pizarra |
| Rayo | Precisión e interrupción | Aguja Resonante |

Al empezar cada expedición se sortea una de las cinco (con la semilla) y no hay ninguna desbloqueada de antemano. Cada afinidad **reconoce de entrada** una poción y un pergamino (ver §6.3).

### 2.1 Técnicas **[Implementado]**
Fórmula de daño: `max(1, poder de la técnica + bonificación de nivel − defensa)`. La bonificación de nivel es `+1 cada dos niveles` (nivel 1 = 0). "Ignora defensa" no resta la defensa del objetivo. Las líneas y rayos funcionan en las 8 direcciones.

#### Ascua
| Técnica | Obtención | Kiro | Forma | Efecto |
|---|---|---|---|---|
| Brasa Circular | Nivel 1 | 3 | Área de radio 1 sobre una casilla visible (alcance 4). | Daño 6, Quemadura 3 turnos |
| Aliento Ardiente | Nivel 2 | 2 | Línea recta de 3 casillas; se detiene en obstáculos. | Daño 4, Quemadura 2 turnos |
| Lengua de Fuego | Nivel 3 | 4 | Línea recta de 5 casillas; se detiene en obstáculos. | Daño 8, Quemadura 2 turnos |
| Lluvia de Chispas | Nivel 4 | 5 | Área de radio 2 sobre una casilla visible (alcance 5). | Daño 5, Quemadura 2 turnos |
| Pulso del Cráter | Nivel 5 | 6 | Ráfaga de radio 2 a tu alrededor. | Daño 9, Quemadura 3 turnos |
| Pira del Condenado | Se aprende (manual, maestro o jefe) | 3 | Área de radio 1 sobre una casilla visible (alcance 4). | Daño 4, Vulnerable 4 turnos |
| Furia Ardiente | Se aprende (manual, maestro o jefe) | 3 | Se aplica sobre ti. | Tú: Potenciado 5 turnos |
| Aliento del Dragón de Ceniza | Se aprende (manual, maestro o jefe) | 8 | Ráfaga de radio 3 a tu alrededor. | Daño 7, Quemadura 3 turnos |

#### Marea
| Técnica | Obtención | Kiro | Forma | Efecto |
|---|---|---|---|---|
| Velo de Corriente | Nivel 1 | 2 | Se aplica sobre ti. | Tú: Protegido 4 turnos |
| Aguja de Agua | Nivel 2 | 2 | Una casilla visible (alcance 5). | Daño 4 (ignora defensa), Ralentizado 3 turnos |
| Ola Empujadora | Nivel 3 | 3 | Línea recta de 4 casillas; se detiene en obstáculos. | Daño 3, Empuja 2 casillas |
| Rocío Restaurador | Nivel 4 | 4 | Se aplica sobre ti. | Curas 8 de vida |
| Torrente | Nivel 5 | 5 | Línea recta de 5 casillas; se detiene en obstáculos. | Daño 6, Empuja 3 casillas |
| Cárcel de Agua | Se aprende (manual, maestro o jefe) | 3 | Área de radio 1 sobre una casilla visible (alcance 4). | Atado 3 turnos |
| Niebla Densa | Se aprende (manual, maestro o jefe) | 3 | Se aplica sobre ti. | Tú: Sigilo 5 turnos |
| Diluvio | Se aprende (manual, maestro o jefe) | 6 | Ráfaga de radio 2 a tu alrededor (incluye diagonales). | Daño 4, Ralentizado 3 turnos, Empuja 2 casillas |

#### Vendaval
| Técnica | Obtención | Kiro | Forma | Efecto |
|---|---|---|---|---|
| Corte de Aire | Nivel 1 | 2 | Línea recta de 6 casillas; se detiene en obstáculos. | Daño 5 |
| Paso de Ráfaga | Nivel 2 | 2 | Te desplazas al instante a una casilla libre visible (alcance 4). | Utilidad |
| Lanzada de Viento | Nivel 3 | 3 | Carrera en línea recta de hasta 4 casillas contra el primer enemigo. | Daño 6 |
| Ciclón | Nivel 4 | 3 | Ráfaga de radio 1 a tu alrededor (incluye diagonales). | Daño 4, Empuja 2 casillas |
| Tajo del Torbellino | Nivel 5 | 5 | Ráfaga de radio 2 a tu alrededor (incluye diagonales). | Daño 7 |
| Vuelo de Cuervo | Se aprende (manual, maestro o jefe) | 3 | Te desplazas al instante a una casilla libre visible (alcance 7). | Utilidad |
| Viento Cortante | Se aprende (manual, maestro o jefe) | 4 | Área de radio 1 sobre una casilla visible (alcance 6). | Daño 5, Vulnerable 3 turnos |
| Remolino | Se aprende (manual, maestro o jefe) | 4 | Ráfaga de radio 3 a tu alrededor. | Daño 2, Arrastra 2 casillas hacia ti |

#### Piedra
| Técnica | Obtención | Kiro | Forma | Efecto |
|---|---|---|---|---|
| Muro de Pizarra | Nivel 1 | 3 | Tres casillas en perpendicular (alcance 4). | Barrera 6 rondas |
| Piel de Roca | Nivel 2 | 3 | Se aplica sobre ti. | Tú: Protegido 8 turnos |
| Golpe Sísmico | Nivel 3 | 4 | Ráfaga de radio 1 a tu alrededor. | Daño 5, Aturdido 1 turno |
| Lanza de Roca | Nivel 4 | 4 | Línea recta de 4 casillas; se detiene en obstáculos. | Daño 7, Atado 2 turnos |
| Derrumbe | Nivel 5 | 6 | Área de radio 2 sobre una casilla visible (alcance 5). | Daño 7, Aturdido 1 turno |
| Fortaleza de Pizarra | Se aprende (manual, maestro o jefe) | 4 | Tres casillas en perpendicular (alcance 5). | Barrera 10 rondas |
| Puño de Granito | Se aprende (manual, maestro o jefe) | 4 | Ráfaga de radio 1 a tu alrededor (incluye diagonales). | Daño 9, Empuja 1 casillas |
| Temblor Profundo | Se aprende (manual, maestro o jefe) | 5 | Ráfaga de radio 3 a tu alrededor. | Daño 3, Ralentizado 3 turnos |

#### Rayo
| Técnica | Obtención | Kiro | Forma | Efecto |
|---|---|---|---|---|
| Aguja Resonante | Nivel 1 | 3 | Una casilla visible (alcance 5). | Daño 5 (ignora defensa), Aturdido 1 turno |
| Chispazo | Nivel 2 | 2 | Ráfaga de radio 1 a tu alrededor (incluye diagonales). | Daño 4 (ignora defensa) |
| Descarga Estática | Nivel 3 | 4 | Ráfaga de radio 2 a tu alrededor. | Daño 4 (ignora defensa) |
| Relámpago | Nivel 4 | 5 | Línea recta de 8 casillas; se detiene en obstáculos. | Daño 7 (ignora defensa) |
| Tormenta Cercana | Nivel 5 | 7 | Ráfaga de radio 3 a tu alrededor. | Daño 6 (ignora defensa), Aturdido 1 turno |
| Paso Relámpago | Se aprende (manual, maestro o jefe) | 3 | Te desplazas al instante a una casilla libre visible (alcance 5). | Tú: Potenciado 3 turnos |
| Red de Rayos | Se aprende (manual, maestro o jefe) | 4 | Área de radio 1 sobre una casilla visible (alcance 5). | Daño 4 (ignora defensa), Atado 3 turnos |
| Carga Interior | Se aprende (manual, maestro o jefe) | 0 | Se aplica sobre ti. | Recuperas 6 de kiro, Pagas 3 de vida |

#### Comunes
| Técnica | Obtención | Kiro | Forma | Efecto |
|---|---|---|---|---|
| Clon de Sombra | Se aprende (manual, maestro o jefe) | 4 | Se aplica sobre ti. | Invoca 1 aliado (10 rondas) |
| Sustitución | Se aprende (manual, maestro o jefe) | 4 | Te desplazas al instante a una casilla libre visible (alcance 4). | Los perseguidores pierden tu rastro |

Contrajuego previsto: las técnicas de línea exigen alineación; las de área quedan bloqueadas por la línea de visión; la barrera sirve también como trampa para el propio jugador en pasillos. Los manuales aparecen en cofres lacados, cámaras selladas y en la tienda; la Maestra Sayoko y el Maestro Tobari enseñan una técnica que no se consigue por nivel.

### 2.2 Estados **[Implementado]**
| Estado | Efecto | A quién |
|---|---|---|
| Quemadura | 1 de daño por ronda (ignora defensa) | Ambos |
| Veneno | 1 de daño por ronda (ignora defensa) | Ambos |
| Aturdido | Pierde su próxima acción | Enemigos |
| Ralentizado | Solo actúa una de cada dos rondas | Enemigos |
| Atado | No puede moverse (aún ataca a quien tenga al lado) | Enemigos |
| Vulnerable | −2 de defensa | Enemigos |
| Protegido | +2 de defensa | Jugador |
| Potenciado | +2 de poder | Jugador |
| Regeneración | +1 de vida por ronda | Jugador |
| Sigilo | Los enemigos solo te notan pegados a ti | Jugador |
| Oscuridad (ceguera) | Tu visión se reduce a 2 casillas | Jugador |

Los jefes son inmunes a aturdimiento, empuje y ataduras.

## 3. Linajes originales candidatos
| Linaje | Tema | Posible despertar |
|---|---|---|
| Hilo Umbrío | Sombras y ataduras | Doble de Penumbra |
| Oído de Jade | Percepción de vibraciones | Lectura del Pulso |
| Piel de Basalto | Defensa y endurecimiento | Coraza Viviente |
| Voz Hueca | Resonancia y ondas | Campana Interior |

No todos deben estar disponibles al inicio. Cada linaje requiere historia, coste y contrajuego.

## 4. Enemigos **[Implementado]**
Hay tres familias: **monstruos** (criaturas del Pulso), **shinobi** (ninjas de las facciones, con habilidades propias) y **ecos** (invocados). Base en el sector de aparición; en cada sector posterior ganan +2 de vida y +1 de poder cada dos sectores. Por sector hay de 4 a 9 enemigos (tope por sector: 5, 7, 8, 9, 9, 9). **Un enemigo alertado te persigue desde lejos (hasta 40 casillas de camino), también a través de puertas, y rastrea tu posición real unas rondas tras perderte**, para que siempre puedas plantarle cara cuerpo a cuerpo.

| Enemigo | Familia | Vida | Poder | Def. | Desde | Habilidades |
|---|---|---|---|---|---|---|
| Acechador de Hollín | monster | 10 | 4 | 0 | 1 | — |
| Cuervo de Sal | monster | 5 | 3 | 0 | 1 | — |
| Larva de Piedra | monster | 16 | 4 | 2 | 2 | — |
| Lobo de Raíz | monster | 14 | 4 | 0 | 4 | — |
| Espora Flotante | monster | 8 | 3 | 0 | 4 | Nube Cegadora (aviso 2) |
| Aprendiz Renegado | shinobi | 9 | 4 | 0 | 1 | Lanzar kunai |
| Tirador de Junco | shinobi | 7 | 3 | 0 | 2 | — |
| Espadachín de Laca | shinobi | 15 | 5 | 1 | 2 | Tajo Giratorio (aviso 1) |
| Rastreador del Hilo Gris | shinobi | 11 | 4 | 0 | 2 | Paso Fantasma |
| Monje Hueco | shinobi | 12 | 6 | 1 | 2 | Pulso Hueco (aviso 2) |
| Acólito de la Campana | shinobi | 12 | 5 | 0 | 3 | Cruz de Plegaria (aviso 2) |
| Adepto de la Brasa | shinobi | 12 | 5 | 0 | 4 | Aliento de Brasa (aviso 1) |
| Envenenador de Raíz | shinobi | 10 | 3 | 0 | 4 | Senbon envenenadas |
| Sellador Invocador | shinobi | 12 | 3 | 0 | 4 | Clones de Niebla |
| Maestro del Trueno | shinobi | 15 | 5 | 1 | 5 | Relámpago en Cruz (aviso 2) |
| Eco Menor | echo (invocado) | 6 | 3 | 0 | — | — |
| Clon de Niebla | echo (invocado) | 4 | 3 | 0 | — | — |
| Sōkan, Predicador Hueco | shinobi (jefe) | 44 | 7 | 2 | — | Golpe de Cayado (aviso 2); Onda de Campana (aviso 2) [fase 2+]; Sello Hueco (aviso 2) |
| Yūgiri, el Hilo Roto | shinobi (jefe) | 52 | 8 | 2 | — | Tajo de Hilo (aviso 1); Paso Fantasma; Corte de Hilo (aviso 1); Red de Hilos (aviso 2) [fase 2+]; Lluvia de Senbon (aviso 1) [fase 2+] |

Las habilidades marcadas con «aviso N» dibujan sus casillas en el suelo y se liberan N rondas después (se esquivan saliendo de la zona). El resto (kunai, senbon, saltos) es inmediato. Los ecos invocados no cuentan para despejar el sector. Los enemigos aturdidos no actúan esa ronda.

## 5. Jefes shinobi **[Implementado]**
Hay un jefe cada tres sectores; la sala de salida es su arena (sin arbustos) y la salida queda sellada mientras viva. Ambos son shinobi con diálogo al verte, al cambiar de fase y al caer, inmunes a aturdimiento, empuje y ataduras, y sueltan una reliquia, 15 monedas y 3 esquirlas. **Al caer un jefe aparece un mercader** y la estética de la zona cambia (ver `05_direccion_artistica_audio.md`).
- **Sōkan, Predicador Hueco** (sector 3; 44 vida, poder 7, def. 2): Golpe de Cayado (rombo de radio 2 a su alrededor) si estás cerca; desde la fase 2, Onda de Campana (cruz sobre ti); Sello Hueco y refuerzos de Ecos Menores en la fase 3. Reliquia: **Sello antiguo**.
- **Yūgiri, el Hilo Roto** (sector 6; 52 vida, poder 8, def. 2): Tajo de Hilo, Paso Fantasma (salto a tu lado), Corte de Hilo; desde la fase 2, Red de Hilos y Lluvia de Senbon; invoca Clones de Niebla. Reliquia: **Carrete del Hilo Roto**. Al caer, la expedición se completa cruzando la salida.
- No hay un monstruo-campana: el Campanero fue sustituido por Sōkan, líder del Círculo de la Campana Hueca.

## 5.1 Eventos y maestros **[Implementado]**
- **Altar del Eco Roto** (sectores 1 y 4): *Ofrenda de sangre* (−6 vida → +1 poder, +2 kiro máx.), *Plegaria de kiro* (todo el kiro, mín. 3 → curación total), *Ofrenda de acero* (3 shuriken → +1 defensa).
- **Maestro Tobari** (sector 5): *Técnica oculta* (aprendes una técnica de tu afinidad que no sale por nivel), *Temple de raíz* (+6 de vida máx. y curación total), *Aliento del bosque* (+6 de kiro máx.), *Filo y piel* (−5 de vida → +1 poder y +1 defensa).
- **Maestra Sayoko** (sector 2): *Filo del Maestro* (+1 poder), *Respiración profunda* (+4 kiro máx.), *Piel de corteza* (+1 def., +4 vida máx.), *Lección adelantada* (técnica avanzada de tu afinidad).
- **Mercader de la Casa del Hilo Gris**: aparece tras cada jefe (ver §5.4).
- **Notas de lore** (14 pergaminos opcionales, 1–2 por sector): cuentan la historia de la cripta, del Círculo de la Campana Hueca y de la Casa del Hilo Gris. Se leen en la pestaña Notas del menú.

## 5.4 Botín, llaves, forja y tienda **[Implementado]**
Objetos: **moneda**, **esquirla** (material de forja), **llave de hierro** (abre la puerta con candado) y **llave de laca** (abre el cofre lacado). Las llaves se ven brillando en el suelo (nunca entre arbustos), se marcan en el minimapa al explorarlas y, al entrar en el sector, el registro avisa de dónde están. Las mesas de forja (sectores 2, 3 y 5) mejoran armas y **purifican piezas malditas** (10 monedas). Tras cada jefe aparece el **Mercader de la Casa del Hilo Gris**, que vende —ya identificado y sin maldición— ungüentos, tónicos, una poción, un pergamino, una pieza de equipo y un manual de técnica. Las monedas son escasas a propósito: enemigos 35 % (1–2), jefes 15, y la forja y la tienda son sus únicos destinos. Ver `02_sistemas_y_reglas.md` §11.

## 5.5 Sigilo, arbustos y puertas **[Implementado]**
Ver `02_sistemas_y_reglas.md` §10.1. Resumen: arbustos y puertas cerradas tapan la visión; esconderse tiene un precio (ves menos); los enemigos solo actúan al verte; atacar a quien no te ha visto hace ×2.

## 6. Objetos y equipo **[Implementado]**
### 6.1 Consumibles
- Tónico de Kiro: recupera 5 de kiro (tecla 5).
- Ungüento de Musgo: recupera 8 de vida (tecla 6; se empieza con uno).
- Pociones y pergaminos de ninjutsu (§6.3), manuales de técnica (se estudian desde Tab → Objetos).

### 6.2 Equipo
Equipo con **dos ranuras** (arma y vestimenta). Se llevan varias armas y varias vestimentas, pero se usa una de cada. **Nada se equipa solo**: lo encontrado viene **sin identificar** («Hoja afilada (?)») y puede ser corriente, estar **encantado** (20–28 % de probabilidad) o **maldito** (20 %). Equiparlo lo identifica. Lo maldito queda pegado al cuerpo (no se puede cambiar esa ranura) hasta purificarlo con un Sello de Purificación o en la forja. Lo vendido por el mercader siempre viene identificado y limpio.

**Armas cuerpo a cuerpo** (B cambia a la siguiente; gasta un turno):
| Arma | Tipo | Poder | Alcance | Aparece desde | Nota |
|---|---|---|---|---|---|
| Tanto gastado (inicial) | Hoja | +0 | 1 | — | |
| Kunai de hierro | Hoja | +1 | 1 | Sector 1 | |
| Hoja afilada | Hoja | +2 | 1 | Sector 2 | |
| Hoja de ceniza | Hoja | +3 | 1 | Sector 3 | |
| Látigo de cadena | Látigo | +0 | 2 | Sector 1 | Línea recta; golpea al primero |
| Lanza de bambú | Lanza | +1 | 2 | Sector 2 | Línea recta; atraviesa |

**Armas arrojadizas** (consumibles; G lanza, **V cambia de tipo**; se lanzan a una casilla visible y se detienen en el primer enemigo). Las armas y arrojadizas se dan con mucha menos frecuencia que en el prototipo anterior.
| Arma | Daño | Alcance | Probabilidad de perderse | Aparece desde | Nota |
|---|---|---|---|---|---|
| Shuriken (se empieza con 5) | 3 | 5 | 25% | Sector 1 | Si acierta se clava en el enemigo y cae al morir; si falla cae al suelo |
| Kunai arrojadizo | 4 | 4 | 15% | Sector 2 | |
| Senbon | 4 | 6 | 40% | Sector 1 | Ignora la defensa |

**Vestimenta:** Chaleco acolchado (+1, sector 1), Cota de láminas (+2, sector 2), Coraza de pizarra (+3, sector 3).

**Encantamientos y maldiciones:**
| Modificador | Pieza | Tipo | Efecto |
|---|---|---|---|
| de Llama | Arma | Encantamiento | Los golpes prenden al enemigo (quemadura). |
| de Marea | Arma | Encantamiento | Sus golpes ralentizan al enemigo. |
| de Trueno | Arma | Encantamiento | A veces aturde al enemigo con una descarga. |
| del Colmillo | Arma | Encantamiento | Inyecta veneno con cada golpe. |
| de Filo Fino | Arma | Encantamiento | +2 de poder. |
| de la Sed Oscura | Arma | Encantamiento | Cada golpe te devuelve 1 de vida. |
| del Eco de Kiro | Arma | Encantamiento | Cada golpe te devuelve 1 de kiro. |
| Oxidada | Arma | Maldición | Maldita: −2 de poder. No puedes soltarla hasta purificarla. |
| del Sello de Sangre | Arma | Maldición | Maldita: cada golpe te cuesta 1 de vida. No puedes soltarla. |
| de Plomo | Arma | Maldición | Maldita: −1 de poder y te roba 1 de kiro con cada golpe. No puedes soltarla. |
| de Roca | Vestimenta | Encantamiento | +1 de defensa extra. |
| de Corriente | Vestimenta | Encantamiento | Recuperas 1 de vida cada 6 rondas. |
| de Espinas | Vestimenta | Encantamiento | Quien te golpea cuerpo a cuerpo recibe 2 de daño. |
| de Pluma | Vestimenta | Encantamiento | Recuperas 1 de kiro extra cuando el kiro se regenera. |
| Quebradiza | Vestimenta | Maldición | Maldita: −2 de defensa. No puedes quitártela hasta purificarla. |
| de Cadenas | Vestimenta | Maldición | Maldita: no recuperas kiro con el tiempo. No puedes quitártela. |
| de la Presa | Vestimenta | Maldición | Maldita: cada golpe que recibes duele 1 más. No puedes quitártela. |

### 6.3 Pociones y pergaminos sin identificar **[Implementado]**
Inspirado en Pixel Dungeon, con motivos de ninjutsu (invocaciones, clones, sellos, sustitución). En cada partida cada efecto recibe una **apariencia al azar** («Poción ámbar», «Pergamino «Kan»») con su propio icono; hasta que lo usas no sabes qué hace, y al usarlo se identifica ese tipo para toda la expedición. Los hay malos. **Cada afinidad reconoce sin usarlos una poción y un pergamino**: Ascua (Poción Ígnea, Sello Explosivo), Marea (Sanación, Sello de Purificación), Vendaval (Sombra, Sustitución), Piedra (Piel de Roca, Invocación: Sapo) y Rayo (Kiro Mayor, Sello de Inmovilidad). Precios en la tienda según el efecto.

| Poción | Bondad | Efecto | Precio |
|---|---|---|---|
| Poción de Sanación | buena | Cierra las heridas: recuperas 15 de vida y te libras de quemaduras y venenos. | 14 |
| Poción de Kiro Mayor | buena | Recuperas 12 de kiro. | 12 |
| Píldora Akimichi | buena | Una píldora de las que devoran la grasa y dan fuerza: +1 de poder permanente. | 40 |
| Poción de Sombra | buena | Durante 20 rondas los enemigos solo te notan si están pegados a ti. | 12 |
| Poción de Savia | buena | Recuperas 1 de vida por ronda durante 15 rondas. | 10 |
| Poción de Piel de Roca | buena | Tu defensa sube +2 durante 25 rondas. | 10 |
| Poción de Ojo Blanco | buena | Tu mirada atraviesa las paredes: revelas todo el mapa del sector. | 12 |
| Poción de Hiel | mala | Veneno puro: pierdes vida cada ronda durante 6 rondas. | 4 |
| Poción de Niebla Oscura | mala | Una niebla negra te nubla la vista durante 15 rondas. | 4 |
| Poción Ígnea | mala | Aliento de fuego: prendes en llamas durante 3 rondas. | 4 |
| Poción Estridente | mala | Un silbido agudo: todos los enemigos del sector sabrán dónde estás. | 4 |

| Pergamino | Bondad | Efecto | Precio |
|---|---|---|---|
| Pergamino de Invocación: Sapo | bueno | Sellas con sangre y aparece un sapo de piedra que combate a tu lado 15 rondas. | 16 |
| Pergamino de Invocación: Cuervos | bueno | Dos cuervos veloces te acompañan 12 rondas. | 16 |
| Pergamino de Clones | bueno | Dos clones de sombra luchan a tu lado 8 rondas. | 14 |
| Pergamino de Sustitución | bueno | Dejas un tronco y reapareces en otro punto explorado del sector; los perseguidores pierden tu rastro. | 12 |
| Pergamino de Cartografía | bueno | Un mapa dibujado por el viento: revela todo el sector. | 12 |
| Sello de Purificación | bueno | Rompe las maldiciones del arma y la vestimenta que llevas puestas. | 18 |
| Sello Explosivo | bueno | Estalla a tu alrededor: 8 de daño (ignora defensa) a los enemigos a ≤3 casillas con línea de visión. | 14 |
| Sello de Inmovilidad | bueno | Ata las sombras de los enemigos que ves durante 5 rondas (los jefes se resisten). | 14 |
| Pergamino de Genjutsu | bueno | Una ilusión aturde a los enemigos que ves durante 4 rondas (los jefes se resisten). | 14 |
| Pergamino de Refuerzo | bueno | Tu arma equipada gana un nivel de forja gratis. | 24 |
| Pergamino de Revelación | bueno | Identifica todo tu equipo y una poción o pergamino desconocido. | 14 |
| Pergamino de Estruendo | malo | Un trueno sin tormenta: todos los enemigos del sector sabrán dónde estás. | 4 |

Pendientes de la biblia original: Pergamino de Ceniza (ataque de área de un uso), Sello de Retorno (extracción bajo condición), Talismán de Piedra (talismán), Aguja de Resonancia (revela trampas), Máscara del Eco (modifica una técnica con coste). Cuando existan las ranuras de talismán y sello se incorporarán.

Botín de cofres: tabla ponderada por sector. Ningún objeto raro es obligatorio para completar la expedición.

## 7. Progresión durante la expedición **[Implementado]**
- **Subida de nivel controlada:** como mucho **un nivel por sector**, y solo si se derrota a *todos* los enemigos de ese sector (los invocados no cuentan). El HUD muestra «enemigos x/y» y «sector despejado». Los enemigos dan XP y monedas pero ya no suben el nivel por sí solos.
- Cada nivel: +4 de vida máxima (y de vida actual), +1 de kiro máximo (y actual), +1 de poder en los niveles pares, y se desbloquea la técnica de nivel de tu afinidad (niveles 2 a 5).
- **Regeneración natural:** 1 de vida cada 10 rondas y **1 de kiro cada 3 rondas** (esperar recupera 2).
- La estética del sector cambia al derrotar a cada jefe.

## 8. Estructura de una expedición y mapas **[Implementado]**
- Una expedición tiene **6 sectores** en tres zonas: sectores 1–3 (Bosque del Umbral; jefe **Sōkan** en el 3), sectores 4–6 (Raíces Hundidas; jefe **Yūgiri** en el 6). Al caer Sōkan cambia la estética a las Raíces Hundidas; al caer Yūgiri, al Santuario de Ceniza. Cruzar la escalera lleva al siguiente sector conservando el personaje; en el último, gana.
- Cada sector es un mapa grande (64×44 casillas, estilo Pixel Dungeon): hasta 12 salas rectangulares unidas por pasillos de una casilla, más algunos bucles, con grupos de arbustos en las salas y puertas en la boca de algunos pasillos. La entrada está en una sala al azar y la escalera en la sala más lejana por camino.
- Enemigos repartidos por salas (de 4 a 9 por sector, siempre al menos a 6 casillas de la entrada). De 6 a 9 objetos por el suelo, hasta 2 cofres de madera, una cámara sellada con puerta con candado (75 %) y un cofre lacado (60 %), colocados de modo que nunca corten un camino.
- El tamaño de casilla en pantalla no es fijo: la cámara hace zoom y sigue al jugador; **mantén pulsado y arrastra para mirar lo ya explorado del sector**, y cualquier acción recentra la vista.
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
