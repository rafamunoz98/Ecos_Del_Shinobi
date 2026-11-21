# UX, pantallas y controles

## 1. Pantallas
1. Título: nueva expedición, continuar, opciones, créditos.
2. Refugio: preparar equipo, hablar con maestros, desbloquear mejoras.
3. Preparación: estilo, técnicas equipadas, consumibles.
4. Juego: mapa, HUD, registro de combate, botones de acción.
5. Inventario: equipo, sellos, objetos y descripción.
6. Árbol de técnicas: ramas, requisitos y vista previa.
7. Linaje/despertar: progreso, hitos y transformaciones.
8. Pausa y opciones.
9. Derrota/extracción: resumen, botín asegurado y progreso.
10. Bestiario y códice: criaturas, regiones y técnicas descubiertas.

## 2. HUD
Mostrar vida, kiro, estados, sector, técnica seleccionada y registro reciente. Al seleccionar una técnica, resaltar alcance y casillas afectadas. Mostrar coste antes de confirmar.

## 3. Escritorio
- **Mover:** flechas o WASD. **Diagonales:** Q (↖), E (↗), Z (↙), C (↘), o el teclado numérico (7 9 1 3) o Inicio/RePág/Fin/AvPág. Contra un enemigo, atacar; contra un cofre, una puerta con candado, un PNJ o una mesa, interactuar. **Dos flechas pulsadas a la vez (↑ y →, W y D…) se fusionan en una sola diagonal** (ventana de 60 ms; módulo `presentation/chords.ts`), de modo que una diagonal cuesta un único turno; si se mantiene una flecha y se añade otra, la repetición del teclado sigue en diagonal.
- **Espacio:** esperar. **X o Enter:** interactuar (también basta caminar contra el objeto).
- **1–6:** técnicas equipadas (hasta 6). **F:** ataque de alcance. **G:** lanzar (apuntado con flechas/QEZC, Enter confirma). **V:** cambiar de arrojadiza (también al apuntar). **B:** cambiar de arma. **H:** **buscar** (varias rondas tanteando las paredes; la Z ya es la diagonal ↙; en el móvil, el botón 🔍).
- **Tab / I:** menú (Estado, Técnicas con grimorio, Objetos, Equipo, Notas, Mapa). En la forja y en la tienda, 1–9 elige el artículo; Esc o X cierra.
- **Ratón:** mantener pulsado y arrastrar mueve la vista por lo ya explorado (cualquier acción la recentra); rueda o +/− para el zoom.
- **Clic en una casilla** (`GameScene.onTap`, lógica pura en `core/travel.ts`): adyacente = mover, atacar o interactuar como con las flechas (también en diagonal); lejana y ya explorada = **viaje automático** de un paso cada 150 ms por el camino conocido (BFS con diagonales; no atraviesa casillas sin explorar ni enemigos que veas). El viaje se interrumpe si recibes daño, cambia tu estado, ocurre algo más que caminar (recoger, diálogo, enemigo que te nota), hay un ataque anunciado, aparece un enemigo nuevo a la vista, uno se acerca a dos casillas o pulsas cualquier tecla o vuelves a hacer clic. Clic en un enemigo lejano: te acercas hasta quedar a su lado (atacar lo decides tú; con látigo o lanza y el enemigo a tiro, se ataca desde donde estás). Clic sobre ti: esperar, o usar la escalera si estás encima. Con el ratón se previsualiza el camino (puntos) y el destino (marco; rojo = enemigo, dorado = cofre/PNJ/puerta). En el modo de apuntado, un clic mueve el cursor y repetirlo sobre el mismo objetivo lo confirma (en técnicas de línea el clic elige la dirección más cercana).
- **R:** nueva expedición; si hay una partida en curso (turno > 0) **pide confirmación** (S / Intro con «Sí» enfocado confirman, N / Esc cancelan; por defecto el foco está en «No»). También hay un botón «Reiniciar expedición» en Menú → Estado, útil en el móvil. En la pantalla de resultado no se pregunta.

## 4. Táctil
Cruceta de 8 direcciones (las esquinas son las diagonales), ● para esperar/confirmar, y a la derecha «Usar» (interactuar) y ✕ (cancelar). Arrastrar con un dedo por el mapa mueve la vista; **un toque corto sobre una casilla** actúa igual que el clic del ratón (mover, atacar, interactuar o viajar). La barra de acciones es pulsable (técnicas, objetos, lanzar, cambiar arrojadiza, cambiar arma, menú); al apuntar un lanzamiento aparece el botón «Cambiar arrojadiza». Objetivos táctiles grandes y HUD adaptable; el mapa no hace scroll del navegador.

Ventanas modales: **forja** (mejoras y purificación), **tienda** (precio en monedas), **elección de afinidad** (tras el primer jefe: dos opciones al azar, 1 / 2 o clic; bloquea el juego hasta elegir, no gasta turno) y **menú** de personaje; en pantallas pequeñas ocupan el ancho disponible. La cartera (monedas, esquirlas y llaves) vive en el HUD. Los objetos sin identificar se muestran con el icono de su apariencia (frasco o pergamino distinto), y el equipo sin probar con «(?)»; lo maldito se marca en rojo en el menú.

Novedades del Hito 6.9: el HUD muestra **Fuerza**, las **joyas** puestas (anillo y colgante) y, si lo llevas, a tu **compañero** (vida o «fuera de combate»); el botón **Buscar** (H) está en la barra de acciones; saltar a un precipicio **pide confirmación** (cuesta la mitad de tu vida máxima); el menú tiene una sección **Joyas** (equipar/quitar, maldiciones marcadas en rojo), la ficha de técnica indica «fusión X + Y: se aprende con un Manual de Fusión» y una sección **Técnica de fusión** muestra la de tu pareja de afinidades; **Objetos → Lanzar** vale también para pociones; hablar con el **prisionero** abre su diálogo y la ventana «Cortar las ataduras» (una sola opción); al entrar en un sector con prisionero, eco o minidesafío, el registro lo avisa.

## 5. Accesibilidad
Texto escalable, contraste suficiente, señales que no dependan solo del color, pausa real, reducción de destellos/sacudidas, volúmenes separados y controles de teclado.
