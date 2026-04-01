import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface ProductData {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductData | null;
  onSave: (data: Omit<ProductData, "id">) => Promise<void>;
  categories: string[];
}

const defaultCategories = ["Bolos", "Docinhos", "Salgados", "Especiais", "Combos", "Bebidas"];

export function ProductFormDialog({ open, onOpenChange, product, onSave, categories }: ProductFormDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("geral");
  const [imageUrl, setImageUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const allCategories = [...new Set([...defaultCategories, ...categories])];

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || "");
      setPrice(product.price.toString());
      setCategory(product.category);
      setImageUrl(product.image_url || "");
    } else {
      setName("");
      setDescription("");
      setPrice("");
      setCategory("geral");
      setImageUrl("");
    }
  }, [product, open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price) || 0,
        category,
        image_url: imageUrl.trim(),
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? "Editar Produto" : "Novo Produto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Bolo 3 andares" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição do produto..." rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preço (R$)</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" min="0" step="0.01" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Geral</SelectItem>
                  {allCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>URL da Imagem</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {product ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
