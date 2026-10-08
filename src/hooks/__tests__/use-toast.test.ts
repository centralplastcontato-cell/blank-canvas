import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { toast, useToast } from "../use-toast";

describe("avisos (toast)", () => {
  it("somem sozinhos em 3 s; erro em 6 s", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast());
    act(() => { toast({ title: "IA ligada" }); });
    expect(result.current.toasts[0].open).toBe(true);
    act(() => { vi.advanceTimersByTime(2900); });
    expect(result.current.toasts[0].open).toBe(true);
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current.toasts[0].open).toBe(false);

    act(() => { toast({ title: "Erro", variant: "destructive" }); });
    act(() => { vi.advanceTimersByTime(3500); });
    expect(result.current.toasts[0].open).toBe(true);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.toasts[0].open).toBe(false);
    vi.useRealTimers();
  });
});
