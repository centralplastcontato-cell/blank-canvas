import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { insertWithCompany, insertSingleWithCompany } from "@/lib/supabase-helpers";
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
  Send, Search, MessageSquare, Check, CheckCheck, Clock, WifiOff, 
  ArrowLeft, Building2, Star, StarOff, Link2, FileText, Smile,
  Image as ImageIcon, Mic, Paperclip, Loader2, Square, X, Pause, Play,
  Users, ArrowRightLeft, Trash2,
  CalendarCheck, Briefcase, FileCheck, ArrowDown, Video
} from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
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
  instance_token: string;
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
}

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
}

interface WhatsAppChatProps {
  userId: string;
  allowedUnits: string[];
  initialPhone?: string | null;
  onPhoneHandled?: () => void;
}

// Component for displaying media with auto-download capability
import { MediaMessage } from "@/components/whatsapp/MediaMessage";
import { ConversationStatusActions } from "@/components/whatsapp/ConversationStatusActions";
import { ConversationFilters, FilterType } from "@/components/whatsapp/ConversationFilters";
import { LeadInfoPopover } from "@/components/whatsapp/LeadInfoPopover";
import { SalesMaterialsMenu } from "@/components/whatsapp/SalesMaterialsMenu";
import { ShareToGroupDialog } from "@/components/whatsapp/ShareToGroupDialog";
import { useFilterOrder } from "@/hooks/useFilterOrder";

