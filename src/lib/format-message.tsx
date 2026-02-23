import React from "react";

/**
 * Detects phone numbers (10-13 digits) and URLs in text,
 * returning ReactNode[] with clickable links.
 */
export function formatMessageContent(text: string | null | undefined): React.ReactNode {
  if (!text) return text;

  // Combined regex: URLs first (greedy), then phone numbers (10-13 consecutive digits)
  const combinedRegex = /(https?:\/\/[^\s]+)|\b(\d{10,13})\b/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combinedRegex.exec(text)) !== null) {
    // Push preceding text
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // URL match
      parts.push(
        <a
          key={match.index}
          href={match[1]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline hover:text-blue-300"
        >
          {match[1]}
        </a>
      );
    } else if (match[2]) {
      // Phone number match
      const raw = match[2];
      const waNumber = raw.length <= 11 ? `55${raw}` : raw;
      parts.push(
        <a
          key={match.index}
          href={`https://wa.me/${waNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline hover:text-blue-300"
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
