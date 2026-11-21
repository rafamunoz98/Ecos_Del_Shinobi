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

### 3.1 Estado del arte del prototipo
Hecho: suelo y paredes por sector, arbustos, puertas (abiertas/cerradas), escalera con brillo, cofres, barrera de pizarra, objetos en el suelo, shinobi con 4 direcciones y arma visible, 7 enemigos animados (Acechador de Hollín, Cuervo de Sal, Larva de Piedra, Tirador de Junco, Monje Hueco, Eco Menor y el primer jefe del Hito 6, con aspecto distinto por fase), iconos vectoriales de objetos/armas/afinidades/estados, efectos por afinidad, ataques por tipo de arma, proyectiles, números de daño, indicadores de alerta (! / ?) y sacudida/destello al recibir daño. Hecho en el Hito 6: casillas de ataque anunciado (rayadas, con cuenta atrás), barra del jefe, maestra Sayoko y altar con bocadillo, pergaminos, iconos de campana y sello antiguo. Hecho en el Hito 6.5: puerta con candado, cofre lacado rojo, mesa de forja con yunque, iconos de moneda, esquirla, llaves y mejora, armas arrojadizas clavadas en los enemigos, brillo y tamaño de objetos del suelo según tipo, cartera en el HUD y marcadores en el minimapa. Pendiente: animación de caminar con más fotogramas, audio.

Hecho en el Hito 6.6: figuras de **shinobi** reutilizables con estilos por enemigo (aprendiz, tirador, espadachín, rastreador, monje, acólito, adepto, envenenador, sellador, maestro del trueno), **jefes Sōkan y Yūgiri** con aspecto por fase, monstruos nuevos (lobo de raíz, espora flotante, sapo de piedra aliado), **aliados** dibujados con su barra de vida, **mercader** y **Maestro Tobari**, iconos por apariencia de poción (12 colores) y de pergamino (12 runas generadas), manual, estados nuevos y reliquia del carrete roto. El Campanero Sepultado del Hito 6 desaparece del juego (lo sustituye Sōkan).

Hecho en el Hito 6.8: **cinco protagonistas originales**, uno por afinidad, dibujados con el mismo estilo vectorial (`art/heroes.ts` + `content/heroes.ts`): sin capucha, con cara visible, pelo propio y túnica y bufanda en los colores de su elemento. Ren Sorae (Vendaval): rubio de pelo en pinchos con gafas de vuelo; Jūrō Kurobane (Ascua): moreno de melena larga; Tōma Shirasagi (Rayo): pelo blanco en pinchos y pasador de rayo; Mizuna Aoyagi (Marea): mujer de pelo azul con trenza y perla; Momoka Iwase (Piedra): mujer de pelo rosa con dos moños y cuentas. Vistas frontal, lateral y trasera. Evitan a propósito rasgos identificables de otras obras (sin marcas en las mejillas, sin banda con símbolo de aldea, sin ojos especiales, sin chándal naranja). Retrato en Menú → Estado, camino previsto y marco de destino al pasar el ratón.

Hecho en el Hito 6.7: **tablillas de sello** (madera con sello rojo, flotan y brillan), **marioneta explosiva** (muñeco de paja con mecha encendida que vibra y brilla al cargar), **tronco señuelo** (con bufanda roja y máscara pintada), **burbuja de sellos** alrededor del jefe con hilos rojos hacia las tablillas que la sostienen, efectos de escudo (alzado, golpe, roto), de sustitución, de arrastre/empujón del jugador (se desliza en vez de saltar) y de afinidad aprendida.

## 6. Registro de recursos
Los gráficos del prototipo son código propio del proyecto (sin recursos externos, sin licencias de terceros). Si se incorporan assets externos: para cada archivo registrar autor, origen, licencia, uso comercial permitido, atribución y modificaciones. No publicar assets de origen desconocido ni extraídos de anime, manga o videojuegos ajenos.
