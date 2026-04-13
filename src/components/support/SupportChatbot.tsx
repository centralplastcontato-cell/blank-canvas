import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, Send, Loader2, Bot, Lightbulb, Bug, HelpCircle, TicketCheck, Sparkles, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

import ReactMarkdown from "react-markdown";

// --- Types ---
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ticketCreated?: boolean;
}

interface SupportContext {
  page_url: string;
  user_agent: string;
  company_name: string | null;
  company_id: string | null;
  role: string | null;
  user_name: string | null;
  user_email: string | null;
  console_errors: string[];
}

interface BtnPosition {
  side: "left" | "right";
  bottomPx: number;
}

const STORAGE_KEY = "support-btn-pos";
const BTN_SIZE = 56;
const EDGE_GAP = 24;
const MIN_BOTTOM = 24;

function getDefaultPosition(): BtnPosition {
  return { side: "right", bottomPx: 90 };
}

function loadPosition(): BtnPosition {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.side === "left" || parsed.side === "right") && typeof parsed.bottomPx === "number") {
        return parsed;
      }
    }
  } catch {}
  return getDefaultPosition();
}

function savePosition(pos: BtnPosition) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {}
}

// --- Console error capture hook ---
function useConsoleErrors() {
  const errorsRef = useRef<string[]>([]);

  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      errorsRef.current = [...errorsRef.current.slice(-19), msg];
      originalError.apply(console, args);
    };

    const handleError = (e: ErrorEvent) => {
      errorsRef.current = [...errorsRef.current.slice(-19), `${e.message} at ${e.filename}:${e.lineno}`];
    };
    const handleUnhandled = (e: PromiseRejectionEvent) => {
      errorsRef.current = [...errorsRef.current.slice(-19), `Unhandled: ${e.reason}`];
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandled);

    return () => {
      console.error = originalError;
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandled);
    };
  }, []);

  return errorsRef;
}

// --- Draggable button sub-component ---
function DraggableSupportButton({
  position,
  onPositionChange,
  onTap,
}: {
  position: BtnPosition;
  onPositionChange: (pos: BtnPosition) => void;
  onTap: () => void;
}) {
  const isDragging = useRef(false);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    const btnRect = {
      centerX: (position.side === "right" ? viewW - EDGE_GAP - BTN_SIZE / 2 : EDGE_GAP + BTN_SIZE / 2) + info.offset.x,
      bottomEdge: position.bottomPx - info.offset.y,
    };

    const newSide: "left" | "right" = btnRect.centerX < viewW / 2 ? "left" : "right";
    const maxBottom = viewH - BTN_SIZE - MIN_BOTTOM;
    const newBottom = Math.max(MIN_BOTTOM, Math.min(maxBottom, btnRect.bottomEdge));

    const newPos: BtnPosition = { side: newSide, bottomPx: newBottom };
    onPositionChange(newPos);
    savePosition(newPos);

    requestAnimationFrame(() => {
      isDragging.current = false;
    });
  };

  const style: React.CSSProperties = {
    position: "fixed",
    bottom: position.bottomPx,
    ...(position.side === "right" ? { right: EDGE_GAP } : { left: EDGE_GAP }),
    zIndex: 50,
  };

  return (
    <motion.button
      key={`support-btn-${position.side}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      drag
      dragMomentum={false}
      dragElastic={0.1}
      onDragStart={() => { isDragging.current = true; }}
      onDragEnd={handleDragEnd}
      onClick={() => {
        if (!isDragging.current) onTap();
      }}
      style={style}
      className="group relative w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex items-center justify-center cursor-grab active:cursor-grabbing touch-none transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)]"
      aria-label="Abrir suporte"
    >
      <MessageCircle className="w-6 h-6 pointer-events-none" />
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-2xl border-2 border-primary/40 animate-ping pointer-events-none" style={{ animationDuration: "3s" }} />
    </motion.button>
  );
}

// --- Quick action buttons ---
const QUICK_ACTIONS = [
  { icon: HelpCircle, label: "Dúvida", prompt: "Tenho uma dúvida sobre ", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-blue-200/60 dark:border-blue-800/40" },
  { icon: Bug, label: "Erro", prompt: "Estou com um problema: ", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 border-red-200/60 dark:border-red-800/40" },
  { icon: Lightbulb, label: "Sugestão", prompt: "Tenho uma sugestão: ", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 border-amber-200/60 dark:border-amber-800/40" },
];

// --- Chat window sub-component ---
function ChatWindow({
  position,
  messages,
  input,
  isLoading,
  onInputChange,
  onSend,
  onClose,
  onQuickAction,
}: {
  position: BtnPosition;
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
  onQuickAction: (prompt: string) => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sideClass = position.side === "right" ? "right-6" : "left-6";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={`fixed bottom-6 ${sideClass} z-50 w-[400px] max-w-[calc(100vw-2rem)] max-h-[75vh] flex flex-col rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-border/40 overflow-hidden bg-card/95 backdrop-blur-md`}
    >
      {/* Header - Modern gradient */}
      <div className="relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_120%,hsl(var(--primary-foreground)/0.08),transparent)]" />
        <div className="relative px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center border border-primary-foreground/10">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-primary-foreground text-sm tracking-tight">Suporte Celebrei</h3>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-xs text-primary-foreground/70">Online agora</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center hover:bg-primary-foreground/20 transition-colors border border-primary-foreground/10"
          >
            <X className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>

      {/* Quick Actions - Modern card buttons */}
      {messages.length <= 1 && (
        <div className="px-4 py-3 border-b border-border/30 flex gap-2 shrink-0">
          {QUICK_ACTIONS.map(({ icon: Icon, label, prompt, color, bg }) => (
            <button
              key={label}
              onClick={() => onQuickAction(prompt)}
              className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-medium transition-all duration-200 ${bg}`}
            >
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-foreground/80">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center mr-2 mt-1 shrink-0">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-lg"
                  : "bg-muted/60 text-foreground rounded-bl-lg border border-border/30"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:mt-1 [&>ul]:mb-0 [&>ol]:mt-1 [&>ol]:mb-0 [&_hr]:my-2 [&>p+p]:mt-2">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-line">{msg.content}</p>
              )}
              {msg.ticketCreated && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/30 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <TicketCheck className="w-3.5 h-3.5" />
                  Ticket registrado com sucesso
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center mr-2 mt-1 shrink-0">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-muted/60 rounded-2xl rounded-bl-lg px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground border border-border/30">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full bg-primary/50"
                    style={{ animation: "bounce 1.4s ease-in-out infinite", animationDelay: `${i * 0.16}s` }}
                  />
                ))}
              </div>
              Pensando...
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Modern rounded */}
      <div className="p-3 border-t border-border/30 shrink-0 bg-card/80">
        <div className="flex gap-2 items-end">
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
            placeholder="Digite sua dúvida, erro ou sugestão..."
            className="flex-1 bg-muted/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
            disabled={isLoading}
          />
          <button
            onClick={onSend}
            disabled={isLoading || !input.trim()}
            className="bg-primary text-primary-foreground h-10 w-10 rounded-xl flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-40 shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// --- Main component ---
