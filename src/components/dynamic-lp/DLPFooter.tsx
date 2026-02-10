import type { LPFooter, LPTheme } from "@/types/landing-page";

interface DLPFooterProps {
  footer: LPFooter;
  theme: LPTheme;
  companyName: string;
}

export function DLPFooter({ footer, theme, companyName }: DLPFooterProps) {
  return (
    <footer
      className="py-10 border-t"
      style={{
        backgroundColor: theme.background_color,
        borderColor: theme.text_color + "22",
      }}
    >
      <div className="max-w-4xl mx-auto px-4 text-center space-y-3">
        <p
          className="font-bold text-lg"
          style={{ color: theme.text_color, fontFamily: theme.font_heading }}
        >
          {companyName}
        </p>

        {footer.custom_text && (
          <p
            className="text-sm opacity-60"
            style={{ color: theme.text_color, fontFamily: theme.font_body }}
          >
            {footer.custom_text}
          </p>
        )}

        <p
          className="text-xs opacity-40"
          style={{ color: theme.text_color, fontFamily: theme.font_body }}
        >
          © {new Date().getFullYear()} {companyName}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
