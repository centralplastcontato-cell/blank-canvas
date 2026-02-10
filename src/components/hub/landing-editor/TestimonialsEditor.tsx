import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Star } from "lucide-react";
import { LPTestimonials, LPTestimonialItem } from "@/types/landing-page";

interface TestimonialsEditorProps {
  data: LPTestimonials;
  onChange: (data: LPTestimonials) => void;
}

export function TestimonialsEditor({ data, onChange }: TestimonialsEditorProps) {
  const addItem = () => {
    onChange({
      ...data,
      items: [...data.items, { name: "", text: "", rating: 5 }],
    });
  };

  const updateItem = (index: number, updated: Partial<LPTestimonialItem>) => {
    const items = [...data.items];
    items[index] = { ...items[index], ...updated };
    onChange({ ...data, items });
  };

  const removeItem = (index: number) => {
    onChange({ ...data, items: data.items.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Seção ativa</Label>
        <Switch
          checked={data.enabled}
          onCheckedChange={(enabled) => onChange({ ...data, enabled })}
        />
      </div>

      <div>
        <Label>Título da seção</Label>
        <Input
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="Ex: O que nossos clientes dizem"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Depoimentos ({data.items.length})</Label>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>

        {data.items.map((item, i) => (
          <div key={i} className="p-3 border border-border rounded-lg space-y-2 bg-muted/30">
            <div className="flex items-center justify-between">
              <Input
                value={item.name}
                onChange={(e) => updateItem(i, { name: e.target.value })}
                placeholder="Nome do cliente"
                className="flex-1 mr-2"
              />
              <div className="flex items-center gap-1 mr-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 cursor-pointer ${
                      star <= item.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
                    }`}
                    onClick={() => updateItem(i, { rating: star })}
                  />
                ))}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              value={item.text}
              onChange={(e) => updateItem(i, { text: e.target.value })}
              placeholder="Texto do depoimento..."
              rows={2}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
