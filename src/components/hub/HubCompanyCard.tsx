import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Building2, Phone, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMinutes, type CompanyPeriodMetrics } from "@/lib/hubDashboardMetrics";

const WHATSAPP_LABEL = {
  connected: { text: "WhatsApp conectado", dot: "bg-emerald-500" },
  disconnected: { text: "WhatsApp desconectado", dot: "bg-destructive" },
  unknown: { text: "Sem instância", dot: "bg-muted-foreground" },
} as const;

export function HubCompanyCard({ metrics: m }: { metrics: CompanyPeriodMetrics }) {
  const conversion = m.totalLeads > 0 ? ((m.leadsClosed / m.totalLeads) * 100).toFixed(1).replace(".", ",") : "0";
  const wa = WHATSAPP_LABEL[m.whatsappStatus];

  const kpis = [
    { label: "Leads", value: m.totalLeads, className: "text-foreground" },
    { label: "Conversão", value: `${conversion}%`, className: "text-emerald-600" },
    { label: "Resp. equipe", value: m.responseMedianMinutes === null ? "—" : formatMinutes(m.responseMedianMinutes), className: "text-foreground" },
    { label: "Hoje", value: m.leadsToday, className: "text-foreground" },
  ];

  const rows = [
    [
      { label: "Novos", value: m.leadsNew, className: "text-amber-600" },
      { label: "Festas fechadas", value: m.leadsClosed, className: "text-emerald-600" },
      { label: "Perdidos", value: m.leadsLost, className: "text-destructive" },
    ],
    [
      { label: "Conversas", value: m.totalConversations, className: "" },
      { label: "Ativas", value: m.activeConversations, className: "text-primary" },
      { label: "Follow-ups", value: m.followUps, className: "" },
    ],
  ];

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {m.logoUrl ? (
              <img src={m.logoUrl} alt={m.companyName} className="h-10 w-10 rounded-lg object-contain bg-muted shrink-0" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{m.companyName}</CardTitle>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`h-2 w-2 rounded-full shrink-0 ${wa.dot}`} />
                <span className="text-xs text-muted-foreground truncate">{wa.text}</span>
              </div>
            </div>
          </div>
          {m.whatsappPhone && (
            <a
              href={`https://wa.me/${m.whatsappPhone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors text-xs font-medium shrink-0"
            >
              <Phone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-4 gap-2 mb-3">
          {kpis.map(k => (
            <div key={k.label} className="text-center p-2 rounded-lg bg-muted/50 min-w-0">
              <p className={`text-base sm:text-lg font-bold tabular-nums truncate ${k.className}`}>{k.value}</p>
              <p className="text-[10px] text-muted-foreground truncate">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {rows.map((col, i) => (
            <div key={i} className="space-y-2 min-w-0">
              {col.map(r => (
                <div key={r.label} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground truncate">{r.label}</span>
                  <span className={`font-medium tabular-nums ${r.className}`}>{r.value}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            <Timer className="h-3 w-3 shrink-0" />
            {m.lastLeadAt
              ? `Último lead ${formatDistanceToNow(new Date(m.lastLeadAt), { addSuffix: true, locale: ptBR })}`
              : "Sem leads no período"}
          </span>
          {m.whatsappPhone && <span className="font-mono text-[10px] shrink-0">{m.whatsappPhone}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
