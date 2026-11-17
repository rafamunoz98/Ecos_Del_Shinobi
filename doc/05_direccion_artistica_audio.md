# Dirección artística y audio

## 1. Dirección visual
Arte cenital detallado de fantasía ninja original, con formas suaves y volumen (referencia de ambiente: dungeons de consola tipo «Mundo Misterioso», no pixel art grueso). En el prototipo todo el arte se **dibuja por código** (vectorial, procedural) en `src/presentation/art`, así que se ve nítido a cualquier zoom y no depende de assets externos. Combinar arquitectura de santuarios, ruinas, bosques y complejos subterráneos con vestimenta shinobi funcional y siluetas legibles. Evitar copiar vestuario, emblemas, peinados, armas distintivas o diseños reconocibles de franquicias existentes.

## 2. Lenguaje visual
- Baldosas con losas, juntas, sombras de pared y decoración por sector; paredes con cara de ladrillo y cima. Resolución interna 96 px por casilla, escalada con suavizado.
- Paleta por sector **[Implementado]**: Bosque del Umbral (piedra musgosa, luciérnagas), Catacumbas de Sal (azul grisáceo, cristales y motas de sal), Santuario de Ceniza (violeta con grietas de brasa).
- Luz y niebla suaves: la luz cálida del jugador, lo explorado se oscurece, lo desconocido es negro; viñeta verde al esconderse en un arbusto.
- Técnicas con formas y colores identificables por afinidad.
- Ataques de área muestran su patrón en el suelo antes de impactar.

## 3. Assets del prototipo
- Suelo y paredes de mazmorra.
- Puerta, escalera, cofre y altar.
- Shinobi jugable: idle, caminar, ataque, técnica, daño y caída.
- Un enemigo: idle, mover, atacar y derrotado.
- Efectos de técnica elemental y recogida.
- Iconos de vida, kiro, arma, técnica y consumible.

## 4. Animación y legibilidad
Las animaciones no deben ocultar el estado táctico. Mantener efectos breves, permitir reducir destellos y sacudidas. El jugador debe distinguir personaje, enemigo, objetivo, zona peligrosa y botín.

## 5. Audio
Ambiente por región, pasos, arma, técnica, impacto, daño, curación, cofre y cambio de sector. Controles independientes de música y efectos. Crear audio original o utilizar recursos con licencia comercial compatible.

### 3.1 Estado del arte del prototipo
Hecho: suelo y paredes por sector, arbustos, puertas (abiertas/cerradas), escalera con brillo, cofres, barrera de pizarra, objetos en el suelo, shinobi con 4 direcciones y arma visible, 4 enemigos animados (Acechador de Hollín, Cuervo de Sal, Larva de Piedra, Tirador de Junco), iconos vectoriales de objetos/armas/afinidades/estados, efectos por afinidad, ataques por tipo de arma, proyectiles, números de daño, indicadores de alerta (! / ?) y sacudida/destello al recibir daño. Pendiente: animación de caminar con más fotogramas, altar, sprites del jefe, audio.

## 6. Registro de recursos
Los gráficos del prototipo son código propio del proyecto (sin recursos externos, sin licencias de terceros). Si se incorporan assets externos: para cada archivo registrar autor, origen, licencia, uso comercial permitido, atribución y modificaciones. No publicar assets de origen desconocido ni extraídos de anime, manga o videojuegos ajenos.
