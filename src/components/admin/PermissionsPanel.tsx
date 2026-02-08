import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { 
  ClipboardList, Users, Shield, Loader2, Crown, Building2, MapPin, 
  MessageCircle, Settings, BarChart3, Briefcase, Plus, Pencil, Trash2, Save
} from "lucide-react";

interface PermissionsPanelProps {
  targetUserId: string;
  targetUserName: string;
  currentUserId: string;
  onClose?: () => void;
}

interface PermissionPreset {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  permissions: Record<string, boolean>;
  is_default: boolean;
  sort_order: number;
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

const iconOptions: Record<string, React.ElementType> = {
  Crown,
  Building2,
  MapPin,
  Shield,
  Users,
  ClipboardList,
  MessageCircle,
  Settings,
  BarChart3,
  Briefcase,
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
  
  // Presets from database
  const [presets, setPresets] = useState<PermissionPreset[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = useState(true);
  
  // Preset management
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PermissionPreset | null>(null);
  const [presetName, setPresetName] = useState("");
  const [presetDescription, setPresetDescription] = useState("");
  const [presetIcon, setPresetIcon] = useState("Shield");
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [isDeletingPreset, setIsDeletingPreset] = useState<string | null>(null);

  // Fetch presets from database
  useEffect(() => {
    const fetchPresets = async () => {
      setIsLoadingPresets(true);
      const { data, error } = await supabase
        .from('permission_presets')
        .select('*')
        .order('sort_order');

      if (error) {
        console.error('Error fetching presets:', error);
        toast({
          title: "Erro ao carregar presets",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setPresets(data?.map(p => ({
          ...p,
          permissions: p.permissions as Record<string, boolean>
        })) || []);
      }
      setIsLoadingPresets(false);
    };

    fetchPresets();
  }, []);

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

  const applyPreset = async (preset: PermissionPreset) => {
    setIsApplyingPreset(preset.id);

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

  const openCreatePresetDialog = () => {
    setEditingPreset(null);
    setPresetName("");
    setPresetDescription("");
    setPresetIcon("Shield");
    setIsPresetDialogOpen(true);
  };

  const openEditPresetDialog = (preset: PermissionPreset) => {
    setEditingPreset(preset);
    setPresetName(preset.name);
    setPresetDescription(preset.description || "");
    setPresetIcon(preset.icon);
    setIsPresetDialogOpen(true);
  };

  const savePreset = async () => {
    if (!presetName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe um nome para o preset.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingPreset(true);

    try {
      if (editingPreset) {
        // Update existing preset
        const { error } = await supabase
          .from('permission_presets')
          .update({
            name: presetName,
            description: presetDescription || null,
            icon: presetIcon,
            permissions: userPermissions,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPreset.id);

        if (error) throw error;

        setPresets(prev => prev.map(p => 
          p.id === editingPreset.id 
            ? { ...p, name: presetName, description: presetDescription, icon: presetIcon, permissions: userPermissions }
            : p
        ));

        toast({
          title: "Preset atualizado",
          description: `O preset "${presetName}" foi atualizado com as permissões atuais.`,
        });
      } else {
        // Create new preset
        const { data, error } = await supabase
          .from('permission_presets')
          .insert({
            name: presetName,
            description: presetDescription || null,
            icon: presetIcon,
            permissions: userPermissions,
            created_by: currentUserId,
            sort_order: presets.length + 1,
          })
          .select()
          .single();

        if (error) throw error;

        setPresets(prev => [...prev, {
          ...data,
          permissions: data.permissions as Record<string, boolean>
        }]);

        toast({
          title: "Preset criado",
          description: `O preset "${presetName}" foi criado com as permissões atuais.`,
        });
      }

      setIsPresetDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving preset:', error);
      toast({
        title: "Erro ao salvar preset",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPreset(false);
    }
  };

  const deletePreset = async (presetId: string) => {
    setIsDeletingPreset(presetId);

    try {
      const { error } = await supabase
        .from('permission_presets')
        .delete()
        .eq('id', presetId);

      if (error) throw error;

      setPresets(prev => prev.filter(p => p.id !== presetId));

      toast({
        title: "Preset excluído",
        description: "O preset foi removido com sucesso.",
      });
    } catch (error: any) {
      console.error('Error deleting preset:', error);
      toast({
        title: "Erro ao excluir preset",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingPreset(null);
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
  const isLoading = isLoadingDefs || isLoadingPerms || isLoadingPresets;
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5 text-primary" />
                Presets rápidos
              </CardTitle>
              <CardDescription>
                Aplique um conjunto predefinido de permissões
              </CardDescription>
            </div>
            <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={openCreatePresetDialog}>
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Preset
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingPreset ? 'Editar Preset' : 'Criar Novo Preset'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingPreset 
                      ? 'Atualize o preset com as permissões atuais deste usuário.'
                      : 'Crie um novo preset baseado nas permissões atuais deste usuário.'
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="preset-name">Nome do Preset</Label>
                    <Input
                      id="preset-name"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="Ex: Supervisor de Vendas"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preset-description">Descrição</Label>
                    <Textarea
                      id="preset-description"
                      value={presetDescription}
                      onChange={(e) => setPresetDescription(e.target.value)}
                      placeholder="Ex: Acesso intermediário para supervisores"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preset-icon">Ícone</Label>
                    <Select value={presetIcon} onValueChange={setPresetIcon}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(iconOptions).map(([name, Icon]) => (
                          <SelectItem key={name} value={name}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPresetDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={savePreset} disabled={isSavingPreset}>
                    {isSavingPreset ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const PresetIcon = iconOptions[preset.icon] || Shield;
              const isApplying = isApplyingPreset === preset.id;
              const isDeleting = isDeletingPreset === preset.id;
              
              return (
                <div key={preset.id} className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(preset)}
                    disabled={isApplyingPreset !== null || isDeletingPreset !== null}
                    className="gap-2"
                    title={preset.description || undefined}
                  >
                    {isApplying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PresetIcon className="h-4 w-4" />
                    )}
                    {preset.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditPresetDialog(preset)}
                    disabled={isApplyingPreset !== null || isDeletingPreset !== null}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deletePreset(preset.id)}
                    disabled={isApplyingPreset !== null || isDeletingPreset !== null}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              );
            })}
            {presets.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum preset cadastrado.</p>
            )}
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