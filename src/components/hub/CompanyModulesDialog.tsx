import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Company } from "@/types/company";
import { parseModules, CompanyModules, MODULE_LABELS, parsePartyControlModules, PartyControlModules, PARTY_CONTROL_MODULE_LABELS } from "@/hooks/useCompanyModules";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Settings2, Gamepad2, Brain } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";
import { Separator } from "@/components/ui/separator";

interface CompanyModulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  onSuccess?: () => void;
}

export function CompanyModulesDialog({ open, onOpenChange, company, onSuccess }: CompanyModulesDialogProps) {
  const [modules, setModules] = useState<CompanyModules>(parseModules(null));
  const [partyModules, setPartyModules] = useState<PartyControlModules>(parsePartyControlModules(null));
  const [aiEnabled, setAiEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setModules(parseModules(company.settings as Json | null));
      setPartyModules(parsePartyControlModules(company.settings as Json | null));
      const settings = company.settings as Record<string, unknown> | null;
      setAiEnabled(settings?.ai_enabled !== false);
    }
  }, [company]);

  const handleToggle = (key: keyof CompanyModules) => {
    setModules(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePartyToggle = (key: keyof PartyControlModules) => {
    setPartyModules(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!company) return;
    setIsSaving(true);
    try {
      const currentSettings = (company.settings && typeof company.settings === 'object' && !Array.isArray(company.settings))
        ? company.settings as Record<string, Json | undefined>
        : {};

      const newSettings: Record<string, Json | undefined> = {
        ...currentSettings,
        enabled_modules: modules as unknown as Json,
        party_control_modules: partyModules as unknown as Json,
        ai_enabled: aiEnabled as unknown as Json,
      };

      const { error } = await supabase
        .from("companies")
        .update({ settings: newSettings as Json })
        .eq("id", company.id);

      if (error) throw error;

      toast({ title: "Módulos atualizados", description: `Configuração de ${company.name} salva com sucesso.` });
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const moduleKeys = Object.keys(MODULE_LABELS) as (keyof CompanyModules)[];
  const partyModuleKeys = Object.keys(PARTY_CONTROL_MODULE_LABELS) as (keyof PartyControlModules)[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Módulos — {company?.name}
          </DialogTitle>
          <DialogDescription>
            Habilite ou desabilite funcionalidades disponíveis para esta empresa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* System modules */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Módulos do Sistema</p>
          {moduleKeys.map((key) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="space-y-0.5">
                <Label htmlFor={`module-${key}`} className="text-sm font-medium cursor-pointer">
                  {MODULE_LABELS[key].label}
                </Label>
                <p className="text-xs text-muted-foreground">{MODULE_LABELS[key].description}</p>
              </div>
              <Switch
                id={`module-${key}`}
                checked={modules[key]}
                onCheckedChange={() => handleToggle(key)}
              />
            </div>
          ))}

          <Separator className="my-2" />

          {/* AI toggle */}
          <div className="flex items-center gap-2 px-1">
            <Brain className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Inteligência Artificial</p>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="space-y-0.5">
              <Label htmlFor="module-ai" className="text-sm font-medium cursor-pointer">
                IA Ativa
              </Label>
              <p className="text-xs text-muted-foreground">Resumos de leads, qualificação automática e correção de texto</p>
            </div>
            <Switch
              id="module-ai"
              checked={aiEnabled}
              onCheckedChange={setAiEnabled}
            />
          </div>

          <Separator className="my-2" />

          {/* Party control modules */}
          <div className="flex items-center gap-2 px-1">
            <Gamepad2 className="h-3.5 w-3.5 text-blue-500" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Controle da Festa</p>
          </div>
          {partyModuleKeys.map((key) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="space-y-0.5">
                <Label htmlFor={`party-module-${key}`} className="text-sm font-medium cursor-pointer">
                  {PARTY_CONTROL_MODULE_LABELS[key].label}
                </Label>
                <p className="text-xs text-muted-foreground">{PARTY_CONTROL_MODULE_LABELS[key].description}</p>
              </div>
              <Switch
                id={`party-module-${key}`}
                checked={partyModules[key]}
                onCheckedChange={() => handlePartyToggle(key)}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
