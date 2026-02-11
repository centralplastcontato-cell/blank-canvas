import { useState } from "react";
import { Lead, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LeadStatus } from "@/types/crm";
import { UserWithRole } from "@/types/crm";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { KanbanCard } from "./KanbanCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadsKanbanProps {
  leads: Lead[];
  responsaveis: UserWithRole[];
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onNameUpdate?: (leadId: string, newName: string) => Promise<void>;
  onDescriptionUpdate?: (leadId: string, newDescription: string) => Promise<void>;
  onTransfer?: (lead: Lead) => void;
  onDelete?: (leadId: string) => Promise<void>;
  canEdit: boolean;
  canEditName?: boolean;
  canEditDescription?: boolean;
  canDelete?: boolean;
}

export function LeadsKanban({
  leads,
  responsaveis,
  onLeadClick,
  onStatusChange,
  onNameUpdate,
  onDescriptionUpdate,
  onTransfer,
  onDelete,
  canEdit,
  canEditName = false,
  canEditDescription = false,
  canDelete = false,
}: LeadsKanbanProps) {
  const columns: LeadStatus[] = [
    "novo",
    "trabalhe_conosco",
    "em_contato",
    "orcamento_enviado",
    "aguardando_resposta",
    "fechado",
    "perdido",
    "transferido",
  ];

  // Mobile column navigation state
  const [mobileColumnIndex, setMobileColumnIndex] = useState(0);

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter((lead) => lead.status === status);
  };

  const getResponsavelName = (responsavelId: string | null) => {
    if (!responsavelId) return null;
    const r = responsaveis.find((r) => r.user_id === responsavelId);
    return r?.full_name || null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (leadId && canEdit) {
      // Block reverting to "novo" - leads that left this status cannot return
      const droppedLead = leads.find(l => l.id === leadId);
      if (status === "novo" && droppedLead && droppedLead.status !== "novo") {
        return;
      }
      onStatusChange(leadId, status);
    }
  };

  const getPreviousStatus = (currentStatus: LeadStatus): LeadStatus | null => {
    const currentIndex = columns.indexOf(currentStatus);
    // Block reverting to "novo" - only allow if currently at index 1 (em_contato) is not enough
    // Actually, block going back to "novo" entirely (index 0)
    if (currentIndex > 1) {
      return columns[currentIndex - 1];
    }
    // If at index 1 (em_contato), don't allow going back to novo
    return null;
  };

  const getNextStatus = (currentStatus: LeadStatus): LeadStatus | null => {
    const currentIndex = columns.indexOf(currentStatus);
    if (currentIndex < columns.length - 1) {
      return columns[currentIndex + 1];
    }
    return null;
  };

  const handleNameUpdate = async (leadId: string, newName: string) => {
    if (onNameUpdate) {
      await onNameUpdate(leadId, newName);
    }
  };

  const handleDescriptionUpdate = async (leadId: string, newDescription: string) => {
    if (onDescriptionUpdate) {
      await onDescriptionUpdate(leadId, newDescription);
    }
  };

  const handlePrevColumn = () => {
    setMobileColumnIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextColumn = () => {
    setMobileColumnIndex((prev) => Math.min(columns.length - 1, prev + 1));
  };

  const currentMobileColumn = columns[mobileColumnIndex];
  const mobileColumnLeads = getLeadsByStatus(currentMobileColumn);

  return (
    <>
      {/* Mobile Layout - Single column with navigation arrows */}
      <div className="md:hidden flex flex-col h-full">
        {/* Mobile Navigation Header */}
        <div className="flex items-center justify-between gap-2 mb-3 px-1">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 border-border/60 hover:bg-primary/5 hover:border-primary/30"
            onClick={handlePrevColumn}
            disabled={mobileColumnIndex === 0}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 flex items-center justify-center gap-2 min-w-0 bg-card/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-border/60">
            <div
              className={cn("w-3 h-3 rounded-full shrink-0 shadow-sm", LEAD_STATUS_COLORS[currentMobileColumn])}
            />
            <span className="font-semibold text-sm truncate">
              {LEAD_STATUS_LABELS[currentMobileColumn]}
            </span>
            <Badge variant="secondary" className="text-xs shrink-0 bg-muted/80">
              {mobileColumnLeads.length}
            </Badge>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 border-border/60 hover:bg-primary/5 hover:border-primary/30"
            onClick={handleNextColumn}
            disabled={mobileColumnIndex === columns.length - 1}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Column indicators (dots) */}
        <div className="flex justify-center gap-1.5 mb-3">
          {columns.map((status, index) => (
            <button
              key={status}
              onClick={() => setMobileColumnIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                index === mobileColumnIndex 
                  ? `${LEAD_STATUS_COLORS[status]} ring-2 ring-offset-1 ring-offset-background ring-primary/30`
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              title={LEAD_STATUS_LABELS[status]}
            />
          ))}
        </div>

        {/* Mobile Column Content */}
        <div
          className="flex-1 bg-gradient-to-b from-muted/40 to-muted/20 rounded-xl border border-border/60 flex flex-col min-h-0 shadow-inner"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, currentMobileColumn)}
        >
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-2">
              {mobileColumnLeads.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum lead
                </div>
              ) : (
                mobileColumnLeads.map((lead) => (
                  <div key={lead.id} className="group">
                    <KanbanCard
                      lead={lead}
                      responsavelName={getResponsavelName(lead.responsavel_id)}
                      canEdit={canEdit}
                      canEditName={canEditName}
                      canEditDescription={canEditDescription}
                      onLeadClick={onLeadClick}
                      onStatusChange={onStatusChange}
                      onNameUpdate={handleNameUpdate}
                      onDescriptionUpdate={handleDescriptionUpdate}
                      onTransfer={onTransfer}
                      onDelete={onDelete}
                      canDelete={canDelete}
                      getPreviousStatus={getPreviousStatus}
                      getNextStatus={getNextStatus}
                    />
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Desktop Layout - All columns visible with horizontal scroll */}
      <div className="hidden md:flex gap-4 overflow-x-auto pb-4 h-full scrollbar-thin scrollbar-thumb-muted-foreground/30 hover:scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent">
        {columns.map((status) => {
          const columnLeads = getLeadsByStatus(status);
          return (
            <div
              key={status}
              className="flex-shrink-0 w-72 bg-gradient-to-b from-muted/50 to-muted/20 rounded-xl border border-border/60 flex flex-col max-h-[calc(100vh-220px)] shadow-sm hover:shadow-md transition-shadow duration-200"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-border/60 flex-shrink-0 bg-card/50 backdrop-blur-sm rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full shadow-sm ${LEAD_STATUS_COLORS[status]}`}
                    />
                    <span className="font-semibold text-sm">
                      {LEAD_STATUS_LABELS[status]}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs font-medium bg-background/80 shadow-sm">
                    {columnLeads.length}
                  </Badge>
                </div>
              </div>

              {/* Column Content */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-2 space-y-2">
                  {columnLeads.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground/70 border-2 border-dashed border-border/40 rounded-lg m-2">
                      Arraste leads aqui
                    </div>
                  ) : (
                    columnLeads.map((lead) => (
                      <div key={lead.id} className="group">
                        <KanbanCard
                          lead={lead}
                          responsavelName={getResponsavelName(lead.responsavel_id)}
                          canEdit={canEdit}
                          canEditName={canEditName}
                          canEditDescription={canEditDescription}
                          onLeadClick={onLeadClick}
                          onStatusChange={onStatusChange}
                          onNameUpdate={handleNameUpdate}
                          onDescriptionUpdate={handleDescriptionUpdate}
                          onTransfer={onTransfer}
                          onDelete={onDelete}
                          canDelete={canDelete}
                          getPreviousStatus={getPreviousStatus}
                          getNextStatus={getNextStatus}
                        />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </>
  );
}
