import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingScreen } from "@/components/ui/loading-screen";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
} from "lucide-react";

type TraceRow = {
  id: string;
  tracking_id: string | null;
  provider: string | null;
  instance_id: string | null;
  company_id: string | null;
  conversation_id: string | null;
  message_id: string | null;
  phone: string | null;
  direction: string | null;
  stage: string;
  status: string;
  latency_ms: number | null;
  error_message: string | null;
  payload_summary: any;
  created_at: string;
};

const STAGES = [
  "webhook_received",
  "payload_normalized",
  "conversation_resolved",
  "message_insert_attempt",
  "message_insert_success",
  "message_insert_skipped_duplicate",
  "message_insert_error",
  "conversation_update_success",
  "bot_dispatch",
  "send_platform_attempt",
  "conversation_lookup_attempt",
  "conversation_lookup_success",
  "conversation_lookup_error",
  "provider_send_attempt",
  "send_provider_success",
  "send_provider_failed",
  "send_returned_to_frontend",
];

const STATUS_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-800 border-green-200",
  error: "bg-red-100 text-red-800 border-red-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  skipped: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function AdminMessageTrace() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<TraceRow[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [groupByTracking, setGroupByTracking] = useState(true);

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // filters
  const [trackingId, setTrackingId] = useState("");
  const [phone, setPhone] = useState("");
  const [messageId, setMessageId] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [direction, setDirection] = useState<string>("all");
  const [stage, setStage] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [limit, setLimit] = useState(200);


  async function runQuery(custom?: Partial<{
    direction: string; status: string; stage: string; phone: string;
    onlyOutboundNoMsgId: boolean; clear: boolean;
  }>) {
    setLoading(true);
    try {
      let q = supabase
        .from("message_trace_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      const eff = {
        trackingId: custom?.clear ? "" : trackingId,
        phone: custom?.phone ?? (custom?.clear ? "" : phone),
        messageId: custom?.clear ? "" : messageId,
        conversationId: custom?.clear ? "" : conversationId,
        companyId: custom?.clear ? "" : companyId,
        fromDate: custom?.clear ? "" : fromDate,
        toDate: custom?.clear ? "" : toDate,
        direction: custom?.direction ?? (custom?.clear ? "all" : direction),
        stage: custom?.stage ?? (custom?.clear ? "all" : stage),
        status: custom?.status ?? (custom?.clear ? "all" : status),
      };

      if (eff.trackingId) q = q.eq("tracking_id", eff.trackingId.trim());
      if (eff.phone) q = q.ilike("phone", `%${eff.phone.replace(/\D/g, "")}%`);
      if (eff.messageId) q = q.eq("message_id", eff.messageId.trim());
      if (eff.conversationId) q = q.eq("conversation_id", eff.conversationId.trim());
      if (eff.companyId) q = q.eq("company_id", eff.companyId.trim());
      if (eff.fromDate) q = q.gte("created_at", new Date(eff.fromDate).toISOString());
      if (eff.toDate) {
        const t = new Date(eff.toDate);
        t.setHours(23, 59, 59, 999);
        q = q.lte("created_at", t.toISOString());
      }
      if (eff.direction && eff.direction !== "all") q = q.eq("direction", eff.direction);
      if (eff.stage && eff.stage !== "all") q = q.eq("stage", eff.stage);
      if (eff.status && eff.status !== "all") q = q.eq("status", eff.status);

      const { data, error } = await q;
      if (error) throw error;

      let result = (data || []) as TraceRow[];

      if (custom?.onlyOutboundNoMsgId) {
        result = result.filter(
          (r) =>
            r.direction === "outbound" &&
            (r.stage === "send_provider_success" || r.stage === "send_returned_to_frontend") &&
            !r.message_id
        );
      }

      setRows(result);
      setPage(1);

    } catch (e: any) {
      console.error("[message-trace] query error", e);
      alert("Erro ao consultar: " + (e?.message ?? String(e)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    if (!groupByTracking) return null;
    const map = new Map<string, TraceRow[]>();
    for (const r of rows) {
      const k = r.tracking_id || `__no_tid__/${r.id}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    // sort each group asc by created_at (chronological timeline)
    const arr = Array.from(map.entries()).map(([k, items]) => ({
      key: k,
      items: [...items].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    }));
    // sort groups by latest activity desc
    arr.sort((a, b) => {
      const al = Math.max(...a.items.map((i) => new Date(i.created_at).getTime()));
      const bl = Math.max(...b.items.map((i) => new Date(i.created_at).getTime()));
      return bl - al;
    });
    return arr;
  }, [rows, groupByTracking]);

  // Pagination derived values
  const totalItems = groupByTracking ? (grouped?.length ?? 0) : rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pagedGrouped = grouped ? grouped.slice(startIdx, endIdx) : null;
  const pagedRows = rows.slice(startIdx, endIdx);

  useEffect(() => {
    setPage(1);
  }, [pageSize, groupByTracking]);


  function toggleExpand(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  }

  function clearFilters() {
    setTrackingId(""); setPhone(""); setMessageId(""); setConversationId("");
    setCompanyId(""); setFromDate(""); setToDate(""); setDirection("all");
    setStage("all"); setStatus("all");
    runQuery({ clear: true });
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold">🔍 Message Trace — Diagnóstico</h1>
            <p className="text-sm text-muted-foreground">
              Apenas leitura. Rastreie o ciclo de vida de mensagens (inbound/outbound).
            </p>
          </div>
          <Button onClick={() => runQuery()} disabled={loading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Recarregar
          </Button>
        </div>

        {/* Quick filters */}
        <Card className="p-4">
          <Label className="text-xs uppercase text-muted-foreground">Filtros rápidos</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={() => { setStatus("error"); runQuery({ status: "error" }); }}>
              <AlertCircle className="w-3 h-3 mr-1" /> Últimas com erro
            </Button>
            <Button size="sm" variant="outline" onClick={() => runQuery({ onlyOutboundNoMsgId: true, direction: "outbound" })}>
              Outbound sem message_id
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setDirection("inbound"); setStage("webhook_received"); runQuery({ direction: "inbound", stage: "webhook_received" }); }}>
              <ArrowDownToLine className="w-3 h-3 mr-1" /> Webhooks inbound
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setDirection("outbound"); setStage("provider_send_attempt"); runQuery({ direction: "outbound", stage: "provider_send_attempt" }); }}>
              <ArrowUpFromLine className="w-3 h-3 mr-1" /> Envios outbound
            </Button>
            <Button size="sm" variant="ghost" onClick={clearFilters}>Limpar</Button>
          </div>
        </Card>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">tracking_id</Label>
              <Input value={trackingId} onChange={(e) => setTrackingId(e.target.value)} placeholder="in_… / out_…" />
            </div>
            <div>
              <Label className="text-xs">telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="ex: 11999990000" />
            </div>
            <div>
              <Label className="text-xs">message_id</Label>
              <Input value={messageId} onChange={(e) => setMessageId(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">conversation_id</Label>
              <Input value={conversationId} onChange={(e) => setConversationId(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">company_id</Label>
              <Input value={companyId} onChange={(e) => setCompanyId(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">de</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">até</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">direction</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="inbound">inbound</SelectItem>
                  <SelectItem value="outbound">outbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">stage</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">Todos</SelectItem>
                  {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="success">success</SelectItem>
                  <SelectItem value="error">error</SelectItem>
                  <SelectItem value="info">info</SelectItem>
                  <SelectItem value="warning">warning</SelectItem>
                  <SelectItem value="skipped">skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">limite</Label>
              <Input
                type="number"
                value={limit}
                min={10}
                max={1000}
                onChange={(e) => setLimit(Math.max(10, Math.min(1000, Number(e.target.value) || 200)))}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => runQuery()} disabled={loading} className="flex-1">
                <Search className="w-4 h-4 mr-2" /> Buscar
              </Button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              id="grp"
              type="checkbox"
              checked={groupByTracking}
              onChange={(e) => setGroupByTracking(e.target.checked)}
            />
            <label htmlFor="grp" className="text-sm">Agrupar por tracking_id (timeline)</label>
            <span className="text-xs text-muted-foreground ml-auto">{rows.length} registros</span>
          </div>
        </Card>

        {/* Results */}
        {loading ? (
          <LoadingScreen message="Consultando traces..." />
        ) : groupByTracking && grouped ? (
          <div className="space-y-3">
            {grouped.length === 0 && (
              <Card className="p-6 text-center text-muted-foreground">Nenhum registro.</Card>
            )}
            {grouped.map((g) => {
              const head = g.items[g.items.length - 1];
              const hasError = g.items.some((i) => i.status === "error");
              return (
                <Card key={g.key} className={`p-4 ${hasError ? "border-red-200" : ""}`}>
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <Badge variant="outline" className="font-mono text-xs">
                      {head.tracking_id || "(sem tracking_id)"}
                    </Badge>
                    {head.direction && (
                      <Badge variant="secondary">
                        {head.direction === "inbound" ? "⬇ inbound" : "⬆ outbound"}
                      </Badge>
                    )}
                    {head.provider && <Badge variant="outline">{head.provider}</Badge>}
                    {head.phone && <span className="text-sm">📞 {head.phone}</span>}
                    {hasError && <Badge className="bg-red-100 text-red-800">com erro</Badge>}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {g.items.length} stage(s)
                    </span>
                  </div>
                  <div className="space-y-1">
                    {g.items.map((it, idx) => (
                      <TimelineRow
                        key={it.id}
                        row={it}
                        index={idx}
                        last={idx === g.items.length - 1}
                        expanded={expanded.has(it.id)}
                        onToggle={() => toggleExpand(it.id)}
                      />
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>created_at</TableHead>
                  <TableHead>direction</TableHead>
                  <TableHead>stage</TableHead>
                  <TableHead>status</TableHead>
                  <TableHead>phone</TableHead>
                  <TableHead>provider</TableHead>
                  <TableHead>latency</TableHead>
                  <TableHead>tracking_id</TableHead>
                  <TableHead>message_id</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nenhum registro.</TableCell></TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell><Badge variant="secondary">{r.direction || "-"}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{r.stage}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[r.status] || ""}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.phone || "-"}</TableCell>
                    <TableCell className="text-xs">{r.provider || "-"}</TableCell>
                    <TableCell className="text-xs">{r.latency_ms != null ? `${r.latency_ms}ms` : "-"}</TableCell>
                    <TableCell className="font-mono text-[10px]">{r.tracking_id || "-"}</TableCell>
                    <TableCell className="font-mono text-[10px]">{r.message_id || "-"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => toggleExpand(r.id)}>
                        {expanded.has(r.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* expanded payload rows */}
            <div className="p-3 space-y-2">
              {rows.filter((r) => expanded.has(r.id)).map((r) => (
                <div key={r.id} className="rounded-lg border bg-muted/30 p-3 text-xs">
                  <div className="font-semibold mb-1">{r.stage} — {r.tracking_id}</div>
                  {r.error_message && <div className="text-red-700 mb-1">⚠ {r.error_message}</div>}
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(r.payload_summary, null, 2)}</pre>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function TimelineRow({
  row, index, last, expanded, onToggle,
}: { row: TraceRow; index: number; last: boolean; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-2 bottom-0 w-px bg-border" style={{ display: last ? "none" : "block" }} />
      <div className={`absolute left-1 top-2 w-3 h-3 rounded-full border-2 ${row.status === "error" ? "bg-red-500 border-red-300" : row.status === "success" ? "bg-green-500 border-green-300" : "bg-blue-500 border-blue-300"}`} />
      <div className="flex items-center gap-2 flex-wrap py-1">
        <span className="text-[10px] text-muted-foreground tabular-nums w-32">
          {new Date(row.created_at).toLocaleString("pt-BR")}
        </span>
        <Badge variant="outline" className="font-mono text-[11px]">{row.stage}</Badge>
        <Badge className={STATUS_COLORS[row.status] || ""}>{row.status}</Badge>
        {row.latency_ms != null && (
          <span className="text-xs text-muted-foreground">{row.latency_ms}ms</span>
        )}
        {row.message_id && (
          <span className="text-[10px] font-mono text-muted-foreground">msg:{row.message_id.slice(0, 16)}…</span>
        )}
        {row.conversation_id && (
          <span className="text-[10px] font-mono text-muted-foreground">conv:{row.conversation_id.slice(0, 8)}…</span>
        )}
        <Button size="sm" variant="ghost" className="ml-auto h-6 px-2" onClick={onToggle}>
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          payload
        </Button>
      </div>
      {row.error_message && (
        <div className="text-xs text-red-700 ml-0 pb-1">⚠ {row.error_message}</div>
      )}
      {expanded && (
        <pre className="text-[11px] bg-muted/40 rounded p-2 mt-1 mb-2 overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(row.payload_summary, null, 2)}
        </pre>
      )}
    </div>
  );
}
