import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, Headset, Lightbulb, Bug, HelpCircle, TicketCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

import ReactMarkdown from "react-markdown";
import logoCelebrei from "@/assets/logo-celebrei.png";

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

export function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    }
  }, [session?.user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const allMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const context = getContext();

      const { data, error } = await supabase.functions.invoke("support-chat", {
        body: { messages: allMessages, context },
      });

      if (error) throw error;

      const aiResponse = data as {
        message: string;
        createTicket: boolean;
        subject?: string;
        priority?: string;
        category?: string;
        error?: string;
      };

      if (aiResponse.error) {
        throw new Error(aiResponse.error);
      }

      let ticketCreated = false;

      if (aiResponse.createTicket && session?.user?.id) {
        try {
          const { error: ticketError } = await supabase.from("support_tickets").insert({
            company_id: context.company_id,
            user_id: session.user.id,
            user_name: context.user_name,
            user_email: context.user_email,
            subject: aiResponse.subject || "Ticket de suporte",
            description: userMsg.content,
            category: aiResponse.category || "duvida",
            page_url: context.page_url,
            user_agent: context.user_agent,
            console_errors: context.console_errors,
            context_data: {
              company_name: context.company_name,
              role: context.role,
            },
            priority: aiResponse.priority || "media",
            ai_classification: aiResponse.category,
            conversation_history: allMessages,
          });

          if (!ticketError) {
            ticketCreated = true;
          } else {
            console.error("Ticket creation error:", ticketError);
          }
        } catch (e) {
          console.error("Error creating ticket:", e);
        }
      }

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
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes. 😔",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if not authenticated
  if (!session) return null;

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setIsOpen(true);
              if (messages.length === 0) {
                setMessages([
                  {
                    id: "welcome",
                    role: "assistant",
                    content:
                      "Olá! 👋 Sou o assistente da **Celebrei**.\n\nPosso te ajudar com:\n- 🔍 **Dúvidas** sobre a plataforma\n- 🐛 **Reportar erros** ou problemas\n- 💡 **Sugestões** de melhorias\n\nComo posso ajudar?",
                  },
                ]);
              }
            }}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg flex items-center justify-center"
            aria-label="Abrir suporte"
          >
            <Headset className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] max-h-[70vh] flex flex-col rounded-2xl shadow-2xl border border-border overflow-hidden bg-card"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src={logoCelebrei}
                  alt="Celebrei"
                  className="h-9 w-9 object-contain rounded-lg bg-white/10 p-1"
                />
                <div>
                  <h3 className="font-bold text-primary-foreground text-sm">Suporte Celebrei</h3>
                  <p className="text-xs text-primary-foreground/70">Online agora</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
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
                    onClick={() => setInput(prompt)}
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
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
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
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
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
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Digite sua dúvida, erro ou sugestão..."
                  className="flex-1 bg-muted border border-border rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="bg-primary text-primary-foreground p-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
