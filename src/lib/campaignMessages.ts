// Mensagens da campanha: as da IA e as escritas à mão.

// "type" (e não "interface") para poder ir direto no campo JSON do banco
export type CampaignVariation = {
  tone: string;
  text: string;
};

/** Tom usado nas mensagens que a pessoa escreve */
export const MANUAL_TONE = "manual";

/** Ao gerar de novo com a IA, as escritas à mão continuam */
export function mergeGenerated(previous: CampaignVariation[], generated: CampaignVariation[]): CampaignVariation[] {
  return [...generated, ...previous.filter((v) => v.tone === MANUAL_TONE && v.text.trim())];
}

/** Só as mensagens com texto (as vazias não vão para o envio) */
export function usableVariations(variations: CampaignVariation[]): CampaignVariation[] {
  return variations.filter((v) => v.text.trim().length > 0);
}

/** Troca {nome} e {empresa} para mostrar a prévia */
export function previewMessage(text: string, name: string, company: string): string {
  return text
    .replace(/\{\{?\s*nome\s*\}?\}/gi, name)
    .replace(/\{\{?\s*empresa\s*\}?\}/gi, company);
}
