import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Clock, Forward, Zap, Plus, Trash2, Phone, Shield, Beaker, Power, Loader2, MessageSquare, Save, RotateCcw, Images, Video, FileText, Send, RefreshCw, GitBranch, Map, GripVertical, Workflow, Globe2 } from "lucide-react";
import { LPBotSection } from "./LPBotSection";
import { FreelancerApprovalMessageCard } from "./FreelancerApprovalMessageCard";
import { ScheduleGroupMessageCard } from "./ScheduleGroupMessageCard";
import { AssignmentGroupMessageCard } from "./AssignmentGroupMessageCard";
import { GroupMessageDelayCard } from "./GroupMessageDelayCard";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { FlowListManager } from "@/components/flowbuilder/FlowListManager";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BotJourneyDiagram } from "./BotJourneyDiagram";
import { PartyBotMessagesCard } from "./PartyBotMessagesCard";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface WapiInstance {
  id: string;
  instance_id: string;
  unit: string | null;
  status: string | null;
}

interface BotSettings {
  id: string;
  instance_id: string;
  bot_enabled: boolean;
  test_mode_enabled: boolean;
  test_mode_number: string | null;
  welcome_message: string;
  completion_message: string | null;
  transfer_message: string | null;
  work_here_response: string | null;
  qualified_lead_message: string | null;
  next_step_question: string | null;
  next_step_visit_response: string | null;
  next_step_questions_response: string | null;
  next_step_analyze_response: string | null;
  auto_send_materials: boolean;
  auto_send_photos: boolean;
  auto_send_presentation_video: boolean;
  auto_send_promo_video: boolean;
  auto_send_pdf: boolean;
  auto_send_photos_intro: string | null;
  auto_send_pdf_intro: string | null;
  message_delay_seconds: number;
  guest_limit: number | null;
  guest_limit_message: string | null;
  guest_limit_redirect_name: string | null;
  redirect_completion_message?: string | null;
  follow_up_enabled: boolean;
  follow_up_delay_hours: number;
  follow_up_message: string | null;
  follow_up_2_enabled: boolean;
  follow_up_2_delay_hours: number;
  follow_up_2_message: string | null;
  follow_up_3_enabled: boolean;
  follow_up_3_delay_hours: number;
  follow_up_3_message: string | null;
  follow_up_4_enabled: boolean;
  follow_up_4_delay_hours: number;
  follow_up_4_message: string | null;
  auto_lost_enabled: boolean;
  auto_lost_delay_hours: number;
  next_step_reminder_enabled: boolean;
  next_step_reminder_delay_minutes: number;
  next_step_reminder_message: string | null;
  bot_inactive_followup_enabled: boolean;
  bot_inactive_followup_delay_minutes: number;
  bot_inactive_followup_message: string | null;
  use_flow_builder: boolean;
}

interface VipNumber {
  id: string;
  instance_id: string;
  phone: string;
  name: string | null;
  reason: string | null;
}

interface BotQuestion {
  id: string;
  instance_id: string;
  step: string;
  question_text: string;
  confirmation_text: string | null;
  sort_order: number;
  is_active: boolean;
}

const DEFAULT_QUESTIONS = [
  { step: 'nome', question_text: 'Para começar, me conta: qual é o seu nome? 👑', confirmation_text: 'Muito prazer, {nome}! 👑✨', sort_order: 1 },
  { step: 'tipo', question_text: 'Você já é nosso cliente ou gostaria de receber um orçamento? 😊\n\n1️⃣ Já sou cliente\n2️⃣ Quero um orçamento', confirmation_text: null, sort_order: 2 },
  { step: 'mes', question_text: 'Que legal! 🎉 E pra qual mês você tá pensando em fazer essa festa incrível?\n\n📅 Ex: Fevereiro, Março, Abril...', confirmation_text: '{mes}, ótima escolha! 🎊', sort_order: 3 },
  { step: 'dia', question_text: 'Maravilha! Tem preferência de dia da semana? 🗓️\n\n• Segunda a Quinta\n• Sexta\n• Sábado\n• Domingo', confirmation_text: 'Anotado!', sort_order: 4 },
  { step: 'convidados', question_text: 'E quantos convidados você pretende chamar pra essa festa mágica? 🎈\n\n👥 Ex: 50, 70, 100 pessoas...', confirmation_text: null, sort_order: 5 },
];

const SELECTED_INSTANCE_KEY = 'selected_automation_instance_id';

interface SortableQuestionItemProps {
  question: BotQuestion;
  index: number;
  getStepLabel: (step: string) => string;
  updateQuestion: (index: number, field: keyof BotQuestion, value: string | boolean | null) => void;
}

