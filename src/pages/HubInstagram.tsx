import { Instagram } from "lucide-react";
import { HubLayout } from "@/components/hub/HubLayout";
import HubInstagramPanel from "@/components/hub/HubInstagramPanel";

// Instagram automático da própria Celebrei (@hubcelebrei): posts gerados por IA e publicados pelo Postaí.
export default function HubInstagram() {
  const header = (
    <div>
      <h1 className="text-2xl font-bold flex items-center gap-2"><Instagram className="h-6 w-6 text-primary" />Instagram</h1>
      <p className="text-sm text-muted-foreground mt-1">Posts automáticos do @hubcelebrei, publicados pelo Postaí</p>
    </div>
  );

  return (
    <HubLayout currentPage="instagram" header={header}>
      {() => <HubInstagramPanel />}
    </HubLayout>
  );
}
