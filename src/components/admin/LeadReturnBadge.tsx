import { RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  /** Quantas vezes o lead voltou a pedir orçamento (0 = nunca). */
  returnCount?: number | null;
  lastReturnAt?: string | null;
  /** Data do primeiro contato. */
  createdAt?: string | null;
  className?: string;
}

const fmt = (iso: string) => format(new Date(iso), "dd/MM/yy");

/**
 * Etiqueta de lead que voltou a pedir orçamento ("Retornou · 2ª vez").
 * Quem volta mostra mais interesse que quem chega pela primeira vez.
 */
export function LeadReturnBadge({ returnCount, lastReturnAt, createdAt, className }: Props) {
  const returns = Number(returnCount) || 0;
  if (returns <= 0) return null;
  const nth = returns + 1; // o primeiro contato é a 1ª vez

  // Leads que voltaram antes desta versão tiveram a data de chegada sobrescrita
  // pela do retorno; nesses casos a "data do primeiro contato" não é confiável.
  const firstContactKnown =
    !!createdAt && !!lastReturnAt &&
    new Date(createdAt).getTime() < new Date(lastReturnAt).getTime() - 60_000;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "inline-flex flex-shrink-0 items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/15 border border-violet-400/40 rounded-full shadow-sm shadow-violet-500/10 animate-pulse",
            className,
          )}
        >
          <RotateCcw className="w-3 h-3 text-violet-500" />
          <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">
            Retornou · {nth}ª vez
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-[230px]">
        <p className="font-semibold">🔄 Pediu orçamento {nth} vezes</p>
        {firstContactKnown && <p className="text-muted-foreground mt-0.5">Primeiro contato em {fmt(createdAt!)}</p>}
        {lastReturnAt && <p className="text-muted-foreground">Voltou por último em {fmt(lastReturnAt)}</p>}
        <p className="text-muted-foreground mt-0.5">Quem volta costuma estar mais perto de fechar.</p>
      </TooltipContent>
    </Tooltip>
  );
}
