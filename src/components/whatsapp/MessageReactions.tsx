import { cn } from "@/lib/utils";
import type { MessageReaction } from "@/lib/messageReactions";

interface MessageReactionsProps {
  reactions: MessageReaction[] | undefined;
  /** Lado do balão que recebeu a reação */
  fromMe: boolean;
  contactName?: string | null;
}

// Emojis de reação embaixo do balão, como no WhatsApp
export function MessageReactions({ reactions, fromMe, contactName }: MessageReactionsProps) {
  if (!reactions || reactions.length === 0) return null;
  const emojis = [...new Set(reactions.map((r) => r.emoji))];
  const who = (r: MessageReaction) => (r.fromMe ? "Equipe" : r.senderName || contactName || "Contato");
  const title = reactions.map((r) => `${who(r)} reagiu ${r.emoji}`).join("\n");

  return (
    <div className={cn("relative z-[1] -mt-2 mb-1 flex", fromMe ? "justify-end pr-4" : "justify-start pl-4")}>
      <span
        title={title}
        aria-label={title}
        className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card px-1.5 py-0.5 text-sm leading-none shadow-sm"
      >
        {emojis.map((e) => (
          <span key={e}>{e}</span>
        ))}
        {reactions.length > 1 && <span className="ml-0.5 text-[11px] text-muted-foreground">{reactions.length}</span>}
      </span>
    </div>
  );
}
