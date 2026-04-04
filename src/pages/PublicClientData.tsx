import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, User, CreditCard, MapPin, Mail, Calendar, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCPF, isValidCPF } from "@/lib/mask-utils";

interface RequestInfo {
  id: string;
  company_id: string;
  event_id: string;
  status: string;
  company_name: string;
  company_logo: string;
  event_title: string;
  event_date: string;
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
}

const EMPTY_FORM: ClientFormData = {
  nome: "",
  cpf: "",
  rg: "",
  nascimento: "",
  email: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

// formatCPF and isValidCPF imported from @/lib/mask-utils

function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.18em] font-semibold text-muted-foreground mb-4 pb-3 border-b border-border/40">
      <div className="p-1.5 rounded-lg bg-primary/10 ring-1 ring-primary/15">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      {label}
    </div>
  );
}

export default function PublicClientData() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [requestInfo, setRequestInfo] = useState<RequestInfo | null>(null);
  const [form, setForm] = useState<ClientFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [cpfError, setCpfError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const fetchRequest = async () => {
      const { data, error } = await supabase.rpc("get_client_data_request_by_token", { _token: token });
      if (error || !data || (data as any[]).length === 0) {
        setError("Link inválido ou expirado.");
        setLoading(false);
        return;
      }
      const info = (data as any[])[0] as RequestInfo;
      if (info.status === "completed" || info.status === "reviewed") {
        setSubmitted(true);
      }
      setRequestInfo(info);
      setLoading(false);
    };
    fetchRequest();
  }, [token]);

  const handleCepBlur = async () => {
    const cepDigits = form.cep.replace(/\D/g, "");
    if (cepDigits.length !== 8) return;
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          endereco: data.logradouro || prev.endereco,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
      }
    } catch {
      // silently fail
    } finally {
      setFetchingCep(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast({ title: "Preencha o nome completo", variant: "destructive" });
      return;
    }
    if (form.cpf.replace(/\D/g, "").length < 11) {
      toast({ title: "Preencha o CPF completo", variant: "destructive" });
      setCpfError("CPF incompleto");
      return;
    }
    if (!isValidCPF(form.cpf)) {
      toast({ title: "CPF inválido", description: "Verifique os números digitados.", variant: "destructive" });
      setCpfError("CPF inválido");
      return;
    }
    setCpfError(null);
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("submit_client_data_public", {
        _token: token!,
        _client_data: form as any,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Link inválido</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-6">
        <Helmet>
          <title>Dados enviados | {requestInfo?.company_name}</title>
        </Helmet>
        <div className="text-center space-y-5 max-w-md">
          {requestInfo?.company_logo && (
            <img src={requestInfo.company_logo} alt={requestInfo.company_name} className="h-16 mx-auto object-contain" />
          )}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Dados enviados com sucesso!</h1>
          <p className="text-muted-foreground">
            Obrigado por preencher seus dados. O buffet será notificado e entrará em contato.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <Helmet>
        <title>Dados do Contratante | {requestInfo?.company_name}</title>
      </Helmet>

      {/* Premium Header */}
      <header className="border-b border-border/40 bg-card shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-4 px-6 py-4">
          {requestInfo?.company_logo && (
            <img src={requestInfo.company_logo} alt={requestInfo?.company_name} className="h-11 object-contain" />
          )}
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight">{requestInfo?.company_name}</h1>
            <p className="text-xs text-muted-foreground">Dados do contratante</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        {/* Intro card */}
        <div className="rounded-2xl border border-border/40 bg-card p-5 sm:p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground tracking-tight">Preencha seus dados</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Esses dados serão utilizados para a elaboração do contrato da festa.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section: Dados Pessoais */}
          <div className="rounded-2xl border border-border/40 bg-card p-5 sm:p-6 shadow-sm">
            <SectionHeader icon={User} label="Dados Pessoais" />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Nome completo <span className="text-destructive">*</span></Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome do contratante"
                  className="bg-muted/30 border-border/50 focus:bg-background"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">CPF <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.cpf}
                    onChange={(e) => {
                      setForm({ ...form, cpf: formatCPF(e.target.value) });
                      setCpfError(null);
                    }}
                    onBlur={() => {
                      const d = form.cpf.replace(/\D/g, "");
                      if (d.length === 11 && !isValidCPF(form.cpf)) {
                        setCpfError("CPF inválido");
                      } else if (d.length > 0 && d.length < 11) {
                        setCpfError("CPF incompleto");
                      } else {
                        setCpfError(null);
                      }
                    }}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className={`bg-muted/30 border-border/50 focus:bg-background ${cpfError ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                    required
                  />
                  {cpfError && (
                    <p className="text-[11px] text-destructive font-medium mt-1">{cpfError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">RG</Label>
                  <Input
                    value={form.rg}
                    onChange={(e) => setForm({ ...form, rg: e.target.value })}
                    className="bg-muted/30 border-border/50 focus:bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    Data de nascimento
                  </Label>
                  <Input
                    type="date"
                    value={form.nascimento}
                    onChange={(e) => setForm({ ...form, nascimento: e.target.value })}
                    className="bg-muted/30 border-border/50 focus:bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    E-mail
                  </Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="bg-muted/30 border-border/50 focus:bg-background"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Endereço */}
          <div className="rounded-2xl border border-border/40 bg-card p-5 sm:p-6 shadow-sm">
            <SectionHeader icon={MapPin} label="Endereço" />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">CEP</Label>
                <div className="relative max-w-[200px]">
                  <Input
                    value={form.cep}
                    onChange={(e) => setForm({ ...form, cep: formatCEP(e.target.value) })}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                    maxLength={9}
                    className="bg-muted/30 border-border/50 focus:bg-background"
                  />
                  {fetchingCep && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Endereço</Label>
                  <Input
                    value={form.endereco}
                    onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                    className="bg-muted/30 border-border/50 focus:bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Número</Label>
                  <Input
                    value={form.numero}
                    onChange={(e) => setForm({ ...form, numero: e.target.value })}
                    className="bg-muted/30 border-border/50 focus:bg-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Complemento</Label>
                <Input
                  value={form.complemento}
                  onChange={(e) => setForm({ ...form, complemento: e.target.value })}
                  className="bg-muted/30 border-border/50 focus:bg-background"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Bairro</Label>
                  <Input
                    value={form.bairro}
                    onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                    className="bg-muted/30 border-border/50 focus:bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Cidade</Label>
                  <Input
                    value={form.cidade}
                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                    className="bg-muted/30 border-border/50 focus:bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Estado</Label>
                  <Input
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value })}
                    maxLength={2}
                    placeholder="UF"
                    className="bg-muted/30 border-border/50 focus:bg-background"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm">
            <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold gap-2 shadow-sm" disabled={submitting}>
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
              Enviar dados
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-3">
              Seus dados serão utilizados exclusivamente para a elaboração do contrato.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
