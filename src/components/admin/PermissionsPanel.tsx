import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ClipboardList, Users, Shield, Loader2, Crown, Building2, MapPin, MessageCircle, Settings, BarChart3, Briefcase } from "lucide-react";

interface PermissionsPanelProps {
  targetUserId: string;
  targetUserName: string;
  currentUserId: string;
  onClose?: () => void;
}

const categoryIcons: Record<string, React.ElementType> = {
  Leads: ClipboardList,
  Usuários: Users,
  Sistema: Shield,
  WhatsApp: MessageCircle,
  Configurações: Settings,
  Dashboard: BarChart3,
  B2B: Briefcase,
};

// Permission presets
const PERMISSION_PRESETS = {
  admin: {
    name: "Admin (Tudo)",
    icon: Crown,
    description: "Acesso total ao sistema",
    permissions: {
      // Leads
      'leads.view': true,
      'leads.edit': true,
      'leads.edit.name': true,
      'leads.edit.description': true,
      'leads.delete': true,
      'leads.export': true,
      'leads.assign': true,
      'leads.unit.all': true,
      'leads.unit.manchester': true,
      'leads.unit.trujillo': true,
      // Usuários
      'users.view': true,
      'users.manage': true,
      // Sistema
      'permissions.manage': true,
      'b2b.view': true,
      // WhatsApp
      'whatsapp.view': true,
      'whatsapp.send': true,
      'whatsapp.materials': true,
      'whatsapp.audio': true,
      'whatsapp.close': true,
      'whatsapp.favorite': true,
      'whatsapp.bot.toggle': true,
      'whatsapp.share.group': true,
      // Configurações
      'config.view': true,
      'config.bot': true,
      'config.templates': true,
      'config.materials': true,
      'config.vip': true,
      'config.connection': true,
      // Dashboard
      'dashboard.view': true,
      'dashboard.metrics': true,
      // B2B
      'b2b.proposals.create': true,
      'b2b.proposals.edit': true,
      'b2b.leads.manage': true,
    },
  },
  comercialManchester: {
    name: "Comercial Manchester",
    icon: Building2,
    description: "Acesso comercial à unidade Manchester",
    permissions: {
      // Leads
      'leads.view': true,
      'leads.edit': true,
      'leads.edit.name': false,
      'leads.edit.description': true,
      'leads.delete': false,
      'leads.export': true,
      'leads.assign': false,
      'leads.unit.all': false,
      'leads.unit.manchester': true,
      'leads.unit.trujillo': false,
      // Usuários
      'users.view': false,
      'users.manage': false,
      // Sistema
      'permissions.manage': false,
      'b2b.view': false,
      // WhatsApp
      'whatsapp.view': true,
      'whatsapp.send': true,
      'whatsapp.materials': true,
      'whatsapp.audio': true,
      'whatsapp.close': true,
      'whatsapp.favorite': true,
      'whatsapp.bot.toggle': false,
      'whatsapp.share.group': true,
      // Configurações
      'config.view': false,
      'config.bot': false,
      'config.templates': false,
      'config.materials': false,
      'config.vip': false,
      'config.connection': false,
      // Dashboard
      'dashboard.view': true,
      'dashboard.metrics': false,
      // B2B
      'b2b.proposals.create': false,
      'b2b.proposals.edit': false,
      'b2b.leads.manage': false,
    },
  },
  comercialTrujillo: {
    name: "Comercial Trujillo",
    icon: MapPin,
    description: "Acesso comercial à unidade Trujillo",
    permissions: {
      // Leads
      'leads.view': true,
      'leads.edit': true,
      'leads.edit.name': false,
      'leads.edit.description': true,
      'leads.delete': false,
      'leads.export': true,
      'leads.assign': false,
      'leads.unit.all': false,
      'leads.unit.manchester': false,
      'leads.unit.trujillo': true,
      // Usuários
      'users.view': false,
      'users.manage': false,
      // Sistema
      'permissions.manage': false,
      'b2b.view': false,
      // WhatsApp
      'whatsapp.view': true,
      'whatsapp.send': true,
      'whatsapp.materials': true,
      'whatsapp.audio': true,
      'whatsapp.close': true,
      'whatsapp.favorite': true,
      'whatsapp.bot.toggle': false,
      'whatsapp.share.group': true,
      // Configurações
      'config.view': false,
      'config.bot': false,
      'config.templates': false,
      'config.materials': false,
      'config.vip': false,
      'config.connection': false,
      // Dashboard
      'dashboard.view': true,
      'dashboard.metrics': false,
      // B2B
      'b2b.proposals.create': false,
      'b2b.proposals.edit': false,
      'b2b.leads.manage': false,
    },
  },
};

