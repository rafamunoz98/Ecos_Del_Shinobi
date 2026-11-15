# Documento de diseño del juego (GDD)
## Ecos del Abismo

**Versión:** 0.1 · **Estado:** propuesta inicial

## 1. Visión

Ecos del Abismo es un roguelike de exploración de mazmorras, por turnos y basado en cuadrícula. El jugador desciende por una estructura subterránea cambiante, combate criaturas, encuentra equipo y toma decisiones arriesgadas. Cada expedición debe ser comprensible, táctica y distinta.

**Pilares de diseño**
1. **Decisiones legibles:** el jugador entiende qué puede hacer un enemigo y por qué recibe daño.
2. **Riesgo y recompensa:** explorar una sala opcional puede ofrecer tesoros, pero también peligro.
3. **Rejugabilidad:** mapas, botín y eventos combinados de forma procedural.
4. **Progreso significativo:** cada expedición enseña algo y puede contribuir a desbloqueos permanentes.
5. **Accesibilidad multiplataforma:** controles claros con ratón, teclado y pantalla táctil.

## 2. Público y experiencia

- Público orientativo: jugadores de roguelikes, RPG tácticos y juegos de exploración.
- Sesión objetivo: 10–30 minutos, ampliable según profundidad.
- Ritmo: pausado y táctico; el tiempo no avanza mientras el jugador decide.
- Dificultad: desafiante, pero con señales visuales y reglas consistentes.

## 3. Fantasía y ambientación

Bajo un reino olvidado existe una mazmorra conocida como el Abismo. Sus pasillos se reorganizan y sus criaturas parecen recordar a quienes han descendido antes. El jugador es un explorador que busca el origen de esos ecos.

La historia se revela mediante objetos, inscripciones, encuentros y jefes. Evitar largas escenas que interrumpan la exploración.

## 4. Bucle principal

1. Prepararse en el campamento.
2. Elegir personaje/clase y entrar en la mazmorra.
3. Explorar habitaciones y pasillos.
4. Tomar decisiones tácticas por turnos.
5. Conseguir experiencia, oro, equipo y reliquias.
6. Derrotar al jefe o decidir seguir descendiendo.
7. Morir o regresar; resolver qué progreso se conserva.
8. Desbloquear opciones y comenzar otra expedición.

## 5. Estructura de una expedición

- La mazmorra se divide en plantas.
- Cada planta contiene habitaciones conectadas por pasillos.
- Una salida conduce a la siguiente planta.
- Algunas plantas pueden incluir sala especial, comerciante o evento.
- Se recomienda un jefe cada 5 plantas en el diseño de largo plazo; para el prototipo basta un jefe de prueba en la planta 3 o 5.
- La generación debe garantizar una ruta transitable desde la entrada hasta la salida.

## 6. Perspectiva y presentación

- Vista cenital 2D.
- Mundo organizado en tiles/cuadrícula.
- Tamaño de tile provisional: 16×16 o 32×32 píxeles de arte base; escalar sin suavizado.
- El personaje y los enemigos ocupan una casilla cada uno, salvo excepciones futuras.
- Cámara centrada o suavemente limitada a la habitación actual.

## 7. Movimiento y turnos

- Movimiento ortogonal por defecto: arriba, abajo, izquierda y derecha.
- Una acción válida del jugador consume un turno.
- Las acciones inválidas no consumen turno.
- Tras la acción del jugador, actúan los enemigos que puedan actuar.
- El juego se pausa mientras el jugador decide.
- Las diagonales se reservan para una decisión futura; no incluir en el prototipo.

## 8. Combate

- Ataques cuerpo a cuerpo contra casillas adyacentes.
- Ataques a distancia con alcance y línea de visión.
- Daño calculado mediante atributos, arma, defensa y modificadores.
- Mostrar daño, curación, estados y causa de muerte.
- Enemigos con telegráficos sencillos cuando usen ataques especiales.
- No permitir que animaciones o latencia alteren el orden lógico de turnos.

