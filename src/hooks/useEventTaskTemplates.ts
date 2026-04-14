import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";

export interface EventTaskTemplateItem {
  title: string;
  category: string;
  priority: string;
  days_before_event: number;
}

export interface EventTaskTemplate {
  id: string;
  company_id: string;
  name: string;
  is_active: boolean;
  items: EventTaskTemplateItem[];
  created_at: string;
  updated_at: string;
}

export function useEventTaskTemplates() {
  const { currentCompany } = useCompany();
  const [templates, setTemplates] = useState<EventTaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("event_task_templates")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching event task templates:", error);
    } else {
      setTemplates(
        (data || []).map((d: any) => ({
          ...d,
          items: Array.isArray(d.items) ? d.items : [],
        }))
      );
    }
    setLoading(false);
  }, [currentCompany?.id]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (name: string, items: EventTaskTemplateItem[]) => {
    if (!currentCompany?.id) return;
    const { error } = await supabase.from("event_task_templates").insert({
      company_id: currentCompany.id,
      name,
      items: items as any,
    } as any);
    if (error) {
      toast({ title: "Erro ao criar template", variant: "destructive" });
    } else {
      toast({ title: "Template criado!" });
      fetchTemplates();
    }
  };

  const updateTemplate = async (id: string, data: Partial<{ name: string; is_active: boolean; items: EventTaskTemplateItem[] }>) => {
    const { error } = await supabase.from("event_task_templates").update(data as any).eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    } else {
      fetchTemplates();
    }
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from("event_task_templates").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Template excluído" });
      fetchTemplates();
    }
  };

  const generateTasksForEvent = async (
    eventId: string,
    eventDate: string,
    companyId: string,
    userId: string
  ) => {
    // Get active templates
    const { data: activeTemplates } = await supabase
      .from("event_task_templates")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true);

    if (!activeTemplates || activeTemplates.length === 0) return 0;

    let created = 0;
    const eventDateObj = new Date(eventDate + "T00:00:00");

    for (const template of activeTemplates) {
      const items: EventTaskTemplateItem[] = Array.isArray(template.items) ? template.items : [];
      
      for (const item of items) {
        const dueDate = new Date(eventDateObj);
        dueDate.setDate(dueDate.getDate() - (item.days_before_event || 0));
        const dueDateStr = dueDate.toISOString().split("T")[0];

        const { error } = await supabase.from("company_tasks").insert({
          company_id: companyId,
          title: item.title,
          category: item.category || "evento",
          priority: item.priority || "media",
          due_date: dueDateStr,
          event_id: eventId,
          created_by: userId,
          status: "pendente",
        } as any);

        if (!error) created++;
      }
    }

    if (created > 0) {
      toast({ title: `${created} tarefa${created > 1 ? "s" : ""} gerada${created > 1 ? "s" : ""} automaticamente!` });
    }

    return created;
  };

  return { templates, loading, createTemplate, updateTemplate, deleteTemplate, generateTasksForEvent, fetchTemplates };
}
