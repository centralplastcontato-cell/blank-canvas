import { useEffect, useState, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  Users, UtensilsCrossed, GlassWater, Snowflake, Car, Sparkles, Sun, Moon, Baby, Briefcase,
  MessageCircle, FileText, MapPin, CalendarCheck, ChevronDown, Star, Clock, Check,
} from "lucide-react";
// Fachada da unidade Trujillo (a unidade 1 não existe mais)
import fachada from "@/assets/fachada-unidade-2.jpg";
import logoCastelo from "@/assets/logo-castelo-transparent.png";
import videoTrujillo from "@/assets/video-trujillo.mp4";
import thumbTrujillo from "@/assets/thumb-trujillo.jpg";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { initMetaPixel, trackMetaPixelEvent } from "@/lib/metaPixel";
import { whatsappLink } from "@/lib/whatsappLink";
import { cn } from "@/lib/utils";

// Página de confraternização de EMPRESAS do Castelo (castelodadiversao.com.br/empresas).
// Campanha de fim de ano no Meta: todo botão abre o WhatsApp com a mensagem
// pronta (a Ana reconhece "confraternização" e marca o lead como Empresa) e
// dispara o evento Lead do Pixel, para o anúncio otimizar por Lead.

const CASTELO_META_PIXEL_ID = "2893092977682985";
const WHATSAPP = "5515974034646";
const MESSAGE = "Olá! Quero um orçamento de confraternização para minha empresa.";
const MAX_GUESTS = 120;

const STORAGE = "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/sales-materials/a0000000-0000-0000-0000-000000000001/Trujillo";
const PHOTOS = [
  "1772397433865-ks2d8aotn8", "1772397434726-7istdpq1jfo", "1772397435228-t98o450962", "1772397436004-o3kwqcwjud",
  "1772397436722-g0tuzr72n4", "1772397437514-qfhwloe10s", "1772397438554-i1048mkjnaf", "1772397439754-663ozv8ocie",
  "1772397440533-70eyl884dx3",
].map((id) => `${STORAGE}/${id}.jpeg`);

const GOLD = "#F5B83D";

function useWhatsApp(origin: string) {
  return {
    href: whatsappLink(WHATSAPP, MESSAGE),
    onClick: () => trackMetaPixelEvent("Lead", { content_name: "Confraternização de empresas", content_category: origin }),
  };
}

function CtaButton({ origin, children, className, size = "lg" }: { origin: string; children?: ReactNode; className?: string; size?: "lg" | "md" }) {
  const wa = useWhatsApp(origin);
  return (
    <a
      href={wa.href}
      onClick={wa.onClick}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2.5 rounded-full bg-[#25D366] font-extrabold text-white shadow-[0_10px_30px_rgba(37,211,102,0.35)] transition-transform hover:scale-[1.03] active:scale-[0.98]",
        size === "lg" ? "px-7 py-4 text-base md:text-lg" : "px-5 py-3 text-sm",
        className,
      )}
    >
      <MessageCircle className={size === "lg" ? "h-5 w-5" : "h-4 w-4"} />
      {children ?? "Quero um orçamento"}
    </a>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55 },
};

function SectionTitle({ eyebrow, title, subtitle, light }: { eyebrow: string; title: ReactNode; subtitle?: string; light?: boolean }) {
  return (
    <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center mb-10 md:mb-14">
      <span className="block text-xs md:text-sm font-extrabold tracking-[0.25em] uppercase mb-3" style={{ color: GOLD }}>{eyebrow}</span>
      <h2 className={cn("font-['Nunito'] text-3xl md:text-[44px] leading-[1.1] font-black", light ? "text-white" : "text-[#0B1026]")}>{title}</h2>
      {subtitle && <p className={cn("mt-4 text-base md:text-lg", light ? "text-white/75" : "text-slate-600")}>{subtitle}</p>}
    </motion.div>
  );
}

const INCLUDED = [
  { icon: UtensilsCrossed, title: "Cardápio completo", text: "Salgados, doces e muito mais, servidos pela nossa equipe durante a festa." },
  { icon: GlassWater, title: "Bebidas inclusas", text: "Bebidas servidas durante todo o evento, sem você se preocupar." },
  { icon: Users, title: "Equipe completa", text: "Atendimento, cozinha e monitores cuidando de tudo para vocês." },
  { icon: Snowflake, title: "Espaço climatizado", text: "Salão amplo e confortável, pronto para receber sua equipe." },
  { icon: Car, title: "Estacionamento próprio", text: "Mais praticidade para os colaboradores e as famílias." },
  { icon: Sparkles, title: "Diversão para as crianças", text: "Brinquedos e monitores: os pequenos se divertem e os adultos aproveitam." },
];

