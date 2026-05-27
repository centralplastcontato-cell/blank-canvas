import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface InstanceVisibilityCardProps {
  targetUserId: string;
  targetUserName: string;
  currentUserId: string;
  targetCompanyId?: string;
}

interface WapiInstance {
  id: string;
  instance_id: string;
  phone_number: string | null;
  unit: string | null;
  status: string | null;
  provider: string | null;
}

const ALL_CODE = "whatsapp.instance.all";
const instanceCode = (id: string) => `whatsapp.instance.${id}`;

export function InstanceVisibilityCard({
  targetUserId,
  targetUserName,
  currentUserId,
  targetCompanyId,
}: InstanceVisibilityCardProps) {
  const [instances, setInstances] = useState<WapiInstance[]>([]);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingCode, setSavingCode] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!targetCompanyId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      const [{ data: inst }, { data: up }] = await Promise.all([
        supabase
          .from("wapi_instances")
          .select("id, instance_id, phone_number, unit, status, provider")
          .eq("company_id", targetCompanyId)
          .eq("is_active", true)
          .order("unit", { ascending: true }),
        supabase
          .from("user_permissions")
          .select("permission, granted")
          .eq("user_id", targetUserId)
          .like("permission", "whatsapp.instance.%"),
      ]);

      const map: Record<string, boolean> = {};
      (up || []).forEach((p) => {
        map[p.permission] = p.granted;
      });

      setInstances((inst as WapiInstance[]) || []);
      setPerms(map);
      setIsLoading(false);
    };
    load();
  }, [targetUserId, targetCompanyId]);

  const canViewAll = perms[ALL_CODE] ?? true; // default = all (não quebra atual)

  const toggle = async (code: string, granted: boolean) => {
    setSavingCode(code);
    try {
      const { data: existing } = await supabase
        .from("user_permissions")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("permission", code)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_permissions")
          .update({
            granted,
            granted_by: currentUserId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_permissions").insert({
          user_id: targetUserId,
          permission: code,
          granted,
          granted_by: currentUserId,
        });
        if (error) throw error;
      }

      setPerms((prev) => ({ ...prev, [code]: granted }));

      toast({
        title: granted ? "Acesso liberado" : "Acesso removido",
        description: `Permissão atualizada para ${targetUserName}.`,
      });
    } catch (err: any) {
      console.error("[InstanceVisibilityCard] toggle error:", err);
      toast({
        title: "Erro ao salvar",
        description: err?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingCode(null);
    }
  };

  if (!targetCompanyId) return null;

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-5 w-5 text-primary" />
          Números de WhatsApp visíveis
        </CardTitle>
        <CardDescription>
          Restrinja quais instâncias este usuário pode ver no Chat, Inteligência
          e no envio de mensagens. Quando "Todas" estiver ativo, ele enxerga
          qualquer número conectado à empresa.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <>
            {/* Toggle global */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
              <div className="flex-1">
                <Label className="text-sm font-semibold">
                  Todas as instâncias
                </Label>
                <p className="text-xs text-muted-foreground">
                  Padrão. Desative para selecionar números específicos abaixo.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {savingCode === ALL_CODE && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <Switch
                  checked={canViewAll}
                  onCheckedChange={(v) => toggle(ALL_CODE, v)}
                  disabled={savingCode !== null}
                />
              </div>
            </div>

            {/* Lista de instâncias */}
            {instances.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Nenhuma instância de WhatsApp cadastrada para esta empresa.
              </p>
            ) : (
              <div className="space-y-2">
                {instances.map((inst) => {
                  const code = instanceCode(inst.id);
                  const granted = canViewAll
                    ? true
                    : perms[code] ?? false;
                  const isConnected = inst.status === "connected";
                  return (
                    <div
                      key={inst.id}
                      className={`flex items-center justify-between rounded-lg border bg-white p-3 transition-opacity ${
                        canViewAll ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">
                            {inst.unit || "Sem unidade"}
                          </span>
                          {inst.provider && (
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {inst.provider}
                            </Badge>
                          )}
                          <Badge
                            variant={isConnected ? "default" : "secondary"}
                            className={
                              isConnected
                                ? "bg-green-600 hover:bg-green-700 text-[10px]"
                                : "text-[10px]"
                            }
                          >
                            {isConnected ? "Conectado" : inst.status || "—"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {inst.phone_number || inst.instance_id}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pl-3">
                        {savingCode === code && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        <Switch
                          checked={granted}
                          disabled={canViewAll || savingCode !== null}
                          onCheckedChange={(v) => toggle(code, v)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
