/** Une clases CSS activas en una cadena e ignora valores vacíos o falsos.
 * @returns Las clases combinadas separadas por espacios.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
