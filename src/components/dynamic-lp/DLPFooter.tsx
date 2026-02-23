import { Instagram, MessageCircle } from "lucide-react";
import type { LPFooter, LPTheme } from "@/types/landing-page";

interface DLPFooterProps {
  footer: LPFooter;
  theme: LPTheme;
  companyName: string;
  companyLogo: string | null;
  instagramHandle?: string | null;
  whatsappNumber?: string | null;
}

export function DLPFooter({ footer, theme, companyName, companyLogo, instagramHandle, whatsappNumber }: DLPFooterProps) {
  const instagramUrl = instagramHandle
    ? `https://instagram.com/${instagramHandle.replace(/^@/, '')}`
    : '#';
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`
    : '#';

  return (
    <footer
      className="py-12"
      style={{
        backgroundColor: theme.text_color === "#ffffff" ? "#111" : theme.text_color,
        color: theme.text_color === "#ffffff" ? "#fff" : theme.background_color,
      }}
    >
      <div className="max-w-4xl mx-auto px-4 text-center">
        {companyLogo && (
          <img
            src={companyLogo}
            alt={companyName}
            className="w-32 md:w-40 mx-auto mb-4"
          />
        )}

        <p
          className="mb-6 max-w-md mx-auto"
          style={{
            color: theme.text_color === "#ffffff" ? "#ffffff99" : theme.background_color + "99",
            fontFamily: theme.font_body,
          }}
        >
          Transformando sonhos em festas inesquecíveis.
        </p>

        {/* Social links */}
        {footer.show_instagram && (
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 transition-all duration-300 text-lg hover:opacity-100 opacity-70"
              style={{
                color: theme.text_color === "#ffffff" ? "#fff" : theme.background_color,
              }}
            >
              <Instagram
                size={24}
                className="transition-transform duration-300 group-hover:scale-125 group-hover:rotate-6"
              />
              <span>Instagram</span>
            </a>
          </div>
        )}

        {footer.show_phone && (
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full transition-all duration-300 text-sm font-medium hover:scale-105 hover:shadow-lg"
            >
              <MessageCircle size={18} className="transition-transform duration-300 group-hover:scale-110" />
              <span>WhatsApp</span>
            </a>
          </div>
        )}

        <div
          className="border-t pt-6"
          style={{
            borderColor: theme.text_color === "#ffffff" ? "#ffffff20" : theme.background_color + "20",
          }}
        >
          {footer.custom_text && (
            <p
              className="text-sm opacity-70 mb-2"
              style={{ fontFamily: theme.font_body }}
            >
              {footer.custom_text}
            </p>
          )}
          <p
            className="text-sm opacity-50"
            style={{ fontFamily: theme.font_body }}
          >
            © {new Date().getFullYear()} {companyName}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
