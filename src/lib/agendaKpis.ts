// Números do topo da Agenda (festas do mês ou do período).
// Regras: festa cancelada não conta como venda nem como faturamento; permuta não
// tem faturamento; o valor líquido usa a taxa de cartão gravada na festa.

export interface KpiEvent {
  status: string;
  total_value: number | null;
  event_date: string;
  is_permuta?: boolean | null;
  unit?: string | null;
  payment_details?: unknown;
}

export interface CardFeeOperator {
  id?: string;
  taxa_debito?: number | string | null;
  [key: string]: unknown;
}

const isCancelled = (e: { status: string }) => e.status === "cancelado";
const round2 = (n: number) => Math.round(n * 100) / 100;
const norm = (s: string | null | undefined) => (s || "").toLowerCase().trim();

function parseNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v !== "string") return 0;
  const cleaned = v.trim().replace(/R\$\s?/g, "").replace(/\s/g, "");
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  return Number(normalized) || 0;
}

/** Festas do mês: quantas, quantas já passaram e o valor das que vão acontecer */
export function eventSummary(events: KpiEvent[], todayYmd: string) {
  const active = events.filter((e) => !isCancelled(e));
  const valueOf = (list: KpiEvent[]) => round2(list.filter((e) => !e.is_permuta).reduce((s, e) => s + (e.total_value || 0), 0));
  return {
    total: events.length,
    canceladas: events.length - active.length,
    /** pela data: festa de dia anterior a hoje */
    realizadas: active.filter((e) => e.event_date < todayYmd).length,
    aRealizar: active.filter((e) => e.event_date >= todayYmd).length,
    /** valor bruto das festas confirmadas (sem permuta) */
    agendadoConfirmado: valueOf(active.filter((e) => e.status === "confirmado")),
    /** valor bruto das festas ainda pendentes (sem permuta) */
    agendadoPendente: valueOf(active.filter((e) => e.status !== "confirmado")),
  };
}

/** Vendas fechadas no mês/período (pela data de fechamento) */
export function closedSummary<T extends KpiEvent>(events: T[], netValue: (e: T) => number) {
  const valid = events.filter((e) => !isCancelled(e));
  return {
    count: valid.length,
    cancelled: events.length - valid.length,
    revenue: round2(valid.filter((e) => !e.is_permuta).reduce((s, e) => s + netValue(e), 0)),
  };
}

/** Dias com festa no mês/período, no total e por unidade */
export function occupancy(events: KpiEvent[], totalDays: number, units: string[] = []) {
  const active = events.filter((e) => !isCancelled(e));
  const rate = (days: number) => (totalDays > 0 ? Math.round((days / totalDays) * 100) : 0);
  const days = new Set(active.map((e) => e.event_date)).size;
  const byUnit = units.map((unit) => {
    const key = norm(unit);
    const d = new Set(active.filter((e) => norm(e.unit) === key).map((e) => e.event_date)).size;
    return { unit, days: d, rate: rate(d) };
  });
  return { days, freeDays: Math.max(0, totalDays - days), rate: rate(days), byUnit };
}

const isCredit = (forma: unknown) => forma === "cartao" || forma === "cartao_credito";
const isDebit = (forma: unknown) => forma === "cartao_debito";

function operatorRate(op: CardFeeOperator | null, forma: unknown, parcelas: number): number {
  if (!op) return 0;
  if (isDebit(forma)) return Number(op.taxa_debito || 0);
  if (isCredit(forma)) return Number(op[`taxa_credito_${Math.min(Math.max(1, parcelas), 12)}x`] || 0);
  return 0;
}

/**
 * Valor líquido da festa (total menos as taxas de cartão da entrada e do saldo).
 * Usa a taxa gravada na festa quando ela foi salva; sem isso, a da operadora
 * escolhida na festa; sem isso, a primeira operadora da empresa.
 */
export function netEventValue(ev: KpiEvent, fees: CardFeeOperator[]): number {
  const gross = ev.total_value || 0;
  const pd = (ev.payment_details || null) as Record<string, unknown> | null;
  if (gross <= 0 || !pd) return gross;
  const op = fees.find((f) => f.id && f.id === pd.card_operator_id) || fees[0] || null;

  const feeFor = (forma: unknown, valor: unknown, parcelas: unknown, snapshot: unknown): number => {
    if (!isCredit(forma) && !isDebit(forma)) return 0;
    const brut = parseNum(valor);
    if (brut <= 0) return 0;
    const n = isDebit(forma) ? 1 : Math.max(1, Number(parcelas) || 1);
    const taxa = snapshot != null && snapshot !== "" ? Number(snapshot) || 0 : operatorRate(op, forma, n);
    return taxa > 0 ? (brut * taxa) / 100 : 0;
  };

  const fee =
    feeFor(pd.entrada_forma, pd.entrada_valor, pd.entrada_parcelas, pd.entrada_taxa_percent) +
    feeFor(pd.saldo_forma, pd.saldo_valor, pd.parcelas, pd.saldo_taxa_percent);
  return round2(gross - fee);
}
