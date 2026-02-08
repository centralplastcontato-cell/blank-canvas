import { useState } from "react";
import { Lead, LeadStatus, UserWithRole } from "@/types/crm";
import { LeadsKanban } from "./LeadsKanban";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

interface UnitKanbanTabsProps {
  leads: Lead[];
  responsaveis: UserWithRole[];
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onNameUpdate?: (leadId: string, newName: string) => Promise<void>;
  onDescriptionUpdate?: (leadId: string, newDescription: string) => Promise<void>;
  onTransfer?: (lead: Lead) => void;
  canEdit: boolean;
  canEditName?: boolean;
  canEditDescription?: boolean;
  allowedUnits: string[];
  canViewAll: boolean;
}

type UnitTab = "all" | "manchester" | "trujillo";

export function UnitKanbanTabs({
  leads,
  responsaveis,
  onLeadClick,
  onStatusChange,
  onNameUpdate,
  onDescriptionUpdate,
  onTransfer,
  canEdit,
  canEditName = false,
  canEditDescription = false,
  allowedUnits,
  canViewAll,
}: UnitKanbanTabsProps) {
  // Determine which tabs to show based on permissions
  const canSeeManchester = canViewAll || allowedUnits.includes("Manchester") || allowedUnits.includes("all");
  const canSeeTrujillo = canViewAll || allowedUnits.includes("Trujillo") || allowedUnits.includes("all");
  const canSeeBoth = canSeeManchester && canSeeTrujillo;

  // Default to the first available unit tab, or "all" if user can see both
  const getDefaultTab = (): UnitTab => {
    if (canSeeBoth) return "all";
    if (canSeeManchester) return "manchester";
    if (canSeeTrujillo) return "trujillo";
    return "all";
  };

  const [activeUnit, setActiveUnit] = useState<UnitTab>(getDefaultTab());

  // Filter leads by unit

  const manchesterLeads = leads.filter((lead) => lead.unit === "Manchester");
  const trujilloLeads = leads.filter((lead) => lead.unit === "Trujillo");

  return (
    <div className="space-y-4">
      <Tabs value={activeUnit} onValueChange={(v) => setActiveUnit(v as UnitTab)}>
        <TabsList className="h-auto p-1">
          {canSeeBoth && (
            <TabsTrigger value="all" className="flex items-center gap-2 px-4">
              <Building2 className="w-4 h-4" />
              Todas
              <Badge variant="secondary" className="ml-1 text-xs">
                {leads.length}
              </Badge>
            </TabsTrigger>
          )}
          {canSeeManchester && (
            <TabsTrigger value="manchester" className="flex items-center gap-2 px-4">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Manchester
              <Badge variant="secondary" className="ml-1 text-xs">
                {manchesterLeads.length}
              </Badge>
            </TabsTrigger>
          )}
          {canSeeTrujillo && (
            <TabsTrigger value="trujillo" className="flex items-center gap-2 px-4">
              <span className="w-2 h-2 rounded-full bg-accent" />
              Trujillo
              <Badge variant="secondary" className="ml-1 text-xs">
                {trujilloLeads.length}
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {canSeeBoth && (
          <TabsContent value="all" className="mt-4">
            <LeadsKanban
              leads={leads}
              responsaveis={responsaveis}
              onLeadClick={onLeadClick}
              onStatusChange={onStatusChange}
              onNameUpdate={onNameUpdate}
              onDescriptionUpdate={onDescriptionUpdate}
              onTransfer={onTransfer}
              canEdit={canEdit}
              canEditName={canEditName}
              canEditDescription={canEditDescription}
            />
          </TabsContent>
        )}

        {canSeeManchester && (
          <TabsContent value="manchester" className="mt-4">
            <LeadsKanban
              leads={manchesterLeads}
              responsaveis={responsaveis}
              onLeadClick={onLeadClick}
              onStatusChange={onStatusChange}
              onNameUpdate={onNameUpdate}
              onDescriptionUpdate={onDescriptionUpdate}
              onTransfer={onTransfer}
              canEdit={canEdit}
              canEditName={canEditName}
              canEditDescription={canEditDescription}
            />
          </TabsContent>
        )}

        {canSeeTrujillo && (
          <TabsContent value="trujillo" className="mt-4">
            <LeadsKanban
              leads={trujilloLeads}
              responsaveis={responsaveis}
              onLeadClick={onLeadClick}
              onStatusChange={onStatusChange}
              onNameUpdate={onNameUpdate}
              onDescriptionUpdate={onDescriptionUpdate}
              onTransfer={onTransfer}
              canEdit={canEdit}
              canEditName={canEditName}
              canEditDescription={canEditDescription}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
