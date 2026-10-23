import { afterEach, describe, expect, it, vi } from "vitest";

const navigatorLock = vi.fn();
vi.mock("@supabase/supabase-js", () => ({ navigatorLock: (...args: unknown[]) => navigatorLock(...args) }));

import { recoveringNavigatorLock } from "../authLock";

const abortError = () => Object.assign(new Error("signal is aborted without reason"), { name: "AbortError" });

function stubLocks() {
  const request = vi.fn((_name: string, _opts: unknown, cb: () => unknown) => Promise.resolve(cb()));
  vi.stubGlobal("navigator", { locks: { request } });
  return request;
}

afterEach(() => {
  vi.unstubAllGlobals();
  navigatorLock.mockReset();
});

describe("recoveringNavigatorLock", () => {
  it("trava livre: segue normal", async () => {
    stubLocks();
    navigatorLock.mockImplementation((_n: string, _t: number, fn: () => Promise<string>) => fn());
    await expect(recoveringNavigatorLock("lock:x", 10000, async () => "ok")).resolves.toBe("ok");
  });

  it("trava presa (AbortError no tempo limite): assume a trava e grava", async () => {
    const request = stubLocks();
    navigatorLock.mockRejectedValue(abortError());
    await expect(recoveringNavigatorLock("lock:x", 10000, async () => "ok")).resolves.toBe("ok");
    expect(request).toHaveBeenCalledWith("lock:x", { mode: "exclusive", steal: true }, expect.any(Function));
  });

  it("outros erros e o pedido sem espera (tempo 0) continuam como antes", async () => {
    stubLocks();
    navigatorLock.mockRejectedValue(new Error("falhou"));
    await expect(recoveringNavigatorLock("lock:x", 10000, async () => "ok")).rejects.toThrow("falhou");
    navigatorLock.mockRejectedValue(abortError());
    await expect(recoveringNavigatorLock("lock:x", 0, async () => "ok")).rejects.toThrow("aborted");
  });
});
