import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";
import { insertWithCompany, getCurrentCompanyId } from "@/lib/supabase-helpers";
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
  // Use allUnits so sales channels (VENDAS X) are also available for transfer/permission mapping.
  const { allUnits: companyUnits } = useCompanyUnits();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [filteredByUnit, setFilteredByUnit] = useState<UserWithRole[]>([]);
  const [isLoadingPerms, setIsLoadingPerms] = useState(false);

  // Filter users by unit permissions when the dialog opens
  useEffect(() => {
    if (!isOpen || !lead) {
      setFilteredByUnit([]);
      return;
    }

    const filterByUnit = async () => {
      const candidates = responsaveis.filter(
        (r) => r.user_id !== currentUserId && r.user_id !== lead.responsavel_id
      );

      const leadUnit = lead.unit; // e.g. "Manchester", "Trujillo", "As duas"

      if (!leadUnit) {
        // No unit on lead, show all candidates
        setFilteredByUnit(candidates);
        return;
      }

      setIsLoadingPerms(true);
      try {
        // Fetch unit permissions for all candidate users
        const candidateIds = candidates.map((c) => c.user_id);
        if (candidateIds.length === 0) {
          setFilteredByUnit([]);
          return;
        }

        // Build dynamic permission codes from company units
        const unitPermCodes = companyUnits.map(u => `leads.unit.${u.slug}`);
        const allPermCodes = ['leads.unit.all', ...unitPermCodes];

        const { data: permissions } = await supabase
          .from("user_permissions")
          .select("user_id, permission, granted")
          .in("user_id", candidateIds)
          .in("permission", allPermCodes);

        const result = candidates.filter((user) => {
          const userPerms = permissions?.filter((p) => p.user_id === user.user_id) || [];
          const permMap = new Map(userPerms.map((p) => [p.permission, p.granted]));

          // If user has "all" permission, they can see any unit
          const hasAll = permMap.get("leads.unit.all");
          if (hasAll === true) return true;

          // If no unit permissions set at all, default is "all" (same as useUnitPermissions)
          if (userPerms.length === 0) return true;

          // Check specific unit permission dynamically
          const unitLower = leadUnit.toLowerCase();
          
          // For combined units ("As duas"), check if user has access to any unit
          if (unitLower === "as duas") {
            return companyUnits.some(u => permMap.get(`leads.unit.${u.slug}`) === true);
          }
          
          // Find matching unit by name
          const matchingUnit = companyUnits.find(u => u.name.toLowerCase() === unitLower);
          if (matchingUnit && permMap.get(`leads.unit.${matchingUnit.slug}`) === true) {
            return true;
          }

          return false;
        });

        setFilteredByUnit(result);
      } catch (err) {
        console.error("Error filtering users by unit:", err);
        // Fallback: show all candidates
        setFilteredByUnit(candidates);
      } finally {
        setIsLoadingPerms(false);
      }
    };

    filterByUnit();
  }, [isOpen, lead, responsaveis, currentUserId]);

  const availableUsers = filteredByUnit;

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

      // --- Conversation migration: move conversation to target user's instance ---
      // Find conversation linked to this lead
      const { data: linkedConv } = await supabase
        .from("wapi_conversations")
        .select("id, instance_id")
        .eq("lead_id", lead.id)
        .maybeSingle();

      if (linkedConv) {
        const companyId = localStorage.getItem('selected_company_id') || 'a0000000-0000-0000-0000-000000000001';

        // Get target user's unit permissions
        const { data: targetPerms } = await supabase
          .from("user_permissions")
          .select("permission, granted")
          .eq("user_id", selectedUserId)
          .like("permission", "leads.unit.%");

        const hasAll = targetPerms?.some(p => p.permission === "leads.unit.all" && p.granted);
        const defaultAll = !targetPerms || targetPerms.length === 0;

        if (!hasAll && !defaultAll) {
          const allowedSlugs = targetPerms
            .filter(p => p.granted && p.permission !== "leads.unit.all")
            .map(p => p.permission.replace("leads.unit.", ""));

          // Check if target has access to current instance
          const { data: currentInstance } = await supabase
            .from("wapi_instances")
            .select("unit")
            .eq("id", linkedConv.instance_id)
            .single();

          const currentUnitSlug = currentInstance?.unit?.toLowerCase() || "";
          const hasAccessToCurrent = allowedSlugs.some(s => s === currentUnitSlug);

          if (!hasAccessToCurrent && allowedSlugs.length > 0) {
            const { data: targetInstances } = await supabase
              .from("wapi_instances")
              .select("id, unit")
              .eq("company_id", companyId)
              .in("unit", allowedSlugs);

            if (targetInstances && targetInstances.length > 0) {
              const newInstance = targetInstances[0];

              await supabase
                .from("wapi_conversations")
                .update({ instance_id: newInstance.id })
                .eq("id", linkedConv.id);

              // Update lead unit
              if (newInstance.unit) {
                const { data: unitData } = await supabase
                  .from("company_units")
                  .select("name")
                  .eq("company_id", companyId)
                  .eq("slug", newInstance.unit)
                  .single();

                await supabase
                  .from("campaign_leads")
                  .update({ unit: unitData?.name || newInstance.unit })
                  .eq("id", lead.id);
              }
            }
          }
        }
      }
      // --- End conversation migration ---

      // Add history entry
      await insertWithCompany("lead_history", {
        lead_id: lead.id,
        user_id: currentUserId,
        user_name: currentUserName,
        action: "🔄 Transferência de lead",
        old_value: previousResponsavel?.full_name || "Não atribuído",
        new_value: targetUser?.full_name || "Desconhecido",
      });

      // Create notification for the receiving user
      await supabase.from("notifications").insert({
        user_id: selectedUserId,
        company_id: getCurrentCompanyId(),
        type: "lead_transfer",
        title: "📬 Novo lead transferido para você!",
        message: `🔄 ${currentUserName} transferiu o lead "${lead.name}" (${LEAD_STATUS_LABELS[lead.status]}) para você. 🎯`,
        data: {
          lead_id: lead.id,
          lead_name: lead.name,
          lead_status: lead.status,
          transferred_by: currentUserName,
          transferred_by_id: currentUserId,
        },
      });

      toast({
        title: "✅ Lead transferido com sucesso!",
        description: `🎉 O lead foi transferido para ${targetUser?.full_name}.`,
      });

      setSelectedUserId("");
      onClose();
      onSuccess();
    } catch (error: unknown) {
      console.error("Error transferring lead:", error);
      toast({
        title: "❌ Erro ao transferir",
        description: error instanceof Error ? error.message : "⚠️ Tente novamente.",
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
            🔄 Transferir Lead
          </AlertDialogTitle>
          <AlertDialogDescription>
            👤 Selecione o usuário que receberá o lead "{lead?.name}". 🔔 O usuário
            será notificado sobre a transferência.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-3">
          <Label>📋 Transferir para:</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="🔍 Selecione um usuário..." />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.length === 0 ? (
                <SelectItem value="none" disabled>
                  😕 Nenhum usuário disponível
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
                ⏳ Transferindo...
              </>
            ) : (
              "🚀 Transferir"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
