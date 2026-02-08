import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lead, UserWithRole, LEAD_STATUS_LABELS } from "@/types/crm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TransferLeadDialogProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  responsaveis: UserWithRole[];
  currentUserId: string;
  currentUserName: string;
}

export function TransferLeadDialog({
  lead,
  isOpen,
  onClose,
  onSuccess,
  responsaveis,
  currentUserId,
  currentUserName,
}: TransferLeadDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);

  // Filter out current user and the lead's current responsavel
  const availableUsers = responsaveis.filter(
    (r) => r.user_id !== currentUserId && r.user_id !== lead?.responsavel_id
  );

  const handleTransfer = async () => {
    if (!lead || !selectedUserId) return;

    setIsTransferring(true);

    try {
      const targetUser = responsaveis.find((r) => r.user_id === selectedUserId);
      const previousResponsavel = responsaveis.find(
        (r) => r.user_id === lead.responsavel_id
      );

      // Update the lead's responsavel and status
      const { error: updateError } = await supabase
        .from("campaign_leads")
        .update({ 
          responsavel_id: selectedUserId,
          status: "transferido" as const
        })
        .eq("id", lead.id);

      if (updateError) throw updateError;

      // Add history entry
      await supabase.from("lead_history").insert({
        lead_id: lead.id,
        user_id: currentUserId,
        user_name: currentUserName,
        action: "Transferência de lead",
        old_value: previousResponsavel?.full_name || "Não atribuído",
        new_value: targetUser?.full_name || "Desconhecido",
      });

      // Create notification for the receiving user
      await supabase.from("notifications").insert({
        user_id: selectedUserId,
        type: "lead_transfer",
        title: "Novo lead transferido para você",
        message: `${currentUserName} transferiu o lead "${lead.name}" (${LEAD_STATUS_LABELS[lead.status]}) para você.`,
        data: {
          lead_id: lead.id,
          lead_name: lead.name,
          lead_status: lead.status,
          transferred_by: currentUserName,
          transferred_by_id: currentUserId,
        },
      });

      toast({
        title: "Lead transferido",
        description: `O lead foi transferido para ${targetUser?.full_name}.`,
      });

      setSelectedUserId("");
      onClose();
      onSuccess();
    } catch (error: unknown) {
      console.error("Error transferring lead:", error);
      toast({
        title: "Erro ao transferir",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Transferir Lead
          </AlertDialogTitle>
          <AlertDialogDescription>
            Selecione o usuário que receberá o lead "{lead?.name}". O usuário
            será notificado sobre a transferência.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-3">
          <Label>Transferir para:</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um usuário..." />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.length === 0 ? (
                <SelectItem value="none" disabled>
                  Nenhum usuário disponível
                </SelectItem>
              ) : (
                availableUsers.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.full_name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isTransferring}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleTransfer}
            disabled={!selectedUserId || isTransferring}
          >
            {isTransferring ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Transferindo...
              </>
            ) : (
              "Transferir"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
