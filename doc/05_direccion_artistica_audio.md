# Dirección artística y audio

## 1. Dirección visual
Arte cenital detallado de fantasía ninja original, con formas suaves y volumen (referencia de ambiente: dungeons de consola tipo «Mundo Misterioso», no pixel art grueso). En el prototipo todo el arte se **dibuja por código** (vectorial, procedural) en `src/presentation/art`, así que se ve nítido a cualquier zoom y no depende de assets externos. Combinar arquitectura de santuarios, ruinas, bosques y complejos subterráneos con vestimenta shinobi funcional y siluetas legibles. Evitar copiar vestuario, emblemas, peinados, armas distintivas o diseños reconocibles de franquicias existentes.

## 2. Lenguaje visual
- Baldosas con losas, juntas, sombras de pared y decoración por sector; paredes con cara de ladrillo y cima. Resolución interna 96 px por casilla, escalada con suavizado.
- Paleta por zona **[Implementado]**: la estética depende de los **jefes derrotados**, no del número de sector. Todos los sectores hasta caer Sōkan comparten el **Bosque del Umbral** (piedra musgosa, luciérnagas); después, las **Raíces Hundidas** (tierra parda y raíces con hongos luminosos turquesa y violeta: deliberadamente muy distinta del bosque verde); al caer Yūgiri, el **Santuario de Ceniza** (violeta con grietas de brasa). Un destello dorado marca el cambio. Se conservan las Catacumbas de Sal como tema alternativo.
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

**Hecho en el Hito 6.10 (todo sintetizado por código, sin archivos ni licencias que gestionar):**
- **48 efectos** ligados a eventos del juego: pasos (cuatro variantes), golpes según el arma (tajo, látigo, estocada), golpe furtivo, daño recibido, derrota de enemigo y de jefe, una técnica distinta por afinidad (ascua: crepitar; marea: burbujas; vendaval: ráfaga; piedra: golpe grave; rayo: chasquido), lanzar, recoger, moneda, llave, cofre, equipar, beber, curar, identificar, aprender, subir de nivel, bajar de sector, caída, alerta, aviso de ataque (telegráfico), impacto, gong de fase de jefe, escudo, **Buscar** (golpecitos en la pared) y **pared secreta** (piedra que se desliza y campanas), error, derrota y victoria.
- **Música generativa** que nunca se repite: escala pentatónica japonesa (*hirajoshi* al explorar, *in*, más oscura, en tensión y contra jefes), un koto que pasea por la escala, un bordón grave que respira, una flauta tipo shakuhachi y **tambores taiko** que entran con la tensión. El ánimo cambia con la partida: **explorar** (64 pulsos), **tensión** si algún enemigo te persigue (90) y **jefe** contra uno (112); se apaga al terminar la expedición. La tónica cambia con el sector.
- **Controles:** **M** música, **N** efectos y botones 🎵 / 🔊 en la esquina superior derecha del mapa (también en móvil). La elección se recuerda en el navegador. El audio empieza con el primer gesto (los navegadores no permiten antes) y se pausa si la pestaña queda oculta.
- **Mezcla:** compresor general, efectos al 70 % y música al 30 %, con una reverberación común. Medido sin altavoces: ningún efecto pasa de ≈ 0,5 de pico antes del compresor y la mezcla en vivo se queda en ≈ 0,2.
- **Límite conocido:** quien lo escribió no ha podido *escucharlo*; los números descartan saturación y valores inválidos, pero timbres, volúmenes relativos y cansancio de la música necesitan una pasada de oído. Si se decide música compuesta o grabada, `audio/engine.ts` es el único punto de cambio.

