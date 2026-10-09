const PAGE_SIZE = 1000;
const MAX_PAGES = 50;

/** Busca todas as páginas (o banco devolve no máximo 1000 linhas por vez). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAllPages<T>(page: (from: number, to: number) => PromiseLike<{ data: any; error: any }>): Promise<T[]> {
  const rows: T[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const { data, error } = await page(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...((data || []) as T[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}