## 9. Personajes y clases

Clases iniciales propuestas:
- **Guerrero:** resistente, combate cuerpo a cuerpo.
- **Mago:** frágil, utiliza hechizos y control.
- **Asesino:** crítico, veneno y movilidad.

Cada clase debe tener:
- Atributos iniciales.
- Una habilidad activa.
- Una pasiva.
- Un estilo reconocible sin depender de equipo específico.

En el prototipo puede implementarse una sola clase y dejar las otras dos como datos/diseño pendiente.

## 10. Enemigos

Enemigos iniciales propuestos:
- Slime: persigue y ataca en contacto.
- Esqueleto: enemigo cuerpo a cuerpo básico.
- Arquero: busca distancia y línea de visión.
- Murciélago: rápido, con poca vida.
- Mago corrupto: ataque mágico telegrafiado.

Cada enemigo define vida, daño, defensa, alcance, velocidad de decisión, comportamiento y botín.

## 11. Objetos y economía

Categorías:
- Armas.
- Armaduras.
- Consumibles.
- Anillos/amuletos.
- Reliquias con efectos modificadores.
- Moneda y materiales.

Rarezas iniciales: común, poco común, rara, épica y legendaria. La rareza no debe ser el único determinante de utilidad: algunos objetos comunes pueden ser situacionales.

## 12. Progresión

**Durante la expedición:** experiencia, niveles, equipo, consumibles y reliquias.  
**Entre expediciones:** desbloqueos, mejoras del campamento, nuevas clases y registros de descubrimientos.

Regla de muerte propuesta:
- Se pierde el equipo temporal y el botín no asegurado.
- Se conserva una moneda/meta-recurso limitada, o una fracción de ella.
- Se conservan desbloqueos y logros.
- La regla final debe evitar que una mala racha haga imposible continuar.

## 13. Campamento

Áreas previstas:
- Herrero: mejora o recicla equipo.
- Alquimista: prepara consumibles.
- Mercader: vende objetos.
- Archivo: consulta enemigos, objetos y lore.
- Puerta del Abismo: inicia expedición.

No es necesario construir el campamento completo para el primer prototipo.

## 14. Generación procedural

La generación debe:
- Crear salas dentro de límites definidos.
- Conectar salas mediante pasillos.
- Garantizar conectividad entre entrada y salida.
- Evitar colocar objetos dentro de paredes o en casillas inaccesibles.
- Evitar solapamientos de entidades.
- Tener semilla reproducible para depuración y desafíos diarios.
- Incluir pruebas automáticas de conectividad.

## 15. Modos y funciones posteriores

No forman parte del primer prototipo:
- Semilla diaria compartida.
- Clasificaciones.
- Desafíos semanales.
- Misiones y eventos narrativos avanzados.
- Más biomas y jefes.
- Sincronización de partidas en la nube.
- Cooperativo o multijugador (solo tras validar el juego individual).

## 16. Monetización y principios

Primero validar diversión y retención. Modelo inicial recomendado: juego gratuito de navegador con opción de compra única o cosméticos no competitivos si el juego demuestra interés. Evitar vender poder que rompa el equilibrio. Publicidad no intrusiva y nunca durante una decisión táctica.

No utilizar personajes, nombres, música, ilustraciones o marcas de anime/juegos ajenos sin autorización. La inspiración de género no concede derechos sobre elementos protegidos.

## 17. Alcance del primer prototipo

Debe incluir:
- Una clase.
- Una planta pequeña generada o una plantilla modular.
- Movimiento por casillas.
- Un enemigo.
- Combate y muerte.
- Una poción.
- Un cofre.
- Una escalera.
- Interfaz mínima y reinicio.
- Guardado local opcional si no retrasa el bucle principal.

**Fuera de alcance:** campaña completa, economía compleja, 20 plantas, 15 enemigos, PvP, cuentas, tienda real, ranking online y app móvil publicada.
