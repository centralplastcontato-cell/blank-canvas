import { Instagram } from "lucide-react";
import CelebreiLogo from "./CelebreiLogo";

export default function HubFooter() {
  return (
    <footer className="border-t border-[#0F1222]/[0.06] bg-[#FFF9F3]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-10 sm:flex-row sm:px-6">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <CelebreiLogo markClassName="h-8 w-8" />
          <p className="text-sm text-slate-500">A plataforma de vendas e gestão para buffets infantis</p>
        </div>
        <div className="flex flex-col items-center gap-3 sm:items-end">
          <a
            href="https://www.instagram.com/celebrei.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#0F1222]/[0.08] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#F0457A]/40 hover:text-[#D23468]"
          >
            <Instagram className="h-4 w-4" />
            @celebrei.app
          </a>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} Celebrei. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
