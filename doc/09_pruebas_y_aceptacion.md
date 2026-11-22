# Plan de pruebas y criterios de aceptación

## 1. Movimiento
Probar casilla libre, pared, borde de mapa, enemigo ocupando destino y acción inválida. Las acciones inválidas no deben consumir turno.

## 2. Turnos
Una acción válida activa una sola ronda enemiga. Una acción inválida no activa enemigos. Enemigos derrotados no actúan. No aceptar entradas dobles mientras se resuelve una ronda.

## 3. Kiro y técnicas
Verificar coste exacto, rechazo si no hay energía suficiente, alcance, línea de visión, área de efecto, objetivos válidos y estados aplicados. Una técnica no debe gastar recursos si falla la validación.

## 4. Combate
Probar daño mínimo, defensa, muerte, curación, estados periódicos y ataques de área. Verificar que el registro explique qué ocurrió.

## 5. Procedural
Probar cientos/miles de semillas: entrada y salida conectadas, sin enemigos en paredes, sin solapamientos sólidos, botín alcanzable, dimensiones válidas y resultado reproducible.

## 6. Progresión
Verificar experiencia, desbloqueos, requisitos de técnica, linaje y transformación. No permitir desbloqueos duplicados ni estados imposibles tras cargar partida.

## 7. Guardado
Guardar/cargar conserva estado; datos corruptos no bloquean el juego; versionado y migración funcionan; cerrar la pestaña no deja guardado parcial.

## 8. UX y compatibilidad
Probar teclado, ratón y táctil; tamaños de pantalla; Chrome, Firefox y Safari actuales. Confirmar que costes, alcance y telegráficos son legibles.

## 8.1 Estado de las pruebas automáticas (Hito 6.10)
418 pruebas (Vitest) sobre el núcleo, el generador y los datos de contenido. Cubren, entre otras cosas: fuerza y requisitos de armas, ciclo de afinidades, pociones arrojables, reacciones del terreno, caída por precipicios (no letal, aterrizaje lejos de enemigos), minidesafíos con el objeto asegurado y alcanzable en 150 semillas, cámaras ocultas, joyas (identificación, maldiciones, purificación), las 10 técnicas de fusión (requisito de ambas afinidades, ventaja elemental, Manual de Fusión, mercader y bibliotecas), compañero (generación sin cortar caminos en 30 semillas, rescate, caída y reaparición) y eco (registro, sector, colocación sin alterar el resto, botín purificado). La simulación `echo` (duelo con un bot que no esquiva, 25 combinaciones de afinidad por sector) dio: con hoja y cota ≈ 90 % de victorias; a puños y sin armadura ≈ 65 %; con compañero entre 72 % y 100 %. Verificado a mano en Chromium (escritorio 1280×720 y móvil 390×780) sin errores de consola.
Añadidas en el Hito 6.10: identificación a 150 rondas y por uso (armas, vestimentas y joyas), altar con 3 de 9 ofrendas distintas entre semillas, charcos y precipicios generados (150 semillas), reducción de botín, sala secreta una por fase, Garra de Relámpago, icono de fusión; y para la presentación, el **mapa de sonidos** (`cuesFor`, `moodFor`), un **contexto de audio falso** que comprueba que los 48 efectos y la música se programan sin NaN, sin rampas a 0 y por debajo de un volumen razonable, el **compositor** (reproducible, dentro de la escala, tambores solo con tensión), el evento `PlayerSearched` y la regla de la **diagonal** (`isTeleport`).
Comprobación en Chromium (escritorio 1280×720 y móvil 390×780): el audio no existe hasta el primer gesto y después corre; la música y los efectos suenan sin saturar y **M / N / botones** los silencian y recuerdan; el paso en diagonal pasa por posiciones intermedias; Buscar crea efectos visuales; se ven charcos, precipicio y el icono de fusión; sin errores de consola. Los efectos y la música también se renderizaron sin altavoces para medir pico, RMS y desplazamiento de continua. **No se ha podido escuchar nada**: falta una prueba de oído.

## 9. Salida de beta
Sin errores críticos conocidos, mapas válidos, bucle completo, guardado recuperable, controles claros, rendimiento aceptable y licencias documentadas.
