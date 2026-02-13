import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ExternalLink, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OGData {
  title: string;
  description: string | null;
  image: string | null;
  siteName: string;
  url: string;
}

// Simple in-memory cache to avoid re-fetching
const ogCache = new Map<string, OGData | null>();

// URL regex - matches common URLs in text
const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi;

/** Extract the first URL from a text message */
export function extractFirstUrl(text: string | null): string | null {
  if (!text) return null;
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

interface LinkPreviewCardProps {
  url: string;
  fromMe: boolean;
}

export function LinkPreviewCard({ url, fromMe }: LinkPreviewCardProps) {
  const [ogData, setOgData] = useState<OGData | null>(ogCache.get(url) ?? null);
  const [loading, setLoading] = useState(!ogCache.has(url));
  const [error, setError] = useState(false);
  const [imgError, setImgError] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (ogCache.has(url)) {
      const cached = ogCache.get(url);
      setOgData(cached ?? null);
      setLoading(false);
      setError(!cached);
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    let cancelled = false;

    async function fetchOG() {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("og-fetch", {
          body: { url },
        });

        if (cancelled) return;

        if (fnError || !data?.title) {
          ogCache.set(url, null);
          setError(true);
          setLoading(false);
          return;
        }

        const result = data as OGData;
        ogCache.set(url, result);
        setOgData(result);
        setLoading(false);
      } catch {
        if (cancelled) return;
        ogCache.set(url, null);
        setError(true);
        setLoading(false);
      }
    }

    fetchOG();
    return () => { cancelled = true; };
  }, [url]);

  // Don't render anything while loading or on error
  if (loading || error || !ogData) return null;

  const hostname = (() => {
    try {
      return new URL(ogData.url).hostname.replace(/^www\./, "");
    } catch {
      return ogData.siteName;
    }
  })();

  return (
    <a
      href={ogData.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block rounded-lg border overflow-hidden mt-1.5 transition-opacity hover:opacity-90 max-w-[300px]",
        fromMe
          ? "border-primary-foreground/20 bg-primary-foreground/5"
          : "border-border bg-muted/30"
      )}
    >
      {/* OG Image */}
      {ogData.image && !imgError && (
        <div className="w-full h-32 overflow-hidden bg-muted/20">
          <img
            src={ogData.image}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-2.5 space-y-0.5">
        <div className="flex items-center gap-1">
          <Globe className={cn(
            "w-3 h-3 shrink-0",
            fromMe ? "text-primary-foreground/50" : "text-muted-foreground"
          )} />
          <span className={cn(
            "text-[10px] uppercase tracking-wide truncate",
            fromMe ? "text-primary-foreground/50" : "text-muted-foreground"
          )}>
            {hostname}
          </span>
          <ExternalLink className={cn(
            "w-2.5 h-2.5 shrink-0 ml-auto",
            fromMe ? "text-primary-foreground/40" : "text-muted-foreground/60"
          )} />
        </div>

        <p className={cn(
          "text-sm font-medium line-clamp-2 leading-snug",
          fromMe ? "text-primary-foreground" : "text-foreground"
        )}>
          {ogData.title}
        </p>

        {ogData.description && (
          <p className={cn(
            "text-xs line-clamp-2 leading-relaxed",
            fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {ogData.description}
          </p>
        )}
      </div>
    </a>
  );
}
