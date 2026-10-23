// Ordem dos cadastros (pacotes, opcionais, tipos de festa): mover com setas e
// salvar só o que mudou. A ordem é a que a ficha da festa e a IA mostram.

export function moveItem<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Linhas cujo sort_order precisa ser regravado para refletir a ordem da lista. */
export function sortOrderChanges<T extends { id: string; sort_order: number }>(list: T[]): { id: string; sort_order: number }[] {
  return list
    .map((item, i) => ({ id: item.id, sort_order: i, changed: item.sort_order !== i }))
    .filter((r) => r.changed)
    .map(({ id, sort_order }) => ({ id, sort_order }));
}

/** Pacotes ligados a um tipo de festa vêm primeiro (companies.settings.package_event_types). */
export function readPackageEventTypes(settings: Record<string, unknown> | null | undefined): Record<string, string> {
  const raw = settings?.package_event_types;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter(([, v]) => typeof v === "string" && v)) as Record<string, string>;
}

export function packagesForEventType<T extends { id: string }>(packages: T[], links: Record<string, string>, eventType: string | null | undefined): { suggested: T[]; others: T[] } {
  if (!eventType) return { suggested: [], others: packages };
  const suggested = packages.filter((p) => links[p.id] === eventType);
  return { suggested, others: packages.filter((p) => links[p.id] !== eventType) };
}