function SortableQuestionItem({ question, index, getStepLabel, updateQuestion }: SortableQuestionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={question.id}>
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted text-muted-foreground touch-none"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${question.is_active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {index + 1}
            </span>
            <span className={question.is_active ? '' : 'text-muted-foreground line-through'}>
              {getStepLabel(question.step)}
            </span>
            {!question.is_active && (
              <Badge variant="secondary" className="text-xs">Desativada</Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Pergunta ativa</Label>
            <Switch
              checked={question.is_active}
              onCheckedChange={(checked) => updateQuestion(index, 'is_active', checked)}
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm">Pergunta</Label>
            <Textarea
              value={question.question_text}
              onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
              className="min-h-[200px] text-base"
              placeholder="Digite a pergunta..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">
              Confirmação <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Mensagem exibida após a resposta. Use {`{${question.step}}`} para incluir a resposta.
            </p>
            <Input
              value={question.confirmation_text || ""}
              onChange={(e) => updateQuestion(index, 'confirmation_text', e.target.value || null)}
              placeholder={`Ex: Muito prazer, {${question.step}}! 👑`}
              className="text-base"
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}

export function AutomationsSection() {
  const modules = useCompanyModules();
  const { currentCompanyId } = useCompany();
  const [instances, setInstances] = useState<WapiInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<WapiInstance | null>(null);
  const [botSettings, setBotSettings] = useState<BotSettings | null>(null);
  const [vipNumbers, setVipNumbers] = useState<VipNumber[]>([]);
  const [botQuestions, setBotQuestions] = useState<BotQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  
  const [showAddVipDialog, setShowAddVipDialog] = useState(false);
  const [newVipPhone, setNewVipPhone] = useState("");
  const [newVipName, setNewVipName] = useState("");
  const [newVipReason, setNewVipReason] = useState("");
  const [isAddingVip, setIsAddingVip] = useState(false);
  const [autoRotateMonths, setAutoRotateMonths] = useState(false);
  const [isTogglingRotate, setIsTogglingRotate] = useState(false);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = botQuestions.findIndex(q => q.id === active.id);
    const newIndex = botQuestions.findIndex(q => q.id === over.id);
    
    const reordered = arrayMove(botQuestions, oldIndex, newIndex).map((q, i) => ({
      ...q,
      sort_order: i + 1,
    }));
    setBotQuestions(reordered);
  };

  const debouncedUpdateBotSettings = (key: string, updates: Partial<BotSettings>, delay = 1000) => {
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(() => {
      updateBotSettings(updates);
    }, delay);
  };

  useEffect(() => {
    fetchInstances();
  }, [currentCompanyId]);

  useEffect(() => {
    if (selectedInstance) {
      fetchBotSettings();
      fetchVipNumbers();
      fetchBotQuestions();
      fetchAutoRotate();
    }
  }, [selectedInstance]);

  const fetchAutoRotate = async () => {
    if (!currentCompanyId) return;
    const { data } = await supabase
      .from('lp_bot_settings')
      .select('auto_rotate_months')
      .eq('company_id', currentCompanyId)
      .maybeSingle();
    setAutoRotateMonths((data as any)?.auto_rotate_months ?? false);
  };

  const toggleAutoRotate = async (checked: boolean) => {
    if (!currentCompanyId) return;
    setIsTogglingRotate(true);
    setAutoRotateMonths(checked);

    const { data: existing } = await supabase
      .from('lp_bot_settings')
      .select('id')
      .eq('company_id', currentCompanyId)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from('lp_bot_settings')
        .update({ auto_rotate_months: checked } as any)
        .eq('company_id', currentCompanyId));
    } else {
      ({ error } = await supabase
        .from('lp_bot_settings')
        .insert({ company_id: currentCompanyId, auto_rotate_months: checked } as any));
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      setAutoRotateMonths(!checked);
    } else {
      toast({ title: checked ? "Rotação ativada" : "Rotação desativada" });
    }
    setIsTogglingRotate(false);
  };

  const fetchInstances = async () => {
    let query = supabase
      .from("wapi_instances")
      .select("id, instance_id, unit, status")
      .order("unit", { ascending: true });

    if (currentCompanyId) {
      query = query.eq("company_id", currentCompanyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching instances:", error);
      return;
    }

    if (data && data.length > 0) {
      setInstances(data);
      
      // Try to restore previously selected instance
      const savedInstanceId = localStorage.getItem(SELECTED_INSTANCE_KEY);
      const savedInstance = savedInstanceId ? data.find(i => i.id === savedInstanceId) : null;
      setSelectedInstance(savedInstance || data[0]);
    } else {
      setInstances([]);
      setSelectedInstance(null);
    }
    setIsLoading(false);
  };

  const fetchBotSettings = async () => {
    if (!selectedInstance) return;

    const { data, error } = await supabase
      .from("wapi_bot_settings")
      .select("*")
      .eq("instance_id", selectedInstance.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching bot settings:", error);
      return;
    }

    if (data) {
      setBotSettings(data);
    } else {
      const { data: newSettings, error: createError } = await supabase
        .from("wapi_bot_settings")
        .insert({
          instance_id: selectedInstance.id,
          bot_enabled: false,
          test_mode_enabled: false,
          test_mode_number: null,
          welcome_message: "Olá! 👋 Bem-vindo ao {{empresa}}! Para podermos te ajudar melhor, preciso de algumas informações.",
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating bot settings:", createError);
      } else {
        setBotSettings(newSettings);
      }
    }
  };

  const fetchVipNumbers = async () => {
    if (!selectedInstance) return;

    const { data, error } = await supabase
      .from("wapi_vip_numbers")
      .select("*")
      .eq("instance_id", selectedInstance.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching VIP numbers:", error);
      return;
    }

    setVipNumbers(data || []);
  };

  const fetchBotQuestions = async () => {
    if (!selectedInstance) return;

    const { data, error } = await supabase
      .from("wapi_bot_questions")
      .select("*")
      .eq("instance_id", selectedInstance.id)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching bot questions:", error);
      return;
    }

    // Auto-populate default questions if none exist
    if (!data || data.length === 0) {
      const inserts = DEFAULT_QUESTIONS.map(q => ({
        ...q,
        instance_id: selectedInstance.id,
        company_id: currentCompanyId,
        is_active: true,
      }));

      const { data: inserted, error: insertError } = await supabase
        .from("wapi_bot_questions")
        .insert(inserts)
        .select();

      if (insertError) {
        console.error("Error auto-inserting default questions:", insertError);
        setBotQuestions([]);
      } else {
        setBotQuestions(inserted || []);
        toast({
          title: "Perguntas padrão criadas",
          description: "As perguntas padrão foram inseridas automaticamente. Edite-as conforme necessário.",
        });
      }
      return;
    }

    setBotQuestions(data);
  };

  const updateBotSettings = async (updates: Partial<BotSettings>) => {
    if (!botSettings) return;

    setIsSaving(true);

    const { error } = await supabase
      .from("wapi_bot_settings")
      .update(updates)
      .eq("id", botSettings.id);

    if (error) {
      console.error("Error updating bot settings:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar as configurações.",
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }

    // PHASE 3: Read-after-write verification — confirm the DB actually persisted the change
    const { data: verified, error: readError } = await supabase
      .from("wapi_bot_settings")
      .select("*")
      .eq("id", botSettings.id)
      .single();

    if (readError || !verified) {
      console.error("Read-after-write failed:", readError);
      toast({
        title: "⚠️ Salvo com ressalva",
        description: "A alteração foi enviada, mas não foi possível confirmar a persistência. Recarregue a página para verificar.",
        variant: "destructive",
      });
      setBotSettings({ ...botSettings, ...updates });
    } else {
      // Use the verified data from DB, not the optimistic update
      setBotSettings(verified);
      
      // Check if the critical fields actually match what we sent
      const criticalKeys = ['bot_enabled', 'test_mode_enabled', 'test_mode_number'] as const;
      const mismatches = criticalKeys.filter(key => 
        key in updates && (verified as any)[key] !== (updates as any)[key]
      );
      
      if (mismatches.length > 0) {
        console.error("Read-after-write MISMATCH:", mismatches.map(k => `${k}: sent=${(updates as any)[k]} got=${(verified as any)[k]}`));
        toast({
          title: "⚠️ Inconsistência detectada",
          description: `Os campos ${mismatches.join(', ')} não foram salvos corretamente. Tente novamente.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "✅ Configurações salvas",
          description: "Verificado: as alterações foram persistidas com sucesso.",
        });
      }
    }

    setIsSaving(false);
  };

  const updateQuestion = (index: number, field: keyof BotQuestion, value: string | boolean | null) => {
    const updated = [...botQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setBotQuestions(updated);
  };

  const saveQuestions = async () => {
    if (!selectedInstance) return;
    setIsSavingQuestions(true);

    try {
      for (const question of botQuestions) {
        const { error } = await supabase
          .from("wapi_bot_questions")
          .update({
            question_text: question.question_text,
            confirmation_text: question.confirmation_text,
            is_active: question.is_active,
            sort_order: question.sort_order,
            company_id: currentCompanyId,
          })
          .eq("id", question.id);

        if (error) throw error;
      }

      toast({
        title: "Perguntas salvas",
        description: "As perguntas do bot foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Error saving questions:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as perguntas.",
        variant: "destructive",
      });
    }

    setIsSavingQuestions(false);
  };

  const resetQuestions = async () => {
    if (!selectedInstance) return;
    setIsSavingQuestions(true);

    try {
      // 1. Capture old question IDs before any mutation
      const oldIds = botQuestions.map(q => q.id);

      // 2. Insert new default questions FIRST
      const newQuestions = DEFAULT_QUESTIONS.map(q => ({
        ...q,
        instance_id: selectedInstance.id,
        company_id: currentCompanyId,
        is_active: true,
      }));

      const { data, error } = await supabase
        .from("wapi_bot_questions")
        .insert(newQuestions)
        .select();

      if (error) throw error;

      // 3. Only delete old questions AFTER successful insert
      if (oldIds.length > 0) {
        await supabase
          .from("wapi_bot_questions")
          .delete()
          .in("id", oldIds);
      }

      setBotQuestions(data || []);
      toast({
        title: "Perguntas restauradas",
        description: "As perguntas padrão foram restauradas com sucesso.",
      });
    } catch (error) {
      console.error("Error resetting questions:", error);
      toast({
        title: "Erro ao restaurar",
        description: "Não foi possível restaurar as perguntas padrão. As perguntas anteriores foram mantidas.",
        variant: "destructive",
      });
    }

    setIsSavingQuestions(false);
  };

  const addVipNumber = async () => {
    if (!selectedInstance || !newVipPhone.trim()) return;

    setIsAddingVip(true);

    const normalizedPhone = newVipPhone.replace(/\D/g, "");

    const { error } = await supabase
      .from("wapi_vip_numbers")
      .insert({
        instance_id: selectedInstance.id,
        phone: normalizedPhone,
        name: newVipName.trim() || null,
        reason: newVipReason.trim() || null,
      });

    if (error) {
      console.error("Error adding VIP number:", error);
      toast({
        title: "Erro ao adicionar",
        description: error.code === "23505" ? "Este número já está na lista VIP." : "Não foi possível adicionar o número.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Número adicionado",
        description: "O número foi adicionado à lista VIP.",
      });
      setNewVipPhone("");
      setNewVipName("");
      setNewVipReason("");
      setShowAddVipDialog(false);
      fetchVipNumbers();
    }

    setIsAddingVip(false);
  };

  const removeVipNumber = async (id: string) => {
    const { error } = await supabase
      .from("wapi_vip_numbers")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error removing VIP number:", error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover o número.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Número removido",
        description: "O número foi removido da lista VIP.",
      });
      fetchVipNumbers();
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.length === 13) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    } else if (phone.length === 12) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 8)}-${phone.slice(8)}`;
    }
    return phone;
  };

  const getStepLabel = (step: string) => {
    const labels: Record<string, string> = {
      nome: "Nome",
      tipo: "Tipo (Cliente/Orçamento)",
      mes: "Mês",
      dia: "Dia da Semana",
      convidados: "Convidados",
    };
    return labels[step] || step;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="bg-muted/50 rounded-lg p-6 text-center">
        <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">Nenhuma instância configurada</h3>
        <p className="text-sm text-muted-foreground">
          Configure uma instância do WhatsApp na aba "Conexão" para habilitar as automações.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Instance Selector */}
      {instances.length > 1 && (
        <div className="flex items-center gap-3">
          <Label className="shrink-0">Unidade:</Label>
          <Select
            value={selectedInstance?.id || ""}
            onValueChange={(value) => {
              const instance = instances.find((i) => i.id === value);
              if (instance) {
                setSelectedInstance(instance);
                localStorage.setItem(SELECTED_INSTANCE_KEY, instance.id);
              }
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione a unidade" />
            </SelectTrigger>
            <SelectContent>
              {instances.map((instance) => (
                <SelectItem key={instance.id} value={instance.id}>
                  {instance.unit || "Sem unidade"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="w-full flex overflow-x-auto h-auto flex-wrap gap-1 bg-muted/50 p-1">
          <TabsTrigger value="geral" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Power className="w-3.5 h-3.5" />
            <span>Geral</span>
          </TabsTrigger>
          <TabsTrigger value="perguntas" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Perguntas</span>
          </TabsTrigger>
          <TabsTrigger value="followups" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Follow-ups</span>
          </TabsTrigger>
          <TabsTrigger value="vip" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Shield className="w-3.5 h-3.5" />
            <span>VIP</span>
          </TabsTrigger>
          {modules.bot_festa && (
            <TabsTrigger value="festa" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Send className="w-3.5 h-3.5" />
              <span>Bot Festa</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="jornada" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Map className="w-3.5 h-3.5" />
            <span>Jornada</span>
          </TabsTrigger>
          {modules.flow_builder && (
            <TabsTrigger value="fluxos" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <GitBranch className="w-3.5 h-3.5" />
              <span>Fluxos</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="gatilhos" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Workflow className="w-3.5 h-3.5" />
            <span>Gatilhos</span>
          </TabsTrigger>
          <TabsTrigger value="bot-lp" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Globe2 className="w-3.5 h-3.5" />
            <span>Bot LP</span>
          </TabsTrigger>
        </TabsList>

        {/* ============ TAB: GERAL ============ */}
        <TabsContent value="geral" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Bot de Qualificação
              </CardTitle>
              <CardDescription>
                Qualifica leads automaticamente perguntando nome, mês, dia e número de convidados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Global Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-full shrink-0 ${botSettings?.bot_enabled ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
                    <Power className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm sm:text-base">Bot Global</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Ativa o bot para todos os novos contatos nesta unidade
                    </p>
                  </div>
                </div>
                <Switch
                  checked={botSettings?.bot_enabled || false}
                  onCheckedChange={(checked) => updateBotSettings({ bot_enabled: checked })}
                  disabled={isSaving}
                  className="shrink-0 self-end sm:self-auto"
                />
              </div>

              {/* Test Mode Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg border-dashed border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/10">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-full shrink-0 ${botSettings?.test_mode_enabled ? "bg-yellow-100 text-yellow-600" : "bg-muted text-muted-foreground"}`}>
                    <Beaker className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm sm:text-base flex flex-wrap items-center gap-2">
                      Modo de Teste
                      <Badge variant="outline" className="text-yellow-600 border-yellow-500 text-xs">Beta</Badge>
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Ativa o bot apenas para o número de teste (ignora toggle global)
                    </p>
                  </div>
                </div>
                <Switch
                  checked={botSettings?.test_mode_enabled || false}
                  onCheckedChange={(checked) => updateBotSettings({ test_mode_enabled: checked })}
                  disabled={isSaving}
                  className="shrink-0 self-end sm:self-auto"
                />
              </div>

              {/* Test Number Input */}
              {botSettings?.test_mode_enabled && (
                <div className="ml-2 sm:ml-4 p-3 sm:p-4 border-l-2 border-yellow-500 bg-yellow-50/30 dark:bg-yellow-950/5 rounded-r-lg">
                  <Label htmlFor="test-number" className="text-sm font-medium">Número de Teste</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    O bot será ativado apenas para este número, independente do toggle global
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="test-number"
                      placeholder="+55 15 98112-1710"
                      value={botSettings?.test_mode_number || ""}
                      onChange={(e) => setBotSettings({ ...botSettings, test_mode_number: e.target.value })}
                      className="flex-1 sm:max-w-[200px] text-base"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateBotSettings({ test_mode_number: botSettings?.test_mode_number })}
                      disabled={isSaving}
                      className="w-full sm:w-auto"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Status Summary */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Status atual:</span>
                {botSettings?.bot_enabled ? (
                  <Badge variant="default" className="bg-green-500">Bot Ativo para Todos</Badge>
                ) : botSettings?.test_mode_enabled ? (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-500">Apenas Modo Teste</Badge>
                ) : (
                  <Badge variant="secondary">Bot Desativado</Badge>
                )}
              </div>

              {/* Flow Builder Toggle */}
              {modules.flow_builder && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg border-dashed border-primary/50 bg-primary/5">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-full shrink-0 ${botSettings?.use_flow_builder ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <GitBranch className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm sm:text-base">Flow Builder</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Substituir bot fixo pelo fluxo visual personalizado
                      </p>
                      {botSettings?.use_flow_builder && (
                        <p className="text-xs text-primary mt-1">
                          ⚡ O fluxo padrão ativo será usado no lugar do bot de qualificação fixo
                        </p>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={botSettings?.use_flow_builder || false}
                    onCheckedChange={(checked) => updateBotSettings({ use_flow_builder: checked })}
                    disabled={isSaving}
                    className="shrink-0 self-end sm:self-auto"
                  />
                </div>
              )}

              {/* Message Delay Setting */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="p-2 rounded-full shrink-0 bg-muted text-muted-foreground">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm sm:text-base">Delay entre Mensagens</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Tempo de espera entre cada mensagem enviada pelo bot
                    </p>
                  </div>
                </div>
                <Select
                  value={String(botSettings?.message_delay_seconds || 5)}
                  onValueChange={(value) => updateBotSettings({ message_delay_seconds: parseInt(value) })}
                  disabled={isSaving}
                >
                  <SelectTrigger className="w-[120px] shrink-0">
                    <SelectValue placeholder="5 segundos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 segundos</SelectItem>
                    <SelectItem value="5">5 segundos</SelectItem>
                    <SelectItem value="10">10 segundos</SelectItem>
                    <SelectItem value="15">15 segundos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Guest Limit Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-full shrink-0 ${botSettings?.guest_limit ? "bg-amber-100 text-amber-600" : "bg-muted text-muted-foreground"}`}>
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm sm:text-base">Limite de Convidados</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Redireciona leads acima da capacidade para um buffet parceiro
                    </p>
                  </div>
                </div>
                <Switch
                  checked={!!botSettings?.guest_limit}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateBotSettings({ guest_limit: 91 });
                    } else {
                      updateBotSettings({ guest_limit: null, guest_limit_message: null, guest_limit_redirect_name: null, redirect_completion_message: null });
                    }
                  }}
                  disabled={isSaving}
                  className="shrink-0 self-end sm:self-auto"
                />
              </div>

              {botSettings?.guest_limit && (
                <div className="ml-2 sm:ml-4 p-3 sm:p-4 border-l-2 border-amber-500 bg-amber-50/30 dark:bg-amber-950/5 rounded-r-lg space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Limite máximo de convidados</Label>
                    <p className="text-xs text-muted-foreground mb-1">
                      Opções com número igual ou acima desse valor serão redirecionadas
                    </p>
                    <Input
                      type="number"
                      value={botSettings.guest_limit || ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : null;
                        setBotSettings(prev => prev ? { ...prev, guest_limit: val } : null);
                      }}
                      onBlur={() => botSettings && debouncedUpdateBotSettings('guest_limit', { guest_limit: botSettings.guest_limit }, 300)}
                      placeholder="Ex: 91"
                      className="max-w-[120px] text-base"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Mensagem de redirecionamento</Label>
                    <Textarea
                      value={botSettings.guest_limit_message || ''}
                      onChange={(e) => setBotSettings(prev => prev ? { ...prev, guest_limit_message: e.target.value } : null)}
                      onBlur={() => botSettings && debouncedUpdateBotSettings('guest_limit_message', { guest_limit_message: botSettings.guest_limit_message }, 300)}
                      placeholder="Ex: Nossa capacidade máxima é de 90 convidados..."
                      className="min-h-[80px] text-base"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Nome do buffet parceiro</Label>
                    <Input
                      value={botSettings.guest_limit_redirect_name || ''}
                      onChange={(e) => setBotSettings(prev => prev ? { ...prev, guest_limit_redirect_name: e.target.value } : null)}
                      onBlur={() => botSettings && debouncedUpdateBotSettings('guest_limit_redirect_name', { guest_limit_redirect_name: botSettings.guest_limit_redirect_name }, 300)}
                      placeholder="Ex: Buffet Mega Magic"
                      className="text-base"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Mensagem de conclusão</Label>
                    <p className="text-xs text-muted-foreground mb-1">
                      Mensagem final enviada ao lead após o redirecionamento
                    </p>
                    <Textarea
                      value={botSettings.redirect_completion_message || ''}
                      onChange={(e) => setBotSettings(prev => prev ? { ...prev, redirect_completion_message: e.target.value } : null)}
                      onBlur={() => botSettings && debouncedUpdateBotSettings('redirect_completion_message', { redirect_completion_message: botSettings.redirect_completion_message }, 300)}
                      placeholder="Ex: Prontinho! Seus dados foram encaminhados para o Buffet Mega Magic. Eles entrarão em contato em breve!"
                      className="min-h-[80px] text-base"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </TabsContent>

        {/* ============ TAB: PERGUNTAS ============ */}
        <TabsContent value="perguntas" className="space-y-6 mt-4">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-col gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    Perguntas do Bot
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    Personalize as perguntas que o bot faz para qualificar os leads
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetQuestions}
                    disabled={isSavingQuestions}
                    className="flex-1 sm:flex-none text-xs sm:text-sm"
                  >
                    <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Restaurar</span>
                    <span className="xs:hidden">Reset</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveQuestions}
                    disabled={isSavingQuestions || botQuestions.length === 0}
                    className="flex-1 sm:flex-none text-xs sm:text-sm"
                  >
                    {isSavingQuestions ? (
                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-1 sm:mr-2" />
                    ) : (
                      <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    )}
                    Salvar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Auto Rotate Months Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <RefreshCw className="w-4 h-4" />
                    Rotação Automática de Meses
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    No dia 1º de cada mês, remove o mês que passou e adiciona um novo mês futuro automaticamente
                  </p>
                </div>
                <Switch
                  checked={autoRotateMonths}
                  onCheckedChange={toggleAutoRotate}
                  disabled={isTogglingRotate}
                />
              </div>

              {botQuestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhuma pergunta configurada</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={resetQuestions}
                    disabled={isSavingQuestions}
                  >
                    Criar Perguntas Padrão
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Welcome Message */}
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">0</span>
                      Mensagem de Boas-vindas
                    </Label>
                    <Textarea
                      value={botSettings?.welcome_message || ""}
                      onChange={(e) => setBotSettings(prev => prev ? { ...prev, welcome_message: e.target.value } : null)}
                      onBlur={() => botSettings && updateBotSettings({ welcome_message: botSettings.welcome_message })}
                      className="min-h-[80px] text-base"
                      placeholder="Olá! 👋 Bem-vindo ao Castelo da Diversão!"
                    />
                  </div>

                  {/* Questions */}
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={botQuestions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                      <Accordion type="multiple" className="w-full">
                        {botQuestions.map((question, index) => (
                          <SortableQuestionItem
                            key={question.id}
                            question={question}
                            index={index}
                            getStepLabel={getStepLabel}
                            updateQuestion={updateQuestion}
                          />
                        ))}
                      </Accordion>
                    </SortableContext>
                  </DndContext>

                  {/* Transfer Message (for existing clients) */}
                  <div className="p-4 border rounded-lg bg-cyan-50/50 dark:bg-cyan-950/10 border-cyan-500/30">
                    <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs">
                        <Forward className="w-3 h-3" />
                      </span>
                      Mensagem de Transferência (Clientes)
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Mensagem enviada quando o lead diz que já é cliente. O bot para e transfere para a equipe. Use {`{nome}`} para incluir o nome.
                    </p>
                    <Textarea
                      value={botSettings?.transfer_message || "Entendido, {nome}! 🏰\n\nVou transferir sua conversa para nossa equipe comercial que vai te ajudar com sua festa.\n\nAguarde um momento, por favor! 👑"}
                      onChange={(e) => setBotSettings(prev => prev ? { ...prev, transfer_message: e.target.value } : null)}
                      onBlur={() => botSettings && updateBotSettings({ transfer_message: botSettings.transfer_message })}
                      className="min-h-[100px] text-base"
                      placeholder="Entendido, {nome}! Vou transferir..."
                    />
                  </div>

                  {/* Work Here Response */}
                  <div className="p-4 border rounded-lg bg-teal-50/50 dark:bg-teal-950/10 border-teal-500/30">
                    <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs">
                        👷
                      </span>
                      Mensagem de RH (Trabalhe Conosco)
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Mensagem enviada quando o lead escolhe a opção "Trabalhe Conosco". O bot para e o lead é enviado para a aba RH do CRM. Use {`{nome}`} para incluir o nome.
                    </p>
                    <Textarea
                      value={botSettings?.work_here_response || "Que legal que você quer fazer parte do nosso time! 💼✨\n\nEnvie seu currículo aqui nesta conversa e nossa equipe de RH vai analisar!\n\nObrigado pelo interesse! 😊"}
                      onChange={(e) => setBotSettings(prev => prev ? { ...prev, work_here_response: e.target.value } : null)}
                      onBlur={() => botSettings && updateBotSettings({ work_here_response: botSettings.work_here_response })}
                      className="min-h-[100px] text-base"
                      placeholder="Que legal que você quer fazer parte do nosso time! 💼✨..."
                    />
                  </div>

                  {/* Completion Message */}
                  <div className="p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/10 border-green-500/30">
                    <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</span>
                      Mensagem de Conclusão (Orçamento)
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Mensagem enviada ao finalizar a qualificação de quem quer orçamento. Use {`{nome}`}, {`{mes}`}, {`{dia}`} e {`{convidados}`} para incluir as respostas.
                    </p>
                    <Textarea
                      value={botSettings?.completion_message || "Perfeito, {nome}! 🏰✨\n\nAnotei tudo aqui:\n\n📅 Mês: {mes}\n🗓️ Dia: {dia}\n👥 Convidados: {convidados}\n\nNossa equipe vai entrar em contato em breve! 👑🎉"}
                      onChange={(e) => setBotSettings(prev => prev ? { ...prev, completion_message: e.target.value } : null)}
                      onBlur={() => botSettings && updateBotSettings({ completion_message: botSettings.completion_message })}
                      className="min-h-[120px] text-base"
                      placeholder="Perfeito, {nome}! 🏰✨..."
                    />
                  </div>

                  {/* Next Step Question */}
                  <div className="p-4 border rounded-lg bg-amber-50/50 dark:bg-amber-950/10 border-amber-500/30">
                    <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs">❓</span>
                      Pergunta do Próximo Passo
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Após a mensagem de conclusão, o bot pergunta como o lead quer continuar. Formato de menu numerado.
                    </p>
                    <Textarea
                      value={botSettings?.next_step_question || "E agora, como você gostaria de continuar? 🤔\n\nResponda com o *número*:\n\n*1* - Agendar visita\n*2* - Tirar dúvidas\n*3* - Analisar com calma"}
                      onChange={(e) => setBotSettings(prev => prev ? { ...prev, next_step_question: e.target.value } : null)}
                      onBlur={() => botSettings && updateBotSettings({ next_step_question: botSettings.next_step_question })}
                      className="min-h-[120px] text-base"
                      placeholder="E agora, como você gostaria de continuar? 🤔..."
                    />
                    
                    {/* Response for each option */}
                    <div className="mt-4 space-y-3 pl-3 border-l-2 border-amber-500/30">
                      <div>
                        <Label className="text-xs font-medium text-amber-700 dark:text-amber-400">Resposta: Agendar Visita (1)</Label>
                        <Textarea
                          value={botSettings?.next_step_visit_response || "Ótima escolha! 🏰✨\n\nNossa equipe vai entrar em contato para agendar sua visita ao Castelo da Diversão!\n\nAguarde um momento que já vamos te chamar! 👑"}
                          onChange={(e) => setBotSettings(prev => prev ? { ...prev, next_step_visit_response: e.target.value } : null)}
                          onBlur={() => botSettings && updateBotSettings({ next_step_visit_response: botSettings.next_step_visit_response })}
                          className="min-h-[120px] text-sm mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-amber-700 dark:text-amber-400">Resposta: Tirar Dúvidas (2)</Label>
                        <Textarea
                          value={botSettings?.next_step_questions_response || "Claro! 💬\n\nPode mandar sua dúvida aqui que nossa equipe vai te responder rapidinho!\n\nEstamos à disposição! 👑"}
                          onChange={(e) => setBotSettings(prev => prev ? { ...prev, next_step_questions_response: e.target.value } : null)}
                          onBlur={() => botSettings && updateBotSettings({ next_step_questions_response: botSettings.next_step_questions_response })}
                          className="min-h-[120px] text-sm mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-amber-700 dark:text-amber-400">Resposta: Analisar com Calma (3)</Label>
                        <Textarea
                          value={botSettings?.next_step_analyze_response || "Sem problemas! 📋\n\nVou enviar nossos materiais para você analisar com calma. Quando estiver pronto, é só chamar aqui!\n\nEstamos à disposição! 👑✨"}
                          onChange={(e) => setBotSettings(prev => prev ? { ...prev, next_step_analyze_response: e.target.value } : null)}
                          onBlur={() => botSettings && updateBotSettings({ next_step_analyze_response: botSettings.next_step_analyze_response })}
                          className="min-h-[120px] text-sm mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Qualified Lead Welcome Message (from LP) */}
                  <div className="p-4 border rounded-lg bg-purple-50/50 dark:bg-purple-950/10 border-purple-500/30">
                    <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs">🌐</span>
                      Boas-vindas para Leads do Site
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Mensagem automática enviada quando um lead que veio pela Landing Page (já qualificado) envia a primeira mensagem. Use {`{nome}`}, {`{mes}`}, {`{dia}`} e {`{convidados}`}.
                    </p>
                    <Textarea
                      value={botSettings?.qualified_lead_message || "Olá, {nome}! 👋\n\nRecebemos seu interesse pelo site e já temos seus dados aqui:\n\n📅 Mês: {mes}\n🗓️ Dia: {dia}\n👥 Convidados: {convidados}\n\nNossa equipe vai te responder em breve! 🏰✨"}
                      onChange={(e) => setBotSettings(prev => prev ? { ...prev, qualified_lead_message: e.target.value } : null)}
                      onBlur={() => botSettings && updateBotSettings({ qualified_lead_message: botSettings.qualified_lead_message })}
                      className="min-h-[120px] text-base"
                      placeholder="Olá, {nome}! 👋 Recebemos seu interesse..."
                    />
                  </div>

                  {/* Auto-Send Materials Section */}
                  <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/10 dark:to-purple-950/10 border-blue-500/30">
                    <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center text-xs">
                        <Send className="w-3 h-3" />
                      </span>
                      Envio Automático de Materiais
                    </Label>
                    <p className="text-xs text-muted-foreground mb-4">
                      Após a qualificação, o bot pode enviar automaticamente fotos, vídeos e o PDF do pacote
                    </p>

                    {/* Master Toggle */}
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-background/50 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${botSettings?.auto_send_materials ? "bg-green-100 text-green-600 dark:bg-green-950/50" : "bg-muted text-muted-foreground"}`}>
                          <Send className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Enviar Materiais Automaticamente</p>
                          <p className="text-xs text-muted-foreground">Ativa o envio de materiais após qualificação</p>
                        </div>
                      </div>
                      <Switch
                        checked={botSettings?.auto_send_materials ?? true}
                        onCheckedChange={(checked) => updateBotSettings({ auto_send_materials: checked } as Partial<BotSettings>)}
                        disabled={isSaving}
                      />
                    </div>

                    {/* Individual Material Toggles */}
                    {botSettings?.auto_send_materials && (
                      <div className="space-y-3 pl-2 border-l-2 border-blue-500/30 ml-3">
                        {/* Photos */}
                        <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-background/50 transition-colors">
                          <div className="flex items-center gap-2">
                            <Images className="w-4 h-4 text-blue-500" />
                            <span className="text-sm">Fotos da Unidade</span>
                          </div>
                          <Switch
                            checked={botSettings?.auto_send_photos ?? true}
                            onCheckedChange={(checked) => updateBotSettings({ auto_send_photos: checked } as Partial<BotSettings>)}
                            disabled={isSaving}
                          />
                        </div>

                        {/* Presentation Video */}
                        <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-background/50 transition-colors">
                          <div className="flex items-center gap-2">
                            <Video className="w-4 h-4 text-purple-500" />
                            <span className="text-sm">Vídeo de Apresentação</span>
                          </div>
                          <Switch
                            checked={botSettings?.auto_send_presentation_video ?? true}
                            onCheckedChange={(checked) => updateBotSettings({ auto_send_presentation_video: checked } as Partial<BotSettings>)}
                            disabled={isSaving}
                          />
                        </div>

                        {/* Promo Video */}
                        <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-background/50 transition-colors">
                          <div className="flex items-center gap-2">
                            <Video className="w-4 h-4 text-amber-500" />
                            <div>
                              <span className="text-sm">Vídeo da Promoção</span>
                              <p className="text-xs text-muted-foreground">Apenas para festas em Fev/Mar</p>
                            </div>
                          </div>
                          <Switch
                            checked={botSettings?.auto_send_promo_video ?? true}
                            onCheckedChange={(checked) => updateBotSettings({ auto_send_promo_video: checked } as Partial<BotSettings>)}
                            disabled={isSaving}
                          />
                        </div>

                        {/* PDF Package */}
                        <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-background/50 transition-colors">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-red-500" />
                            <div>
                              <span className="text-sm">PDF do Pacote</span>
                              <p className="text-xs text-muted-foreground">Baseado na qtde de convidados</p>
                            </div>
                          </div>
                          <Switch
                            checked={botSettings?.auto_send_pdf ?? true}
                            onCheckedChange={(checked) => updateBotSettings({ auto_send_pdf: checked } as Partial<BotSettings>)}
                            disabled={isSaving}
                          />
                        </div>

                        {/* Custom Messages */}
                        <div className="space-y-3 pt-3 border-t border-border/50">
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Mensagem antes das fotos</Label>
                            <Input
                              value={botSettings?.auto_send_photos_intro || "✨ Conheça nosso espaço incrível! 🏰🎉"}
                              onChange={(e) => setBotSettings(prev => prev ? { ...prev, auto_send_photos_intro: e.target.value } : null)}
                              onBlur={() => botSettings && updateBotSettings({ auto_send_photos_intro: botSettings.auto_send_photos_intro } as Partial<BotSettings>)}
                              className="text-sm"
                              placeholder="✨ Conheça nosso espaço..."
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Mensagem antes do PDF</Label>
                            <p className="text-xs text-muted-foreground">
                              Use {`{nome}`}, {`{convidados}`} e {`{unidade}`}
                            </p>
                            <Textarea
                              value={botSettings?.auto_send_pdf_intro || "📋 Oi {nome}! Segue o pacote completo para {convidados} na unidade {unidade}. Qualquer dúvida é só chamar! 💜"}
                              onChange={(e) => setBotSettings(prev => prev ? { ...prev, auto_send_pdf_intro: e.target.value } : null)}
                              onBlur={() => botSettings && updateBotSettings({ auto_send_pdf_intro: botSettings.auto_send_pdf_intro } as Partial<BotSettings>)}
                              className="text-sm min-h-[60px]"
                              placeholder="📋 Oi {nome}! Segue o pacote..."
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Floating Save Button for Mobile */}
                  <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-background via-background to-transparent -mx-4 px-4 sm:-mx-6 sm:px-6">
                    <Button
                      onClick={saveQuestions}
                      disabled={isSavingQuestions || botQuestions.length === 0}
                      className="w-full"
                      size="lg"
                    >
                      {isSavingQuestions ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ TAB: FOLLOW-UPS ============ */}
        <TabsContent value="followups" className="space-y-6 mt-4">
          {/* Lembrete de Próximos Passos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Lembrete de Próximos Passos
              </CardTitle>
              <CardDescription>
                Reenvia a pergunta de próximos passos se o lead não responder dentro do tempo configurado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-full shrink-0 ${botSettings?.next_step_reminder_enabled ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm sm:text-base">Lembrete ativo</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Envia uma mensagem automática se o lead não responder a pergunta de próximos passos
                    </p>
                  </div>
                </div>
                <Switch
                  checked={botSettings?.next_step_reminder_enabled ?? true}
                  onCheckedChange={(checked) => updateBotSettings({ next_step_reminder_enabled: checked })}
                  disabled={isSaving}
                  className="shrink-0 self-end sm:self-auto"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Tempo de espera</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={botSettings?.next_step_reminder_delay_minutes ?? 10}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(120, parseInt(e.target.value) || 10));
                      setBotSettings(prev => prev ? { ...prev, next_step_reminder_delay_minutes: val } : prev);
                      debouncedUpdateBotSettings('next_step_delay', { next_step_reminder_delay_minutes: val });
                    }}
                    onBlur={(e) => {
                      const val = Math.max(1, Math.min(120, parseInt(e.target.value) || 10));
                      setBotSettings(prev => prev ? { ...prev, next_step_reminder_delay_minutes: val } : prev);
                      if (debounceTimers.current['next_step_delay']) clearTimeout(debounceTimers.current['next_step_delay']);
                      updateBotSettings({ next_step_reminder_delay_minutes: val });
                    }}
                    className="w-24"
                    disabled={isSaving || !botSettings?.next_step_reminder_enabled}
                  />
                  <span className="text-sm text-muted-foreground">minutos</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Mensagem de lembrete</Label>
                <Textarea
                  value={botSettings?.next_step_reminder_message || "Oi {nome} estou por aqui escolha uma das opções.\n\n*1* - Agendar visita\n*2* - Tirar dúvidas\n*3* - Analisar com calma"}
                  onChange={(e) => {
                    setBotSettings(prev => prev ? { ...prev, next_step_reminder_message: e.target.value } : prev);
                  }}
                  onBlur={(e) => {
                    updateBotSettings({ next_step_reminder_message: e.target.value });
                  }}
                  className="min-h-[100px]"
                  disabled={isSaving || !botSettings?.next_step_reminder_enabled}
                />
                <p className="text-xs text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded">{"{nome}"}</code> para inserir o nome do lead
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bot Inactive Follow-up */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Follow-up para Leads Inativos no Bot
              </CardTitle>
              <CardDescription>
                Envia uma mensagem automática quando o lead para de responder durante o fluxo do bot (ex: parou no passo "nome")
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-full shrink-0 ${botSettings?.bot_inactive_followup_enabled ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
                    <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm sm:text-base">Follow-up ativo</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Envia mensagem se o lead não responder às perguntas do bot
                    </p>
                  </div>
                </div>
                <Switch
                  checked={botSettings?.bot_inactive_followup_enabled || false}
                  onCheckedChange={(checked) => updateBotSettings({ bot_inactive_followup_enabled: checked })}
                  disabled={isSaving}
                  className="shrink-0 self-end sm:self-auto"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Tempo de espera</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={5}
                    max={1440}
                    value={botSettings?.bot_inactive_followup_delay_minutes ?? 30}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 5;
                      const clamped = Math.max(5, Math.min(1440, val));
                      setBotSettings(prev => prev ? { ...prev, bot_inactive_followup_delay_minutes: clamped } : prev);
                      debouncedUpdateBotSettings('bot_inactive_delay', { bot_inactive_followup_delay_minutes: clamped });
                    }}
                    onBlur={(e) => {
                      const val = Math.max(5, Math.min(1440, parseInt(e.target.value) || 5));
                      setBotSettings(prev => prev ? { ...prev, bot_inactive_followup_delay_minutes: val } : prev);
                      if (debounceTimers.current['bot_inactive_delay']) clearTimeout(debounceTimers.current['bot_inactive_delay']);
                      updateBotSettings({ bot_inactive_followup_delay_minutes: val });
                    }}
                    className="w-24"
                    disabled={isSaving || !botSettings?.bot_inactive_followup_enabled}
                  />
                  <span className="text-sm text-muted-foreground">minutos</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recomendado: 5-10 minutos.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Mensagem</Label>
                <Textarea
                  value={botSettings?.bot_inactive_followup_message || "Oi {nome}, notei que você não conseguiu concluir. Estou por aqui caso precise de ajuda! 😊\n\nPodemos continuar de onde paramos?"}
                  onChange={(e) => {
                    setBotSettings(prev => prev ? { ...prev, bot_inactive_followup_message: e.target.value } : prev);
                  }}
                  onBlur={(e) => {
                    updateBotSettings({ bot_inactive_followup_message: e.target.value });
                  }}
                  className="min-h-[100px]"
                  disabled={isSaving || !botSettings?.bot_inactive_followup_enabled}
                />
                <p className="text-xs text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded">{"{nome}"}</code> para inserir o nome do lead
                </p>
                <div className="bg-primary/10 rounded-lg p-3 mt-2">
                  <p className="text-xs text-primary font-medium mb-1">💡 Pergunta re-enviada automaticamente</p>
                  <p className="text-xs text-primary/80">
                    Além desta mensagem, o sistema re-envia a pergunta do passo onde o lead parou (ex: nome, mês, convidados), mantendo o bot ativo para processar a resposta. O lembrete é enviado apenas uma vez por conversa.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Follow-up Automático */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Follow-up Automático
              </CardTitle>
              <CardDescription>
                Envia mensagens de acompanhamento para leads que escolheram "Analisar com calma"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* First Follow-up */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">1ª Mensagem</Badge>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-full shrink-0 ${botSettings?.follow_up_enabled ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
                      <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm sm:text-base">Primeiro Follow-up</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Primeira mensagem automática após o período configurado
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={botSettings?.follow_up_enabled || false}
                    onCheckedChange={(checked) => updateBotSettings({ follow_up_enabled: checked })}
                    disabled={isSaving}
                    className="shrink-0 self-end sm:self-auto"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="follow-up-delay">Tempo de espera</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="follow-up-delay"
                      type="number"
                      min={1}
                      max={168}
                      value={(botSettings?.follow_up_delay_hours ?? 24) || ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          setBotSettings(prev => prev ? { ...prev, follow_up_delay_hours: 0 } : prev);
                          return;
                        }
                        const value = parseInt(raw);
                        if (!isNaN(value)) {
                          setBotSettings(prev => prev ? { ...prev, follow_up_delay_hours: value } : prev);
                        }
                      }}
                      onBlur={(e) => {
                        const value = Math.max(1, Math.min(168, parseInt(e.target.value) || 24));
                        updateBotSettings({ follow_up_delay_hours: value });
                      }}
                      className="w-24"
                      disabled={isSaving || !botSettings?.follow_up_enabled}
                    />
                    <span className="text-sm text-muted-foreground">
                      horas
                      {(botSettings?.follow_up_delay_hours || 24) >= 24 && (
                        <span className="ml-1 text-xs">({Math.floor((botSettings?.follow_up_delay_hours || 24) / 24)} {Math.floor((botSettings?.follow_up_delay_hours || 24) / 24) === 1 ? 'dia' : 'dias'}{(botSettings?.follow_up_delay_hours || 24) % 24 > 0 ? ` e ${(botSettings?.follow_up_delay_hours || 24) % 24}h` : ''})</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="follow-up-message" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Mensagem
                  </Label>
                  <Textarea
                    id="follow-up-message"
                    placeholder="Olá, {nome}! 👋 Passando para saber se teve a chance de analisar as informações..."
                    value={botSettings?.follow_up_message || ""}
                    onChange={(e) => {
                      setBotSettings(prev => prev ? { ...prev, follow_up_message: e.target.value } : prev);
                    }}
                    onBlur={(e) => {
                      updateBotSettings({ follow_up_message: e.target.value });
                    }}
                    className="min-h-[100px]"
                    disabled={isSaving || !botSettings?.follow_up_enabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis: {"{nome}"}, {"{unidade}"}, {"{mes}"}, {"{convidados}"}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed" />

              {/* Second Follow-up */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">2ª Mensagem</Badge>
                  <span className="text-xs text-muted-foreground">Enviada apenas se não houver resposta</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg border-dashed">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-full shrink-0 ${botSettings?.follow_up_2_enabled ? "bg-amber-100 text-amber-600" : "bg-muted text-muted-foreground"}`}>
                      <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm sm:text-base">Segundo Follow-up</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Segunda tentativa caso o lead não responda à primeira
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={botSettings?.follow_up_2_enabled || false}
                    onCheckedChange={(checked) => updateBotSettings({ follow_up_2_enabled: checked })}
                    disabled={isSaving || !botSettings?.follow_up_enabled}
                    className="shrink-0 self-end sm:self-auto"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="follow-up-2-delay">Tempo de espera após primeira mensagem</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="follow-up-2-delay"
                      type="number"
                      min={24}
                      max={336}
                      value={(botSettings?.follow_up_2_delay_hours ?? 48) || ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          setBotSettings(prev => prev ? { ...prev, follow_up_2_delay_hours: 0 } : prev);
                          return;
                        }
                        const value = parseInt(raw);
                        if (!isNaN(value)) {
                          setBotSettings(prev => prev ? { ...prev, follow_up_2_delay_hours: value } : prev);
                        }
                      }}
                      onBlur={(e) => {
                        const value = Math.max(24, Math.min(336, parseInt(e.target.value) || 48));
                        updateBotSettings({ follow_up_2_delay_hours: value });
                      }}
                      className="w-24"
                      disabled={isSaving || !botSettings?.follow_up_2_enabled}
                    />
                    <span className="text-sm text-muted-foreground">
                      horas
                      {(botSettings?.follow_up_2_delay_hours || 48) >= 24 && (
                        <span className="ml-1 text-xs">({Math.floor((botSettings?.follow_up_2_delay_hours || 48) / 24)} {Math.floor((botSettings?.follow_up_2_delay_hours || 48) / 24) === 1 ? 'dia' : 'dias'}{(botSettings?.follow_up_2_delay_hours || 48) % 24 > 0 ? ` e ${(botSettings?.follow_up_2_delay_hours || 48) % 24}h` : ''})</span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deve ser maior que o tempo da primeira mensagem. Recomendado: 48h.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="follow-up-2-message" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Mensagem
                  </Label>
                  <Textarea
                    id="follow-up-2-message"
                    placeholder="Olá, {nome}! 👋 Ainda não tivemos retorno sobre a festa..."
                    value={botSettings?.follow_up_2_message || ""}
                    onChange={(e) => {
                      setBotSettings(prev => prev ? { ...prev, follow_up_2_message: e.target.value } : prev);
                    }}
                    onBlur={(e) => {
                      updateBotSettings({ follow_up_2_message: e.target.value });
                    }}
                    className="min-h-[100px]"
                    disabled={isSaving || !botSettings?.follow_up_2_enabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis: {"{nome}"}, {"{unidade}"}, {"{mes}"}, {"{convidados}"}
                  </p>
                </div>

                {/* ---- 3ª Mensagem ---- */}
                <div className="flex items-center gap-2 mt-6">
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">3ª Mensagem</Badge>
                  <span className="text-xs text-muted-foreground">Enviada apenas se não houver resposta</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg border-dashed">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-full shrink-0 ${botSettings?.follow_up_3_enabled ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground"}`}>
                      <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm sm:text-base">Terceiro Follow-up</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Terceira tentativa caso o lead não responda à segunda
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={botSettings?.follow_up_3_enabled || false}
                    onCheckedChange={(checked) => updateBotSettings({ follow_up_3_enabled: checked })}
                    disabled={isSaving || !botSettings?.follow_up_2_enabled}
                    className="shrink-0 self-end sm:self-auto"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="follow-up-3-delay">Tempo de espera após escolha original</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="follow-up-3-delay"
                      type="number"
                      min={48}
                      max={504}
                      value={(botSettings?.follow_up_3_delay_hours ?? 72) || ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          setBotSettings(prev => prev ? { ...prev, follow_up_3_delay_hours: 0 } : prev);
                          return;
                        }
                        const value = parseInt(raw);
                        if (!isNaN(value)) {
                          setBotSettings(prev => prev ? { ...prev, follow_up_3_delay_hours: value } : prev);
                        }
                      }}
                      onBlur={(e) => {
                        const value = Math.max(48, Math.min(504, parseInt(e.target.value) || 72));
                        updateBotSettings({ follow_up_3_delay_hours: value });
                      }}
                      className="w-24"
                      disabled={isSaving || !botSettings?.follow_up_3_enabled}
                    />
                    <span className="text-sm text-muted-foreground">
                      horas
                      {(botSettings?.follow_up_3_delay_hours || 72) >= 24 && (
                        <span className="ml-1 text-xs">({Math.floor((botSettings?.follow_up_3_delay_hours || 72) / 24)} {Math.floor((botSettings?.follow_up_3_delay_hours || 72) / 24) === 1 ? 'dia' : 'dias'}{(botSettings?.follow_up_3_delay_hours || 72) % 24 > 0 ? ` e ${(botSettings?.follow_up_3_delay_hours || 72) % 24}h` : ''})</span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deve ser maior que o tempo da segunda mensagem. Recomendado: 72h.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="follow-up-3-message" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Mensagem
                  </Label>
                  <Textarea
                    id="follow-up-3-message"
                    placeholder="Oi, {nome}! 😊 Sei que a decisão leva tempo..."
                    value={botSettings?.follow_up_3_message || ""}
                    onChange={(e) => {
                      setBotSettings(prev => prev ? { ...prev, follow_up_3_message: e.target.value } : prev);
                    }}
                    onBlur={(e) => {
                      updateBotSettings({ follow_up_3_message: e.target.value });
                    }}
                    className="min-h-[100px]"
                    disabled={isSaving || !botSettings?.follow_up_3_enabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis: {"{nome}"}, {"{unidade}"}, {"{mes}"}, {"{convidados}"}
                  </p>
                </div>

                {/* ---- 4ª Mensagem ---- */}
                <div className="flex items-center gap-2 mt-6">
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">4ª Mensagem</Badge>
                  <span className="text-xs text-muted-foreground">Última tentativa automática</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg border-dashed">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-full shrink-0 ${botSettings?.follow_up_4_enabled ? "bg-red-100 text-red-600" : "bg-muted text-muted-foreground"}`}>
                      <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm sm:text-base">Quarto Follow-up</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Última tentativa automática — urgência
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={botSettings?.follow_up_4_enabled || false}
                    onCheckedChange={(checked) => updateBotSettings({ follow_up_4_enabled: checked })}
                    disabled={isSaving || !botSettings?.follow_up_3_enabled}
                    className="shrink-0 self-end sm:self-auto"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="follow-up-4-delay">Tempo de espera após escolha original</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="follow-up-4-delay"
                      type="number"
                      min={72}
                      max={720}
                      value={(botSettings?.follow_up_4_delay_hours ?? 96) || ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          setBotSettings(prev => prev ? { ...prev, follow_up_4_delay_hours: 0 } : prev);
                          return;
                        }
                        const value = parseInt(raw);
                        if (!isNaN(value)) {
                          setBotSettings(prev => prev ? { ...prev, follow_up_4_delay_hours: value } : prev);
                        }
                      }}
                      onBlur={(e) => {
                        const value = Math.max(72, Math.min(720, parseInt(e.target.value) || 96));
                        updateBotSettings({ follow_up_4_delay_hours: value });
                      }}
                      className="w-24"
                      disabled={isSaving || !botSettings?.follow_up_4_enabled}
                    />
                    <span className="text-sm text-muted-foreground">
                      horas
                      {(botSettings?.follow_up_4_delay_hours || 96) >= 24 && (
                        <span className="ml-1 text-xs">({Math.floor((botSettings?.follow_up_4_delay_hours || 96) / 24)} {Math.floor((botSettings?.follow_up_4_delay_hours || 96) / 24) === 1 ? 'dia' : 'dias'}{(botSettings?.follow_up_4_delay_hours || 96) % 24 > 0 ? ` e ${(botSettings?.follow_up_4_delay_hours || 96) % 24}h` : ''})</span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deve ser maior que o tempo da terceira mensagem. Recomendado: 96h.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="follow-up-4-message" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Mensagem
                  </Label>
                  <Textarea
                    id="follow-up-4-message"
                    placeholder="{nome}, última chamada! 🎉 As datas estão quase esgotadas..."
                    value={botSettings?.follow_up_4_message || ""}
                    onChange={(e) => {
                      setBotSettings(prev => prev ? { ...prev, follow_up_4_message: e.target.value } : prev);
                    }}
                    onBlur={(e) => {
                      updateBotSettings({ follow_up_4_message: e.target.value });
                    }}
                    className="min-h-[100px]"
                    disabled={isSaving || !botSettings?.follow_up_4_enabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis: {"{nome}"}, {"{unidade}"}, {"{mes}"}, {"{convidados}"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Perdido Card */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Power className="w-5 h-5 text-destructive" />
                Auto-Perdido
              </CardTitle>
              <CardDescription>
                Move automaticamente para "Perdido" os leads que não responderam após o 4º follow-up
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg border-destructive/30">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-full shrink-0 ${botSettings?.auto_lost_enabled ? "bg-red-100 text-red-600" : "bg-muted text-muted-foreground"}`}>
                    <Power className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm sm:text-base">Auto-Perdido ativo</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Leads sem resposta após o 4º follow-up serão movidos para Perdido
                    </p>
                  </div>
                </div>
                <Switch
                  checked={botSettings?.auto_lost_enabled || false}
                  onCheckedChange={(checked) => updateBotSettings({ auto_lost_enabled: checked })}
                  disabled={isSaving || !botSettings?.follow_up_4_enabled}
                  className="shrink-0 self-end sm:self-auto"
                />
              </div>

              {!botSettings?.follow_up_4_enabled && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
                  ⚠️ O 4º follow-up precisa estar ativo para usar o Auto-Perdido.
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="auto-lost-delay">Tempo de espera após o 4º follow-up</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="auto-lost-delay"
                    type="number"
                    min={24}
                    max={720}
                    value={(botSettings?.auto_lost_delay_hours ?? 48) || ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setBotSettings(prev => prev ? { ...prev, auto_lost_delay_hours: 0 } : prev);
                        return;
                      }
                      const value = parseInt(raw);
                      if (!isNaN(value)) {
                        setBotSettings(prev => prev ? { ...prev, auto_lost_delay_hours: value } : prev);
                      }
                    }}
                    onBlur={(e) => {
                      const value = Math.max(24, Math.min(720, parseInt(e.target.value) || 48));
                      updateBotSettings({ auto_lost_delay_hours: value });
                    }}
                    className="w-24"
                    disabled={isSaving || !botSettings?.auto_lost_enabled}
                  />
                  <span className="text-sm text-muted-foreground">
                    horas
                    {(botSettings?.auto_lost_delay_hours || 48) >= 24 && (
                      <span className="ml-1 text-xs">({Math.floor((botSettings?.auto_lost_delay_hours || 48) / 24)} {Math.floor((botSettings?.auto_lost_delay_hours || 48) / 24) === 1 ? 'dia' : 'dias'}{(botSettings?.auto_lost_delay_hours || 48) % 24 > 0 ? ` e ${(botSettings?.auto_lost_delay_hours || 48) % 24}h` : ''})</span>
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tempo após o envio do 4º follow-up para marcar como perdido. Recomendado: 48h.
                </p>
              </div>

              <div className="bg-destructive/10 rounded-lg p-3">
                <p className="text-xs text-destructive font-medium mb-1">📋 Como funciona</p>
                <p className="text-xs text-destructive/80">
                  Após o 4º follow-up ser enviado, o sistema aguarda o tempo configurado. Se o lead não responder nesse período, 
                  o status é atualizado para "Perdido" automaticamente e um registro é criado no histórico do lead.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ TAB: VIP ============ */}
        <TabsContent value="vip" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Lista VIP
                  </CardTitle>
                  <CardDescription>
                    Números que nunca receberão mensagens automáticas do bot
                  </CardDescription>
                </div>
                <Dialog open={showAddVipDialog} onOpenChange={setShowAddVipDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Número VIP</DialogTitle>
                      <DialogDescription>
                        Este número não receberá mensagens automáticas do bot de qualificação
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="vip-phone">Número de Telefone *</Label>
                        <Input
                          id="vip-phone"
                          placeholder="+55 11 99999-9999"
                          value={newVipPhone}
                          onChange={(e) => setNewVipPhone(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vip-name">Nome (opcional)</Label>
                        <Input
                          id="vip-name"
                          placeholder="Ex: João Silva"
                          value={newVipName}
                          onChange={(e) => setNewVipName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vip-reason">Motivo (opcional)</Label>
                        <Input
                          id="vip-reason"
                          placeholder="Ex: Cliente antigo, Fornecedor"
                          value={newVipReason}
                          onChange={(e) => setNewVipReason(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddVipDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={addVipNumber} disabled={!newVipPhone.trim() || isAddingVip}>
                        {isAddingVip ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Adicionar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {vipNumbers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhum número na lista VIP</p>
                  <p className="text-xs mt-1">Adicione números que não devem receber mensagens automáticas</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {vipNumbers.map((vip) => (
                      <div
                        key={vip.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-full">
                            <Phone className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {vip.name || formatPhoneNumber(vip.phone)}
                            </p>
                            {vip.name && (
                              <p className="text-xs text-muted-foreground">{formatPhoneNumber(vip.phone)}</p>
                            )}
                            {vip.reason && (
                              <p className="text-xs text-muted-foreground">{vip.reason}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeVipNumber(vip.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ TAB: JORNADA ============ */}
        <TabsContent value="jornada" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="w-5 h-5" />
                Jornada do Lead no Bot
              </CardTitle>
              <CardDescription>
                Visualização dos passos que o lead percorre durante a qualificação automática
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BotJourneyDiagram />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ TAB: BOT FESTA ============ */}
        {modules.bot_festa && (
          <TabsContent value="festa" className="mt-4">
            <PartyBotMessagesCard />
          </TabsContent>
        )}

        {/* ============ TAB: FLUXOS ============ */}
        {modules.flow_builder && (
          <TabsContent value="fluxos" className="mt-4">
            <FlowListManager />
          </TabsContent>
        )}

        {/* ============ TAB: GATILHOS ============ */}
        <TabsContent value="gatilhos" className="space-y-6 mt-4">
          <FreelancerApprovalMessageCard />
          <ScheduleGroupMessageCard />
          <AssignmentGroupMessageCard />
          <GroupMessageDelayCard />
        </TabsContent>

        {/* ============ TAB: BOT LP ============ */}
        <TabsContent value="bot-lp" className="mt-4">
          <LPBotSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
