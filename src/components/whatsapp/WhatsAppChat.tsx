import { useState, useEffect, useRef, useCallback } from "react";
import { formatMessageContent } from "@/lib/format-message";
import { LEAD_STATUS_COLORS, type LeadStatus } from "@/types/crm";
import { supabase } from "@/integrations/supabase/client";
import { insertWithCompany, insertSingleWithCompany, getCurrentCompanyId } from "@/lib/supabase-helpers";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedBadge } from "@/components/ui/animated-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { 
  Send, Search, MessageSquare, Check, CheckCheck, Clock, WifiOff, RefreshCw, 
  ArrowLeft, Building2, Star, StarOff, Link2, FileText, Smile,
  Image as ImageIcon, Mic, Paperclip, Loader2, Square, X, Pause, Play,
  Users, ArrowRightLeft, Trash2, Eraser,
  CalendarCheck, Briefcase, FileCheck, ArrowDown, Video,
  Pencil, Copy, ChevronDown, ChevronUp, Download, Pin, PinOff, Reply
} from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { LinkPreviewCard, extractFirstUrl } from "@/components/whatsapp/LinkPreviewCard";
import { useNotifications } from "@/hooks/useNotifications";
import { useChatNotificationToggle } from "@/hooks/useChatNotificationToggle";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { useMessagesRealtime } from "@/hooks/useMessagesRealtime";
// Latency monitoring removed - was causing flickering
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

interface WapiInstance {
  id: string;
  instance_id: string;
  status: string;
  unit: string | null;
}

interface Conversation {
  id: string;
  instance_id: string;
  lead_id: string | null;
  remote_jid: string;
  contact_name: string | null;
  contact_phone: string;
  contact_picture: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_favorite: boolean;
  is_closed: boolean;
  has_scheduled_visit: boolean;
  is_freelancer: boolean;
  is_equipe: boolean;
  last_message_content: string | null;
  last_message_from_me: boolean;
  bot_enabled: boolean | null;
  bot_step: string | null;
  pinned_message_id: string | null;
}

// Helper: check if a contact_name is a valid display name (not a placeholder)
const isValidContactName = (name: string | null | undefined): name is string => {
  if (!name) return false;
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed !== '.' && trimmed !== '-' && trimmed !== '...' && trimmed !== '--';
};

// Helper: resolve the best display name for a conversation
const getConversationDisplayName = (
  conv: { contact_name: string; contact_phone: string; id: string },
  leadsMap: Record<string, Lead | undefined>
): string => {
  // 1. Prioritize linked lead name
  const leadName = leadsMap[conv.id]?.name;
  if (leadName && leadName.trim().length > 0) return leadName;
  // 2. Use contact_name if valid
  if (isValidContactName(conv.contact_name)) return conv.contact_name;
  // 3. Fallback to phone
  return conv.contact_phone;
};

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  unit: string | null;
  status: string;
  month: string | null;
  day_of_month: number | null;
  day_preference: string | null;
  guests: string | null;
  observacoes: string | null;
  created_at: string;
  responsavel_id: string | null;
  campaign_name: string | null;
}

interface MessageTemplate {
  id: string;
  name: string;
  template: string;
  is_active: boolean;
}

interface Message {
  id: string;
  conversation_id: string;
  message_id: string | null;
  from_me: boolean;
  message_type: string;
  content: string | null;
  media_url: string | null;
  status: string;
  timestamp: string;
  metadata?: Record<string, string> | null;
  quoted_message_id?: string | null;
  is_starred?: boolean;
}

interface WhatsAppChatProps {
  userId: string;
  allowedUnits: string[];
  initialPhone?: string | null;
  initialDraft?: string | null;
  onPhoneHandled?: () => void;
  externalSelectedUnit?: string | null;
  onInstancesLoaded?: (instances: { id: string; unit: string | null; status: string | null }[]) => void;
}

// Component for displaying media with auto-download capability
import { MediaMessage } from "@/components/whatsapp/MediaMessage";
import { ConversationStatusActions } from "@/components/whatsapp/ConversationStatusActions";
import { ConversationFilters, FilterType } from "@/components/whatsapp/ConversationFilters";
import { LeadInfoPopover } from "@/components/whatsapp/LeadInfoPopover";
import { SalesMaterialsMenu } from "@/components/whatsapp/SalesMaterialsMenu";
import { ShareToGroupDialog } from "@/components/whatsapp/ShareToGroupDialog";
import { useFilterOrder } from "@/hooks/useFilterOrder";

