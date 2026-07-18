export interface ParcelaDetail {
  valor: number | null;
  vencimento: string; // yyyy-MM-dd
}

/**
 * Divide um saldo em N parcelas de valor igual (o resto de centavos vai nas
 * primeiras parcelas). Preserva as datas de vencimento já informadas em `existing`.
 *
 * O `saldo` recebido já deve vir COM o desconto aplicado — assim a lista de
 * parcelas sempre reflete o desconto, evitando a divergência entre o "saldo a
 * pagar" e a "lista de parcelas" (que fazia a taxa de cartão sair sobre o valor
 * errado, pré-desconto).
 */
export function buildParcelasDetails(
  parcelas: number | null,
  saldo: number | null,
  existing: ParcelaDetail[] = [],
): ParcelaDetail[] {
  if (!parcelas || parcelas < 1) return [];

  if (!saldo || saldo <= 0) {
    return Array.from({ length: parcelas }, (_, i) => ({
      valor: existing[i]?.valor ?? null,
      vencimento: existing[i]?.vencimento ?? "",
    }));
  }

  const saldoEmCentavos = Math.round(saldo * 100);
  const valorBase = Math.floor(saldoEmCentavos / parcelas);
  const restante = saldoEmCentavos - valorBase * parcelas;

  return Array.from({ length: parcelas }, (_, i) => ({
    valor: (valorBase + (i < restante ? 1 : 0)) / 100,
    vencimento: existing[i]?.vencimento ?? "",
  }));
}
