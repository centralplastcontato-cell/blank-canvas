/**
 * Canal de captação de um lead, usado no relatório "Leads por origem".
 *
 * A origem gravada no lead (ex.: "mesa", do QR Code das mesas) tem prioridade.
 * Sem ela, o canal é deduzido do campaign_id com que o lead foi criado.
 */

export interface LeadChannelSource {
  origem?: string | null;
  campaign_id?: string | null;
}

// Chat de orçamento das LPs: a do Castelo e as dinâmicas (Planeta, Mega Magic e demais)
const SITE_CAMPAIGNS = new Set(["castelo-institucional", "lp-lead"]);
// Robô de WhatsApp, fluxo visual e IA — além dos "whatsapp-*" (bot, chat, cliente, rh)
const WHATSAPP_CAMPAIGNS = new Set(["flow-builder", "ai-agent"]);
// Cadastrados pela equipe (CRM, visita registrada à mão)
const MANUAL_CAMPAIGNS = new Set(["manual", "00000000-0000-0000-0000-000000000000"]);

export function leadChannel(lead: LeadChannelSource): string {
  const origem = (lead.origem || "").trim().toLowerCase();
  if (origem) return origem;

  const campaign = (lead.campaign_id || "").trim();
  if (SITE_CAMPAIGNS.has(campaign)) return "site";
  if (campaign.startsWith("whatsapp") || WHATSAPP_CAMPAIGNS.has(campaign)) return "whatsapp";
  if (MANUAL_CAMPAIGNS.has(campaign)) return "manual";
  return "outros";
}

const CHANNEL_LABELS: Record<string, string> = {
  mesa: "QR da mesa",
  site: "Site",
  whatsapp: "WhatsApp direto",
  manual: "Cadastro manual",
  outros: "Outros (campanhas, importação)",
};

const CHANNEL_COLORS: Record<string, string> = {
  mesa: "hsl(340,82%,52%)",
  site: "hsl(217,91%,60%)",
  whatsapp: "hsl(142,71%,45%)",
  manual: "hsl(215,20%,65%)",
  outros: "hsl(214,20%,80%)",
};

export function leadChannelLabel(channel: string): string {
  if (CHANNEL_LABELS[channel]) return CHANNEL_LABELS[channel];
  // Origem nova ainda sem rótulo (ex.: "instagram") aparece com a primeira letra maiúscula
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}

export function leadChannelColor(channel: string): string {
  return CHANNEL_COLORS[channel] ?? "hsl(262,52%,58%)";
}

export interface ChannelBreakdownRow {
  channel: string;
  label: string;
  count: number;
  pct: number;
  closed: number;
  conversion: number;
}

/** Conta leads por canal (e quantos fecharam), do maior para o menor. */
export function buildChannelBreakdown(
  leads: (LeadChannelSource & { status?: string | null })[],
): ChannelBreakdownRow[] {
  const totals = new Map<string, { count: number; closed: number }>();
  for (const lead of leads) {
    const channel = leadChannel(lead);
    const row = totals.get(channel) ?? { count: 0, closed: 0 };
    row.count++;
    if (lead.status === "fechado") row.closed++;
    totals.set(channel, row);
  }
  const total = leads.length || 1;
  return [...totals.entries()]
    .map(([channel, { count, closed }]) => ({
      channel,
      label: leadChannelLabel(channel),
      count,
      pct: (count / total) * 100,
      closed,
      conversion: count > 0 ? (closed / count) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}
