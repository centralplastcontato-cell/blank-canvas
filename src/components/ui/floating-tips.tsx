import { useState, useEffect, useRef, useCallback } from "react";
import { X, Lightbulb, ChevronLeft, ChevronRight, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const PLATFORM_TIPS = [
  {
    title: "📋 Organize seus Leads",
    text: "Arraste os cards no Kanban para mover leads entre etapas. Clique no card para ver detalhes e histórico completo.",
  },
  {
    title: "📅 Agende Visitas Rápido",
    text: "Na Central de Atendimento, clique no ícone de calendário ao lado do lead para agendar uma visita diretamente.",
  },
  {
    title: "💬 Atalhos no Chat",
    text: "Use '/' no chat do WhatsApp para acessar materiais de vendas, propostas e respostas rápidas.",
  },
  {
    title: "🔔 Filtros Inteligentes",
    text: "Na Central de Atendimento, use os filtros por unidade e status para encontrar conversas pendentes rapidamente.",
  },
  {
    title: "📊 Relatórios Comerciais",
    text: "Acesse a aba Inteligência para ver métricas de conversão, tempo de resposta e prioridades do dia.",
  },
  {
    title: "📝 Contratos Automatizados",
    text: "Em Contratos, crie modelos com variáveis automáticas. O sistema preenche dados do cliente e evento sozinho.",
  },
  {
    title: "💰 Controle Financeiro",
    text: "No módulo Financeiro, registre pagamentos e despesas por evento. Use os filtros de período para análises.",
  },
  {
    title: "🎯 Campanhas em Massa",
    text: "Em Campanhas, importe sua base de leads e envie mensagens personalizadas com variações automáticas.",
  },
  {
    title: "⚙️ Personalize Pacotes",
    text: "Em Configurações, cadastre pacotes, opcionais e grade de preços. Tudo aparece automaticamente nas propostas.",
  },
  {
    title: "👥 Gerencie sua Equipe",
    text: "Em Configurações > Equipe, defina permissões por unidade. Cada vendedor vê apenas seus próprios leads.",
  },
  {
    title: "🤖 Reativação Automática",
    text: "Ative a Reativação Inteligente em Configurações > Automações. Leads inativos recebem mensagens automáticas em 1, 2 e 3 meses.",
  },
  {
    title: "🔥 Score de Temperatura",
    text: "Cada lead tem um score de 0 a 100. Leads 'Quentes' e 'Prontos' devem ser priorizados para fechamento imediato.",
  },
  {
    title: "📈 Funil de Conversão",
    text: "Na aba Funil (Inteligência), veja o percentual de leads em cada etapa e identifique gargalos no processo de vendas.",
  },
  {
    title: "⚠️ Alertas Inteligentes",
    text: "O sistema detecta negociações paradas, queda de conversão e baixa ocupação. Veja os alertas no topo da Inteligência.",
  },
  {
    title: "📄 Formulários Públicos",
    text: "Crie formulários de avaliação, pré-festa e cardápio. Envie o link por WhatsApp e as respostas ficam vinculadas ao evento.",
  },
  {
    title: "🏦 Contas Bancárias",
    text: "Cadastre suas contas no Financeiro para controlar saldo, transferências e extrato detalhado por conta.",
  },
  {
    title: "📅 Checklist por Evento",
    text: "Crie templates de checklist reutilizáveis para padronizar a operação de cada tipo de festa.",
  },
  {
    title: "👷 Escalas de Freelancers",
    text: "Gere escalas mensais e envie o link para freelancers informarem disponibilidade direto pelo celular.",
  },
  {
    title: "🔍 Busca no WhatsApp",
    text: "Use a busca por conteúdo dentro das mensagens para encontrar informações em conversas longas.",
  },
  {
    title: "🌐 Landing Page Própria",
    text: "Personalize sua landing page em Configurações. Defina cores, fotos, depoimentos e formulário de captação.",
  },
  {
    title: "💳 Simulador de Taxas",
    text: "Cadastre as taxas de cada operadora de cartão e simule o valor líquido em transações de crédito e débito.",
  },
  {
    title: "📤 Exportar Dados",
    text: "Exporte leads para CSV na Central de Atendimento. No Financeiro, gere relatórios em PDF e Excel.",
  },
  {
    title: "🔄 Follow-ups Organizados",
    text: "Na aba Follow-ups (Inteligência), veja leads organizados por número de tentativas em um Kanban automático.",
  },
  {
    title: "⭐ Favoritos no WhatsApp",
    text: "Marque conversas como favoritas para acesso rápido. Elas aparecem fixas no topo da lista.",
  },
  {
    title: "🎂 Festas Fechadas",
    text: "Na aba Festas (Financeiro), acompanhe vendas fechadas no período com barra de progresso de pagamento.",
  },
  {
    title: "📱 Acesso pelo Celular",
    text: "A plataforma é responsiva. Acesse pelo celular para gerenciar leads, chat e agenda de qualquer lugar.",
  },
  {
    title: "🧾 Receitas Avulsas",
    text: "No Financeiro, registre receitas que não são de eventos (ex: aluguel de espaço) vinculadas a uma conta bancária.",
  },
  {
    title: "🔐 Permissões Granulares",
    text: "Restrinja acesso por módulo e unidade. Um gestor de filial vê apenas os dados da sua unidade.",
  },
  {
    title: "💡 Resumo IA por Lead",
    text: "Em cada card de lead, clique em 'Resumo IA' para obter um resumo da conversa e sugestão de próxima ação.",
  },
  {
    title: "🎉 Hub da Festa",
    text: "Cada evento tem um Hub com links públicos para checklist, presença e equipe — acessíveis sem login.",
  },
];

const STORAGE_KEY = "floating-tips-dismissed";
const TIP_INDEX_KEY = "floating-tips-index";
const ROTATION_INTERVAL = 30000;
const DESKTOP_WIDTH = 480;
const MOBILE_WIDTH = 320;

// Allow external reactivation
export function reactivateFloatingTips() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("floating-tips-reactivate"));
}