export function WhatsAppChat({ userId, allowedUnits, initialPhone, onPhoneHandled }: WhatsAppChatProps) {
  const [instances, setInstances] = useState<WapiInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<WapiInstance | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true); // Assume there are more until proven otherwise
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [oldestMessageTimestamp, setOldestMessageTimestamp] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  
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
  const [closedLeadConversationIds, setClosedLeadConversationIds] = useState<Set<string>>(new Set());
  const [orcamentoEnviadoConversationIds, setOrcamentoEnviadoConversationIds] = useState<Set<string>>(new Set());
  const [conversationLeadsMap, setConversationLeadsMap] = useState<Record<string, Lead | null>>({});
  const scrollAreaDesktopRef = useRef<HTMLDivElement>(null);
  const scrollAreaMobileRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
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
      };

      await supabase.from("notifications").insert({
        user_id: selectedTransferUserId,
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
      // If there's a linked lead, delete its history and the lead itself
      if (linkedLead) {
        // First unlink the conversation from the lead (to avoid FK constraint)
        await supabase
          .from('wapi_conversations')
          .update({ lead_id: null })
          .eq('id', selectedConversation.id);

        // Delete lead history (to avoid foreign key constraint)
        const { error: historyError } = await supabase
          .from('lead_history')
          .delete()
          .eq('lead_id', linkedLead.id);
        
        if (historyError) {
          console.error("[Delete] Error deleting lead history:", historyError);
        }
        
        // Delete the lead
        const { error: leadError } = await supabase
          .from('campaign_leads')
          .delete()
          .eq('id', linkedLead.id);
        
        if (leadError) {
          console.error("[Delete] Error deleting lead:", leadError);
          throw new Error(`Erro ao excluir lead: ${leadError.message}`);
        }
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
        title: linkedLead ? "Lead excluído" : "Conversa excluída",
        description: linkedLead 
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
    const { data } = await supabase
      .from("message_templates")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (data) {
      setTemplates(data as MessageTemplate[]);
    }
  };

  // Track if initialPhone has been processed
  const [initialPhoneProcessed, setInitialPhoneProcessed] = useState(false);

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
              fetchConversations();
            }, 3000);
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

  // Use the robust realtime hook for messages
  useMessagesRealtime({
    conversationId: selectedConversation?.id || null,
    onNewMessage: handleNewRealtimeMessage,
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
    
    if (isNewMessage && messagesLength > 0) {
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
      return;
    }
    
    // Build query based on allowed units
    let query = supabase
      .from("wapi_instances")
      .select("id, instance_id, instance_token, status, unit");

    // Filter by allowed units - if empty, show nothing (user has no unit access)
    if (!allowedUnits.includes('all')) {
      if (allowedUnits.length === 0) {
        console.log('[WhatsAppChat] No allowed units, showing empty');
        setInstances([]);
        setIsLoading(false);
        return;
      }
      query = query.in("unit", allowedUnits);
    }

    const { data, error } = await query.order("unit", { ascending: true });
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
    } else {
      console.warn('[WhatsAppChat] No instances returned from query');
    }
    setIsLoading(false);
  };

  // Background check of real connection status via W-API
  const syncInstanceStatuses = async (instancesToCheck: WapiInstance[]) => {
    for (const instance of instancesToCheck) {
      try {
        const response = await supabase.functions.invoke("wapi-send", {
          body: {
            action: "get-status",
            instanceId: instance.instance_id,
            instanceToken: instance.instance_token,
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

  const fetchConversations = async (selectPhone?: string) => {
    if (!selectedInstance) return;

    // Optimized: Select only necessary columns instead of "*"
    const { data } = await supabase
      .from("wapi_conversations")
      .select("id, instance_id, lead_id, remote_jid, contact_name, contact_phone, contact_picture, last_message_at, unread_count, is_favorite, is_closed, has_scheduled_visit, is_freelancer, is_equipe, last_message_content, last_message_from_me, bot_enabled, bot_step, created_at")
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
        // Fetch all linked leads for the conversation cards
        const { data: allLeads } = await supabase
          .from("campaign_leads")
          .select("id, name, whatsapp, unit, status, month, day_of_month, day_preference, guests, observacoes, created_at, responsavel_id, campaign_name")
          .in("id", leadIds);
        
        if (allLeads) {
          // Create a map of conversation_id -> lead
          const leadsMap: Record<string, Lead | null> = {};
          const closedLeadIds = new Set<string>();
          const oeLeadIds = new Set<string>();
          
          allLeads.forEach((lead) => {
            if (lead.status === 'fechado') closedLeadIds.add(lead.id);
            if (lead.status === 'orcamento_enviado') oeLeadIds.add(lead.id);
          });
          
          // Map leads to conversations
          data.forEach((conv: Conversation) => {
            if (conv.lead_id) {
              const lead = allLeads.find(l => l.id === conv.lead_id);
              leadsMap[conv.id] = lead as Lead || null;
            }
          });
          
          setConversationLeadsMap(leadsMap);
          
          // Set closed lead conversation IDs
          const closedConvIds = new Set(
            data
              .filter((conv: Conversation) => conv.lead_id && closedLeadIds.has(conv.lead_id))
              .map((conv: Conversation) => conv.id)
          );
          setClosedLeadConversationIds(closedConvIds);
          
          // Set O.E lead conversation IDs
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
        } else if (selectedInstance) {
          // No existing conversation - create a new one for this phone number
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

  const MESSAGES_LIMIT = 10; // Reduced further for Cloud credit savings
  
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
        .select("id, conversation_id, message_id, from_me, message_type, content, media_url, status, timestamp")
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
      isLoadingMoreRef.current = false;
      
      if (!loadMore) {
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
      const contactName = selectedConversation.contact_name || selectedConversation.contact_phone;
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
    setNewMessage(""); // Clear immediately for UX
    setIsSending(true);

    // Optimistic update - show message immediately
    const optimisticMessage: Message = {
      id: `optimistic-${Date.now()}`,
      conversation_id: selectedConversation.id,
      message_id: null,
      from_me: true,
      message_type: 'text',
      content: messageToSend,
      media_url: null,
      status: 'pending',
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const response = await supabase.functions.invoke("wapi-send", {
        body: {
          action: "send-text",
          phone: selectedConversation.contact_phone,
          message: messageToSend,
          conversationId: selectedConversation.id,
          instanceId: selectedInstance.instance_id,
          instanceToken: selectedInstance.instance_token,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Update optimistic message to sent status while waiting for realtime
      setMessages(prev => prev.map(m => 
        m.id === optimisticMessage.id ? { ...m, status: 'sent' } : m
      ));
    } catch (error: unknown) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(messageToSend); // Restore message to input
      
      toast({
        title: "Erro ao enviar",
        description: error instanceof Error ? error.message : "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    }

    setIsSending(false);
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
        instanceToken: selectedInstance.instance_token,
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
          instanceToken: selectedInstance.instance_token,
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
            instanceToken: selectedInstance.instance_token,
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
          .createSignedUrl(fileName, 3600); // 1 hour expiry

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
            instanceToken: selectedInstance.instance_token,
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
          .createSignedUrl(fileName, 3600); // 1 hour expiry

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
            instanceToken: selectedInstance.instance_token,
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
          instanceToken: selectedInstance.instance_token,
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
      return 0;
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

  if (instances.length === 0) {
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

  const connectedInstances = instances.filter(i => i.status === 'connected');
  const hasDisconnectedInstances = instances.some(i => i.status !== 'connected');

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
      {/* Header with Unit Tabs - Premium Glassmorphism */}
      <div className="flex items-center justify-between gap-2 mt-3 mb-3 px-1 shrink-0">
        {/* Unit Tabs - only show if multiple instances */}
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
                  disabled={instance.status !== 'connected'}
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Building2 className="w-4 h-4" />
                  {instance.unit}
                  {instance.status !== 'connected' && (
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

      {/* Disconnected warning - Premium styled */}
      {hasDisconnectedInstances && selectedInstance?.status !== 'connected' && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 mb-3 text-sm text-center shrink-0 shadow-sm backdrop-blur-sm">
          <WifiOff className="w-4 h-4 inline mr-2" />
          Esta unidade está desconectada. Selecione outra ou aguarde o administrador.
        </div>
      )}

      {/* Chat Area - Premium Container */}
      {selectedInstance?.status === 'connected' && (
        <div className="flex flex-1 border border-border/60 rounded-xl overflow-hidden bg-gradient-to-br from-card via-card to-muted/20 min-h-0 shadow-lg">
          {/* Mobile: Show full width list or chat */}
          <div className={cn(
            "w-full flex flex-col overflow-hidden md:hidden",
            selectedConversation && "hidden"
          )}>
            <div className="p-3 border-b border-border/60 space-y-2 bg-card/80 backdrop-blur-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background/80 border-border/60 focus:border-primary/50 focus:ring-primary/20"
                />
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
                      "w-full p-2.5 flex items-center gap-2.5 hover:bg-primary/5 transition-all text-left border-b border-border/40 group",
                      selectedConversation?.id === conv.id && "bg-primary/10 border-l-2 border-l-primary",
                      conv.unread_count > 0 && "bg-gradient-to-r from-primary/10 to-transparent"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-10 w-10 ring-2 ring-border/50 shadow-sm">
                        <AvatarImage 
                          src={conv.contact_picture || undefined} 
                          alt={conv.contact_name || conv.contact_phone}
                          referrerPolicy="no-referrer"
                        />
                        <AvatarFallback className={cn(
                          "text-primary text-sm font-semibold bg-gradient-to-br",
                          conv.unread_count > 0 ? "from-primary/30 to-primary/10" : "from-primary/15 to-primary/5"
                        )}>
                          {(conv.contact_name || conv.contact_phone).charAt(0).toUpperCase()}
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
                            {conv.contact_name || conv.contact_phone}
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
              <div className="flex flex-col h-full border-r border-border/60 bg-gradient-to-b from-card to-muted/10">
                <div className="p-3 border-b border-border/60 space-y-2 bg-card/80 backdrop-blur-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar conversa..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-background/80 border-border/60 focus:border-primary/50 focus:ring-primary/20"
                    />
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
                          "w-full p-2.5 flex items-center gap-2.5 hover:bg-primary/5 transition-all text-left border-b border-border/40 group",
                          selectedConversation?.id === conv.id && "bg-primary/10 border-l-2 border-l-primary shadow-sm",
                          conv.unread_count > 0 && "bg-gradient-to-r from-primary/10 to-transparent"
                        )}
                      >
                        <div className="relative shrink-0">
                        <Avatar className="h-10 w-10 ring-2 ring-border/50 shadow-sm">
                          <AvatarImage 
                            src={conv.contact_picture || undefined} 
                            alt={conv.contact_name || conv.contact_phone}
                            referrerPolicy="no-referrer"
                          />
                          <AvatarFallback className={cn(
                            "text-primary text-sm font-semibold bg-gradient-to-br",
                            conv.unread_count > 0 ? "from-primary/30 to-primary/10" : "from-primary/15 to-primary/5"
                          )}>
                            {(conv.contact_name || conv.contact_phone).charAt(0).toUpperCase()}
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
                                {conv.contact_name || conv.contact_phone}
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
            <ResizableHandle withHandle className="bg-border/60 hover:bg-primary/30 transition-colors" />

            {/* Messages Panel */}
            <ResizablePanel defaultSize={65} minSize={40} className="flex flex-col min-h-0 min-w-0 bg-gradient-to-b from-muted/20 to-background">
              {selectedConversation ? (
                <>
                  {/* Chat Header - Premium Glassmorphism */}
                  <div className="p-3 border-b border-border/60 flex items-center gap-2 sm:gap-3 shrink-0 bg-card/90 backdrop-blur-sm shadow-sm">
                    <Avatar className="h-9 w-9 shrink-0 ring-2 ring-primary/20 shadow-md">
                      <AvatarImage 
                        src={selectedConversation.contact_picture || undefined} 
                        alt={selectedConversation.contact_name || selectedConversation.contact_phone}
                        referrerPolicy="no-referrer"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-sm font-semibold">
                        {(selectedConversation.contact_name || selectedConversation.contact_phone)
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-medium truncate text-sm sm:text-base">
                          {selectedConversation.contact_name || selectedConversation.contact_phone}
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
                                linkedLead.status === 'novo' && "bg-blue-500",
                                linkedLead.status === 'em_contato' && "bg-yellow-500 text-yellow-950",
                                linkedLead.status === 'orcamento_enviado' && "bg-purple-500",
                                linkedLead.status === 'aguardando_resposta' && "bg-orange-500",
                                linkedLead.status === 'fechado' && "bg-green-500",
                                linkedLead.status === 'perdido' && "bg-red-500"
                              )}
                            >
                              {linkedLead.status === 'novo' && 'Novo'}
                              {linkedLead.status === 'em_contato' && 'Contato'}
                              {linkedLead.status === 'orcamento_enviado' && 'Orçamento'}
                              {linkedLead.status === 'aguardando_resposta' && 'Aguardando'}
                              {linkedLead.status === 'fechado' && 'Fechado'}
                              {linkedLead.status === 'perdido' && 'Perdido'}
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
                        onToggleFavorite={toggleFavorite}
                        onLeadNameChange={(newName) => {
                          setLinkedLead(prev => prev ? { ...prev, name: newName } : null);
                          setSelectedConversation(prev => prev ? { ...prev, contact_name: newName } : null);
                          setConversations(prevConvs => prevConvs.map(c => 
                            c.id === selectedConversation.id ? { ...c, contact_name: newName } : c
                          ));
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

                  {/* Lead Classification Panel - Always visible */}
                  <div className="border-b bg-card/50 p-2 sm:p-3 shrink-0">
                    {linkedLead ? (
                      // Show classification buttons when lead is linked
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Status:</span>
                        {[
                          { value: 'novo', label: 'Novo', color: 'bg-blue-500' },
                          { value: 'em_contato', label: 'Visita', color: 'bg-yellow-500' },
                          { value: 'orcamento_enviado', label: 'Orçamento', color: 'bg-purple-500' },
                          { value: 'aguardando_resposta', label: 'Negociando', color: 'bg-orange-500' },
                          { value: 'fechado', label: 'Fechado', color: 'bg-green-500' },
                          { value: 'perdido', label: 'Perdido', color: 'bg-red-500' },
                        ].map((statusOption) => (
                          <Button
                            key={statusOption.value}
                            variant={linkedLead.status === statusOption.value ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "h-7 text-xs gap-1.5",
                              linkedLead.status === statusOption.value && "ring-2 ring-offset-1"
                            )}
                            onClick={async () => {
                              const oldStatus = linkedLead.status;
                              const newStatus = statusOption.value as "novo" | "em_contato" | "orcamento_enviado" | "aguardando_resposta" | "fechado" | "perdido";
                              
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
                            <div className={cn("w-2 h-2 rounded-full", statusOption.color)} />
                            {statusOption.label}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      // Show classification buttons directly - no lead linked yet
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-destructive shrink-0">⚠ Não classificado:</span>
                        {[
                          { value: 'novo', label: 'Novo', color: 'bg-blue-500' },
                          { value: 'em_contato', label: 'Visita', color: 'bg-yellow-500' },
                          { value: 'orcamento_enviado', label: 'Orçamento', color: 'bg-purple-500' },
                          { value: 'aguardando_resposta', label: 'Negociando', color: 'bg-orange-500' },
                          { value: 'fechado', label: 'Fechado', color: 'bg-green-500' },
                          { value: 'perdido', label: 'Perdido', color: 'bg-red-500' },
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
                          messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={cn(
                                "flex",
                                msg.from_me ? "justify-end" : "justify-start"
                              )}
                            >
                              <div
                                className={cn(
                                  "max-w-[85%] sm:max-w-[75%] rounded-lg text-sm shadow-sm",
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
                                      instanceToken={selectedInstance?.instance_token}
                                      onMediaUrlUpdate={(url) => {
                                        setMessages(prev => prev.map(m => 
                                          m.id === msg.id ? { ...m, media_url: url } : m
                                        ));
                                      }}
                                    />
                                  </div>
                                )}
                                {msg.message_type === 'text' && (
                                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                )}
                                {msg.message_type !== 'text' && msg.content && msg.content !== '[Imagem]' && msg.content !== '[Áudio]' && (
                                  <p className={cn("whitespace-pre-wrap break-words mt-1", (msg.message_type === 'image' || msg.message_type === 'video') && "px-2")}>{msg.content}</p>
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
                            </div>
                          ))
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
                  <div className="p-3 border-t shrink-0">
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
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Textarea
                          placeholder="Digite uma mensagem..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          disabled={isSending || !canSendMessages}
                          className="text-base sm:text-sm flex-1 min-h-[40px] max-h-32 resize-y py-2"
                          rows={1}
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
            </ResizablePanel>
          </ResizablePanelGroup>

          {/* Mobile: Show chat when conversation is selected */}
          <div className={cn(
            "w-full flex flex-col overflow-hidden md:hidden",
            !selectedConversation && "hidden"
          )}>
            {selectedConversation && (
              <>
                <div className="p-3 border-b flex items-center gap-2 shrink-0">
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
                    <p className="font-medium truncate text-sm">
                      {selectedConversation.contact_name || selectedConversation.contact_phone}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedConversation.contact_phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Info Popover - show for all individual chats (mobile) */}
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
                      onToggleFavorite={toggleFavorite}
                      onLeadNameChange={(newName) => {
                        setLinkedLead(prev => prev ? { ...prev, name: newName } : null);
                        setSelectedConversation(prev => prev ? { ...prev, contact_name: newName } : null);
                        setConversations(prevConvs => prevConvs.map(c => 
                          c.id === selectedConversation.id ? { ...c, contact_name: newName } : c
                        ));
                      }}
                      mobile
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

                {/* Mobile Lead Classification Panel */}
                <div className="border-b bg-card/50 p-2 shrink-0">
                  {linkedLead ? (
                    // Show classification buttons when lead is linked
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Status:</span>
                        {[
                          { value: 'novo', label: 'Novo', color: 'bg-blue-500' },
                          { value: 'em_contato', label: 'Contato', color: 'bg-yellow-500' },
                          { value: 'orcamento_enviado', label: 'Orçamento', color: 'bg-purple-500' },
                          { value: 'aguardando_resposta', label: 'Aguard.', color: 'bg-orange-500' },
                          { value: 'fechado', label: 'Fechado', color: 'bg-green-500' },
                          { value: 'perdido', label: 'Perdido', color: 'bg-red-500' },
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
                              const newStatus = statusOption.value as "novo" | "em_contato" | "orcamento_enviado" | "aguardando_resposta" | "fechado" | "perdido";
                              
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
                                em_contato: 'Em Contato',
                                orcamento_enviado: 'Orçamento Enviado',
                                aguardando_resposta: 'Aguardando Resposta',
                                fechado: 'Fechado',
                                perdido: 'Perdido',
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
                            <div className={cn("w-1.5 h-1.5 rounded-full", statusOption.color)} />
                            {statusOption.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // Show classification buttons directly - no lead linked yet
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-medium text-destructive shrink-0">⚠ Não classificado:</span>
                      {[
                        { value: 'novo', label: 'Novo', color: 'bg-blue-500' },
                        { value: 'em_contato', label: 'Contato', color: 'bg-yellow-500' },
                        { value: 'orcamento_enviado', label: 'Orçam.', color: 'bg-purple-500' },
                        { value: 'aguardando_resposta', label: 'Aguard.', color: 'bg-orange-500' },
                        { value: 'fechado', label: 'Fechado', color: 'bg-green-500' },
                        { value: 'perdido', label: 'Perdido', color: 'bg-red-500' },
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
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex",
                            msg.from_me ? "justify-end" : "justify-start"
                          )}
                        >
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
                                  instanceToken={selectedInstance?.instance_token}
                                  onMediaUrlUpdate={(url) => {
                                    setMessages(prev => prev.map(m => 
                                      m.id === msg.id ? { ...m, media_url: url } : m
                                    ));
                                  }}
                                />
                              </div>
                            )}
                            {msg.message_type === 'text' && (
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
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
                        </div>
                      ))
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
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={isSending || !canSendMessages}
                      className="text-base flex-1 min-h-[40px] max-h-[50vh] resize-y py-2"
                      rows={1}
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
    </div>
  );
}
