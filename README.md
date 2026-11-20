# Ecos del Shinobi — documentación del proyecto
**Versión 0.2 · Rediseño conceptual · 14 de noviembre de 2026**

## Dirección aprobada
- Universo ninja original inspirado en la fantasía de clanes, técnicas y energía espiritual de los shonen.
- Mazmorras y exploración procedural como estructura principal.
- Progresión profunda: técnicas, afinidades, linajes, despertares, invocaciones y transformaciones.
- Primero desarrollar y validar el juego; decidir monetización después.
- Primera plataforma: navegador. Aplicación móvil futura mediante una capa de empaquetado como Capacitor.

## Documentos
1. `01_GDD.md` — visión, mundo, pilares y alcance.
2. `02_sistemas_y_reglas.md` — turnos, combate, chakra, técnicas y progresión.
3. `03_mundo_lore_y_facciones.md` — historia, regiones, clanes y bestias.
4. `04_arquitectura_tecnica.md` — stack, módulos y portabilidad.
5. `05_direccion_artistica_audio.md` — arte, animación, sonido y licencias.
6. `06_ux_pantallas_y_controles.md` — interfaz y accesibilidad.
7. `07_hoja_de_ruta_backlog.md` — hitos y tareas.
8. `08_biblia_de_contenido.md` — clases, enemigos, técnicas, objetos y jefes.
9. `09_pruebas_y_aceptacion.md` — calidad y criterios de salida.
10. `10_publicacion_privacidad_y_opciones_comerciales.md` — lanzamiento y decisiones comerciales.
11. `11_riesgos_y_decisiones_pendientes.md` — riesgos y registro de decisiones.

## Principio de propiedad intelectual
El juego debe ser una obra original. No usar personajes, nombres, aldeas, clanes, criaturas, técnicas, símbolos, diseños, música ni textos de Naruto u otras franquicias. La inspiración se limita a ideas generales de género —ninjas, energía interior, rivalidades, entrenamiento y poderes elementales— expresadas mediante nombres, reglas, historia y diseños propios. Antes de comercializar, revisar derechos de todos los recursos y solicitar asesoramiento legal si hay dudas.

## Supuestos
El título **Ecos del Shinobi** es provisional. Los nombres, números y sistemas de este paquete son propuestas para prototipar, no decisiones de balance definitivas. El primer objetivo es una demo pequeña, no el juego completo.

---

## Prototipo jugable

Roguelike RPG táctico por turnos y casillas, de vista cenital, con ambientación ninja original.
Stack: TypeScript + Phaser 3 + Vite + Vitest. El núcleo de reglas (`src/core`) no depende de Phaser ni del DOM.

### Jugar en el navegador

Una vez activado GitHub Pages (Settings → Pages → Source: *GitHub Actions*), el juego se publica solo en
<https://rafamunoz98.github.io/Ecos_Del_Shinobi/> cada vez que se sube código a `main`.

### Cómo ejecutarlo

```bash
npm install
npm run dev        # servidor de desarrollo
npm test           # pruebas del núcleo
npm run typecheck
npm run lint
npm run build
```

`?seed=123` en la URL reproduce una expedición concreta.

### Controles (escritorio)

| Tecla | Acción |
|---|---|
| Flechas / WASD | Mover; si hay un enemigo en esa casilla, atacarlo (con el arma equipada) |
| Q / E / Z / C (o teclado numérico 7 9 1 3, Inicio/RePág/Fin/AvPág) | Mover o atacar en **diagonal** (↖ ↗ ↙ ↘) |
| Espacio | Esperar (recupera 2 de kiro; el kiro también se recupera solo con el tiempo) |
| X / Enter | Interactuar: hablar con un PNJ o mercader (no gasta turno), abrir cofre, bajar la escalera (también basta caminar contra el objeto) |
| 1 / 2 / 3 / 4 | Técnica de la ranura 1–4. Las que se apuntan abren el modo de apuntado: flechas o QEZC, Enter confirma, Esc cancela |
| 5 / 6 | Tónico de Kiro / Ungüento de Musgo |
| F | Ataque de alcance (látigo y lanza) |
| G | Lanzar la arma arrojadiza elegida: flechas mueven el cursor, Enter lanza |
| V | Cambiar de arma arrojadiza (también mientras apuntas; no gasta turno) |
| B | Cambiar a la siguiente arma de la mochila (gasta un turno) |
| Tab / I | Menú: Estado, Técnicas (grimorio), Objetos, Equipo, Notas y Mapa |
| Ratón: mantener y arrastrar | Mirar otras zonas ya exploradas del sector (cualquier acción recentra) |
| Rueda del ratón, + / − | Zoom |
| R | Nueva expedición |

En pantallas táctiles aparece una cruceta de 8 direcciones (las esquinas son diagonales), un botón «Usar» y otro de cancelar; arrastrar con un dedo mueve la vista, y todos los botones de la barra de acciones son pulsables.

### Estado frente a la hoja de ruta

