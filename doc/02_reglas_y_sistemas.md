# Reglas y sistemas de juego

## 1. Convenciones

- Coordenadas enteras `(x, y)`.
- Una casilla puede contener suelo, pared, puerta, trampa, escalera u objeto.
- Una entidad sólida impide que otra entidad ocupe su casilla.
- El estado del juego es la fuente de verdad; la animación solo representa el resultado.

## 2. Ciclo de turno

Orden recomendado:
1. Recibir una acción del jugador.
2. Validar la acción contra el estado actual.
3. Si es inválida, mostrar motivo y no avanzar turno.
4. Aplicar acción del jugador.
5. Resolver efectos inmediatos (daño, consumo, apertura).
6. Procesar efectos de fin de turno del jugador.
7. Procesar enemigos vivos en orden estable.
8. Resolver efectos de fin de turno de enemigos.
9. Comprobar victoria, muerte, cambio de planta y eventos.
10. Actualizar interfaz.

Las animaciones pueden retrasar visualmente la siguiente entrada, pero no deben ejecutar reglas de juego por sí mismas.

## 3. Acciones

- `Move(dx, dy)`: mover una casilla ortogonal.
- `Wait`: pasar turno.
- `Melee(target)`: ataque adyacente.
- `Ranged(target)`: ataque a distancia si hay alcance y línea de visión.
- `UseItem(itemId, target?)`: consumir/equipar objeto.
- `Interact(target)`: abrir cofre, puerta o hablar con NPC.
- `UseAbility(abilityId, target?)`: habilidad con coste y enfriamiento.

## 4. Movimiento

- Solo se permite moverse a casilla transitable.
- No se puede atravesar una entidad sólida.
- Chocar con una pared no consume turno (propuesta).
- Abrir una puerta puede consumir turno si se decide que la acción sea explícita.
- El movimiento por diagonal queda desactivado en la primera versión.
- Las trampas se activan al entrar en su casilla, con reglas visibles.

## 5. Visión y exploración

- Campo de visión basado en radio o línea de visión; elegir algoritmo antes de implementar.
- Las casillas exploradas pueden permanecer visibles en mapa, pero las entidades solo se muestran si están actualmente visibles.
- Las paredes bloquean visión.
- La niebla de guerra debe ser consistente y no revelar enemigos fuera de visión.

## 6. Combate y fórmulas provisionales

Fórmula sencilla para prototipo:
`daño = max(1, ataque + bonificación_arma - defensa_objetivo)`

Añadir variación aleatoria solo si mejora la experiencia; evitar que el resultado sea difícil de anticipar. Los críticos pueden multiplicar daño por 1.5 o aplicar una bonificación fija. Redondeo siempre hacia abajo o regla única documentada.

Atributos:
- Vida máxima.
- Vida actual.
- Ataque.
- Defensa.
- Precisión/evasión (opcional).
- Velocidad o iniciativa (no necesaria para turnos clásicos).

## 7. Estados

Estados iniciales opcionales:
- Veneno: daño al final de cada turno durante N turnos.
- Quemadura: daño periódico y posible propagación futura.
- Aturdimiento: pierde la próxima acción.
- Escudo: absorbe daño hasta agotarse.
- Regeneración: recupera vida por turno.

Cada estado debe indicar duración, acumulación, prioridad y momento de resolución.

## 8. IA de enemigos

- Slime: si ve al jugador y puede acercarse, reduce distancia; si está adyacente, ataca.
- Esqueleto: avanza por ruta y ataca al estar adyacente.
- Arquero: intenta mantener distancia y disparar si tiene línea de visión.
- Murciélago: se aproxima y ataca; puede tener una acción especial de salto.
- Mago: telegraph de hechizo en una casilla/zona y ejecuta en el turno siguiente.

La IA debe tener desempates deterministas para que las pruebas sean reproducibles.

## 9. Inventario y equipamiento

- Cada objeto tiene ID único de definición.
- El inventario almacena instancias o cantidades, no copias de reglas.
- Límite de espacio configurable.
- Equipamiento por ranuras: arma, armadura, anillo, amuleto.
- Consumibles se eliminan al usarse.
- Si el inventario está lleno, el botín queda en el suelo y se informa al jugador.

## 10. Botín

- Tablas de botín por enemigo, sala y cofre.
- Probabilidades configurables en datos.
- Evitar que una sola tirada determine el éxito de una expedición.
- Garantizar recursos básicos mínimos cuando sea necesario para evitar bloqueos.

## 11. Muerte y meta-progresión

Propuesta inicial:
- Al morir, termina la expedición y se muestra resumen.
- Se pierde el equipo de la expedición.
- Se conserva una cantidad limitada de esencia obtenida.
- Se conservan logros, entradas de bestiario y desbloqueos.
- No ofrecer revivir pagando dinero real en la primera versión.

## 12. Guardado

Guardar:
- Versión del esquema.
- Semilla de mazmorra.
- Planta y mapa o datos necesarios para reconstruirlo.
- Estado del jugador.
- Enemigos y objetos.
- Inventario/equipamiento.
- Progreso permanente.
- Fecha de actualización.

Debe existir migración o reinicio controlado si cambia el formato del guardado. No confiar en datos locales como prueba segura de resultados competitivos.
