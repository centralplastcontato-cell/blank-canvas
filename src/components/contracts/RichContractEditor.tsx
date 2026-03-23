import { useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bold } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Convert markdown **bold** to <strong> for display */
function markdownToHtml(text: string): string {
  // Escape HTML first
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Convert **bold** to <strong>
  return escaped.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
}

/** Convert <strong> back to markdown ** */
function htmlToMarkdown(html: string): string {
  // Create a temp element to parse
  const div = document.createElement("div");
  div.innerHTML = html;

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const children = Array.from(el.childNodes).map(walk).join("");

      if (tag === "strong" || tag === "b") {
        return `**${children}**`;
      }
      if (tag === "br") {
        return "\n";
      }
      if (tag === "div" || tag === "p") {
        // contentEditable wraps lines in divs
        return children + "\n";
      }
      return children;
    }
    return "";
  }

  let result = Array.from(div.childNodes).map(walk).join("");
  // Remove trailing newline that contentEditable adds
  if (result.endsWith("\n")) {
    result = result.slice(0, -1);
  }
  return result;
}

export function RichContractEditor({ value, onChange, placeholder }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  // Sync value → editor HTML (only when value changes externally)
  useEffect(() => {
    if (isUpdatingRef.current) {
      isUpdatingRef.current = false;
      return;
    }
    const el = editorRef.current;
    if (!el) return;
    const html = markdownToHtml(value);
    if (el.innerHTML !== html) {
      // Save and restore cursor position
      const sel = window.getSelection();
      const hadFocus = document.activeElement === el;
      let savedOffset = 0;
      if (hadFocus && sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const preRange = document.createRange();
        preRange.selectNodeContents(el);
        preRange.setEnd(range.startContainer, range.startOffset);
        savedOffset = preRange.toString().length;
      }
      el.innerHTML = html;
      if (hadFocus && sel) {
        try {
          restoreCursor(el, savedOffset);
        } catch {
          // ignore cursor restore errors
        }
      }
    }
  }, [value]);

  function restoreCursor(el: HTMLElement, offset: number) {
    const sel = window.getSelection();
    if (!sel) return;
    let current = 0;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const len = node.textContent?.length || 0;
      if (current + len >= offset) {
        const range = document.createRange();
        range.setStart(node, offset - current);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      current += len;
    }
  }

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    isUpdatingRef.current = true;
    const md = htmlToMarkdown(el.innerHTML);
    onChange(md);
  }, [onChange]);

  const handleBold = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand("bold", false);
    // Sync back
    isUpdatingRef.current = true;
    const md = htmlToMarkdown(el.innerHTML);
    onChange(md);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      handleBold();
    }
  }, [handleBold]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 p-1 rounded-md border border-border/30 bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBold}
          className="h-7 w-7 p-0"
          title="Negrito (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <span className="text-[10px] text-muted-foreground ml-2">
          Selecione o texto e clique para aplicar negrito (ou Ctrl+B)
        </span>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className="min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 whitespace-pre-wrap overflow-y-auto max-h-[500px] [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground"
        style={{ fontFamily: "ui-monospace, monospace" }}
      />
    </div>
  );
}
