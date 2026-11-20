/** Zonas de la cripta. Todos los sectores de una zona se ven igual; al caer su jefe, la zona siguiente cambia por completo. */
export const ZONE_NAMES: readonly string[] = ['Bosque del Umbral', 'Raíces Hundidas', 'Santuario de Ceniza'];

/** Nombre de la zona según los jefes derrotados (0 = la primera). */
export const zoneName = (bossesDefeated: number): string => ZONE_NAMES[Math.min(Math.max(0, bossesDefeated), ZONE_NAMES.length - 1)];
