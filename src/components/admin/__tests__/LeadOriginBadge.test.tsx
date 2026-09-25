import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LeadOriginBadge } from "@/components/admin/LeadOriginBadge";

function renderBadge(origem?: string | null) {
  return render(
    <TooltipProvider>
      <LeadOriginBadge origem={origem} />
    </TooltipProvider>,
  );
}

describe("LeadOriginBadge", () => {
  it("renders nothing for leads without origin", () => {
    const { container } = renderBadge(null);
    expect(container).toBeEmptyDOMElement();
    expect(renderBadge("").container).toBeEmptyDOMElement();
  });

  it("shows the table QR label", () => {
    renderBadge("mesa");
    expect(screen.getByText("QR da mesa")).toBeInTheDocument();
  });
});
