import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { FileText, ImageIcon, Mic, Video, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface MediaMessageProps {
  messageId: string | null;
  mediaType: 'image' | 'audio' | 'video' | 'document';
  mediaUrl: string | null;
  content: string | null;
  fromMe: boolean;
  instanceId?: string;
  instanceToken?: string;
  onMediaUrlUpdate?: (newUrl: string) => void;
}

/**
 * Check if a media URL is from our persistent storage (Supabase)
 * URLs from WhatsApp CDN (mmg.whatsapp.net) are encrypted .enc files and won't work
 * Signed URLs include a token parameter and are also valid
 */
function isPersistedMediaUrl(url: string | null): boolean {
  if (!url) return false;
  
  // Our Supabase storage URLs (including signed URLs)
  if (url.includes('supabase.co/storage')) return true;
  if (url.includes('knyzkwgdmclcwvzhdmyk')) return true; // Our project ID
  
  // Check for signed URL token parameter
  if (url.includes('token=')) return true;
  
  // WhatsApp CDN URLs are encrypted .enc files - NOT usable
  if (url.includes('mmg.whatsapp.net')) return false;
  if (url.includes('.whatsapp.net')) return false;
  if (url.includes('whatsapp.com')) return false;
  
  // Check for .enc extension (encrypted WhatsApp file)
  if (url.includes('.enc')) return false;
  
  // Other URLs (might be external) - assume they work
  return true;
}

/**
 * Check if URL points to an encrypted WhatsApp file
 */
function isEncryptedUrl(url: string | null): boolean {
  if (!url) return false;
  return url.includes('.enc') || 
         url.includes('mmg.whatsapp.net') || 
         url.includes('.whatsapp.net') ||
         url.includes('whatsapp.com');
}


/**
 * MediaMessage component - Displays media with automatic download for persistence
 * Shows preview immediately when possible, downloads in background
 */
export function MediaMessage({
  messageId,
  mediaType,
  mediaUrl,
  content,
  fromMe,
  instanceId,
  instanceToken,
  onMediaUrlUpdate,
}: MediaMessageProps) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(mediaUrl);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);

  const isPersisted = isPersistedMediaUrl(currentUrl);
  
  // Only attempt download if we have instance credentials AND the media is not already persisted
  // AND we have a valid mediaUrl from WhatsApp (indicates the message has media data)
  const hasWhatsAppMediaUrl = mediaUrl && (
    mediaUrl.includes('mmg.whatsapp.net') || 
    mediaUrl.includes('.whatsapp.net') ||
    mediaUrl.includes('whatsapp.com')
  );
  
  // Don't auto-download - only manual download to avoid flooding errors for old messages
  const canAttemptDownload = !isPersisted && messageId && instanceId && instanceToken && hasWhatsAppMediaUrl;

  const handleDownload = useCallback(async () => {
    if (!messageId || !instanceId || !instanceToken) return;
    
    setIsDownloading(true);
    setDownloadError(null);

    try {
      let data: Record<string, unknown> | null = null;
      let fetchError: Error | null = null;

      try {
        const result = await supabase.functions.invoke('wapi-send', {
          body: {
            action: 'download-media',
            messageId,
            instanceId,
            instanceToken,
          },
        });
        data = result.data;
        fetchError = result.error;
      } catch (invokeErr) {
        // supabase.functions.invoke can throw on non-2xx status
        console.warn('Download invoke failed:', invokeErr);
        fetchError = invokeErr instanceof Error ? invokeErr : new Error('Invoke failed');
      }

      // Success case - check data first
      if (data?.success && data?.url) {
        setCurrentUrl(data.url as string);
        setImageLoadError(false);
        
        // Update message in database (fire and forget, don't block UI)
        void supabase
          .from('wapi_messages')
          .update({ media_url: data.url as string, media_key: null })
          .eq('message_id', messageId);

        onMediaUrlUpdate?.(data.url as string);
        return;
      }

      // Handle error responses - data may contain error info even on 400
      // Check canRetry from the response body (edge function returns it)
      const responseData = (data || {}) as Record<string, unknown>;
      const canRetry = responseData.canRetry !== false;
      const errorMsg = typeof responseData.error === 'string' ? responseData.error : '';
      
      if (!canRetry || errorMsg.includes('não disponível') || errorMsg.includes('expirada')) {
        // Permanent error - media expired or missing metadata
        setDownloadError('Mídia expirada');
      } else if (fetchError) {
        // Transient error from supabase client - might be retryable
        console.warn('Download failed:', fetchError.message);
        setDownloadError('Erro ao baixar');
      } else {
        // No success, no clear error - assume expired
        setDownloadError('Mídia expirada');
      }
    } catch (err) {
      // Network or unexpected error - don't crash, just show error
      console.warn('Download exception:', err);
      setDownloadError('Mídia expirada');
    } finally {
      setIsDownloading(false);
    }
  }, [messageId, instanceId, instanceToken, onMediaUrlUpdate]);

  // Handle image load error - just show placeholder, don't auto-download
  const handleImageError = () => {
    setImageLoadError(true);
    // Don't auto-trigger download - let user click manually if they want
  };

  // Render based on media type
  const renderMedia = () => {
    // Check if URL is actually usable (not encrypted WhatsApp URL)
    const isUrlEncrypted = isEncryptedUrl(currentUrl);
    
    // Only show media directly if we have a persisted/valid URL that's not encrypted
    const hasValidUrl = currentUrl && isPersisted && !isUrlEncrypted && !imageLoadError;

    switch (mediaType) {
      case 'image':
        if (hasValidUrl && !imageLoadError) {
          return (
            <img
              src={currentUrl!}
              alt={content || "Imagem"}
              className="max-w-full max-h-64 object-contain cursor-pointer block"
              onClick={() => window.open(currentUrl!, '_blank')}
              onError={handleImageError}
            />
          );
        }
        return renderPlaceholder();

      case 'video':
        if (hasValidUrl && !imageLoadError) {
          return (
            <video
              controls
              className="max-w-full max-h-64 block"
              preload="metadata"
              onError={handleImageError}
            >
              <source src={currentUrl!} />
            </video>
          );
        }
        return renderPlaceholder();

      case 'audio':
        if (hasValidUrl && !imageLoadError) {
          return (
            <audio controls className="max-w-full" onError={handleImageError}>
              <source src={currentUrl!} />
            </audio>
          );
        }
        return renderPlaceholder();

      case 'document':
        // For documents, only show download link if URL is valid and not encrypted
        if (hasValidUrl) {
          // Extract filename from content (which should have the original filename)
          const displayName = content || 'Documento';
          const isPdf = displayName.toLowerCase().endsWith('.pdf') || 
                       (currentUrl && currentUrl.toLowerCase().includes('.pdf'));
          
          return (
            <a
              href={currentUrl!}
              target="_blank"
              rel="noopener noreferrer"
              download={displayName}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors min-w-[200px] max-w-[300px]",
                fromMe
                  ? "border-primary-foreground/30 hover:bg-primary-foreground/10 bg-primary-foreground/5"
                  : "border-border hover:bg-muted bg-background/50"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg shrink-0",
                fromMe ? "bg-primary-foreground/10" : "bg-primary/10"
              )}>
                <FileText className={cn(
                  "w-5 h-5",
                  fromMe ? "text-primary-foreground" : isPdf ? "text-destructive" : "text-primary"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium truncate",
                  fromMe ? "text-primary-foreground" : "text-foreground"
                )} title={displayName}>
                  {displayName}
                </p>
                <p className={cn(
                  "text-xs",
                  fromMe ? "text-primary-foreground/60" : "text-muted-foreground"
                )}>
                  {isPdf ? 'PDF' : 'Documento'} • Clique para baixar
                </p>
              </div>
              <Download className={cn(
                "w-4 h-4 shrink-0",
                fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
              )} />
            </a>
          );
        }
        // Document not available - show placeholder with retry option
        return renderPlaceholder();

      default:
        return renderPlaceholder();
    }
  };

  const renderPlaceholder = () => {
    const IconComponent = {
      image: ImageIcon,
      audio: Mic,
      video: Video,
      document: FileText,
    }[mediaType];

    const mediaLabel = {
      image: 'Imagem',
      audio: 'Áudio',
      video: 'Vídeo',
      document: content || 'Documento',
    }[mediaType];

    return (
      <div
        className={cn(
          "flex flex-col gap-2 p-3 rounded-lg border min-w-[180px] max-w-[250px]",
          fromMe
            ? "border-primary-foreground/20 bg-primary-foreground/5"
            : "border-border bg-muted/30"
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "p-2 rounded-lg",
              fromMe ? "bg-primary-foreground/10" : "bg-primary/10"
            )}
          >
            <IconComponent
              className={cn(
                "w-5 h-5",
                fromMe ? "text-primary-foreground" : "text-primary"
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm font-medium truncate",
                fromMe ? "text-primary-foreground" : "text-foreground"
              )}
            >
              {mediaLabel}
            </p>
            <p
              className={cn(
                "text-xs flex items-center gap-1",
                fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Baixando...
                </>
              ) : downloadError ? (
                <span className="text-destructive">{downloadError}</span>
              ) : (
                "Arquivo não disponível"
              )}
            </p>
          </div>
        </div>

        {/* Download button - only show if we have a WhatsApp CDN URL (indicates downloadable media) */}
        {!isDownloading && canAttemptDownload && downloadError !== 'Mídia expirada' && (
          <Button
            size="sm"
            variant={fromMe ? "secondary" : "outline"}
            className="w-full h-8 text-xs"
            onClick={handleDownload}
          >
            <Download className="w-3 h-3 mr-1" />
            {downloadError ? "Tentar novamente" : "Baixar arquivo"}
          </Button>
        )}

        {/* Loading state */}
        {isDownloading && (
          <div className="flex items-center justify-center gap-2 py-1">
            <Loader2 className={cn(
              "w-4 h-4 animate-spin",
              fromMe ? "text-primary-foreground" : "text-primary"
            )} />
          </div>
        )}
      </div>
    );
  };

  return renderMedia();
}
