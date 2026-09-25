import { MapPin } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { leadChannelLabel } from "@/lib/leadChannel";

/** Dica para o atendente sobre o que a origem significa na abordagem. */
const ORIGIN_HINTS: Record<string, string> = {
  mesa: "Leu o QR Code de uma mesa do salão: já esteve numa festa aqui e conhece o espaço.",
};

interface Props {
  origem?: string | null;
  className?: string;
}

/** Etiqueta de origem do lead (ex.: "QR da mesa"). Não renderiza nada para leads sem origem. */
export function LeadOriginBadge({ origem, className }: Props) {
  const key = (origem || "").trim().toLowerCase();
  if (!key) return null;
  const label = leadChannelLabel(key);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "inline-flex flex-shrink-0 items-center gap-1 px-1.5 py-0.5 bg-pink-500/15 border border-pink-500/30 rounded-md",
            className,
          )}
        >
          <MapPin className="w-3 h-3 text-pink-500" />
          <span className="text-[10px] font-semibold text-pink-600 uppercase tracking-wide">{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-[220px]">
        <p className="font-semibold">📍 Origem: {label}</p>
        {ORIGIN_HINTS[key] && <p className="text-muted-foreground mt-0.5">{ORIGIN_HINTS[key]}</p>}
      </TooltipContent>
    </Tooltip>
  );
}
