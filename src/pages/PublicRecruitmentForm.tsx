import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { CheckCircle2, ChevronLeft, ChevronRight, Send, User, MessageSquare, Target, Brain, DollarSign, Phone, Star, Camera } from "lucide-react";
import { toast } from "sonner";
import logoCastelo from "@/assets/logo-castelo.png";

const SECTIONS = [
  { id: "info", title: "Informações Básicas", icon: User, color: "from-blue-500 to-cyan-500" },
  { id: "comunicacao", title: "Comunicação", icon: MessageSquare, color: "from-violet-500 to-purple-500" },
  { id: "perfil", title: "Perfil Comercial", icon: Target, color: "from-orange-500 to-amber-500" },
  { id: "iniciativa", title: "Iniciativa", icon: Brain, color: "from-emerald-500 to-green-500" },
  { id: "motivacao", title: "Motivação", icon: DollarSign, color: "from-yellow-500 to-orange-500" },
  { id: "disponibilidade", title: "Disponibilidade", icon: Phone, color: "from-sky-500 to-blue-500" },
  { id: "chave", title: "Pergunta Chave", icon: Star, color: "from-pink-500 to-rose-500" },
];

type Answers = Record<string, string>;

export default function PublicRecruitmentForm() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem (JPG, PNG ou WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 5MB");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const set = (key: string, value: string) => setAnswers((prev) => ({ ...prev, [key]: value }));

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return !!(answers.nome?.trim() && answers.idade?.trim() && answers.tempo_trabalho);
      case 1: return !!(answers.conforto_pessoas && answers.conforto_ligar && answers.experiencia_vendas);
      case 2: return !!(answers.comunicatividade && answers.convencer && answers.ligar_20);
      case 3: return !!(answers.objetivo && answers.interesse_vendas);
      case 4: return !!answers.comissao;
      case 5: return !!(answers.horas_semana && answers.metas);
      case 6: return !!answers.porque_voce?.trim();
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("hub_recruitment_responses" as any).insert({
        respondent_name: answers.nome?.trim(),
        age: parseInt(answers.idade) || null,
        answers,
      } as any);
      if (error) throw error;
      setSubmitted(true);
    } catch {
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const RadioOption = ({ name, value, label }: { name: string; value: string; label: string }) => (
    <button
      type="button"
      onClick={() => set(name, value)}
      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-200 text-sm font-medium ${
        answers[name] === value
          ? "border-primary bg-primary/10 text-primary shadow-sm"
          : "border-border hover:border-primary/40 hover:bg-muted/50 text-foreground"
      }`}
    >
      {label}
    </button>
  );

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Obrigado, {answers.nome?.split(" ")[0]}! 🎉</h2>
          <p className="text-muted-foreground">Suas respostas foram enviadas com sucesso. Vamos analisar seu perfil e entraremos em contato em breve!</p>
        </motion.div>
      </div>
    );
  }

  const section = SECTIONS[step];

  const renderSection = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">1. Nome completo</label>
              <Input value={answers.nome || ""} onChange={(e) => set("nome", e.target.value)} placeholder="Seu nome completo" maxLength={100} />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">2. Idade</label>
              <Input type="number" value={answers.idade || ""} onChange={(e) => set("idade", e.target.value)} placeholder="Ex: 18" min={14} max={99} />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">3. Há quanto tempo trabalha no Castelo da Diversão?</label>
              <div className="space-y-2">
                <RadioOption name="tempo_trabalho" value="menos_3m" label="Menos de 3 meses" />
                <RadioOption name="tempo_trabalho" value="3_6m" label="3 a 6 meses" />
                <RadioOption name="tempo_trabalho" value="6m_1a" label="6 meses a 1 ano" />
                <RadioOption name="tempo_trabalho" value="mais_1a" label="Mais de 1 ano" />
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">4. Você se sente confortável falando com pessoas que nunca viu antes?</label>
              <div className="space-y-2">
                <RadioOption name="conforto_pessoas" value="muito_confortavel" label="Muito confortável" />
                <RadioOption name="conforto_pessoas" value="confortavel" label="Confortável" />
                <RadioOption name="conforto_pessoas" value="mais_ou_menos" label="Mais ou menos" />
                <RadioOption name="conforto_pessoas" value="nao_gosto" label="Não gosto muito" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">5. Se precisasse ligar para uma empresa para apresentar uma ideia, como se sentiria?</label>
              <div className="space-y-2">
                <RadioOption name="conforto_ligar" value="muito_confortavel" label="Muito confortável" />
                <RadioOption name="conforto_ligar" value="confortavel" label="Confortável" />
                <RadioOption name="conforto_ligar" value="nervoso" label="Ficaria um pouco nervoso" />
                <RadioOption name="conforto_ligar" value="nao_gostaria" label="Não gostaria de fazer isso" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">6. Você já trabalhou com vendas ou atendimento ao público?</label>
              <div className="space-y-2">
                <RadioOption name="experiencia_vendas" value="sim" label="Sim" />
                <RadioOption name="experiencia_vendas" value="nao" label="Não" />
              </div>
              {answers.experiencia_vendas === "sim" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-3">
                  <label className="text-sm text-muted-foreground mb-1 block">👉 Onde?</label>
                  <Input value={answers.experiencia_onde || ""} onChange={(e) => set("experiencia_onde", e.target.value)} placeholder="Ex: loja de roupas, telemarketing..." maxLength={200} />
                </motion.div>
              )}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">7. Você se considera uma pessoa:</label>
              <div className="space-y-2">
                <RadioOption name="comunicatividade" value="muito_comunicativa" label="Muito comunicativa" />
                <RadioOption name="comunicatividade" value="comunicativa" label="Comunicativa" />
                <RadioOption name="comunicatividade" value="reservada" label="Mais reservada" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">8. Você gosta de convencer pessoas sobre ideias ou produtos?</label>
              <div className="space-y-2">
                <RadioOption name="convencer" value="sim_bastante" label="Sim, gosto bastante" />
                <RadioOption name="convencer" value="as_vezes" label="Às vezes" />
                <RadioOption name="convencer" value="nao_muito" label="Não muito" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">9. Se tivesse que ligar para 20 empresas em um dia, conseguiria?</label>
              <div className="space-y-2">
                <RadioOption name="ligar_20" value="sim_tranquilo" label="Sim, tranquilamente" />
                <RadioOption name="ligar_20" value="sim_dificuldade" label="Sim, mas com um pouco de dificuldade" />
                <RadioOption name="ligar_20" value="dificil" label="Acho difícil" />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">10. Quando quer muito alcançar um objetivo, você normalmente:</label>
              <div className="space-y-2">
                <RadioOption name="objetivo" value="insiste" label="Insiste até conseguir" />
                <RadioOption name="objetivo" value="tenta" label="Tenta algumas vezes" />
                <RadioOption name="objetivo" value="desiste" label="Desiste se for difícil" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">11. Tem interesse em aprender sobre vendas e negócios?</label>
              <div className="space-y-2">
                <RadioOption name="interesse_vendas" value="muito" label="Muito interesse" />
                <RadioOption name="interesse_vendas" value="medio" label="Interesse médio" />
                <RadioOption name="interesse_vendas" value="pouco" label="Pouco interesse" />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">12. Se pudesse ganhar comissões por resultado, isso te motivaria mais?</label>
              <div className="space-y-2">
                <RadioOption name="comissao" value="sim_muito" label="Sim, muito" />
                <RadioOption name="comissao" value="sim" label="Sim" />
                <RadioOption name="comissao" value="tanto_faz" label="Tanto faz" />
                <RadioOption name="comissao" value="nao_muda" label="Não muda muito" />
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">13. Quantas horas por semana teria para fazer ligações?</label>
              <div className="space-y-2">
                <RadioOption name="horas_semana" value="2_4h" label="2 a 4 horas" />
                <RadioOption name="horas_semana" value="4_6h" label="4 a 6 horas" />
                <RadioOption name="horas_semana" value="6_10h" label="6 a 10 horas" />
                <RadioOption name="horas_semana" value="mais_10h" label="Mais de 10 horas" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">14. Teria disponibilidade para trabalhar com metas de agendamento?</label>
              <div className="space-y-2">
                <RadioOption name="metas" value="sim" label="Sim" />
                <RadioOption name="metas" value="talvez" label="Talvez" />
                <RadioOption name="metas" value="nao" label="Não" />
              </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">15. Por que você acha que seria uma boa pessoa para ajudar a apresentar essa plataforma para outros buffets?</label>
              <Textarea
                value={answers.porque_voce || ""}
                onChange={(e) => set("porque_voce", e.target.value)}
                placeholder="Conte um pouco sobre você e por que acha que se encaixa nessa oportunidade..."
                rows={5}
                maxLength={1000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">{(answers.porque_voce || "").length}/1000</p>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <img src={logoCastelo} alt="Castelo da Diversão" className="h-16 w-16 rounded-xl object-cover mx-auto mb-3" />
          <h1 className="text-lg font-bold text-foreground">Seleção de Monitor</h1>
          <p className="text-sm text-muted-foreground">Prospecção Comercial</p>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-6">
          {SECTIONS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>

        {/* Section header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center`}>
            <section.icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Etapa {step + 1} de {SECTIONS.length}</p>
            <h2 className="font-bold text-foreground">{section.title}</h2>
          </div>
        </div>

        {/* Form card */}
        <Card className="p-5 mb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </Card>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
          )}
          {step < SECTIONS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="flex-1">
              Próximo <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed() || submitting} className="flex-1">
              {submitting ? "Enviando..." : "Enviar"} <Send className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
