import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Settings2, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useEventTaskTemplates, type EventTaskTemplateItem } from "@/hooks/useEventTaskTemplates";
import { TASK_CATEGORIES, TASK_PRIORITIES } from "@/hooks/useTasks";

export function EventTaskTemplateManager() {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate } = useEventTaskTemplates();
  const [expanded, setExpanded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [items, setItems] = useState<EventTaskTemplateItem[]>([
    { title: "", category: "evento", priority: "media", days_before_event: 3 },
  ]);

  const addItem = () => {
    setItems([...items, { title: "", category: "evento", priority: "media", days_before_event: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof EventTaskTemplateItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleCreate = () => {
    if (!name.trim() || items.every((i) => !i.title.trim())) return;
    createTemplate(name, items.filter((i) => i.title.trim()));
    setDialogOpen(false);
    setName("");
    setItems([{ title: "", category: "evento", priority: "media", days_before_event: 3 }]);
  };

  return (
    <Card className="border-border/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Settings2 className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold">Templates de Tarefas por Evento</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <CardContent className="pt-0 pb-4 px-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Configure tarefas que serão criadas automaticamente ao registrar um novo evento.
          </p>

          {templates.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground italic">Nenhum template cadastrado.</p>
          )}

          {templates.map((t) => (
            <div key={t.id} className="p-3 rounded-lg border border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t.name}</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={t.is_active}
                    onCheckedChange={(v) => updateTemplate(t.id, { is_active: v })}
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTemplate(t.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                {t.items.map((item, i) => (
                  <div key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="flex-1">• {item.title}</span>
                    <span>{item.days_before_event}d antes</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo template
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Template de Tarefas</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome do template</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Checklist Festa Infantil" />
                </div>

                <div className="space-y-3">
                  <Label>Tarefas</Label>
                  {items.map((item, i) => (
                    <div key={i} className="p-3 rounded-lg border border-border/40 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          className="flex-1 h-8 text-xs"
                          value={item.title}
                          onChange={(e) => updateItem(i, "title", e.target.value)}
                          placeholder="Título da tarefa"
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeItem(i)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Select value={item.category} onValueChange={(v) => updateItem(i, "category", v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TASK_CATEGORIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={item.priority} onValueChange={(v) => updateItem(i, "priority", v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TASK_PRIORITIES.map((p) => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            className="h-8 text-xs w-14"
                            value={item.days_before_event}
                            onChange={(e) => updateItem(i, "days_before_event", parseInt(e.target.value) || 0)}
                            min={0}
                          />
                          <span className="text-[10px] text-muted-foreground">dias antes</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full" onClick={addItem}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar tarefa
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={!name.trim()}>Criar template</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      )}
    </Card>
  );
}