export function FloatingTips() {
  const [isVisible, setIsVisible] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) !== "true";
  });
  const [currentTip, setCurrentTip] = useState(() => {
    const saved = localStorage.getItem(TIP_INDEX_KEY);
    return saved ? parseInt(saved, 10) % PLATFORM_TIPS.length : 0;
  });
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasDraggedRef = useRef(false);

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
  const cardWidth = isDesktop ? DESKTOP_WIDTH : MOBILE_WIDTH;

  // Set initial position on mount (bottom-right)
  useEffect(() => {
    if (position.y === -1) {
      setPosition({
        x: Math.max(16, window.innerWidth - cardWidth - 32),
        y: Math.max(16, window.innerHeight - (isDesktop ? 320 : 280)),
      });
    }
  }, []);

  // Listen for reactivation
  useEffect(() => {
    const handler = () => {
      setIsVisible(true);
      setIsMinimized(false);
    };
    window.addEventListener("floating-tips-reactivate", handler);
    return () => window.removeEventListener("floating-tips-reactivate", handler);
  }, []);

  // Auto-rotate tips
  useEffect(() => {
    if (!isVisible || isMinimized) return;
    const timer = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentTip((prev) => {
          const next = (prev + 1) % PLATFORM_TIPS.length;
          localStorage.setItem(TIP_INDEX_KEY, String(next));
          return next;
        });
        setIsAnimating(false);
      }, 300);
    }, ROTATION_INTERVAL);
    return () => clearInterval(timer);
  }, [isVisible, isMinimized]);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const goNext = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentTip((prev) => {
        const next = (prev + 1) % PLATFORM_TIPS.length;
        localStorage.setItem(TIP_INDEX_KEY, String(next));
        return next;
      });
      setIsAnimating(false);
    }, 200);
  };

  const goPrev = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentTip((prev) => {
        const next = (prev - 1 + PLATFORM_TIPS.length) % PLATFORM_TIPS.length;
        localStorage.setItem(TIP_INDEX_KEY, String(next));
        return next;
      });
      setIsAnimating(false);
    }, 200);
  };

  // Improved drag using document-level listeners
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    hasDraggedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    setIsDragging(true);

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const dx = ev.clientX - dragStartRef.current.x;
      const dy = ev.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDraggedRef.current = true;
      }
      setPosition({
        x: Math.max(0, Math.min(dragStartRef.current.posX + dx, window.innerWidth - cardWidth)),
        y: Math.max(0, Math.min(dragStartRef.current.posY + dy, window.innerHeight - 80)),
      });
    };

    const onUp = () => {
      setIsDragging(false);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }, [position, cardWidth]);

  if (!isVisible) return null;

  const tip = PLATFORM_TIPS[currentTip];

  if (isMinimized) {
    return (
      <div
        ref={dragRef}
        style={{ position: "fixed", left: position.x, top: position.y, zIndex: 9999 }}
        className="select-none"
      >
        <div
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
        >
          <button
            onClick={() => !hasDraggedRef.current && setIsMinimized(false)}
            className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Lightbulb className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={dragRef}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 9999,
        width: cardWidth,
      }}
      className={cn(
        "select-none rounded-2xl border border-border/50 bg-card/95 backdrop-blur-md shadow-xl transition-all duration-300",
        isDragging && "opacity-90 scale-[1.02]"
      )}
    >
      {/* Drag handle + controls */}
      <div
        className="flex items-center justify-between px-4 py-2.5 cursor-grab active:cursor-grabbing border-b border-border/30"
        onPointerDown={handlePointerDown}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <GripHorizontal className="h-4 w-4" />
          <Lightbulb className={cn("text-primary", isDesktop ? "h-5 w-5" : "h-4 w-4")} />
          <span className={cn("font-medium text-foreground", isDesktop ? "text-sm" : "text-xs")}>Dica da Plataforma</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Minimizar"
          >
            <span className="text-xs font-bold">—</span>
          </button>
          <button
            onClick={handleClose}
            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tip content */}
      <div className={cn(
        "px-5 transition-opacity duration-200",
        isDesktop ? "py-5 min-h-[100px]" : "py-3 min-h-[80px]",
        isAnimating && "opacity-0"
      )}>
        <p className={cn("font-semibold text-foreground mb-1.5", isDesktop ? "text-base" : "text-sm")}>{tip.title}</p>
        <p className={cn("text-muted-foreground leading-relaxed", isDesktop ? "text-sm" : "text-xs")}>{tip.text}</p>
      </div>

      {/* Footer with navigation */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/30">
        <div className="flex items-center gap-1">
          <button onClick={goPrev} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={goNext} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          {PLATFORM_TIPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === currentTip ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">{currentTip + 1}/{PLATFORM_TIPS.length}</span>
      </div>
    </div>
  );
}