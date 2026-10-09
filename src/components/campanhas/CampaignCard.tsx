import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pause,
  PartyPopper,
  Pencil,
  Play,
  Power,
  RotateCcw,
  Trash2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { nextSendLabel, type CampaignState } from "@/lib/campaignState";
import { percentOf, type CampaignResult } from "@/hooks/useCampaignResults";
import { cn } from "@/lib/utils";

export interface CampaignCardData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  total_recipients: number;
  sent_count: number;
  error_count: number;
  created_at: string;
  last_error?: string | null;
}

const STATUS_STYLE: Record<CampaignState["kind"], { cls: string; icon: LucideIcon }> = {
  draft: { cls: "bg-muted text-muted-foreground", icon: Clock },
  paused: { cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400", icon: Pause },
  sending: { cls: "bg-primary/15 text-primary", icon: Loader2 },
  completed: { cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", icon: CheckCircle2 },
  cancelled: { cls: "bg-destructive/10 text-destructive", icon: XCircle },
};

const ACTION_LABEL: Record<NonNullable<CampaignState["action"]>, { label: string; icon: LucideIcon }> = {
  start: { label: "Começar envio", icon: Play },
  continue: { label: "Continuar envio", icon: Play },
  resume: { label: "Retomar", icon: RotateCcw },
  pause: { label: "Pausar", icon: Pause },
};

interface Props {
  campaign: CampaignCardData;
  state: CampaignState;
  result?: CampaignResult;
  /** quando sai a próxima mensagem desta empresa (só aparece enquanto envia) */
  nextSendAt?: Date | null;
  onOpen: () => void;
  onAction: () => void;
  onEdit: () => void;
  onToggleActive: (active: boolean) => void;
  onDelete: () => void;
}

// Cartão da campanha: situação, progresso, resultado e o próximo passo.
// O resto (editar, desativar, excluir) fica no menu "⋯".
export function CampaignCard({ campaign, state, result, nextSendAt, onOpen, onAction, onEdit, onToggleActive, onDelete }: Props) {
  const style = STATUS_STYLE[state.kind];
  const StatusIcon = style.icon;
  const total = campaign.total_recipients || 0;
  const done = (campaign.sent_count || 0) + (campaign.error_count || 0);
  const progress = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const action = state.action ? ACTION_LABEL[state.action] : null;
  const isCancelled = campaign.status === "cancelled";
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm transition-shadow hover:shadow-md cursor-pointer space-y-3"
    >
      {/* Nome, situação e menu */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug truncate">{campaign.name}</p>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("border-0 rounded-full text-[11px] font-medium px-2 py-0.5", style.cls)}>
              <StatusIcon className={cn("w-3 h-3 mr-1", state.kind === "sending" && "animate-spin [animation-duration:3s]")} />
              {state.label}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {format(new Date(campaign.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
              aria-label="Mais opções"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem className="rounded-xl gap-2" onClick={onOpen}>
              <Eye className="w-4 h-4" /> Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-xl gap-2" onClick={onEdit}>
              <Pencil className="w-4 h-4" /> Editar campanha
            </DropdownMenuItem>
            <DropdownMenuItem
              className="rounded-xl gap-2"
              disabled={state.kind === "sending"}
              onClick={() => onToggleActive(isCancelled)}
            >
              <Power className="w-4 h-4" /> {isCancelled ? "Reativar campanha" : "Desativar campanha"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-xl gap-2 text-destructive focus:text-destructive" onClick={onDelete}>
              <Trash2 className="w-4 h-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {campaign.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">{campaign.description}</p>
      )}

      {/* Progresso */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground/80">
              <strong className="text-foreground">{campaign.sent_count || 0}</strong> de {total} enviadas
              {campaign.error_count > 0 && <span className="text-destructive"> · {campaign.error_count} com erro</span>}
            </span>
            <span className="text-muted-foreground tabular-nums">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 rounded-full bg-muted" />
        </div>
      )}

      {/* Resultado */}
      {result && (campaign.sent_count || 0) > 0 && (
        <div className="flex gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2.5 py-1 text-xs font-medium">
            <MessageCircle className="w-3.5 h-3.5" />
            {result.replied} responderam ({percentOf(result.replied, campaign.sent_count)}%)
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-400 px-2.5 py-1 text-xs font-medium">
            <PartyPopper className="w-3.5 h-3.5" />
            {result.closed} {result.closed === 1 ? "fechou festa" : "fecharam festa"}
          </span>
        </div>
      )}

      {/* Quando sai a próxima / por que parou */}
      {state.action === "pause" && nextSendAt && (
        <p className="text-xs text-primary flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Sai sozinha · próxima mensagem {nextSendLabel(nextSendAt, new Date())}
        </p>
      )}
      {campaign.last_error && state.kind !== "completed" && (
        <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {campaign.last_error}
        </p>
      )}

      {/* Próximo passo */}
      {action && (
        <Button
          variant={state.action === "pause" ? "outline" : "default"}
          className="w-full h-10 rounded-full"
          onClick={stop(onAction)}
        >
          <action.icon className="w-4 h-4 mr-1.5" />
          {state.action === "continue" ? `${action.label} (faltam ${state.pending})` : action.label}
        </Button>
      )}
    </div>
  );
}
