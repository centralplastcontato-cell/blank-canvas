import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnitPermissions } from "@/hooks/useUnitPermissions";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";
import { insertWithCompany } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { 
  Wifi, WifiOff, Plus, RefreshCw, Settings2, Copy, Check, 
  MessageSquare, CreditCard, Calendar, Building2, Pencil, 
  Trash2, QrCode, Loader2, Phone, Smartphone, Eraser
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WapiInstance {
  id: string;
  user_id: string;
  instance_id: string;
  instance_token: string;
  status: string;
  phone_number: string | null;
  connected_at: string | null;
  messages_count: number;
  credits_available: number;
  addon_valid_until: string | null;
  unit: string | null;
  provider?: string;
  client_token?: string | null;
}

interface ConnectionSectionProps {
  userId: string;
  isAdmin: boolean;
}

// UNITS are now loaded dynamically from useCompanyUnits

const webhookUrl = `https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/wapi-webhook`;

export function ConnectionSection({ userId, isAdmin }: ConnectionSectionProps) {
  const { unitOptions: UNITS, isLoading: isLoadingUnits } = useCompanyUnits();
  const { allowedUnits, canViewAll, isLoading: isLoadingPermissions } = useUnitPermissions(userId);
  
  const [instances, setInstances] = useState<WapiInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isClearingConversations, setIsClearingConversations] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editingInstance, setEditingInstance] = useState<WapiInstance | null>(null);
  
  // QR Code states
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrInstance, setQrInstance] = useState<WapiInstance | null>(null);
  const [qrPolling, setQrPolling] = useState(false);

  // Repair session states
  const [isRepairing, setIsRepairing] = useState<string | null>(null);
  const [repairPhoneDialogOpen, setRepairPhoneDialogOpen] = useState(false);
  const [repairPhoneInstance, setRepairPhoneInstance] = useState<WapiInstance | null>(null);
  const [repairManualPhone, setRepairManualPhone] = useState('');

  // Phone pairing states
  const [connectionMode, setConnectionMode] = useState<'qr' | 'phone'>('qr');
  const [_phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isPairingLoading, setIsPairingLoading] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Number change detection states
  const [numberChangeDialogOpen, setNumberChangeDialogOpen] = useState(false);
  const [numberChangeInstance, setNumberChangeInstance] = useState<WapiInstance | null>(null);
  const [oldPhoneNumber, setOldPhoneNumber] = useState<string | null>(null);
  const [newPhoneNumber, setNewPhoneNumber] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    instanceId: "",
    instanceToken: "",
    unit: "",
    provider: "wapi" as "wapi" | "zapi",
    clientToken: "",
  });

  useEffect(() => {
    fetchInstances();
  }, [userId]);

  const fetchInstances = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("wapi_instances")
      .select("*")
      .order("unit", { ascending: true });

    if (data) {
      // Load instances immediately from DB without waiting for status sync
      setInstances(data as WapiInstance[]);
      setIsLoading(false);
      
      // Sync status in background (non-blocking) if there are instances
      if (data.length > 0) {
        syncInstancesInBackground(data as WapiInstance[]);
      }
    } else {
      setIsLoading(false);
    }
  };

  // Background sync without blocking the UI
  const syncInstancesInBackground = async (instancesList: WapiInstance[]) => {
    let detectedNumberChange: { instance: WapiInstance; oldPhone: string; newPhone: string } | null = null;
    
    const updates = await Promise.all(
      instancesList.map(async (instance) => {
        try {
          const response = await supabase.functions.invoke("wapi-send", {
            body: { 
              action: "get-status",
              instanceId: instance.instance_id,
              instanceToken: instance.instance_token,
            },
          });

          const wapiStatus = response.data?.status;
          const wapiPhone = response.data?.phoneNumber || response.data?.phone;
          const errorType = response.data?.errorType;

          // DEGRADED/TIMEOUT/SESSION_INCOMPLETE: keep previous status, don't update DB
          if (wapiStatus === 'degraded' || errorType === 'TIMEOUT_OR_GATEWAY' || errorType === 'SESSION_INCOMPLETE') {
            console.log(`Sync: ${instance.unit} returned ${wapiStatus}/${errorType}, keeping previous status`);
            // For SESSION_INCOMPLETE, update DB status to degraded so it's visible
            if (errorType === 'SESSION_INCOMPLETE') {
              await supabase
                .from("wapi_instances")
                .update({ status: 'degraded' })
                .eq("id", instance.id);
              return { ...instance, status: 'degraded', _degradedError: response.data?.error, _degradedType: errorType } as WapiInstance & { _degradedError?: string; _degradedType?: string };
            }
            // Store the degraded info so we can show alerts in UI
            return { ...instance, _degradedError: response.data?.error, _degradedType: errorType } as WapiInstance & { _degradedError?: string; _degradedType?: string };
          }

          if (wapiStatus && wapiStatus !== instance.status) {
            const updateData: Record<string, unknown> = { status: wapiStatus };
            
            if (wapiStatus === 'connected' && wapiPhone) {
              updateData.phone_number = wapiPhone;
              updateData.connected_at = new Date().toISOString();
              
              // Detect phone number change
              const previousPhone = instance.phone_number;
              if (previousPhone && wapiPhone && previousPhone !== wapiPhone && !detectedNumberChange) {
                detectedNumberChange = { instance, oldPhone: previousPhone, newPhone: wapiPhone };
              }
            } else if (wapiStatus === 'disconnected' || wapiStatus === 'instance_not_found') {
              updateData.connected_at = null;
            }

            await supabase
              .from("wapi_instances")
              .update(updateData)
              .eq("id", instance.id);

            return { ...instance, ...updateData } as WapiInstance;
          }
          
          // Also check for phone number change even if status didn't change
          if (wapiStatus === 'connected' && wapiPhone && instance.phone_number && 
              instance.phone_number !== wapiPhone && !detectedNumberChange) {
            detectedNumberChange = { instance, oldPhone: instance.phone_number, newPhone: wapiPhone };
            
            await supabase
              .from("wapi_instances")
              .update({ phone_number: wapiPhone })
              .eq("id", instance.id);
            
            return { ...instance, phone_number: wapiPhone } as WapiInstance;
          }

          return instance;
        } catch (err) {
          console.error(`Error syncing status for instance ${instance.unit}:`, err);
          return instance;
        }
      })
    );

    // Update UI with synced data
    setInstances(updates);
    
    // Show number change dialog if detected
    if (detectedNumberChange) {
      setOldPhoneNumber(detectedNumberChange.oldPhone);
      setNewPhoneNumber(detectedNumberChange.newPhone);
      setNumberChangeInstance(detectedNumberChange.instance);
      setNumberChangeDialogOpen(true);
    }
  };

  const handleSaveInstance = async () => {
    if (!formData.instanceId || !formData.instanceToken || !formData.unit) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (!editingInstance) {
      const existingUnit = instances.find(i => i.unit === formData.unit);
      if (existingUnit) {
        toast({
          title: "Erro",
          description: `A unidade ${formData.unit} já possui uma instância configurada.`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSaving(true);

    try {
      if (editingInstance) {
        const { error } = await supabase
          .from("wapi_instances")
          .update({
            instance_id: formData.instanceId,
            instance_token: formData.instanceToken,
            unit: formData.unit,
          })
          .eq("id", editingInstance.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Instância atualizada com sucesso!",
        });
      } else {
        const { error } = await insertWithCompany("wapi_instances", {
          user_id: userId,
          instance_id: formData.instanceId,
          instance_token: formData.instanceToken,
          unit: formData.unit,
          status: "disconnected",
        }) as { error: any };

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: `Instância da unidade ${formData.unit} criada com sucesso!`,
        });
      }

      setIsDialogOpen(false);
      setEditingInstance(null);
      setFormData({ instanceId: "", instanceToken: "", unit: "" });
      fetchInstances();

      await configureWebhooks(formData.instanceId, formData.instanceToken);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar instância.",
        variant: "destructive",
      });
    }

    setIsSaving(false);
  };

  const handleDeleteInstance = async (instance: WapiInstance) => {
    if (!isAdmin) {
      toast({
        title: "Sem permissão",
        description: "Apenas administradores podem excluir instâncias.",
        variant: "destructive",
      });
      return;
    }

    const confirmMsg = `⚠️ ATENÇÃO: Isso excluirá permanentemente:\n\n` +
      `• A instância da unidade ${instance.unit}\n` +
      `• Todas as configurações do bot\n` +
      `• Todas as conversas e mensagens\n` +
      `• Todas as perguntas do bot\n` +
      `• Todos os números VIP\n\n` +
      `Tem certeza que deseja continuar?`;

    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      // Step 1: Delete bot questions
      const { error: questionsError } = await supabase
        .from("wapi_bot_questions")
        .delete()
        .eq("instance_id", instance.id);
      
      if (questionsError) {
        console.error("Error deleting bot questions:", questionsError);
      }

      // Step 2: Delete VIP numbers
      const { error: vipError } = await supabase
        .from("wapi_vip_numbers")
        .delete()
        .eq("instance_id", instance.id);
      
      if (vipError) {
        console.error("Error deleting VIP numbers:", vipError);
      }

      // Step 3: Delete bot settings
      const { error: settingsError } = await supabase
        .from("wapi_bot_settings")
        .delete()
        .eq("instance_id", instance.id);
      
      if (settingsError) {
        console.error("Error deleting bot settings:", settingsError);
        throw new Error("Erro ao excluir configurações do bot: " + settingsError.message);
      }

      // Step 4: Get all conversations for this instance to delete messages
      const { data: conversations } = await supabase
        .from("wapi_conversations")
        .select("id")
        .eq("instance_id", instance.id);

      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map(c => c.id);
        
        // Step 5: Delete all messages from these conversations
        const { error: messagesError } = await supabase
          .from("wapi_messages")
          .delete()
          .in("conversation_id", conversationIds);
        
        if (messagesError) {
          console.error("Error deleting messages:", messagesError);
        }
      }

      // Step 6: Delete conversations
      const { error: conversationsError } = await supabase
        .from("wapi_conversations")
        .delete()
        .eq("instance_id", instance.id);
      
      if (conversationsError) {
        console.error("Error deleting conversations:", conversationsError);
        throw new Error("Erro ao excluir conversas: " + conversationsError.message);
      }

      // Step 7: Finally delete the instance
      const { error: instanceError } = await supabase
        .from("wapi_instances")
        .delete()
        .eq("id", instance.id);

      if (instanceError) {
        console.error("Delete instance error:", instanceError);
        throw instanceError;
      }

      toast({
        title: "Sucesso",
        description: `Instância ${instance.unit} e todos os dados relacionados foram excluídos.`,
      });

      fetchInstances();
    } catch (error: any) {
      console.error("Delete instance error:", error);
      toast({
        title: "Erro ao excluir",
        description: error.message || "Erro ao excluir instância.",
        variant: "destructive",
      });
    }
  };

  const handleClearNonImportedConversations = async (instance: WapiInstance) => {
    const confirmMsg = `⚠️ ATENÇÃO: Isso excluirá permanentemente:\n\n` +
      `• Todas as conversas NÃO IMPORTADAS da unidade ${instance.unit}\n` +
      `• Todas as mensagens dessas conversas\n\n` +
      `As conversas importadas serão preservadas.\n\n` +
      `Tem certeza que deseja continuar?`;

    if (!confirm(confirmMsg)) {
      return;
    }

    setIsClearingConversations(instance.id);

    try {
      // Step 1: Get all non-imported conversations for this instance
      const { data: conversations, error: fetchError } = await supabase
        .from("wapi_conversations")
        .select("id")
        .eq("instance_id", instance.id)
        .eq("is_imported", false);

      if (fetchError) {
        throw new Error("Erro ao buscar conversas: " + fetchError.message);
      }

      if (!conversations || conversations.length === 0) {
        toast({
          title: "Nenhuma conversa para limpar",
          description: "Não há conversas não-importadas nesta instância.",
        });
        setIsClearingConversations(null);
        return;
      }

      const conversationIds = conversations.map(c => c.id);
      const totalConversations = conversations.length;

      // Step 2: Delete related lead_history entries
      const { data: leadsToClean } = await supabase
        .from("wapi_conversations")
        .select("lead_id")
        .in("id", conversationIds)
        .not("lead_id", "is", null);

      if (leadsToClean && leadsToClean.length > 0) {
        const leadIds = leadsToClean.map(l => l.lead_id).filter(Boolean);
        if (leadIds.length > 0) {
          await supabase
            .from("lead_history")
            .delete()
            .in("lead_id", leadIds);
        }
      }

      // Step 3: Delete all messages from these conversations
      const { error: messagesError } = await supabase
        .from("wapi_messages")
        .delete()
        .in("conversation_id", conversationIds);

      if (messagesError) {
        console.error("Error deleting messages:", messagesError);
      }

      // Step 4: Delete the non-imported conversations
      const { error: conversationsError } = await supabase
        .from("wapi_conversations")
        .delete()
        .in("id", conversationIds);

      if (conversationsError) {
        throw new Error("Erro ao excluir conversas: " + conversationsError.message);
      }

      toast({
        title: "Limpeza concluída",
        description: `${totalConversations} conversa(s) não-importada(s) foram excluídas da unidade ${instance.unit}.`,
      });

    } catch (error: any) {
      console.error("Error clearing conversations:", error);
      toast({
        title: "Erro ao limpar conversas",
        description: error.message || "Erro desconhecido.",
        variant: "destructive",
      });
    }

    setIsClearingConversations(null);
  };

  const configureWebhooks = async (instanceId: string, instanceToken: string) => {
    try {
      const response = await supabase.functions.invoke("wapi-send", {
        body: {
          action: "configure-webhooks",
          webhookUrl: webhookUrl,
          instanceId,
          instanceToken,
        },
      });

      if (response.error) {
        console.error("Error configuring webhooks:", response.error);
      } else {
        console.log("Webhooks configured successfully");
      }
    } catch (error) {
      console.error("Error configuring webhooks:", error);
    }
  };

  const handleRefreshStatus = async (instance: WapiInstance) => {
    setIsRefreshing(true);

    try {
      const response = await supabase.functions.invoke("wapi-send", {
        body: { 
          action: "get-status",
          instanceId: instance.instance_id,
          instanceToken: instance.instance_token,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const wapiStatus = response.data?.status;
      const errorType = response.data?.errorType;

      // DEGRADED or SESSION_INCOMPLETE: don't update DB, show specific warning
      if (wapiStatus === 'degraded' || errorType === 'TIMEOUT_OR_GATEWAY' || errorType === 'SESSION_INCOMPLETE') {
        const description = errorType === 'SESSION_INCOMPLETE'
          ? 'Instância conectada sem sessão válida. Desconecte e reconecte o WhatsApp.'
          : (response.data?.error || 'Comunicação instável. Status anterior mantido.');
        
        // For SESSION_INCOMPLETE, update DB to degraded
        if (errorType === 'SESSION_INCOMPLETE') {
          await supabase
            .from("wapi_instances")
            .update({ status: 'degraded' })
            .eq("id", instance.id);
        }
        
        toast({
          title: errorType === 'SESSION_INCOMPLETE' ? "⚠️ Sessão incompleta" : "⚠️ Instabilidade na W-API",
          description,
          variant: "destructive",
        });
        setIsRefreshing(false);
        await fetchInstances();
        return;
      }

      if (wapiStatus) {
        const newPhone = response.data.phoneNumber || response.data.phone || null;
        const previousPhone = instance.phone_number;
        
        const phoneChanged = previousPhone && newPhone && previousPhone !== newPhone;
        
        const updateData: Record<string, unknown> = { status: wapiStatus };
        if (wapiStatus === 'connected') {
          updateData.phone_number = newPhone;
          updateData.connected_at = new Date().toISOString();
        } else if (wapiStatus === 'disconnected' || wapiStatus === 'instance_not_found') {
          updateData.connected_at = null;
        }

        await supabase
          .from("wapi_instances")
          .update(updateData)
          .eq("id", instance.id);
        
        if (phoneChanged) {
          setOldPhoneNumber(previousPhone);
          setNewPhoneNumber(newPhone);
          setNumberChangeInstance(instance);
          setNumberChangeDialogOpen(true);
          toast({
            title: "Número alterado detectado!",
            description: `A instância ${instance.unit} está conectada com um número diferente.`,
          });
        } else {
          const evidenceBased = response.data?.evidenceBased === true;
          const statusLabel = wapiStatus === 'connected' 
                              ? (evidenceBased ? 'Conectado ✅ (verificado por atividade)' : 'Conectado ✅') :
                              wapiStatus === 'unauthorized' ? 'Token inválido ⚠️' :
                              wapiStatus === 'instance_not_found' ? 'Instância não encontrada ❌' :
                              wapiStatus;
          toast({
            title: "Status atualizado",
            description: `Instância ${instance.unit}: ${statusLabel}`,
          });
        }
      } else {
        toast({
          title: "Status atualizado",
          description: `Instância ${instance.unit}: verificado`,
        });
      }

      await fetchInstances();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar status.",
        variant: "destructive",
      });
    }

    setIsRefreshing(false);
  };

  const handleSyncAllStatus = async () => {
    setIsSyncingAll(true);
    let successCount = 0;
    let errorCount = 0;
    let degradedCount = 0;

    try {
      for (const instance of instances) {
        try {
          const response = await supabase.functions.invoke("wapi-send", {
            body: { 
              action: "get-status",
              instanceId: instance.instance_id,
              instanceToken: instance.instance_token,
            },
          });

          const wapiStatus = response.data?.status;
          const errorType = response.data?.errorType;

          // Skip DB update for degraded/timeout, but update for SESSION_INCOMPLETE
          if (errorType === 'SESSION_INCOMPLETE') {
            await supabase
              .from("wapi_instances")
              .update({ status: 'degraded' })
              .eq("id", instance.id);
            degradedCount++;
            continue;
          }
          if (wapiStatus === 'degraded' || errorType === 'TIMEOUT_OR_GATEWAY') {
            degradedCount++;
            continue;
          }

          if (wapiStatus) {
            const updateData: Record<string, unknown> = { status: wapiStatus };
            
            if (wapiStatus === 'connected') {
              updateData.phone_number = response.data.phoneNumber || response.data.phone || instance.phone_number;
              if (!instance.connected_at) {
                updateData.connected_at = new Date().toISOString();
              }
            } else if (wapiStatus === 'disconnected' || wapiStatus === 'instance_not_found') {
              updateData.connected_at = null;
            }

            await supabase
              .from("wapi_instances")
              .update(updateData)
              .eq("id", instance.id);
            
            successCount++;
          }
        } catch (err) {
          console.error(`Error syncing ${instance.unit}:`, err);
          errorCount++;
        }
      }

      await fetchInstances();

      const parts = [`${successCount} sincronizada(s)`];
      if (degradedCount > 0) parts.push(`${degradedCount} instável(is)`);
      if (errorCount > 0) parts.push(`${errorCount} erro(s)`);

      toast({
        title: "Sincronização concluída",
        description: parts.join(', ') + '.',
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao sincronizar status.",
        variant: "destructive",
      });
    }

    setIsSyncingAll(false);
  };

  const fetchQrCode = useCallback(async (instance: WapiInstance) => {
    setQrLoading(true);
    
    try {
      // Client-side timeout protection (12s) to prevent infinite spinner
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT_CLIENT')), 12000)
      );

      const fetchPromise = supabase.functions.invoke("wapi-send", {
        body: { 
          action: "get-qr",
          instanceId: instance.instance_id,
          instanceToken: instance.instance_token,
        },
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Handle TIMEOUT_OR_GATEWAY from edge function
      if (response.data?.errorType === 'TIMEOUT_OR_GATEWAY') {
        toast({
          title: "⚠️ W-API instável",
          description: "Tente novamente ou conecte por Telefone.",
        });
        return;
      }

      // Handle RESTARTING — instance was auto-restarted, retry shortly
      if (response.data?.errorType === 'RESTARTING' || response.data?.errorType === 'INSTANCE_ERROR') {
        toast({
          title: "🔄 Reiniciando instância",
          description: "Aguarde alguns segundos e clique em 'Tentar novamente'.",
        });
        return;
      }

      if (response.data?.connected === true || response.data?.details?.connected === true) {
        toast({
          title: "Já conectado!",
          description: "Esta instância já está conectada ao WhatsApp.",
        });
        await supabase
          .from("wapi_instances")
          .update({ 
            status: 'connected',
            connected_at: new Date().toISOString(),
          })
          .eq("id", instance.id);
        setQrDialogOpen(false);
        setQrPolling(false);
        fetchInstances();
        return;
      }

      if (response.data?.qrCode) {
        setQrCode(response.data.qrCode);
      } else if (response.data?.error) {
        const errorMessage = response.data.error?.toLowerCase() || '';
        if (errorMessage.includes('conectad') || errorMessage.includes('connected')) {
          toast({
            title: "Já conectado",
            description: "A instância já está conectada ao WhatsApp.",
          });
          setQrDialogOpen(false);
          setQrPolling(false);
          fetchInstances();
        } else {
          toast({
            title: "Aviso",
            description: response.data.error,
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("Error fetching QR code:", error);
      if (error.message === 'TIMEOUT_CLIENT') {
        toast({
          title: "⚠️ W-API instável",
          description: "A geração do QR Code demorou demais. Tente novamente ou conecte por Telefone.",
        });
      } else {
        toast({
          title: "Erro",
          description: error.message || "Erro ao obter QR Code.",
          variant: "destructive",
        });
      }
    } finally {
      setQrLoading(false);
    }
  }, []);

  const pollConnectionStatus = useCallback(async (instance: WapiInstance) => {
    try {
      console.log("Polling connection status for:", instance.unit);
      
      const response = await supabase.functions.invoke("wapi-send", {
        body: { 
          action: "get-status",
          instanceId: instance.instance_id,
          instanceToken: instance.instance_token,
        },
      });

      console.log("Poll response:", response.data);

      if (response.data?.status === 'connected' || response.data?.connected === true) {
        console.log("Connection detected! Updating database...");
        
        const newPhone = response.data.phoneNumber || response.data.phone || null;
        const previousPhone = instance.phone_number;
        
        // Detect if phone number changed (different number connected)
        const phoneChanged = previousPhone && newPhone && previousPhone !== newPhone;
        
        const { error: updateError } = await supabase
          .from("wapi_instances")
          .update({ 
            status: 'connected',
            phone_number: newPhone,
            connected_at: new Date().toISOString(),
          })
          .eq("id", instance.id);

        if (updateError) {
          console.error("Error updating instance:", updateError);
        }

        setQrPolling(false);
        setQrDialogOpen(false);
        
        // If phone number changed, offer to clear non-imported conversations
        if (phoneChanged) {
          console.log("Phone number changed from", previousPhone, "to", newPhone);
          setOldPhoneNumber(previousPhone);
          setNewPhoneNumber(newPhone);
          setNumberChangeInstance(instance);
          setNumberChangeDialogOpen(true);
          toast({
            title: "Número alterado!",
            description: `WhatsApp da unidade ${instance.unit} conectado com um número diferente.`,
          });
        } else {
          toast({
            title: "Conectado!",
            description: `WhatsApp da unidade ${instance.unit} conectado com sucesso!`,
          });
        }
        
        fetchInstances();
        return true;
      }
    } catch (error) {
      console.error("Error polling status:", error);
    }
    return false;
  }, []);

  const handleOpenQrDialog = (instance: WapiInstance) => {
    setQrInstance(instance);
    setQrCode(null);
    setPairingCode(null);
    setPhoneNumber('');
    setConnectionMode('qr');
    setQrDialogOpen(true);
    setQrPolling(true);
    fetchQrCode(instance);
  };

  const handleRequestPairingCode = async () => {
    const currentPhone = phoneInputRef.current?.value.replace(/\D/g, '') || '';
    console.log("[PairingCode] phoneInputRef:", phoneInputRef.current, "value:", currentPhone, "qrInstance:", qrInstance?.unit);
    if (!qrInstance || !currentPhone || currentPhone.length < 10) {
      toast({
        title: "Erro",
        description: "Informe o número de telefone com DDD.",
        variant: "destructive",
      });
      return;
    }

    setIsPairingLoading(true);
    setPairingCode(null);

    try {
      const response = await supabase.functions.invoke("wapi-send", {
        body: { 
          action: "request-pairing-code",
          instanceId: qrInstance.instance_id,
          instanceToken: qrInstance.instance_token,
          phoneNumber: currentPhone,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.pairingCode) {
        setPairingCode(response.data.pairingCode);
        toast({
          title: "Código gerado!",
          description: "Use este código no seu WhatsApp para conectar.",
        });
      } else if (response.data?.error) {
        toast({
          title: "Erro",
          description: response.data.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error requesting pairing code:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao solicitar código de pareamento.",
        variant: "destructive",
      });
    }

    setIsPairingLoading(false);
  };

  useEffect(() => {
    if (!qrDialogOpen || !qrInstance || !qrPolling) return;

    console.log("Starting connection polling for:", qrInstance.unit);

    // Poll immediately first, then every 3 seconds (faster polling)
    const pollNow = async () => {
      const connected = await pollConnectionStatus(qrInstance);
      if (connected) {
        console.log("Connected! Stopping polling.");
      }
      return connected;
    };

    // Initial poll after 2 seconds
    const initialTimeout = setTimeout(pollNow, 2000);

    const interval = setInterval(async () => {
      const connected = await pollNow();
      if (connected) {
        clearInterval(interval);
      }
    }, 3000); // Faster polling: every 3 seconds

    return () => {
      console.log("Cleaning up polling interval");
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [qrDialogOpen, qrInstance, qrPolling, pollConnectionStatus]);

  useEffect(() => {
    if (!qrDialogOpen || !qrInstance || !qrPolling || connectionMode !== 'qr') return;

    const interval = setInterval(() => {
      fetchQrCode(qrInstance);
    }, 15000); // Refresh QR every 15s (QR codes expire quickly)

    return () => clearInterval(interval);
  }, [qrDialogOpen, qrInstance, qrPolling, connectionMode, fetchQrCode]);

  // === Restart Instance Handler ===
  const [isRestarting, setIsRestarting] = useState<string | null>(null);

  const handleRestartInstance = async (instance: WapiInstance) => {
    setIsRestarting(instance.id);
    try {
      const response = await supabase.functions.invoke("wapi-send", {
        body: {
          action: "restart-instance",
          instanceId: instance.instance_id,
          instanceToken: instance.instance_token,
        },
      });

      if (response.error) throw new Error(response.error.message);

      if (response.data?.restarted) {
        toast({
          title: response.data.connected ? "✅ Instância reiniciada!" : "🔄 Restart enviado",
          description: response.data.connected 
            ? "Sessão restaurada. As mensagens devem ser entregues normalmente agora."
            : "O restart foi aceito pelo provedor. Aguarde alguns segundos e atualize o status.",
        });
        await fetchInstances();
      } else {
        toast({
          title: "⚠️ Restart não disponível",
          description: response.data?.reason || "Desconecte e reconecte a instância manualmente.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao reiniciar instância.",
        variant: "destructive",
      });
    }
    setIsRestarting(null);
  };

  // === Repair Session Handler ===
  const handleRepairSession = async (instance: WapiInstance, manualPhone?: string) => {
    setIsRepairing(instance.id);
    
    try {
      const response = await supabase.functions.invoke("wapi-send", {
        body: {
          action: "repair-session",
          instanceId: instance.instance_id,
          instanceToken: instance.instance_token,
          ...(manualPhone ? { manualPhone } : {}),
        },
      });

      if (response.error) throw new Error(response.error.message);

      if (response.data?.repaired) {
        toast({
          title: "✅ Sessão reparada!",
          description: `Número ${response.data.phoneNumber} vinculado com sucesso. Envios desbloqueados.`,
        });
        setRepairPhoneDialogOpen(false);
        setRepairManualPhone('');
        await fetchInstances();
      } else if (response.data?.needsManualPhone && !manualPhone) {
        // Auto-repair failed, open manual phone dialog
        setRepairPhoneInstance(instance);
        setRepairManualPhone('');
        setRepairPhoneDialogOpen(true);
      } else {
        toast({
          title: "⚠️ Reparo não concluído",
          description: response.data?.reason || "Não foi possível reparar a sessão.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao reparar sessão.",
        variant: "destructive",
      });
    }

    setIsRepairing(null);
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenDialog = (instance?: WapiInstance) => {
    if (instance) {
      setEditingInstance(instance);
      setFormData({
        instanceId: instance.instance_id,
        instanceToken: instance.instance_token,
        unit: instance.unit || "",
      });
    } else {
      setEditingInstance(null);
      setFormData({ instanceId: "", instanceToken: "", unit: "" });
    }
    setIsDialogOpen(true);
  };

  const getAvailableUnits = () => {
    const usedUnits = instances.map(i => i.unit);
    if (editingInstance) {
      return UNITS;
    }
    return UNITS.filter(u => !usedUnits.includes(u.value));
  };

  // Filter instances based on unit permissions (admins see all)
  const filteredInstances = isAdmin || canViewAll
    ? instances
    : instances.filter(instance => 
        instance.unit && allowedUnits.includes(instance.unit)
      );

  const isLoadingAll = isLoading || isLoadingPermissions || isLoadingUnits;

  if (isLoadingAll) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Dialog for manual phone repair
  const repairPhoneDialogJsx = (
    <Dialog open={repairPhoneDialogOpen} onOpenChange={(open) => {
      setRepairPhoneDialogOpen(open);
      if (!open) {
        setRepairManualPhone('');
        setRepairPhoneInstance(null);
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <Phone className="w-5 h-5" />
            Informar Número Manualmente
          </DialogTitle>
          <DialogDescription>
            O reparo automático não encontrou o número. Copie o número exibido no painel da W-API.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Acesse <strong>w-api.app</strong> → sua instância → copie o número exibido (com DDI, ex: 5534991234567)
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="repairPhone">Número do WhatsApp (com DDI)</Label>
            <Input
              id="repairPhone"
              placeholder="5534991234567"
              value={repairManualPhone}
              onChange={(e) => setRepairManualPhone(e.target.value.replace(/\D/g, ''))}
              maxLength={13}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setRepairPhoneDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (repairPhoneInstance) {
                handleRepairSession(repairPhoneInstance, repairManualPhone);
              }
            }}
            disabled={repairManualPhone.length < 11 || isRepairing !== null}
          >
            {isRepairing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Reparando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Reparar Sessão
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Dialog for number change detection - offers to clean non-imported conversations
  const numberChangeDialogJsx = (
    <Dialog open={numberChangeDialogOpen} onOpenChange={setNumberChangeDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <Phone className="w-5 h-5" />
            Número Alterado Detectado
          </DialogTitle>
          <DialogDescription>
            Um número diferente foi conectado nesta instância.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Número anterior:</span>
              <span className="font-mono font-medium">{oldPhoneNumber || "Desconhecido"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Novo número:</span>
              <span className="font-mono font-medium text-primary">{newPhoneNumber || "Desconhecido"}</span>
            </div>
          </div>
          
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Deseja limpar as conversas do número anterior?</strong>
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              As conversas importadas serão preservadas. Apenas conversas criadas pelo número anterior serão removidas.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setNumberChangeDialogOpen(false);
              setNumberChangeInstance(null);
            }}
            className="w-full sm:w-auto"
          >
            Manter conversas
          </Button>
          <Button
            onClick={async () => {
              if (numberChangeInstance) {
                setNumberChangeDialogOpen(false);
                await handleClearNonImportedConversations(numberChangeInstance);
                setNumberChangeInstance(null);
              }
            }}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
          >
            <Eraser className="w-4 h-4 mr-2" />
            Limpar conversas anteriores
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const connectionDialogJsx = (
    <Dialog open={qrDialogOpen} onOpenChange={(open) => {
      setQrDialogOpen(open);
      if (!open) {
        setQrPolling(false);
        setQrCode(null);
        setPairingCode(null);
        setPhoneNumber('');
        setConnectionMode('qr');
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Conectar WhatsApp - {qrInstance?.unit}
          </DialogTitle>
          <DialogDescription>
            Escolha como deseja conectar seu WhatsApp
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <Button
            variant={connectionMode === 'qr' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => {
              setConnectionMode('qr');
              if (qrInstance && !qrCode) fetchQrCode(qrInstance);
            }}
          >
            <QrCode className="w-4 h-4 mr-2" />
            QR Code
          </Button>
          <Button
            variant={connectionMode === 'phone' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => setConnectionMode('phone')}
          >
            <Phone className="w-4 h-4 mr-2" />
            Telefone
          </Button>
        </div>

        {connectionMode === 'qr' ? (
          <div className="flex flex-col items-center justify-center py-4">
            {qrLoading && !qrCode ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
              </div>
            ) : qrCode ? (
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg">
                  {qrCode.startsWith('data:image') ? (
                    <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                  ) : (
                    <img 
                      src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} 
                      alt="QR Code" 
                      className="w-64 h-64" 
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className={`w-4 h-4 ${qrLoading ? 'animate-spin' : ''}`} />
                  <span>Aguardando conexão...</span>
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Abra o WhatsApp no seu celular, vá em Configurações → Aparelhos conectados → Conectar aparelho
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8">
                <WifiOff className="w-12 h-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Não foi possível gerar o QR Code</p>
                <Button variant="outline" onClick={() => qrInstance && fetchQrCode(qrInstance)}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar novamente
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Informe o número que deseja conectar (o mesmo presente no seu WhatsApp)
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-input shrink-0">
                  <span className="text-lg">🇧🇷</span>
                  <span className="text-sm font-medium">+55</span>
                </div>
                <input
                  ref={phoneInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="11999999999"
                  maxLength={11}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    const cleaned = el.value.replace(/\D/g, '').slice(0, 11);
                    if (cleaned !== el.value) el.value = cleaned;
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex-1 min-w-0"
                />
              </div>
              
              <Button 
                onClick={handleRequestPairingCode}
                disabled={isPairingLoading}
                className="w-full"
              >
                {isPairingLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Solicitando código...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Solicitar código
                  </>
                )}
              </Button>
            </div>

            {pairingCode && (
              <div className="mt-4 p-4 bg-primary/10 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Código de pareamento:
                </p>
                <p className="text-3xl font-bold tracking-widest text-primary font-mono">
                  {pairingCode}
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  No seu WhatsApp: Configurações → Aparelhos conectados → Conectar aparelho → Conectar com número de telefone
                </p>
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Aguardando conexão...</span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Non-admin view
  if (!isAdmin) {
    return (
      <div className="space-y-4">
        {connectionDialogJsx}
        {numberChangeDialogJsx}
        {repairPhoneDialogJsx}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                Status das Instâncias
              </CardTitle>
              <CardDescription>
                Clique em "Conectar" para escanear o QR Code e conectar o WhatsApp.
              </CardDescription>
            </div>
            {filteredInstances.length > 0 && (
              <Button 
                variant="outline" 
                onClick={handleSyncAllStatus}
                disabled={isSyncingAll}
                className="w-full sm:w-auto"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncingAll ? 'animate-spin' : ''}`} />
                {isSyncingAll ? 'Sincronizando...' : 'Atualizar Status'}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredInstances.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma instância configurada pelo administrador.
              </p>
            ) : (
              filteredInstances.map((instance) => (
                <div key={instance.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${instance.status === 'connected' ? 'bg-primary/10' : 'bg-muted'}`}>
                      {instance.status === 'connected' ? (
                        <Wifi className="w-5 h-5 text-primary" />
                      ) : (
                        <WifiOff className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {instance.unit}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {instance.status === 'connected' ? 'Conectado' : 'Desconectado'}
                        {instance.phone_number && ` • ${instance.phone_number}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {instance.status !== 'connected' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleOpenQrDialog(instance)}
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        Conectar
                      </Button>
                    )}
                    <Badge variant={instance.status === 'connected' ? 'default' : 'secondary'}>
                      {instance.status === 'connected' ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin view
  return (
    <div className="space-y-6">
      {connectionDialogJsx}
      {numberChangeDialogJsx}
      {repairPhoneDialogJsx}
      
      {/* Instances Management */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Settings2 className="w-5 h-5 shrink-0" />
              Gerenciar Instâncias W-API
            </CardTitle>
            <CardDescription>Configure as instâncias do WhatsApp para cada unidade</CardDescription>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {filteredInstances.length > 0 && (
              <Button 
                variant="outline" 
                onClick={handleSyncAllStatus}
                disabled={isSyncingAll}
                className="flex-1 sm:flex-none"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncingAll ? 'animate-spin' : ''}`} />
                {isSyncingAll ? 'Sincronizando...' : 'Atualizar Status'}
              </Button>
            )}
            {getAvailableUnits().length > 0 && (
              <Button onClick={() => handleOpenDialog()} className="flex-1 sm:flex-none">
                <Plus className="w-4 h-4 mr-2" />
                Nova Instância
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {filteredInstances.length === 0 ? (
            <div className="text-center py-8">
              <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <WifiOff className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Nenhuma instância configurada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure uma instância W-API para cada unidade.
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Configurar Primeira Instância
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInstances.map((instance) => (
                <Card key={instance.id}>
                  <CardContent className="pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-3 rounded-lg shrink-0 ${instance.status === 'connected' ? 'bg-primary/10' : 'bg-muted'}`}>
                          {instance.status === 'connected' ? (
                            <Wifi className="w-5 h-5 text-primary" />
                          ) : (
                            <WifiOff className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold flex items-center gap-2 flex-wrap">
                            <Building2 className="w-4 h-4 shrink-0" />
                            <span>{instance.unit || "Sem unidade"}</span>
                            <Badge variant={instance.status === 'connected' ? 'default' : 'secondary'}>
                              {instance.status === 'connected' ? 'Online' : 'Offline'}
                            </Badge>
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            ID: {instance.instance_id}
                          </p>
                          {instance.phone_number && (
                            <p className="text-sm text-muted-foreground">
                              📞 {instance.phone_number}
                            </p>
                          )}
                          {/* PHASE 4: Degraded instance alert */}
                          {(instance as any)._degradedError && (
                            <div className="mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/30">
                              <p className="text-xs font-medium text-destructive">
                                ⚠️ {(instance as any)._degradedType === 'SESSION_INCOMPLETE' 
                                  ? 'Sessão incompleta — use o botão "Reparar Sessão" para corrigir sem reconectar.'
                                  : 'Comunicação instável com a W-API. Mensagens podem não ser entregues.'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 sm:shrink-0 flex-wrap">
                        {/* Restart button for connected/degraded instances */}
                        {(instance.status === 'connected' || instance.status === 'degraded') && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRestartInstance(instance)}
                            disabled={isRestarting === instance.id}
                            className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-950/20"
                          >
                            {isRestarting === instance.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Reiniciar
                          </Button>
                        )}
                        {/* Repair button for degraded instances */}
                        {(instance.status === 'degraded' || ((instance as any)._degradedType === 'SESSION_INCOMPLETE')) && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRepairSession(instance)}
                            disabled={isRepairing === instance.id}
                            className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950/20"
                          >
                            {isRepairing === instance.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Eraser className="w-4 h-4 mr-2" />
                            )}
                            Reparar Sessão
                          </Button>
                        )}
                        {instance.status !== 'connected' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleOpenQrDialog(instance)}
                          >
                            <QrCode className="w-4 h-4 mr-2" />
                            Conectar
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleRefreshStatus(instance)}
                          disabled={isRefreshing}
                        >
                          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleOpenDialog(instance)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleDeleteInstance(instance)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                      <div className="p-2 bg-muted/50 rounded">
                        <MessageSquare className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs sm:text-sm font-bold">{instance.messages_count || 0}</p>
                        <p className="text-xs text-muted-foreground">Mensagens</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <CreditCard className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs sm:text-sm font-bold">{instance.credits_available || 0}</p>
                        <p className="text-xs text-muted-foreground">Créditos</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <Calendar className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs sm:text-sm font-bold">
                          {instance.addon_valid_until 
                            ? format(new Date(instance.addon_valid_until), "dd/MM/yy", { locale: ptBR })
                            : "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">Válido até</p>
                      </div>
                    </div>

                    {/* Clear non-imported conversations button */}
                    <div className="mt-4 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleClearNonImportedConversations(instance)}
                        disabled={isClearingConversations === instance.id}
                        className="w-full text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-950/20"
                      >
                        {isClearingConversations === instance.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Limpando conversas...
                          </>
                        ) : (
                          <>
                            <Eraser className="w-4 h-4 mr-2" />
                            Limpar conversas não-importadas
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Remove conversas criadas pelo número atual, mantendo as importadas
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhooks Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Configuração de Webhooks
          </CardTitle>
          <CardDescription>
            Use esta URL para configurar os webhooks na W-API (mesma URL para todos os eventos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              value={webhookUrl}
              readOnly
              className="font-mono text-xs bg-muted"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleCopy(webhookUrl, "webhook")}
            >
              {copiedField === "webhook" ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Configure esta URL para: Conectar, Desconectar, Enviar mensagem, Receber mensagem e Status da mensagem.
          </p>
        </CardContent>
      </Card>

      {/* Dialog for adding/editing instance */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingInstance ? "Editar Instância W-API" : "Nova Instância W-API"}
            </DialogTitle>
            <DialogDescription>
              Configure a instância do WhatsApp para uma unidade específica.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            Na W-API, acesse "<strong>Detalhes da instância</strong>" para copiar o ID e o Token.
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unidade *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
                disabled={!!editingInstance}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {(editingInstance ? UNITS : getAvailableUnits()).map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      <span className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {unit.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instanceId">ID da Instância *</Label>
              <Input
                id="instanceId"
                placeholder="Ex: LITE-YGE96V-MKGKLK"
                value={formData.instanceId}
                onChange={(e) => setFormData({ ...formData, instanceId: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instanceToken">Token da Instância *</Label>
              <Input
                id="instanceToken"
                type="password"
                placeholder="Token de autenticação"
                value={formData.instanceToken}
                onChange={(e) => setFormData({ ...formData, instanceToken: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveInstance} disabled={isSaving}>
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  {editingInstance ? "Salvar" : "Criar Instância"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
