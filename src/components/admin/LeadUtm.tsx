import { Megaphone } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Origem do anúncio gravada no lead (UTMs da URL de quem pediu orçamento pela LP).
 * utm_content = nome do conjunto de anúncios na Meta.
 */
export interface LeadUtmFields {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
}

export function hasLeadUtm(lead: LeadUtmFields): boolean {
  return !!(lead.utm_source || lead.utm_campaign || lead.utm_content);
}

/** Texto curto para listas: "meta · Mês das Crianças". */
export function leadUtmShortLabel(lead: LeadUtmFields): string {
  return [lead.utm_source, lead.utm_campaign].filter(Boolean).join(" · ") || lead.utm_content || "";
}

/** Etiqueta compacta para a lista de leads. Não renderiza nada sem UTM. */
export function LeadUtmBadge({ lead, className }: { lead: LeadUtmFields; className?: string }) {
  if (!hasLeadUtm(lead)) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "inline-flex max-w-[220px] items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded-md",
            className,
          )}
        >
          <Megaphone className="w-3 h-3 flex-shrink-0 text-blue-600" />
          <span className="truncate text-[10px] font-semibold text-blue-700">{leadUtmShortLabel(lead)}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-[260px] space-y-0.5">
        <p className="font-semibold">📣 Veio de anúncio</p>
        <LeadUtmLines lead={lead} />
      </TooltipContent>
    </Tooltip>
  );
}

function LeadUtmLines({ lead }: { lead: LeadUtmFields }) {
  const rows: [string, string | null | undefined][] = [
    ["Fonte", lead.utm_source],
    ["Campanha", lead.utm_campaign],
    ["Conjunto", lead.utm_content],
    ["Mídia", lead.utm_medium],
  ];
  return (
    <>
      {rows.filter(([, v]) => !!v).map(([label, v]) => (
        <p key={label}>
          <span className="text-muted-foreground">{label}:</span> {v}
        </p>
      ))}
    </>
  );
}

/** Bloco para o detalhe do lead. Sem UTM, explica que o lead não veio de link de anúncio. */
export function LeadUtmDetail({ lead }: { lead: LeadUtmFields }) {
  if (!hasLeadUtm(lead)) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <Megaphone className="w-3.5 h-3.5" />
        Sem origem de anúncio gravada (não veio por link com UTM).
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm space-y-1">
      <p className="flex items-center gap-2 font-semibold text-blue-700">
        <Megaphone className="w-4 h-4" /> Origem do anúncio
      </p>
      <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5 text-sm">
        <span className="text-muted-foreground">Fonte</span><span className="break-words">{lead.utm_source || "-"}</span>
        <span className="text-muted-foreground">Campanha</span><span className="break-words">{lead.utm_campaign || "-"}</span>
        <span className="text-muted-foreground">Conjunto</span><span className="break-words">{lead.utm_content || "-"}</span>
      </div>
    </div>
  );
}
