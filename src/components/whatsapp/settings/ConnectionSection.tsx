import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  Trash2, QrCode, Loader2, Phone, Smartphone 
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
}

interface ConnectionSectionProps {
  userId: string;
  isAdmin: boolean;
}

const UNITS = [
  { value: "Manchester", label: "Manchester" },
  { value: "Trujillo", label: "Trujillo" },
];

const webhookUrl = `https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/wapi-webhook`;

export function ConnectionSection({ userId, isAdmin }: ConnectionSectionProps) {
  const [instances, setInstances] = useState<WapiInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editingInstance, setEditingInstance] = useState<WapiInstance | null>(null);
  
  // QR Code states
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrInstance, setQrInstance] = useState<WapiInstance | null>(null);
  const [qrPolling, setQrPolling] = useState(false);

  // Phone pairing states
  const [connectionMode, setConnectionMode] = useState<'qr' | 'phone'>('qr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isPairingLoading, setIsPairingLoading] = useState(false);

  const [formData, setFormData] = useState({
    instanceId: "",
    instanceToken: "",
    unit: "",
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

          if (wapiStatus && wapiStatus !== instance.status) {
            const updateData: Record<string, unknown> = { status: wapiStatus };
            
            if (wapiStatus === 'connected' && wapiPhone) {
              updateData.phone_number = wapiPhone;
              updateData.connected_at = new Date().toISOString();
            } else if (wapiStatus === 'disconnected') {
              updateData.connected_at = null;
            }

            await supabase
              .from("wapi_instances")
              .update(updateData)
              .eq("id", instance.id);

            return { ...instance, ...updateData } as WapiInstance;
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
        const { error } = await supabase
          .from("wapi_instances")
          .insert({
            user_id: userId,
            instance_id: formData.instanceId,
            instance_token: formData.instanceToken,
            unit: formData.unit,
            status: "disconnected",
          });

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
    if (!confirm(`Tem certeza que deseja excluir a instância da unidade ${instance.unit}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("wapi_instances")
        .delete()
        .eq("id", instance.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Instância excluída com sucesso.",
      });

      fetchInstances();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir instância.",
        variant: "destructive",
      });
    }
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

      if (response.data?.status) {
        await supabase
          .from("wapi_instances")
          .update({ 
            status: response.data.status,
            phone_number: response.data.phoneNumber || null,
            connected_at: response.data.status === 'connected' ? new Date().toISOString() : null,
          })
          .eq("id", instance.id);
      }

      await fetchInstances();

      toast({
        title: "Status atualizado",
        description: `Instância ${instance.unit}: ${response.data?.status || 'verificado'}`,
      });
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

          if (response.data?.status) {
            const updateData: Record<string, unknown> = { status: response.data.status };
            
            if (response.data.status === 'connected') {
              updateData.phone_number = response.data.phoneNumber || response.data.phone || instance.phone_number;
              if (!instance.connected_at) {
                updateData.connected_at = new Date().toISOString();
              }
            } else if (response.data.status === 'disconnected') {
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

      toast({
        title: "Sincronização concluída",
        description: `${successCount} instância(s) sincronizada(s)${errorCount > 0 ? `, ${errorCount} erro(s)` : ''}.`,
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
      const response = await supabase.functions.invoke("wapi-send", {
        body: { 
          action: "get-qr",
          instanceId: instance.instance_id,
          instanceToken: instance.instance_token,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
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
      toast({
        title: "Erro",
        description: error.message || "Erro ao obter QR Code.",
        variant: "destructive",
      });
    }

    setQrLoading(false);
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
        
        const { error: updateError } = await supabase
          .from("wapi_instances")
          .update({ 
            status: 'connected',
            phone_number: response.data.phoneNumber || null,
            connected_at: new Date().toISOString(),
          })
          .eq("id", instance.id);

        if (updateError) {
          console.error("Error updating instance:", updateError);
        }

        setQrPolling(false);
        setQrDialogOpen(false);
        toast({
          title: "Conectado!",
          description: `WhatsApp da unidade ${instance.unit} conectado com sucesso!`,
        });
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
    if (!qrInstance || !phoneNumber) {
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
          phoneNumber: phoneNumber,
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
    }, 30000);

    return () => clearInterval(interval);
  }, [qrDialogOpen, qrInstance, qrPolling, connectionMode, fetchQrCode]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const ConnectionDialog = () => (
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
                <Input
                  type="tel"
                  inputMode="tel"
                  pattern="[0-9]*"
                  placeholder="11999999999"
                  value={phoneNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setPhoneNumber(value);
                  }}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 text-base min-w-0"
                  maxLength={11}
                  autoComplete="tel-national"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
              </div>
              
              <Button 
                onClick={handleRequestPairingCode}
                disabled={isPairingLoading || phoneNumber.length < 10}
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
        <ConnectionDialog />
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
            {instances.length > 0 && (
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
            {instances.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma instância configurada pelo administrador.
              </p>
            ) : (
              instances.map((instance) => (
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
      <ConnectionDialog />
      
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
            {instances.length > 0 && (
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
          {instances.length === 0 ? (
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
              {instances.map((instance) => (
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
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 sm:shrink-0">
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