### 3.1 Estado del arte del prototipo
Hecho: suelo y paredes por sector, arbustos, puertas (abiertas/cerradas), escalera con brillo, cofres, barrera de pizarra, objetos en el suelo, shinobi con 4 direcciones y arma visible, 7 enemigos animados (Acechador de Hollín, Cuervo de Sal, Larva de Piedra, Tirador de Junco, Monje Hueco, Eco Menor y el primer jefe del Hito 6, con aspecto distinto por fase), iconos vectoriales de objetos/armas/afinidades/estados, efectos por afinidad, ataques por tipo de arma, proyectiles, números de daño, indicadores de alerta (! / ?) y sacudida/destello al recibir daño. Hecho en el Hito 6: casillas de ataque anunciado (rayadas, con cuenta atrás), barra del jefe, maestra Sayoko y altar con bocadillo, pergaminos, iconos de campana y sello antiguo. Hecho en el Hito 6.5: puerta con candado, cofre lacado rojo, mesa de forja con yunque, iconos de moneda, esquirla, llaves y mejora, armas arrojadizas clavadas en los enemigos, brillo y tamaño de objetos del suelo según tipo, cartera en el HUD y marcadores en el minimapa. Pendiente: animación de caminar con más fotogramas, audio.

Hecho en el Hito 6.6: figuras de **shinobi** reutilizables con estilos por enemigo (aprendiz, tirador, espadachín, rastreador, monje, acólito, adepto, envenenador, sellador, maestro del trueno), **jefes Sōkan y Yūgiri** con aspecto por fase, monstruos nuevos (lobo de raíz, espora flotante, sapo de piedra aliado), **aliados** dibujados con su barra de vida, **mercader** y **Maestro Tobari**, iconos por apariencia de poción (12 colores) y de pergamino (12 runas generadas), manual, estados nuevos y reliquia del carrete roto. El Campanero Sepultado del Hito 6 desaparece del juego (lo sustituye Sōkan).

Hecho en el Hito 6.8: **cinco protagonistas originales**, uno por afinidad, dibujados con el mismo estilo vectorial (`art/heroes.ts` + `content/heroes.ts`): sin capucha, con cara visible, pelo propio y túnica y bufanda en los colores de su elemento. Ren Sorae (Vendaval): rubio de pelo en pinchos con gafas de vuelo; Jūrō Kurobane (Ascua): moreno de melena larga; Tōma Shirasagi (Rayo): pelo blanco en pinchos y pasador de rayo; Mizuna Aoyagi (Marea): mujer de pelo azul con trenza y perla; Momoka Iwase (Piedra): mujer de pelo rosa con dos moños y cuentas. Vistas frontal, lateral y trasera. Evitan a propósito rasgos identificables de otras obras (sin marcas en las mejillas, sin banda con símbolo de aldea, sin ojos especiales, sin chándal naranja). Retrato en Menú → Estado, camino previsto y marco de destino al pasar el ratón.

Hecho en el Hito 6.7: **tablillas de sello** (madera con sello rojo, flotan y brillan), **marioneta explosiva** (muñeco de paja con mecha encendida que vibra y brilla al cargar), **tronco señuelo** (con bufanda roja y máscara pintada), **burbuja de sellos** alrededor del jefe con hilos rojos hacia las tablillas que la sostienen, efectos de escudo (alzado, golpe, roto), de sustitución, de arrastre/empujón del jugador (se desliza en vez de saltar) y de afinidad aprendida.

Hecho en el Hito 6.9: **casillas de terreno nuevas** (precipicio con borde y profundidad, zarzal reseco, muro agrietado con grietas dibujadas y pared secreta que se disimula), **peligros del suelo** (llamas animadas, charco y descarga eléctrica que recorre el agua), **iconos** de lupa (Buscar), anillo, colgante y joya sin identificar, **gema y flecha de afinidad** sobre cada enemigo, **prisionero** (el protagonista de otra casa con cuerdas cruzadas y bocadillo), **compañero** (mismo arte del protagonista, sin transparencia, con barra de vida) y **eco** (protagonista desvaído, con parpadeo y halo violeta; `art/companions.ts` y `echoOfHero` en `art/actors.ts`).

## 6. Registro de recursos
Los gráficos del prototipo son código propio del proyecto (sin recursos externos, sin licencias de terceros). Si se incorporan assets externos: para cada archivo registrar autor, origen, licencia, uso comercial permitido, atribución y modificaciones. No publicar assets de origen desconocido ni extraídos de anime, manga o videojuegos ajenos.
