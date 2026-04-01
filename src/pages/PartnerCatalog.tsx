import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PartnerSidebar } from "@/components/partner/PartnerSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit2, Eye, EyeOff, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mockCatalog = [
  { id: 1, name: "Bolo 3 Andares Personalizado", category: "Bolos", price: 450, active: true, image: "🎂" },
  { id: 2, name: "Bolo Redondo Tradicional", category: "Bolos", price: 180, active: true, image: "🍰" },
  { id: 3, name: "Bolo Temático Infantil", category: "Bolos", price: 350, active: true, image: "🎂" },
  { id: 4, name: "Cento de Brigadeiro Gourmet", category: "Docinhos", price: 120, active: true, image: "🍫" },
  { id: 5, name: "Cento de Beijinho", category: "Docinhos", price: 100, active: true, image: "🥥" },
  { id: 6, name: "Cento de Cajuzinho", category: "Docinhos", price: 110, active: false, image: "🥜" },
  { id: 7, name: "Torre de Cupcakes (30 un)", category: "Especiais", price: 280, active: true, image: "🧁" },
  { id: 8, name: "Mesa de Doces Completa", category: "Combos", price: 1500, active: true, image: "🍬" },
];

const categories = ["Todos", "Bolos", "Docinhos", "Especiais", "Combos"];

export default function PartnerCatalog() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");

  const filtered = mockCatalog.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Todos" || item.category === category;
    return matchSearch && matchCat;
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PartnerSidebar />
        <main className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Catálogo</h1>
              <p className="text-muted-foreground text-sm">{filtered.length} produtos cadastrados</p>
            </div>
            <Button className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              Novo Produto
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={category === cat ? "default" : "outline"}
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((item) => (
              <Card key={item.id} className={`group hover:shadow-md transition-all ${!item.active ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center text-2xl">
                      {item.image}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2 text-xs">
                          <Edit2 className="h-3.5 w-3.5" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-xs">
                          {item.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          {item.active ? "Desativar" : "Ativar"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className="font-semibold text-sm text-foreground leading-tight">{item.name}</h3>

                  <div className="flex items-center justify-between mt-3">
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-muted/50">
                      {item.category}
                    </Badge>
                    <span className="font-bold text-sm text-primary">
                      R$ {item.price.toLocaleString('pt-BR')}
                    </span>
                  </div>

                  {!item.active && (
                    <Badge variant="secondary" className="mt-2 text-[10px]">Inativo</Badge>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Add Product Card */}
            <Card className="border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
              <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[180px]">
                <div className="h-12 w-12 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-sm text-muted-foreground mt-2 group-hover:text-primary transition-colors">Adicionar Produto</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}