import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AI_STATE_LABEL, aiConversationState } from "@/lib/aiConversation";

// ✨ roxo ao lado do nome: conversa atendida pela IA. Pontinho laranja = a IA
// passou para a equipe (alguém precisa assumir).
export function AiConversationBadge({ conv }: { conv: { bot_step?: string | null; bot_enabled?: boolean | null; bot_data?: unknown } }) {
  const state = aiConversationState(conv);
  if (!state) return null;
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center w-4 h-4 rounded-full shrink-0",
        state === "participou" ? "bg-violet-500/10" : "bg-violet-600",
      )}
      title={AI_STATE_LABEL[state]}
      aria-label={AI_STATE_LABEL[state]}
      role="img"
    >
      <Sparkles className={cn("w-2.5 h-2.5", state === "participou" ? "text-violet-500" : "text-white")} />
      {state === "equipe" && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-background" />
      )}
    </span>
  );
}
