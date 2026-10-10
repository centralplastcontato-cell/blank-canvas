import { useState } from "react";
import { Lead, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LeadStatus } from "@/types/crm";
import { UserWithRole } from "@/types/crm";
import { KANBAN_FUNNEL, KANBAN_OTHERS, kanbanColumnCount, neighborStatus } from "@/lib/leadKanban";

// Colunas do quadro: os status reais + a coluna virtual "realizada" (derivada por data)
type KanbanColumn = LeadStatus | "realizada";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { KanbanCard } from "./KanbanCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadsKanbanProps {
  leads: Lead[];
  /** Leads "realizados" (fechados com festa em data passada), carregados independente da paginação. */
  realizadaLeads?: Lead[];
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
  canViewContact?: boolean;
  /** Total de cada coluna com os filtros (inclui "realizada"); a tela carrega só os mais recentes */
  columnTotals?: Record<string, number>;
}

export function LeadsKanban({
  leads,
  realizadaLeads = [],
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
  canViewContact = true,
  columnTotals,
}: LeadsKanbanProps) {
  // "realizada" é uma coluna VIRTUAL: não é um status salvo no banco.
  // Ela agrupa os leads "fechado" cuja festa vinculada já aconteceu (data passada).
  // O status guardado continua "fechado" — então relatórios de vendas não mudam.
  const columns: KanbanColumn[] = [...KANBAN_FUNNEL, "realizada", ...KANBAN_OTHERS];

  const columnLabel = (c: KanbanColumn) =>
    c === "realizada" ? "Realizada" : LEAD_STATUS_LABELS[c];
  const columnColor = (c: KanbanColumn) =>
    c === "realizada" ? "bg-blue-500" : LEAD_STATUS_COLORS[c];

  // Data de hoje (local) em formato AAAA-MM-DD para comparar com event_date.
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isPastParty = (lead: Lead) => !!lead.party_date && lead.party_date < todayStr;

  // Mobile column navigation state
  const [mobileColumnIndex, setMobileColumnIndex] = useState(0);
  // Paginação interna da coluna "Realizada" (pode ter muitos cartões).
  const REALIZADA_PAGE = 20;
  const [realizadaLimit, setRealizadaLimit] = useState(REALIZADA_PAGE);

  const realizadaIds = new Set(realizadaLeads.map((l) => l.id));

  const getLeadsByStatus = (status: KanbanColumn) => {
    // "Realizada" vem de uma busca dedicada (todas as festas passadas, sem paginação).
    if (status === "realizada") {
      return realizadaLeads;
    }
    if (status === "fechado") {
      return leads.filter(
        (lead) => lead.status === "fechado" && !isPastParty(lead) && !realizadaIds.has(lead.id),
      );
    }
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

  const handleDrop = (e: React.DragEvent, status: KanbanColumn) => {
    e.preventDefault();
    // "realizada" é derivada da data — não é um status salvável, então ignoramos o drop.
    if (status === "realizada") return;
    const leadId = e.dataTransfer.getData("leadId");
    const lead = leads.find((l) => l.id === leadId) || realizadaLeads.find((l) => l.id === leadId);
    // Soltar na mesma coluna não muda nada
    if (leadId && canEdit && lead?.status !== status) {
      onStatusChange(leadId, status);
    }
  };

  // Setas do cartão: andam dentro do funil (até "Fechado") ou entre as outras colunas
  const getPreviousStatus = (currentStatus: LeadStatus) => neighborStatus(currentStatus, -1);
  const getNextStatus = (currentStatus: LeadStatus) => neighborStatus(currentStatus, 1);

  // Número do topo: o total real com os filtros, não só os cartões carregados
  const columnCount = (status: KanbanColumn, shown: number) => kanbanColumnCount(status, shown, columnTotals);

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
  const mobileIsRealizada = currentMobileColumn === "realizada";
  const mobileVisibleLeads = mobileIsRealizada
    ? mobileColumnLeads.slice(0, realizadaLimit)
    : mobileColumnLeads;

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
              className={cn("w-3 h-3 rounded-full shrink-0 shadow-sm", columnColor(currentMobileColumn))}
            />
            <span className="font-semibold text-sm truncate">
              {columnLabel(currentMobileColumn)}
            </span>
            <Badge variant="secondary" className="text-xs shrink-0 bg-muted/80">
              {columnCount(currentMobileColumn, mobileColumnLeads.length)}
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
                  ? `${columnColor(status)} ring-2 ring-offset-1 ring-offset-background ring-primary/30`
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              title={columnLabel(status)}
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
                <>
                  {mobileVisibleLeads.map((lead) => (
                    <div key={lead.id} className="group">
                      <KanbanCard
                        lead={lead}
                        responsavelName={getResponsavelName(lead.responsavel_id)}
                        canEdit={canEdit}
                        canEditName={canEditName}
                        canEditDescription={canEditDescription}
                        canViewContact={canViewContact}
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
                  ))}
                  {mobileIsRealizada && mobileColumnLeads.length > realizadaLimit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-1 text-xs"
                      onClick={() => setRealizadaLimit((n) => n + REALIZADA_PAGE)}
                    >
                      Mostrar mais ({mobileColumnLeads.length - realizadaLimit} restantes)
                    </Button>
                  )}
                  <MoreNote shown={mobileColumnLeads.length} total={columnCount(currentMobileColumn, mobileColumnLeads.length)} />
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Desktop Layout - All columns visible with horizontal scroll */}
      <div className="hidden md:flex gap-4 overflow-x-auto pb-4 h-full scrollbar-thin scrollbar-thumb-muted-foreground/30 hover:scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent">
        {columns.map((status) => {
          const columnLeads = getLeadsByStatus(status);
          const isRealizada = status === "realizada";
          const visibleLeads = isRealizada ? columnLeads.slice(0, realizadaLimit) : columnLeads;
          return (
            <div
              key={status}
              className="flex-shrink-0 w-72 bg-muted/30 rounded-2xl border border-border/60 flex flex-col max-h-[calc(100vh-220px)] shadow-card hover:shadow-card-hover transition-shadow duration-300"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-border/80 flex-shrink-0 bg-card/80 backdrop-blur-sm rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full shadow-sm ${columnColor(status)}`}
                    />
                    <span className="font-semibold text-sm">
                      {columnLabel(status)}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs font-medium bg-background/80 shadow-sm">
                    {columnCount(status, columnLeads.length)}
                  </Badge>
                </div>
              </div>

              {/* Column Content */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-2 space-y-2">
                  {columnLeads.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground/70 border-2 border-dashed border-border/40 rounded-lg m-2">
                      {status === "realizada" ? "Nenhuma festa realizada" : "Arraste leads aqui"}
                    </div>
                  ) : (
                    <>
                      {visibleLeads.map((lead) => (
                        <div key={lead.id} className="group">
                          <KanbanCard
                            lead={lead}
                            responsavelName={getResponsavelName(lead.responsavel_id)}
                            canEdit={canEdit}
                            canEditName={canEditName}
                            canEditDescription={canEditDescription}
                            canViewContact={canViewContact}
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
                      ))}
                      {isRealizada && columnLeads.length > realizadaLimit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-1 text-xs"
                          onClick={() => setRealizadaLimit((n) => n + REALIZADA_PAGE)}
                        >
                          Mostrar mais ({columnLeads.length - realizadaLimit} restantes)
                        </Button>
                      )}
                      <MoreNote shown={columnLeads.length} total={columnCount(status, columnLeads.length)} />
                    </>
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

/** Coluna com mais leads do que os carregados: avisa e indica a lista */
function MoreNote({ shown, total }: { shown: number; total: number }) {
  if (total <= shown) return null;
  return (
    <p className="px-2 pt-1 pb-2 text-center text-[11px] leading-snug text-muted-foreground">
      Mostrando os {shown} mais recentes de {total}. Para ver os outros, use os filtros ou a visão em lista.
    </p>
  );
}
