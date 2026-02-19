import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { insertWithCompany } from "@/lib/supabase-helpers";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Lead,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  LeadStatus,
  UserWithRole,
} from "@/types/crm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ExternalLink,
  Phone,
  Users,
  Calendar,
  Loader2,
  MapPin,
  Trash2,
  MessageSquare,
  Eye,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LeadCard } from "./LeadCard";
import { maskPhone } from "@/lib/mask-utils";

interface LeadsTableProps {
  leads: Lead[];
  isLoading: boolean;
  totalCount: number;
  responsaveis: UserWithRole[];
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onRefresh: () => void;
  canEdit: boolean;
  isAdmin: boolean;
  currentUserId: string;
  currentUserName: string;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  canViewContact?: boolean;
}

export function LeadsTable({
  leads,
  isLoading,
  totalCount,
  responsaveis,
  onLeadClick,
  onStatusChange,
  onRefresh,
  canEdit,
  isAdmin,
  currentUserId,
  currentUserName,
  currentPage,
  pageSize,
  onPageChange,
  canViewContact = true,
}: LeadsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [leads]);

  const formatWhatsAppLink = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const phoneWithCountry = cleanPhone.startsWith("55")
      ? cleanPhone
      : `55${cleanPhone}`;
    return `https://wa.me/${phoneWithCountry}`;
  };

  const getResponsavelName = (responsavelId: string | null) => {
    if (!responsavelId) return null;
    const r = responsaveis.find((r) => r.user_id === responsavelId);
    return r?.full_name || null;
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((lead) => lead.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const addHistoryEntry = async (
    leadId: string,
    action: string,
    oldValue: string | null,
    newValue: string | null
  ) => {
    await insertWithCompany("lead_history", {
      lead_id: leadId,
      user_id: currentUserId,
      user_name: currentUserName,
      action,
      old_value: oldValue,
      new_value: newValue,
    });
  };

  const handleDeleteSingle = async (id: string) => {
    setIsDeleting(true);
    const { error } = await supabase
      .from("campaign_leads")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o lead.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Lead excluído",
        description: "O lead foi removido com sucesso.",
      });
      onRefresh();
    }
    setIsDeleting(false);
  };

  const handleDeleteBatch = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    const { error } = await supabase
      .from("campaign_leads")
      .delete()
      .in("id", Array.from(selectedIds));

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir os leads selecionados.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Leads excluídos",
        description: `${selectedIds.size} lead(s) removido(s) com sucesso.`,
      });
      setSelectedIds(new Set());
      onRefresh();
    }
    setIsDeleting(false);
  };

  const handleStatusChangeInline = async (lead: Lead, newStatus: LeadStatus) => {
    try {
      await addHistoryEntry(
        lead.id,
        "Alteração de status",
        LEAD_STATUS_LABELS[lead.status],
        LEAD_STATUS_LABELS[newStatus]
      );

      const { error } = await supabase
        .from("campaign_leads")
        .update({ status: newStatus })
        .eq("id", lead.id);

      if (error) throw error;

      onStatusChange(lead.id, newStatus);
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Erro ao atualizar status",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 flex items-center justify-center shadow-card">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-card">
        <div className="p-4 rounded-2xl bg-muted/50 w-fit mx-auto mb-4">
          <Users className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="font-display font-bold text-lg text-foreground mb-1">
          Nenhum lead encontrado
        </h3>
        <p className="text-sm text-muted-foreground">
          Tente ajustar os filtros para ver mais resultados.
        </p>
      </div>
    );
  }

  return (
  <div className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col h-full">
      {/* Header */}
     <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-medium text-foreground text-sm sm:text-base">
            {totalCount} lead{totalCount !== 1 ? "s" : ""}
          </span>
        </div>

        {isAdmin && selectedIds.size > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 sm:mr-2" />
                )}
                <span className="hidden sm:inline">
                  Excluir {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
                </span>
                <span className="sm:hidden">{selectedIds.size}</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão em lote</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir {selectedIds.size} lead(s)? Esta
                  ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteBatch}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Mobile: Card View */}
      <div className="block sm:hidden p-3 space-y-3">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            responsaveis={responsaveis}
            onLeadClick={onLeadClick}
            onStatusChange={handleStatusChangeInline}
            onDelete={handleDeleteSingle}
            canEdit={canEdit}
            isAdmin={isAdmin}
            isSelected={selectedIds.has(lead.id)}
            onToggleSelect={toggleSelect}
            formatWhatsAppLink={formatWhatsAppLink}
            getResponsavelName={getResponsavelName}
            canViewContact={canViewContact}
          />
        ))}
        {totalCount > pageSize && (
          <PaginationControls
            currentPage={currentPage}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={onPageChange}
          />
        )}
      </div>

      {/* Desktop: Table View with dual scrollbars */}
      {/* Desktop: Table View with always-visible scrollbar */}
      <div className="hidden sm:flex flex-col flex-1 min-h-0">
        <div className="overflow-auto flex-1 min-h-0 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/50">
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === leads.length && leads.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                )}
                <TableHead>Nome</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Mês/Dia</TableHead>
                <TableHead>Convidados</TableHead>
                <TableHead>Chegou em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className={`${selectedIds.has(lead.id) ? "bg-muted/50" : ""} hover:bg-muted/40 transition-colors`}
                >
                  {isAdmin && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(lead.id)}
                        onCheckedChange={() => toggleSelect(lead.id)}
                        aria-label={`Selecionar ${lead.name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{lead.name}</span>
                      {lead.observacoes && (
                        <MessageSquare className="w-3 h-3 text-primary" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      {canViewContact ? lead.whatsapp : maskPhone(lead.whatsapp)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lead.unit ? (
                      <Badge variant="default" className="flex items-center gap-1 w-fit">
                        <MapPin className="w-3 h-3" />
                        {lead.unit}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select
                        value={lead.status}
                        onValueChange={(v) =>
                          handleStatusChangeInline(lead, v as LeadStatus)
                        }
                      >
                        <SelectTrigger className="w-40 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(LEAD_STATUS_LABELS).map(
                            ([value, label]) => (
                              <SelectItem key={value} value={value}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      LEAD_STATUS_COLORS[value as LeadStatus]
                                    }`}
                                  />
                                  {label}
                                </div>
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            LEAD_STATUS_COLORS[lead.status]
                          }`}
                        />
                        {LEAD_STATUS_LABELS[lead.status]}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {getResponsavelName(lead.responsavel_id) || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.month ? (
                      <Badge variant="secondary">
                        {lead.day_of_month || lead.day_preference || "-"}/{lead.month}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.guests ? (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {lead.guests}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">
                        {format(new Date(lead.created_at), "dd/MM/yy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onLeadClick(lead)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {canViewContact && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={formatWhatsAppLink(lead.whatsapp)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}

                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o lead de{" "}
                                <strong>{lead.name}</strong>? Esta ação não pode ser
                                desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteSingle(lead.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalCount > pageSize && (
        <PaginationControls
          currentPage={currentPage}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

function PaginationControls({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(totalCount / pageSize);

  const getVisiblePages = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (currentPage > 3) pages.push("ellipsis");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="px-3 py-1 border-t border-border shrink-0 bg-border">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          {getVisiblePages().map((page, i) =>
            page === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <PaginationLink
                  isActive={page === currentPage}
                  onClick={() => onPageChange(page)}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