export function PermissionsPanel({
  targetUserId,
  targetUserName,
  currentUserId,
  onClose,
}: PermissionsPanelProps) {
  const { definitions, isLoading: isLoadingDefs, getPermissionsByCategory } = usePermissions(currentUserId);
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const [isLoadingPerms, setIsLoadingPerms] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isApplyingPreset, setIsApplyingPreset] = useState<string | null>(null);

  // Fetch target user's permissions
  useEffect(() => {
    const fetchUserPermissions = async () => {
      setIsLoadingPerms(true);
      
      const { data, error } = await supabase
        .from('user_permissions')
        .select('permission, granted')
        .eq('user_id', targetUserId);

      if (error) {
        console.error('Error fetching user permissions:', error);
        toast({
          title: "Erro ao carregar permissões",
          description: error.message,
          variant: "destructive",
        });
      } else {
        const permsMap: Record<string, boolean> = {};
        data?.forEach((p) => {
          permsMap[p.permission] = p.granted;
        });
        setUserPermissions(permsMap);
      }
      
      setIsLoadingPerms(false);
    };

    if (targetUserId) {
      fetchUserPermissions();
    }
  }, [targetUserId]);

  const handleTogglePermission = async (permissionCode: string, granted: boolean) => {
    setIsSaving(permissionCode);

    try {
      const { data: existing } = await supabase
        .from('user_permissions')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('permission', permissionCode)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_permissions')
          .update({ 
            granted, 
            granted_by: currentUserId,
            updated_at: new Date().toISOString() 
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_permissions')
          .insert({
            user_id: targetUserId,
            permission: permissionCode,
            granted,
            granted_by: currentUserId,
          });

        if (error) throw error;
      }

      setUserPermissions((prev) => ({
        ...prev,
        [permissionCode]: granted,
      }));

      toast({
        title: granted ? "Permissão concedida" : "Permissão revogada",
        description: `A permissão foi ${granted ? 'ativada' : 'desativada'} para ${targetUserName}.`,
      });
    } catch (error: any) {
      console.error('Error updating permission:', error);
      toast({
        title: "Erro ao atualizar permissão",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(null);
    }
  };

  const applyPreset = async (presetKey: keyof typeof PERMISSION_PRESETS) => {
    const preset = PERMISSION_PRESETS[presetKey];
    setIsApplyingPreset(presetKey);

    try {
      for (const [permissionCode, granted] of Object.entries(preset.permissions)) {
        const { data: existing } = await supabase
          .from('user_permissions')
          .select('id')
          .eq('user_id', targetUserId)
          .eq('permission', permissionCode)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('user_permissions')
            .update({ 
              granted, 
              granted_by: currentUserId,
              updated_at: new Date().toISOString() 
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('user_permissions')
            .insert({
              user_id: targetUserId,
              permission: permissionCode,
              granted,
              granted_by: currentUserId,
            });
        }
      }

      setUserPermissions((prev) => ({
        ...prev,
        ...preset.permissions,
      }));

      toast({
        title: "Preset aplicado",
        description: `O preset "${preset.name}" foi aplicado para ${targetUserName}.`,
      });
    } catch (error: any) {
      console.error('Error applying preset:', error);
      toast({
        title: "Erro ao aplicar preset",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsApplyingPreset(null);
    }
  };

  // Determine which units the user can view
  const getVisibleUnits = () => {
    const units: string[] = [];
    if (userPermissions['leads.unit.all']) {
      return ['Todas as unidades'];
    }
    if (userPermissions['leads.unit.manchester']) {
      units.push('Manchester');
    }
    if (userPermissions['leads.unit.trujillo']) {
      units.push('Trujillo');
    }
    return units.length > 0 ? units : ['Nenhuma unidade'];
  };

  const permissionsByCategory = getPermissionsByCategory();
  const isLoading = isLoadingDefs || isLoadingPerms;
  const visibleUnits = getVisibleUnits();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Permissões de {targetUserName}</h3>
        <p className="text-sm text-muted-foreground">
          Ative ou desative as permissões específicas para este usuário.
        </p>
      </div>

      {/* Unit visibility indicator */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-primary" />
            Unidades visíveis
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {visibleUnits.map((unit) => (
              <Badge 
                key={unit} 
                variant={unit === 'Nenhuma unidade' ? 'destructive' : 'default'}
                className={unit === 'Todas as unidades' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {unit}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preset buttons */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-primary" />
            Presets rápidos
          </CardTitle>
          <CardDescription>
            Aplique um conjunto predefinido de permissões
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => {
              const PresetIcon = preset.icon;
              const isApplying = isApplyingPreset === key;
              
              return (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(key as keyof typeof PERMISSION_PRESETS)}
                  disabled={isApplyingPreset !== null}
                  className="gap-2"
                >
                  {isApplying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PresetIcon className="h-4 w-4" />
                  )}
                  {preset.name}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {Object.entries(permissionsByCategory).map(([category, perms]) => {
        const Icon = categoryIcons[category] || Shield;
        
        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="h-5 w-5 text-primary" />
                {category}
              </CardTitle>
              <CardDescription>
                Permissões relacionadas a {category.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {perms.map((perm) => {
                const isGranted = userPermissions[perm.code] ?? false;
                const isSavingThis = isSaving === perm.code;
                
                return (
                  <div
                    key={perm.id}
                    className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={`perm-${perm.code}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {perm.name}
                      </Label>
                      {perm.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {perm.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {isSavingThis && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      <Switch
                        id={`perm-${perm.code}`}
                        checked={isGranted}
                        onCheckedChange={(checked) => handleTogglePermission(perm.code, checked)}
                        disabled={isSavingThis}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {Object.keys(permissionsByCategory).length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nenhuma permissão disponível.</p>
        </div>
      )}
    </div>
  );
}
