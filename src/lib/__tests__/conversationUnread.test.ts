import { describe, expect, it } from "vitest";
import { isAwaitingRead } from "../conversationUnread";

describe("isAwaitingRead", () => {
  it("cliente mandou a última: não lida", () => {
    expect(isAwaitingRead({ unread_count: 2, last_message_from_me: false })).toBe(true);
    expect(isAwaitingRead({ unread_count: 1, last_message_from_me: null })).toBe(true);
  });

  it("equipe respondeu pelo celular depois: não conta", () => {
    expect(isAwaitingRead({ unread_count: 5, last_message_from_me: true })).toBe(false);
  });

  it("IA passou para a equipe (99): sempre conta", () => {
    expect(isAwaitingRead({ unread_count: 99, last_message_from_me: true })).toBe(true);
  });

  it("sem não lidas", () => {
    expect(isAwaitingRead({ unread_count: 0, last_message_from_me: false })).toBe(false);
    expect(isAwaitingRead({})).toBe(false);
  });
});
