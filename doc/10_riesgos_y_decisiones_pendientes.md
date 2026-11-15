# Riesgos, supuestos y decisiones pendientes

## 1. Riesgos principales

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Alcance demasiado grande | Alto | Prototipo pequeño y backlog priorizado |
| Arquitectura acoplada a Phaser | Alto | Core independiente y serializable |
| Mapas sin ruta válida | Alto | Pruebas de conectividad por semilla |
| Combate poco claro | Alto | Telegráficos y registro de acciones |
| Arte consume demasiado tiempo | Medio | Tileset pequeño y reutilizable |
| Guardado incompatible | Medio | Versionado de esquema y migraciones |
| Adaptación móvil tardía | Medio | Diseñar controles táctiles desde el inicio |
| Uso accidental de assets sin licencia | Alto | Registro de procedencia y revisión previa |

## 2. Supuestos de este documento

- Título provisional: Ecos del Abismo.
- Roguelike individual, sin multijugador en la primera versión.
- Turnos clásicos y movimiento ortogonal.
- Fantasía oscura pixel art.
- Navegador como primera plataforma.
- TypeScript, Phaser y Vite.
- Capacitor como opción para empaquetar app.
- Sin monetización en el prototipo.

## 3. Decisiones pendientes antes de producción

1. ¿Resolución interna y tamaño definitivo de tile: 16×16 o 32×32?
2. ¿Movimiento exclusivamente ortogonal o permitir diagonales?
3. ¿La muerte conserva una parte del oro/meta-recurso?
4. ¿La partida es infinita por plantas o tiene final de campaña?
5. ¿La primera versión incluye una clase o tres?
6. ¿Se guardará automáticamente al cambiar de planta o en cada acción?
7. ¿La interfaz será compacta con panel lateral o panel inferior?
8. ¿Se usará arte propio, contratado o assets con licencia comercial?
9. ¿El nombre final será Ecos del Abismo?
10. ¿Se desea publicar primero como web abierta o beta privada?

## 4. Registro de decisiones

| Fecha | Decisión | Motivo | Estado |
|---|---|---|---|
| 2026-11-14 | Combate por turnos y casillas | Preferencia expresada por el creador | Confirmada |
| 2026-11-14 | Navegador primero | Facilita prototipado y distribución | Confirmada |
| 2026-11-14 | Phaser + TypeScript | Propuesta técnica multiplataforma | Provisional |
| 2026-11-14 | Capacitor para futura app | Reutilización de versión web | Provisional |

Actualizar esta tabla cuando se cierre cada decisión.
