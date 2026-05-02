/**
 * Convierte un string en slug (URL amigable):
 *  "Café del Olvido" → "cafe-del-olvido"
 *  "Río Paraná"      → "rio-parana"
 */
export function slugify(input: string): string {
  return input
    .toString()
    .normalize('NFD') // separa acentos
    .replace(/[̀-ͯ]/g, '') // remueve acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // solo alfanumérico, espacios y guiones
    .replace(/\s+/g, '-') // espacios → guion
    .replace(/-+/g, '-') // colapsar guiones repetidos
    .replace(/^-|-$/g, ''); // sin guiones al borde
}
