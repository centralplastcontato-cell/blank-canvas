import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Copy, Loader2, Send } from "lucide-react";
import {
  type ClientDataRequestRow,
  clientDataLabel,
  clientDataState,
  clientDataMessageLink,
  clientDataUrl,
  createClientDataRequest,
  latestClientDataByLead,
} from "@/lib/clientDataRequest";

interface Props {
  companyId: string;
  companyName: string;
  customDomain?: string | null;
  lead: { id: string; name: string; status: string };
  /** Envia o texto pelo WhatsApp desta conversa (mesmo caminho do chat) */
  sendText: (message: string) => Promise<void>;
  compact?: boolean;
}

/**
 * Faixa "Dados do contrato" no topo da conversa: pedir o link com um toque,
 * ver se está pendente/atrasado e abrir os dados quando o cliente preencher.
 * Aparece com o lead Fechado ou quando já existe um pedido.
 */
export function ClientDataBar({ companyId, companyName, customDomain, lead, sendText, compact }: Props) {
  const [request, setRequest] = useState<ClientDataRequestRow | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setRequest(null);
    latestClientDataByLead([lead.id]).then((map) => {
      if (cancelled) return;
      setRequest(map.get(lead.id) || null);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [lead.id]);

  if (!loaded) return null;
  if (!request && lead.status !== "fechado") return null;

  const askData = async () => {
    setBusy(true);
    try {
      const created = await createClientDataRequest({ companyId, companyName, customDomain, leadId: lead.id, leadName: lead.name, sentVia: "botao" });
      await sendText(created.message);
      setRequest(created.request);
      toast({ title: "Link enviado para o cliente ✅", description: "Se ele não preencher, a plataforma cobra no horário de atendimento (se as cobranças estiverem ligadas)." });
    } catch (e) {
      toast({ title: "Não consegui enviar o link", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!request) return;
    setBusy(true);
    try {
      const link = clientDataMessageLink(request.token, customDomain);
      const first = lead.name.trim().split(/\s+/)[0] || "";
      await sendText(`Oi${first ? `, ${first}` : ""}! 😊 Segue de novo o link pra preencher os dados do contrato da festa:\n\n${link}`);
      toast({ title: "Link reenviado ✅" });
    } catch (e) {
      toast({ title: "Não consegui reenviar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const copy = () => {
    if (!request) return;
    navigator.clipboard.writeText(clientDataUrl(request.token, customDomain));
    toast({ title: "Link copiado" });
  };

  const state = request ? clientDataState(request) : null;
  const tone = state === "recebido" ? "bg-green-500/10 text-green-800 border-green-500/20 dark:text-green-300"
    : state === "atrasado" ? "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-300"
    : state === "pendente" ? "bg-amber-500/10 text-amber-800 border-amber-500/20 dark:text-amber-300"
    : "bg-muted/40 text-muted-foreground border-border";

  return (
    <>
      <div className={cn("flex items-center gap-2 border-b px-3 py-1.5 text-xs font-medium shrink-0", tone)}>
        <span className="truncate">{request ? clientDataLabel(request) : "📋 Festa fechada: falta pedir os dados do contrato"}</span>
        {request && (request.reminder_count || 0) > 0 && (request.reminder_count || 0) < 99 && state !== "recebido" && (
          <span className="shrink-0 opacity-80">· {request.reminder_count} cobrança{request.reminder_count === 1 ? "" : "s"}</span>
        )}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          {!request && (
            <Button size="sm" className="h-7 px-2 text-xs" onClick={askData} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              <span className={cn("ml-1", compact && "sr-only")}>Pedir dados</span>
            </Button>
          )}
          {request && state === "recebido" && (
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setOpen(true)}>Ver dados</Button>
          )}
          {request && state !== "recebido" && (
            <>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={resend} disabled={busy}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Reenviar"}
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copy} aria-label="Copiar link"><Copy className="h-3.5 w-3.5" /></Button>
            </>
          )}
        </div>
      </div>
      {request && <ClientDataDialog open={open} onOpenChange={setOpen} data={request.client_data} />}
    </>
  );
}

type Json = Record<string, any>;

function ClientDataDialog({ open, onOpenChange, data }: { open: boolean; onOpenChange: (v: boolean) => void; data: Record<string, unknown> | null }) {
  const d = (data || {}) as Json;
  const line = (label: string, value: unknown) => (value ? (
    <div className="flex justify-between gap-3 py-1 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{String(value)}</span></div>
  ) : null);
  const address = [d.endereco, d.numero, d.complemento, d.bairro, d.cidade && `${d.cidade}${d.estado ? `/${d.estado}` : ""}`, d.cep].filter(Boolean).join(", ");
  const children = Array.isArray(d.birthday_children) ? (d.birthday_children as Json[]).filter((c) => c?.name) : [];
  const people = Array.isArray(d.responsaveis) ? (d.responsaveis as Json[]).filter((r) => r?.name) : [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dados do contratante</DialogTitle>
          <DialogDescription>Preenchidos pelo cliente. Já vão para a festa e para o contrato.</DialogDescription>
        </DialogHeader>
        <div className="divide-y">
          <div className="pb-2">
            {line("Nome", d.nome)}
            {line("CPF", d.cpf)}
            {line("RG", d.rg)}
            {line("Nascimento", d.nascimento)}
            {line("E-mail", d.email)}
            {line("Endereço", address)}
          </div>
          {children.length > 0 && (
            <div className="py-2">
              <p className="pb-1 text-xs font-semibold uppercase text-muted-foreground">Aniversariante{children.length > 1 ? "s" : ""}</p>
              {children.map((c, i) => <div key={i}>{line(c.name, [c.age && `${c.age} anos`, c.birthdate].filter(Boolean).join(" · ") || "—")}</div>)}
            </div>
          )}
          {people.length > 0 && (
            <div className="pt-2">
              <p className="pb-1 text-xs font-semibold uppercase text-muted-foreground">Responsáveis</p>
              {people.map((r, i) => <div key={i}>{line(r.name, [r.relation, r.phone].filter(Boolean).join(" · ") || "—")}</div>)}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
