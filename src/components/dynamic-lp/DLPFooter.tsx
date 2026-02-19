import type { LPFooter, LPTheme } from "@/types/landing-page";

interface DLPFooterProps {
  footer: LPFooter;
  theme: LPTheme;
  companyName: string;
  companyLogo: string | null;
}

export function DLPFooter({ footer, theme, companyName, companyLogo }: DLPFooterProps) {
  return (
    <footer
      className="py-12 border-t"
      style={{
        backgroundColor: theme.background_color,
        borderColor: theme.text_color + "15",
      }}
    >
      <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
        {companyLogo && (
          <img
            src={companyLogo}
            alt={companyName}
            className="w-32 md:w-40 mx-auto"
          />
        )}

        <p
          className="font-bold text-xl"
          style={{ color: theme.text_color, fontFamily: theme.font_heading }}
        >
          {companyName}
        </p>

        {footer.custom_text && (
          <p
            className="text-sm opacity-60 max-w-md mx-auto"
            style={{ color: theme.text_color, fontFamily: theme.font_body }}
          >
            {footer.custom_text}
          </p>
        )}

        <div
          className="border-t pt-6"
          style={{ borderColor: theme.text_color + "15" }}
        >
          <p
            className="text-xs opacity-40"
            style={{ color: theme.text_color, fontFamily: theme.font_body }}
          >
            © {new Date().getFullYear()} {companyName}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
