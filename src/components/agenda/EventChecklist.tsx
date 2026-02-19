import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Loader2, GripVertical } from "lucide-react";

interface ChecklistItem {
  id: string;
  title: string;
  is_completed: boolean;
  sort_order: number;
}

interface EventChecklistProps {
  eventId: string;
  companyId: string;
}

export function EventChecklist({ eventId, companyId }: EventChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("event_checklist_items")
      .select("id, title, is_completed, sort_order")
      .eq("event_id", eventId)
      .order("sort_order");
    setItems((data as ChecklistItem[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [eventId]);

  const toggleItem = async (item: ChecklistItem) => {
    const newCompleted = !item.is_completed;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_completed: newCompleted } : i))
    );
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("event_checklist_items")
      .update({
        is_completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
        completed_by: newCompleted ? user?.id || null : null,
      })
      .eq("id", item.id);
  };

  const addItem = async () => {
    if (!newTask.trim()) return;
    setAdding(true);
    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
    const { data } = await supabase
      .from("event_checklist_items")
      .insert({
        event_id: eventId,
        company_id: companyId,
        title: newTask.trim(),
        sort_order: maxOrder,
      })
      .select("id, title, is_completed, sort_order")
      .single();
    if (data) setItems((prev) => [...prev, data as ChecklistItem]);
    setNewTask("");
    setAdding(false);
  };

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("event_checklist_items").delete().eq("id", id);
  };

  const completed = items.filter((i) => i.is_completed).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando checklist...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Checklist {total > 0 ? `(${completed}/${total})` : ""}
        </p>
        {total > 0 && (
          <span className="text-xs font-semibold text-primary">{pct}%</span>
        )}
      </div>

      {total > 0 && (
        <Progress value={pct} className="h-2 rounded-full" />
      )}

      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2.5 group py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              checked={item.is_completed}
              onCheckedChange={() => toggleItem(item)}
            />
            <span
              className={`text-sm flex-1 transition-colors ${
                item.is_completed ? "line-through text-muted-foreground" : "text-foreground"
              }`}
            >
              {item.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
              onClick={() => deleteItem(item.id)}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nova tarefa..."
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          className="h-8 text-sm rounded-lg"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0 rounded-lg"
          onClick={addItem}
          disabled={adding || !newTask.trim()}
        >
          {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}
