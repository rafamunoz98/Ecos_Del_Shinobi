# Plan de pruebas y criterios de aceptación

## 1. Objetivo

Detectar errores de reglas, mapas imposibles, pérdida de datos y problemas de usabilidad antes de publicar.

## 2. Pruebas unitarias

### Movimiento
- Mover a suelo libre.
- Intentar atravesar pared.
- Intentar ocupar casilla de enemigo.
- Intentar moverse fuera del mapa.
- Confirmar que acción inválida no consume turno.

### Turnos
- Una acción válida del jugador activa una ronda enemiga.
- Acción inválida no activa enemigos.
- Enemigos muertos no actúan.
- No se procesa una segunda acción mientras la ronda está resolviéndose.
- Esperar turno activa enemigos.

### Combate
- Daño mínimo correcto.
- Defensa aplicada correctamente.
- Objetivo muere cuando vida llega a cero.
- Jugador muere cuando vida llega a cero.
- Efectos periódicos se aplican en el momento definido.
- Curación no supera vida máxima.

### Inventario
- Consumible se elimina al utilizarse.
- Objeto no utilizable no consume turno.
- Inventario lleno informa al jugador.
- Equipar/des equipar actualiza estadísticas correctamente.

## 3. Pruebas de generación

Ejecutar generación sobre cientos o miles de semillas:
- Entrada y salida existen.
- Hay ruta transitable entre ellas.
- Ninguna entidad aparece en pared.
- No hay dos entidades sólidas en una casilla.
- Cofres y objetos son alcanzables.
- El mapa respeta dimensiones máximas.
- La misma semilla produce el mismo mapa.

## 4. Pruebas manuales de UX

- Nuevo jugador entiende cómo moverse.
- Se entiende cuándo termina el turno.
- Se reconoce qué enemigo va a atacar.
- Se puede abrir/cerrar inventario sin perder estado.
- Se puede jugar con teclado.
- Se puede jugar con pantalla táctil.
- Texto legible en móvil.
- La interfaz no tapa la zona necesaria del mapa.

## 5. Pruebas de guardado

- Guardar y recargar conserva estado.
- Guardado corrupto no bloquea el inicio.
- Versión antigua del esquema se migra o se rechaza de forma segura.
- Cerrar pestaña durante una partida no deja datos parcialmente escritos.

## 6. Pruebas de compatibilidad

Navegadores actuales principales:
- Chrome/Chromium.
- Firefox.
- Safari.
- Navegadores móviles Android/iOS.

Probar diferentes resoluciones, orientación, escala y rendimiento.

## 7. Criterios de salida de beta

- Sin errores críticos conocidos.
- No hay mapas imposibles en el conjunto de pruebas.
- El bucle principal se completa.
- Guardado recuperable.
- Controles claros.
- Rendimiento aceptable en dispositivos objetivo.
- Assets y licencias documentados.