export function WhatsAppChat({ userId, allowedUnits, initialPhone, initialDraft, onPhoneHandled, externalSelectedUnit, onInstancesLoaded }: WhatsAppChatProps) {
  const { currentCompany } = useCompany();
  const [instances, setInstances] = useState<WapiInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<WapiInstance | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true); // Assume there are more until proven otherwise
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [oldestMessageTimestamp, setOldestMessageTimestamp] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Sync with external unit selection from header
  useEffect(() => {
    if (externalSelectedUnit && instances.length > 0) {
      const match = instances.find(i => i.unit === externalSelectedUnit);
      if (match && match.id !== selectedInstance?.id) {
        setSelectedInstance(match);
        setSelectedConversation(null);
        setMessages([]);
      }
    }
  }, [externalSelectedUnit, instances]);

  const [hasUserScrolledToTop, setHasUserScrolledToTop] = useState(false); // Track if user manually scrolled to top
  const [isAtBottom, setIsAtBottom] = useState(true); // Track if scroll is at bottom (for scroll-to-bottom button visibility)
  const [unreadNewMessagesCount, setUnreadNewMessagesCount] = useState(0); // Count of new messages while scrolled up
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>('all');
  const { filterOrder, setFilterOrder: saveFilterOrder } = useFilterOrder(userId);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{
    type: 'image' | 'audio' | 'document' | 'video';
    file: File;
    preview?: string;
  } | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const [linkedLead, setLinkedLead] = useState<Lead | null>(null);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [responsaveis, setResponsaveis] = useState<{user_id: string; full_name: string}[]>([]);
  const [selectedTransferUserId, setSelectedTransferUserId] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showShareToGroupDialog, setShowShareToGroupDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Contact sharing state
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [isSendingContact, setIsSendingContact] = useState(false);
  
  // Create new contact state
  const [showCreateContactDialog, setShowCreateContactDialog] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [isCreatingContact, setIsCreatingContact] = useState(false);
  
  // Edit message state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  
  // Reply (quote) state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  // Message search state
  const [messageSearchActive, setMessageSearchActive] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const messageSearchInputRef = useRef<HTMLInputElement>(null);
  
  const messageSearchResults = messageSearchQuery.length >= 2
    ? messages.filter(m => m.content && m.content.toLowerCase().includes(messageSearchQuery.toLowerCase())).map(m => m.id)
    : [];
  
  // Clear message search when conversation changes
  useEffect(() => {
    setMessageSearchActive(false);
    setMessageSearchQuery("");
    setCurrentSearchIndex(0);
  }, [selectedConversation?.id]);

  // Navigate search results
  const navigateSearchResult = useCallback((direction: 'prev' | 'next') => {
    if (messageSearchResults.length === 0) return;
    const newIndex = direction === 'next'
      ? (currentSearchIndex + 1) % messageSearchResults.length
      : (currentSearchIndex - 1 + messageSearchResults.length) % messageSearchResults.length;
    setCurrentSearchIndex(newIndex);
    const el = document.getElementById(`msg-${messageSearchResults[newIndex]}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [messageSearchResults, currentSearchIndex]);

  // Auto-scroll to first result when query changes
  useEffect(() => {
    if (messageSearchResults.length > 0) {
      setCurrentSearchIndex(0);
      const el = document.getElementById(`msg-${messageSearchResults[0]}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [messageSearchQuery]);

  const openMessageSearch = useCallback(() => {
    setMessageSearchActive(true);
    setTimeout(() => messageSearchInputRef.current?.focus(), 100);
  }, []);

  const closeMessageSearch = useCallback(() => {
    setMessageSearchActive(false);
    setMessageSearchQuery("");
    setCurrentSearchIndex(0);
  }, []);

  const [mobileStatusExpanded, setMobileStatusExpanded] = useState(false);
  
  // Undo send state
  
  const [closedLeadConversationIds, setClosedLeadConversationIds] = useState<Set<string>>(new Set());
  const [orcamentoEnviadoConversationIds, setOrcamentoEnviadoConversationIds] = useState<Set<string>>(new Set());
  const [conversationLeadsMap, setConversationLeadsMap] = useState<Record<string, Lead | null>>({});
  const scrollAreaDesktopRef = useRef<HTMLDivElement>(null);
  const scrollAreaMobileRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);
  const isLoadingMoreRef = useRef(false);

  // Audio recording hook
  const {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    error: recordingError,
  } = useAudioRecorder({ maxDuration: 120 });

  // Permissions hook - check all WhatsApp granular permissions
  const { hasPermission: hasUserPermission } = usePermissions(userId);
  const { isAdmin } = useUserRole(userId);
  const canTransferLeads = isAdmin || hasUserPermission('leads.transfer');
  const canDeleteFromChat = isAdmin || hasUserPermission('leads.delete.from_chat');
  const canSendMessages = isAdmin || hasUserPermission('whatsapp.send');
  const canSendMaterials = isAdmin || hasUserPermission('whatsapp.materials');
  const canSendAudio = isAdmin || hasUserPermission('whatsapp.audio');
  const canCloseConversations = isAdmin || hasUserPermission('whatsapp.close');
  const canFavoriteConversations = isAdmin || hasUserPermission('whatsapp.favorite');
  const canToggleBot = isAdmin || hasUserPermission('whatsapp.bot.toggle');
  const canShareToGroup = isAdmin || hasUserPermission('whatsapp.share.group');

  // Notifications hook - uses shared toggle state
  const { notificationsEnabled } = useChatNotificationToggle();
  
  const { notify, requestPermission, hasPermission: hasBrowserPermission } = useNotifications({
    soundEnabled: notificationsEnabled,
    browserNotificationsEnabled: notificationsEnabled,
  });

  // Request notification permission on mount if enabled
  useEffect(() => {
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
      requestPermission();
    }
  }, [notificationsEnabled, requestPermission]);

  // Format recording time as MM:SS
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Refs for bottom markers
  const bottomRefDesktop = useRef<HTMLDivElement>(null);
  const bottomRefMobile = useRef<HTMLDivElement>(null);

  // Scroll to bottom using bottomRef (most reliable for Safari/iOS)
  const scrollToBottomDesktop = useCallback((smooth = true) => {
    if (bottomRefDesktop.current) {
      bottomRefDesktop.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end' 
      });
    } else {
      // Fallback to direct viewport manipulation
      const viewport = scrollAreaDesktopRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
    setUnreadNewMessagesCount(0);
    setIsAtBottom(true);
  }, []);

  const scrollToBottomMobile = useCallback((smooth = true) => {
    if (bottomRefMobile.current) {
      bottomRefMobile.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end' 
      });
    } else {
      // Fallback to direct viewport manipulation
      const viewport = scrollAreaMobileRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
    setUnreadNewMessagesCount(0);
    setIsAtBottom(true);
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchResponsaveis();
    fetchCurrentUserName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch instances whenever allowedUnits changes (separate effect)
  useEffect(() => {
    fetchInstances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedUnits.join(',')]);

  const fetchCurrentUserName = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .single();
    if (data) {
      setCurrentUserName(data.full_name);
    }
  };

  const fetchResponsaveis = async () => {
    // Use the security definer function to get profiles (bypasses RLS restrictions)
    const { data, error } = await supabase.rpc('get_profiles_for_transfer');
    if (data && !error) {
      setResponsaveis(data);
    }
  };

  const handleTransferLead = async () => {
    if (!linkedLead || !selectedTransferUserId) return;

    setIsTransferring(true);

    try {
      const targetUser = responsaveis.find((r) => r.user_id === selectedTransferUserId);
      const previousResponsavel = responsaveis.find(
        (r) => r.user_id === linkedLead.responsavel_id
      );

      // Update the lead's responsavel and status
      const { error: updateError } = await supabase
        .from("campaign_leads")
        .update({ 
          responsavel_id: selectedTransferUserId,
          status: "transferido" as const
        })
        .eq("id", linkedLead.id);

      if (updateError) throw updateError;

      // --- Conversation migration: move conversation to target user's instance ---
      if (selectedConversation && selectedInstance) {
        const currentInstanceId = selectedConversation.instance_id;
        const companyId = localStorage.getItem('selected_company_id') || 'a0000000-0000-0000-0000-000000000001';

        // Step 1: Get target user's unit permissions
        const { data: targetPerms } = await supabase
          .from("user_permissions")
          .select("permission, granted")
          .eq("user_id", selectedTransferUserId)
          .like("permission", "leads.unit.%");

        const hasAll = targetPerms?.some(p => p.permission === "leads.unit.all" && p.granted);
        // If no permissions set at all, default is "all"
        const defaultAll = !targetPerms || targetPerms.length === 0;

        if (!hasAll && !defaultAll) {
          // Extract allowed unit slugs
          const allowedSlugs = targetPerms
            .filter(p => p.granted && p.permission !== "leads.unit.all")
            .map(p => p.permission.replace("leads.unit.", ""));

          // Step 2: Check if target user has access to current instance
          const { data: currentInstance } = await supabase
            .from("wapi_instances")
            .select("unit")
            .eq("id", currentInstanceId)
            .single();

          const currentUnitSlug = currentInstance?.unit?.toLowerCase() || "";
          const hasAccessToCurrent = allowedSlugs.some(s => s === currentUnitSlug);

          if (!hasAccessToCurrent && allowedSlugs.length > 0) {
            // Step 3: Find an instance the target user can access
            const { data: targetInstances } = await supabase
              .from("wapi_instances")
              .select("id, unit")
              .eq("company_id", companyId)
              .in("unit", allowedSlugs);

            if (targetInstances && targetInstances.length > 0) {
              const newInstance = targetInstances[0];

              // Move conversation to new instance
              await supabase
                .from("wapi_conversations")
                .update({ instance_id: newInstance.id })
                .eq("id", selectedConversation.id);

              // Update lead unit to match new instance
              if (newInstance.unit) {
                // Find the unit name from company_units by slug
                const { data: unitData } = await supabase
                  .from("company_units")
                  .select("name")
                  .eq("company_id", companyId)
                  .eq("slug", newInstance.unit)
                  .single();

                await supabase
                  .from("campaign_leads")
                  .update({ unit: unitData?.name || newInstance.unit })
                  .eq("id", linkedLead.id);
              }

              console.log(`[Transfer] Moved conversation ${selectedConversation.id} to instance ${newInstance.id} (unit: ${newInstance.unit})`);
            }
          }
        }
      }
      // --- End conversation migration ---

      // Add history entry
      await supabase.from("lead_history").insert({
        lead_id: linkedLead.id,
        user_id: userId,
        user_name: currentUserName,
        action: "Transferência de lead",
        old_value: previousResponsavel?.full_name || "Não atribuído",
        new_value: targetUser?.full_name || "Desconhecido",
      });

      // Create notification for the receiving user
      const statusLabels: Record<string, string> = {
        novo: 'Novo',
        em_contato: 'Visita',
        orcamento_enviado: 'Orçamento Enviado',
        aguardando_resposta: 'Negociando',
        fechado: 'Fechado',
        perdido: 'Perdido',
        fornecedor: 'Fornecedor',
        cliente_retorno: 'Cliente Retorno',
      };

      await supabase.from("notifications").insert({
        user_id: selectedTransferUserId,
        company_id: getCurrentCompanyId(),
        type: "lead_transfer",
        title: "Novo lead transferido para você",
        message: `${currentUserName} transferiu o lead "${linkedLead.name}" (${statusLabels[linkedLead.status] || linkedLead.status}) para você.`,
        data: {
          lead_id: linkedLead.id,
          lead_name: linkedLead.name,
          lead_status: linkedLead.status,
          transferred_by: currentUserName,
          transferred_by_id: userId,
        },
      });

      toast({
        title: "Lead transferido",
        description: `O lead foi transferido para ${targetUser?.full_name}.`,
      });

      setSelectedTransferUserId("");
      setShowTransferDialog(false);
    } catch (error: unknown) {
      console.error("Error transferring lead:", error);
      toast({
        title: "Erro ao transferir",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  // Delete lead and its associated conversation and messages
  const handleDeleteLeadFromChat = async () => {
    if (!selectedConversation) return;
    
    setIsDeleting(true);
    
    try {
      // Find the lead to delete - use linkedLead state, or look it up
      let leadToDelete = linkedLead;

      if (!leadToDelete) {
        // Try by lead_id on the conversation
        if (selectedConversation.lead_id) {
          const { data: leadById } = await supabase
            .from('campaign_leads')
            .select('id')
            .eq('id', selectedConversation.lead_id)
            .maybeSingle();
          if (leadById) {
            leadToDelete = { id: leadById.id } as typeof linkedLead;
          }
        }

        // If still not found, try by phone number
        if (!leadToDelete && selectedConversation.contact_phone) {
          const phone = selectedConversation.contact_phone.replace(/\D/g, '');
          const { data: leadByPhone } = await supabase
            .from('campaign_leads')
            .select('id')
            .or(`whatsapp.eq.${phone},whatsapp.eq.+${phone}`)
            .maybeSingle();
          if (leadByPhone) {
            leadToDelete = { id: leadByPhone.id } as typeof linkedLead;
          }
        }
      }

      // Delete the lead if found
      if (leadToDelete) {
        // First unlink the conversation from the lead (to avoid FK constraint)
        await supabase
          .from('wapi_conversations')
          .update({ lead_id: null })
          .eq('id', selectedConversation.id);

        // Delete lead history (to avoid foreign key constraint)
        const { error: historyError } = await supabase
          .from('lead_history')
          .delete()
          .eq('lead_id', leadToDelete.id);
        
        if (historyError) {
          console.error("[Delete] Error deleting lead history:", historyError);
        }
        
        // Delete the lead
        const { error: leadError } = await supabase
          .from('campaign_leads')
          .delete()
          .eq('id', leadToDelete.id);
        
        if (leadError) {
          console.error("[Delete] Error deleting lead:", leadError);
          throw new Error(`Erro ao excluir lead: ${leadError.message}`);
        }
      }
      
      // Delete flow lead state for this conversation (FK constraint)
      const { error: flowStateError } = await supabase
        .from('flow_lead_state')
        .delete()
        .eq('conversation_id', selectedConversation.id);
      
      if (flowStateError) {
        console.error("[Delete] Error deleting flow lead state:", flowStateError);
      }

      // Fix orphan messages with NULL company_id before deleting
      // (RLS may block deletion of messages without company_id)
      const { data: convData } = await supabase
        .from('wapi_conversations')
        .select('company_id')
        .eq('id', selectedConversation.id)
        .single();
      
      if (convData?.company_id) {
        await supabase
          .from('wapi_messages')
          .update({ company_id: convData.company_id })
          .eq('conversation_id', selectedConversation.id)
          .is('company_id', null);
      }

      // Delete all messages for this conversation
      const { error: messagesError } = await supabase
        .from('wapi_messages')
        .delete()
        .eq('conversation_id', selectedConversation.id);
      
      if (messagesError) {
        console.error("[Delete] Error deleting messages:", messagesError);
        throw new Error(`Erro ao excluir mensagens: ${messagesError.message}`);
      }
      
      // Delete the conversation itself
      const { error: convError } = await supabase
        .from('wapi_conversations')
        .delete()
        .eq('id', selectedConversation.id);
      
      if (convError) {
        console.error("[Delete] Error deleting conversation:", convError);
        throw new Error(`Erro ao excluir conversa: ${convError.message}`);
      }
      
      // Update local state - remove conversation from list
      setConversations(prev => prev.filter(c => c.id !== selectedConversation.id));
      
      // Clear selection
      setSelectedConversation(null);
      setMessages([]);
      setLinkedLead(null);
      
      toast({
        title: leadToDelete ? "Lead excluído" : "Conversa excluída",
        description: leadToDelete 
          ? "O lead, suas mensagens e a conversa foram removidos permanentemente."
          : "A conversa e suas mensagens foram removidas permanentemente.",
      });
    } catch (error: unknown) {
      console.error("[Delete] Full error:", error);
      const errorMessage = error instanceof Error ? error.message : "Não foi possível excluir. Tente novamente.";
      toast({
        title: "Erro ao excluir",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmDialog(false);
    }
  };

  const fetchTemplates = async () => {
    const companyId = getCurrentCompanyId();
    const { data } = await supabase
      .from("message_templates")
      .select("*")
      .eq("is_active", true)
      .eq("company_id", companyId)
      .order("sort_order", { ascending: true });

    if (data) {
      setTemplates(data as MessageTemplate[]);
    }
  };

  // Track if initialPhone has been processed
  const [initialPhoneProcessed, setInitialPhoneProcessed] = useState(false);
  const [draftApplied, setDraftApplied] = useState(false);

  // Apply initialDraft to message input when conversation is selected
  useEffect(() => {
    if (initialDraft && selectedConversation && !draftApplied) {
      setNewMessage(initialDraft);
      setDraftApplied(true);
    }
  }, [initialDraft, selectedConversation, draftApplied]);

  // Reset processed flag when initialPhone changes (e.g. notification click)
  useEffect(() => {
    if (initialPhone) {
      setInitialPhoneProcessed(false);
      setDraftApplied(false);
    }
  }, [initialPhone]);

  useEffect(() => {
    if (selectedInstance) {
      // Pass initialPhone only on first load if not yet processed
      if (initialPhone && !initialPhoneProcessed) {
        fetchConversations(initialPhone);
        setInitialPhoneProcessed(true);
      } else {
        fetchConversations();
      }

      // Optimized: Use debounced realtime with smarter notifications
      let debounceTimer: NodeJS.Timeout | null = null;
      
      const conversationsChannel = supabase
        .channel(`wapi_conversations_optimized_${selectedInstance.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wapi_conversations',
            filter: `instance_id=eq.${selectedInstance.id}`,
          },
          (payload) => {
            console.log('[Realtime] Conversation event:', payload.eventType, payload.new);
            
            // Handle notifications immediately (no debounce for UX)
            if (payload.eventType === 'UPDATE') {
              const newData = payload.new as Conversation;
              const oldData = payload.old as Partial<Conversation>;
              
              if (
                newData.unread_count > (oldData.unread_count || 0) && 
                !newData.last_message_from_me &&
                newData.id !== selectedConversation?.id
              ) {
                notify({
                  title: newData.contact_name || newData.contact_phone,
                  body: newData.last_message_content || 'Nova mensagem',
                  tag: `whatsapp-${newData.id}`,
                });
              }
            }
            
            // Update conversation locally for instant feedback
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              const updatedConv = payload.new as Conversation;
              
              // Force immediate state update with all fields
              setConversations(prev => {
                const exists = prev.some(c => c.id === updatedConv.id);
                
                if (exists) {
                  // Update existing conversation - merge with existing data to preserve any missing fields
                  const updated = prev.map(c => {
                    if (c.id === updatedConv.id) {
                      return { 
                        ...c, 
                        ...updatedConv,
                        // Ensure critical fields are updated
                        last_message_content: updatedConv.last_message_content ?? c.last_message_content,
                        last_message_at: updatedConv.last_message_at ?? c.last_message_at,
                        unread_count: updatedConv.unread_count ?? c.unread_count,
                      };
                    }
                    return c;
                  });
                  // Re-sort by last message time
                  return updated.sort((a, b) => 
                    new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
                  );
                } else {
                  // New conversation - add to list and sort
                  console.log('[Realtime] Adding new conversation to list');
                  return [updatedConv, ...prev].sort((a, b) => 
                    new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
                  );
                }
              });
              
              // Also update selected conversation if it matches
              if (updatedConv.id === selectedConversation?.id) {
                setSelectedConversation(prev => prev ? { ...prev, ...updatedConv } : null);
              }
            }
            
            // Handle DELETE events - only remove if user explicitly deleted
            // This prevents accidental removal caused by realtime race conditions
            if (payload.eventType === 'DELETE') {
              const deletedId = (payload.old as { id?: string })?.id;
              if (deletedId) {
                console.log('[Realtime] DELETE event for conversation:', deletedId, '- verifying before removing from UI');
                // Verify the conversation was actually deleted by re-checking the database
                supabase
                  .from('wapi_conversations')
                  .select('id')
                  .eq('id', deletedId)
                  .maybeSingle()
                  .then(({ data: stillExists }) => {
                    if (!stillExists) {
                      // Confirmed deleted - safe to remove from UI
                      console.log('[Realtime] Confirmed deletion of conversation:', deletedId);
                      setConversations(prev => prev.filter(c => c.id !== deletedId));
                    } else {
                      console.warn('[Realtime] DELETE event received but conversation still exists in DB - ignoring:', deletedId);
                    }
                  });
              }
            }
            
            // Reduced debounce for full refresh - only as safety net
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              fetchConversations(undefined, true);
            }, 10000);
          }
        )
        .subscribe();

      return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        supabase.removeChannel(conversationsChannel);
      };
    }
  }, [selectedInstance, selectedConversation?.id, notify, initialPhone, initialPhoneProcessed]);

  // Track if at bottom using ref for realtime callback access
  const isAtBottomRef = useRef(true);
  isAtBottomRef.current = isAtBottom;

  // Stable callback for handling new messages from realtime - OPTIMIZED for low latency
  const handleNewRealtimeMessage = useCallback((newMessage: Message & { _realtimeReceivedAt?: number }) => {
    // Minimal processing - append directly without expensive operations
    setMessages((prev) => {
      // Fast duplicate check by ID only
      if (prev.some(m => m.id === newMessage.id)) {
        return prev;
      }
      
      // Fast optimistic message replacement (check last few messages only)
      const recentMessages = prev.slice(-10);
      const optimisticIdx = recentMessages.findIndex(m => 
        m.id.startsWith('optimistic-') && 
        m.from_me && 
        newMessage.from_me &&
        m.message_type === newMessage.message_type &&
        (m.message_type !== 'text' || m.content === newMessage.content)
      );
      
      if (optimisticIdx >= 0) {
        const actualIdx = prev.length - 10 + optimisticIdx;
        if (actualIdx >= 0) {
          const updated = [...prev];
          updated[actualIdx] = newMessage;
          return updated;
        }
      }
      
      // Simply append - no sorting (messages arrive in order from webhook)
      return [...prev, newMessage];
    });

    // Increment unread counter if not at bottom and message is from contact
    if (!isAtBottomRef.current && !newMessage.from_me) {
      setUnreadNewMessagesCount(prev => prev + 1);
    }
  }, []);

  // Handle realtime UPDATE events (e.g. media_url updated after async download)
  const handleRealtimeMessageUpdate = useCallback((updatedMessage: Message & { media_url?: string | null }) => {
    setMessages((prev) => {
      const idx = prev.findIndex(m => m.id === updatedMessage.id);
      if (idx === -1) return prev;
      const existing = prev[idx];
      // Only update if media_url actually changed
      if (existing.media_url === updatedMessage.media_url && existing.status === updatedMessage.status) return prev;
      const updated = [...prev];
      updated[idx] = { ...existing, ...updatedMessage };
      return updated;
    });
  }, []);

  // Use the robust realtime hook for messages
  useMessagesRealtime({
    conversationId: selectedConversation?.id || null,
    onNewMessage: handleNewRealtimeMessage,
    onMessageUpdate: handleRealtimeMessageUpdate,
    enabled: true,
  });
  
  // Cleanup reference for conversation ID tracking
  const prevConversationIdRef = useRef<string | null>(null);
  
  // Effect for fetching data when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      // If switching to a different conversation, clear messages immediately
      if (prevConversationIdRef.current !== selectedConversation.id) {
        setMessages([]);
        setLinkedLead(null);
        setReplyingTo(null);
        setIsLoadingMessages(true);
        setHasMoreMessages(true);
        setOldestMessageTimestamp(null);
        setIsInitialLoad(true);
        setHasUserScrolledToTop(false);
        setIsAtBottom(true);
        setUnreadNewMessagesCount(0); // Reset unread counter on conversation change
      }
      
      // Use cached lead data if available
      const cachedLead = conversationLeadsMap[selectedConversation.id];
      
      // Start fetching messages
      fetchMessages(selectedConversation.id);
      
      // Use cached lead if available, otherwise fetch
      if (cachedLead) {
        setLinkedLead(cachedLead);
      } else if (selectedConversation.lead_id) {
        fetchLinkedLead(selectedConversation.lead_id, selectedConversation);
      } else {
        fetchLinkedLead(null, selectedConversation);
      }

      // Mark as read immediately
      if (selectedConversation.unread_count > 0) {
        setConversations(prev => 
          prev.map(c => c.id === selectedConversation.id ? { ...c, unread_count: 0 } : c)
        );
        setSelectedConversation(prev => prev ? { ...prev, unread_count: 0 } : null);
        
        supabase
          .from('wapi_conversations')
          .update({ unread_count: 0 })
          .eq('id', selectedConversation.id)
          .then(() => {});
      }
    } else {
      setLinkedLead(null);
    }
    // Track current conversation ID to prevent unnecessary resets
    prevConversationIdRef.current = selectedConversation?.id || null;
  }, [selectedConversation?.id]);

  // Scroll to bottom - only on initial load or new messages from me
  const prevMessagesLengthRef = useRef(0);
  const lastMessageFromMeRef = useRef(false);
  
  // Track the conversation ID that needs initial scroll
  const pendingScrollConversationRef = useRef<string | null>(null);
  
  // Force scroll to bottom - primary method uses scrollIntoView on bottomRef
  const forceScrollToBottom = useCallback((smooth = false) => {
    const scrollViaRef = () => {
      // Try bottomRefs first (most reliable for iOS Safari)
      if (bottomRefDesktop.current) {
        bottomRefDesktop.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
        return true;
      }
      if (bottomRefMobile.current) {
        bottomRefMobile.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
        return true;
      }
      return false;
    };

    const scrollViaViewport = () => {
      // Fallback to direct viewport manipulation
      const desktopViewport = scrollAreaDesktopRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
      const mobileViewport = scrollAreaMobileRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
      const viewport = desktopViewport || mobileViewport;
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
        return true;
      }
      return false;
    };

    // Execute immediately with both strategies
    if (!scrollViaRef()) {
      scrollViaViewport();
    }
    
    // RAF for after React render
    requestAnimationFrame(() => {
      if (!scrollViaRef()) {
        scrollViaViewport();
      }
    });
    
    // Delayed attempts for slow mobile renders
    const delays = [50, 150, 300];
    delays.forEach(delay => {
      setTimeout(() => {
        if (!scrollViaRef()) {
          scrollViaViewport();
        }
      }, delay);
    });

    // Reset states
    setIsAtBottom(true);
    setUnreadNewMessagesCount(0);
  }, []);
  
  // Effect for initial scroll when messages load for a conversation
  useEffect(() => {
    const conversationId = selectedConversation?.id;
    const messagesLength = messages.length;
    
    // When messages load for a NEW conversation, scroll to bottom immediately (no animation)
    if (conversationId && messagesLength > 0 && pendingScrollConversationRef.current !== conversationId) {
      pendingScrollConversationRef.current = conversationId;
      forceScrollToBottom(false); // behavior: 'auto' for instant scroll on open
    }
  }, [selectedConversation?.id, messages.length, forceScrollToBottom]);
  
  // Effect for new incoming/outgoing messages (WhatsApp-style behavior)
  useEffect(() => {
    const messagesLength = messages.length;
    const lastMessage = messages[messagesLength - 1];
    const isNewMessage = messagesLength > prevMessagesLengthRef.current;
    const isFromMe = lastMessage?.from_me;
    
    if (isNewMessage && messagesLength > 0 && !isLoadingMoreRef.current) {
      // Always scroll for my sent messages
      // For incoming messages, only scroll if user is near bottom
      if (isFromMe || isAtBottomRef.current) {
        forceScrollToBottom(true); // smooth scroll for new messages
      }
      // Counter increment is handled in handleNewRealtimeMessage
    }
    
    prevMessagesLengthRef.current = messagesLength;
    lastMessageFromMeRef.current = isFromMe || false;
  }, [messages, forceScrollToBottom]);
  
  // Reset pending scroll conversation when changing conversations
  useEffect(() => {
    if (!selectedConversation) {
      pendingScrollConversationRef.current = null;
    }
  }, [selectedConversation]);
  
  // Track if user has manually scrolled (to prevent auto-loading on initial load)
  const canLoadMoreRef = useRef(false);
  
  // Reset canLoadMore when conversation changes
  useEffect(() => {
    if (isInitialLoad) {
      canLoadMoreRef.current = false;
      // Enable loading more after shorter delay
      const timer = setTimeout(() => {
        canLoadMoreRef.current = true;
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isInitialLoad]);
  
  // Scroll listener - track position and handle infinite scroll
  useEffect(() => {
    const desktopViewport = scrollAreaDesktopRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    const mobileViewport = scrollAreaMobileRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement;
      const { scrollTop, scrollHeight, clientHeight } = target;
      
      // WhatsApp-style: near bottom means within 120px
      const nearBottom = scrollHeight - scrollTop - clientHeight <= 120;
      setIsAtBottom(nearBottom);
      
      // Reset unread counter when user scrolls to bottom manually
      if (nearBottom) {
        setUnreadNewMessagesCount(0);
      }
      
      // Track when user reaches top (within 50px)
      if (scrollTop < 50 && !isInitialLoad && messages.length > 0) {
        setHasUserScrolledToTop(true);
      }
      
      // Load more when scrolled near top (within 80px)
      if (scrollTop < 80 && hasMoreMessages && !isLoadingMoreRef.current && !isInitialLoad && messages.length > 0 && canLoadMoreRef.current) {
        loadMoreMessages();
      }
    };
    
    // Add listeners with passive flag for performance
    desktopViewport?.addEventListener('scroll', handleScroll, { passive: true });
    mobileViewport?.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      desktopViewport?.removeEventListener('scroll', handleScroll);
      mobileViewport?.removeEventListener('scroll', handleScroll);
    };
  }, [hasMoreMessages, isInitialLoad, messages.length]);

  const fetchInstances = async (retryCount = 0) => {
    setIsLoading(true);
    
    // Ensure we have an active session before querying (RLS depends on auth.uid())
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('[WhatsAppChat] fetchInstances attempt', retryCount, 'session:', !!sessionData?.session, 'allowedUnits:', allowedUnits);
    
    if (!sessionData?.session && retryCount < 3) {
      // Session not ready yet, retry after a short delay
      setTimeout(() => fetchInstances(retryCount + 1), 800);
      return;
    }
    
    if (!sessionData?.session) {
      console.error('[WhatsAppChat] No session after retries');
      setIsLoading(false);
      setHasAttemptedLoad(true);
      return;
    }
    
    // Build query based on allowed units
    const companyId = localStorage.getItem('selected_company_id') || 'a0000000-0000-0000-0000-000000000001';
    let query = supabase
      .from("wapi_instances")
      .select("id, instance_id, status, unit")
      .eq("company_id", companyId);

    // Filter by allowed units - if empty, show nothing (user has no unit access)
    if (!allowedUnits.includes('all')) {
      if (allowedUnits.length === 0) {
        console.log('[WhatsAppChat] No allowed units, showing empty');
        setInstances([]);
        setIsLoading(false);
        setHasAttemptedLoad(true);
        return;
      }
      query = query.in("unit", allowedUnits);
    }

    const { data, error } = await query.order("unit", { ascending: true });
    console.log('[WhatsAppChat] Instances query result:', { companyId, count: data?.length, error: error?.message });
    console.log('[WhatsAppChat] Instances query result:', { count: data?.length, error: error?.message, data });

    if (error) {
      console.error('[WhatsAppChat] Error fetching instances:', error);
      if (retryCount < 3) {
        setTimeout(() => fetchInstances(retryCount + 1), 1000);
        return;
      }
    }

    if (data && data.length > 0) {
      setInstances(data as WapiInstance[]);
      onInstancesLoaded?.(data.map(d => ({ id: d.id, unit: d.unit, status: d.status })));
      setSelectedInstance(prev => {
        if (prev) {
          const stillExists = data.some(inst => inst.id === prev.id);
          if (stillExists) return prev;
        }
        return data[0] as WapiInstance;
      });

      // Background sync: check real status for instances that appear disconnected
      const disconnected = data.filter(i => i.status !== 'connected');
      if (disconnected.length > 0) {
        syncInstanceStatuses(disconnected as WapiInstance[]);
      }
    } else if (!error && retryCount < 2) {
      // No instances found but no error - might be a timing/RLS issue, retry once
      console.warn('[WhatsAppChat] No instances returned, retrying...', { retryCount });
      setTimeout(() => fetchInstances(retryCount + 1), 1500);
      return;
    } else {
      console.warn('[WhatsAppChat] No instances returned from query after retries');
    }
    setIsLoading(false);
    setHasAttemptedLoad(true);
  };

  // Background check of real connection status via W-API
  const syncInstanceStatuses = async (instancesToCheck: WapiInstance[]) => {
    for (const instance of instancesToCheck) {
      try {
        const response = await supabase.functions.invoke("wapi-send", {
          body: {
            action: "get-status",
            instanceId: instance.instance_id,
          },
        });

        if (response.data?.status === "connected" || response.data?.connected === true) {
          // Update DB
          await supabase
            .from("wapi_instances")
            .update({ status: "connected", connected_at: new Date().toISOString() })
            .eq("id", instance.id);

          // Update local state
          setInstances(prev =>
            prev.map(i => i.id === instance.id ? { ...i, status: "connected" } : i)
          );
          // If this was the selected instance, update it too
          setSelectedInstance(prev =>
            prev?.id === instance.id ? { ...prev, status: "connected" } : prev
          );
        }
      } catch (error) {
        console.error(`[SyncStatus] Error checking ${instance.unit}:`, error);
      }
    }
  };

  const fetchConversations = async (selectPhone?: string, skipLeadRefresh?: boolean) => {
    if (!selectedInstance) return;

    // Optimized: Select only necessary columns instead of "*"
    const { data } = await supabase
      .from("wapi_conversations")
      .select("id, instance_id, lead_id, remote_jid, contact_name, contact_phone, contact_picture, last_message_at, unread_count, is_favorite, is_closed, has_scheduled_visit, is_freelancer, is_equipe, last_message_content, last_message_from_me, bot_enabled, bot_step, pinned_message_id, created_at")
      .eq("instance_id", selectedInstance.id)
      .order("last_message_at", { ascending: false, nullsFirst: true });

    if (data) {
      // Sort: conversations without last_message_at (new leads) first, then by most recent
      const sortedConversations = [...data].sort((a, b) => {
        // If both have no last_message_at, sort by created_at desc
        if (!a.last_message_at && !b.last_message_at) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        // Conversations without last_message_at come first
        if (!a.last_message_at) return -1;
        if (!b.last_message_at) return 1;
        // Otherwise sort by last_message_at desc
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
      
      setConversations(sortedConversations as Conversation[]);
      
      // Fetch lead IDs that are linked to conversations
      const leadIds = sortedConversations
        .map((conv: Conversation) => conv.lead_id)
        .filter((id): id is string => id !== null);
      
      if (leadIds.length > 0) {
        // On realtime refresh (skipLeadRefresh), only fetch leads not already cached
        const idsToFetch = skipLeadRefresh
          ? leadIds.filter(id => !Object.values(conversationLeadsMap).some(l => l?.id === id))
          : leadIds;

        let allLeads: Lead[] = [];

        if (!skipLeadRefresh || idsToFetch.length > 0) {
          const fetchIds = skipLeadRefresh ? idsToFetch : leadIds;
          const { data: freshLeads } = await supabase
            .from("campaign_leads")
            .select("id, name, whatsapp, unit, status, month, day_of_month, day_preference, guests, observacoes, created_at, responsavel_id, campaign_name")
            .in("id", fetchIds);
          if (freshLeads) allLeads = freshLeads as Lead[];
        }

        // Merge with existing cached leads when doing partial refresh
        if (skipLeadRefresh) {
          const cachedLeads = Object.values(conversationLeadsMap).filter((l): l is Lead => l !== null);
          const freshIds = new Set(allLeads.map(l => l.id));
          cachedLeads.forEach(l => { if (!freshIds.has(l.id) && leadIds.includes(l.id)) allLeads.push(l); });
        }

        if (allLeads.length > 0) {
          const leadsMap: Record<string, Lead | null> = {};
          const closedLeadIds = new Set<string>();
          const oeLeadIds = new Set<string>();
          
          allLeads.forEach((lead) => {
            if (lead.status === 'fechado') closedLeadIds.add(lead.id);
            if (lead.status === 'orcamento_enviado') oeLeadIds.add(lead.id);
          });
          
          data.forEach((conv: Conversation) => {
            if (conv.lead_id) {
              const lead = allLeads.find(l => l.id === conv.lead_id);
              leadsMap[conv.id] = lead as Lead || null;
            }
          });
          
          setConversationLeadsMap(leadsMap);
          
          const closedConvIds = new Set(
            data
              .filter((conv: Conversation) => conv.lead_id && closedLeadIds.has(conv.lead_id))
              .map((conv: Conversation) => conv.id)
          );
          setClosedLeadConversationIds(closedConvIds);
          
          const oeConvIds = new Set(
            data
              .filter((conv: Conversation) => conv.lead_id && oeLeadIds.has(conv.lead_id))
              .map((conv: Conversation) => conv.id)
          );
          setOrcamentoEnviadoConversationIds(oeConvIds);
        }
      }
      
      // If initialPhone is provided, try to select that conversation
      if (selectPhone) {
        const cleanPhone = selectPhone.replace(/\D/g, '');
        const phoneVariants = [
          cleanPhone,
          cleanPhone.replace(/^55/, ''),
          `55${cleanPhone}`,
        ];
        
        const matchingConv = data.find((conv: Conversation) => {
          const convPhone = conv.contact_phone.replace(/\D/g, '');
          return phoneVariants.some(p => convPhone.includes(p) || p.includes(convPhone));
        });
        
        if (matchingConv) {
          setSelectedConversation(matchingConv as Conversation);
          onPhoneHandled?.();
        } else {
          // Not found in current instance — search across ALL instances
          const { data: crossInstanceConv } = await supabase
            .from("wapi_conversations")
            .select("id, instance_id, remote_jid, contact_name, contact_phone, contact_picture, last_message_at, unread_count, is_favorite, is_closed, has_scheduled_visit, is_freelancer, is_equipe, last_message_content, last_message_from_me, bot_enabled, bot_step, lead_id, is_imported, company_id, pinned_message_id")
            .or(phoneVariants.map(p => `contact_phone.ilike.%${p}%`).join(','))
            .order("last_message_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (crossInstanceConv) {
            // Found in another instance — switch to it
            const targetInstance = instances.find(i => i.id === crossInstanceConv.instance_id);
            if (targetInstance) {
              setSelectedInstance(targetInstance);
              setSelectedConversation(crossInstanceConv as unknown as Conversation);
              onPhoneHandled?.();
              return;
            }
          }

          // Truly no conversation anywhere — create new
          if (selectedInstance) {
            await createNewConversation(selectPhone);
            onPhoneHandled?.();
          } else {
            toast({
              title: "Conversa não encontrada",
              description: "Não há histórico de conversa com este número na plataforma.",
              variant: "destructive",
            });
            onPhoneHandled?.();
          }
        }
      }
    }
  };

  // Create a new conversation for a phone number that has no history
  const createNewConversation = async (phone: string) => {
    if (!selectedInstance) return;

    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const remoteJid = `${phoneWithCountry}@s.whatsapp.net`;

    // Try to find lead info for this phone
    const phoneVariants = [
      cleanPhone,
      cleanPhone.replace(/^55/, ''),
      `55${cleanPhone}`,
    ];

    const { data: leadData } = await supabase
      .from("campaign_leads")
      .select("id, name, whatsapp")
      .or(phoneVariants.map(p => `whatsapp.ilike.%${p}%`).join(','))
      .limit(1)
      .single();

    // Create the conversation
    const { data: newConv, error } = await insertWithCompany('wapi_conversations', {
      instance_id: selectedInstance.id,
      remote_jid: remoteJid,
      contact_phone: phoneWithCountry,
      contact_name: leadData?.name || null,
      lead_id: leadData?.id || null,
      bot_enabled: false,
      unread_count: 0,
      is_favorite: false,
      is_closed: false,
    }) as { data: any; error: any };
    
    // Fetch the created conversation
    let createdConv = null;
    if (!error) {
      const { data } = await supabase
        .from('wapi_conversations')
        .select('*')
        .eq('instance_id', selectedInstance.id)
        .eq('contact_phone', phoneWithCountry)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      createdConv = data;
    }

    if (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Erro ao criar conversa",
        description: error.message || "Não foi possível iniciar a conversa.",
        variant: "destructive",
      });
      return;
    }

    if (newConv) {
      // Add to conversations list
      setConversations(prev => [newConv as Conversation, ...prev]);
      // Select the new conversation
      setSelectedConversation(newConv as Conversation);
      
      toast({
        title: "Conversa iniciada",
        description: `Agora você pode enviar mensagens para ${leadData?.name || phoneWithCountry}`,
      });
    }
  };

  const MESSAGES_LIMIT = 20;
  
  const fetchMessages = async (conversationId: string, loadMore: boolean = false) => {
    // Prevent concurrent loads
    if (isLoadingMoreRef.current && loadMore) return;
    
    if (loadMore) {
      isLoadingMoreRef.current = true;
      setIsLoadingMoreMessages(true);
    }
    // Note: For initial load, states are already set in the useEffect before calling this function
    
    try {
      // Build query with cursor-based pagination - select only necessary columns
      let query = supabase
        .from("wapi_messages")
        .select("id, conversation_id, message_id, from_me, message_type, content, media_url, status, timestamp, metadata, quoted_message_id, is_starred")
        .eq("conversation_id", conversationId)
        .order("timestamp", { ascending: false })
        .limit(MESSAGES_LIMIT);
      
      // For loadMore, use cursor (timestamp of oldest message we have)
      if (loadMore && oldestMessageTimestamp) {
        query = query.lt("timestamp", oldestMessageTimestamp);
      }
      
      const { data, error } = await query;

      if (error) {
        console.error("[fetchMessages] Error:", error);
        return;
      }

      if (data && data.length > 0) {
        // Reverse to display oldest first within the batch
        const orderedMessages = data.reverse() as Message[];
        
        // Update cursor with oldest message timestamp
        const oldestMsg = orderedMessages[0];
        setOldestMessageTimestamp(oldestMsg.timestamp);
        
        // Check if there are more messages
        const moreAvailable = data.length >= MESSAGES_LIMIT;
        setHasMoreMessages(moreAvailable);
        
        if (loadMore) {
          // Prepend older messages with deduplication
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMsgs = orderedMessages.filter(m => !existingIds.has(m.id));
            return [...newMsgs, ...prev];
          });
        } else {
          // Initial load - merge with any realtime messages that arrived during fetch
          setMessages(prev => {
            if (prev.length === 0) return orderedMessages;
            const fetchedIds = new Set(orderedMessages.map(m => m.id));
            const realtimeOnly = prev.filter(m => !fetchedIds.has(m.id) && !m.id.startsWith('optimistic-'));
            if (realtimeOnly.length === 0) return orderedMessages;
            return [...orderedMessages, ...realtimeOnly].sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          });
        }
      } else if (!loadMore) {
        // No messages found
        setMessages([]);
        setHasMoreMessages(false);
      } else {
        // No more older messages
        setHasMoreMessages(false);
      }
    } finally {
      setIsLoadingMessages(false);
      setIsLoadingMoreMessages(false);
      
      // IMPORTANT: Only reset isLoadingMoreRef here for non-loadMore calls.
      // For loadMore, the caller (loadMoreMessages) resets it AFTER scroll restoration
      // to prevent the auto-scroll effect from snapping to bottom.
      if (!loadMore) {
        isLoadingMoreRef.current = false;
        // Mark initial load complete after a brief delay for scroll (handled by useEffect)
        setTimeout(() => setIsInitialLoad(false), 400);
      }
    }
  };
  
  const loadMoreMessages = async () => {
    if (selectedConversation && !isLoadingMoreRef.current && hasMoreMessages) {
      // Get viewport and save scroll position before loading
      const viewport = scrollAreaDesktopRef.current?.querySelector('[data-radix-scroll-area-viewport]') 
        || scrollAreaMobileRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      
      const previousScrollHeight = viewport?.scrollHeight || 0;
      const previousScrollTop = viewport?.scrollTop || 0;
      
      await fetchMessages(selectedConversation.id, true);
      
      // Restore scroll position after messages are prepended - use double rAF for Safari
      if (viewport) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const newScrollHeight = viewport.scrollHeight;
            const scrollDiff = newScrollHeight - previousScrollHeight;
            viewport.scrollTop = previousScrollTop + scrollDiff;
            // Reset flag AFTER scroll restoration so auto-scroll effect doesn't fire in between
            isLoadingMoreRef.current = false;
          });
        });
      }
    }
  };

  const fetchLinkedLead = async (leadId: string | null, conversation?: Conversation | null) => {
    if (leadId) {
      // Lead already linked, just fetch it
      const { data } = await supabase
        .from("campaign_leads")
        .select("id, name, whatsapp, unit, status, month, day_of_month, day_preference, guests, observacoes, created_at, responsavel_id, campaign_name")
        .eq("id", leadId)
        .single();

      if (data) {
        setLinkedLead(data as Lead);
      } else {
        setLinkedLead(null);
      }
      return;
    }

    // No lead linked - try to auto-link by phone number
    if (conversation && selectedInstance) {
      const contactPhone = conversation.contact_phone.replace(/\D/g, '');
      const phoneVariants = [
        contactPhone,
        contactPhone.replace(/^55/, ''), // Remove Brazil country code
        `55${contactPhone}`, // Add Brazil country code
      ];

      // Search for a lead matching this phone number in the same unit
      const { data: matchingLead } = await supabase
        .from("campaign_leads")
        .select("id, name, whatsapp, unit, status, month, day_of_month, day_preference, guests, observacoes, created_at, responsavel_id, campaign_name")
        .or(phoneVariants.map(p => `whatsapp.ilike.%${p}%`).join(','))
        .eq("unit", selectedInstance.unit)
        .limit(1)
        .single();

      if (matchingLead) {
        // Auto-link the conversation to the lead
        const { error } = await supabase
          .from('wapi_conversations')
          .update({ lead_id: matchingLead.id })
          .eq('id', conversation.id);

        if (!error) {
          setLinkedLead(matchingLead as Lead);
          // Update local state
          setConversations(prev => 
            prev.map(c => c.id === conversation.id ? { ...c, lead_id: matchingLead.id } : c)
          );
          setSelectedConversation({ ...conversation, lead_id: matchingLead.id });
          
          toast({
            title: "Lead vinculado automaticamente",
            description: `Conversa vinculada a ${matchingLead.name}`,
          });
        }
        return;
      }
    }

    setLinkedLead(null);
  };

  // Create a new lead and classify it directly
  const createAndClassifyLead = async (status: string) => {
    if (!selectedConversation || !selectedInstance || isCreatingLead) return;

    setIsCreatingLead(true);

    try {
      const contactName = getConversationDisplayName(selectedConversation, conversationLeadsMap);
      const cleanPhone = selectedConversation.contact_phone.replace(/\D/g, '');

      // Check if a lead already exists for this whatsapp number to prevent duplicates
      const { data: existingLead } = await supabase
        .from('campaign_leads')
        .select('id, name, whatsapp, unit, status')
        .eq('whatsapp', cleanPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let leadToLink = existingLead;

      if (existingLead) {
        // Lead already exists - just update its status instead of creating a new one
        const validStatus = status as "novo" | "em_contato" | "orcamento_enviado" | "aguardando_resposta" | "fechado" | "perdido" | "transferido";
        await supabase
          .from('campaign_leads')
          .update({ status: validStatus })
          .eq('id', existingLead.id);
        leadToLink = { ...existingLead, status: validStatus };
      } else {
        // No existing lead - create a new one using insertSingleWithCompany (returns created record)
        const { data: newLead, error: createError } = await insertSingleWithCompany('campaign_leads', {
          name: contactName,
          whatsapp: cleanPhone,
          unit: selectedInstance.unit,
          status: status as "novo" | "em_contato" | "orcamento_enviado" | "aguardando_resposta" | "fechado" | "perdido",
          campaign_id: 'whatsapp-chat',
          campaign_name: 'WhatsApp Chat',
        }) as { data: any; error: any };

        if (createError) throw createError;
        leadToLink = newLead;
      }

      if (!leadToLink?.id) {
        throw new Error('Não foi possível obter o lead criado.');
      }

      // Link the conversation to the lead
      const { error: linkError } = await supabase
        .from('wapi_conversations')
        .update({ lead_id: leadToLink.id })
        .eq('id', selectedConversation.id);

      if (linkError) throw linkError;

      // Add history entry (non-blocking)
      const statusLabels: Record<string, string> = {
        novo: 'Novo',
        em_contato: 'Visita',
        orcamento_enviado: 'Orçamento Enviado',
        aguardando_resposta: 'Negociando',
        fechado: 'Fechado',
        perdido: 'Perdido',
        fornecedor: 'Fornecedor',
        cliente_retorno: 'Cliente Retorno',
      };

      supabase.from('lead_history').insert({
        lead_id: leadToLink.id,
        action: existingLead ? 'status_update' : 'lead_created',
        new_value: existingLead 
          ? `Status atualizado para: ${statusLabels[status]}` 
          : `Lead criado via WhatsApp com status: ${statusLabels[status]}`,
        user_id: userId,
      }).then(({ error }) => {
        if (error) console.error('Error saving lead history:', error);
      });

      // Update local state
      setLinkedLead(leadToLink as Lead);
      setConversations(prev => 
        prev.map(c => c.id === selectedConversation.id ? { ...c, lead_id: leadToLink.id } : c)
      );
      setSelectedConversation({ ...selectedConversation, lead_id: leadToLink.id });

      toast({
        title: existingLead ? "Lead vinculado e atualizado" : "Lead criado e classificado",
        description: `${contactName} classificado como "${statusLabels[status]}"`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar lead",
        description: error.message || "Não foi possível criar o lead.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingLead(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !selectedInstance || isSending) return;

    if (!canSendMessages) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para enviar mensagens.", variant: "destructive" });
      return;
    }
    const messageToSend = newMessage.trim();
    const quotedMsg = replyingTo;
    setNewMessage(""); // Clear immediately for UX
    setReplyingTo(null);
    setIsSending(true);

    // Auto-disable bot when human sends a message
    if (selectedConversation.bot_enabled) {
      supabase
        .from("wapi_conversations")
        .update({ bot_enabled: false, bot_step: null })
        .eq("id", selectedConversation.id)
        .then(() => {
          // Update local state
          setSelectedConversation(prev => prev ? { ...prev, bot_enabled: false, bot_step: null } : null);
          setConversations(prev => prev.map(c => c.id === selectedConversation.id ? { ...c, bot_enabled: false, bot_step: null } : c));
          console.log('[Bot] Auto-desativado por envio humano');
        });
    }

    // Optimistic update - show message immediately with pending status
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      conversation_id: selectedConversation.id,
      message_id: null,
      from_me: true,
      message_type: 'text',
      content: messageToSend,
      media_url: null,
      status: 'pending',
      timestamp: new Date().toISOString(),
      quoted_message_id: quotedMsg?.id || null,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);

    // Undo Send: delay actual sending by 5 seconds
    const convId = selectedConversation.id;
    const convPhone = selectedConversation.contact_phone;
    const instId = selectedInstance.instance_id;

    // Send message immediately (no undo delay)
    try {
      const response = await supabase.functions.invoke("wapi-send", {
        body: {
          action: "send-text",
          phone: convPhone,
          message: messageToSend,
          conversationId: convId,
          instanceId: instId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // === PHASE 3: Check for SESSION_INCOMPLETE error from preflight ===
      if (response.data?.errorType === 'SESSION_INCOMPLETE' || response.data?.blocked) {
        // Mark optimistic message as failed (not sent)
        setMessages(prev => prev.map(m => 
          m.id === optimisticId ? { ...m, status: 'failed' } : m
        ));
        toast({
          title: "⚠️ Sessão incompleta",
          description: "A instância está conectada sem sessão válida. Vá em Configurações > Conexão e reconecte.",
          variant: "destructive",
        });
        setIsSending(false);
        return;
      }

      // Update optimistic message to sent status
      setMessages(prev => prev.map(m => 
        m.id === optimisticId ? { ...m, status: 'sent' } : m
      ));
    } catch (error: unknown) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      setNewMessage(messageToSend); // Restore message to input
      
      toast({
        title: "Erro ao enviar",
        description: error instanceof Error ? error.message : "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    }

    setIsSending(false);
    // Refocus textarea after sending so user can type immediately
    setTimeout(() => {
      messageTextareaRef.current?.focus();
    }, 50);
  };

  // Send contact (vCard) handler
  const handleSendContact = async () => {
    if (!contactName.trim() || !contactPhone.trim() || !selectedConversation || !selectedInstance) return;
    
    setIsSendingContact(true);
    
    const contactContent = `[Contato] ${contactName.trim()} - ${contactPhone.trim()}`;
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      conversation_id: selectedConversation.id,
      message_id: null,
      from_me: true,
      message_type: 'contact',
      content: contactContent,
      media_url: null,
      status: 'pending',
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setShowContactDialog(false);
    
    try {
      const response = await supabase.functions.invoke("wapi-send", {
        body: {
          action: "send-contact",
          phone: selectedConversation.contact_phone,
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          conversationId: selectedConversation.id,
           instanceId: selectedInstance.instance_id,
        },
      });

      if (response.error) throw new Error(response.error.message);

      setMessages(prev => prev.map(m => 
        m.id === optimisticId ? { ...m, status: 'sent' } : m
      ));
      
      setContactName("");
      setContactPhone("");
    } catch (error: unknown) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      toast({
        title: "Erro ao enviar contato",
        description: error instanceof Error ? error.message : "Não foi possível enviar o contato.",
        variant: "destructive",
      });
    } finally {
      setIsSendingContact(false);
    }
  };

  // Edit message handler
  const handleSaveEdit = async (msgId: string, messageId: string | null) => {
    if (!editingContent.trim() || !selectedConversation || !selectedInstance) return;
    setIsSavingEdit(true);

    try {
      const trimmedContent = editingContent.trim();

      if (messageId) {
        // Has W-API message ID - try to edit via W-API
        const response = await supabase.functions.invoke("wapi-send", {
          body: {
            action: "edit-text",
            phone: selectedConversation.contact_phone,
            messageId: messageId,
            newContent: trimmedContent,
            conversationId: selectedConversation.id,
            instanceId: selectedInstance.instance_id,
          },
        });

        if (response.error) throw new Error(response.error.message);
        
        const responseData = response.data;
        if (responseData?.error) throw new Error(responseData.error);
      }

      // Always update locally in DB
      await supabase.from('wapi_messages')
        .update({ content: trimmedContent })
        .eq('id', msgId);

      // Update local message
      setMessages(prev => prev.map(m => 
        m.id === msgId ? { ...m, content: trimmedContent } : m
      ));

      toast({ title: "Mensagem editada" });
    } catch (error: unknown) {
      toast({
        title: "Erro ao editar",
        description: error instanceof Error ? error.message : "Não foi possível editar a mensagem.",
        variant: "destructive",
      });
    }

    setEditingMessageId(null);
    setEditingContent("");
    setIsSavingEdit(false);
  };

  // Emoji reaction handler
  const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  
  const handleReaction = async (msg: Message, emoji: string) => {
    if (!selectedInstance || !msg.message_id) return;
    try {
      const response = await supabase.functions.invoke("wapi-send", {
        body: {
          action: "send-reaction",
          instanceId: selectedInstance.instance_id,
          messageId: msg.message_id,
          emoji,
        },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) {
        toast({ title: "Erro", description: response.data.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao reagir", description: err.message, variant: "destructive" });
    }
  };

  // Pin message handler
  const handlePinMessage = async (msg: Message) => {
    if (!selectedConversation) return;
    const isPinned = selectedConversation.pinned_message_id === msg.id;
    const newPinnedId = isPinned ? null : msg.id;
    
    try {
      const { error } = await supabase
        .from('wapi_conversations')
        .update({ pinned_message_id: newPinnedId })
        .eq('id', selectedConversation.id);
      
      if (error) throw error;
      
      setSelectedConversation(prev => prev ? { ...prev, pinned_message_id: newPinnedId } : null);
      setConversations(prev => prev.map(c => c.id === selectedConversation.id ? { ...c, pinned_message_id: newPinnedId } : c));
      toast({ title: isPinned ? "Mensagem desafixada" : "Mensagem fixada 📌" });
    } catch (err: any) {
      toast({ title: "Erro ao fixar", description: err.message, variant: "destructive" });
    }
  };

  // Star message handler
  const handleStarMessage = async (msg: Message) => {
    const newStarred = !msg.is_starred;
    try {
      const { error } = await supabase
        .from('wapi_messages')
        .update({ is_starred: newStarred })
        .eq('id', msg.id);
      if (error) throw error;
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_starred: newStarred } : m));
      toast({ title: newStarred ? "Mensagem favoritada ⭐" : "Favorito removido" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  // Check if message is editable (from_me, text, less than 15 min)
  const isMessageEditable = (msg: Message) => {
    if (!msg.from_me || msg.message_type !== 'text') return false;
    const msgTime = new Date(msg.timestamp).getTime();
    const now = Date.now();
    return (now - msgTime) < 15 * 60 * 1000; // 15 minutes
  };

  // Delete message state
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);

  // Delete message handler
  const handleDeleteMessage = async (msgId: string) => {
    try {
      const { error } = await supabase
        .from('wapi_messages')
        .delete()
        .eq('id', msgId);
      
      if (error) throw error;
      
      setMessages(prev => prev.filter(m => m.id !== msgId));
      toast({ title: "Mensagem apagada" });
    } catch (err: any) {
      toast({ title: "Erro ao apagar", description: err.message, variant: "destructive" });
    } finally {
      setDeleteMessageId(null);
    }
  };

  // Direct text message sender for SalesMaterialsMenu
  const sendTextMessageDirect = async (message: string): Promise<void> => {
    if (!message.trim() || !selectedConversation || !selectedInstance) return;

    const response = await supabase.functions.invoke("wapi-send", {
      body: {
        action: "send-text",
        phone: selectedConversation.contact_phone,
        message: message,
        conversationId: selectedConversation.id,
        instanceId: selectedInstance.instance_id,
      },
    });

    if (response.error) {
      throw new Error(response.error.message);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return format(date, "HH:mm");
  };

  const formatDateSeparator = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) return "Hoje";
    if (isYesterday(date)) return "Ontem";
    return format(date, "EEE., d 'de' MMM.", { locale: ptBR });
  };

  const getDateKey = (timestamp: string) => {
    return new Date(timestamp).toISOString().slice(0, 10);
  };

  const formatConversationDate = (timestamp: string | null) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Ontem";
    return format(date, "dd/MM", { locale: ptBR });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Check className="w-3 h-3 text-muted-foreground" />;
      case "delivered":
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case "read":
        return <CheckCheck className="w-3 h-3 text-primary" />;
      default:
        return <Clock className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const toggleFavorite = async (conv: Conversation) => {
    if (!canFavoriteConversations) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para favoritar conversas.", variant: "destructive" });
      return;
    }
    const newValue = !conv.is_favorite;
    
    await supabase
      .from('wapi_conversations')
      .update({ is_favorite: newValue })
      .eq('id', conv.id);

    setConversations(prev => 
      prev.map(c => c.id === conv.id ? { ...c, is_favorite: newValue } : c)
    );

    toast({
      title: newValue ? "Adicionado aos favoritos" : "Removido dos favoritos",
      description: conv.contact_name || conv.contact_phone,
    });
  };

  const toggleConversationBot = async (conv: Conversation) => {
    if (!canToggleBot) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para ativar/desativar o bot.", variant: "destructive" });
      return;
    }
    const newValue = conv.bot_enabled === false ? true : false;
    
    await supabase
      .from('wapi_conversations')
      .update({ bot_enabled: newValue })
      .eq('id', conv.id);

    setConversations(prev => 
      prev.map(c => c.id === conv.id ? { ...c, bot_enabled: newValue } : c)
    );

    if (selectedConversation?.id === conv.id) {
      setSelectedConversation({ ...selectedConversation, bot_enabled: newValue });
    }

    toast({
      title: newValue ? "Bot ativado" : "Bot desativado",
      description: `Mensagens automáticas ${newValue ? 'ativadas' : 'desativadas'} para esta conversa.`,
    });
  };

  const reactivateBot = async (conv: Conversation) => {
    if (!canToggleBot) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para reativar o bot.", variant: "destructive" });
      return;
    }

    try {
      // Reset bot state: enable bot and set step to 'welcome' so the webhook picks up LP data
      const newStep = (conv.bot_step === 'lp_sent' || !conv.bot_step) ? 'welcome' : conv.bot_step;
      
      // Also clear flow_lead_state if using flow builder, so it can restart
      if (selectedInstance) {
        const { data: botSettings } = await supabase
          .from('wapi_bot_settings')
          .select('use_flow_builder')
          .eq('instance_id', selectedInstance.id)
          .single();
        
        if (botSettings?.use_flow_builder) {
          // Delete flow state so it restarts
          await supabase
            .from('flow_lead_state')
            .delete()
            .eq('conversation_id', conv.id);
        }
      }

      await supabase
        .from('wapi_conversations')
        .update({ bot_enabled: true, bot_step: newStep })
        .eq('id', conv.id);

      // Update local state
      setConversations(prev => 
        prev.map(c => c.id === conv.id ? { ...c, bot_enabled: true, bot_step: newStep } : c)
      );
      if (selectedConversation?.id === conv.id) {
        setSelectedConversation(prev => prev ? { ...prev, bot_enabled: true, bot_step: newStep } : null);
      }

      // Send a prompt message to the lead so the webhook processes the response
      const promptMsg = 'Oi! Desculpe, tive um probleminha técnico 😅\nPodemos continuar de onde paramos?\n\nResponda *1* para continuar';
      
      const { error } = await supabase.functions.invoke('wapi-send', {
        body: {
          action: 'send-text',
          phone: conv.contact_phone.replace(/\D/g, ''),
          message: promptMsg,
          unit: selectedInstance?.unit || undefined,
          conversation_id: conv.id,
        },
      });

      if (error) {
        console.error('Erro ao enviar mensagem de reativação:', error);
      }

      toast({
        title: "Bot reativado ✅",
        description: "Uma mensagem foi enviada ao lead. Quando ele responder, o bot continuará o fluxo.",
      });
    } catch (error) {
      console.error("Erro ao reativar bot:", error);
      toast({
        title: "Erro ao reativar",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const applyTemplate = (template: MessageTemplate) => {
    let message = template.template;
    
    // Replace placeholders with conversation/lead data
    if (selectedConversation) {
      const leadName = conversationLeadsMap[selectedConversation.id]?.name || selectedConversation.contact_name || '';
      const leadMonth = conversationLeadsMap[selectedConversation.id]?.month || '';
      const leadGuests = conversationLeadsMap[selectedConversation.id]?.guests || '';
      const leadCampaign = conversationLeadsMap[selectedConversation.id]?.campaign_name || '';
      const leadUnit = conversationLeadsMap[selectedConversation.id]?.unit || '';
      
      // Support both single braces {nome} and double braces {{nome}}
      message = message
        .replace(/\{\{?nome\}?\}/gi, leadName)
        .replace(/\{\{?telefone\}?\}/gi, selectedConversation.contact_phone || '')
        .replace(/\{\{?mes\}?\}/gi, leadMonth)
        .replace(/\{\{?convidados\}?\}/gi, leadGuests)
        .replace(/\{\{?campanha\}?\}/gi, leadCampaign)
        .replace(/\{\{?unidade\}?\}/gi, leadUnit);
    }

    // Replace company/brand variables
    const companyName = currentCompany?.name || '';
    message = message
      .replace(/\{\{?empresa\}?\}/gi, companyName)
      .replace(/\{\{?buffet\}?\}/gi, companyName)
      .replace(/\{\{?nome[_-]?empresa\}?\}/gi, companyName);
    
    setNewMessage(message);
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Handle file selection for media
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio' | 'document' | 'video') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 16MB for video, 10MB for others)
    const maxSize = type === 'video' ? 16 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: type === 'video' ? "O tamanho máximo para vídeos é 16MB." : "O tamanho máximo é 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Create preview for images and videos
    let preview: string | undefined;
    if (type === 'image' || type === 'video') {
      preview = URL.createObjectURL(file);
    }

    setMediaPreview({ type, file, preview });
    setMediaCaption("");
    
    // Reset input
    event.target.value = '';
  };

  const cancelMediaUpload = () => {
    if (mediaPreview?.preview) {
      URL.revokeObjectURL(mediaPreview.preview);
    }
    setMediaPreview(null);
    setMediaCaption("");
  };

  // Send recorded audio
  const sendRecordedAudio = async () => {
    if (!audioBlob || !selectedConversation || !selectedInstance || isUploading) return;

    setIsUploading(true);
    
    // Optimistic update - show audio message immediately
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      conversation_id: selectedConversation.id,
      message_id: null,
      from_me: true,
      message_type: 'audio',
      content: '[Áudio]',
      media_url: null, // Will be updated when upload completes
      status: 'pending',
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Clear the recording UI immediately for better UX
    cancelRecording();

    try {
      // Create file from blob
      const fileName = `${selectedConversation.id}/${Date.now()}.webm`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(fileName, audioBlob, {
          contentType: audioBlob.type,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(fileName);

      const mediaUrl = urlData.publicUrl;

      const response = await supabase.functions.invoke("wapi-send", {
        body: {
          action: 'send-audio',
          phone: selectedConversation.contact_phone,
          conversationId: selectedConversation.id,
          instanceId: selectedInstance.instance_id,
          mediaUrl,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Update optimistic message to sent status
      setMessages(prev => prev.map(m => 
        m.id === optimisticId ? { ...m, status: 'sent', media_url: mediaUrl } : m
      ));

      toast({
        title: "Áudio enviado",
        description: "Mensagem de voz enviada com sucesso.",
      });
    } catch (error: any) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      
      toast({
        title: "Erro ao enviar áudio",
        description: error.message || "Não foi possível enviar o áudio.",
        variant: "destructive",
      });
    }

    setIsUploading(false);
  };

  // Effect to show error from recording
  useEffect(() => {
    if (recordingError) {
      toast({
        title: "Erro na gravação",
        description: recordingError,
        variant: "destructive",
      });
    }
  }, [recordingError]);

  // Helper function to convert file to base64 with optional compression for images
  const fileToBase64 = async (file: File, compress: boolean = false): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (compress && file.type.startsWith('image/')) {
        // Compress image using canvas
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = (e) => {
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate new dimensions (max 1200px on longest side)
            const maxSize = 1200;
            let { width, height } = img;
            
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = (height / width) * maxSize;
                width = maxSize;
              } else {
                width = (width / height) * maxSize;
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);
            
            // Convert to base64 with quality compression
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve(dataUrl);
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else {
        // Just convert to base64 without compression
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }
    });
  };

  const sendMedia = async () => {
    if (!mediaPreview || !selectedConversation || !selectedInstance || isUploading) return;

    setIsUploading(true);
    
    // Optimistic update - show media message immediately
    const { type, file, preview } = mediaPreview;
    const optimisticId = `optimistic-${Date.now()}`;
    const captionToSend = mediaCaption;
    
    const optimisticMessage: Message = {
      id: optimisticId,
      conversation_id: selectedConversation.id,
      message_id: null,
      from_me: true,
      message_type: type === 'document' ? 'document' : type,
      content: captionToSend || (type === 'image' ? '[Imagem]' : type === 'video' ? '[Vídeo]' : `[Documento] ${file.name}`),
      media_url: preview || null, // Use preview URL for immediate display
      status: 'pending',
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Clear preview immediately for better UX
    cancelMediaUpload();

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedConversation.id}/${Date.now()}.${fileExt}`;

      // For images: convert to base64 directly (faster - avoids double transfer)
      // For documents: upload to storage first (W-API requires URL)
      // For audio: upload to storage
      
      if (type === 'image') {
        // Convert image to base64 (compressed as JPEG) for W-API
        const base64Data = await fileToBase64(file, true);
        
        // Extract the compressed image data to upload to storage
        // Since fileToBase64 compresses to JPEG, we'll save as .jpg
        const storageFileName = `${selectedConversation.id}/${Date.now()}.jpg`;
        
        // Convert base64 back to blob for storage upload
        const base64Response = await fetch(base64Data);
        const imageBlob = await base64Response.blob();
        
        // Upload compressed image to storage
        const { error: uploadError } = await supabase.storage
          .from('whatsapp-media')
          .upload(storageFileName, imageBlob, {
            contentType: 'image/jpeg',
          });
        
        let mediaUrl: string | null = null;
        if (!uploadError) {
          // Use signed URL since bucket is private
          const { data: signedData, error: signedError } = await supabase.storage
            .from('whatsapp-media')
            .createSignedUrl(storageFileName, 31536000); // 1 year expiry
          if (!signedError && signedData?.signedUrl) {
            mediaUrl = signedData.signedUrl;
          }
          console.log('Image uploaded to storage:', mediaUrl);
        } else {
          console.error('Error uploading image to storage:', uploadError);
          // Continue anyway - we'll still send via W-API, just won't have a local copy
        }

        // Send to W-API with base64 (fast) and include mediaUrl for display in chat
        const response = await supabase.functions.invoke("wapi-send", {
          body: {
            action: 'send-image',
            phone: selectedConversation.contact_phone,
            conversationId: selectedConversation.id,
            instanceId: selectedInstance.instance_id,
            base64: base64Data,
            caption: captionToSend,
            mediaUrl: mediaUrl,
          },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }
        
        // Update optimistic message with final URL
        setMessages(prev => prev.map(m => 
          m.id === optimisticId ? { ...m, status: 'sent', media_url: mediaUrl || m.media_url } : m
        ));
      } else if (type === 'document') {
        // For documents: upload to storage first (W-API needs URL)
        const { error: uploadError } = await supabase.storage
          .from('whatsapp-media')
          .upload(fileName, file);

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        // Use signed URL since bucket is private
        const { data: signedData, error: signedError } = await supabase.storage
          .from('whatsapp-media')
          .createSignedUrl(fileName, 31536000); // 1 year expiry

        if (signedError || !signedData?.signedUrl) {
          throw new Error('Falha ao gerar URL do documento');
        }

        const mediaUrl = signedData.signedUrl;

        const response = await supabase.functions.invoke("wapi-send", {
          body: {
            action: 'send-document',
            phone: selectedConversation.contact_phone,
            conversationId: selectedConversation.id,
            instanceId: selectedInstance.instance_id,
            mediaUrl,
            fileName: file.name,
          },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }
        
        // Update optimistic message with final URL
        setMessages(prev => prev.map(m => 
          m.id === optimisticId ? { ...m, status: 'sent', media_url: mediaUrl } : m
        ));
      } else if (type === 'video') {
        // For videos: upload to storage first (W-API needs URL)
        const { error: uploadError } = await supabase.storage
          .from('whatsapp-media')
          .upload(fileName, file, {
            contentType: file.type || 'video/mp4',
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        // Use signed URL since bucket is private
        const { data: signedData, error: signedError } = await supabase.storage
          .from('whatsapp-media')
          .createSignedUrl(fileName, 31536000); // 1 year expiry

        if (signedError || !signedData?.signedUrl) {
          throw new Error('Falha ao gerar URL do vídeo');
        }

        const mediaUrl = signedData.signedUrl;

        const response = await supabase.functions.invoke("wapi-send", {
          body: {
            action: 'send-video',
            phone: selectedConversation.contact_phone,
            conversationId: selectedConversation.id,
            instanceId: selectedInstance.instance_id,
            mediaUrl,
            caption: captionToSend,
          },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }
        
        // Update optimistic message with final URL
        setMessages(prev => prev.map(m => 
          m.id === optimisticId ? { ...m, status: 'sent', media_url: mediaUrl } : m
        ));
      }

      toast({
        title: "Mídia enviada",
        description: `${type === 'image' ? 'Imagem' : type === 'audio' ? 'Áudio' : type === 'video' ? 'Vídeo' : 'Arquivo'} enviado com sucesso.`,
      });
    } catch (error: any) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      
      toast({
        title: "Erro ao enviar mídia",
        description: error.message || "Não foi possível enviar a mídia.",
        variant: "destructive",
      });
    }

    setIsUploading(false);
  };

  // Send material by URL (for sales materials menu)
  const sendMaterialByUrl = async (url: string, type: "document" | "image" | "video", caption?: string, fileName?: string) => {
    if (!selectedConversation || !selectedInstance) {
      throw new Error("Nenhuma conversa selecionada");
    }

    let action = 'send-document';
    if (type === 'image') action = 'send-image';
    if (type === 'video') action = 'send-video';

    try {
      // For documents, use the provided fileName or extract from URL
      const finalFileName = type === 'document' 
        ? (fileName || url.split('/').pop()?.split('?')[0] || 'documento.pdf')
        : undefined;

      const response = await supabase.functions.invoke("wapi-send", {
        body: {
          action,
          phone: selectedConversation.contact_phone,
          conversationId: selectedConversation.id,
          instanceId: selectedInstance.instance_id,
          mediaUrl: url,
          caption: caption || undefined,
          fileName: finalFileName,
        },
      });

      if (response.error) {
        console.error("[sendMaterialByUrl] Error:", response.error);
        const errorMessage = response.error.message || 
          (type === 'video' ? 'Erro ao enviar vídeo. Tente novamente.' : 'Erro ao enviar material.');
        throw new Error(errorMessage);
      }

      // Check if the response data indicates an error
      if (response.data?.error) {
        throw new Error(response.data.error);
      }
    } catch (error: any) {
      console.error("[sendMaterialByUrl] Catch error:", error);
      // Handle network errors and timeouts
      if (error.message?.includes('Load failed') || error.message?.includes('Failed to fetch')) {
        throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
      }
      if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        throw new Error('Tempo esgotado. Tente novamente ou envie um arquivo menor.');
      }
      throw error;
    }
  };

  // Expanded emojis organized by category
  const emojiCategories = {
    '😀 Rostos': ['😊', '😄', '😁', '😆', '🤣', '😂', '🙂', '😉', '😍', '🥰', '😘', '😗', '😜', '🤪', '😎', '🤩', '🥳', '😇', '🤗', '🤔', '😏', '😢', '😭', '😤', '😡', '🥺', '😳', '🫣', '🤭', '😬'],
    '👋 Gestos': ['👋', '👍', '👎', '👏', '🙏', '🤝', '✌️', '🤞', '🤙', '💪', '👊', '✋', '👌', '🫶', '❤️‍🔥', '💅'],
    '❤️ Símbolos': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💖', '💗', '💓', '💘', '💝', '⭐', '✨', '🔥', '💯', '✅', '❌'],
    '🎉 Festa': ['🎉', '🎊', '🎂', '🎈', '🎁', '🎀', '🪅', '🥂', '🍰', '🧁', '🎵', '🎶', '🏰', '👑', '🎠', '🎡'],
    '📦 Objetos': ['📋', '📅', '🗓️', '📞', '💬', '📷', '🎥', '📍', '🏠', '💰', '💳', '📄', '✍️', '📌', '🔗', '⏰'],
  };
  

  const filteredConversations = conversations
    .filter((conv) => {
      // Apply text search
      const matchesSearch = (conv.contact_name || conv.contact_phone)
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      
      // Apply filter
      if (filter === 'unread') return matchesSearch && conv.unread_count > 0;
      if (filter === 'closed') return matchesSearch && conv.is_closed;
      if (filter === 'fechados') return matchesSearch && closedLeadConversationIds.has(conv.id);
      if (filter === 'oe') return matchesSearch && orcamentoEnviadoConversationIds.has(conv.id);
      if (filter === 'visitas') return matchesSearch && conv.has_scheduled_visit;
      if (filter === 'freelancer') return matchesSearch && conv.is_freelancer;
      if (filter === 'equipe') return matchesSearch && conv.is_equipe;
      if (filter === 'favorites') return matchesSearch && conv.is_favorite;
      if (filter === 'grupos') return matchesSearch && conv.remote_jid?.endsWith('@g.us');
      // 'all' filter - show non-closed conversations only
      return matchesSearch && !conv.is_closed;
    })
    .sort((a, b) => {
      // Favorites first, then by last message
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return timeB - timeA;
    });

  const toggleConversationClosed = async (conv: Conversation) => {
    if (!canCloseConversations) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para encerrar conversas.", variant: "destructive" });
      return;
    }
    const newValue = !conv.is_closed;
    
    await supabase
      .from('wapi_conversations')
      .update({ is_closed: newValue })
      .eq('id', conv.id);

    setConversations(prev => 
      prev.map(c => c.id === conv.id ? { ...c, is_closed: newValue } : c)
    );

    if (selectedConversation?.id === conv.id) {
      setSelectedConversation({ ...selectedConversation, is_closed: newValue });
    }

    toast({
      title: newValue ? "Conversa encerrada" : "Conversa reaberta",
      description: newValue 
        ? "A conversa foi movida para Encerradas." 
        : "A conversa foi movida de volta para a lista principal.",
    });
  };

  const toggleScheduledVisit = async (conv: Conversation) => {
    const newValue = !conv.has_scheduled_visit;
    
    await supabase
      .from('wapi_conversations')
      .update({ has_scheduled_visit: newValue })
      .eq('id', conv.id);

    setConversations(prev => 
      prev.map(c => c.id === conv.id ? { ...c, has_scheduled_visit: newValue } : c)
    );

    if (selectedConversation?.id === conv.id) {
      setSelectedConversation({ ...selectedConversation, has_scheduled_visit: newValue });
    }

    toast({
      title: newValue ? "Visita agendada" : "Visita desmarcada",
      description: newValue 
        ? "A conversa foi marcada como tendo visita agendada." 
        : "A marcação de visita foi removida.",
    });
  };

  const toggleFreelancer = async (conv: Conversation) => {
    const newValue = !conv.is_freelancer;
    
    await supabase
      .from('wapi_conversations')
      .update({ is_freelancer: newValue })
      .eq('id', conv.id);

    setConversations(prev => 
      prev.map(c => c.id === conv.id ? { ...c, is_freelancer: newValue } : c)
    );

    if (selectedConversation?.id === conv.id) {
      setSelectedConversation({ ...selectedConversation, is_freelancer: newValue });
    }

    toast({
      title: newValue ? "Marcado como Freelancer" : "Desmarcado como Freelancer",
      description: newValue 
        ? "O contato foi classificado como freelancer." 
        : "A classificação de freelancer foi removida.",
    });
  };

  const toggleEquipe = async (conv: Conversation) => {
    const newValue = !conv.is_equipe;
    
    await supabase
      .from('wapi_conversations')
      .update({ is_equipe: newValue })
      .eq('id', conv.id);

    setConversations(prev => 
      prev.map(c => c.id === conv.id ? { ...c, is_equipe: newValue } : c)
    );

    if (selectedConversation?.id === conv.id) {
      setSelectedConversation({ ...selectedConversation, is_equipe: newValue });
    }

    toast({
      title: newValue ? "Marcado como Equipe" : "Desmarcado como Equipe",
      description: newValue 
        ? "O contato foi classificado como membro da equipe." 
        : "A classificação de equipe foi removida.",
    });
  };

  // Handle status change from quick actions
  const handleConversationLeadStatusChange = (leadId: string, newStatus: string) => {
    // Update the conversationLeadsMap
    setConversationLeadsMap(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(convId => {
        const lead = updated[convId];
        if (lead && lead.id === leadId) {
          updated[convId] = { ...lead, status: newStatus };
        }
      });
      return updated;
    });

    // Update the closedLeadConversationIds and orcamentoEnviadoConversationIds
    setClosedLeadConversationIds(prev => {
      const updated = new Set(prev);
      // Find the conversation with this lead
      const conv = conversations.find(c => c.lead_id === leadId);
      if (conv) {
        if (newStatus === 'fechado') {
          updated.add(conv.id);
        } else {
          updated.delete(conv.id);
        }
      }
      return updated;
    });

    setOrcamentoEnviadoConversationIds(prev => {
      const updated = new Set(prev);
      const conv = conversations.find(c => c.lead_id === leadId);
      if (conv) {
        if (newStatus === 'orcamento_enviado') {
          updated.add(conv.id);
        } else {
          updated.delete(conv.id);
        }
      }
      return updated;
    });

    // Update linkedLead if it's the same lead - use functional update to avoid stale closure
    setLinkedLead(prevLead => {
      if (prevLead?.id === leadId) {
        return { ...prevLead, status: newStatus };
      }
      return prevLead;
    });
  };

  // Handle creating a new contact manually
  const handleCreateContact = async () => {
    if (!selectedInstance || !currentCompany) return;
    if (newContactName.trim().length < 2) {
      toast({ title: "Nome inválido", description: "O nome deve ter pelo menos 2 caracteres.", variant: "destructive" });
      return;
    }
    const digits = newContactPhone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) {
      toast({ title: "Telefone inválido", description: "Informe um telefone válido com DDD.", variant: "destructive" });
      return;
    }
    // Ensure country code
    const phone = digits.startsWith('55') ? digits : `55${digits}`;

    setIsCreatingContact(true);
    try {
      // Check if conversation already exists for this phone on this instance
      const { data: existing } = await supabase
        .from('wapi_conversations')
        .select('id, contact_name, contact_phone')
        .eq('instance_id', selectedInstance.id)
        .eq('contact_phone', phone)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Select existing conversation
        const conv = conversations.find(c => c.id === existing.id);
        if (conv) setSelectedConversation(conv);
        toast({ title: "Contato já existe", description: `Já existe uma conversa com ${phone}.` });
        setShowCreateContactDialog(false);
        setNewContactName("");
        setNewContactPhone("");
        setIsCreatingContact(false);
        return;
      }

      // Create lead
      const { data: leadData, error: leadError } = await insertSingleWithCompany('campaign_leads', {
        name: newContactName.trim(),
        whatsapp: phone,
        unit: selectedInstance.unit || null,
        status: 'novo',
        campaign_id: 'manual',
        campaign_name: 'Criado Manualmente',
      }) as { data: any; error: any };

      if (leadError) throw leadError;

      const leadId = leadData?.id;

      // Create conversation
      const remoteJid = `${phone}@s.whatsapp.net`;
      const { data: convData, error: convError } = await supabase
        .from('wapi_conversations')
        .insert({
          instance_id: selectedInstance.id,
          remote_jid: remoteJid,
          contact_phone: phone,
          contact_name: newContactName.trim(),
          lead_id: leadId || null,
          company_id: currentCompany.id,
          bot_enabled: false,
          unread_count: 0,
          is_favorite: false,
          is_closed: false,
          has_scheduled_visit: false,
          is_freelancer: false,
          is_equipe: false,
        } as any)
        .select()
        .single();

      if (convError) throw convError;

      // Log in lead_history
      if (leadId) {
        await insertWithCompany('lead_history', {
          lead_id: leadId,
          action: 'Lead criado manualmente',
          details: `Contato ${newContactName.trim()} (${phone}) criado manualmente via chat`,
          performed_by: userId,
        });
      }

      // Add to local state and select
      if (convData) {
        const newConv: Conversation = {
          id: convData.id,
          instance_id: convData.instance_id,
          lead_id: convData.lead_id,
          remote_jid: convData.remote_jid,
          contact_name: convData.contact_name,
          contact_phone: convData.contact_phone,
          contact_picture: null,
          last_message_at: convData.created_at || new Date().toISOString(),
          unread_count: 0,
          is_favorite: false,
          is_closed: false,
          has_scheduled_visit: false,
          is_freelancer: false,
          is_equipe: false,
          last_message_content: null,
          last_message_from_me: false,
          bot_enabled: false,
          bot_step: null,
          pinned_message_id: null,
        };
        setConversations(prev => [newConv, ...prev]);
        setSelectedConversation(newConv);
        setMessages([]);
      }

      toast({ title: "Contato criado", description: `${newContactName.trim()} foi adicionado à lista de conversas.` });
      setShowCreateContactDialog(false);
      setNewContactName("");
      setNewContactPhone("");
    } catch (error: any) {
      console.error('Error creating contact:', error);
      toast({ title: "Erro ao criar contato", description: error.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setIsCreatingContact(false);
    }
  };

  const handleInstanceChange = (instanceId: string) => {
    const instance = instances.find(i => i.id === instanceId);
    if (instance) {
      setSelectedInstance(instance);
      setSelectedConversation(null);
      setMessages([]);
      setConversations([]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (instances.length === 0 && hasAttemptedLoad) {
    return (
      <Card className="h-96">
        <CardContent className="flex flex-col items-center justify-center h-full text-center">
          <WifiOff className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Nenhuma instância disponível</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {allowedUnits.length === 0 
              ? "Você não tem permissão para acessar nenhuma unidade."
              : "O administrador ainda não configurou as instâncias para suas unidades."}
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchInstances()}
          >
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const connectedInstances = instances.filter(i => i.status === 'connected' || i.status === 'degraded');
  const hasDisconnectedInstances = instances.some(i => i.status !== 'connected' && i.status !== 'degraded');

  if (connectedInstances.length === 0) {
    return (
      <Card className="h-96">
        <CardContent className="flex flex-col items-center justify-center h-full text-center">
          <WifiOff className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">WhatsApp desconectado</h3>
          <p className="text-sm text-muted-foreground">
            As instâncias configuradas estão desconectadas. Aguarde o administrador conectar.
          </p>
          <div className="mt-4 space-y-2">
            {instances.map(instance => (
              <Badge key={instance.id} variant="secondary">
                <Building2 className="w-3 h-3 mr-1" />
                {instance.unit}: {instance.status}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with Unit Tabs - only show if multiple instances AND no external control */}
      {!externalSelectedUnit && (
        <div className="flex items-center justify-between gap-2 mt-3 mb-3 px-1 shrink-0">
          {instances.length > 1 ? (
            <Tabs 
              value={selectedInstance?.id || ""} 
              onValueChange={handleInstanceChange}
              className="flex-1"
            >
              <TabsList className="bg-card/80 backdrop-blur-sm border border-border/60 shadow-sm">
                {instances.map((instance) => (
                  <TabsTrigger 
                    key={instance.id} 
                    value={instance.id}
                    disabled={instance.status !== 'connected' && instance.status !== 'degraded'}
                    className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Building2 className="w-4 h-4" />
                    {instance.unit}
                    {instance.status === 'degraded' && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    )}
                    {instance.status !== 'connected' && instance.status !== 'degraded' && (
                      <WifiOff className="w-3 h-3 text-destructive" />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      )}

      {/* Disconnected warning - Premium styled */}
      {hasDisconnectedInstances && selectedInstance?.status !== 'connected' && selectedInstance?.status !== 'degraded' && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 mb-3 text-sm text-center shrink-0 shadow-sm backdrop-blur-sm">
          <WifiOff className="w-4 h-4 inline mr-2" />
          Esta unidade está desconectada. Selecione outra ou aguarde o administrador.
        </div>
      )}

      {/* Degraded session banner */}
      {selectedInstance?.status === 'degraded' && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 rounded-xl p-3 mb-3 text-sm text-center shrink-0 shadow-sm backdrop-blur-sm flex items-center justify-center gap-3 flex-wrap">
          <span className="text-amber-800 dark:text-amber-200">
            ⚠️ Sessão incompleta — mensagens não serão entregues
          </span>
          <Button
            size="sm"
            variant="outline"
            className="text-blue-700 border-blue-400 hover:bg-blue-100 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-900/30"
            onClick={async () => {
              if (!selectedInstance) return;
              try {
                const response = await supabase.functions.invoke("wapi-send", {
                  body: {
                    action: "restart-instance",
                    instanceId: selectedInstance.instance_id,
                  },
                });
                if (response.data?.restarted) {
                  toast({
                    title: response.data.connected ? "✅ Instância reiniciada!" : "🔄 Restart enviado",
                    description: response.data.connected 
                      ? "Sessão restaurada. Mensagens devem ser entregues agora."
                      : "Restart aceito. Aguarde alguns segundos e atualize.",
                  });
                  fetchInstances();
                } else {
                  toast({
                    title: "⚠️ Restart não disponível",
                    description: response.data?.reason || "Tente desconectar e reconectar.",
                    variant: "destructive",
                  });
                }
              } catch {
                toast({
                  title: "Erro",
                  description: "Não foi possível reiniciar. Tente em Configurações > Conexão.",
                  variant: "destructive",
                });
              }
            }}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Reiniciar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-amber-700 border-amber-400 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-600 dark:hover:bg-amber-900/30"
            onClick={async () => {
              if (!selectedInstance) return;
              try {
                const response = await supabase.functions.invoke("wapi-send", {
                  body: {
                    action: "repair-session",
                    instanceId: selectedInstance.instance_id,
                  },
                });
                if (response.data?.repaired) {
                  toast({
                    title: "✅ Sessão reparada!",
                    description: `Número ${response.data.phoneNumber} vinculado. Envios desbloqueados.`,
                  });
                  fetchInstances();
                } else {
                  toast({
                    title: "⚠️ Reparo manual necessário",
                    description: response.data?.reason || "Vá em Configurações > Conexão e use 'Reparar Sessão'.",
                    variant: "destructive",
                  });
                }
              } catch {
                toast({
                  title: "Erro",
                  description: "Não foi possível reparar. Tente em Configurações > Conexão.",
                  variant: "destructive",
                });
              }
            }}
          >
            <Eraser className="w-3 h-3 mr-1" />
            Reparar
          </Button>
        </div>
      )}

      {/* Chat Area - Premium Container */}
      {(selectedInstance?.status === 'connected' || selectedInstance?.status === 'degraded') && (
        <div className="flex flex-1 border-0 md:border border-border/60 rounded-none md:rounded-xl overflow-hidden bg-gradient-to-br from-card via-card to-muted/20 min-h-0 md:shadow-lg">
          {/* Mobile: Show full width list or chat */}
          <div className={cn(
            "w-full flex flex-col overflow-hidden md:hidden",
            selectedConversation && "hidden"
          )}>
            <div className="p-3 border-b border-border/60 space-y-2 bg-card/80 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar conversa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background/80 border-border/60 focus:border-primary/50 focus:ring-primary/20"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-10 w-10"
                  onClick={() => setShowCreateContactDialog(true)}
                  title="Novo Contato"
                >
                  <Users className="w-4 h-4" />
                </Button>
              </div>
              <ConversationFilters
                filter={filter}
                onFilterChange={setFilter}
                conversations={conversations}
                closedLeadCount={closedLeadConversationIds.size}
                orcamentoEnviadoCount={orcamentoEnviadoConversationIds.size}
                collapsible={true}
                defaultOpen={false}
                filterOrder={filterOrder}
                onFilterOrderChange={saveFilterOrder}
              />
            </div>
            
            <ScrollArea className="flex-1">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                  <MessageSquare className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={cn(
                      "w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-primary/5 transition-all text-left border-b border-border/40 group",
                      selectedConversation?.id === conv.id && "bg-primary/10 border-l-2 border-l-primary",
                      conv.unread_count > 0 && "bg-gradient-to-r from-primary/10 to-transparent"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-10 w-10 ring-2 ring-border/50 shadow-sm">
                        <AvatarImage 
                          src={conv.contact_picture || undefined} 
                          alt={getConversationDisplayName(conv, conversationLeadsMap)}
                          referrerPolicy="no-referrer"
                        />
                        <AvatarFallback className={cn(
                          "text-primary text-sm font-semibold bg-gradient-to-br",
                          conv.unread_count > 0 ? "from-primary/30 to-primary/10" : "from-primary/15 to-primary/5"
                        )}>
                          {getConversationDisplayName(conv, conversationLeadsMap).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {conv.is_favorite && (
                        <Star className="absolute -top-1 -right-1 w-3 h-3 text-secondary fill-secondary drop-shadow-sm" />
                      )}
                      {conv.has_scheduled_visit && (
                        <CalendarCheck className="absolute -top-1 -left-1 w-3 h-3 text-blue-600 bg-background rounded-full" />
                      )}
                      {conv.is_freelancer && (
                        <Briefcase className="absolute -bottom-1 -left-1 w-3 h-3 text-orange-600 bg-background rounded-full" />
                      )}
                      {conv.is_closed && (
                        <X className="absolute -bottom-1 -right-1 w-3 h-3 text-destructive bg-background rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                          <p className={cn(
                            "truncate text-sm",
                            conv.unread_count > 0 ? "font-bold" : "font-medium"
                          )}>
                            {getConversationDisplayName(conv, conversationLeadsMap)}
                          </p>
                          {conv.lead_id && (
                            <Link2 className="w-3 h-3 text-primary shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <ConversationStatusActions
                            conversation={conv}
                            linkedLead={conversationLeadsMap[conv.id] || null}
                            userId={userId}
                            currentUserName={currentUserName}
                            onStatusChange={handleConversationLeadStatusChange}
                            className="opacity-100"
                          />
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {formatConversationDate(conv.last_message_at)}
                          </span>
                        </div>
                      </div>
                      <div className={cn(
                        "grid mt-0.5 items-center gap-2",
                        conv.unread_count > 0 ? "grid-cols-[1fr_auto]" : "grid-cols-1"
                      )}>
                        <span className={cn(
                          "text-xs truncate block",
                          conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {conv.last_message_from_me && (
                            <CheckCheck className="w-3 h-3 shrink-0 text-primary inline mr-1 align-text-bottom" />
                          )}
                          {conv.last_message_content || conv.contact_phone}
                        </span>
                        {conv.unread_count > 0 && (
                          <AnimatedBadge 
                            value={conv.unread_count > 99 ? "99+" : conv.unread_count}
                           className="h-5 min-w-6 px-1.5 flex items-center justify-center text-[11px] font-bold rounded-full bg-primary text-primary-foreground"
                          />
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Desktop: Resizable Panels */}
          <ResizablePanelGroup direction="horizontal" className="hidden md:flex flex-1">
            {/* Conversations Panel - Resizable */}
            <ResizablePanel 
              defaultSize={35} 
              minSize={20} 
              maxSize={50}
              className="flex flex-col min-h-0"
            >
              <div className="flex flex-col h-full bg-card rounded-2xl shadow-card m-1.5 mr-0 overflow-hidden">
                <div className="p-4 border-b border-border/40 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar conversa..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-muted/50 border-border/40 rounded-xl focus:border-primary/50 focus:ring-primary/20"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 h-10 w-10 rounded-xl"
                      onClick={() => setShowCreateContactDialog(true)}
                      title="Novo Contato"
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                  </div>
                  <ConversationFilters
                    filter={filter}
                    onFilterChange={setFilter}
                    conversations={conversations}
                    closedLeadCount={closedLeadConversationIds.size}
                    orcamentoEnviadoCount={orcamentoEnviadoConversationIds.size}
                    collapsible={true}
                    defaultOpen={false}
                    filterOrder={filterOrder}
                    onFilterOrderChange={saveFilterOrder}
                  />
                </div>
                
                <ScrollArea className="flex-1">
                  {filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                      <MessageSquare className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
                      </p>
                    </div>
                  ) : (
                    filteredConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                    className={cn(
                      "w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/60 transition-all duration-200 text-left border-b border-border/30 group",
                      selectedConversation?.id === conv.id && "bg-primary/8 border-l-[3px] border-l-primary",
                      conv.unread_count > 0 && "bg-primary/5"
                    )}
                      >
                        <div className="relative shrink-0">
                        <Avatar className="h-10 w-10 ring-2 ring-border/50 shadow-sm">
                          <AvatarImage 
                            src={conv.contact_picture || undefined} 
                            alt={getConversationDisplayName(conv, conversationLeadsMap)}
                            referrerPolicy="no-referrer"
                          />
                          <AvatarFallback className={cn(
                            "text-primary text-sm font-semibold bg-gradient-to-br",
                            conv.unread_count > 0 ? "from-primary/30 to-primary/10" : "from-primary/15 to-primary/5"
                          )}>
                            {getConversationDisplayName(conv, conversationLeadsMap).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                          {conv.is_favorite && (
                            <Star className="absolute -top-1 -right-1 w-3 h-3 text-secondary fill-secondary drop-shadow-sm" />
                          )}
                          {conv.has_scheduled_visit && (
                            <CalendarCheck className="absolute -top-1 -left-1 w-3.5 h-3.5 text-blue-600 bg-background rounded-full shadow-sm" />
                          )}
                          {conv.is_freelancer && (
                            <Briefcase className="absolute -bottom-1 -left-1 w-3.5 h-3.5 text-orange-600 bg-background rounded-full shadow-sm" />
                          )}
                          {conv.is_closed && (
                            <X className="absolute -bottom-1 -right-1 w-3.5 h-3.5 text-destructive bg-background rounded-full shadow-sm" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                              <p className={cn(
                                "truncate text-sm",
                                conv.unread_count > 0 ? "font-bold" : "font-medium"
                              )}>
                                {getConversationDisplayName(conv, conversationLeadsMap)}
                              </p>
                              {conv.lead_id && (
                                <Link2 className="w-3 h-3 text-primary shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleConversationClosed(conv);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                                title={conv.is_closed ? "Reabrir conversa" : "Encerrar conversa"}
                              >
                                <X className={cn(
                                  "w-3 h-3",
                                  conv.is_closed ? "text-destructive" : "text-muted-foreground"
                                )} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleScheduledVisit(conv);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                                title={conv.has_scheduled_visit ? "Desmarcar visita" : "Marcar visita agendada"}
                              >
                                <CalendarCheck className={cn(
                                  "w-3 h-3",
                                  conv.has_scheduled_visit ? "text-blue-600" : "text-muted-foreground"
                                )} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFreelancer(conv);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                                title={conv.is_freelancer ? "Desmarcar como Freelancer" : "Marcar como Freelancer"}
                              >
                                <Briefcase className={cn(
                                  "w-3 h-3",
                                  conv.is_freelancer ? "text-orange-600" : "text-muted-foreground"
                                )} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleEquipe(conv);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                                title={conv.is_equipe ? "Desmarcar como Equipe" : "Marcar como Equipe"}
                              >
                                <Users className={cn(
                                  "w-3 h-3",
                                  conv.is_equipe ? "text-cyan-600" : "text-muted-foreground"
                                )} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(conv);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                              >
                                {conv.is_favorite ? (
                                  <StarOff className="w-3 h-3 text-muted-foreground" />
                                ) : (
                                  <Star className="w-3 h-3 text-muted-foreground" />
                                )}
                              </button>
                              <ConversationStatusActions
                                conversation={conv}
                                linkedLead={conversationLeadsMap[conv.id] || null}
                                userId={userId}
                                currentUserName={currentUserName}
                                onStatusChange={handleConversationLeadStatusChange}
                              />
                              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                {formatConversationDate(conv.last_message_at)}
                              </span>
                            </div>
                          </div>
                          <div className={cn(
                            "grid mt-0.5 items-center gap-2",
                            conv.unread_count > 0 ? "grid-cols-[1fr_auto]" : "grid-cols-1"
                          )}>
                            <span className={cn(
                              "text-xs truncate block",
                              conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                            )}>
                              {conv.last_message_from_me && (
                                <CheckCheck className="w-3 h-3 shrink-0 text-primary inline mr-1 align-text-bottom" />
                              )}
                              {conv.last_message_content || conv.contact_phone}
                            </span>
                            {conv.unread_count > 0 && (
                              <AnimatedBadge 
                                value={conv.unread_count > 99 ? "99+" : conv.unread_count}
                               className="h-5 min-w-6 px-1.5 flex items-center justify-center text-[11px] font-bold rounded-full bg-primary text-primary-foreground"
                              />
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </ScrollArea>
              </div>
            </ResizablePanel>

            {/* Resize Handle */}
            <ResizableHandle withHandle className="mx-1 bg-transparent hover:bg-primary/10 transition-colors data-[state=dragging]:bg-primary/20" />

            {/* Messages Panel */}
            <ResizablePanel defaultSize={65} minSize={40} className="flex flex-col min-h-0 min-w-0">
              <div className="flex flex-col h-full bg-card rounded-2xl shadow-card m-1.5 ml-0 overflow-hidden">
              {selectedConversation ? (
                <>
                  {/* Chat Header - Premium Glassmorphism */}
                  <div className="px-4 py-3 border-b border-border/40 flex items-center gap-3 shrink-0 bg-card">
                    <Avatar className="h-9 w-9 shrink-0 ring-2 ring-primary/20 shadow-md">
                      <AvatarImage 
                        src={selectedConversation.contact_picture || undefined} 
                        alt={getConversationDisplayName(selectedConversation, conversationLeadsMap)}
                        referrerPolicy="no-referrer"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-sm font-semibold">
                        {getConversationDisplayName(selectedConversation, conversationLeadsMap).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-medium truncate text-sm sm:text-base">
                          {getConversationDisplayName(selectedConversation, conversationLeadsMap)}
                        </p>
                        {linkedLead && (
                          <div className="flex items-center gap-1">
                            <Badge 
                              variant="secondary" 
                              className="text-[10px] h-4 px-1"
                            >
                              <Link2 className="w-2.5 h-2.5 mr-0.5" />
                              {linkedLead.name.split(' ')[0]}
                            </Badge>
                            <Badge 
                              className={cn(
                                "text-[10px] h-4 px-1.5",
                                LEAD_STATUS_COLORS[linkedLead.status as LeadStatus],
                                linkedLead.status === 'em_contato' && "text-yellow-950"
                              )}
                            >
                              {({
                                novo: 'Novo',
                                em_contato: 'Visita',
                                orcamento_enviado: 'Orçamento',
                                aguardando_resposta: 'Negociando',
                                fechado: 'Fechado',
                                perdido: 'Perdido',
                                transferido: 'Transf.',
                                trabalhe_conosco: 'Trab.',
                                fornecedor: 'Fornec.',
                                cliente_retorno: 'Retorno',
                              } as Record<string, string>)[linkedLead.status] ?? linkedLead.status}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {selectedConversation.contact_phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Info Popover - show for all individual chats */}
                      <LeadInfoPopover
                        linkedLead={linkedLead}
                        selectedConversation={selectedConversation}
                        selectedInstance={selectedInstance}
                        canTransferLeads={canTransferLeads}
                        canDeleteFromChat={canDeleteFromChat}
                        isCreatingLead={isCreatingLead}
                        userId={userId}
                        currentUserName={currentUserName}
                        onShowTransferDialog={() => setShowTransferDialog(true)}
                        onShowDeleteDialog={() => setShowDeleteConfirmDialog(true)}
                        onShowShareToGroupDialog={() => canShareToGroup && linkedLead && setShowShareToGroupDialog(true)}
                        onCreateAndClassifyLead={createAndClassifyLead}
                        onToggleConversationBot={toggleConversationBot}
                        onReactivateBot={reactivateBot}
                        onToggleFavorite={toggleFavorite}
                        onLeadNameChange={(newName) => {
                          setLinkedLead(prev => prev ? { ...prev, name: newName } : null);
                          setSelectedConversation(prev => prev ? { ...prev, contact_name: newName } : null);
                          setConversations(prevConvs => prevConvs.map(c => 
                            c.id === selectedConversation.id ? { ...c, contact_name: newName } : c
                          ));
                        }}
                        onLeadObsChange={(newObs) => {
                          setLinkedLead(prev => prev ? { ...prev, observacoes: newObs || null } : null);
                        }}
                      />
                      {/* O.E. (Orçamento Enviado) button - always visible, disabled without lead */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!linkedLead}
                        onClick={async () => {
                          if (!linkedLead) return;
                          const isCurrentlyOE = linkedLead.status === 'orcamento_enviado';
                          const newStatus = isCurrentlyOE ? 'em_contato' : 'orcamento_enviado';
                          const statusLabels: Record<string, string> = {
                            novo: 'Novo',
                            em_contato: 'Visita',
                            orcamento_enviado: 'Orçamento Enviado',
                            aguardando_resposta: 'Negociando',
                            fechado: 'Fechado',
            perdido: 'Perdido',
            fornecedor: 'Fornecedor',
            cliente_retorno: 'Cliente Retorno',
          };
                          
                          const { error } = await supabase
                            .from('campaign_leads')
                            .update({ status: newStatus })
                            .eq('id', linkedLead.id);
                          
                          if (error) {
                            toast({
                              title: "Erro ao atualizar status",
                              description: error.message,
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          // Add history entry
                          await supabase.from('lead_history').insert({
                            lead_id: linkedLead.id,
                            user_id: userId,
                            user_name: currentUserName || 'Usuário',
                            action: 'Alteração de status',
                            old_value: statusLabels[linkedLead.status] || linkedLead.status,
                            new_value: statusLabels[newStatus],
                          });
                          
                          // Update local state
                          setLinkedLead(prev => prev ? { ...prev, status: newStatus as any } : null);
                          
                          toast({
                            title: isCurrentlyOE ? "Orçamento desmarcado" : "Orçamento marcado",
                            description: isCurrentlyOE ? "Status alterado para 'Visita'" : "Status alterado para 'Orçamento Enviado'",
                          });
                        }}
                        title={!linkedLead ? "Vincule um lead primeiro" : (linkedLead.status === 'orcamento_enviado' ? "Desmarcar Orçamento Enviado" : "Marcar como Orçamento Enviado")}
                      >
                        <FileCheck className={cn(
                          "w-4 h-4",
                          !linkedLead ? "text-muted-foreground/50" : (linkedLead.status === 'orcamento_enviado' ? "text-purple-600" : "text-muted-foreground")
                        )} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleScheduledVisit(selectedConversation)}
                        title={selectedConversation.has_scheduled_visit ? "Desmarcar visita" : "Marcar visita agendada"}
                      >
                        <CalendarCheck className={cn(
                          "w-4 h-4",
                          selectedConversation.has_scheduled_visit ? "text-blue-600" : "text-muted-foreground"
                        )} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleFreelancer(selectedConversation)}
                        title={selectedConversation.is_freelancer ? "Desmarcar como Freelancer" : "Marcar como Freelancer"}
                      >
                        <Briefcase className={cn(
                          "w-4 h-4",
                          selectedConversation.is_freelancer ? "text-orange-600" : "text-muted-foreground"
                        )} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleEquipe(selectedConversation)}
                        title={selectedConversation.is_equipe ? "Desmarcar como Equipe" : "Marcar como Equipe"}
                      >
                        <Users className={cn(
                          "w-4 h-4",
                          selectedConversation.is_equipe ? "text-cyan-600" : "text-muted-foreground"
                        )} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleFavorite(selectedConversation)}
                      >
                        {selectedConversation.is_favorite ? (
                          <Star className="w-4 h-4 text-secondary fill-secondary" />
                        ) : (
                          <Star className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={openMessageSearch}
                        title="Buscar nas mensagens"
                      >
                        <Search className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleConversationClosed(selectedConversation)}
                        title={selectedConversation.is_closed ? "Reabrir conversa" : "Encerrar conversa"}
                      >
                        <X className={cn(
                          "w-4 h-4",
                          selectedConversation.is_closed 
                            ? "text-destructive" 
                            : "text-muted-foreground"
                        )} />
                      </Button>
                    </div>
                  </div>

                  {/* Message Search Bar - Desktop */}
                  {messageSearchActive && (
                    <div className="px-3 py-2 border-b border-border/40 bg-muted/30 flex items-center gap-2 shrink-0">
                      <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Input
                        ref={messageSearchInputRef}
                        placeholder="Buscar nas mensagens..."
                        value={messageSearchQuery}
                        onChange={(e) => setMessageSearchQuery(e.target.value)}
                        className="h-8 text-sm bg-background/80 border-border/60"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') navigateSearchResult(e.shiftKey ? 'prev' : 'next');
                          if (e.key === 'Escape') closeMessageSearch();
                        }}
                      />
                      {messageSearchResults.length > 0 && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {currentSearchIndex + 1}/{messageSearchResults.length}
                        </span>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => navigateSearchResult('prev')} disabled={messageSearchResults.length === 0}>
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => navigateSearchResult('next')} disabled={messageSearchResults.length === 0}>
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={closeMessageSearch}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}


                  {/* Lead Classification Panel - Always visible */}
                  <div className="border-b border-border/40 bg-muted/30 px-3 py-2 shrink-0 overflow-hidden">
                    {linkedLead ? (
                      // Show classification stepper when lead is linked
                      <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin py-1.5">
                        {[
                          { value: 'novo', label: 'Novo', color: 'bg-blue-500', textColor: 'text-blue-700', bgActive: 'bg-blue-500/15' },
                          { value: 'trabalhe_conosco', label: 'Trab. Conosco', color: 'bg-teal-500', textColor: 'text-teal-700', bgActive: 'bg-teal-500/15' },
                          { value: 'em_contato', label: 'Visita', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgActive: 'bg-yellow-500/15' },
                          { value: 'orcamento_enviado', label: 'Orçamento', color: 'bg-purple-500', textColor: 'text-purple-700', bgActive: 'bg-purple-500/15' },
                          { value: 'aguardando_resposta', label: 'Negociando', color: 'bg-orange-500', textColor: 'text-orange-700', bgActive: 'bg-orange-500/15' },
                          { value: 'fechado', label: 'Fechado', color: 'bg-green-500', textColor: 'text-green-700', bgActive: 'bg-green-500/15' },
                          { value: 'perdido', label: 'Perdido', color: 'bg-red-500', textColor: 'text-red-700', bgActive: 'bg-red-500/15' },
                          { value: 'transferido', label: 'Transf.', color: 'bg-cyan-500', textColor: 'text-cyan-700', bgActive: 'bg-cyan-500/15' },
                          { value: 'fornecedor', label: 'Fornec.', color: 'bg-indigo-500', textColor: 'text-indigo-700', bgActive: 'bg-indigo-500/15' },
                          { value: 'cliente_retorno', label: 'Retorno', color: 'bg-pink-500', textColor: 'text-pink-700', bgActive: 'bg-pink-500/15' },
                          { value: 'outros', label: 'Outros', color: 'bg-gray-500', textColor: 'text-gray-700', bgActive: 'bg-gray-500/15' },
                        ].map((statusOption, index, arr) => {
                          const isActive = linkedLead.status === statusOption.value;
                          return (
                            <div key={statusOption.value} className="flex items-center shrink-0">
                              <button
                                className={cn(
                                  "flex items-center gap-1 px-2 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200",
                                  isActive
                                    ? cn(statusOption.bgActive, statusOption.textColor, "ring-1 ring-current/30 shadow-sm")
                                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                )}
                                onClick={async () => {
                                  const oldStatus = linkedLead.status;
                  const newStatus = statusOption.value as "novo" | "em_contato" | "orcamento_enviado" | "aguardando_resposta" | "fechado" | "perdido" | "trabalhe_conosco" | "transferido" | "fornecedor" | "cliente_retorno" | "outros";

                                  if (oldStatus === newStatus) return;
                                  
                                  const { error } = await supabase
                                    .from('campaign_leads')
                                    .update({ status: newStatus })
                                    .eq('id', linkedLead.id);
                                  
                                  if (error) {
                                    toast({
                                      title: "Erro ao atualizar",
                                      description: error.message,
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  
                                  const statusLabels: Record<string, string> = {
                                    novo: 'Novo',
                                    em_contato: 'Visita',
                                    orcamento_enviado: 'Orçamento Enviado',
                                    aguardando_resposta: 'Negociando',
                                    fechado: 'Fechado',
                                    perdido: 'Perdido',
                                    transferido: 'Transferência',
                                    fornecedor: 'Fornecedor',
                                    cliente_retorno: 'Cliente Retorno',
                                    outros: 'Outros',
                                  };
                                  
                                  await supabase.from('lead_history').insert({
                                    lead_id: linkedLead.id,
                                    action: 'status_change',
                                    old_value: statusLabels[oldStatus] || oldStatus,
                                    new_value: statusLabels[newStatus] || newStatus,
                                    user_id: userId,
                                  });
                                  
                                  setLinkedLead({ ...linkedLead, status: statusOption.value });
                                  toast({
                                    title: "Status atualizado",
                                    description: `Lead classificado como "${statusOption.label}"`,
                                  });
                                }}
                              >
                                <div className={cn(
                                  "w-2 h-2 rounded-full transition-all",
                                  isActive ? statusOption.color : "bg-muted-foreground/30"
                                )} />
                                {statusOption.label}
                              </button>
                              {index < arr.length - 1 && (
                                <div className="w-2 h-px bg-border mx-0.5" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // Show classification buttons directly - no lead linked yet
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-destructive shrink-0">⚠ Não qualificado:</span>
                        {[
                          { value: 'novo', label: 'Novo', color: 'bg-blue-500' },
                          { value: 'trabalhe_conosco', label: 'Trab. Conosco', color: 'bg-teal-500' },
                          { value: 'em_contato', label: 'Visita', color: 'bg-yellow-500' },
                          { value: 'orcamento_enviado', label: 'Orçamento', color: 'bg-purple-500' },
                          { value: 'aguardando_resposta', label: 'Negociando', color: 'bg-orange-500' },
                          { value: 'fechado', label: 'Fechado', color: 'bg-green-500' },
                          { value: 'perdido', label: 'Perdido', color: 'bg-red-500' },
                          { value: 'transferido', label: 'Transferência', color: 'bg-cyan-500' },
                          { value: 'fornecedor', label: 'Fornecedor', color: 'bg-indigo-500' },
                          { value: 'cliente_retorno', label: 'Cliente Retorno', color: 'bg-pink-500' },
                          { value: 'outros', label: 'Outros', color: 'bg-gray-500' },
                        ].map((statusOption) => (
                          <Button
                            key={statusOption.value}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1.5"
                            disabled={isCreatingLead}
                            onClick={() => createAndClassifyLead(statusOption.value)}
                          >
                            {isCreatingLead ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <div className={cn("w-2 h-2 rounded-full", statusOption.color)} />
                            )}
                            {statusOption.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pinned message banner - desktop */}
                  {selectedConversation?.pinned_message_id && (() => {
                    const pinnedMsg = messages.find(m => m.id === selectedConversation.pinned_message_id);
                    if (!pinnedMsg) return null;
                    return (
                      <div className="flex items-center gap-2 px-4 py-2 bg-accent/50 border-b text-sm cursor-pointer hover:bg-accent/70 transition-colors" onClick={() => {
                        const el = document.getElementById(`msg-${pinnedMsg.id}`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}>
                        <Pin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate text-muted-foreground">{pinnedMsg.content || `[${pinnedMsg.message_type}]`}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto shrink-0" onClick={(e) => { e.stopPropagation(); handlePinMessage(pinnedMsg); }}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })()}
                  {/* Messages */}
                  <div className="flex-1 relative min-h-0">
                    <ScrollArea ref={scrollAreaDesktopRef} className="h-full bg-muted/30">
                      <div className="space-y-2 sm:space-y-3 p-3 sm:p-4">
                        {/* Loading indicator at top */}
                        {isLoadingMoreMessages && (
                          <div className="flex justify-center py-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Carregando mensagens...
                            </div>
                          </div>
                        )}
                        
                        {/* Start of conversation indicator - only show when user has scrolled to top and there are no more messages */}
                        {!hasMoreMessages && messages.length > 0 && !isLoadingMessages && hasUserScrolledToTop && (
                          <div className="flex justify-center py-2">
                            <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                              📬 Início da conversa
                            </span>
                          </div>
                        )}
                        
                        {isLoadingMessages ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Loader2 className="w-8 h-8 text-muted-foreground mb-3 animate-spin" />
                            <p className="text-sm text-muted-foreground">
                              Carregando mensagens...
                            </p>
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <MessageSquare className="w-10 h-10 text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground">
                              Nenhuma mensagem ainda
                            </p>
                          </div>
                        ) : (
                          messages.map((msg, idx) => {
                            const showDateSep = idx === 0 || getDateKey(msg.timestamp) !== getDateKey(messages[idx - 1].timestamp);
                            return (
                            <div key={msg.id} id={`msg-${msg.id}`} className={cn(
                              messageSearchResults.includes(msg.id) && "ring-2 ring-primary/50 rounded-xl",
                              messageSearchResults[currentSearchIndex] === msg.id && "ring-2 ring-primary bg-primary/5 rounded-xl"
                            )}>
                            {showDateSep && (
                              <div className="flex justify-center my-3">
                                <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-md shadow-sm font-medium">
                                  {formatDateSeparator(msg.timestamp)}
                                </span>
                              </div>
                            )}
                            <div
                              className={cn(
                                "flex group",
                                msg.from_me ? "justify-end" : "justify-start"
                              )}
                            >
                              <div className={cn("relative w-full", msg.from_me ? "flex flex-row-reverse items-start gap-1" : "flex items-start gap-1")}>
                                <div
                                  className={cn(
                                    "max-w-[85%] sm:max-w-[75%] rounded-2xl text-sm",
                                    msg.from_me
                                      ? "bg-primary text-primary-foreground shadow-sm"
                                      : "bg-card border border-border/50 shadow-subtle",
                                    (msg.message_type === 'image' || msg.message_type === 'video')
                                      ? "p-0 overflow-hidden"
                                      : "px-3.5 py-2.5"
                                  )}
                                >
{(msg.message_type === 'image' || msg.message_type === 'video' || msg.message_type === 'audio' || msg.message_type === 'document') && (
                                  <div className={(msg.message_type === 'image' || msg.message_type === 'video') ? "" : "mb-2"}>
                                    <MediaMessage
                                      messageId={msg.message_id}
                                      mediaType={msg.message_type as 'image' | 'video' | 'audio' | 'document'}
                                      mediaUrl={msg.media_url}
                                      content={msg.content}
                                      fromMe={msg.from_me}
                                      instanceId={selectedInstance?.instance_id}
                                      onMediaUrlUpdate={(url) => {
                                        setMessages(prev => prev.map(m => 
                                          m.id === msg.id ? { ...m, media_url: url } : m
                                        ));
                                      }}
                                    />
                                  </div>
                                )}
                                {msg.message_type === 'contact' && (
                                  <div className={cn(
                                    "flex items-center gap-3 p-2 rounded-lg border min-w-[180px]",
                                    msg.from_me
                                      ? "border-primary-foreground/20 bg-primary-foreground/10"
                                      : "border-border bg-muted/30"
                                  )}>
                                    <div className={cn(
                                      "p-2 rounded-full",
                                      msg.from_me ? "bg-primary-foreground/20" : "bg-primary/10"
                                    )}>
                                      <Users className={cn("w-4 h-4", msg.from_me ? "text-primary-foreground" : "text-primary")} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={cn("text-sm font-medium truncate", msg.from_me ? "text-primary-foreground" : "text-foreground")}>
                                        {msg.content?.replace('[Contato] ', '').split(' - ')[0] || 'Contato'}
                                      </p>
                                      <p className={cn("text-xs truncate", msg.from_me ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                        {msg.content?.split(' - ')[1] || ''}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                {/* Quoted message reference */}
                                {msg.quoted_message_id && (() => {
                                  const quoted = messages.find(m => m.id === msg.quoted_message_id);
                                  if (!quoted) return null;
                                  return (
                                    <div 
                                      className={cn(
                                        "px-3 py-1.5 mb-1 rounded border-l-2 cursor-pointer text-xs",
                                        msg.from_me ? "bg-primary/20 border-primary-foreground/40" : "bg-muted border-primary"
                                      )}
                                      onClick={() => {
                                        const el = document.getElementById(`msg-${quoted.id}`);
                                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      }}
                                    >
                                      <p className={cn("font-medium", msg.from_me ? "text-primary-foreground/80" : "text-primary")}>
                                        {quoted.from_me ? 'Você' : (selectedConversation?.contact_name || 'Contato')}
                                      </p>
                                      <p className={cn("truncate", msg.from_me ? "text-primary-foreground/60" : "text-muted-foreground")}>
                                        {quoted.content || `[${quoted.message_type}]`}
                                      </p>
                                    </div>
                                  );
                                })()}
                                {/* Star indicator */}
                                {msg.is_starred && (
                                  <Star className={cn("w-3 h-3 mb-0.5", msg.from_me ? "text-primary-foreground/60" : "text-yellow-500")} />
                                )}
                                {msg.message_type === 'text' && editingMessageId === msg.id ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={editingContent}
                                      onChange={(e) => setEditingContent(e.target.value)}
                                      className="min-h-[40px] text-sm bg-background text-foreground"
                                      rows={2}
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          handleSaveEdit(msg.id, msg.message_id);
                                        }
                                        if (e.key === 'Escape') {
                                          setEditingMessageId(null);
                                          setEditingContent("");
                                        }
                                      }}
                                    />
                                    <div className="flex gap-1 justify-end">
                                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setEditingMessageId(null); setEditingContent(""); }}>
                                        Cancelar
                                      </Button>
                                      <Button size="sm" className="h-6 text-xs" onClick={() => handleSaveEdit(msg.id, msg.message_id)} disabled={isSavingEdit}>
                                        {isSavingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
                                      </Button>
                                    </div>
                                  </div>
                                ) : msg.message_type === 'text' ? (
                                  <>
                                    <p className="whitespace-pre-wrap break-words">{formatMessageContent(msg.content)}</p>
                                    {extractFirstUrl(msg.content) && (
                                      <LinkPreviewCard url={extractFirstUrl(msg.content)!} fromMe={msg.from_me} />
                                    )}
                                  </>
                                ) : null}
                                {msg.message_type !== 'text' && msg.content && msg.content !== '[Imagem]' && msg.content !== '[Áudio]' && (
                                  <p className={cn("whitespace-pre-wrap break-words mt-1", (msg.message_type === 'image' || msg.message_type === 'video') && "px-2")}>{formatMessageContent(msg.content)}</p>
                                )}
                                <div className={cn(
                                  "flex items-center gap-1 mt-1",
                                  msg.from_me ? "justify-end" : "justify-start",
                                  (msg.message_type === 'image' || msg.message_type === 'video') && "px-2 pb-1"
                                )}>
                                  <span className={cn(
                                    "text-[10px]",
                                    msg.from_me ? "text-primary-foreground/70" : "text-muted-foreground"
                                  )}>
                                    {formatMessageTime(msg.timestamp)}
                                  </span>
                                  {msg.from_me && getStatusIcon(msg.status)}
                                </div>
                                </div>
                                {/* Context menu for all messages */}
                                {editingMessageId !== msg.id && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                      >
                                        <ChevronDown className="w-3 h-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align={msg.from_me ? "end" : "start"}>
                                      {/* Emoji reaction row */}
                                      {msg.message_id && (
                                        <>
                                          <div className="flex items-center gap-1 px-2 py-1.5">
                                            {REACTION_EMOJIS.map(emoji => (
                                              <button
                                                key={emoji}
                                                className="text-lg hover:scale-125 transition-transform p-0.5 rounded hover:bg-accent"
                                                onClick={() => handleReaction(msg, emoji)}
                                              >
                                                {emoji}
                                              </button>
                                            ))}
                                          </div>
                                          <DropdownMenuSeparator />
                                        </>
                                      )}
                                      <DropdownMenuItem onClick={() => {
                                        setReplyingTo(msg);
                                        messageTextareaRef.current?.focus();
                                      }}>
                                        <Reply className="w-4 h-4 mr-2" />
                                        Responder
                                      </DropdownMenuItem>
                                      {msg.content && (
                                        <DropdownMenuItem onClick={() => {
                                          navigator.clipboard.writeText(msg.content!);
                                          toast({ title: "Copiado!" });
                                        }}>
                                          <Copy className="w-4 h-4 mr-2" />
                                          Copiar
                                        </DropdownMenuItem>
                                      )}
                                      {isMessageEditable(msg) && (
                                        <DropdownMenuItem onClick={() => {
                                          setEditingMessageId(msg.id);
                                          setEditingContent(msg.content || "");
                                        }}>
                                          <Pencil className="w-4 h-4 mr-2" />
                                          Editar
                                        </DropdownMenuItem>
                                      )}
                                      {msg.media_url && (
                                        <DropdownMenuItem onClick={() => window.open(msg.media_url!, '_blank')}>
                                          <Download className="w-4 h-4 mr-2" />
                                          Baixar
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => handlePinMessage(msg)}>
                                        {selectedConversation?.pinned_message_id === msg.id ? (
                                          <><PinOff className="w-4 h-4 mr-2" />Desafixar</>
                                        ) : (
                                          <><Pin className="w-4 h-4 mr-2" />Fixar</>
                                        )}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleStarMessage(msg)}>
                                        {msg.is_starred ? (
                                          <><StarOff className="w-4 h-4 mr-2" />Desfavoritar</>
                                        ) : (
                                          <><Star className="w-4 h-4 mr-2" />Favoritar</>
                                        )}
                                      </DropdownMenuItem>
                                      {msg.from_me && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteMessageId(msg.id)}>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Apagar
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                              {msg.metadata?.source === 'auto_reminder' && (
                                <div className={cn(
                                  "flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground/70",
                                  msg.from_me ? "justify-end mr-1" : "justify-start ml-1"
                                )}>
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>
                                    {msg.metadata.type === 'next_step_reminder' ? 'Lembrete automático' :
                                     msg.metadata.type === 'follow_up_1' ? 'Follow-up automático' :
                                     msg.metadata.type === 'follow_up_2' ? '2º follow-up automático' :
                                     msg.metadata.type === 'bot_inactive' ? 'Reenvio por inatividade' :
                                     'Enviado automaticamente'}
                                  </span>
                                </div>
                              )}
                            </div>
                            </div>
                            );
                          })

                        )}
                        <div ref={bottomRefDesktop} style={{ height: 1 }} />
                      </div>
                    </ScrollArea>
                    {/* Scroll to bottom button - only show when not at bottom */}
                    {!isAtBottom && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute bottom-4 right-4 h-10 w-10 rounded-full shadow-lg opacity-90 hover:opacity-100 z-10"
                        onClick={() => scrollToBottomDesktop()}
                        title="Ir para última mensagem"
                      >
                        <ArrowDown className="w-5 h-5" />
                        {unreadNewMessagesCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                            {unreadNewMessagesCount > 99 ? '99+' : unreadNewMessagesCount}
                          </span>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="px-4 py-3 border-t border-border/40 shrink-0 bg-card">
                    {/* Reply preview bar */}
                    {replyingTo && (
                      <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded-lg border-l-4 border-primary">
                        <Reply className="w-4 h-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-primary">{replyingTo.from_me ? 'Você' : (selectedConversation?.contact_name || 'Contato')}</p>
                          <p className="text-xs text-muted-foreground truncate">{replyingTo.content || `[${replyingTo.message_type}]`}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setReplyingTo(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    {isRecording || audioBlob ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-3 bg-muted rounded-lg px-4 py-2">
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            isRecording && !isPaused ? "bg-destructive animate-pulse" : "bg-muted-foreground"
                          )} />
                          <span className="font-mono text-lg">
                            {formatRecordingTime(recordingTime)}
                          </span>
                          {audioBlob && (
                            <span className="text-sm text-muted-foreground">
                              Gravação pronta
                            </span>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={cancelRecording}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        {isRecording && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={isPaused ? resumeRecording : pauseRecording}
                          >
                            {isPaused ? (
                              <Play className="w-4 h-4" />
                            ) : (
                              <Pause className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        {isRecording ? (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="shrink-0"
                            onClick={stopRecording}
                          >
                            <Square className="w-4 h-4" />
                          </Button>
                        ) : audioBlob ? (
                          <Button
                            type="button"
                            size="icon"
                            className="shrink-0"
                            onClick={sendRecordedAudio}
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendMessage();
                        }}
                        className="flex gap-2 items-end"
                      >
                        {templates.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon"
                                className="shrink-0 h-9 w-9"
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-64">
                              <DropdownMenuLabel>Templates Rápidos</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {templates.map((template) => (
                                <DropdownMenuItem 
                                  key={template.id}
                                  onClick={() => applyTemplate(template)}
                                >
                                  <span className="truncate">{template.name}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {canSendMaterials && selectedInstance?.unit && (
                          <SalesMaterialsMenu
                            unit={selectedInstance.unit}
                            lead={linkedLead}
                            onSendMedia={sendMaterialByUrl}
                            onSendTextMessage={sendTextMessageDirect}
                            disabled={isSending}
                          />
                        )}
                        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                          <PopoverTrigger asChild>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon"
                              className="shrink-0 h-9 w-9"
                            >
                              <Smile className="w-4 h-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-2 max-h-64 overflow-y-auto" align="start">
                            <div className="space-y-2">
                              {Object.entries(emojiCategories).map(([category, emojis]) => (
                                <div key={category}>
                                  <p className="text-xs font-medium text-muted-foreground mb-1 px-1">{category}</p>
                                  <div className="grid grid-cols-8 gap-0.5">
                                    {emojis.map((emoji, idx) => (
                                      <button
                                        key={`${emoji}-${idx}`}
                                        type="button"
                                        onClick={() => insertEmoji(emoji)}
                                        className="text-lg p-1 hover:bg-muted rounded transition-colors"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon"
                              className="shrink-0 h-9 w-9"
                            >
                              <Paperclip className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                              <ImageIcon className="w-4 h-4 mr-2" />
                              Imagem
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
                              <Video className="w-4 h-4 mr-2" />
                              Vídeo
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => audioInputRef.current?.click()}>
                              <Mic className="w-4 h-4 mr-2" />
                              Arquivo de Áudio
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                              <FileText className="w-4 h-4 mr-2" />
                              Arquivo
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setShowContactDialog(true)}>
                              <Users className="w-4 h-4 mr-2" />
                              Contato
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Textarea
                          ref={messageTextareaRef}
                          placeholder="Digite uma mensagem..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          disabled={!canSendMessages}
                          className="text-base sm:text-sm flex-1 min-h-[40px] max-h-32 resize-y py-2.5 rounded-xl border-border/50 bg-muted/30 focus:bg-background"
                          rows={1}
                          spellCheck={true}
                        />
                        {newMessage.trim() ? (
                          <Button 
                            type="submit" 
                            size="icon" 
                            disabled={isSending || !canSendMessages}
                            className="shrink-0"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="shrink-0"
                            onClick={canSendAudio ? startRecording : undefined}
                            disabled={!canSendAudio}
                          >
                            <Mic className="w-4 h-4" />
                          </Button>
                        )}
                      </form>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-muted/20">
                  <div className="bg-muted/50 rounded-full p-4 mb-4">
                    <MessageSquare className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">Selecione uma conversa</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Escolha uma conversa na lista ao lado para começar a enviar mensagens.
                  </p>
                </div>
              )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>

          {/* Mobile: Show chat when conversation is selected */}
          <div className={cn(
            "w-full flex flex-col overflow-hidden md:hidden",
            !selectedConversation && "hidden"
          )}>
            {selectedConversation && (
              <>
                <div className="border-b shrink-0">
                  {/* Row 1: Back + Avatar + Name + Info + Close */}
                  <div className="p-3 pb-1 flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setSelectedConversation(null)}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage 
                        src={selectedConversation.contact_picture || undefined} 
                        alt={selectedConversation.contact_name || selectedConversation.contact_phone}
                        referrerPolicy="no-referrer"
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {(selectedConversation.contact_name || selectedConversation.contact_phone)
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight">
                        {selectedConversation.contact_name || selectedConversation.contact_phone}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedConversation.contact_phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <LeadInfoPopover
                        linkedLead={linkedLead}
                        selectedConversation={selectedConversation}
                        selectedInstance={selectedInstance}
                        canTransferLeads={canTransferLeads}
                        canDeleteFromChat={canDeleteFromChat}
                        isCreatingLead={isCreatingLead}
                        userId={userId}
                        currentUserName={currentUserName}
                        onShowTransferDialog={() => setShowTransferDialog(true)}
                        onShowDeleteDialog={() => setShowDeleteConfirmDialog(true)}
                        onShowShareToGroupDialog={() => canShareToGroup && linkedLead && setShowShareToGroupDialog(true)}
                        onCreateAndClassifyLead={createAndClassifyLead}
                        onToggleConversationBot={toggleConversationBot}
                        onReactivateBot={reactivateBot}
                        onToggleFavorite={toggleFavorite}
                        onLeadNameChange={(newName) => {
                          setLinkedLead(prev => prev ? { ...prev, name: newName } : null);
                          setSelectedConversation(prev => prev ? { ...prev, contact_name: newName } : null);
                          setConversations(prevConvs => prevConvs.map(c => 
                            c.id === selectedConversation.id ? { ...c, contact_name: newName } : c
                          ));
                        }}
                        onLeadObsChange={(newObs) => {
                          setLinkedLead(prev => prev ? { ...prev, observacoes: newObs || null } : null);
                        }}
                        mobile
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleConversationClosed(selectedConversation)}
                        title={selectedConversation.is_closed ? "Reabrir conversa" : "Encerrar conversa"}
                      >
                        <X className={cn(
                          "w-4 h-4",
                          selectedConversation.is_closed 
                            ? "text-destructive" 
                            : "text-muted-foreground"
                        )} />
                      </Button>
                    </div>
                  </div>
                  {/* Row 2: Action icons */}
                  <div className="px-3 pb-2 flex items-center gap-1 overflow-x-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      disabled={!linkedLead}
                      onClick={async () => {
                        if (!linkedLead) return;
                        const isCurrentlyOE = linkedLead.status === 'orcamento_enviado';
                        const newStatus = isCurrentlyOE ? 'em_contato' : 'orcamento_enviado';
                        const statusLabels: Record<string, string> = {
                          novo: 'Novo',
                          em_contato: 'Visita',
                          orcamento_enviado: 'Orçamento Enviado',
                          aguardando_resposta: 'Negociando',
                          fechado: 'Fechado',
                          perdido: 'Perdido',
                        };
                        
                        const { error } = await supabase
                          .from('campaign_leads')
                          .update({ status: newStatus })
                          .eq('id', linkedLead.id);
                        
                        if (error) {
                          toast({
                            title: "Erro ao atualizar status",
                            description: error.message,
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        await supabase.from('lead_history').insert({
                          lead_id: linkedLead.id,
                          user_id: userId,
                          user_name: currentUserName || 'Usuário',
                          action: 'Alteração de status',
                          old_value: statusLabels[linkedLead.status] || linkedLead.status,
                          new_value: statusLabels[newStatus],
                        });
                        
                        setLinkedLead(prev => prev ? { ...prev, status: newStatus as any } : null);
                        
                        toast({
                          title: isCurrentlyOE ? "Orçamento desmarcado" : "Orçamento marcado",
                          description: isCurrentlyOE ? "Status alterado para 'Em Contato'" : "Status alterado para 'Orçamento Enviado'",
                        });
                      }}
                      title={!linkedLead ? "Vincule um lead primeiro" : (linkedLead.status === 'orcamento_enviado' ? "Desmarcar Orçamento Enviado" : "Marcar como Orçamento Enviado")}
                    >
                      <FileCheck className={cn(
                        "w-4 h-4",
                        !linkedLead ? "text-muted-foreground/50" : (linkedLead.status === 'orcamento_enviado' ? "text-purple-600" : "text-muted-foreground")
                      )} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => toggleScheduledVisit(selectedConversation)}
                      title={selectedConversation.has_scheduled_visit ? "Desmarcar visita" : "Marcar visita agendada"}
                    >
                      <CalendarCheck className={cn(
                        "w-4 h-4",
                        selectedConversation.has_scheduled_visit ? "text-blue-600" : "text-muted-foreground"
                      )} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => toggleFreelancer(selectedConversation)}
                      title={selectedConversation.is_freelancer ? "Desmarcar como Freelancer" : "Marcar como Freelancer"}
                    >
                      <Briefcase className={cn(
                        "w-4 h-4",
                        selectedConversation.is_freelancer ? "text-orange-600" : "text-muted-foreground"
                      )} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => toggleEquipe(selectedConversation)}
                      title={selectedConversation.is_equipe ? "Desmarcar como Equipe" : "Marcar como Equipe"}
                    >
                      <Users className={cn(
                        "w-4 h-4",
                        selectedConversation.is_equipe ? "text-cyan-600" : "text-muted-foreground"
                      )} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => toggleFavorite(selectedConversation)}
                    >
                      {selectedConversation.is_favorite ? (
                        <Star className="w-4 h-4 text-secondary fill-secondary" />
                      ) : (
                        <Star className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={openMessageSearch}
                      title="Buscar nas mensagens"
                    >
                      <Search className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>

                {/* Message Search Bar - Mobile */}
                {messageSearchActive && (
                  <div className="px-3 py-2 border-b bg-muted/30 flex items-center gap-2 shrink-0">
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input
                      ref={messageSearchInputRef}
                      placeholder="Buscar nas mensagens..."
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      className="h-8 text-sm bg-background/80 border-border/60"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') navigateSearchResult(e.shiftKey ? 'prev' : 'next');
                        if (e.key === 'Escape') closeMessageSearch();
                      }}
                    />
                    {messageSearchResults.length > 0 && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {currentSearchIndex + 1}/{messageSearchResults.length}
                      </span>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => navigateSearchResult('prev')} disabled={messageSearchResults.length === 0}>
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => navigateSearchResult('next')} disabled={messageSearchResults.length === 0}>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={closeMessageSearch}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Mobile Lead Classification Panel - collapsible */}
                <div className="border-b bg-card/50 shrink-0">
                  <button
                    className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-muted-foreground"
                    onClick={() => setMobileStatusExpanded(prev => !prev)}
                  >
                    <span className="flex items-center gap-1.5">
                      Status:
                      {linkedLead && (
                        <span className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                          linkedLead.status === 'novo' ? 'bg-blue-500/20 text-blue-700' :
                          linkedLead.status === 'trabalhe_conosco' ? 'bg-teal-500/20 text-teal-700' :
                          linkedLead.status === 'em_contato' ? 'bg-yellow-500/20 text-yellow-700' :
                          linkedLead.status === 'orcamento_enviado' ? 'bg-purple-500/20 text-purple-700' :
                          linkedLead.status === 'aguardando_resposta' ? 'bg-orange-500/20 text-orange-700' :
                          linkedLead.status === 'fechado' ? 'bg-green-500/20 text-green-700' :
                          linkedLead.status === 'perdido' ? 'bg-red-500/20 text-red-700' :
                          linkedLead.status === 'transferido' ? 'bg-cyan-500/20 text-cyan-700' :
                          linkedLead.status === 'fornecedor' ? 'bg-indigo-500/20 text-indigo-700' :
                          linkedLead.status === 'cliente_retorno' ? 'bg-pink-500/20 text-pink-700' :
                          'bg-muted text-muted-foreground'
                        )}>
                          {({
                            novo: 'Novo', trabalhe_conosco: 'Trab.', em_contato: 'Visita',
                            orcamento_enviado: 'Orçamento', aguardando_resposta: 'Negoc.',
                            fechado: 'Fechado', perdido: 'Perdido', transferido: 'Transf.', fornecedor: 'Fornec.', cliente_retorno: 'Retorno', outros: 'Outros'
                          } as Record<string, string>)[linkedLead.status] || linkedLead.status}
                        </span>
                      )}
                      {!linkedLead && <span className="text-[10px] text-destructive">⚠ Não qualificado</span>}
                    </span>
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", mobileStatusExpanded && "rotate-180")} />
                  </button>
                  {mobileStatusExpanded && (
                    <div className="px-2 pb-2">
                      {linkedLead ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {[
                            { value: 'novo', label: 'Novo', color: 'bg-blue-500' },
                            { value: 'trabalhe_conosco', label: 'Trab.', color: 'bg-teal-500' },
                            { value: 'em_contato', label: 'Visita', color: 'bg-yellow-500' },
                            { value: 'orcamento_enviado', label: 'Orçamento', color: 'bg-purple-500' },
                            { value: 'aguardando_resposta', label: 'Negoc.', color: 'bg-orange-500' },
                            { value: 'fechado', label: 'Fechado', color: 'bg-green-500' },
                            { value: 'perdido', label: 'Perdido', color: 'bg-red-500' },
                            { value: 'transferido', label: 'Transf.', color: 'bg-cyan-500' },
                            { value: 'fornecedor', label: 'Fornec.', color: 'bg-indigo-500' },
                            { value: 'cliente_retorno', label: 'Retorno', color: 'bg-pink-500' },
                            { value: 'outros', label: 'Outros', color: 'bg-gray-500' },
                          ].map((statusOption) => (
                            <Button
                              key={statusOption.value}
                              variant={linkedLead.status === statusOption.value ? "default" : "outline"}
                              size="sm"
                              className={cn(
                                "h-6 text-[10px] gap-1 px-1.5",
                                linkedLead.status === statusOption.value && "ring-2 ring-offset-1"
                              )}
                              onClick={async () => {
                                const oldStatus = linkedLead.status;
                                const newStatus = statusOption.value as "novo" | "em_contato" | "orcamento_enviado" | "aguardando_resposta" | "fechado" | "perdido" | "trabalhe_conosco" | "transferido" | "fornecedor" | "cliente_retorno" | "outros";
                                
                                if (oldStatus === newStatus) return;
                                
                                const { error } = await supabase
                                  .from('campaign_leads')
                                  .update({ status: newStatus })
                                  .eq('id', linkedLead.id);
                                
                                if (error) {
                                  toast({
                                    title: "Erro ao atualizar",
                                    description: error.message,
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                const statusLabels: Record<string, string> = {
                                  novo: 'Novo',
                                  trabalhe_conosco: 'Trabalhe Conosco',
                                  em_contato: 'Visita',
                                  orcamento_enviado: 'Orçamento Enviado',
                                  aguardando_resposta: 'Negociando',
                                  fechado: 'Fechado',
                                  perdido: 'Perdido',
                                  transferido: 'Transferência',
                                  fornecedor: 'Fornecedor',
                                  cliente_retorno: 'Cliente Retorno',
                                  outros: 'Outros',
                                };
                                
                                await supabase.from('lead_history').insert({
                                  lead_id: linkedLead.id,
                                  action: 'status_change',
                                  old_value: statusLabels[oldStatus] || oldStatus,
                                  new_value: statusLabels[newStatus] || newStatus,
                                  user_id: userId,
                                });
                                
                                setLinkedLead({ ...linkedLead, status: statusOption.value });
                                setMobileStatusExpanded(false);
                                toast({
                                  title: "Status atualizado",
                                  description: `Lead classificado como "${statusOption.label}"`,
                                });
                              }}
                            >
                              <div className={cn("w-1.5 h-1.5 rounded-full", statusOption.color)} />
                              {statusOption.label}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {[
                            { value: 'novo', label: 'Novo', color: 'bg-blue-500' },
                            { value: 'trabalhe_conosco', label: 'Trab.', color: 'bg-teal-500' },
                            { value: 'em_contato', label: 'Visita', color: 'bg-yellow-500' },
                            { value: 'orcamento_enviado', label: 'Orçam.', color: 'bg-purple-500' },
                            { value: 'aguardando_resposta', label: 'Negoc.', color: 'bg-orange-500' },
                            { value: 'fechado', label: 'Fechado', color: 'bg-green-500' },
                            { value: 'perdido', label: 'Perdido', color: 'bg-red-500' },
                            { value: 'transferido', label: 'Transf.', color: 'bg-cyan-500' },
                            { value: 'fornecedor', label: 'Fornec.', color: 'bg-indigo-500' },
                            { value: 'cliente_retorno', label: 'Retorno', color: 'bg-pink-500' },
                            { value: 'outros', label: 'Outros', color: 'bg-gray-500' },
                          ].map((statusOption) => (
                            <Button
                              key={statusOption.value}
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] gap-1 px-1.5"
                              disabled={isCreatingLead}
                              onClick={() => createAndClassifyLead(statusOption.value)}
                            >
                              {isCreatingLead ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <div className={cn("w-1.5 h-1.5 rounded-full", statusOption.color)} />
                              )}
                              {statusOption.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 relative min-h-0">
                  <ScrollArea ref={scrollAreaMobileRef} className="h-full bg-muted/30">
                    <div className="space-y-2 p-3">
                      {/* Loading indicator at top - mobile */}
                      {isLoadingMoreMessages && (
                        <div className="flex justify-center py-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Carregando mensagens...
                          </div>
                        </div>
                      )}
                      
                      {/* Start of conversation indicator - mobile - only show when user has scrolled to top and there are no more messages */}
                      {!hasMoreMessages && messages.length > 0 && !isLoadingMessages && hasUserScrolledToTop && (
                        <div className="flex justify-center py-2">
                          <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                            📬 Início da conversa
                          </span>
                        </div>
                      )}
                      
                      {isLoadingMessages ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Loader2 className="w-8 h-8 text-muted-foreground mb-3 animate-spin" />
                          <p className="text-sm text-muted-foreground">
                            Carregando mensagens...
                          </p>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <MessageSquare className="w-8 h-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Nenhuma mensagem ainda
                          </p>
                        </div>
                      ) : (
                      messages.map((msg, idx) => {
                        const showDateSep = idx === 0 || getDateKey(msg.timestamp) !== getDateKey(messages[idx - 1].timestamp);
                        return (
                        <div key={msg.id} id={`msg-${msg.id}`} className={cn(
                          messageSearchResults.includes(msg.id) && "ring-2 ring-primary/50 rounded-lg",
                          messageSearchResults[currentSearchIndex] === msg.id && "ring-2 ring-primary bg-primary/5 rounded-lg"
                        )}>
                        {showDateSep && (
                          <div className="flex justify-center my-3">
                            <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-md shadow-sm font-medium">
                              {formatDateSeparator(msg.timestamp)}
                            </span>
                          </div>
                        )}
                        <div
                          className={cn(
                            "flex group",
                            msg.from_me ? "justify-end" : "justify-start"
                          )}
                        >
                          <div className={cn("relative w-full", msg.from_me ? "flex flex-row-reverse items-start gap-1" : "flex items-start gap-1")}>
                            <div
                              className={cn(
                                "max-w-[85%] rounded-lg text-sm shadow-sm",
                                msg.from_me
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-card border",
                                (msg.message_type === 'image' || msg.message_type === 'video')
                                  ? "p-0 overflow-hidden"
                                  : "px-3 py-2"
                              )}
                            >
{(msg.message_type === 'image' || msg.message_type === 'video' || msg.message_type === 'audio' || msg.message_type === 'document') && (
                              <div className={(msg.message_type === 'image' || msg.message_type === 'video') ? "" : "mb-2"}>
                                <MediaMessage
                                  messageId={msg.message_id}
                                  mediaType={msg.message_type as 'image' | 'video' | 'audio' | 'document'}
                                  mediaUrl={msg.media_url}
                                  content={msg.content}
                                  fromMe={msg.from_me}
                                  instanceId={selectedInstance?.instance_id}
                                  onMediaUrlUpdate={(url) => {
                                    setMessages(prev => prev.map(m => 
                                      m.id === msg.id ? { ...m, media_url: url } : m
                                    ));
                                  }}
                                />
                              </div>
                            )}
                            {msg.message_type === 'contact' && (
                              <div className={cn(
                                "flex items-center gap-3 p-2 rounded-lg border min-w-[180px]",
                                msg.from_me
                                  ? "border-primary-foreground/20 bg-primary-foreground/10"
                                  : "border-border bg-muted/30"
                              )}>
                                <div className={cn(
                                  "p-2 rounded-full",
                                  msg.from_me ? "bg-primary-foreground/20" : "bg-primary/10"
                                )}>
                                  <Users className={cn("w-4 h-4", msg.from_me ? "text-primary-foreground" : "text-primary")} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={cn("text-sm font-medium truncate", msg.from_me ? "text-primary-foreground" : "text-foreground")}>
                                    {msg.content?.replace('[Contato] ', '').split(' - ')[0] || 'Contato'}
                                  </p>
                                  <p className={cn("text-xs truncate", msg.from_me ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                    {msg.content?.split(' - ')[1] || ''}
                                  </p>
                                </div>
                              </div>
                            )}
                            {/* Quoted message reference - mobile */}
                            {msg.quoted_message_id && (() => {
                              const quoted = messages.find(m => m.id === msg.quoted_message_id);
                              if (!quoted) return null;
                              return (
                                <div 
                                  className={cn(
                                    "px-3 py-1.5 mb-1 rounded border-l-2 cursor-pointer text-xs",
                                    msg.from_me ? "bg-primary/20 border-primary-foreground/40" : "bg-muted border-primary"
                                  )}
                                  onClick={() => {
                                    const el = document.getElementById(`msg-${quoted.id}`);
                                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  }}
                                >
                                  <p className={cn("font-medium", msg.from_me ? "text-primary-foreground/80" : "text-primary")}>
                                    {quoted.from_me ? 'Você' : (selectedConversation?.contact_name || 'Contato')}
                                  </p>
                                  <p className={cn("truncate", msg.from_me ? "text-primary-foreground/60" : "text-muted-foreground")}>
                                    {quoted.content || `[${quoted.message_type}]`}
                                  </p>
                                </div>
                              );
                            })()}
                            {/* Star indicator - mobile */}
                            {msg.is_starred && (
                              <Star className={cn("w-3 h-3 mb-0.5", msg.from_me ? "text-primary-foreground/60" : "text-yellow-500")} />
                            )}
                            {msg.message_type === 'text' && editingMessageId === msg.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  className="min-h-[40px] text-sm bg-background text-foreground"
                                  rows={2}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSaveEdit(msg.id, msg.message_id);
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingMessageId(null);
                                      setEditingContent("");
                                    }
                                  }}
                                />
                                <div className="flex gap-1 justify-end">
                                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setEditingMessageId(null); setEditingContent(""); }}>
                                    Cancelar
                                  </Button>
                                  <Button size="sm" className="h-6 text-xs" onClick={() => handleSaveEdit(msg.id, msg.message_id)} disabled={isSavingEdit}>
                                    {isSavingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
                                  </Button>
                                </div>
                              </div>
                            ) : msg.message_type === 'text' ? (
                              <>
                                <p className="whitespace-pre-wrap break-words">{formatMessageContent(msg.content)}</p>
                                {extractFirstUrl(msg.content) && (
                                  <LinkPreviewCard url={extractFirstUrl(msg.content)!} fromMe={msg.from_me} />
                                )}
                              </>
                            ) : null}
                            <div className={cn(
                              "flex items-center gap-1 mt-1",
                              msg.from_me ? "justify-end" : "justify-start",
                              (msg.message_type === 'image' || msg.message_type === 'video') && "px-2 pb-1"
                            )}>
                              <span className={cn(
                                "text-[10px]",
                                msg.from_me ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}>
                                {formatMessageTime(msg.timestamp)}
                              </span>
                              {msg.from_me && getStatusIcon(msg.status)}
                            </div>
                            </div>
                            {/* Context menu for all messages - mobile */}
                            {editingMessageId !== msg.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity shrink-0"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={msg.from_me ? "end" : "start"}>
                                  {/* Emoji reaction row */}
                                  {msg.message_id && (
                                    <>
                                      <div className="flex items-center gap-1 px-2 py-1.5">
                                        {REACTION_EMOJIS.map(emoji => (
                                          <button
                                            key={emoji}
                                            className="text-lg hover:scale-125 transition-transform p-0.5 rounded hover:bg-accent"
                                            onClick={() => handleReaction(msg, emoji)}
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
                                  <DropdownMenuItem onClick={() => {
                                    setReplyingTo(msg);
                                    messageTextareaRef.current?.focus();
                                  }}>
                                    <Reply className="w-4 h-4 mr-2" />
                                    Responder
                                  </DropdownMenuItem>
                                  {msg.content && (
                                    <DropdownMenuItem onClick={() => {
                                      navigator.clipboard.writeText(msg.content!);
                                      toast({ title: "Copiado!" });
                                    }}>
                                      <Copy className="w-4 h-4 mr-2" />
                                      Copiar
                                    </DropdownMenuItem>
                                  )}
                                  {isMessageEditable(msg) && (
                                    <DropdownMenuItem onClick={() => {
                                      setEditingMessageId(msg.id);
                                      setEditingContent(msg.content || "");
                                    }}>
                                      <Pencil className="w-4 h-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                  )}
                                  {msg.media_url && (
                                    <DropdownMenuItem onClick={() => window.open(msg.media_url!, '_blank')}>
                                      <Download className="w-4 h-4 mr-2" />
                                      Baixar
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handlePinMessage(msg)}>
                                    {selectedConversation?.pinned_message_id === msg.id ? (
                                      <><PinOff className="w-4 h-4 mr-2" />Desafixar</>
                                    ) : (
                                      <><Pin className="w-4 h-4 mr-2" />Fixar</>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStarMessage(msg)}>
                                    {msg.is_starred ? (
                                      <><StarOff className="w-4 h-4 mr-2" />Desfavoritar</>
                                    ) : (
                                      <><Star className="w-4 h-4 mr-2" />Favoritar</>
                                    )}
                                  </DropdownMenuItem>
                                  {msg.from_me && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteMessageId(msg.id)}>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Apagar
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          {msg.metadata?.source === 'auto_reminder' && (
                            <div className={cn(
                              "flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground/70",
                              msg.from_me ? "justify-end mr-1" : "justify-start ml-1"
                            )}>
                              <Clock className="w-2.5 h-2.5" />
                              <span>
                                {msg.metadata.type === 'next_step_reminder' ? 'Lembrete automático' :
                                 msg.metadata.type === 'follow_up_1' ? 'Follow-up automático' :
                                 msg.metadata.type === 'follow_up_2' ? '2º follow-up automático' :
                                 msg.metadata.type === 'bot_inactive' ? 'Reenvio por inatividade' :
                                 'Enviado automaticamente'}
                              </span>
                            </div>
                          )}
                        </div>
                        </div>
                        );
                      })
                      )}
                      <div ref={bottomRefMobile} style={{ height: 1 }} />
                    </div>
                  </ScrollArea>
                  {/* Scroll to bottom button - only show when not at bottom */}
                  {!isAtBottom && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute bottom-4 right-4 h-10 w-10 rounded-full shadow-lg opacity-90 hover:opacity-100 z-10"
                      onClick={() => scrollToBottomMobile()}
                      title="Ir para última mensagem"
                    >
                      <ArrowDown className="w-5 h-5" />
                      {unreadNewMessagesCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                          {unreadNewMessagesCount > 99 ? '99+' : unreadNewMessagesCount}
                        </span>
                      )}
                    </Button>
                  )}
                </div>
                <div className="p-3 border-t shrink-0">
                  {/* Reply preview bar - mobile */}
                  {replyingTo && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded-lg border-l-4 border-primary">
                      <Reply className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-primary">{replyingTo.from_me ? 'Você' : (selectedConversation?.contact_name || 'Contato')}</p>
                        <p className="text-xs text-muted-foreground truncate">{replyingTo.content || `[${replyingTo.message_type}]`}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setReplyingTo(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex gap-2 items-end"
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9">
                          <Paperclip className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Imagem
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
                          <Video className="w-4 h-4 mr-2" />
                          Vídeo
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                          <FileText className="w-4 h-4 mr-2" />
                          Arquivo
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowContactDialog(true)}>
                          <Users className="w-4 h-4 mr-2" />
                          Contato
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {templates.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            className="shrink-0 h-9 w-9"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-64">
                          <DropdownMenuLabel>Templates Rápidos</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {templates.map((template) => (
                            <DropdownMenuItem 
                              key={template.id}
                              onClick={() => applyTemplate(template)}
                            >
                              <span className="truncate">{template.name}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {canSendMaterials && selectedInstance?.unit && (
                      <SalesMaterialsMenu
                        unit={selectedInstance.unit}
                        lead={linkedLead}
                        onSendMedia={sendMaterialByUrl}
                        onSendTextMessage={sendTextMessageDirect}
                        disabled={isSending}
                      />
                    )}
                    <Textarea
                      placeholder="Digite uma mensagem..."
                      value={newMessage}
                      ref={messageTextareaRef}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={!canSendMessages}
                      className="text-base flex-1 min-h-[40px] max-h-[50vh] resize-y py-2"
                      rows={1}
                      spellCheck={true}
                    />
                    {newMessage.trim() ? (
                      <Button type="submit" size="icon" disabled={isSending || !canSendMessages} className="shrink-0">
                        <Send className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="shrink-0"
                        onClick={canSendAudio ? startRecording : undefined}
                        disabled={!canSendAudio}
                      >
                        <Mic className="w-4 h-4" />
                      </Button>
                    )}
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'image')}
      />
      <input
        type="file"
        ref={audioInputRef}
        accept="audio/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'audio')}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'document')}
      />
      <input
        type="file"
        ref={videoInputRef}
        accept="video/mp4,video/3gpp,video/quicktime,video/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'video')}
      />

      {/* Media Preview Dialog */}
      <Dialog open={!!mediaPreview} onOpenChange={(open) => !open && cancelMediaUpload()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mediaPreview?.type === 'image' && 'Enviar imagem'}
              {mediaPreview?.type === 'audio' && 'Enviar áudio'}
              {mediaPreview?.type === 'document' && 'Enviar arquivo'}
              {mediaPreview?.type === 'video' && 'Enviar vídeo'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Preview */}
            {mediaPreview?.type === 'image' && mediaPreview.preview && (
              <div className="flex justify-center">
                <img 
                  src={mediaPreview.preview} 
                  alt="Preview" 
                  className="max-h-64 rounded-lg object-contain"
                />
              </div>
            )}
            {mediaPreview?.type === 'audio' && (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Mic className="w-8 h-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{mediaPreview.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(mediaPreview.file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            )}
            {mediaPreview?.type === 'document' && (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Paperclip className="w-8 h-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{mediaPreview.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(mediaPreview.file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            )}
            {mediaPreview?.type === 'video' && mediaPreview.preview && (
              <div className="flex justify-center">
                <video 
                  src={mediaPreview.preview} 
                  className="max-h-64 rounded-lg object-contain"
                  controls
                />
              </div>
            )}

            {/* Caption for images and videos */}
            {(mediaPreview?.type === 'image' || mediaPreview?.type === 'video') && (
              <Input
                placeholder="Adicionar legenda (opcional)..."
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
              />
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={cancelMediaUpload} disabled={isUploading}>
                Cancelar
              </Button>
              <Button onClick={sendMedia} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Lead Dialog */}
      <AlertDialog open={showTransferDialog} onOpenChange={(open) => {
        setShowTransferDialog(open);
        if (!open) {
          setSelectedTransferUserId("");
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" />
              Transferir Lead
            </AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o usuário que receberá o lead "{linkedLead?.name}". O usuário será notificado sobre a transferência.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-3">
            <Label>Transferir para:</Label>
            <Select value={selectedTransferUserId} onValueChange={setSelectedTransferUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário..." />
              </SelectTrigger>
              <SelectContent>
                {responsaveis
                  .filter(r => r.user_id !== userId && r.user_id !== linkedLead?.responsavel_id)
                  .length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhum usuário disponível
                  </SelectItem>
                ) : (
                  responsaveis
                    .filter(r => r.user_id !== userId && r.user_id !== linkedLead?.responsavel_id)
                    .map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.full_name}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTransferring}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransferLead}
              disabled={!selectedTransferUserId || isTransferring}
            >
              {isTransferring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Transferindo...
                </>
              ) : (
                "Transferir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              {linkedLead ? "Excluir Lead e Conversa" : "Excluir Conversa"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {linkedLead ? (
                <>
                  Esta ação é <strong>permanente e irreversível</strong>. Serão excluídos:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>O lead <strong>{linkedLead.name}</strong></li>
                    <li>Todo o histórico de alterações do lead</li>
                    <li>Todas as mensagens da conversa</li>
                    <li>A conversa do WhatsApp</li>
                  </ul>
                </>
              ) : (
                <>
                  Esta ação é <strong>permanente e irreversível</strong>. Serão excluídos:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Todas as mensagens da conversa</li>
                    <li>A conversa do WhatsApp</li>
                  </ul>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLeadFromChat}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Permanentemente
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share to Group Dialog */}
      {linkedLead && (
        <ShareToGroupDialog
          open={showShareToGroupDialog}
          onOpenChange={setShowShareToGroupDialog}
          lead={linkedLead}
          groups={conversations.filter(c => c.remote_jid?.endsWith('@g.us')).map(c => ({
            id: c.id,
            remote_jid: c.remote_jid,
            contact_name: c.contact_name,
            instance_id: c.instance_id,
          }))}
          instances={instances}
        />
      )}

      {/* Send Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={(open) => {
        setShowContactDialog(open);
        if (!open) { setContactName(""); setContactPhone(""); }
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Enviar Contato
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Nome</Label>
              <Input
                id="contact-name"
                placeholder="Nome do contato"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Telefone</Label>
              <Input
                id="contact-phone"
                placeholder="5511999999999"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleSendContact}
              disabled={!contactName.trim() || !contactPhone.trim() || isSendingContact}
            >
              {isSendingContact ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Contato
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete message confirmation */}
      <AlertDialog open={!!deleteMessageId} onOpenChange={(open) => !open && setDeleteMessageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar mensagem</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar esta mensagem? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMessageId && handleDeleteMessage(deleteMessageId)}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create New Contact Dialog */}
      <Dialog open={showCreateContactDialog} onOpenChange={(open) => {
        setShowCreateContactDialog(open);
        if (!open) { setNewContactName(""); setNewContactPhone(""); }
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Novo Contato
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="new-contact-name">Nome *</Label>
              <Input
                id="new-contact-name"
                placeholder="Nome do contato"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-contact-phone">Telefone (WhatsApp) *</Label>
              <Input
                id="new-contact-phone"
                placeholder="11999999999"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value.replace(/[^\d]/g, ''))}
                inputMode="tel"
              />
              <p className="text-xs text-muted-foreground">Apenas números. O código 55 será adicionado automaticamente.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreateContactDialog(false)} disabled={isCreatingContact}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateContact}
                disabled={newContactName.trim().length < 2 || newContactPhone.replace(/\D/g, '').length < 10 || isCreatingContact}
              >
                {isCreatingContact ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Criar Contato
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