const FORMATS = [
  { icon: Briefcase, title: "Só a equipe", text: "Um momento leve para celebrar as conquistas do ano entre colegas." },
  { icon: Baby, title: "Com as famílias", text: "Traga os filhos dos colaboradores: o Castelo foi feito para eles." },
  { icon: Sun, title: "Almoço", text: "Ideal para encerrar o expediente com a equipe toda reunida." },
  { icon: Moon, title: "Noite", text: "Clima de festa de fim de ano, com tudo pronto quando vocês chegarem." },
];

const STEPS = [
  { icon: MessageCircle, title: "Chame no WhatsApp", text: "Conte quantas pessoas, a data ou o período e se prefere almoço ou noite." },
  { icon: FileText, title: "Receba a proposta", text: "Enviamos os pacotes com tudo o que está incluído, sem compromisso." },
  { icon: CalendarCheck, title: "Visite e garanta a data", text: "Venha conhecer o espaço e reserve o dia da sua confraternização." },
];

const FAQ = [
  { q: "Quantas pessoas o espaço comporta?", a: `Recebemos até ${MAX_GUESTS} pessoas. Os pacotes vão até 100 convidados; acima disso há um valor adicional por pessoa.` },
  { q: "Pode ser só para adultos?", a: "Pode, sim. O formato é livre: só a equipe, ou com a família e as crianças dos colaboradores." },
  { q: "O que está incluído?", a: "Cardápio completo, bebidas, equipe de atendimento, espaço climatizado e estacionamento próprio. Você recebe a proposta detalhada pelo WhatsApp." },
  { q: "Vocês fazem no almoço ou só à noite?", a: "Os dois. Você escolhe o período que funciona melhor para a sua empresa." },
  { q: "Como funciona o orçamento?", a: "É só chamar no WhatsApp com a quantidade de pessoas e a data ou o período. Respondemos com os pacotes e o convite para conhecer o espaço." },
  { q: "Ainda tem data em dezembro?", a: "Dezembro é o mês mais procurado e as datas acabam rápido. Quanto antes você chamar, mais opções de data." },
];

