import { useState, useEffect, useCallback } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PartnerThemeProvider } from "@/components/partner/PartnerThemeProvider";
import { PartnerSidebar } from "@/components/partner/PartnerSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Edit2, Eye, EyeOff, MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";
import { ProductFormDialog } from "@/components/partner/ProductFormDialog";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  is_active: boolean;
}

export default function PartnerCatalog() {
  const { currentCompanyId } = useCompany();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!currentCompanyId) return;
    setIsLoading(true);
    const { data } = await supabase
      .from("partner_products")
      .select("*")
      .eq("company_id", currentCompanyId)
      .order("sort_order")
      .order("created_at", { ascending: false });
    setProducts((data || []) as Product[]);
    setIsLoading(false);
  }, [currentCompanyId]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const categories = ["Todos", ...new Set(products.map((p) => p.category).filter((c) => c !== "geral"))];

  const filtered = products.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Todos" || item.category === category;
    return matchSearch && matchCat;
  });

  const handleSave = async (data: { name: string; description: string; price: number; category: string; image_url: string }) => {
    if (!currentCompanyId) return;

    if (editingProduct) {
      const { error } = await supabase
        .from("partner_products")
        .update({ ...data })
        .eq("id", editingProduct.id);
      if (error) throw error;
      toast({ title: "Produto atualizado!" });
    } else {
      const { error } = await supabase
        .from("partner_products")
        .insert({ ...data, company_id: currentCompanyId });
      if (error) throw error;
      toast({ title: "Produto criado!" });
    }
    setEditingProduct(null);
    fetchProducts();
  };

  const toggleActive = async (product: Product) => {
    await supabase
      .from("partner_products")
      .update({ is_active: !product.is_active })
      .eq("id", product.id);
    fetchProducts();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("partner_products").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    toast({ title: "Produto excluído." });
    fetchProducts();
  };

  const getCategoryEmoji = (cat: string) => {
    const map: Record<string, string> = { Bolos: "🎂", Docinhos: "🍫", Salgados: "🥟", Especiais: "🧁", Combos: "🍬", Bebidas: "🥤" };
    return map[cat] || "📦";
  };

  return (
    <PartnerThemeProvider>
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PartnerSidebar />
        <main className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Catálogo</h1>
                <p className="text-muted-foreground text-sm">{filtered.length} produtos</p>
              </div>
            </div>
            <Button className="gap-2 rounded-xl shadow-sm" onClick={() => { setEditingProduct(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" /> Novo Produto
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <Button key={cat} variant={category === cat ? "default" : "outline"} size="sm" className="rounded-full text-xs" onClick={() => setCategory(cat)}>
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-44" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((item) => (
                  <Card key={item.id} className={`group hover:shadow-md transition-all hover:border-primary/40 ${!item.is_active ? "opacity-60" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center text-2xl">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="h-14 w-14 rounded-xl object-cover" />
                        ) : getCategoryEmoji(item.category)}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => { setEditingProduct(item); setFormOpen(true); }}>
                            <Edit2 className="h-3.5 w-3.5" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => toggleActive(item)}>
                            {item.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            {item.is_active ? "Desativar" : "Ativar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-xs text-destructive" onClick={() => setDeleteTarget(item)}>
                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <h3 className="font-semibold text-sm text-foreground leading-tight">{item.name}</h3>
                    {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                    <div className="flex items-center justify-between mt-3">
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20">{item.category}</Badge>
                      <span className="font-bold text-sm text-primary">
                        R$ {Number(item.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {!item.is_active && <Badge variant="secondary" className="mt-2 text-[10px]">Inativo</Badge>}
                  </CardContent>
                </Card>
              ))}

              <Card className="border-dashed border-2 hover:border-primary/60 hover:bg-primary/10 transition-all cursor-pointer group" onClick={() => { setEditingProduct(null); setFormOpen(true); }}>
                <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[180px]">
                  <div className="h-12 w-12 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                    <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 group-hover:text-primary transition-colors">Adicionar Produto</p>
                </CardContent>
              </Card>
            </div>
          )}

          <ProductFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            product={editingProduct ? { ...editingProduct, description: editingProduct.description || "", image_url: editingProduct.image_url || "" } : null}
            onSave={handleSave}
            categories={[...new Set(products.map((p) => p.category).filter((c) => c !== "geral"))]}
          />

          <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                <AlertDialogDescription>
                  O produto "{deleteTarget?.name}" será removido permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </SidebarProvider>
    </PartnerThemeProvider>
  );
}
