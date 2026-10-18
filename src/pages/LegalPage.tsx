import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { LEGAL_UPDATED, PRIVACY, TERMS } from "@/lib/legal";

const DOCS = {
  termos: { title: "Termos de Uso", sections: TERMS, other: { to: "/privacidade", label: "Política de Privacidade" } },
  privacidade: { title: "Política de Privacidade", sections: PRIVACY, other: { to: "/termos", label: "Termos de Uso" } },
} as const;

/** Página pública dos Termos de Uso e da Política de Privacidade (/termos e /privacidade) */
export default function LegalPage({ doc }: { doc: keyof typeof DOCS }) {
  const { title, sections, other } = DOCS[doc];
  return (
    <div className="min-h-screen bg-[#FFF9F3] px-4 py-10">
      <Helmet><title>{`${title} | Celebrei`}</title></Helmet>
      <article className="mx-auto max-w-3xl space-y-6 rounded-2xl bg-white p-6 shadow-sm sm:p-10">
        <Link to="/" className="font-grotesque text-xl font-bold text-[#0F1222]">Celebrei</Link>
        <header className="space-y-1">
          <h1 className="font-grotesque text-3xl font-bold text-[#0F1222]">{title}</h1>
          <p className="text-sm text-slate-500">Última atualização: {LEGAL_UPDATED}</p>
        </header>
        {sections.map((s) => (
          <section key={s.title} className="space-y-2">
            <h2 className="text-lg font-semibold text-[#0F1222]">{s.title}</h2>
            {s.paragraphs.map((p) => <p key={p} className="leading-relaxed text-slate-700">{p}</p>)}
          </section>
        ))}
        <p className="border-t pt-4 text-sm text-slate-500">
          Veja também: <Link to={other.to} className="font-medium text-[#E0457A] hover:underline">{other.label}</Link>
        </p>
      </article>
    </div>
  );
}
