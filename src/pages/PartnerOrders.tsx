import { useState, useEffect, useCallback } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PartnerThemeProvider } from "@/components/partner/PartnerThemeProvider";
import { PartnerSidebar } from "@/components/partner/PartnerSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Package, CheckCircle2, Truck, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";

type OrderStatus = "pendente" | "confirmado" | "em_producao" | "entregue" | "cancelado";

interface Order {
  id: string;
  event_title: string | null;
  client_name: string | null;
  items: any;
  status: OrderStatus;
  total_value: number;
  delivery_date: string | null;
  notes: string | null;
  created_at: string;
}

const columns: { key: OrderStatus; label: string; icon: React.ElementType; color: string }[] = [
  { key: "pendente", label: "Pendentes", icon: AlertCircle, color: "border-t-amber-500" },
  { key: "confirmado", label: "Confirmados", icon: CheckCircle2, color: "border-t-blue-500" },
  { key: "em_producao", label: "Em Produção", icon: Package, color: "border-t-purple-500" },
  { key: "entregue", label: "Entregues", icon: Truck, color: "border-t-emerald-500" },
];

const statusBadge: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800 border-amber-200",
  confirmado: "bg-blue-100 text-blue-800 border-blue-200",
  em_producao: "bg-purple-100 text-purple-800 border-purple-200",
  entregue: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelado: "bg-red-100 text-red-800 border-red-200",
};

function OrderCard({ order, onStatusChange }: { order: Order; onStatusChange: (id: string, status: OrderStatus) => void }) {
  const [updating, setUpdating] = useState(false);
  const items = Array.isArray(order.items) ? order.items : [];

  const changeStatus = async (newStatus: OrderStatus) => {
    setUpdating(true);
    await onStatusChange(order.id, newStatus);
    setUpdating(false);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-sm text-foreground">{order.event_title || order.client_name || "Pedido"}</h3>
          <span className="font-bold text-sm text-primary whitespace-nowrap ml-2">
            R$ {Number(order.total_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {order.delivery_date && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span>Entrega: {new Date(order.delivery_date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
          </div>
        )}

        {items.length > 0 && (
          <div className="border-t pt-2">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Itens</p>
            <ul className="space-y-0.5">
              {items.map((item: any, i: number) => (
                <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">•</span>
                  {item.name || item.product_name}{item.quantity ? ` x${item.quantity}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {order.notes && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-2">
            <p className="text-[10px] text-amber-700">{order.notes}</p>
          </div>
        )}

        {updating ? (
          <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {order.status === "pendente" && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1 text-xs h-8 rounded-lg" onClick={() => changeStatus("confirmado")}>Aceitar</Button>
                <Button size="sm" variant="outline" className="text-xs h-8 rounded-lg" onClick={() => changeStatus("cancelado")}>Recusar</Button>
              </div>
            )}
            {order.status === "confirmado" && (
              <Button size="sm" variant="outline" className="w-full text-xs h-8 rounded-lg gap-1.5" onClick={() => changeStatus("em_producao")}>
                <Package className="h-3.5 w-3.5" /> Iniciar Produção
              </Button>
            )}
            {order.status === "em_producao" && (
              <Button size="sm" variant="outline" className="w-full text-xs h-8 rounded-lg gap-1.5" onClick={() => changeStatus("entregue")}>
                <Truck className="h-3.5 w-3.5" /> Marcar como Entregue
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function PartnerOrders() {
  const { currentCompanyId } = useCompany();
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!currentCompanyId) return;
    setIsLoading(true);
    const { data } = await supabase
      .from("partner_orders")
      .select("*")
      .eq("company_id", currentCompanyId)
      .order("created_at", { ascending: false });
    setOrders((data || []) as Order[]);
    setIsLoading(false);
  }, [currentCompanyId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await supabase
      .from("partner_orders")
      .update({ status: newStatus })
      .eq("id", orderId);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Status atualizado!" });
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PartnerSidebar />
        <main className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Pedidos</h1>
                <p className="text-muted-foreground text-sm">{orders.length} pedidos</p>
              </div>
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList className="rounded-full">
                <TabsTrigger value="kanban" className="rounded-full text-xs">Kanban</TabsTrigger>
                <TabsTrigger value="lista" className="rounded-full text-xs">Lista</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : view === "kanban" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {columns.map((col) => {
                const colOrders = orders.filter((o) => o.status === col.key);
                return (
                  <div key={col.key} className="space-y-3">
                    <div className={`flex items-center gap-2 p-3 rounded-xl bg-card border border-t-4 ${col.color}`}>
                      <col.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">{col.label}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px] h-5 min-w-5 flex items-center justify-center">
                        {colOrders.length}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {colOrders.map((order) => (
                        <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
                      ))}
                      {colOrders.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-xs">Nenhum pedido</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum pedido ainda.</p>
              ) : orders.map((order) => (
                <Card key={order.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{order.event_title || order.client_name || "Pedido"}</h3>
                        <Badge variant="outline" className={`text-[10px] ${statusBadge[order.status]}`}>
                          {columns.find((c) => c.key === order.status)?.label || order.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Array.isArray(order.items) ? `${order.items.length} itens` : ""}
                        {order.delivery_date && ` • ${new Date(order.delivery_date + "T12:00:00").toLocaleDateString("pt-BR")}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-primary">R$ {Number(order.total_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}
