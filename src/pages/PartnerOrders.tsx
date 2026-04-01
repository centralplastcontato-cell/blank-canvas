import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PartnerSidebar } from "@/components/partner/PartnerSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Package, CheckCircle2, Truck, AlertCircle } from "lucide-react";

type OrderStatus = "pendente" | "confirmado" | "em_producao" | "entregue";

interface Order {
  id: number;
  event: string;
  buffet: string;
  items: string[];
  status: OrderStatus;
  value: number;
  eventDate: string;
  deliveryTime: string;
  notes?: string;
}

const mockOrders: Order[] = [
  { id: 1, event: "Festa da Sofia", buffet: "Buffet Castelo Encantado", items: ["Bolo 3 andares tema Princesa", "50 brigadeiros gourmet", "30 beijinhos"], status: "pendente", value: 850, eventDate: "2026-07-25", deliveryTime: "14:00", notes: "Verificar se tem alergia a nozes" },
  { id: 2, event: "Aniversário Pedro", buffet: "Buffet Aventura", items: ["Bolo redondo chocolate", "100 docinhos sortidos"], status: "confirmado", value: 1200, eventDate: "2026-08-02", deliveryTime: "10:00" },
  { id: 3, event: "Festa Maria Clara", buffet: "Buffet Castelo Encantado", items: ["Bolo temático Frozen"], status: "em_producao", value: 650, eventDate: "2026-08-10", deliveryTime: "13:00" },
  { id: 4, event: "Chá de Bebê Laura", buffet: "Buffet Aventura", items: ["Mini bolos individuais x20", "Docinhos variados x80"], status: "entregue", value: 480, eventDate: "2026-03-20", deliveryTime: "15:00" },
  { id: 5, event: "1 Ano do Theo", buffet: "Buffet Castelo Encantado", items: ["Bolo Safari 2 andares", "Cupcakes decorados x30"], status: "pendente", value: 720, eventDate: "2026-08-15", deliveryTime: "11:00" },
  { id: 6, event: "Festa Junina Escola", buffet: "Buffet Aventura", items: ["Bolo de milho grande", "Paçocas artesanais x100"], status: "confirmado", value: 550, eventDate: "2026-06-24", deliveryTime: "09:00" },
];

const columns: { key: OrderStatus; label: string; icon: React.ElementType; color: string }[] = [
  { key: "pendente", label: "Pendentes", icon: AlertCircle, color: "border-t-amber-500" },
  { key: "confirmado", label: "Confirmados", icon: CheckCircle2, color: "border-t-blue-500" },
  { key: "em_producao", label: "Em Produção", icon: Package, color: "border-t-purple-500" },
  { key: "entregue", label: "Entregues", icon: Truck, color: "border-t-emerald-500" },
];

const statusBadge: Record<OrderStatus, string> = {
  pendente: "bg-amber-100 text-amber-800 border-amber-200",
  confirmado: "bg-blue-100 text-blue-800 border-blue-200",
  em_producao: "bg-purple-100 text-purple-800 border-purple-200",
  entregue: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

function OrderCard({ order }: { order: Order }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-sm text-foreground">{order.event}</h3>
          <span className="font-bold text-sm text-primary whitespace-nowrap ml-2">
            R$ {order.value.toLocaleString('pt-BR')}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{order.buffet}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span>{new Date(order.eventDate).toLocaleDateString('pt-BR')} às {order.deliveryTime}</span>
          </div>
        </div>

        <div className="border-t pt-2">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Itens</p>
          <ul className="space-y-0.5">
            {order.items.map((item, i) => (
              <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                <span className="text-primary mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {order.notes && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-2">
            <p className="text-[10px] text-amber-700">{order.notes}</p>
          </div>
        )}

        {order.status === "pendente" && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="flex-1 text-xs h-8 rounded-lg">Aceitar</Button>
            <Button size="sm" variant="outline" className="text-xs h-8 rounded-lg">Recusar</Button>
          </div>
        )}
        {order.status === "confirmado" && (
          <Button size="sm" variant="outline" className="w-full text-xs h-8 rounded-lg gap-1.5">
            <Package className="h-3.5 w-3.5" /> Iniciar Produção
          </Button>
        )}
        {order.status === "em_producao" && (
          <Button size="sm" variant="outline" className="w-full text-xs h-8 rounded-lg gap-1.5">
            <Truck className="h-3.5 w-3.5" /> Marcar como Entregue
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function PartnerOrders() {
  const [view, setView] = useState<"kanban" | "lista">("kanban");

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PartnerSidebar />
        <main className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Pedidos</h1>
              <p className="text-muted-foreground text-sm">Gerencie os pedidos dos buffets parceiros</p>
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList className="rounded-full">
                <TabsTrigger value="kanban" className="rounded-full text-xs">Kanban</TabsTrigger>
                <TabsTrigger value="lista" className="rounded-full text-xs">Lista</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Kanban View */}
          {view === "kanban" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {columns.map((col) => {
                const orders = mockOrders.filter((o) => o.status === col.key);
                return (
                  <div key={col.key} className="space-y-3">
                    <div className={`flex items-center gap-2 p-3 rounded-xl bg-card border border-t-4 ${col.color}`}>
                      <col.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">{col.label}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px] h-5 min-w-5 flex items-center justify-center">
                        {orders.length}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {orders.map((order) => (
                        <OrderCard key={order.id} order={order} />
                      ))}
                      {orders.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-xs">
                          Nenhum pedido
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* List View */}
          {view === "lista" && (
            <div className="space-y-3">
              {mockOrders.map((order) => (
                <Card key={order.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{order.event}</h3>
                        <Badge variant="outline" className={`text-[10px] ${statusBadge[order.status]}`}>
                          {columns.find(c => c.key === order.status)?.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{order.buffet} • {order.items.length} itens</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-primary">R$ {order.value.toLocaleString('pt-BR')}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.eventDate).toLocaleDateString('pt-BR')}</p>
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