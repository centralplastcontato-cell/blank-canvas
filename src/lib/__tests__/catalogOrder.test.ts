import { describe, expect, it } from "vitest";
import { moveItem, packagesForEventType, readPackageEventTypes, sortOrderChanges } from "../catalogOrder";

describe("catalogOrder", () => {
  it("move para cima e para baixo sem sair da lista", () => {
    expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
  });

  it("só regrava o que mudou de posição", () => {
    const list = [{ id: "b", sort_order: 1 }, { id: "a", sort_order: 0 }, { id: "c", sort_order: 2 }];
    expect(sortOrderChanges(list)).toEqual([{ id: "b", sort_order: 0 }, { id: "a", sort_order: 1 }]);
  });

  it("pacotes do tipo de festa vêm primeiro", () => {
    const links = readPackageEventTypes({ package_event_types: { p3: "escolar", p9: "" } });
    expect(links).toEqual({ p3: "escolar" });
    const pk = [{ id: "p1" }, { id: "p2" }, { id: "p3" }];
    expect(packagesForEventType(pk, links, "escolar")).toEqual({ suggested: [{ id: "p3" }], others: [{ id: "p1" }, { id: "p2" }] });
    expect(packagesForEventType(pk, links, null).others).toHaveLength(3);
  });
});
