import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { FileText, ImageIcon, Mic, Video, Loader2, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface MediaProgressIndicatorProps {
  messageId: string | null;
  mediaType: 'image' | 'audio' | 'video' | 'document';
  content: string | null;
  fromMe: boolean;
  instanceId?: string;
  instanceToken?: string;
  onDownloadComplete?: (url: string) => void;
}

/**
 * Visual progress indicator for media downloads
 * Shows animated progress bar with percentage during download
 */
export function MediaProgressIndicator({
  messageId,
  mediaType,
  content,
  fromMe,
  instanceId,
  instanceToken,
  onDownloadComplete,
}: MediaProgressIndicatorProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'waiting' | 'downloading' | 'processing' | 'complete' | 'error'>('waiting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isManualDownload, setIsManualDownload] = useState(false);

  // Icon based on media type
  const IconComponent = {
    image: ImageIcon,
    audio: Mic,
    video: Video,
    document: FileText,
  }[mediaType];

  // Label for media type
  const mediaLabel = {
    image: 'Imagem',
    audio: 'Áudio',
    video: 'Vídeo',
    document: content || 'Documento',
  }[mediaType];

  // Simulate progress for visual feedback during server-side download
  useEffect(() => {
    if (status === 'downloading') {
      const interval = setInterval(() => {
        setProgress((prev) => {
          // Slow down as we approach completion (simulate uncertain progress)
          if (prev < 30) return prev + 8;
          if (prev < 60) return prev + 4;
          if (prev < 85) return prev + 2;
          if (prev < 95) return prev + 0.5;
          return prev;
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [status]);

  // Handle manual download trigger
  const handleManualDownload = async () => {
    if (!messageId || !instanceId || !instanceToken) {
      setStatus('error');
      setErrorMessage('Dados insuficientes para download');
      return;
    }

    setIsManualDownload(true);
    setStatus('downloading');
    setProgress(5);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('wapi-send', {
        body: {
          action: 'download-media',
          messageId,
          instanceId,
          instanceToken,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Falha ao baixar mídia');
      }

      // Download complete
      setProgress(100);
      setStatus('complete');

      // Update message in database
      await supabase
        .from('wapi_messages')
        .update({ media_url: data.url })
        .eq('message_id', messageId);

      // Notify parent
      onDownloadComplete?.(data.url);
    } catch (err) {
      console.error('Download error:', err);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao baixar');
      setProgress(0);
    }
  };

  // Status messages
  const statusMessages = {
    waiting: 'Aguardando processamento...',
    downloading: 'Baixando mídia...',
    processing: 'Processando arquivo...',
    complete: 'Download concluído!',
    error: errorMessage || 'Erro no download',
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 rounded-lg border min-w-[200px] max-w-[280px]",
        fromMe
          ? "border-primary-foreground/20 bg-primary-foreground/5"
          : "border-border bg-muted/30"
      )}
    >
      {/* Header with icon and title */}
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
            {status === 'downloading' && (
              <Loader2 className="w-3 h-3 animate-spin" />
            )}
            {status === 'error' && (
              <AlertCircle className="w-3 h-3 text-destructive" />
            )}
            <span className={status === 'error' ? 'text-destructive' : ''}>
              {statusMessages[status]}
            </span>
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {(status === 'downloading' || status === 'processing') && (
        <div className="space-y-1">
          <Progress
            value={progress}
            className={cn(
              "h-2",
              fromMe ? "[&>div]:bg-primary-foreground" : ""
            )}
          />
          <div className="flex justify-between items-center">
            <span
              className={cn(
                "text-[10px]",
                fromMe ? "text-primary-foreground/60" : "text-muted-foreground"
              )}
            >
              {status === 'processing' ? 'Processando...' : 'Baixando...'}
            </span>
            <span
              className={cn(
                "text-[10px] font-medium",
                fromMe ? "text-primary-foreground/80" : "text-foreground/80"
              )}
            >
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      )}

      {/* Error retry button */}
      {status === 'error' && messageId && instanceId && instanceToken && (
        <Button
          size="sm"
          variant={fromMe ? "secondary" : "outline"}
          className="w-full h-8 text-xs"
          onClick={handleManualDownload}
        >
          <Download className="w-3 h-3 mr-1" />
          Tentar novamente
        </Button>
      )}

      {/* Manual download button for waiting state */}
      {status === 'waiting' && messageId && instanceId && instanceToken && (
        <Button
          size="sm"
          variant={fromMe ? "secondary" : "outline"}
          className="w-full h-8 text-xs"
          onClick={handleManualDownload}
        >
          <Download className="w-3 h-3 mr-1" />
          Baixar arquivo
        </Button>
      )}

      {/* Waiting state without ability to download */}
      {status === 'waiting' && (!messageId || !instanceId || !instanceToken) && (
        <div
          className={cn(
            "flex items-center justify-center gap-2 py-1",
            fromMe ? "text-primary-foreground/60" : "text-muted-foreground"
          )}
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="text-xs">Carregando...</span>
        </div>
      )}
    </div>
  );
}
