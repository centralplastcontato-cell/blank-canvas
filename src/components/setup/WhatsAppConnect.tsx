import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Loader2, Monitor, Smartphone } from "lucide-react";

type Status = "loading" | "none" | "pending" | "connected" | "expired";
type Mode = "qr" | "code";

// O servidor do WhatsApp sofre com consultas seguidas: no máximo uma a cada 5 s
const POLL_MS = 5000;

const fmtPhone = (p: string | null) => {
  const d = (p || "").replace(/\D/g, "").replace(/^55/, "");
  return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : p || "";
};

async function call(companyId: string, action: string, extra: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("whatsapp-connect", { body: { action, company_id: companyId, ...extra } });
  let msg: string | null = data?.error ?? null;
  if (error && !msg) {
    try {
      const ctx = (error as { context?: Response }).context;
      msg = (ctx ? (await ctx.json())?.error : null) || error.message;
    } catch {
      msg = error.message;
    }
  }
  if (msg) throw new Error(msg);
  return data as { status: Exclude<Status, "loading">; phone?: string | null; qrcode?: string | null; code?: string };
}

/**
 * "Conectar meu WhatsApp" (buffets do cadastro pelo site): cria o número na
 * Evolution e mostra o QR Code (ou o código, para quem está no próprio celular).
 * Fechou a tela sem conectar = o servidor apaga o número que ficou esperando.
 */
export function WhatsAppConnect({ companyId, defaultPhone = "", onConnected }: { companyId: string; defaultPhone?: string; onConnected?: () => void }) {
  const [status, setStatus] = useState<Status>("loading");
  const [phone, setPhone] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("qr");
  const [qr, setQr] = useState<string | null>(null);
  const [pairPhone, setPairPhone] = useState(defaultPhone);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const statusRef = useRef<Status>("loading");
  statusRef.current = status;

  const onConnectedRef = useRef(onConnected);
  onConnectedRef.current = onConnected;
  const apply = useCallback((r: Awaited<ReturnType<typeof call>>) => {
    if (r.status === "connected" && statusRef.current === "pending") onConnectedRef.current?.();
    setStatus(r.status);
    if (r.status === "connected") setPhone(r.phone || null);
    if (r.qrcode !== undefined) setQr(r.qrcode || null);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => data.user && supabase.rpc("is_admin", { _user_id: data.user.id }).then(({ data: a }) => setIsAdmin(a === true)));
  }, []);

  useEffect(() => {
    call(companyId, "state").then(apply).catch((e) => { setError(e.message); setStatus("none"); });
  }, [companyId, apply]);

  // Enquanto espera: QR novo (modo QR) ou só confere se pareou (modo código)
  useEffect(() => {
    if (status !== "pending") return;
    let stop = false;
    const tick = async () => {
      if (stop || document.hidden) return;
      try { apply(await call(companyId, mode === "qr" ? "qr" : "check")); } catch (e) { setError((e as Error).message); }
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => { stop = true; clearInterval(t); };
  }, [status, mode, companyId, apply]);

  // Saiu da tela sem conectar: apaga o número que ficou esperando
  useEffect(() => () => {
    if (statusRef.current === "pending") call(companyId, "cancel").catch(() => {});
  }, [companyId]);

  const start = async () => {
    setBusy(true); setError(null); setQr(null); setCode(null);
    try { apply(await call(companyId, "start")); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };

  const cancel = async () => {
    setBusy(true);
    try { apply(await call(companyId, "cancel")); } catch (e) { setError((e as Error).message); }
    setQr(null); setCode(null); setBusy(false);
  };

  const pair = async () => {
    setBusy(true); setError(null); setCode(null);
    try { const r = await call(companyId, "pair", { phone: pairPhone }); if (r.code) setCode(r.code); else apply(r); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };

  if (status === "loading") return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  const remove = async () => {
    if (!window.confirm("Desconectar e apagar este número da Evolution? As conversas já salvas continuam na plataforma.")) return;
    setBusy(true); setError(null);
    try { apply(await call(companyId, "remove")); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };

  if (status === "connected") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-lg border border-green-600/30 bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>WhatsApp conectado{phone ? `: ${fmtPhone(phone)}` : ""}.</span>
        </div>
        {isAdmin && (
          <Button type="button" variant="outline" size="sm" onClick={remove} disabled={busy}>
            {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Remover número (equipe Celebrei)
          </Button>
        )}
        {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  if (status === "none" || status === "expired") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {status === "expired"
            ? "O tempo para ler o QR Code acabou. É só começar de novo."
            : "Conecte o número de WhatsApp do buffet, como no WhatsApp Web. Tenha o celular do buffet em mãos: leva menos de 1 minuto."}
        </p>
        {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <Button onClick={start} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Conectar meu WhatsApp</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant={mode === "qr" ? "default" : "outline"} size="sm" onClick={() => setMode("qr")}><Monitor className="mr-1.5 h-4 w-4" /> Estou no computador</Button>
        <Button type="button" variant={mode === "code" ? "default" : "outline"} size="sm" onClick={() => setMode("code")}><Smartphone className="mr-1.5 h-4 w-4" /> Estou no celular</Button>
      </div>

      {mode === "qr" ? (
        <div className="space-y-3">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>No celular do buffet, abra o WhatsApp.</li>
            <li>Toque em <strong>⋮</strong> (ou Configurações) → <strong>Aparelhos conectados</strong> → <strong>Conectar um aparelho</strong>.</li>
            <li>Aponte a câmera para o código abaixo.</li>
          </ol>
          <div className="flex h-64 items-center justify-center rounded-lg border bg-white p-2">
            {qr ? <img src={qr} alt="QR Code do WhatsApp" className="h-full w-auto" /> : <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground">O código muda sozinho a cada poucos segundos. Mantenha esta tela aberta.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Escreva o número do WhatsApp do buffet. Vamos gerar um código para você digitar no próprio WhatsApp.</p>
          <div className="flex gap-2">
            <Input value={pairPhone} onChange={(e) => setPairPhone(e.target.value)} inputMode="tel" placeholder="(15) 99999-0000" aria-label="WhatsApp do buffet" className="text-base" />
            <Button type="button" onClick={pair} disabled={busy || pairPhone.replace(/\D/g, "").length < 10}>
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Gerar código
            </Button>
          </div>
          {code && (
            <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
              <p className="text-center font-mono text-2xl font-bold tracking-widest">{code}</p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Copie o código e abra o WhatsApp do buffet.</li>
                <li>Toque em <strong>⋮</strong> → <strong>Aparelhos conectados</strong> → <strong>Conectar um aparelho</strong> → <strong>Conectar com número de telefone</strong>.</li>
                <li>Digite o código. Se ele não funcionar, gere outro.</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Esperando o WhatsApp conectar…
        <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={cancel} disabled={busy}>Cancelar</Button>
      </div>
    </div>
  );
}