export default function EmpresasLandingPage() {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    initMetaPixel(CASTELO_META_PIXEL_ID);
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#0B1026] font-['Nunito']">
      <Helmet>
        <title>Confraternização de Empresas em Sorocaba | Castelo da Diversão</title>
        <meta name="description" content={`Confraternização de fim de ano para a sua empresa: cardápio, bebidas, equipe, espaço climatizado e estacionamento, para até ${MAX_GUESTS} pessoas. Peça seu orçamento pelo WhatsApp.`} />
        <meta property="og:title" content="Confraternização de Empresas | Castelo da Diversão" />
        <meta property="og:description" content={`Tudo num lugar só, para até ${MAX_GUESTS} pessoas. Almoço ou noite, só adultos ou com as famílias.`} />
        <meta property="og:url" content="https://www.castelodadiversao.com.br/empresas" />
      </Helmet>

      {/* Cabeçalho */}
      <header className="fixed inset-x-0 top-0 z-40 bg-[#0B1026]/85 backdrop-blur-md border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-1 shadow"><img src={logoCastelo} alt="Castelo da Diversão" className="h-full w-full object-contain" /></span>
          <CtaButton origin="cabecalho" size="md" className="hidden sm:inline-flex">Pedir orçamento</CtaButton>
          <a
            href={whatsappLink(WHATSAPP, MESSAGE)}
            onClick={() => trackMetaPixelEvent("Lead", { content_name: "Confraternização de empresas", content_category: "cabecalho" })}
            target="_blank"
            rel="noopener noreferrer"
            className="sm:hidden inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-sm font-extrabold text-white"
          >
            <MessageCircle className="h-4 w-4" /> Orçamento
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-end md:items-center overflow-hidden bg-[#0B1026] pt-16">
        <img src={fachada} alt="Fachada do Castelo da Diversão em Sorocaba" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1026] via-[#0B1026]/80 to-[#0B1026]/40 md:bg-gradient-to-r md:from-[#0B1026] md:via-[#0B1026]/85 md:to-[#0B1026]/20" />
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-14 pt-24 md:py-24">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-white">
              <Sparkles className="h-3.5 w-3.5" style={{ color: GOLD }} /> Confraternização de empresas · Sorocaba
            </span>
            <h1 className="mt-5 text-[40px] md:text-[64px] font-black leading-[1.02] text-white">
              A festa de fim de ano da sua equipe,{" "}
              <span style={{ color: GOLD }}>sem dor de cabeça.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg md:text-xl text-white/80 leading-relaxed">
              Comida, bebida, equipe, espaço climatizado e estacionamento num lugar só, para até {MAX_GUESTS} pessoas. Vocês só chegam e aproveitam.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center">
              <CtaButton origin="hero">Quero um orçamento</CtaButton>
              <a href="#espaco" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-4 font-bold text-white hover:bg-white/10 transition-colors">
                Ver o espaço <ChevronDown className="h-4 w-4" />
              </a>
            </div>
            <ul className="mt-8 grid grid-cols-2 sm:flex sm:flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-white/85">
              {[`Até ${MAX_GUESTS} pessoas`, "Almoço ou noite", "Só adultos ou com as famílias", "Estacionamento próprio"].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0" style={{ color: GOLD }} /> {t}</li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Números */}
      <section className="bg-[#0B1026] border-t border-white/10">
        <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-white/10 px-4 py-7 text-center text-white">
          {[["+4.000", "festas realizadas"], [`${MAX_GUESTS}`, "pessoas de capacidade"], ["9 anos", "de experiência"]].map(([n, l]) => (
            <div key={l} className="px-2">
              <p className="text-2xl md:text-4xl font-black" style={{ color: GOLD }}>{n}</p>
              <p className="text-xs md:text-sm text-white/70 font-semibold">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tudo incluso */}
      <section className="py-20 md:py-28 bg-[#F7F5FB]">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle
            eyebrow="Tudo resolvido num lugar só"
            title={<>Você não precisa contratar <span className="text-[#E91E63]">mais nada</span></>}
            subtitle="Nada de buscar fornecedor, alugar salão e cuidar de bebida. A gente cuida de tudo, do começo ao fim."
          />
          <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-3">
            {INCLUDED.map((it, i) => (
              <motion.div key={it.title} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.06 }} className="rounded-3xl bg-white p-4 md:p-6 shadow-[0_8px_30px_rgba(11,16,38,0.06)] border border-slate-100">
                <div className="mb-3 md:mb-4 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-[#0B1026] text-white">
                  <it.icon className="h-5 w-5 md:h-6 md:w-6" style={{ color: GOLD }} />
                </div>
                <h3 className="text-base md:text-lg font-extrabold leading-tight">{it.title}</h3>
                <p className="mt-1.5 text-sm md:text-base text-slate-600 leading-relaxed">{it.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Formatos */}
      <section className="py-20 md:py-28 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle eyebrow="Do jeito da sua empresa" title="Você escolhe o formato" subtitle="O pacote é completo em qualquer formato. Montamos a confraternização com a cara da sua equipe." />
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {FORMATS.map((f, i) => (
              <motion.div key={f.title} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.06 }} className="rounded-3xl border-2 border-slate-100 p-5 md:p-6 hover:border-[#E91E63]/40 transition-colors">
                <f.icon className="h-8 w-8 text-[#E91E63]" />
                <h3 className="mt-4 text-lg font-extrabold">{f.title}</h3>
                <p className="mt-1 text-sm md:text-base text-slate-600 leading-relaxed">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Espaço */}
      <section id="espaco" className="py-20 md:py-28 bg-[#0B1026] scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle light eyebrow="Conheça o espaço" title="Pronto para receber a sua equipe" subtitle={`Salão climatizado para até ${MAX_GUESTS} pessoas, com estrutura completa e estacionamento próprio.`} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PHOTOS.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setLightbox(i)}
                className={cn("group relative overflow-hidden rounded-2xl bg-white/5", i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square")}
                aria-label={`Ampliar foto ${i + 1} do espaço`}
              >
                <img src={src} alt={`Espaço do Castelo da Diversão, foto ${i + 1}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </button>
            ))}
          </div>
          {/* Tour em vídeo: bloco separado das fotos */}
          <div className="mt-14 grid items-center gap-8 md:grid-cols-2">
            <div className="text-center md:text-left">
              <span className="block text-xs font-extrabold tracking-[0.25em] uppercase" style={{ color: GOLD }}>Tour em vídeo</span>
              <h3 className="mt-3 text-2xl md:text-3xl font-black text-white">Dá o play e conheça o Castelo por dentro</h3>
              <p className="mt-3 text-white/75">Um passeio rápido pelo espaço que vai receber a confraternização da sua equipe.</p>
            </div>
            <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
              <video src={videoTrujillo} poster={thumbTrujillo} controls playsInline preload="none" className="block h-auto w-full max-h-[70vh] object-contain" />
            </div>
          </div>
          <div className="mt-10 text-center">
            <CtaButton origin="espaco">Quero conhecer o espaço</CtaButton>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-20 md:py-28 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle eyebrow="Simples assim" title="Como funciona" />
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div key={s.title} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.08 }} className="relative rounded-3xl bg-[#F7F5FB] p-6 pt-10">
                <span className="absolute -top-5 left-6 flex h-10 w-10 items-center justify-center rounded-full bg-[#E91E63] text-lg font-black text-white shadow-lg">{i + 1}</span>
                <s.icon className="h-7 w-7 text-[#0B1026]" />
                <h3 className="mt-3 text-lg font-extrabold">{s.title}</h3>
                <p className="mt-1.5 text-slate-600 leading-relaxed">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Avaliações */}
      <section className="py-16 md:py-20 bg-[#F7F5FB]">
        <motion.div {...fadeUp} className="mx-auto max-w-3xl px-4 text-center">
          <div className="flex justify-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-7 w-7 fill-[#F5B83D] text-[#F5B83D]" />)}
          </div>
          <p className="mt-4 text-2xl md:text-3xl font-black">Mais de 4.000 festas e famílias encantadas em Sorocaba</p>
          <p className="mt-3 text-slate-600">Veja o que dizem sobre o Castelo da Diversão no Google.</p>
          <a
            href="https://www.google.com/search?q=castelo+da+divers%C3%A3o+sorocaba"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-[#0B1026] px-6 py-3 font-extrabold hover:bg-[#0B1026] hover:text-white transition-colors"
          >
            Ver avaliações no Google
          </a>
        </motion.div>
      </section>

      {/* Urgência */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#E91E63] to-[#B0124A] py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center text-white">
          <CalendarCheck className="mx-auto h-10 w-10" style={{ color: GOLD }} />
          <h2 className="mt-4 text-3xl md:text-5xl font-black leading-tight">Dezembro é o mês mais procurado</h2>
          <p className="mt-4 text-lg md:text-xl text-white/85">As melhores datas para confraternização acabam primeiro. Garanta a da sua empresa.</p>
          <div className="mt-8">
            <CtaButton origin="urgencia">Ver datas disponíveis</CtaButton>
          </div>
        </div>
      </section>

      {/* Dúvidas */}
      <section className="py-20 md:py-28 bg-white">
        <div className="mx-auto max-w-3xl px-4">
          <SectionTitle eyebrow="Dúvidas frequentes" title="Perguntas que o RH sempre faz" />
          <div className="divide-y divide-slate-200 rounded-3xl border border-slate-200">
            {FAQ.map((f, i) => (
              <div key={f.q}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-extrabold"
                >
                  {f.q}
                  <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", openFaq === i && "rotate-180")} />
                </button>
                {openFaq === i && <p className="px-5 pb-5 -mt-1 text-slate-600 leading-relaxed">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Onde estamos + rodapé */}
      <footer className="bg-[#0B1026] text-white pt-16 pb-28 md:pb-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2 md:items-center">
          <div>
            <span className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white p-2"><img src={logoCastelo} alt="Castelo da Diversão" className="h-full w-full object-contain" /></span>
            <h2 className="mt-6 text-3xl md:text-4xl font-black leading-tight">Vamos planejar a confraternização da sua equipe?</h2>
            <p className="mt-3 text-white/75">Chame no WhatsApp e receba a proposta. Sem compromisso.</p>
            <div className="mt-6"><CtaButton origin="rodape">Quero um orçamento</CtaButton></div>
          </div>
          <div className="space-y-4 text-white/80">
            <p className="flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0" style={{ color: GOLD }} /> Avenida General Osório, 1442 · Trujillo, Sorocaba/SP</p>
            <p className="flex items-start gap-3"><Clock className="mt-0.5 h-5 w-5 shrink-0" style={{ color: GOLD }} /> Atendimento: segunda a sexta, 9h às 18h · sábado, 9h às 13h</p>
            <p className="flex items-start gap-3"><MessageCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: GOLD }} /> WhatsApp (15) 97403-4646</p>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <iframe
                title="Mapa do Castelo da Diversão"
                src={`https://www.google.com/maps?q=${encodeURIComponent("Avenida General Osório, 1442, Trujillo, Sorocaba - SP")}&output=embed`}
                className="h-56 w-full"
                loading="lazy"
              />
            </div>
          </div>
        </div>
        <p className="mt-12 text-center text-xs text-white/50">© {new Date().getFullYear()} Castelo da Diversão · Sorocaba/SP</p>
      </footer>

      {/* Botão fixo no celular */}
      <div className="fixed inset-x-0 bottom-0 z-40 p-3 md:hidden bg-gradient-to-t from-[#0B1026]/90 to-transparent">
        <CtaButton origin="botao-fixo" className="w-full">Pedir orçamento pelo WhatsApp</CtaButton>
      </div>

      {lightbox !== null && (
        <ImageLightbox images={PHOTOS} currentIndex={lightbox} onClose={() => setLightbox(null)} onNavigate={setLightbox} />
      )}
    </div>
  );
}
