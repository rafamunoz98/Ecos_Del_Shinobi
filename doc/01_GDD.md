# GDD — Ecos del Shinobi
**Versión 0.2 · Concepto rediseñado**

## 1. Visión
Ecos del Shinobi es un roguelike RPG táctico de vista cenital, por turnos y basado en casillas. El jugador es un shinobi de un mundo original donde la energía vital, llamada **kiro**, puede moldearse mediante disciplina, afinidades y pactos espirituales. Explora ruinas cambiantes, combate criaturas y rivales, recupera técnicas olvidadas y descubre el origen de una corrupción que está despertando bajo el continente.

**Fantasía central:** convertirse en un shinobi extraordinario a través de decisiones tácticas, entrenamiento, descubrimiento y transformaciones ganadas durante el juego.

## 2. Pilares de diseño
1. **Combate táctico legible:** cada movimiento importa; los enemigos muestran intenciones y áreas de peligro.
2. **Progresión profunda y combinable:** estilos, afinidades, técnicas, sellos, linajes y despertares ofrecen construcciones distintas.
3. **Expediciones rejugables:** salas, rutas, encuentros, recompensas y eventos se combinan proceduralmente.
4. **Poder con coste:** las técnicas fuertes consumen kiro, generan agotamiento o exigen condiciones.
5. **Universo propio:** identidad visual, narrativa, criaturas y nomenclatura originales.
6. **Diseño multiplataforma:** la lógica del juego no depende de Phaser ni del navegador.

## 3. Público y ritmo
Público orientativo: jugadores de roguelikes, RPG tácticos, fantasía ninja y juegos de construcción de personajes. Sesiones de 15–35 minutos como objetivo inicial. El jugador piensa sin presión temporal; el mundo responde cuando ejecuta una acción válida.

## 4. Premisa narrativa
Hace siglos, las primeras órdenes shinobi aprendieron a escuchar el **Pulso**, una corriente invisible que atraviesa seres vivos y lugares. Un cataclismo conocido como la Noche de las Mil Campanas fracturó los grandes sellos que mantenían dormidos a los **Ecos Primordiales**. Desde entonces, las ruinas cambian de forma y criaturas deformadas emergen de ellas.

El protagonista pertenece a una pequeña casa shinobi sin prestigio. Una expedición fallida revela que su cuerpo puede resonar con más de una fuente del Pulso. La historia se descubre mediante vestigios, personajes, jefes y decisiones; no debe depender de largas escenas.

## 5. Bucle principal
1. Prepararse en el refugio.
2. Elegir equipo, estilo y técnicas.
3. Entrar en una expedición procedural.
4. Explorar habitaciones, santuarios y rutas opcionales.
5. Combatir y gastar recursos tácticamente.
6. Obtener experiencia, técnicas, sellos, materiales y reliquias.
7. Enfrentarse a guardianes y decidir si continuar o extraer.
8. Regresar, mejorar opciones permanentes y preparar otra expedición.

## 6. Mundo y estructura
El mundo exterior contiene refugios, órdenes y territorios; la actividad principal sucede en complejos subterráneos y zonas malditas. Cada expedición se organiza en pisos o sectores conectados. Cada sector contiene salas de combate, tesoro, descanso, evento, comerciante o guardián. La salida debe ser alcanzable y la generación reproducible mediante semilla.

## 7. Personaje y estilos
El personaje combina:
- **Estilo de combate:** define arma, postura y rol inicial.
- **Afinidad:** determina qué familias de técnicas aprende con mayor facilidad.
- **Linaje:** rasgo raro desbloqueable con pasivas y una ruta de despertar.
- **Técnicas equipadas:** habilidades activas y pasivas elegidas antes o durante la expedición.
- **Equipo y sellos:** modifican estadísticas y reglas.

No bloquear toda la experimentación detrás de una clase rígida. El primer prototipo usará un estilo inicial y una afinidad; el sistema debe permitir expandirlo.

## 8. Combate
Combate por turnos, cuadrícula ortogonal y vista cenital. Una acción válida del jugador hace avanzar la ronda y permite actuar a enemigos vivos. Las acciones incluyen moverse, atacar, técnica, objeto, interactuar y esperar. Los ataques pueden tener alcance, línea de visión, área, preparación y coste de kiro.

## 9. Progresión
**Dentro de la expedición:** experiencia, niveles, técnicas temporales, sellos, equipo y recursos.  
**Entre expediciones:** desbloqueo de técnicas, maestros, estilos, entradas de bestiario, mejoras del refugio y rutas de linaje.  
**Transformaciones:** estados temporales o despertares de alto impacto con coste, duración o condición. Deben cambiar decisiones tácticas, no ser solo un aumento de estadísticas.

## 10. Derrota y extracción
Propuesta: al caer, termina la expedición y se muestra un resumen. Se conserva una fracción de un recurso de investigación y los desbloqueos permanentes; se pierde el botín no asegurado. La extracción voluntaria permite asegurar parte del botín. Ajustar esta regla con pruebas para evitar frustración.

## 11. Dirección visual
Pixel art de fantasía ninja, cenital, siluetas reconocibles y paletas diferenciadas por región. La interfaz debe mostrar claramente casillas, alcance, área de efecto, intención enemiga, vida y kiro.

## 12. Alcance del primer prototipo
- Una sala o pequeña planta de mazmorra.
- Un shinobi jugable.
- Movimiento por casillas y turnos.
- Un enemigo cuerpo a cuerpo.
- Un ataque básico y una técnica elemental.
- Vida y kiro.
- Un objeto consumible.
- Un cofre o recompensa.
- Una salida.
- Reinicio y pantalla de resultado.

**Fuera del prototipo:** mundo abierto, multijugador, muchas clases, diez clanes, campaña extensa, tienda, cuentas, PvP y app publicada.
