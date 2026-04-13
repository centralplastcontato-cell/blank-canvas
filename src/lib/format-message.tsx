import React from "react";
import { ExternalLink } from "lucide-react";

/** Truncate a URL for display: show hostname + short path */
function formatUrlDisplay(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname + parsed.search;
    if (path.length <= 1) return host;
    // Show host + truncated path
    const shortPath = path.length > 30 ? path.slice(0, 27) + "..." : path;
    return `${host}${shortPath}`;
  } catch {
    // Fallback: just truncate
    return url.length > 50 ? url.slice(0, 47) + "..." : url;
  }
}

/**
 * Detects phone numbers (10-13 digits) and URLs in text,
 * returning ReactNode[] with clickable links.
 */
export function formatMessageContent(text: string | null | undefined): React.ReactNode {
  if (!text) return text;

  // Combined regex: URLs first (with or without protocol), then phone numbers (10-13 consecutive digits)
  const combinedRegex = /(https?:\/\/[^\s]+)|((?:www\.)[^\s]+)|\b(\d{10,13})\b/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combinedRegex.exec(text)) !== null) {
    // Push preceding text
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // URL match (with protocol)
      parts.push(
        <a
          key={match.index}
          href={match[1]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-200 underline underline-offset-2 decoration-blue-300/40 hover:text-white hover:decoration-white/60 transition-colors break-all text-[0.85em]"
        >
          <ExternalLink className="w-3 h-3 shrink-0 inline" />
          {formatUrlDisplay(match[1])}
        </a>
      );
    } else if (match[2]) {
      // www. URL match (without protocol)
      parts.push(
        <a
          key={match.index}
          href={`https://${match[2]}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-200 underline underline-offset-2 decoration-blue-300/40 hover:text-white hover:decoration-white/60 transition-colors break-all text-[0.85em]"
        >
          <ExternalLink className="w-3 h-3 shrink-0 inline" />
          {formatUrlDisplay(match[2])}
        </a>
      );
    } else if (match[3]) {
      // Phone number match
      const raw = match[3];
      const waNumber = raw.length <= 11 ? `55${raw}` : raw;
      parts.push(
        <a
          key={match.index}
          href={`https://wa.me/${waNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-200 underline underline-offset-2 decoration-blue-300/40 hover:text-white hover:decoration-white/60 transition-colors"
        >
          {raw}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}
