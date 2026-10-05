// Mesmo catálogo de modelos/preços usado pela edge function da IA, para a
// tela de configuração mostrar as opções e o custo com os mesmos números.
export {
  AI_MODELS,
  DEFAULT_AI_MODEL,
  USD_TO_BRL,
  estimateTypicalConversationUsd,
  getAiModel,
  summarizeAiUsage,
  type AiModelInfo,
  type AiUsageRow,
  type AiUsageSummary,
} from "../../supabase/functions/_shared/ai-models.ts";

import { USD_TO_BRL } from "../../supabase/functions/_shared/ai-models.ts";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Valores de centavos aparecem com 2 casas; abaixo de 1 centavo, "< R$ 0,01".
export function formatBrlFromUsd(usd: number): string {
  const value = usd * USD_TO_BRL;
  if (value > 0 && value < 0.01) return "< R$ 0,01";
  return brl.format(value);
}

export function formatUsd(usd: number): string {
  return `US$ ${usd.toLocaleString("pt-BR", { minimumFractionDigits: usd < 0.01 ? 4 : 2, maximumFractionDigits: usd < 0.01 ? 4 : 2 })}`;
}
