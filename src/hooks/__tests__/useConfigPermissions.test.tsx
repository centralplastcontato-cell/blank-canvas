import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useConfigPermissions } from "../useConfigPermissions";

let rows: Array<{ permission: string; granted: boolean }> = [];
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ in: () => new Promise((r) => setTimeout(() => r({ data: rows }), 20)) }) }) }),
  },
}));

describe("useConfigPermissions", () => {
  it("dono continua com tudo mesmo se a busca termina depois de saber que é dono", async () => {
    rows = [];
    const { result, rerender } = renderHook(({ owner }) => useConfigPermissions("u", false, owner), { initialProps: { owner: false } });
    rerender({ owner: true });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.permissions).toEqual({ connection: true, messages: true, notifications: true, automations: true, advanced: true });
  });

  it("negado de propósito continua negado para o dono", async () => {
    rows = [{ permission: "config.whatsapp.advanced", granted: false }];
    const { result } = renderHook(() => useConfigPermissions("u", false, true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.permissions.advanced).toBe(false);
    expect(result.current.permissions.connection).toBe(true);
  });

  it("quem não é dono só tem o que foi liberado", async () => {
    rows = [{ permission: "config.whatsapp.messages", granted: true }];
    const { result } = renderHook(() => useConfigPermissions("u", false, false));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.permissions).toEqual({ connection: false, messages: true, notifications: false, automations: false, advanced: false });
  });
});
