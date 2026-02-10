import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { insertWithCompany } from "@/lib/supabase-helpers";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { 
  FileText, 
  Phone, 
  Clock, 
  CheckCircle, 
  XCircle,
  Sparkles,
  MoreVertical,
  ArrowRightLeft
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  status: string;
}

interface ConversationStatusActionsProps {
  conversation: {
    id: string;
    lead_id: string | null;
  };
  linkedLead: Lead | null;
  userId: string;
  currentUserName: string;
  onStatusChange?: (leadId: string, newStatus: string) => void;
  className?: string;
}

const STATUS_CONFIG = [
  { 
    value: 'novo', 
    label: 'Novo', 
    icon: Sparkles, 
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  { 
    value: 'em_contato', 
    label: 'Visita', 
    icon: Phone, 
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10'
  },
  { 
    value: 'orcamento_enviado', 
    label: 'Orçamento Enviado', 
    icon: FileText, 
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  },
  { 
    value: 'aguardando_resposta', 
    label: 'Negociando', 
    icon: Clock, 
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10'
  },
  { 
    value: 'fechado', 
    label: 'Fechado', 
    icon: CheckCircle, 
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
  },
  { 
    value: 'perdido', 
    label: 'Perdido', 
    icon: XCircle, 
    color: 'text-red-500',
    bgColor: 'bg-red-500/10'
  },
  { 
    value: 'transferido', 
    label: 'Transferência', 
    icon: ArrowRightLeft, 
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10'
  },
];

export function ConversationStatusActions({
  conversation,
  linkedLead,
  userId,
  currentUserName,
  onStatusChange,
  className,
}: ConversationStatusActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Only show if there's a linked lead
  if (!linkedLead || !conversation.lead_id) {
    return null;
  }

  const handleStatusChange = async (newStatus: string) => {
    if (isUpdating || newStatus === linkedLead.status) return;

    setIsUpdating(true);

    try {
      const statusLabels: Record<string, string> = {
        novo: 'Novo',
        em_contato: 'Visita',
        orcamento_enviado: 'Orçamento Enviado',
        aguardando_resposta: 'Negociando',
        fechado: 'Fechado',
        perdido: 'Perdido',
        transferido: 'Transferência',
      };

      // Update the lead status - cast to valid status type
      const validStatus = newStatus as "novo" | "em_contato" | "orcamento_enviado" | "aguardando_resposta" | "fechado" | "perdido" | "transferido";
      const { error: updateError } = await supabase
        .from("campaign_leads")
        .update({ status: validStatus })
        .eq("id", linkedLead.id);

      if (updateError) throw updateError;

      // Update local state IMMEDIATELY after DB success to prevent double-clicks
      onStatusChange?.(linkedLead.id, newStatus);

      toast({
        title: "Status atualizado",
        description: `Lead movido para "${statusLabels[newStatus]}".`,
      });

      // Add history entry in background (non-blocking)
      insertWithCompany("lead_history", {
        lead_id: linkedLead.id,
        user_id: userId,
        user_name: currentUserName,
        action: "Alteração de status",
        old_value: statusLabels[linkedLead.status] || linkedLead.status,
        new_value: statusLabels[newStatus] || newStatus,
      }).catch((err) => console.error("Error saving status history:", err));

      setIsOpen(false);
    } catch (error: unknown) {
      console.error("Error updating lead status:", error);
      toast({
        title: "Erro ao atualizar status",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const currentStatus = STATUS_CONFIG.find(s => s.value === linkedLead.status);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded",
            className
          )}
          title="Alterar status do lead"
        >
          <MoreVertical className={cn(
            "w-3 h-3",
            currentStatus?.color || "text-muted-foreground"
          )} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Alterar Status
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {STATUS_CONFIG.map((status) => {
          const Icon = status.icon;
          const isActive = linkedLead.status === status.value;
          // Block reverting to "novo" - leads that left this status cannot return
          const isBlockedReversion = status.value === 'novo' && linkedLead.status !== 'novo';
          
          return (
            <DropdownMenuItem
              key={status.value}
              onClick={() => handleStatusChange(status.value)}
              disabled={isUpdating || isActive || isBlockedReversion}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                isActive && status.bgColor,
                isBlockedReversion && "opacity-50"
              )}
            >
              <Icon className={cn("w-4 h-4", status.color)} />
              <span className={isActive ? "font-medium" : ""}>
                {status.label}
              </span>
              {isActive && (
                <span className="ml-auto text-xs text-muted-foreground">Atual</span>
              )}
              {isBlockedReversion && !isActive && (
                <span className="ml-auto text-xs text-muted-foreground">Bloqueado</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
