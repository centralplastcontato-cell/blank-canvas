import { useState } from "react";
import { Lead, LeadStatus, UserWithRole } from "@/types/crm";
import { LeadsKanban } from "./LeadsKanban";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";

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
  const { units: companyUnits } = useCompanyUnits();

  // Determine which units the user can see
  const visibleUnits = companyUnits.filter(
    (u) => canViewAll || allowedUnits.includes(u.name) || allowedUnits.includes("all")
  );

  const canSeeMultiple = visibleUnits.length > 1;

  // Default tab
  const getDefaultTab = (): string => {
    if (canSeeMultiple) return "all";
    if (visibleUnits.length === 1) return visibleUnits[0].slug;
    return "all";
  };

  const [activeUnit, setActiveUnit] = useState<string>(getDefaultTab());

  return (
    <div className="space-y-4">
      <Tabs value={activeUnit} onValueChange={setActiveUnit}>
        <TabsList className="h-auto p-1">
          {canSeeMultiple && (
            <TabsTrigger value="all" className="flex items-center gap-2 px-4">
              <Building2 className="w-4 h-4" />
              Todas
              <Badge variant="secondary" className="ml-1 text-xs">
                {leads.length}
              </Badge>
            </TabsTrigger>
          )}
          {visibleUnits.map((unit) => {
            const allUnitNames = companyUnits.map(u => u.name);
            const unitLeads = leads.filter((lead) => lead.unit === unit.name || (lead.unit && !allUnitNames.includes(lead.unit) && lead.unit !== null));
            return (
              <TabsTrigger
                key={unit.slug}
                value={unit.slug}
                className="flex items-center gap-2 px-4"
              >
                <span className="w-2 h-2 rounded-full bg-primary" />
                {unit.name}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {unitLeads.length}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {canSeeMultiple && (
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

        {visibleUnits.map((unit) => {
          const allUnitNames = companyUnits.map(u => u.name);
          const unitLeads = leads.filter((lead) => lead.unit === unit.name || (lead.unit && !allUnitNames.includes(lead.unit)));
          return (
            <TabsContent key={unit.slug} value={unit.slug} className="mt-4">
              <LeadsKanban
                leads={unitLeads}
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
          );
        })}
      </Tabs>
    </div>
  );
}
