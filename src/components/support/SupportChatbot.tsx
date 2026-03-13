import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, Send, Loader2, Headset, Lightbulb, Bug, HelpCircle, TicketCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

import ReactMarkdown from "react-markdown";
import logoCelebrei from "@/assets/logo-celebrei.png";

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
    // Compute final position in viewport
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    // Current button center after drag
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

    // Reset dragging flag after a tick so onTap can check
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
      whileHover={{ scale: 1.1 }}
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
      className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
      aria-label="Abrir suporte"
    >
      <Headset className="w-6 h-6 pointer-events-none" />
    </motion.button>
  );
}

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
      className={`fixed bottom-6 ${sideClass} z-50 w-[380px] max-w-[calc(100vw-2rem)] max-h-[70vh] flex flex-col rounded-2xl shadow-2xl border border-border overflow-hidden bg-card`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src={logoCelebrei} alt="Celebrei" className="h-9 w-9 object-contain rounded-lg bg-white/10 p-1" />
          <div>
            <h3 className="font-bold text-primary-foreground text-sm">Suporte Celebrei</h3>
            <p className="text-xs text-primary-foreground/70">Online agora</p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
          <X className="w-4 h-4 text-primary-foreground" />
        </button>
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="p-3 border-b border-border flex gap-2 shrink-0">
          {[
            { icon: HelpCircle, label: "Dúvida", prompt: "Tenho uma dúvida sobre " },
            { icon: Bug, label: "Erro", prompt: "Estou com um problema: " },
            { icon: Lightbulb, label: "Sugestão", prompt: "Tenho uma sugestão: " },
          ].map(({ icon: Icon, label, prompt }) => (
            <button
              key={label}
              onClick={() => onQuickAction(prompt)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((msg) => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:mt-1 [&>ul]:mb-0 [&>ol]:mt-1 [&>ol]:mb-0 [&_hr]:my-2">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-line">{msg.content}</p>
              )}
              {msg.ticketCreated && (
                <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
                  <TicketCheck className="w-3 h-3" />
                  Ticket registrado
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Pensando...
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
            placeholder="Digite sua dúvida, erro ou sugestão..."
            className="flex-1 bg-muted border border-border rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isLoading}
          />
          <button onClick={onSend} disabled={isLoading || !input.trim()} className="bg-primary text-primary-foreground p-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50">
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
        content: "Olá! 👋 Sou o assistente da **Celebrei**.\n\nPosso te ajudar com:\n- 🔍 **Dúvidas** sobre a plataforma\n- 🐛 **Reportar erros** ou problemas\n- 💡 **Sugestões** de melhorias\n\nComo posso ajudar?",
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
