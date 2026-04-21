/** Segmento de URL para `/[locale]/user/[key]`: username en minúsculas si existe; si no, id. */
export function getPublicProfileUrlKey(user: { id: string; username: string | null }): string {
  return user.username ?? user.id;
}
