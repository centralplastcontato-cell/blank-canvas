import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, User, CreditCard, MapPin, Mail, Calendar, FileText, Hash, Home, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

export default function PublicClientData() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [requestInfo, setRequestInfo] = useState<RequestInfo | null>(null);
  const [form, setForm] = useState<ClientFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingCep, setFetchingCep] = useState(false);

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
      return;
    }
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-md">
          <h1 className="text-xl font-bold text-foreground">Link inválido</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Helmet>
          <title>Dados enviados | {requestInfo?.company_name}</title>
        </Helmet>
        <div className="text-center space-y-4 max-w-md">
          {requestInfo?.company_logo && (
            <img src={requestInfo.company_logo} alt={requestInfo.company_name} className="h-16 mx-auto object-contain" />
          )}
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle2 className="h-8 w-8" />
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
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Dados do Contratante | {requestInfo?.company_name}</title>
      </Helmet>

      {/* Header with branding */}
      <header className="border-b border-border bg-card py-4 px-6">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {requestInfo?.company_logo && (
            <img src={requestInfo.company_logo} alt={requestInfo?.company_name} className="h-10 object-contain" />
          )}
          <div>
            <h1 className="text-sm font-semibold text-foreground">{requestInfo?.company_name}</h1>
            <p className="text-xs text-muted-foreground">Dados do contratante</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-6 space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Preencha seus dados</h2>
          <p className="text-sm text-muted-foreground">
            Esses dados serão utilizados para a elaboração do contrato da festa.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome completo *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CPF *</Label>
              <Input
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })}
                placeholder="000.000.000-00"
                maxLength={14}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>RG</Label>
              <Input value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de nascimento</Label>
              <Input type="date" value={form.nascimento} onChange={(e) => setForm({ ...form, nascimento: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>CEP</Label>
            <div className="relative">
              <Input
                value={form.cep}
                onChange={(e) => setForm({ ...form, cep: formatCEP(e.target.value) })}
                onBlur={handleCepBlur}
                placeholder="00000-000"
                maxLength={9}
              />
              {fetchingCep && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Complemento</Label>
            <Input value={form.complemento} onChange={(e) => setForm({ ...form, complemento: e.target.value })} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} maxLength={2} placeholder="UF" />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enviar dados
          </Button>
        </form>
      </main>
    </div>
  );
}
