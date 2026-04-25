export function badgeNameToKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function getBadgeI18nKey(name: string): string {
  return `badgeNames.${badgeNameToKey(name)}`;
}

export function getBadgeDescI18nKey(name: string): string {
  return `badgeDescriptions.${badgeNameToKey(name)}`;
}
