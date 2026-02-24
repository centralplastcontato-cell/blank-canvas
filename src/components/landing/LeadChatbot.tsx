import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, MessageCircle, MapPin, Smile } from "lucide-react";
import { campaignConfig } from "@/config/campaignConfig";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import logoCastelo from "@/assets/logo-castelo.png";

interface Message {
  id: string;
  type: "bot" | "user";
  content: string;
  options?: string[];
  isInput?: boolean;
}

interface LeadData {
  unit?: string;
  month?: string;
  dayOfMonth?: number;
  guests?: string;
  name?: string;
  whatsapp?: string;
}

interface LPBotConfig {
  welcome_message?: string;
  month_question?: string;
  guest_question?: string;
  name_question?: string;
  whatsapp_question?: string;
  completion_message?: string;
  month_options?: string[];
  guest_options?: string[];
  guest_limit?: number | null;
  guest_limit_message?: string | null;
  guest_limit_redirect_name?: string | null;
}

interface LeadChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string;
  companyName?: string;
  companyLogo?: string | null;
  companyWhatsApp?: string;
  lpBotConfig?: LPBotConfig | null;
}

// Default month options (all months from current month forward)
const DEFAULT_MONTH_OPTIONS = ["Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function LeadChatbot({ isOpen, onClose, companyId, companyName, companyLogo, companyWhatsApp, lpBotConfig }: LeadChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [leadData, setLeadData] = useState<LeadData>({});
  const [inputValue, setInputValue] = useState("");
  const [inputType, setInputType] = useState<"name" | "whatsapp" | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [redirectAccepted, setRedirectAccepted] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Detect if we're in dynamic (multi-company) mode
  const isDynamic = !!companyName;
  const displayName = companyName || "Castelo da Diversão";
  const displayLogo = isDynamic ? companyLogo : logoCastelo;

  const emojis = [
    "😀","😂","😍","🥰","😎","🤩","😇","🥳","😘","😜",
    "🤗","😊","🙃","😋","🤔","😏","😌","🥺","😢","😭",
    "🎉","🎊","🎂","🎈","🎁","🎀","🎪","🎠","🏰","👑",
    "⭐","🌟","✨","💫","🔥","❤️","💖","💕","💛","💙",
    "👍","👏","🙌","💪","🤝","✌️","🫶","👋","🤞","🫡",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const monthNameToIndex: Record<string, number> = {
    "Janeiro": 0, "Fevereiro": 1, "Março": 2, "Abril": 3,
    "Maio": 4, "Junho": 5, "Julho": 6, "Agosto": 7,
    "Setembro": 8, "Outubro": 9, "Novembro": 10, "Dezembro": 11,
  };

  const getDaysInMonth = (month: string): number => {
    const monthIndex = monthNameToIndex[month];
    if (monthIndex === undefined) return 31;
    const currentYear = new Date().getFullYear();
    // new Date(year, monthIndex+1, 0) gives last day of that month
    return new Date(currentYear, monthIndex + 1, 0).getDate();
  };

  const addDayOfMonthStep = (month: string) => {
    const daysInMonth = getDaysInMonth(month);
    const monthIndex = monthNameToIndex[month];
    const currentYear = new Date().getFullYear();
    const firstDayOfWeek = monthIndex !== undefined
      ? new Date(currentYear, monthIndex, 1).getDay()
      : 0;
    // Padding empty strings so day 1 falls on the correct weekday column
    const padding = Array.from({ length: firstDayOfWeek }, () => "");
    const days = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
    const calendarGrid = [...padding, ...days];

    setMessages((prev) => [
      ...prev,
      {
        id: "day-of-month",
        type: "bot",
        content: `Para qual dia de ${month} você gostaria de agendar?`,
        options: calendarGrid,
      },
    ]);
  };

  // Helper: extract number from guest option string like "71 a 90 pessoas" → 90
  const extractMaxGuests = (guestOption: string): number => {
    const numbers = guestOption.match(/\d+/g);
    if (!numbers) return 0;
    return Math.max(...numbers.map(Number));
  };

  // Helper: check if guest selection exceeds the limit
  const exceedsGuestLimit = (guestOption: string): boolean => {
    if (!lpBotConfig?.guest_limit) return false;

    const lower = guestOption.toLowerCase().trim();
    const isExplicitAboveLimit =
      lower.includes('acima') ||
      lower.includes('mais de') ||
      lower.includes('+ de') ||
      lower.startsWith('+') ||
      />\s*\d+/.test(lower);

    if (isExplicitAboveLimit) return true;

    const maxGuests = extractMaxGuests(guestOption);
    return maxGuests > lpBotConfig.guest_limit;
  };

  const dynamicMonthOptions = lpBotConfig?.month_options || DEFAULT_MONTH_OPTIONS;
  const dynamicGuestOptions = lpBotConfig?.guest_options || campaignConfig.chatbot.guestOptions;

  const handleDayOfMonthSelect = (day: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content: `Dia ${day}`,
    };
    setMessages((prev) => [...prev, userMessage]);
    setLeadData((prev) => ({ ...prev, dayOfMonth: parseInt(day) }));

    setTimeout(() => {
      const guestQuestionText = (isDynamic && lpBotConfig?.guest_question) || "Para quantas pessoas será a festa?";
      const guestOpts = isDynamic ? dynamicGuestOptions : campaignConfig.chatbot.guestOptions;
      setMessages((prev) => [
        ...prev,
        {
          id: "guests",
          type: "bot",
          content: guestQuestionText,
          options: guestOpts,
        },
      ]);
      // In dynamic mode without unit step, guest step is step 2
      // In default mode, guest step is step 3
      setCurrentStep(isDynamic ? 2 : 3);
    }, 500);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMsg = isDynamic
        ? (lpBotConfig?.welcome_message || `Oi 👋 Que bom te ver por aqui!\n\nVou te fazer algumas perguntas rápidas para montar seu orçamento 😉`)
        : "Oi 👋 Que bom te ver por aqui!\n\nVou te fazer algumas perguntas rápidas para montar seu orçamento com a promoção 😉";

      setTimeout(() => {
        setMessages([
          {
            id: "welcome",
            type: "bot",
            content: welcomeMsg,
          },
        ]);
        setTimeout(() => {
          if (isDynamic) {
            // Dynamic mode: skip unit selection, go straight to month
            setLeadData((prev) => ({ ...prev, unit: companyName }));
            const monthQ = lpBotConfig?.month_question || "Para qual mês você pretende realizar a festa?";
            setMessages((prev) => [
              ...prev,
              {
                id: "month",
                type: "bot",
                content: monthQ,
                options: dynamicMonthOptions,
              },
            ]);
            setCurrentStep(1); // month step
          } else {
            // Default Castelo mode: ask unit first
            setMessages((prev) => [
              ...prev,
              {
                id: "unit",
                type: "bot",
                content: "Em qual unidade você deseja fazer sua festa?",
                options: campaignConfig.chatbot.unitOptions,
              },
            ]);
          }
        }, 800);
      }, 500);
    }
  }, [isOpen, messages.length, isDynamic, companyName, lpBotConfig]);

  const handleOptionSelect = (option: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content: option,
    };
    setMessages((prev) => [...prev, userMessage]);

    setTimeout(() => {
      if (isDynamic) {
        // Dynamic mode flow: month(1) -> day(day-of-month) -> guests(2) -> capture(3)
        switch (currentStep) {
          case 1: // Month selected
            setLeadData((prev) => ({ ...prev, month: option }));
            addDayOfMonthStep(option);
            setCurrentStep(1.5 as any); // intermediate step for day
            break;
          case 2: // Guests selected
            setLeadData((prev) => ({ ...prev, guests: option }));
            // Check guest limit for dynamic mode
            if (exceedsGuestLimit(option)) {
              const redirectMsg = lpBotConfig?.guest_limit_message || 
                `Nossa capacidade máxima é de ${lpBotConfig?.guest_limit} convidados. Para melhor lhe atender, podemos direcionar seu contato para o ${lpBotConfig?.guest_limit_redirect_name || 'buffet parceiro'}, próximo de nós, para envio de orçamento sem compromisso. Deseja que a gente encaminhe?`;
              setMessages((prev) => [
                ...prev,
                {
                  id: "guest-limit-redirect",
                  type: "bot",
                  content: redirectMsg,
                  options: ["Sim, pode encaminhar", "Não, quero continuar"],
                },
              ]);
              setCurrentStep(2.5 as any); // intermediate redirect step
            } else {
              // nameQ available for future input label customization
              setMessages((prev) => [
                ...prev,
                {
                  id: "capture",
                  type: "bot",
                  content: "Perfeito! 🎉\n\nAgora precisamos dos seus dados para te enviar o orçamento certinho 👇",
                  isInput: true,
                },
              ]);
              setCurrentStep(3);
              setInputType("name");
            }
            break;
          case 2.5: // Guest limit redirect response
            if (option === "Sim, pode encaminhar") {
              // Save lead as transferred
              setRedirectAccepted(true);
              setLeadData((prev) => ({ ...prev }));
              // Ask for name/whatsapp to create the transferred lead
              setMessages((prev) => [
                ...prev,
                {
                  id: "capture-redirect",
                  type: "bot",
                  content: `Ótimo! Vamos encaminhar você para o ${lpBotConfig?.guest_limit_redirect_name || 'buffet parceiro'}. Primeiro, precisamos dos seus dados 👇`,
                  isInput: true,
                },
              ]);
              setCurrentStep(3);
              setInputType("name");
            } else {
              // Continue normal flow
              setRedirectAccepted(false);
              setMessages((prev) => [
                ...prev,
                {
                  id: "capture",
                  type: "bot",
                  content: "Perfeito! 🎉\n\nAgora precisamos dos seus dados para te enviar o orçamento certinho 👇",
                  isInput: true,
                },
              ]);
              setCurrentStep(3);
              setInputType("name");
            }
            break;
        }
      } else {
        // Default Castelo mode flow: unit(0) -> month(1) -> day -> guests(3) -> capture(4)
        switch (currentStep) {
          case 0:
            setLeadData((prev) => ({ ...prev, unit: option }));
            setMessages((prev) => [
              ...prev,
              {
                id: "month",
                type: "bot",
                content: "Perfeito! Para qual mês você pretende realizar a festa?",
                options: campaignConfig.chatbot.monthOptions,
              },
            ]);
            setCurrentStep(1);
            break;
          case 1:
            setLeadData((prev) => ({ ...prev, month: option }));
            const isPromoMonth = campaignConfig.chatbot.promoMonths?.includes(option);
            if (!isPromoMonth && campaignConfig.chatbot.nonPromoMessage) {
              setMessages((prev) => [
                ...prev,
                {
                  id: "non-promo-warning",
                  type: "bot",
                  content: campaignConfig.chatbot.nonPromoMessage,
                },
              ]);
              setTimeout(() => {
                addDayOfMonthStep(option);
              }, 1500);
            } else {
              addDayOfMonthStep(option);
            }
            setCurrentStep(2);
            break;
          case 2:
            break;
          case 3:
            setLeadData((prev) => ({ ...prev, guests: option }));
            setMessages((prev) => [
              ...prev,
              {
                id: "capture",
                type: "bot",
                content: "Perfeito! 🎉\n\nAgora precisamos dos seus dados para te enviar o orçamento certinho 👇",
                isInput: true,
              },
            ]);
            setCurrentStep(4);
            setInputType("name");
            break;
        }
      }
    }, 500);
  };

  // Função para enviar mensagem via W-API (sem autenticação - endpoint público via unit)
  const sendWelcomeMessage = async (phone: string, unit: string, leadInfo: LeadData, redirectInfo?: { partnerName: string; limit: number; customMessage?: string | null }) => {
    try {
      const normalizedUnit = unit === "Trujilo" ? "Trujillo" : unit;
      const cleanPhone = phone.replace(/\D/g, '');
      const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

      const redirectText = redirectInfo.customMessage
        || `Nossa capacidade máxima é de ${redirectInfo.limit} convidados. Seus dados foram encaminhados para o *${redirectInfo.partnerName}*, próximo de nós, que entrará em contato em breve para envio de orçamento sem compromisso!`;

      const message = redirectInfo
        ? `Olá! 👋✨\n\nVim pelo site do *${displayName}* e gostaria de saber mais!\n\n📋 *Meus dados:*\n👤 Nome: ${leadInfo.name || ''}\n📍 Unidade: ${unit}\n📅 Data: ${leadInfo.dayOfMonth || ''}/${leadInfo.month || ''}\n👥 Convidados: ${leadInfo.guests || ''}\n\n${redirectText}\n\nObrigado pelo interesse! 💜`
        : `Olá! 👋🏼✨\n\nVim pelo site do *${displayName}* e gostaria de saber mais!\n\n📋 *Meus dados:*\n👤 Nome: ${leadInfo.name || ''}\n📍 Unidade: ${unit}\n📅 Data: ${leadInfo.dayOfMonth || ''}/${leadInfo.month || ''}\n👥 Convidados: ${leadInfo.guests || ''}\n\nVou dar continuidade no seu atendimento!! 🚀\n\nEscolha a opção que mais te agrada 👇\n\n1️⃣ - 📩 Receber agora meu orçamento\n2️⃣ - 💬 Falar com um atendente`;

      const { error } = await supabase.functions.invoke('wapi-send', {
        body: {
          action: 'send-text',
          phone: phoneWithCountry,
          message,
          unit: normalizedUnit,
          lpMode: true,
        },
      });

      if (error) {
        console.error('Erro ao enviar mensagem automática:', error);
      } else {
        console.log(`Mensagem automática enviada para ${phoneWithCountry} via ${normalizedUnit}`);
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem via W-API:', err);
    }
  };

  const handleInputSubmit = async () => {
    if (!inputValue.trim() || isSaving) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content: inputValue,
    };
    setMessages((prev) => [...prev, userMessage]);

    if (inputType === "name") {
      setLeadData((prev) => ({ ...prev, name: inputValue }));
      setInputValue("");
      setInputType("whatsapp");
    } else if (inputType === "whatsapp") {
      const whatsappValue = inputValue;
      setInputValue("");
      setInputType(null);
      setIsSaving(true);

      try {
        const finalLeadData = { ...leadData, name: leadData.name, whatsapp: whatsappValue };
        
        const effectiveCompanyId = companyId || campaignConfig.companyId;
        const effectiveCampaignId = isDynamic ? "lp-lead" : campaignConfig.campaignId;
        const effectiveCampaignName = isDynamic ? `LP ${displayName}` : campaignConfig.campaignName;

        const isRedirected = redirectAccepted === true;

        const submitLead = async (unit: string) => {
          const body: Record<string, any> = {
            name: leadData.name,
            whatsapp: whatsappValue,
            unit: unit,
            month: leadData.month,
            day_of_month: leadData.dayOfMonth,
            guests: leadData.guests,
            campaign_id: effectiveCampaignId,
            campaign_name: effectiveCampaignName,
            company_id: effectiveCompanyId,
          };
          if (isRedirected) {
            body.status = 'transferido';
            body.observacoes = `Redirecionado para ${lpBotConfig?.guest_limit_redirect_name || 'buffet parceiro'} - acima de ${lpBotConfig?.guest_limit} convidados`;
          }
          const { error } = await supabase.functions.invoke('submit-lead', { body });
          if (error) throw error;
          console.log(`Lead criado para ${unit}${isRedirected ? ' (transferido)' : ''}`);
        };
        
        await submitLead(leadData.unit!);

        // Send welcome message(s) in background
        const redirectInfo = isRedirected ? {
          partnerName: lpBotConfig?.guest_limit_redirect_name || 'buffet parceiro',
          limit: lpBotConfig?.guest_limit || 0,
          customMessage: (lpBotConfig?.guest_limit_message && lpBotConfig.guest_limit_message.trim()) || null,
        } : undefined;

        if (!isDynamic && leadData.unit === "As duas") {
          Promise.all([
            sendWelcomeMessage(whatsappValue, "Manchester", finalLeadData, redirectInfo),
            sendWelcomeMessage(whatsappValue, "Trujillo", finalLeadData, redirectInfo),
          ]).catch(err => console.error("Erro ao enviar mensagem automática:", err));
        } else if (leadData.unit) {
          sendWelcomeMessage(whatsappValue, leadData.unit, finalLeadData, redirectInfo)
            .catch(err => console.error("Erro ao enviar mensagem automática:", err));
        }

        const completionMessage = isRedirected
          ? ((lpBotConfig?.guest_limit_message && lpBotConfig.guest_limit_message.trim())
            ? `${lpBotConfig.guest_limit_message}\n\nObrigado pelo interesse! 💜`
            : `Prontinho! 🎉\n\nSeus dados foram encaminhados para o ${lpBotConfig?.guest_limit_redirect_name || 'buffet parceiro'}. Eles entrarão em contato em breve!\n\nObrigado pelo interesse! 💜`)
          : isDynamic
          ? (lpBotConfig?.completion_message || `Prontinho 🎉\n\nRecebemos suas informações e nossa equipe vai entrar em contato em breve para confirmar valores e disponibilidade da sua data.\n\nAcabei de te enviar uma mensagem no seu WhatsApp, dá uma olhadinha lá! 📲`)
          : `Prontinho 🎉\n\nRecebemos suas informações e nossa equipe vai entrar em contato em breve para confirmar valores e disponibilidade da sua data.\n\nPromoção válida conforme regras da campanha: ${campaignConfig.campaignName}\n\nAcabei de te enviar uma mensagem no seu WhatsApp, dá uma olhadinha lá! 📲`;

        setMessages((prev) => [
          ...prev,
          {
            id: "complete",
            type: "bot",
            content: completionMessage,
          },
        ]);
        setIsComplete(true);
        setTimeout(() => {
          onClose();
        }, 10000);
      } catch (error) {
        console.error("Erro ao salvar lead:", error);
        toast({
          title: "Erro ao enviar",
          description: "Tente novamente em alguns instantes.",
          variant: "destructive",
        });
        setInputType("whatsapp");
        setInputValue(whatsappValue);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const resetChat = () => {
    setMessages([]);
    setCurrentStep(0);
    setLeadData({});
    setInputValue("");
    setInputType(null);
    setIsComplete(false);
    setIsSaving(false);
    setRedirectAccepted(null);
  };

  useEffect(() => {
    if (!isOpen) {
      resetChat();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build WhatsApp message for final buttons
  const buildWhatsAppMessage = () => {
    return `Olá! 👋🏼✨\n\nVim pelo site do *${displayName}* e gostaria de saber mais!\n\n📋 *Meus dados:*\n👤 Nome: ${leadData.name || ''}\n📍 Unidade: ${leadData.unit || ''}\n📅 Data: ${leadData.dayOfMonth || ''}/${leadData.month || ''}\n👥 Convidados: ${leadData.guests || ''}\n\nVou dar continuidade no seu atendimento!! 🚀\n\nEscolha a opção que mais te agrada 👇\n\n1️⃣ - 📩 Receber agora meu orçamento\n2️⃣ - 💬 Falar com um atendente`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-card rounded-3xl shadow-floating w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-hero p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {displayLogo && (
                <img 
                  src={displayLogo} 
                  alt={displayName} 
                  className="h-10 w-auto rounded-lg"
                />
              )}
              <div>
                <h3 className="font-display font-bold bg-gradient-to-r from-yellow-300 via-white to-pink-200 bg-clip-text text-transparent drop-shadow-sm">{displayName}</h3>
                <p className="text-sm text-white/90">Online agora</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
            >
              <X className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      message.type === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    <p className="whitespace-pre-line">{message.content}</p>
                    {message.options && (
                      <div className={`mt-3 ${
                        message.id === "day-of-month" 
                          ? "" 
                          : "flex flex-wrap gap-2"
                      }`}>
                        {message.id === "day-of-month" && (
                          <div className="grid grid-cols-7 gap-1 mb-1">
                            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                              <div key={`wh-${i}`} className="w-9 h-7 flex items-center justify-center text-xs font-bold text-muted-foreground">
                                {d}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className={message.id === "day-of-month" ? "grid grid-cols-7 gap-1" : "contents"}>
                          {message.options.map((option, idx) => {
                            if (message.id === "day-of-month" && option === "") {
                              return <div key={`empty-${idx}`} className="w-9 h-9" />;
                            }
                            const isPromoMonth = !isDynamic && message.id === "month" && campaignConfig.chatbot.promoMonths?.includes(option);
                            return (
                              <button
                                key={option || `opt-${idx}`}
                                onClick={() => 
                                  message.id === "day-of-month" 
                                    ? handleDayOfMonthSelect(option) 
                                    : handleOptionSelect(option)
                                }
                                className={`${
                                  message.id === "day-of-month"
                                    ? "bg-card text-foreground w-9 h-9 rounded-lg text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm flex items-center justify-center"
                                    : isPromoMonth
                                      ? "bg-gradient-to-r from-primary to-festive text-primary-foreground px-4 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-all shadow-md ring-2 ring-primary/30"
                                      : "bg-card text-foreground px-4 py-2 rounded-full text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm"
                                }`}
                              >
                                {isPromoMonth ? `🎉 ${option}` : option}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {inputType && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 border-t border-border"
            >
              <p className="text-sm text-muted-foreground mb-2">
                {inputType === "name" ? "Digite seu nome:" : "Digite seu WhatsApp:"}
              </p>
              {/* Emoji Picker */}
              <AnimatePresence>
                {showEmojis && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-2 grid grid-cols-10 gap-1 bg-muted rounded-xl p-2 max-h-32 overflow-y-auto"
                  >
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setInputValue((prev) => prev + emoji);
                          setShowEmojis(false);
                        }}
                        className="text-lg hover:bg-card rounded p-1 transition-colors flex items-center justify-center"
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex gap-2">
                {inputType === "name" && (
                  <button
                    type="button"
                    onClick={() => setShowEmojis(!showEmojis)}
                    className="bg-muted border border-border rounded-full p-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                )}
                <input
                  type={inputType === "whatsapp" ? "tel" : "text"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleInputSubmit()}
                  placeholder={inputType === "name" ? "Seu nome completo" : "(11) 99999-9999"}
                  className="flex-1 bg-muted border border-border rounded-full px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleInputSubmit}
                  disabled={isSaving}
                  className="bg-primary text-primary-foreground p-3 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>
          )}

          {/* Complete State */}
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 border-t border-border space-y-3"
            >
              <p className="text-sm text-muted-foreground text-center mb-2">
                Ou fale diretamente conosco:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {isDynamic && companyWhatsApp ? (
                  // Dynamic mode: single WhatsApp button
                  <a
                    href={`https://wa.me/55${companyWhatsApp.replace(/\D/g, '')}?text=${encodeURIComponent(buildWhatsAppMessage())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full transition-all duration-300 text-sm font-medium hover:scale-105"
                  >
                    <MessageCircle size={16} className="transition-transform duration-300 group-hover:scale-110" />
                    <span>{displayName}</span>
                  </a>
                ) : !isDynamic ? (
                  // Default Castelo mode: two WhatsApp buttons
                  <>
                    <a
                      href={`https://wa.me/5515991336278?text=${encodeURIComponent(buildWhatsAppMessage())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full transition-all duration-300 text-sm font-medium hover:scale-105"
                    >
                      <MessageCircle size={16} className="transition-transform duration-300 group-hover:scale-110" />
                      <MapPin size={12} />
                      <span>Manchester</span>
                    </a>
                    <a
                      href={`https://wa.me/5515974034646?text=${encodeURIComponent(buildWhatsAppMessage())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full transition-all duration-300 text-sm font-medium hover:scale-105"
                    >
                      <MessageCircle size={16} className="transition-transform duration-300 group-hover:scale-110" />
                      <MapPin size={12} />
                      <span>Trujilo</span>
                    </a>
                  </>
                ) : null}
              </div>
              <button
                onClick={resetChat}
                className="w-full bg-muted text-foreground py-3 rounded-full font-medium hover:bg-muted/80 transition-colors"
              >
                Iniciar nova conversa
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
