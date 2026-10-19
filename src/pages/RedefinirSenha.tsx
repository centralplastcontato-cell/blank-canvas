import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { isHubDomain } from "@/hooks/useDomainDetection";
import { RECOVERY_PATH, clearRecoveryFlag, readRecoveryFlag } from "@/lib/passwordRecovery";

type Mode = "checking" | "email" | "sent" | "nova" | "expirado" | "pronto";

const loginPath = () => (isHubDomain() ? "/hub-login" : "/auth");

/**
 * "Esqueci minha senha": sem o link, pede o e-mail e manda o link de
 * recuperação; aberta pelo link do e-mail, pede a senha nova.
 */
export default function RedefinirSenha() {
  const [mode, setMode] = useState<Mode>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const flag = readRecoveryFlag();
    if (flag === "expired") { clearRecoveryFlag(); setMode("expirado"); return; }
    if (flag !== "recovery") { setMode("email"); return; }
    // getSession espera o Supabase ler o token do link
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) clearRecoveryFlag();
      setMode(data.session ? "nova" : "expirado");
    });
  }, []);

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const addr = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(addr)) { setError("Confira o e-mail."); return; }
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(addr, { redirectTo: `${window.location.origin}${RECOVERY_PATH}` });
    setBusy(false);
    if (err) {
      setError(/rate|security purposes|seconds/i.test(err.message)
        ? "Já mandamos um link há pouco. Espere uns minutos e tente de novo."
        : "Não consegui mandar o e-mail agora. Tente de novo daqui a pouco.");
      return;
    }
    setMode("sent");
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("A senha precisa ter pelo menos 8 caracteres."); return; }
    if (password !== confirm) { setError("As duas senhas não são iguais."); return; }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(/different from the old|same/i.test(err.message)
        ? "A senha nova precisa ser diferente da antiga."
        : "Não consegui trocar a senha. Peça um link novo e tente de novo.");
      return;
    }
    clearRecoveryFlag();
    setMode("pronto");
  };

  const restart = () => { clearRecoveryFlag(); setError(null); setMode("email"); };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Helmet><title>Redefinir senha</title></Helmet>
      <div className="w-full max-w-md space-y-5 rounded-3xl border bg-card p-8 shadow-lg">
        {mode === "checking" && <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />}

        {mode === "email" && (
          <form onSubmit={sendLink} className="space-y-4">
            <div className="space-y-1 text-center">
              <h1 className="text-2xl font-bold">Esqueci minha senha</h1>
              <p className="text-sm text-muted-foreground">Escreva o e-mail que você usa para entrar. Vamos mandar um link para criar uma senha nova.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-email">E-mail</Label>
              <Input id="r-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="text-base" />
            </div>
            {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Mandar link
            </Button>
            <p className="text-center text-sm"><a href={loginPath()} className="text-muted-foreground hover:underline">Voltar para o login</a></p>
          </form>
        )}

        {mode === "sent" && (
          <div className="space-y-3 text-center">
            <Mail className="mx-auto h-10 w-10 text-primary" />
            <h1 className="text-xl font-bold">Confira o seu e-mail</h1>
            <p className="text-sm text-muted-foreground">
              Se <strong>{email.trim().toLowerCase()}</strong> tiver cadastro, chega em alguns minutos um e-mail com o link para criar a senha nova.
              Olhe também a caixa de spam e promoções.
            </p>
            <Button variant="outline" className="w-full" onClick={restart}>Usar outro e-mail</Button>
          </div>
        )}

        {mode === "nova" && (
          <form onSubmit={savePassword} className="space-y-4">
            <div className="space-y-1 text-center">
              <h1 className="text-2xl font-bold">Criar senha nova</h1>
              <p className="text-sm text-muted-foreground">Escolha uma senha com pelo menos 8 caracteres.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-pass">Senha nova</Label>
              <Input id="r-pass" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-pass2">Repita a senha nova</Label>
              <Input id="r-pass2" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="text-base" />
            </div>
            {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar senha nova
            </Button>
          </form>
        )}

        {mode === "expirado" && (
          <div className="space-y-3 text-center">
            <h1 className="text-xl font-bold">Esse link não vale mais</h1>
            <p className="text-sm text-muted-foreground">O link do e-mail vale por pouco tempo e só pode ser usado uma vez. Peça um novo.</p>
            <Button className="w-full" onClick={restart}>Pedir link novo</Button>
          </div>
        )}

        {mode === "pronto" && (
          <div className="space-y-3 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
            <h1 className="text-xl font-bold">Senha trocada!</h1>
            <p className="text-sm text-muted-foreground">Pronto, você já pode usar a senha nova.</p>
            <Button className="w-full" onClick={() => window.location.assign(loginPath())}>Entrar</Button>
          </div>
        )}
      </div>
    </div>
  );
}
