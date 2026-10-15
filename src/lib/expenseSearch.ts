// Busca de despesas no Financeiro: por nome, categoria, observação, unidade,
// data ("01/04", "01/04/2026", "04/2026", "abril") ou valor ("1.325", "254,40").
// Várias palavras: todas precisam bater ("aluguel abril").

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export interface SearchableExpense {
  description?: string | null;
  category?: string | null;
  notes?: string | null;
  unit?: string | null;
  expense_date: string; // AAAA-MM-DD
  amount?: number | null;
}

export function normalizeSearch(text: string): string {
  return (text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

function moneyForms(amount: number | null | undefined): string[] {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return [];
  const fixed = amount.toFixed(2); // 1325.41
  const [int, cents] = fixed.split(".");
  const withDots = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return [`${withDots},${cents}`, `${int},${cents}`, fixed, int, withDots];
}

export function expenseSearchText(e: SearchableExpense, categoryLabel?: string): string {
  const [y, m, d] = (e.expense_date || "").slice(0, 10).split("-");
  const month = MONTHS[Number(m) - 1] || "";
  const dates = y && m && d ? [`${d}/${m}/${y}`, `${month} de ${y}`, `${month}/${y}`] : [];
  return normalizeSearch([
    e.description, categoryLabel, e.category, e.notes, e.unit,
    ...dates,
    ...moneyForms(e.amount),
  ].filter(Boolean).join(" | "));
}

export function matchesExpenseSearch(e: SearchableExpense, query: string, categoryLabel?: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  const text = expenseSearchText(e, categoryLabel);
  return q.split(" ").every((token) => {
    // "4/2026" ou "1/04": aceita dia/mês sem zero à esquerda
    const padded = token.replace(/(^|\/)(\d)(?=\/|$)/g, "$10$2");
    return text.includes(token) || text.includes(padded);
  });
}
