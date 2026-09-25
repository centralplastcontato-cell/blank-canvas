import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LeadReturnBadge } from "@/components/admin/LeadReturnBadge";

function renderBadge(returnCount?: number | null) {
  return render(
    <TooltipProvider>
      <LeadReturnBadge returnCount={returnCount} lastReturnAt="2026-09-25T10:00:00Z" createdAt="2026-05-01T10:00:00Z" />
    </TooltipProvider>,
  );
}

describe("LeadReturnBadge", () => {
  it("renders nothing for leads that never returned", () => {
    expect(renderBadge(0).container).toBeEmptyDOMElement();
    expect(renderBadge(null).container).toBeEmptyDOMElement();
  });

  it("counts the first contact as the 1st time", () => {
    renderBadge(1);
    expect(screen.getByText("Retornou · 2ª vez")).toBeInTheDocument();
  });

  it("shows higher counts", () => {
    renderBadge(3);
    expect(screen.getByText("Retornou · 4ª vez")).toBeInTheDocument();
  });
});
