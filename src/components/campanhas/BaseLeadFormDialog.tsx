import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BaseLead {
  id: string;
  name: string;
  phone: string;
  is_former_client: boolean;
  former_party_info: string | null;
  month_interest: string | null;
  notes: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  editLead?: BaseLead | null;
  onSaved: () => void;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function BaseLeadFormDialog({ open, onOpenChange, companyId, editLead, onSaved }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isFormerClient, setIsFormerClient] = useState("no");
  const [formerPartyInfo, setFormerPartyInfo] = useState("");
  const [monthInterest, setMonthInterest] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editLead) {
        setName(editLead.name);
        setPhone(formatPhone(editLead.phone));
        setIsFormerClient(editLead.is_former_client ? "yes" : "no");
        setFormerPartyInfo(editLead.former_party_info || "");
        setMonthInterest(editLead.month_interest || "");
        setNotes(editLead.notes || "");
      } else {
        setName("");
        setPhone("");
        setIsFormerClient("no");
        setFormerPartyInfo("");
        setMonthInterest("");
        setNotes("");
      }
    }
  }, [open, editLead]);

  const rawPhone = phone.replace(/\D/g, "");
  const canSave = name.trim().length >= 2 && rawPhone.length >= 10;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const payload = {
        company_id: companyId,
        name: name.trim(),
        phone: rawPhone,
        is_former_client: isFormerClient === "yes",
        former_party_info: isFormerClient === "yes" ? formerPartyInfo.trim() || null : null,
        month_interest: isFormerClient === "no" ? monthInterest || null : null,
        notes: notes.trim() || null,
        created_by: user?.user?.id || null,
      };

      if (editLead) {
        const { error } = await supabase
          .from("base_leads")
          .update(payload)
          .eq("id", editLead.id);
        if (error) throw error;
        toast.success("Contato atualizado!");
      } else {
        const { error } = await supabase
          .from("base_leads")
          .insert(payload);
        if (error) throw error;
        toast.success("Contato adicionado!");
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar contato");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden">
        {/* Header com gradiente sutil */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-primary/5 to-transparent">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">{editLead ? "Editar Contato" : "Adicionar Contato"}</DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              {editLead ? "Edite as informações do contato de base." : "Adicione um contato à sua lista de base para campanhas."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Seção: Dados pessoais */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dados pessoais</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="bl-name" className="text-xs font-semibold text-foreground/80">Nome *</Label>
                <Input
                  id="bl-name"
                  placeholder="Nome do contato"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="rounded-xl h-11 border-border/60 focus:border-primary/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bl-phone" className="text-xs font-semibold text-foreground/80">Telefone/WhatsApp *</Label>
                <Input
                  id="bl-phone"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  className="rounded-xl h-11 border-border/60 focus:border-primary/40"
                />
              </div>
            </div>
          </div>

          {/* Seção: Histórico */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Histórico</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>
            <div className="space-y-3.5">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground/80">Já foi cliente?</Label>
                <RadioGroup value={isFormerClient} onValueChange={setIsFormerClient} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="yes" id="bl-yes" />
                    <Label htmlFor="bl-yes" className="font-normal cursor-pointer text-sm">Sim</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="no" id="bl-no" />
                    <Label htmlFor="bl-no" className="font-normal cursor-pointer text-sm">Não</Label>
                  </div>
                </RadioGroup>
              </div>

              {isFormerClient === "yes" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="bl-party" className="text-xs font-semibold text-foreground/80">Quando foi a festa?</Label>
                  <Input
                    id="bl-party"
                    placeholder="Ex: Março 2024"
                    value={formerPartyInfo}
                    onChange={(e) => setFormerPartyInfo(e.target.value)}
                    maxLength={100}
                    className="rounded-xl h-11 border-border/60 focus:border-primary/40"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground/80">Mês de interesse</Label>
                  <Select value={monthInterest} onValueChange={setMonthInterest}>
                    <SelectTrigger className="rounded-xl h-11 border-border/60">
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="bl-notes" className="text-xs font-semibold text-foreground/80">Observações</Label>
            <Textarea
              id="bl-notes"
              placeholder="Anotações sobre o contato..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={2}
              className="rounded-xl border-border/60 focus:border-primary/40 resize-none"
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-border/30">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl px-5">Cancelar</Button>
            <Button onClick={handleSave} disabled={!canSave || saving} className="rounded-xl px-6 shadow-md shadow-primary/20">
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {editLead ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