export function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [btnPosition, setBtnPosition] = useState<BtnPosition>(loadPosition);
  const errorsRef = useConsoleErrors();
  const { currentCompany, currentRole } = useCompany();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", session.user.id)
        .single()
        .then(({ data }) => { if (data) setProfile(data); });
    }
  }, [session?.user?.id]);

  const getContext = useCallback((): SupportContext => ({
    page_url: window.location.href,
    user_agent: navigator.userAgent,
    company_name: currentCompany?.name || null,
    company_id: currentCompany?.id || null,
    role: currentRole || null,
    user_name: profile?.full_name || null,
    user_email: profile?.email || session?.user?.email || null,
    console_errors: errorsRef.current.slice(-10),
  }), [currentCompany, currentRole, profile, session, errorsRef]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const allMessages = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const context = getContext();

      const { data, error } = await supabase.functions.invoke("support-chat", {
        body: { messages: allMessages, context, company_id: context.company_id },
      });

      if (error) throw error;

      const aiResponse = data as { message: string; createTicket: boolean; subject?: string; priority?: string; category?: string; ticketCreated?: boolean; error?: string };
      if (aiResponse.error) throw new Error(aiResponse.error);

      const ticketCreated = aiResponse.ticketCreated || false;
      const categoryEmoji = aiResponse.category === "bug" ? "🐛" : aiResponse.category === "sugestao" ? "💡" : "";
      const ticketMsg = ticketCreated
        ? `\n\n---\n✅ **Ticket criado com sucesso!** ${categoryEmoji}\nNossa equipe vai analisar ${aiResponse.category === "sugestao" ? "sua sugestão" : "o problema"} o mais breve possível.`
        : "";

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: (aiResponse.message || "Desculpe, não consegui processar. Tente novamente.") + ticketMsg,
        ticketCreated,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      console.error("Support chat error:", e);
      setMessages((prev) => [...prev, { id: `error-${Date.now()}`, role: "assistant", content: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes. 😔" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const location = useLocation();
  const isHubPage = location.pathname.startsWith("/hub");

  const PUBLIC_PREFIXES = [
    "/lp", "/promo", "/para-buffets", "/onboarding",
    "/avaliacao", "/pre-festa", "/contrato", "/cardapio",
    "/equipe", "/manutencao", "/acompanhamento",
    "/lista-presenca", "/informacoes", "/freelancer",
    "/escala", "/festa", "/hub-landing", "/hub-login",
    "/recrutamento-comercial",
  ];
  const isPublicPage = location.pathname === "/" || PUBLIC_PREFIXES.some((p) => location.pathname.startsWith(p));

  if (!session || isHubPage || isPublicPage) return null;

  const openChat = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "Olá! 👋 Sou o assistente da **Celebrei**.\n\nPosso te ajudar com:\n\n🔍 **Dúvidas** sobre a plataforma\n🐛 **Reportar erros** ou problemas\n💡 **Sugestões** de melhorias\n\nComo posso ajudar?",
      }]);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <DraggableSupportButton
            position={btnPosition}
            onPositionChange={setBtnPosition}
            onTap={openChat}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <ChatWindow
            position={btnPosition}
            messages={messages}
            input={input}
            isLoading={isLoading}
            onInputChange={setInput}
            onSend={handleSend}
            onClose={() => setIsOpen(false)}
            onQuickAction={setInput}
          />
        )}
      </AnimatePresence>
    </>
  );
}
