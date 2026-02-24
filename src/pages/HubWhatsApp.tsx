import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HubLayout } from "@/components/hub/HubLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Smartphone, Wifi, WifiOff, RefreshCw, Plus, Building2,
  Phone, MessageSquare, Loader2, BarChart3, QrCode, Power, Pencil, Check, X
} from "lucide-react";
import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection";
import { ConnectionDialog } from "@/components/whatsapp/ConnectionDialog";

interface HubInstance {
  id: string;
  instance_id: string;
  instance_token: string;
  status: string | null;
  phone_number: string | null;
  connected_at: string | null;
  unit: string | null;
  company_id: string;
  company_name?: string;
  messages_count: number | null;
  credits_available: number | null;
}

interface ChildCompany {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function HubWhatsApp() {
  return (
    <HubLayout
      currentPage="whatsapp"
      header={
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            WhatsApp — Instâncias
          </h1>
          <p className="text-xs text-muted-foreground">Monitoramento centralizado de todas as instâncias</p>
        </div>
      }
    >
      {({ user }) => <HubWhatsAppContent userId={user.id} />}
    </HubLayout>
  );
}

function HubWhatsAppContent({ userId }: { userId: string }) {
  const [instances, setInstances] = useState<HubInstance[]>([]);
  const [childCompanies, setChildCompanies] = useState<ChildCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    instanceId: "",
    instanceToken: "",
    unit: "",
    companyId: "",
  });

  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const connection = useWhatsAppConnection(() => fetchData());

  const handleRename = async (inst: HubInstance) => {
    const newName = renameValue.trim();
    if (!newName) return;
    try {
      const { error } = await supabase.from("wapi_instances").update({ unit: newName }).eq("id", inst.id);
      if (error) throw error;
      toast({ title: "Nome atualizado" });
      setRenamingId(null);
      fetchData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDisconnect = async (inst: HubInstance) => {
    if (!confirm(`Deseja desconectar o WhatsApp da unidade ${inst.unit}?`)) return;
    setDisconnectingId(inst.id);
    try {
      const res = await supabase.functions.invoke("wapi-send", {
        body: {
          action: "disconnect",
          instanceId: inst.instance_id,
          instanceToken: inst.instance_token,
        },
      });
      if (res.data?.success) {
        const msg = res.data?.forced 
          ? `Instância ${inst.unit} desconectada localmente. Reconecte com o novo número.`
          : `Instância ${inst.unit} desconectada com sucesso.`;
        toast({ title: "Desconectado", description: msg });
        fetchData();
      } else {
        toast({ title: "Erro", description: res.data?.error || "Não foi possível desconectar.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao desconectar.", variant: "destructive" });
    }
    setDisconnectingId(null);
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all companies to identify children
      const { data: companies } = await supabase
        .from("companies")
        .select("id, name, logo_url, parent_id")
        .order("name");

      if (!companies) return;

      const children = companies.filter(c => c.parent_id !== null);
      setChildCompanies(children.map(c => ({ id: c.id, name: c.name, logo_url: c.logo_url })));

      const childIds = children.map(c => c.id);
      if (childIds.length === 0) {
        setInstances([]);
        setIsLoading(false);
        return;
      }

      // Fetch all instances from child companies
      const { data: instancesData } = await supabase
        .from("wapi_instances")
        .select("*")
        .in("company_id", childIds)
        .order("unit");

      if (instancesData) {
        const companyMap = Object.fromEntries(children.map(c => [c.id, c.name]));
        setInstances(
          instancesData.map(inst => ({
            ...inst,
            company_name: companyMap[inst.company_id] || "Desconhecida",
            messages_count: inst.messages_count ?? 0,
            credits_available: inst.credits_available ?? 0,
          })) as HubInstance[]
        );
      }
    } catch (err) {
      console.error("Error fetching hub instances:", err);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const syncAllStatuses = async () => {
    if (instances.length === 0) return;
    setIsSyncing(true);

    try {
      let degradedCount = 0;
      const updates = await Promise.all(
        instances.map(async (inst) => {
          try {
            const res = await supabase.functions.invoke("wapi-send", {
              body: {
                action: "get-status",
                instanceId: inst.instance_id,
                instanceToken: inst.instance_token,
              },
            });
            const wapiStatus = res.data?.status;
            const wapiPhone = res.data?.phoneNumber || res.data?.phone;
            const errorType = res.data?.errorType;

            // DEGRADED/TIMEOUT: keep previous status, don't update DB
            if (wapiStatus === 'degraded' || errorType === 'TIMEOUT_OR_GATEWAY') {
              degradedCount++;
              return inst;
            }

            if (wapiStatus && wapiStatus !== inst.status) {
              const updateData: Record<string, unknown> = { status: wapiStatus };
              if (wapiStatus === "connected" && wapiPhone) {
                updateData.phone_number = wapiPhone;
                updateData.connected_at = new Date().toISOString();
              } else if (wapiStatus === "disconnected" || wapiStatus === "instance_not_found") {
                updateData.connected_at = null;
              }
              await supabase.from("wapi_instances").update(updateData).eq("id", inst.id);
              return { ...inst, ...updateData } as HubInstance;
            }
            return inst;
          } catch {
            return inst;
          }
        })
      );
      setInstances(updates);
      const desc = degradedCount > 0 
        ? `Sincronizado. ${degradedCount} instância(s) com W-API instável (status mantido).`
        : "Todas as instâncias foram sincronizadas.";
      toast({ title: "Status atualizado", description: desc });
    } catch (err) {
      console.error("Sync error:", err);
    }
    setIsSyncing(false);
  };

  const handleCreate = async () => {
    if (!formData.instanceId || !formData.instanceToken || !formData.unit || !formData.companyId) {
      toast({ title: "Erro", description: "Preencha todos os campos.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("wapi_instances").insert({
        user_id: userId,
        instance_id: formData.instanceId,
        instance_token: formData.instanceToken,
        unit: formData.unit,
        company_id: formData.companyId,
        status: "disconnected",
      });

      if (error) throw error;

      // Configure webhooks
      const webhookUrl = `https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/wapi-webhook`;
      await supabase.functions.invoke("wapi-send", {
        body: {
          action: "configure-webhooks",
          webhookUrl,
          instanceId: formData.instanceId,
          instanceToken: formData.instanceToken,
        },
      });

      toast({ title: "Instância criada", description: `Instância ${formData.unit} criada com sucesso.` });
      setIsCreateOpen(false);
      setFormData({ instanceId: "", instanceToken: "", unit: "", companyId: "" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao criar instância.", variant: "destructive" });
    }
    setIsSaving(false);
  };

  const getStatusBadge = (status: string | null) => {
    if (status === "connected") {
      return <Badge className="bg-primary/15 text-primary border-primary/30 gap-1"><Wifi className="h-3 w-3" /> Conectado</Badge>;
    }
    return <Badge variant="secondary" className="gap-1 text-muted-foreground"><WifiOff className="h-3 w-3" /> Desconectado</Badge>;
  };

  const connectedCount = instances.filter(i => i.status === "connected").length;
  const totalCount = instances.length;

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Smartphone className="h-4 w-4" />
            <span><strong className="text-foreground">{totalCount}</strong> instância{totalCount !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Wifi className="h-4 w-4 text-primary" />
            <span className="text-primary font-medium">{connectedCount} conectada{connectedCount !== 1 ? "s" : ""}</span>
          </div>
          {totalCount - connectedCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <WifiOff className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{totalCount - connectedCount} offline</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={syncAllStatuses} disabled={isSyncing || totalCount === 0}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Instância
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : totalCount === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Smartphone className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground mb-1">Nenhuma instância encontrada</p>
            <p className="text-xs text-muted-foreground">Crie uma instância para começar a gerenciar o WhatsApp das filhas.</p>
          </CardContent>
        </Card>
      ) : (
        /* Instance cards grouped by company */
        <div className="space-y-6">
          {childCompanies.map(company => {
            const companyInstances = instances.filter(i => i.company_id === company.id);
            if (companyInstances.length === 0) return null;

            return (
              <div key={company.id}>
                <div className="flex items-center gap-2 mb-3">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt={company.name} className="h-6 w-6 rounded object-contain bg-muted" />
                  ) : (
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  )}
                  <h3 className="font-semibold text-sm text-foreground">{company.name}</h3>
                  <Badge variant="outline" className="text-xs">{companyInstances.length} instância{companyInstances.length !== 1 ? "s" : ""}</Badge>
                </div>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {companyInstances.map(inst => (
                    <Card key={inst.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            {renamingId === inst.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  className="h-7 text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleRename(inst);
                                    if (e.key === "Escape") setRenamingId(null);
                                  }}
                                />
                                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleRename(inst)}><Check className="h-3.5 w-3.5" /></Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setRenamingId(null)}><X className="h-3.5 w-3.5" /></Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 group">
                                <p className="font-semibold text-foreground truncate">{inst.unit || "Sem unidade"}</p>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                  onClick={() => { setRenamingId(inst.id); setRenameValue(inst.unit || ""); }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground truncate">{inst.instance_id}</p>
                          </div>
                          {getStatusBadge(inst.status)}
                        </div>

                        {inst.phone_number && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{inst.phone_number}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {inst.messages_count || 0} msgs
                            </span>
                            <span className="flex items-center gap-1">
                              <BarChart3 className="h-3 w-3" />
                              {inst.credits_available || 0} créditos
                            </span>
                          </div>
                          {inst.status !== "connected" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => connection.openDialog(inst)}
                            >
                              <QrCode className="h-3.5 w-3.5 mr-1.5" />
                              Conectar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDisconnect(inst)}
                              disabled={disconnectingId === inst.id}
                            >
                              {disconnectingId === inst.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Power className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connection Dialog */}
      <ConnectionDialog
        open={connection.qrDialogOpen}
        onOpenChange={() => {}}
        instance={connection.qrInstance}
        qrCode={connection.qrCode}
        qrLoading={connection.qrLoading}
        connectionMode={connection.connectionMode}
        phoneNumber={connection.phoneNumber}
        pairingCode={connection.pairingCode}
        isPairingLoading={connection.isPairingLoading}
        onClose={connection.closeDialog}
        onSetConnectionMode={connection.setConnectionMode}
        onSetPhoneNumber={connection.setPhoneNumber}
        onRequestPairingCode={connection.requestPairingCode}
        onRetryQr={() => connection.qrInstance && connection.fetchQrCode(connection.qrInstance)}
      />

      {/* Create Instance Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Instância WhatsApp</DialogTitle>
            <DialogDescription>
              Crie uma instância e atribua a uma empresa filha.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Empresa *</Label>
              <Select value={formData.companyId} onValueChange={(v) => setFormData(prev => ({ ...prev, companyId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {childCompanies.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Unidade *</Label>
              <Input
                placeholder="Ex: Manchester"
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
              />
            </div>

            <div>
              <Label>Instance ID *</Label>
              <Input
                placeholder="ID da instância na W-API"
                value={formData.instanceId}
                onChange={(e) => setFormData(prev => ({ ...prev, instanceId: e.target.value }))}
              />
            </div>

            <div>
              <Label>Instance Token *</Label>
              <Input
                placeholder="Token da instância"
                value={formData.instanceToken}
                onChange={(e) => setFormData(prev => ({ ...prev, instanceToken: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
              Criar Instância
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
