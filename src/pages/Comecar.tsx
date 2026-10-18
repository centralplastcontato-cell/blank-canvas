import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2 } from "lucide-react";
import { LEGAL_VERSION } from "@/lib/legal";

const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

/** Cadastro do buffet novo: cria a conta e já entra no passo a passo (/setup) */
export default function Comecar() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ buffet_name: "", owner_name: "", whatsapp: "", city: "", state: "SP", email: "", password: "", website: "" });
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("self-signup", { body: { action: "signup", ...form, accept_terms: accepted, terms_version: LEGAL_VERSION } });
      let msg: string | null = data?.error ?? null;
      if (fnErr && !msg) {
        try {
          const ctx = (fnErr as { context?: Response }).context;
          msg = (ctx ? (await ctx.json())?.error : null) || fnErr.message;
        } catch {
          msg = fnErr.message;
        }
      }
      if (msg) throw new Error(msg);
      await supabase.auth.signOut();
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email: form.email.trim().toLowerCase(), password: form.password });
      if (loginErr) throw new Error("Conta criada! Entre com o seu e-mail e senha para continuar.");
      if (data?.company_id) localStorage.setItem("selected_company_id", data.company_id);
      // Recarrega para a lista de empresas já vir com o buffet novo
      window.location.assign("/setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9F3] px-4 py-10">
      <Helmet><title>Criar conta | Celebrei</title></Helmet>
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1fr_1.1fr] md:items-start">
        <div className="space-y-5 md:pt-6">
          <Link to="/" className="font-grotesque text-xl font-bold text-[#0F1222]">Celebrei</Link>
          <h1 className="font-grotesque text-3xl font-bold leading-tight text-[#0F1222] sm:text-4xl">Coloque seu buffet para atender sozinho no WhatsApp</h1>
          <p className="text-slate-600">Em uns 15 minutos você deixa tudo pronto:</p>
          <ul className="space-y-3 text-slate-700">
            {["A IA aprende sobre o seu buffet com 10 perguntas", "Você marca as datas que já estão ocupadas", "O site do buffet fica pronto, com o botão do WhatsApp", "A equipe Celebrei conecta o seu número e liga a IA"].map((t) => (
              <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#E0457A]" /> {t}</li>
            ))}
          </ul>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-3xl border border-[#0F1222]/[0.07] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-[#0F1222]">Criar conta do buffet</h2>
          <div className="space-y-2">
            <Label htmlFor="c-buffet">Nome do buffet</Label>
            <Input id="c-buffet" required value={form.buffet_name} onChange={set("buffet_name")} placeholder="Buffet Alegria" maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-owner">Seu nome</Label>
            <Input id="c-owner" required value={form.owner_name} onChange={set("owner_name")} autoComplete="name" maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-whats">Seu WhatsApp</Label>
            <Input id="c-whats" required inputMode="tel" value={form.whatsapp} onChange={set("whatsapp")} placeholder="(15) 99999-0000" autoComplete="tel" />
          </div>
          <div className="grid grid-cols-[1fr_88px] gap-3">
            <div className="space-y-2">
              <Label htmlFor="c-city">Cidade do buffet</Label>
              <Input id="c-city" required value={form.city} onChange={set("city")} maxLength={60} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-uf">UF</Label>
              <select id="c-uf" value={form.state} onChange={set("state")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {UFS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-email">E-mail (para entrar na plataforma)</Label>
            <Input id="c-email" required type="email" value={form.email} onChange={set("email")} autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-pass">Crie uma senha</Label>
            <Input id="c-pass" required type="password" minLength={8} value={form.password} onChange={set("password")} autoComplete="new-password" placeholder="Pelo menos 8 caracteres" />
          </div>
          {/* Campo escondido: só robô preenche */}
          <input type="text" name="website" value={form.website} onChange={set("website")} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#E0457A]" />
            <span>
              Li e aceito os <a href="/termos" target="_blank" rel="noopener noreferrer" className="font-medium text-[#E0457A] underline">Termos de Uso</a> e
              a <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="font-medium text-[#E0457A] underline">Política de Privacidade</a>.
            </span>
          </label>
          {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || !accepted}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar conta e começar
          </Button>
          <p className="text-center text-xs text-slate-500">
            Já tem conta? <button type="button" className="font-medium text-[#E0457A] hover:underline" onClick={() => navigate("/auth")}>Entrar</button>
          </p>
        </form>
      </div>
    </div>
  );
}
