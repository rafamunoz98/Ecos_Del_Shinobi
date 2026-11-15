# Hoja de ruta y backlog

## Enfoque

Construir un prototipo vertical pequeño antes de ampliar contenido. Los tiempos son orientativos para una persona con ayuda de herramientas; dependen de experiencia, disponibilidad y calidad de arte.

## Hito 0 — Preparación

- [ ] Confirmar nombre provisional y pilares.
- [ ] Elegir tamaño de tile y resolución interna.
- [ ] Crear repositorio Git.
- [ ] Crear proyecto TypeScript + Vite + Phaser.
- [ ] Configurar pruebas y lint.
- [ ] Mostrar una escena vacía en navegador.

**Aceptación:** el proyecto arranca localmente y se puede compilar.

## Hito 1 — Cuadrícula y movimiento

- [ ] Modelo de mapa.
- [ ] Suelo y paredes.
- [ ] Movimiento ortogonal.
- [ ] Colisiones.
- [ ] Cámara.
- [ ] Entrada de teclado.
- [ ] Entrada táctil básica.

**Aceptación:** el personaje se mueve una casilla por acción y no atraviesa paredes.

## Hito 2 — Motor de turnos

- [ ] Modelo de acción.
- [ ] Validación de acciones.
- [ ] Orden estable de turnos.
- [ ] Esperar turno.
- [ ] Enemigo de prueba.
- [ ] Mensajes de combate.

**Aceptación:** cada acción válida del jugador provoca exactamente una ronda enemiga.

## Hito 3 — Combate

- [ ] Ataque cuerpo a cuerpo.
- [ ] Vida, daño y defensa.
- [ ] Muerte de enemigo.
- [ ] Muerte de jugador.
- [ ] Reinicio de expedición.
- [ ] Pruebas de reglas.

**Aceptación:** combate completo reproducible y sin dobles turnos.

## Hito 4 — Botín y progresión mínima

- [ ] Cofre.
- [ ] Poción.
- [ ] Inventario.
- [ ] Equipamiento de arma.
- [ ] Experiencia.
- [ ] Escalera y cambio de planta.

**Aceptación:** se puede explorar, combatir, recoger, equipar y descender.

## Hito 5 — Mazmorra procedural

- [ ] Generación de salas.
- [ ] Conexión de salas.
- [ ] Entrada y salida.
- [ ] Colocación de enemigos.
- [ ] Colocación de objetos.
- [ ] Semilla reproducible.
- [ ] Prueba de conectividad en muchas semillas.

**Aceptación:** los mapas generados siempre tienen ruta válida y no generan entidades inaccesibles.

## Hito 6 — Vertical slice

- [ ] 1 clase jugable.
- [ ] 3 enemigos.
- [ ] 10 objetos.
- [ ] 1 jefe.
- [ ] 1 evento.
- [ ] Audio básico.
- [ ] Pantalla de muerte.
- [ ] Guardado local.
- [ ] Tutorial breve.

**Aceptación:** una expedición completa se puede jugar y entender sin asistencia del desarrollador.

## Hito 7 — Beta web

- [ ] Pruebas en Chrome, Firefox y Safari.
- [ ] Pruebas en escritorio y móvil.
- [ ] Optimización de carga.
- [ ] Manejo de errores.
- [ ] Política de privacidad si se recopilan datos.
- [ ] Página de presentación.
- [ ] Feedback de jugadores.

## Hito 8 — App

Solo después de validar la versión web:
- [ ] Integrar Capacitor.
- [ ] Ajustar safe areas y orientación.
- [ ] Probar pausa/reanudación.
- [ ] Validar persistencia.
- [ ] Preparar iconos y capturas.
- [ ] Revisar requisitos actuales de Google Play y App Store.
- [ ] Firma, privacidad y publicación.

## Orden recomendado de trabajo diario

1. Elegir una tarea pequeña.
2. Definir cómo se sabe que funciona.
3. Implementar.
4. Probar manualmente.
5. Añadir prueba automática cuando corresponda.
6. Guardar cambios en Git.
7. No empezar otra función si la actual rompe el juego.

## No hacer todavía

- Multijugador.
- Ranking online.
- Tienda con dinero real.
- Cuentas y backend.
- Cientos de objetos.
- Diez biomas.
- Aplicación móvil publicada.

Primero validar el bucle central.
