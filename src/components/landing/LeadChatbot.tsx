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

interface LeadChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LeadChatbot({ isOpen, onClose }: LeadChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [leadData, setLeadData] = useState<LeadData>({});
  const [inputValue, setInputValue] = useState("");
  const [inputType, setInputType] = useState<"name" | "whatsapp" | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Generate day options based on selected month
  const getDaysInMonth = (month: string): number => {
    const monthMap: Record<string, number> = {
      "Fevereiro": 28, // 2026 is not a leap year
      "Março": 31,
      "Abril": 30,
      "Maio": 31,
      "Junho": 30,
      "Julho": 31,
      "Agosto": 31,
      "Setembro": 30,
      "Outubro": 31,
      "Novembro": 30,
      "Dezembro": 31,
    };
    return monthMap[month] || 31;
  };

  const addDayOfMonthStep = (month: string) => {
    const daysInMonth = getDaysInMonth(month);
    const dayOptions = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
    setMessages((prev) => [
      ...prev,
      {
        id: "day-of-month",
        type: "bot",
        content: `Para qual dia de ${month} você gostaria de agendar?`,
        options: dayOptions,
      },
    ]);
  };

  const handleDayOfMonthSelect = (day: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content: `Dia ${day}`,
    };
    setMessages((prev) => [...prev, userMessage]);
    setLeadData((prev) => ({ ...prev, dayOfMonth: parseInt(day) }));

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: "guests",
          type: "bot",
          content: "Para quantas pessoas será a festa?",
          options: campaignConfig.chatbot.guestOptions,
        },
      ]);
      setCurrentStep(3);
    }, 500);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        setMessages([
          {
            id: "welcome",
            type: "bot",
            content: "Oi 👋 Que bom te ver por aqui!\n\nVou te fazer algumas perguntas rápidas para montar seu orçamento com a promoção 😉",
          },
        ]);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: "unit",
              type: "bot",
              content: "Em qual unidade você deseja fazer sua festa?",
              options: campaignConfig.chatbot.unitOptions,
            },
          ]);
        }, 800);
      }, 500);
    }
  }, [isOpen, messages.length]);

  const handleOptionSelect = (option: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content: option,
    };
    setMessages((prev) => [...prev, userMessage]);

    setTimeout(() => {
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
          // Check if selected month is outside promo period
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
          // Day of month selection (handled separately via handleDayOfMonthSelect)
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
    }, 500);
  };

  // Função para enviar mensagem via W-API (sem autenticação - endpoint público via unit)
  const sendWelcomeMessage = async (phone: string, unit: string, leadInfo: LeadData) => {
    try {
      // Normalizar unidade
      const normalizedUnit = unit === "Trujilo" ? "Trujillo" : unit;

      // Formatar número do lead
      const cleanPhone = phone.replace(/\D/g, '');
      const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

      // Montar mensagem com os dados do lead
      const message = `Olá!\n\nVim pelo site do Castelo da Diversão e gostaria de saber mais sobre a promoção!\n\n*Meus dados:*\nNome: ${leadInfo.name || ''}\nUnidade: ${unit}\nData: ${leadInfo.dayOfMonth || ''}/${leadInfo.month || ''}\nConvidados: ${leadInfo.guests || ''}\n\nVou dar continuidade no seu atendimento!!\n\nEscolha a opção que mais te agrada:\n*1* - Receber agora meu orçamento\n*2* - Falar com um atendente`;

      // Enviar mensagem via edge function passando apenas a unit (a edge function busca a instância)
      const { error } = await supabase.functions.invoke('wapi-send', {
        body: {
          action: 'send-text',
          phone: phoneWithCountry,
          message,
          unit: normalizedUnit, // A edge function vai buscar a instância pela unidade
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
        
        // Função para criar lead via edge function (com rate limiting e validação)
        const submitLead = async (unit: string) => {
          const { error } = await supabase.functions.invoke('submit-lead', {
            body: {
              name: leadData.name,
              whatsapp: whatsappValue,
              unit: unit,
              month: leadData.month,
              day_of_month: leadData.dayOfMonth,
              guests: leadData.guests,
              campaign_id: campaignConfig.campaignId,
              campaign_name: campaignConfig.campaignName,
              company_id: campaignConfig.companyId,
            },
          });
          if (error) throw error;
          console.log(`Lead criado para ${unit}`);
        };
        
        // Submit lead (always as a single record, even for "As duas")
        await submitLead(leadData.unit!);

        // Send welcome message(s) in background
        if (leadData.unit === "As duas") {
          Promise.all([
            sendWelcomeMessage(whatsappValue, "Manchester", finalLeadData),
            sendWelcomeMessage(whatsappValue, "Trujillo", finalLeadData),
          ]).catch(err => console.error("Erro ao enviar mensagem automática:", err));
        } else if (leadData.unit) {
          sendWelcomeMessage(whatsappValue, leadData.unit, finalLeadData)
            .catch(err => console.error("Erro ao enviar mensagem automática:", err));
        }

        // Mostrar confirmação imediatamente após salvar o lead
        setMessages((prev) => [
          ...prev,
          {
            id: "complete",
            type: "bot",
            content: `Prontinho 🎉\n\nRecebemos suas informações e nossa equipe vai entrar em contato em breve para confirmar valores e disponibilidade da sua data.\n\nPromoção válida conforme regras da campanha: ${campaignConfig.campaignName}\n\nAcabei de te enviar uma mensagem no seu WhatsApp, dá uma olhadinha lá! 📲`,
          },
        ]);
        setIsComplete(true);
        // Auto-close chat after 5 seconds
        setTimeout(() => {
          onClose();
        }, 5000);
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
  };

  if (!isOpen) return null;

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
              <img 
                src={logoCastelo} 
                alt="Castelo da Diversão" 
                className="h-10 w-auto"
              />
              <div>
                <h3 className="font-display font-bold bg-gradient-to-r from-yellow-300 via-white to-pink-200 bg-clip-text text-transparent drop-shadow-sm">Castelo da Diversão</h3>
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
                          ? "grid grid-cols-7 gap-1" 
                          : "flex flex-wrap gap-2"
                      }`}>
                        {message.options.map((option) => {
                          const isPromoMonth = message.id === "month" && campaignConfig.chatbot.promoMonths?.includes(option);
                          return (
                            <button
                              key={option}
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
                Ou fale diretamente com uma unidade:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <a
                  href={`https://wa.me/5515991336278?text=${encodeURIComponent(
                    `Olá!\n\nVim pelo site do Castelo da Diversão e gostaria de saber mais sobre a promoção!\n\n*Meus dados:*\nNome: ${leadData.name || ''}\nUnidade: ${leadData.unit || ''}\nData: ${leadData.dayOfMonth || ''}/${leadData.month || ''}\nConvidados: ${leadData.guests || ''}\n\nVou dar continuidade no seu atendimento!!\n\nEscolha a opção que mais te agrada:\n*1* - Receber agora meu orçamento\n*2* - Falar com um atendente`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full transition-all duration-300 text-sm font-medium hover:scale-105"
                >
                  <MessageCircle size={16} className="transition-transform duration-300 group-hover:scale-110" />
                  <MapPin size={12} />
                  <span>Manchester</span>
                </a>
                <a
                  href={`https://wa.me/5515974034646?text=${encodeURIComponent(
                    `Olá!\n\nVim pelo site do Castelo da Diversão e gostaria de saber mais sobre a promoção!\n\n*Meus dados:*\nNome: ${leadData.name || ''}\nUnidade: ${leadData.unit || ''}\nData: ${leadData.dayOfMonth || ''}/${leadData.month || ''}\nConvidados: ${leadData.guests || ''}\n\nVou dar continuidade no seu atendimento!!\n\nEscolha a opção que mais te agrada:\n*1* - Receber agora meu orçamento\n*2* - Falar com um atendente`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full transition-all duration-300 text-sm font-medium hover:scale-105"
                >
                  <MessageCircle size={16} className="transition-transform duration-300 group-hover:scale-110" />
                  <MapPin size={12} />
                  <span>Trujilo</span>
                </a>
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
