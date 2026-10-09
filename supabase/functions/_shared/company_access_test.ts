import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { checkCompanyAccess } from "./company-access.ts";

// Cliente falso: "user-token" é o usuário u1, que só acessa a empresa c1; "admin-token" é admin
function fakeAdmin() {
  return {
    auth: {
      getUser: async (jwt: string) => ({
        data: { user: jwt === "user-token" ? { id: "u1" } : jwt === "admin-token" ? { id: "adm" } : null },
      }),
    },
    rpc: async (fn: string, args: Record<string, string>) => {
      if (fn === "is_admin") return { data: args._user_id === "adm" };
      if (fn === "user_has_company_access") return { data: args._user_id === "u1" && args._company_id === "c1" };
      return { data: null };
    },
  };
}

const req = (token?: string) =>
  new Request("http://x", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} });

Deno.test("sem login: 401", async () => {
  assertEquals(await checkCompanyAccess(fakeAdmin(), req(), "c1"), { ok: false, status: 401, error: "Faça login" });
  assertEquals((await checkCompanyAccess(fakeAdmin(), req("anon-key"), "c1")).ok, false);
});

Deno.test("logado com acesso à empresa: ok", async () => {
  assertEquals(await checkCompanyAccess(fakeAdmin(), req("user-token"), "c1"), { ok: true, userId: "u1", isService: false });
});

Deno.test("logado em outra empresa: 403", async () => {
  const r = await checkCompanyAccess(fakeAdmin(), req("user-token"), "c2");
  assertEquals(r.ok ? 0 : r.status, 403);
});

Deno.test("admin da plataforma acessa qualquer empresa", async () => {
  assertEquals((await checkCompanyAccess(fakeAdmin(), req("admin-token"), "c2")).ok, true);
});

Deno.test("sem empresa: 400", async () => {
  const r = await checkCompanyAccess(fakeAdmin(), req("user-token"), null);
  assertEquals(r.ok ? 0 : r.status, 400);
});

Deno.test("chave de serviço só quando permitido", async () => {
  assertEquals(
    await checkCompanyAccess(fakeAdmin(), req("svc"), "c1", { allowService: true, serviceKey: "svc" }),
    { ok: true, userId: null, isService: true },
  );
  assertEquals((await checkCompanyAccess(fakeAdmin(), req("svc"), "c1", { serviceKey: "svc" })).ok, false);
});
