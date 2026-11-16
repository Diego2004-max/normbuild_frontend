const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const findConflictingJurisdiction = (
  selected: string,
  description: string,
  knownJurisdictions: string[],
): string | null => {
  const normalizedDescription = normalize(description);
  const normalizedSelected = normalize(selected);
  return knownJurisdictions.find((candidate) => {
    const city = normalize(candidate).replace(/\s+d\.c\.$/, '');
    if (city === normalizedSelected.replace(/\s+d\.c\.$/, '') || city.length < 4) return false;
    return new RegExp(`(^|[^a-z])${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(normalizedDescription);
  }) ?? null;
};