- **Hito 0** Proyecto base, scripts, lint, CI.
- **Hito 1** Mapa de tiles, movimiento ortogonal, colisiones, cámara con zoom, teclado, niebla de guerra.
- **Hito 2** Motor de turnos con comandos validados, enemigos que persiguen, esperar, registro de combate.
- **Hito 3** Vida, daño, ataque básico, kiro, técnicas con coste y área visibles, muerte y pantalla de resultado.
- **Hito 4** Cofres con botín por sector, consumibles, equipo (arma y vestimenta), experiencia y niveles, escalera al siguiente sector (3 por expedición).
- **Hito 5** Generador procedural de mapas grandes (64×44) con salas y pasillos, entrada/salida alcanzables, enemigos y cofres colocados sin bloquear caminos, semilla reproducible, pruebas sobre 150 semillas × 3 sectores.
- **Hito 5.5** Sigilo (arbustos y puertas que tapan la visión, alerta, golpe furtivo), armas cuerpo a cuerpo (hoja, látigo, lanza) y arrojadizas (se gastan o se recogen), menú de personaje y motor gráfico propio (arte vectorial por sector, luz y efectos).
- **Hito 6** Vertical slice: ataques anunciados (telegraphs), Monje Hueco, jefe Campanero Sepultado en tres fases, un evento (Altar del Eco Roto) y un maestro (Maestra Sayoko) con decisiones, diálogos, notas de lore y resumen de expedición con estadísticas.
- **Hito 6.5** Botín (objetos por el suelo, cofres, monedas y esquirlas), puertas con candado y llaves, cofre lacado, armas arrojadizas que se clavan y mesas de forja para mejorar armas.
- **Hito 6.6** Ampliación: 6 sectores en dos zonas con **jefes shinobi** (Sōkan y Yūgiri), 10 shinobi con habilidades, movimiento diagonal, kiro que se recupera con el tiempo, 40 técnicas por afinidad con grimorio, equipo sin identificar (encantado o maldito), 11 pociones y 12 pergaminos sin identificar, mercader tras cada jefe, enemigos que persiguen a través de puertas, nivel controlado (uno por sector despejado) y estética que cambia al caer cada jefe.
- Siguiente: Hito 7 (progresión permanente: árbol de técnicas, desbloqueos, linaje, refugio).

### Contenido

- **Afinidades:** Ascua, Marea, Vendaval, Piedra y Rayo. Se sortea una al empezar; cada una tiene 5 técnicas que se desbloquean por nivel y 3 que se aprenden (manuales o maestros), más 2 comunes. Se llevan 4 equipadas y el resto queda en el grimorio. Detalle en `doc/08_biblia_de_contenido.md`.
- **Enemigos:** monstruos (Acechador de Hollín, Cuervo de Sal, Larva de Piedra, Lobo de Raíz, Espora Flotante) y shinobi con habilidades (Aprendiz Renegado, Tirador de Junco, Espadachín de Laca, Rastreador del Hilo Gris, Monje Hueco, Acólito de la Campana, Adepto de la Brasa, Envenenador de Raíz, Sellador Invocador, Maestro del Trueno). **Jefes:** Sōkan, Predicador Hueco (sector 3) y Yūgiri, el Hilo Roto (sector 6).
- **Objetos:** armas y vestimentas **sin identificar** que pueden estar encantadas o malditas; pociones y pergaminos de ninjutsu que se identifican al usarlos (cada afinidad reconoce una de cada clase); manuales de técnica; mercader tras cada jefe; mesas de forja que mejoran armas y purifican lo maldito.
- **Nivel:** solo se sube uno por sector, y únicamente al derrotar a todos sus enemigos.
- **Sigilo:** los arbustos y las puertas cerradas tapan la visión; escóndete, sorprende (×2 de daño) o rodea. Pero cuidado: un enemigo que te ha notado te sigue desde lejos.
- **Mapas:** el tamaño de casilla en pantalla es solo de presentación; la cámara sigue al jugador, hace zoom y se puede arrastrar. El tamaño del mapa se configura en `src/content/balance.ts`.

### Estructura

```text
src/core/          reglas puras: estado, comandos, turnos, combate, grid, rng
src/content/       datos: técnicas, afinidades, objetos y equipo, enemigos, balance
src/dungeon/       generador de sectores, colocación de enemigos, parser de salas ASCII
src/presentation/  escena Phaser y motor gráfico propio (art/: tiles, personajes, iconos, efectos, renderizador)
src/ui/            HUD, menú, minimapa y estilos (DOM)
src/tests/         pruebas (Vitest)
```

### Decisiones aplicadas del documento de decisiones

- Movimiento en 8 direcciones (se añadió tras probar el Hito 6.5).
- Extracción voluntaria no disponible (`Extract` se rechaza con mensaje).
- Mapa con niebla: solo se ve lo visitado; los enemigos solo se dibujan dentro del rango de visión.
- Combate en el mismo mapa, sin pantallas aparte.
- Sin tamaño de tile fijo: mapas grandes con cámara y zoom.

### Reglas de calidad del núcleo

Una acción inválida devuelve el mismo estado y no consume turno; una válida activa una sola ronda enemiga.
La regeneración natural de vida es de 1 cada 10 rondas.
La aleatoriedad usa una semilla guardada en el estado (nunca `Math.random()`).
El estado es JSON plano, listo para guardado versionado (`schemaVersion`).

### Originalidad

Universo, nombres, técnicas y diseños propios. No se usan recursos de Naruto ni de otras franquicias.
Todo el arte está dibujado por código dentro del proyecto (`src/presentation/art`): sin assets externos ni licencias de terceros.
