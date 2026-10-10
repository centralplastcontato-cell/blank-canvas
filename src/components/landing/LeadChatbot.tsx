import { useState, useRef, useEffect } from "react";
import { checkBrWhatsapp } from "@/lib/brWhatsapp";
import { whatsappLink } from "@/lib/whatsappLink";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, MessageCircle, MapPin, Smile } from "lucide-react";
import { campaignConfig } from "@/config/campaignConfig";
import { originLabel, originWelcomeIntro } from "@/lib/landingOrigin";
import { captureLandingUtms } from "@/lib/landingUtm";
import { type ClosedPeriod, daysInMonthOption, firstWeekdayOf, formatLeadDate, isClosedLeadDay, isPastDay, monthOptionLabel, parseClosedPeriods, upcomingMonthOptions } from "@/lib/partyDate";
import { trackMetaPixelEvent } from "@/lib/metaPixel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import logoCastelo from "@/assets/logo-castelo.png";

interface Message {
  id: string;
  type: "bot" | "user";
  content: string;
  options?: string[];
  /** Opções que aparecem mas não dá para escolher (dias que já passaram) */
  disabledOptions?: string[];
  /** Calendário: o mês mostrado (o recesso é conferido na hora de desenhar) */
  monthOption?: string;
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

interface VenueOption {
  id: string;
  label: string;
  emoji?: string;
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
  redirect_completion_message?: string | null;
  whatsapp_welcome_template?: string | null;
  venue_question_enabled?: boolean;
  venue_question_text?: string;
  venue_options?: VenueOption[];
  external_location_question?: string;
  external_location_required?: boolean;
}

interface LeadChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string;
  companyName?: string;
  companyLogo?: string | null;
  companyWhatsApp?: string;
  lpBotConfig?: LPBotConfig | null;
  unitOptions?: string[];
  interestContext?: string | null;
  /** Origem da visita (ex.: "mesa"). Só a LP do Castelo informa; nas demais fica vazio e nada muda. */
  origem?: string | null;
}


