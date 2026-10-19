import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { groupNamesFrom, needsGroupName } from "./evolution-groups.ts";

Deno.test("grupo sem nome: o provisório do webhook conta como sem nome", () => {
  assertEquals(needsGroupName("Grupo 120363410944720544", "120363410944720544@g.us"), true);
  assertEquals(needsGroupName("Grupo 5511964383336-1577610648", "5511964383336-1577610648@g.us"), true);
  assertEquals(needsGroupName(null, "1@g.us"), true);
  assertEquals(needsGroupName("Família Silva", "1@g.us"), false);
});

Deno.test("lê os nomes da resposta do /group/list", () => {
  const names = groupNamesFrom({ message: "success", data: [
    { JID: "1@g.us", Name: "Equipe do buffet" },
    { JID: "2@g.us", Name: "" },
    { JID: "5511900000000@s.whatsapp.net", Name: "não é grupo" },
  ] });
  assertEquals([...names.entries()], [["1@g.us", "Equipe do buffet"]]);
  assertEquals(groupNamesFrom({ data: { groups: [{ JID: "3@g.us", Name: "X" }] } }).get("3@g.us"), "X");
  assertEquals(groupNamesFrom(null).size, 0);
});
