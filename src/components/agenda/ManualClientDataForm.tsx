import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, CreditCard, MapPin, Baby, Plus, Trash2, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BirthdayChild {
  name: string;
  age: string;
  birthdate: string;
}

interface Responsible {
  name: string;
  phone: string;
  relation: string;
}

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
  birthday_children: BirthdayChild[];
  responsaveis: Responsible[];
}

const EMPTY_FORM: ClientFormData = {
  nome: "", cpf: "", rg: "", nascimento: "", email: "",
  cep: "", endereco: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
  birthday_children: [{ name: "", age: "", birthdate: "" }],
  responsaveis: [{ name: "", phone: "", relation: "" }, { name: "", phone: "", relation: "" }],
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

// Normalize date from DD/MM/YYYY or raw digits to YYYY-MM-DD for input[type=date]
function normalizeDateToISO(value: string | undefined | null): string {
  if (!value) return "";
  const v = value.trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [d, m, y] = v.split("/");
    return `${y}-${m}-${d}`;
  }
  // Raw digits DDMMYYYY
  if (/^\d{8}$/.test(v)) {
    return `${v.slice(4, 8)}-${v.slice(2, 4)}-${v.slice(0, 2)}`;
  }
  return v;
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

export function ManualClientDataForm({ eventId, companyId, leadId, initialClientData, requestId, onSaved, onCancel: _onCancel }: ManualClientDataFormProps) {
  const [formData, setFormData] = useState<ClientFormData>(() => {
    if (initialClientData) {
      return {
        ...EMPTY_FORM,
        ...initialClientData,
        nascimento: normalizeDateToISO(initialClientData.nascimento),
        birthday_children: initialClientData.birthday_children?.length
          ? initialClientData.birthday_children
          : EMPTY_FORM.birthday_children,
        responsaveis: initialClientData.responsaveis?.length
          ? initialClientData.responsaveis
          : EMPTY_FORM.responsaveis,
      };
    }
    return EMPTY_FORM;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const updateField = (field: keyof ClientFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateChild = (idx: number, field: keyof BirthdayChild, value: string) => {
    const updated = [...formData.birthday_children];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormData(prev => ({ ...prev, birthday_children: updated }));
  };

  const addChild = () => {
    setFormData(prev => ({ ...prev, birthday_children: [...prev.birthday_children, { name: "", age: "", birthdate: "" }] }));
  };

  const removeChild = (idx: number) => {
    const updated = [...formData.birthday_children];
    updated.splice(idx, 1);
    setFormData(prev => ({ ...prev, birthday_children: updated }));
  };

  const updateResponsible = (idx: number, field: keyof Responsible, value: string) => {
    const updated = [...formData.responsaveis];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormData(prev => ({ ...prev, responsaveis: updated }));
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

  const performSave = useCallback(async (data: ClientFormData) => {
    if (!data.nome.trim()) return;
    setSaving(true);
    setSaved(false);
    try {
      if (requestId) {
        const { error } = await (supabase as any)
          .from("client_data_requests")
          .update({
            client_data: data,
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", requestId);
        if (error) throw error;

        onSaved({
          id: requestId,
          token: "",
          status: "completed",
          client_data: data,
          completed_at: new Date().toISOString(),
        });
      } else {
        const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
        const { data: inserted, error } = await (supabase as any)
          .from("client_data_requests")
          .insert([{
            company_id: companyId,
            event_id: eventId,
            lead_id: leadId || null,
            token,
            status: "completed",
            sent_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            client_data: data,
          }])
          .select("id, token, status, client_data, completed_at")
          .single();
        if (error) throw error;
        onSaved(inserted as any);
      }
      const childrenWithData = data.birthday_children.filter(c => c.name);
      if (childrenWithData.length > 0) {
        await (supabase as any)
          .from("company_events")
          .update({
            birthday_children: childrenWithData,
            child_name: childrenWithData[0]?.name || null,
            child_age: childrenWithData[0]?.age || null,
            child_birthdate: childrenWithData[0]?.birthdate || null,
          })
          .eq("id", eventId);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  }, [requestId, companyId, eventId, leadId, onSaved]);

  // Auto-save with debounce
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSave(formData);
    }, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [formData, performSave]);

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
            <Input type="date" value={formData.nascimento} onChange={e => updateField("nascimento", e.target.value)} className="h-9 text-sm" />
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

      {/* Aniversariante & Responsáveis */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Baby className="h-3.5 w-3.5" />
          Aniversariante
        </div>
        <div className="space-y-3">
          {formData.birthday_children.map((child, idx) => (
            <div key={idx} className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Aniversariante {formData.birthday_children.length > 1 ? idx + 1 : ""}
                </span>
                {formData.birthday_children.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeChild(idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input value={child.name} onChange={e => updateChild(idx, "name", e.target.value)} placeholder="Nome do aniversariante" className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Idade a comemorar</Label>
                  <div className="relative">
                    <Input value={child.age} onChange={e => updateChild(idx, "age", e.target.value.replace(/\D/g, ''))} placeholder="Ex: 5" className="h-9 text-sm pr-14" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">anos</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Data de nascimento</Label>
                  <Input type="date" value={child.birthdate} onChange={e => updateChild(idx, "birthdate", e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="w-full text-xs gap-1.5" onClick={addChild}>
            <Plus className="h-3.5 w-3.5" />
            Adicionar aniversariante
          </Button>
        </div>

        {/* Responsáveis */}
        <div className="space-y-3 mt-3 pt-3 border-t border-border/40">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Responsáveis
          </div>
          {formData.responsaveis.map((r, idx) => (
            <div key={idx} className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{idx + 1}º Responsável</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input value={r.name} onChange={e => updateResponsible(idx, "name", e.target.value)} placeholder="Nome" className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Telefone</Label>
                  <Input value={r.phone} onChange={e => updateResponsible(idx, "phone", e.target.value)} placeholder="Telefone" className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Parentesco</Label>
                  <Select value={r.relation || "none"} onValueChange={v => updateResponsible(idx, "relation", v === "none" ? "" : v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione</SelectItem>
                      <SelectItem value="Mãe">Mãe</SelectItem>
                      <SelectItem value="Pai">Pai</SelectItem>
                      <SelectItem value="Avó">Avó</SelectItem>
                      <SelectItem value="Avô">Avô</SelectItem>
                      <SelectItem value="Tio(a)">Tio(a)</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-save indicator */}
      <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
        {saving && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Salvando...</span>
          </>
        )}
        {saved && !saving && (
          <>
            <Check className="h-3 w-3 text-green-500" />
            <span className="text-green-600">Salvo automaticamente</span>
          </>
        )}
      </div>
    </div>
  );
}