export function LeadChatbot({ isOpen, onClose, companyId, companyName, companyLogo, companyWhatsApp, lpBotConfig, unitOptions, interestContext, origem }: LeadChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  // UTMs do anúncio: lidas ao abrir a página (a URL pode mudar até o envio do lead)
  const [initialUtms] = useState(captureLandingUtms);
  const [currentStep, setCurrentStep] = useState(0);
  const [leadData, setLeadData] = useState<LeadData>({});
  const [inputValue, setInputValue] = useState("");
  const [inputType, setInputType] = useState<"name" | "whatsapp" | "external_location" | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // WhatsApp do número que recebeu este lead (o botão "fale diretamente" abre ele)
  const [leadWhatsapp, setLeadWhatsapp] = useState<string | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [redirectAccepted, setRedirectAccepted] = useState<boolean | null>(null);
  const [venueChoice, setVenueChoice] = useState<VenueOption | null>(null);
  const [externalLocation, setExternalLocation] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Recesso do buffet (Configurar IA): esses dias ficam bloqueados no calendário
  const [closedPeriods, setClosedPeriods] = useState<ClosedPeriod[]>([]);
  // Busca já ao carregar a página (antes de abrir o chat) e tenta de novo se
  // falhar — sem isso, uma leitura que falhou deixava o calendário sem o recesso
  useEffect(() => {
    const id = companyId || campaignConfig.companyId;
    if (!id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = (attempt: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).rpc("public_closed_periods", { p_company_id: id })
        .then(({ data, error }: { data: unknown; error: unknown }) => {
          if (cancelled) return;
          if (error) throw error;
          setClosedPeriods(parseClosedPeriods(data));
        })
        .catch(() => {
          if (!cancelled && attempt < 3) timer = setTimeout(() => load(attempt + 1), 2000 * attempt);
        });
    };
    load(1);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [companyId]);

  // Build dynamic interest context: prop > venue choice
  const venueInterestText = venueChoice
    ? venueChoice.id === 'externo'
      ? `${venueChoice.emoji || '🌳'} Festa externa${externalLocation ? ` em ${externalLocation}` : ''}`
      : `${venueChoice.emoji || '🏛️'} ${venueChoice.label}`
    : null;
  const effectiveInterestContext = interestContext || venueInterestText;

  // Detect if we're in dynamic (multi-company) mode
  const isDynamic = !!companyName;
  const displayName = companyName || "Castelo da Diversão";
  const displayLogo = isDynamic ? companyLogo : logoCastelo;
  // Visual novo só no chat do Castelo; as LPs dos outros buffets ficam como estão
  const castelo = !isDynamic;

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

  // Calendário do mês escolhido: dia da semana pelo ano certo e dias que já passaram bloqueados
  const addDayOfMonthStep = (month: string) => {
    const daysInMonth = daysInMonthOption(month);
    // Padding empty strings so day 1 falls on the correct weekday column
    const padding = Array.from({ length: firstWeekdayOf(month) }, () => "");
    const days = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
    const calendarGrid = [...padding, ...days];
    // Recesso fica de fora daqui: é conferido ao desenhar, com o recesso mais recente
    const pastDays = days.filter((d) => isPastDay(month, Number(d)));

    setMessages((prev) => [
      ...prev,
      {
        id: "day-of-month",
        type: "bot",
        content: `Para qual dia de ${monthOptionLabel(month)} você gostaria de agendar?`,
        options: calendarGrid,
        disabledOptions: pastDays,
        monthOption: month,
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

  // Meses da LP configurados no painel; sem configuração, os próximos 12 com ano
  const dynamicMonthOptions = lpBotConfig?.month_options || upcomingMonthOptions();
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

  // Continues the flow after the optional venue (Espaço x Externa) step.
  // If `venue` is provided, it represents the user choice for venueChoice (state may not be updated yet).
  const proceedAfterVenue = (venue?: VenueOption | null) => {
    const venueIsExternal = (venue?.id || venueChoice?.id) === 'externo';

    if (isDynamic) {
      // Dynamic mode: check if multiple units exist
      if (unitOptions && unitOptions.length >= 2) {
        // For external venue we skip unit selection (festa não é em uma unidade nossa)
        if (venueIsExternal) {
          setLeadData((prev) => ({ ...prev, unit: unitOptions[0] }));
          const monthQ = lpBotConfig?.month_question || "Para qual mês você pretende realizar a festa?";
          setMessages((prev) => [
            ...prev,
            { id: "month", type: "bot", content: monthQ, options: dynamicMonthOptions },
          ]);
          setCurrentStep(1);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: "unit",
              type: "bot",
              content: "Em qual unidade você deseja fazer sua festa?",
              options: [...unitOptions, "As duas"],
            },
          ]);
          setCurrentStep(0); // unit step
        }
      } else {
        setLeadData((prev) => ({ ...prev, unit: (unitOptions && unitOptions.length === 1) ? unitOptions[0] : (companyName || '') }));
        const monthQ = lpBotConfig?.month_question || "Para qual mês você pretende realizar a festa?";
        setMessages((prev) => [
          ...prev,
          { id: "month", type: "bot", content: monthQ, options: dynamicMonthOptions },
        ]);
        setCurrentStep(1);
      }
    } else {
      setLeadData((prev) => ({ ...prev, unit: "Trujillo" }));
      setMessages((prev) => [
        ...prev,
        {
          id: "month",
          type: "bot",
          content: "Para qual mês você pretende realizar a festa?",
          options: upcomingMonthOptions(),
        },
      ]);
      setCurrentStep(1);
    }
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMsg = isDynamic
        ? (lpBotConfig?.welcome_message || `Oi 👋 Que bom te ver por aqui!\n\nVou te fazer algumas perguntas rápidas para montar seu orçamento 😉`)
        : "Oi 👋 Que bom te ver por aqui!\n\nVou te fazer algumas perguntas rápidas para montar seu orçamento 😉";

      const venueEnabled = isDynamic && lpBotConfig?.venue_question_enabled === true && Array.isArray(lpBotConfig?.venue_options) && (lpBotConfig.venue_options?.length || 0) > 0;

      setTimeout(() => {
        setMessages([
          {
            id: "welcome",
            type: "bot",
            content: welcomeMsg,
          },
        ]);
        setTimeout(() => {
          if (venueEnabled) {
            // Step 0: Venue (Espaço vs Externa)
            const opts = (lpBotConfig!.venue_options as VenueOption[]).map(o => `${o.emoji ? o.emoji + ' ' : ''}${o.label}`);
            setMessages((prev) => [
              ...prev,
              {
                id: "venue",
                type: "bot",
                content: lpBotConfig?.venue_question_text || "Onde você quer fazer a festa?",
                options: opts,
              },
            ]);
            setCurrentStep(-1); // venue step
          } else {
            proceedAfterVenue(null);
          }
        }, 800);
      }, 500);
    }
  }, [isOpen, messages.length, isDynamic, companyName, lpBotConfig, unitOptions]);


  const handleOptionSelect = (option: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content: option,
    };
    setMessages((prev) => [...prev, userMessage]);

    setTimeout(() => {
      // Step -1 (venue) is shared across modes
      if (currentStep === -1) {
        const venueOpts = (lpBotConfig?.venue_options as VenueOption[]) || [];
        const matched = venueOpts.find(o => option.includes(o.label));
        const chosen = matched || venueOpts[0] || null;
        setVenueChoice(chosen);
        if (chosen?.id === 'externo' && (lpBotConfig?.external_location_required !== false)) {
          // Ask for bairro+cidade as free text input
          setMessages((prev) => [
            ...prev,
            {
              id: "external-location",
              type: "bot",
              content: lpBotConfig?.external_location_question || "Perfeito! Em qual *bairro e cidade* será a festa? 📍",
              isInput: true,
            },
          ]);
          setInputType("external_location");
        } else {
          proceedAfterVenue(chosen);
        }
        return;
      }

      if (isDynamic) {
        // Dynamic mode flow: unit(0) -> month(1) -> day(day-of-month) -> guests(2) -> capture(3)
        switch (currentStep) {
          case 0: // Unit selected (dynamic multi-unit)
            setLeadData((prev) => ({ ...prev, unit: option }));
            {
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
              setCurrentStep(1);
            }
            break;
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
        // Default Castelo mode flow: month(1) -> day -> guests(3) -> capture(4)
        switch (currentStep) {
          case 1:
            setLeadData((prev) => ({ ...prev, month: option }));
            addDayOfMonthStep(option);
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
      // 11 dígitos = DDD + celular (o DDD 55 do RS não pode ser confundido com o código do país)
      const phoneWithCountry = cleanPhone.length === 11 ? `55${cleanPhone}` : cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

      const redirectText = (redirectInfo?.customMessage && redirectInfo.customMessage.trim())
        || `Nossa capacidade máxima é de ${redirectInfo?.limit || 0} convidados.`;

      // "sábado, 18 de setembro de 2027" — com ano e dia da semana, sem ambiguidade
      const dateStr = formatLeadDate(leadInfo.month, leadInfo.dayOfMonth);
      const interestLine = effectiveInterestContext ? `\n🎯 Interesse: ${effectiveInterestContext}` : '';
      // Mensagem na voz do buffet (quem envia), cumprimentando pelo primeiro nome
      const firstName = (leadInfo.name || '').trim().split(/\s+/)[0] || '';
      const greeting = firstName ? `Olá, *${firstName}*! 👋` : 'Olá! 👋';
      // Quem veio do QR Code da mesa é recebido pela festa; os demais, pela frase de sempre
      const intro = originWelcomeIntro(origem, displayName) ?? `Recebemos seu pedido pelo site do *${displayName}*! ✨`;
      const defaultNormalMsg = `${greeting} ${intro}\n\nAnotei por aqui:${interestLine}\n🗓️ Data: ${dateStr}\n👥 Convidados: ${leadInfo.guests || ''}\n\nPara agilizar, me diz o que você prefere 👇\n\n1️⃣ - 📩 Receber o orçamento agora\n2️⃣ - 💬 Falar com um atendente`;

      const applyTemplate = (template: string) => template
        .replace(/\{primeiro_nome\}/g, firstName)
        .replace(/\{nome\}/g, leadInfo.name || '')
        .replace(/\{unidade\}/g, unit)
        .replace(/\{data\}/g, dateStr)
        .replace(/\{convidados\}/g, leadInfo.guests || '')
        .replace(/\{empresa\}/g, displayName)
        .replace(/\{interesse\}/g, effectiveInterestContext || '');

      const redirectDefaultMsg = `${greeting} ${intro}\n\nAnotei por aqui:${interestLine}\n🗓️ Data: ${dateStr}\n👥 Convidados: ${leadInfo.guests || ''}\n\n${redirectText}\n\nObrigado pelo interesse! 💜`;

      const message = redirectInfo
        ? redirectDefaultMsg
        : lpBotConfig?.whatsapp_welcome_template
          ? applyTemplate(lpBotConfig.whatsapp_welcome_template)
          : defaultNormalMsg;

      const { data: sendData, error } = await supabase.functions.invoke('wapi-send', {
        body: {
          action: 'send-text',
          phone: phoneWithCountry,
          contactName: leadInfo.name,
          message,
          unit: normalizedUnit,
          lpMode: true,
          // Com a IA atendendo este cliente, o servidor manda a boas-vindas dela
          // (sem o menu 1/2) e ela já começa sabendo nome, data e convidados
          siteLead: redirectInfo ? undefined : {
            name: leadInfo.name || '',
            month: leadInfo.month || '',
            day: leadInfo.dayOfMonth || null,
            guests: leadInfo.guests || '',
            interest: effectiveInterestContext || '',
            intro,
          },
        },
      });

      if (error) {
        console.error('Erro ao enviar mensagem automática:', error);
      } else {
        console.log(`Mensagem automática enviada para ${phoneWithCountry} via ${normalizedUnit}`);
        // Número que de fato mandou a boas-vindas (pode ter trocado no failover)
        if (typeof sendData?.fromPhone === 'string' && sendData.fromPhone) setLeadWhatsapp(sendData.fromPhone);
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

    if (inputType === "external_location") {
      const loc = inputValue.trim();
      setExternalLocation(loc);
      setInputValue("");
      setInputType(null);
      // Continue flow after a small delay so the bot message renders
      setTimeout(() => proceedAfterVenue(venueChoice), 400);
      return;
    } else if (inputType === "name") {
      const raw = inputValue.trim();
      const lower = raw.toLowerCase();
      const onlyDigits = /^[\d\s+()\-]+$/.test(raw);
      const hasForbiddenWord = /(anivers[áa]rio|\banos?\b|\bmes(es)?\b|festa|convidad)/i.test(lower);
      const hasDigit = /\d/.test(raw);
      const hasLetters = /[a-zà-ú]/i.test(raw);
      const tooShort = raw.length < 2;
      if (tooShort || onlyDigits || hasForbiddenWord || hasDigit || !hasLetters) {
        setMessages((prev) => [...prev, {
          id: `bot-${Date.now()}`,
          type: "bot",
          content: "Ops! Preciso do *seu nome* (ex.: Maria Silva) — sem números, idade ou descrição da festa. Pode escrever de novo? 😊",
        }]);
        setInputValue("");
        return;
      }
      setLeadData((prev) => ({ ...prev, name: raw }));
      setInputValue("");
      setInputType("whatsapp");
    } else if (inputType === "whatsapp") {
      // Confere o número antes de salvar: com um dígito a menos a boas-vindas
      // automática ia para um número que não existe
      const phoneCheck = checkBrWhatsapp(inputValue);
      if (!phoneCheck.ok) {
        setMessages((prev) => [...prev, {
          id: `bot-${Date.now()}`,
          type: "bot",
          content: (phoneCheck as { reason: string }).reason === "short"
            ? "Hmm, parece que faltou um número 🤔 O WhatsApp precisa do *DDD + 9 dígitos*, ex.: (11) 99999-9999. Pode conferir e mandar de novo?"
            : "Hmm, esse número não parece um celular com WhatsApp 🤔 Manda o *DDD + 9 dígitos*, ex.: (11) 99999-9999.",
        }]);
        setInputValue("");
        return;
      }
      const whatsappValue = (phoneCheck as { digits: string }).digits;
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
          if (origem) body.origem = origem;
          const utms = captureLandingUtms() ?? initialUtms;
          if (utms) body.utm = utms;
          if (isRedirected) {
            body.status = 'transferido';
            body.observacoes = `Redirecionado para ${lpBotConfig?.guest_limit_redirect_name || 'buffet parceiro'} - acima de ${lpBotConfig?.guest_limit} convidados`;
          }
          const { data: responseData, error } = await supabase.functions.invoke('submit-lead', { body });
          if (error) throw error;
          const resolvedUnit = responseData?.resolved_unit || unit;
          if (typeof responseData?.unit_whatsapp === 'string' && responseData.unit_whatsapp) setLeadWhatsapp(responseData.unit_whatsapp);
          console.log(`Lead criado para ${resolvedUnit}${isRedirected ? ' (transferido)' : ''}`);
          return resolvedUnit;
        };
        
        const resolvedUnit = await submitLead(leadData.unit!);
        // Pixel da Meta: só dispara nas LPs que carregaram o Pixel (hoje, a do Castelo)
        trackMetaPixelEvent("Lead");

        // Send welcome message(s) in background
        const redirectInfo = isRedirected ? {
          partnerName: lpBotConfig?.guest_limit_redirect_name || 'buffet parceiro',
          limit: lpBotConfig?.guest_limit || 0,
          customMessage: (lpBotConfig?.guest_limit_message && lpBotConfig.guest_limit_message.trim()) || null,
        } : undefined;

        if (leadData.unit === "As duas") {
          // Send to all units (dynamic or default)
          const allUnits = isDynamic && unitOptions?.length ? unitOptions : ["Trujillo"];
          Promise.all(
            allUnits.map(u => sendWelcomeMessage(whatsappValue, u, finalLeadData, redirectInfo))
          ).catch(err => console.error("Erro ao enviar mensagem automática:", err));
        } else {
          // Use the resolved unit from the server (e.g., "Vendas 1" or "Vendas 2")
          sendWelcomeMessage(whatsappValue, resolvedUnit, finalLeadData, redirectInfo)
            .catch(err => console.error("Erro ao enviar mensagem automática:", err));
        }

        const completionMessage = isRedirected
          ? ((lpBotConfig?.redirect_completion_message && lpBotConfig.redirect_completion_message.trim())
            ? lpBotConfig.redirect_completion_message
            : `Prontinho! 🎉\n\nSeus dados foram encaminhados para o ${lpBotConfig?.guest_limit_redirect_name || 'buffet parceiro'}. Eles entrarão em contato em breve!\n\nObrigado pelo interesse! 💜`)
          : isDynamic
          ? (lpBotConfig?.completion_message || `Prontinho 🎉\n\nRecebemos suas informações e nossa equipe vai entrar em contato em breve para confirmar valores e disponibilidade da sua data.\n\nAcabei de te enviar uma mensagem no seu WhatsApp, dá uma olhadinha lá! 📲`)
          : `Prontinho 🎉\n\nRecebemos suas informações e nossa equipe vai entrar em contato em breve para confirmar valores e disponibilidade da sua data.\n\nAcabei de te enviar uma mensagem no seu WhatsApp, dá uma olhadinha lá! 📲`;

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
    setLeadWhatsapp(null);
    setMessages([]);
    setCurrentStep(0);
    setLeadData({});
    setInputValue("");
    setInputType(null);
    setIsComplete(false);
    setIsSaving(false);
    setRedirectAccepted(null);
    setVenueChoice(null);
    setExternalLocation("");
  };

  useEffect(() => {
    if (!isOpen) {
      resetChat();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build WhatsApp message for final buttons.
  // Esta mensagem e enviada PELO CLIENTE (pre-preenchida no wa.me), por isso
  // fica na voz dele — sem trechos na voz do buffet.
  // Mesmo número que recebeu o lead, para a conversa não se dividir em dois
  const leadWhatsappWithCountry = leadWhatsapp
    ? (leadWhatsapp.length <= 11 ? `55${leadWhatsapp}` : leadWhatsapp)
    : null;

  const buildWhatsAppMessage = () => {
    const via = originLabel(origem) ?? 'site';
    // Sem emojis: em alguns celulares eles chegavam como "�"
    return `Olá! Vim pelo ${via} do *${displayName}* e gostaria de saber mais!\n\n*Meus dados:*\nNome: ${leadData.name || ''}\nData: ${formatLeadDate(leadData.month, leadData.dayOfMonth)}\nConvidados: ${leadData.guests || ''}`;
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
          <div
            className={castelo ? "p-4 flex items-center justify-between" : "bg-gradient-hero p-4 flex items-center justify-between"}
            style={castelo ? { background: "linear-gradient(110deg, #E91E63 0%, #C2185B 45%, #F57C00 100%)" } : undefined}
          >
            <div className="flex items-center gap-3">
              {displayLogo && (castelo ? (
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-white shadow-md ring-2 ring-white/60 flex items-center justify-center overflow-hidden">
                    <img src={displayLogo} alt={displayName} className="w-10 h-auto" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-400 ring-2 ring-white" />
                </div>
              ) : (
                <img 
                  src={displayLogo} 
                  alt={displayName} 
                  className="h-10 w-auto rounded-lg"
                />
              ))}
              <div>
                <h3 className={castelo ? "font-display font-bold text-white text-lg leading-tight" : "font-display font-bold bg-gradient-to-r from-yellow-300 via-white to-pink-200 bg-clip-text text-transparent drop-shadow-sm"}>{displayName}</h3>
                <p className="text-sm text-white/90">{castelo ? "Online agora · resposta rápida" : "Online agora"}</p>
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
          <div
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={castelo ? { background: "linear-gradient(180deg, #FFF5F9 0%, #FFFDF5 100%)" } : undefined}
          >
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.type === "user" ? "justify-end" : "justify-start"} ${castelo ? "items-end gap-2" : ""}`}
                >
                  {castelo && message.type === "bot" && (
                    <div className="w-8 h-8 flex-shrink-0 rounded-full bg-white shadow ring-1 ring-pink-100 flex items-center justify-center overflow-hidden">
                      <img src={logoCastelo} alt="" className="w-7 h-auto" />
                    </div>
                  )}
                  <div
                    className={`${castelo ? "max-w-[85%]" : "max-w-[80%]"} rounded-2xl p-4 ${
                      castelo
                        ? message.type === "user"
                          ? "text-white rounded-br-md shadow-md"
                          : "bg-white text-foreground rounded-bl-md shadow-sm ring-1 ring-pink-100"
                        : message.type === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                    }`}
                    style={castelo && message.type === "user" ? { background: "linear-gradient(110deg, #E91E63, #F57C00)" } : undefined}
                  >
                    <p className="whitespace-pre-line">{message.content}</p>
                    {message.options && (
                      <div className={`mt-3 ${
                        message.id === "day-of-month" 
                          ? "" 
                          : castelo && message.options.length >= 6
                            ? "grid grid-cols-3 gap-2"
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
                            if (
                              message.disabledOptions?.includes(option) ||
                              (message.id === "day-of-month" && message.monthOption && isClosedLeadDay(message.monthOption, Number(option), closedPeriods))
                            ) {
                              return (
                                <div key={`past-${idx}`} aria-disabled="true" className="w-9 h-9 rounded-lg text-sm flex items-center justify-center text-muted-foreground/40 line-through">
                                  {option}
                                </div>
                              );
                            }
                            // "Outubro/26": o ano vai embaixo, menor (cabe na grade do celular)
                            const monthWithYear = message.id === "month" ? option.match(/^(\p{L}+)\/(\d{2,4})$/u) : null;
                            const isPromoMonth = false;
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
                                    ? castelo
                                      ? "bg-pink-50 text-foreground w-9 h-9 rounded-lg text-sm font-semibold ring-1 ring-pink-100 hover:bg-[#E91E63] hover:text-white transition-colors flex items-center justify-center"
                                      : "bg-card text-foreground w-9 h-9 rounded-lg text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm flex items-center justify-center"
                                    : isPromoMonth
                                      ? "bg-gradient-to-r from-primary to-festive text-primary-foreground px-4 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-all shadow-md ring-2 ring-primary/30"
                                      : castelo
                                        ? "bg-white text-[#AD1457] px-1 sm:px-3 py-2.5 rounded-xl text-[13px] sm:text-sm font-semibold whitespace-nowrap ring-1 ring-pink-200 shadow-sm hover:bg-[#E91E63] hover:text-white hover:ring-[#E91E63] hover:-translate-y-0.5 active:scale-95 transition-all"
                                        : "bg-card text-foreground px-4 py-2 rounded-full text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm"
                                }`}
                              >
                                {isPromoMonth ? `🎉 ${option}` : monthWithYear ? (
                                  <span className="flex flex-col items-center leading-tight">
                                    <span>{monthWithYear[1]}</span>
                                    <span className="text-[10px] font-medium opacity-70">{monthWithYear[2].length === 2 ? `20${monthWithYear[2]}` : monthWithYear[2]}</span>
                                  </span>
                                ) : option}
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
                {inputType === "name" ? "Digite seu nome:" : inputType === "whatsapp" ? "Digite seu WhatsApp:" : "Digite o bairro e cidade:"}
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
                  enterKeyHint={castelo ? "send" : undefined}
                  placeholder={inputType === "name" ? (castelo ? "Seu nome" : "Seu nome completo") : inputType === "whatsapp" ? "(11) 99999-9999" : "Ex: Vila Mariana, São Paulo"}
                  className={`flex-1 ${castelo ? "min-w-0 " : ""}bg-muted border border-border rounded-full px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary`}
                />
                {castelo ? (
                  // Botão com a palavra "Enviar": só o aviãozinho confundia (parecia o botão flutuante)
                  <button
                    onClick={handleInputSubmit}
                    disabled={isSaving}
                    className="shrink-0 text-white font-bold text-sm pl-4 pr-3.5 py-3 rounded-full shadow-md hover:scale-105 transition-transform disabled:opacity-50 flex items-center gap-1.5"
                    style={{ background: "linear-gradient(110deg, #E91E63, #F57C00)" }}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Enviar<Send className="w-4 h-4" /></>}
                  </button>
                ) : (
                  <button
                    onClick={handleInputSubmit}
                    disabled={isSaving}
                    className="bg-primary text-primary-foreground p-3 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                )}
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
                    href={whatsappLink(leadWhatsappWithCountry || `55${companyWhatsApp.replace(/\D/g, '')}`, buildWhatsAppMessage())}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full transition-all duration-300 text-sm font-medium hover:scale-105"
                  >
                    <MessageCircle size={16} className="transition-transform duration-300 group-hover:scale-110" />
                    <span>{displayName}</span>
                  </a>
                ) : !isDynamic ? (
                  // Default Castelo mode: Trujillo only
                  <a
                    href={whatsappLink(leadWhatsappWithCountry || "5515974034646", buildWhatsAppMessage())}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full transition-all duration-300 text-sm font-medium hover:scale-105"
                  >
                    <MessageCircle size={16} className="transition-transform duration-300 group-hover:scale-110" />
                    <MapPin size={12} />
                    <span>Trujillo</span>
                  </a>
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
