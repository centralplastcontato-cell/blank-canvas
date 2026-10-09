import { describe, expect, it } from "vitest";
import { groupReactions } from "../messageReactions";

const msg = (id: string, content: string, from_me = false, quoted_message_id: string | null = null, metadata: unknown = null) =>
  ({ id, content, from_me, quoted_message_id, metadata });

describe("groupReactions", () => {
  it("põe a reação embaixo da mensagem de destino e esconde o balão", () => {
    const { reactionsByMessage, hiddenIds } = groupReactions([
      msg("a", "Sua visita ficou marcada", true),
      msg("r", "[Reação] ❤️", false, "a"),
    ]);
    expect(reactionsByMessage.get("a")).toEqual([{ emoji: "❤️", fromMe: false, senderName: null }]);
    expect(hiddenIds.has("r")).toBe(true);
  });

  it("a reação mais nova da mesma pessoa substitui a anterior", () => {
    const { reactionsByMessage } = groupReactions([
      msg("a", "Oi", true),
      msg("r1", "[Reação] 👍", false, "a"),
      msg("r2", "[Reação] 😂", false, "a"),
    ]);
    expect(reactionsByMessage.get("a")?.map((r) => r.emoji)).toEqual(["😂"]);
  });

  it("cliente e equipe reagindo na mesma mensagem aparecem os dois", () => {
    const { reactionsByMessage } = groupReactions([
      msg("a", "Oi"),
      msg("r1", "[Reação] 👍", false, "a"),
      msg("r2", "[Reação] ❤️", true, "a"),
    ]);
    expect(reactionsByMessage.get("a")?.map((r) => r.emoji)).toEqual(["👍", "❤️"]);
  });

  it("em grupo, cada participante conta separado", () => {
    const { reactionsByMessage } = groupReactions([
      msg("a", "Oi"),
      msg("r1", "[Reação] 👍", false, "a", { participant: "111", sender_name: "Ana" }),
      msg("r2", "[Reação] 👍", false, "a", { participant: "222", sender_name: "Bia" }),
    ]);
    expect(reactionsByMessage.get("a")).toHaveLength(2);
  });

  it("reação removida some", () => {
    const { reactionsByMessage, hiddenIds } = groupReactions([
      msg("a", "Oi"),
      msg("r1", "[Reação] 👍", false, "a"),
      msg("r2", "[Reação] ", false, "a"),
    ]);
    expect(reactionsByMessage.has("a")).toBe(false);
    expect(hiddenIds.has("r2")).toBe(true);
  });

  it("reação sem destino (antiga) ou com destino fora da tela continua como balão", () => {
    const { reactionsByMessage, hiddenIds } = groupReactions([
      msg("r1", "[Reação] ❤️"),
      msg("r2", "[Reação] 🙏", false, "nao-carregada"),
      msg("b", "Reação boa essa", false, "x"),
    ]);
    expect(reactionsByMessage.size).toBe(0);
    expect(hiddenIds.size).toBe(0);
  });
});
