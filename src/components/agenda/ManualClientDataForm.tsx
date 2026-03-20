import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, User, CreditCard, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ClientFormData {
  nome: string;
  cpf: string;
  rg: string;
  nascimento: string;
  email: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

const EMPTY_FORM: ClientFormData = {
  nome: "", cpf: "", rg: "", nascimento: "", email: "",
  cep: "", endereco: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
};

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

interface ManualClientDataFormProps {
  eventId: string;
  companyId: string;
  leadId?: string | null;
  initialClientData?: any;
  requestId?: string;
  onSaved: (request: { id: string; token: string; status: string; client_data: any; completed_at: string | null }) => void;
  onCancel: () => void;
}

export function ManualClientDataForm({ eventId, companyId, leadId, initialClientData, requestId, onSaved, onCancel }: ManualClientDataFormProps) {
  const [formData, setFormData] = useState<ClientFormData>(() => {
    if (initialClientData) {
      return { ...EMPTY_FORM, ...initialClientData };
    }
    return EMPTY_FORM;
  });
  const [saving, setSaving] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

  const updateField = (field: keyof ClientFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCepBlur = async () => {
    const cepDigits = formData.cep.replace(/\D/g, "");
    if (cepDigits.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro || prev.endereco,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
      }
    } catch { /* ignore */ }
    setLoadingCep(false);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast({ title: "Preencha ao menos o nome do contratante", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (requestId) {
        // Update existing request
        const { error } = await (supabase as any)
          .from("client_data_requests")
          .update({
            client_data: formData,
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", requestId);
        if (error) throw error;

        onSaved({
          id: requestId,
          token: "",
          status: "completed",
          client_data: formData,
          completed_at: new Date().toISOString(),
        });
      } else {
        // Create new request with data already filled
        const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
        const { data, error } = await (supabase as any)
          .from("client_data_requests")
          .insert([{
            company_id: companyId,
            event_id: eventId,
            lead_id: leadId || null,
            token,
            status: "completed",
            sent_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            client_data: formData,
          }])
          .select("id, token, status, client_data, completed_at")
          .single();
        if (error) throw error;
        onSaved(data as any);
      }
      toast({ title: "Dados do contratante salvos!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {/* Identificação */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <User className="h-3.5 w-3.5" />
          Identificação
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nome completo *</Label>
            <Input value={formData.nome} onChange={e => updateField("nome", e.target.value)} placeholder="Nome do contratante" className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">E-mail</Label>
            <Input value={formData.email} onChange={e => updateField("email", e.target.value)} placeholder="email@exemplo.com" type="email" className="h-9 text-sm" />
          </div>
        </div>
      </div>

      {/* Documentos */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <CreditCard className="h-3.5 w-3.5" />
          Documentos
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">CPF</Label>
            <Input value={formData.cpf} onChange={e => updateField("cpf", formatCPF(e.target.value))} placeholder="000.000.000-00" className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">RG</Label>
            <Input value={formData.rg} onChange={e => updateField("rg", e.target.value)} placeholder="RG" className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nascimento</Label>
            <Input value={formData.nascimento} onChange={e => updateField("nascimento", e.target.value)} placeholder="DD/MM/AAAA" className="h-9 text-sm" />
          </div>
        </div>
      </div>

      {/* Endereço */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <MapPin className="h-3.5 w-3.5" />
          Endereço
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">CEP</Label>
            <Input
              value={formData.cep}
              onChange={e => updateField("cep", formatCEP(e.target.value))}
              onBlur={handleCepBlur}
              placeholder="00000-000"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs text-muted-foreground">Endereço</Label>
            <Input value={formData.endereco} onChange={e => updateField("endereco", e.target.value)} placeholder="Rua, Avenida..." className="h-9 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Número</Label>
            <Input value={formData.numero} onChange={e => updateField("numero", e.target.value)} placeholder="Nº" className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Complemento</Label>
            <Input value={formData.complemento} onChange={e => updateField("complemento", e.target.value)} placeholder="Apto, Bloco..." className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bairro</Label>
            <Input value={formData.bairro} onChange={e => updateField("bairro", e.target.value)} placeholder="Bairro" className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Cidade/UF</Label>
            <div className="flex gap-1.5">
              <Input value={formData.cidade} onChange={e => updateField("cidade", e.target.value)} placeholder="Cidade" className="h-9 text-sm flex-1" />
              <Input value={formData.estado} onChange={e => updateField("estado", e.target.value.toUpperCase().slice(0, 2))} placeholder="UF" className="h-9 text-sm w-14" />
            </div>
          </div>
        </div>
      </div>

      {loadingCep && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Buscando endereço...
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Salvar dados
        </Button>
      </div>
    </div>
  );
}
