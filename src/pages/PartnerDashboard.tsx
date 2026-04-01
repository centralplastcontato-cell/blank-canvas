import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PartnerSidebar } from "@/components/partner/PartnerSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, TrendingUp, Clock, Eye, Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";

const mockOrders = [
  { id: 1, event: "Festa da Sofia - 25/07", items: "Bolo 3 andares + 50 docinhos", status: "pendente", value: 850, date: "2026-03-28" },
  { id: 2, event: "Aniversário Pedro - 02/08", items: "Bolo redondo + 100 docinhos", status: "confirmado", value: 1200, date: "2026-03-27" },
  { id: 3, event: "Festa Maria Clara - 10/08", items: "Bolo temático Frozen", status: "em_producao", value: 650, date: "2026-03-25" },
  { id: 4, event: "Chá de Bebê - 15/08", items: "Mini bolos + docinhos", status: "entregue", value: 480, date: "2026-03-20" },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-amber-100 text-amber-800 border-amber-200" },
  confirmado: { label: "Confirmado", color: "bg-blue-100 text-blue-800 border-blue-200" },
  em_producao: { label: "Em Produção", color: "bg-purple-100 text-purple-800 border-purple-200" },
  entregue: { label: "Entregue", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
};

export default function PartnerDashboard() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PartnerSidebar />
        <main className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
          {/* Header */}
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
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Pedidos do Mês</p>
                    <p className="text-2xl font-bold text-foreground mt-1">12</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-xs text-emerald-600 font-medium">+18%</span>
                  <span className="text-xs text-muted-foreground">vs mês anterior</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Faturamento</p>
                    <p className="text-2xl font-bold text-foreground mt-1">R$ 8.450</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-xs text-emerald-600 font-medium">+25%</span>
                  <span className="text-xs text-muted-foreground">vs mês anterior</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Pendentes</p>
                    <p className="text-2xl font-bold text-foreground mt-1">3</p>
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
                    <p className="text-2xl font-bold text-foreground mt-1">24</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Package className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">142 visualizações</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Pedidos Recentes</CardTitle>
                <Button variant="outline" size="sm" className="text-xs">
                  Ver todos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockOrders.map((order) => {
                  const s = statusConfig[order.status];
                  return (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{order.event}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{order.items}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${s.color}`}>
                          {s.label}
                        </Badge>
                        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                          R$ {order.value.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
}