import { useEffect, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PartnerSidebar } from "@/components/partner/PartnerSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ShoppingCart, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useNavigate } from "react-router-dom";

const statusConfig: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-amber-100 text-amber-800 border-amber-200" },
  confirmado: { label: "Confirmado", color: "bg-blue-100 text-blue-800 border-blue-200" },
  em_producao: { label: "Em Produção", color: "bg-purple-100 text-purple-800 border-purple-200" },
  entregue: { label: "Entregue", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800 border-red-200" },
};

interface OrderRow {
  id: string;
  event_title: string | null;
  client_name: string | null;
  items: any;
  status: string;
  total_value: number;
  delivery_date: string | null;
  created_at: string;
}

export default function PartnerDashboard() {
  const { currentCompanyId } = useCompany();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [metrics, setMetrics] = useState({ monthOrders: 0, revenue: 0, pending: 0 });

  useEffect(() => {
    if (!currentCompanyId) return;

    const fetchData = async () => {
      setIsLoading(true);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [ordersRes, productsRes] = await Promise.all([
        supabase
          .from("partner_orders")
          .select("*")
          .eq("company_id", currentCompanyId)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("partner_products")
          .select("id", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .eq("is_active", true),
      ]);

      const allOrders = (ordersRes.data || []) as OrderRow[];
      setOrders(allOrders);
      setProductCount(productsRes.count || 0);

      const monthOrders = allOrders.filter((o) => o.created_at >= startOfMonth);
      const revenue = monthOrders.reduce((s, o) => s + Number(o.total_value || 0), 0);
      const pending = allOrders.filter((o) => o.status === "pendente").length;

      setMetrics({ monthOrders: monthOrders.length, revenue, pending });
      setIsLoading(false);
    };

    fetchData();
  }, [currentCompanyId]);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getItemsSummary = (items: any): string => {
    if (!items || !Array.isArray(items)) return "";
    return items.map((i: any) => i.name || i.product_name || "").filter(Boolean).join(" + ");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PartnerSidebar />
        <main className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Painel do Parceiro</h1>
              <p className="text-muted-foreground text-sm">Visão geral dos seus pedidos e catálogo</p>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 px-3 py-1">
              <Package className="h-3.5 w-3.5 mr-1.5" />
              Empresa Parceira
            </Badge>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
              ))
            ) : (
              <>
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Pedidos do Mês</p>
                        <p className="text-2xl font-bold text-foreground mt-1">{metrics.monthOrders}</p>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Faturamento</p>
                        <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(metrics.revenue)}</p>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Pendentes</p>
                        <p className="text-2xl font-bold text-foreground mt-1">{metrics.pending}</p>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-amber-600" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Aguardando confirmação</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Itens no Catálogo</p>
                        <p className="text-2xl font-bold text-foreground mt-1">{productCount}</p>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
                        <Package className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Recent Orders */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Pedidos Recentes</CardTitle>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate("/parceiro/pedidos")}>
                  Ver todos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : orders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum pedido ainda.</p>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map((order) => {
                    const s = statusConfig[order.status] || statusConfig.pendente;
                    return (
                      <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {order.event_title || order.client_name || "Pedido"}
                            {order.delivery_date && ` - ${new Date(order.delivery_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{getItemsSummary(order.items)}</p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${s.color}`}>
                            {s.label}
                          </Badge>
                          <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                            {formatCurrency(Number(order.total_value))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
}
