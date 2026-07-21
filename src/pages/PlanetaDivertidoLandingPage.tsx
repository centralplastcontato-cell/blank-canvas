import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Crown, Home, Heart, UtensilsCrossed, Users, Settings,
  MapPin, Instagram, MessageCircle, CalendarClock, Sparkles, Building2,
} from "lucide-react";
import { LeadChatbot } from "@/components/landing/LeadChatbot";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Link } from "react-router-dom";
import planetaLogoImg from "@/assets/thumb-planeta-logo-transparent.png";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const STORAGE = "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11";
const STORAGE_IMG = "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/render/image/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11";

const PHOTOS = [
  `${STORAGE_IMG}/photos/1771618696306.jpg?width=1200`,
  `${STORAGE_IMG}/photos/1771618697238.jpg?width=1200`,
  `${STORAGE_IMG}/photos/1771618698659.jpg?width=1200`,
  `${STORAGE_IMG}/photos/1771618699783.jpg?width=1200`,
  `${STORAGE_IMG}/photos/1771618700704.jpg?width=1200`,
  `${STORAGE_IMG}/photos/1771618701630.jpg?width=1200`,
  
  `${STORAGE_IMG}/photos/1771618704085.jpg?width=1200`,
  `${STORAGE_IMG}/photos/1771618705413.jpg?width=1200`,
  `${STORAGE_IMG}/photos/1771618706337.jpg?width=1200`,
];

const VIDEO_URL = `${STORAGE}/videos/1771618735052.mp4`;
const VIDEO_POSTER = PHOTOS[0];

const COMPANY_ID = "6bc204ae-1311-4c67-bb6b-9ab55dae9d11";

const PLANETA_THEME = {
  primary_color: "#8B5CF6",
  secondary_color: "#F59E0B",
  background_color: "#FFFFFF",
  text_color: "#1F2937",
  font_heading: "Poppins",
  font_body: "Inter",
  button_style: "rounded" as const,
};

const DARK_BG = "#120a24";

const FESTIVE_COLORS = ["#8B5CF6", "#F59E0B", "#EC4899", "#10B981", "#3B82F6", "#F97316"];

const stats = [
  { value: "+300", suffix: "", label: "festas realizadas" },
  { value: "4,7", suffix: "★", label: "reputação no Google" },
  { value: "Zona Norte", suffix: "", label: "São Paulo · SP" },
];

const reviews = [
  {
    name: "Aline P.",
    avatar: "A",
    color: "#8B5CF6",
    text: "A Fernanda cuida de cada detalhe com muito carinho. Minha filha não para de falar na festa — foi perfeito do começo ao fim.",
  },
  {
    name: "Ricardo M.",
    avatar: "R",
    color: "#F59E0B",
    text: "Buffet caseiro incrível, espaço aconchegante e equipe presente em tudo. Muito melhor do que esperávamos. Voltaremos com certeza!",
  },
  {
    name: "Camila T.",
    avatar: "C",
    color: "#EC4899",
    text: "Lugar perfeito para quem quer uma festa íntima e especial. As crianças adoraram e os pais ficaram tranquilos o tempo todo.",
  },
];

const benefits = [
  {
    Icon: Home,
    bg: "bg-gradient-to-br from-violet-500 to-purple-700",
    text: "text-white",
    subtext: "text-white/75",
    large: true,
    title: "Espaço Aconchegante",
    description: "Ambiente familiar para até 90 convidados, pensado para festas íntimas e especiais",
  },
  {
    Icon: Heart,
    bg: "bg-amber-400",
    text: "text-amber-950",
    subtext: "text-amber-800/80",
    large: false,
    title: "Atendimento Personalizado",
    description: "Fernanda cuida de cada detalhe da sua festa pessoalmente",
  },
  {
    Icon: UtensilsCrossed,
    bg: "bg-emerald-500",
    text: "text-white",
    subtext: "text-white/75",
    large: false,
    title: "Buffet Caseiro",
    description: "Cardápio feito com carinho para crianças e adultos",
  },
  {
    Icon: Users,
    bg: "bg-pink-500",
    text: "text-white",
    subtext: "text-white/75",
    large: false,
    title: "Monitores Dedicados",
    description: "Profissionais preparados para garantir a diversão das crianças",
  },
  {
    Icon: Settings,
    bg: "bg-gray-900",
    text: "text-white",
    subtext: "text-white/55",
    large: false,
    title: "Flexibilidade",
    description: "Pacotes adaptáveis ao que você precisa, sem surpresas",
  },
];

// ─────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────
function PlanetaHeroSection({ onCtaClick }: { onCtaClick: () => void }) {
  const [activeImage, setActiveImage] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = PHOTOS[0];
    img.onload = () => setLoaded(true);
    const t = setTimeout(() => setLoaded(true), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      setActiveImage((p) => (p + 1) % PHOTOS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [loaded]);

  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden" aria-label="Seção principal">
      {/* Barra colorida festiva */}
      <div className="absolute top-0 left-0 right-0 h-1.5 z-20 flex">
        {FESTIVE_COLORS.map((color, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: color }} />
        ))}
      </div>

      {/* Background crossfade */}
      <div className="absolute inset-0">
        <AnimatePresence initial={false}>
          {PHOTOS.map((src, i) => (
            <motion.img
              key={src}
              src={src}
              alt={`Planeta Divertido - Foto ${i + 1}`}
              className={`absolute inset-0 w-full h-full object-cover${i > 0 ? " rotate-180" : ""}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: activeImage === i ? 1 : 0 }}
              transition={{ duration: 1.2 }}
              loading={i === 0 ? "eager" : "lazy"}
            />
          ))}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/65" />
      </div>

      {/* Bolinhas festivas flutuantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {FESTIVE_COLORS.map((color, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full opacity-50"
            style={{ backgroundColor: color, left: `${10 + i * 15}%`, top: `${15 + (i % 3) * 25}%` }}
            animate={{ y: [0, -20, 0], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center py-20 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6 max-w-4xl mx-auto"
        >
          {/* Logo */}
          <motion.img
            src={planetaLogoImg}
            alt="Planeta Divertido"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.7 }}
            className="w-[27rem] md:w-[33rem] lg:w-[39rem] mx-auto drop-shadow-[0_4px_20px_rgba(0,0,0,0.7)]"
          />

          {/* Eyebrow */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }} className="flex justify-center">
            <div className="inline-flex items-center gap-3">
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-purple-400/70" />
              <span className="inline-flex items-center gap-2 text-[11px] md:text-xs font-semibold tracking-[0.3em] uppercase text-purple-300/90">
                <Crown className="w-3.5 h-3.5" />
                Buffet Infantil · Zona Norte · São Paulo
              </span>
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-purple-400/70" />
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="font-['Poppins'] text-[2.25rem] sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}
          >
            O aniversário que seu filho{" "}
            <span className="block italic font-medium bg-gradient-to-r from-purple-200 via-purple-300 to-amber-400 bg-clip-text text-transparent">
              vai pedir de novo
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.7 }}
            className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto font-light leading-relaxed"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.7)" }}
          >
            Um espaço aconchegante na Zona Norte de São Paulo, com atendimento personalizado e buffet caseiro feito com carinho.
            <span className="block mt-1 text-white/75">Conheça o espaço numa visita rápida sem compromisso.</span>
          </motion.p>

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }} className="pt-2 flex flex-col items-center gap-3">
            <button
              onClick={onCtaClick}
              className="group relative inline-flex items-center gap-3 px-8 md:px-10 py-4 md:py-5 rounded-full text-white font-bold text-base md:text-lg tracking-wide shadow-[0_10px_40px_-10px_rgba(139,92,246,0.7)] hover:shadow-[0_20px_60px_-10px_rgba(139,92,246,0.9)] transition-all duration-500 hover:scale-[1.03]"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #F59E0B)" }}
            >
              <span>Agendar minha visita</span>
              <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
              <span className="absolute inset-0 rounded-full bg-purple-400/30 blur-xl -z-10 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
            <p className="text-xs text-white/60 font-light tracking-wide" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
              Sem compromisso · resposta rápida pelo WhatsApp
            </p>
          </motion.div>

          {/* Stats glassmorphism */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95, duration: 0.7 }} className="pt-6">
            <div className="relative mx-auto max-w-2xl bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl px-4 py-5">
              <div className="grid grid-cols-3 gap-2 md:gap-6">
                {stats.map((s, i) => (
                  <div key={i} className={`flex flex-col items-center text-center ${i !== 0 ? "border-l border-white/20" : ""}`}>
                    <div className="flex items-baseline gap-1">
                      <span className="font-['Poppins'] text-2xl md:text-4xl font-light text-white tracking-tight" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
                        {s.value}
                      </span>
                      {s.suffix && (
                        <span className="font-['Poppins'] text-base md:text-xl font-light text-amber-300/90">{s.suffix}</span>
                      )}
                    </div>
                    <span className="mt-1 text-[10px] md:text-xs uppercase tracking-[0.2em] text-white/70 font-medium">{s.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-300 text-amber-300" />
                ))}
                <span className="ml-2 text-[11px] text-white/60 tracking-wide">a confiança de quem já celebrou aqui</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-xs tracking-[0.3em] uppercase"
        style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
      >
        Role para descobrir
      </motion.div>
    </section>
  );
}

// ─────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────
function PlanetaReviewsSection() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-b from-white to-violet-50/40">
      <div className="absolute top-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ backgroundColor: "#8B5CF6" }} />
      <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ backgroundColor: "#F59E0B" }} />

      <div className="relative max-w-5xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          {/* Header */}
          <div className="text-center mb-12 md:mb-16">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 bg-white rounded-full px-4 py-2 shadow-md border border-gray-100">
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
                  <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
                  <path fill="#FBBC05" d="M11.69 28.18A13.6 13.6 0 0 1 10.96 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A21.97 21.97 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
                  <path fill="#EA4335" d="M24 9.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 2.96 29.93 1 24 1 15.4 1 7.96 5.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
                </svg>
                <span className="text-xs font-bold text-gray-600 tracking-wide">4,7 · Reputação verificada</span>
                <div className="flex gap-0.5 ml-1">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
                </div>
              </div>
            </div>
            <h2 className="font-['Poppins'] text-3xl md:text-5xl font-extrabold text-gray-800 leading-tight mb-3">
              Quem celebra aqui{" "}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #8B5CF6, #F59E0B)" }}>
                volta — e indica
              </span>
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Famílias que escolheram o Planeta Divertido para o momento mais especial do ano
            </p>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-3 gap-5 md:gap-6">
            {reviews.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="relative bg-white rounded-3xl p-6 md:p-7 shadow-md hover:shadow-xl transition-all border border-gray-100 overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{ backgroundColor: r.color }} />
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md" style={{ backgroundColor: r.color }}>
                    {r.avatar}
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, idx) => <Star key={idx} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                  </div>
                </div>
                <p className="font-['Poppins'] text-base md:text-lg text-gray-700 leading-relaxed italic mb-4">"{r.text}"</p>
                <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">— {r.name}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex justify-center mt-10">
            <a
              href="https://www.google.com/search?q=planeta+divertido+buffet+infantil+sao+paulo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-violet-500 hover:text-violet-600 transition-colors underline-offset-4 hover:underline"
            >
              Ver todas as avaliações no Google →
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// BENEFITS BENTO
// ─────────────────────────────────────────────
function PlanetaBenefitsSection() {
  const benefitStats = [
    { value: "+300", label: "festas realizadas" },
    { value: "4,7★", label: "reputação no Google" },
    { value: "90", label: "convidados (capacidade)" },
  ];

  return (
    <section className="py-20 md:py-28 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-12">
          <span className="block text-sm font-bold tracking-[0.3em] uppercase text-violet-500 mb-3">
            Por que escolher o Planeta Divertido
          </span>
          <h2 className="font-['Poppins'] text-4xl md:text-6xl font-extrabold text-gray-900 leading-[1.05]">
            Tudo que sua festa<br className="hidden md:block" /> precisa, num só lugar
          </h2>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {benefits.map((b, index) => {
            const Icon = b.Icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className={`
                  ${b.bg}
                  ${b.large
                    ? "col-span-2 md:col-span-1 md:row-span-2 min-h-[260px] md:min-h-[0]"
                    : "min-h-[150px]"}
                  rounded-3xl p-6 md:p-7 flex flex-col justify-between cursor-default transition-shadow hover:shadow-xl
                `}
              >
                <Icon className={`w-9 h-9 text-white ${b.large ? "w-12 h-12" : ""}`} strokeWidth={1.5} />
                <div className="mt-4">
                  <h3 className={`font-['Poppins'] font-extrabold ${b.text} ${b.large ? "text-2xl md:text-3xl mb-2" : "text-lg mb-1"}`}>
                    {b.title}
                  </h3>
                  <p className={`${b.subtext} ${b.large ? "text-base" : "text-sm"} leading-snug`}>
                    {b.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-6 grid grid-cols-3 gap-2 md:gap-4 rounded-3xl p-6 md:p-8"
          style={{ background: "linear-gradient(135deg, #ede9fe, #fef3c7)" }}
        >
          {benefitStats.map((s, i) => (
            <div key={i} className={`text-center ${i !== 0 ? "border-l border-violet-200" : ""}`}>
              <div className="font-['Poppins'] text-2xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-none">{s.value}</div>
              <div className="mt-1.5 text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-400">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// VIDEO SECTION
// ─────────────────────────────────────────────
function PlanetaVideoSection() {
  return (
    <section style={{ backgroundColor: DARK_BG }} className="py-20 md:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          {/* Left — copy */}
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="order-2 md:order-1">
            <span className="block text-sm font-bold tracking-[0.3em] uppercase text-purple-400 mb-4">Conheça o espaço</span>
            <h2 className="font-['Poppins'] text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.05] mb-6">
              Um espaço feito<br />para celebrar
            </h2>
            <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-md">
              Cada metro do Planeta Divertido foi pensado para as crianças viverem momentos únicos — e os pais descansarem tranquilos.
            </p>
            <div className="space-y-4">
              {[
                "Estrutura aconchegante na Zona Norte de São Paulo",
                "Buffet caseiro com carinho e qualidade em cada prato",
                "Atendimento personalizado pela Fernanda do início ao fim",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-violet-500 flex-shrink-0 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <span className="text-white/75 text-base">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2.5 border border-white/10">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
              </div>
              <span className="text-white/70 text-sm font-medium">4,7 · Zona Norte, São Paulo</span>
            </div>
          </motion.div>

          {/* Right — video */}
          <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1 }} className="order-1 md:order-2">
            <div className="relative rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]">
              <div className="absolute inset-0 rounded-3xl ring-2 ring-inset ring-violet-500/20 z-10 pointer-events-none" />
              <div className="aspect-[9/16] md:aspect-[4/5]">
                <video
                  src={VIDEO_URL}
                  poster={VIDEO_POSTER}
                  controls
                  className="w-full h-full object-cover"
                  preload="none"
                  playsInline
                  aria-label="Vídeo do Planeta Divertido"
                >
                  Seu navegador não suporta vídeos.
                </video>
              </div>
              {/* Location pill */}
              <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
                <MapPin className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-white text-xs font-medium">Av. Mazzei, 692 · Zona Norte, SP</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// GALLERY / INSTAGRAM
// ─────────────────────────────────────────────
function PlanetaGallerySection() {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  return (
    <section className="py-20 md:py-28 overflow-hidden" style={{ backgroundColor: "#f5f3ff" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <span className="block text-sm font-bold tracking-[0.3em] uppercase text-violet-500 mb-3">Galeria de momentos</span>
            <h2 className="font-['Poppins'] text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
              Memórias que ficam<br className="hidden md:block" /> para sempre
            </h2>
          </div>
          <a
            href="https://instagram.com/buffetplanetadivertido"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-violet-500 transition-colors group flex-shrink-0"
          >
            <Instagram className="w-4 h-4 group-hover:text-violet-500 transition-colors" />
            @buffetplanetadivertido
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 grid-flow-dense"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {PHOTOS.map((src, index) => (
            <motion.div
              key={src}
              className={`group relative rounded-2xl overflow-hidden cursor-pointer ${index === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"}`}
              onClick={() => setSelectedImage(index)}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.04 }}
              whileHover={{ scale: 1.02 }}
            >
              {/* Fundo desfocado da propria foto preenche o espaco (foto vertical em moldura quadrada) */}
              <img
                src={src}
                alt=""
                aria-hidden="true"
                className={`absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-60${index > 0 ? " rotate-180" : ""}`}
                loading="lazy"
              />
              {/* Foto inteira, sem corte */}
              <img
                src={src}
                alt={`Planeta Divertido - Foto ${index + 1}`}
                className={`absolute inset-0 w-full h-full object-contain group-hover:scale-105 transition-transform duration-500${index > 0 ? " rotate-180" : ""}`}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            </motion.div>
          ))}
        </motion.div>

        {selectedImage !== null && (
          <ImageLightbox
            images={PHOTOS}
            currentIndex={selectedImage}
            onClose={() => setSelectedImage(null)}
            onNavigate={setSelectedImage}
            rotations={PHOTOS.map((_, i) => (i > 0 ? 180 : 0))}
          />
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────
function PlanetaFooter() {
  return (
    <footer style={{ backgroundColor: DARK_BG }} className="text-white py-12">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center">
          <img src={planetaLogoImg} alt="Planeta Divertido" className="w-28 md:w-36 mx-auto mb-4" />
          <p className="text-white/70 mb-6 max-w-md mx-auto">
            Buffet infantil na Zona Norte de São Paulo — festas com carinho e atendimento personalizado.
          </p>

          <div className="flex flex-wrap justify-center gap-6 md:gap-8 mb-8">
            <a
              href="https://instagram.com/buffetplanetadivertido"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 text-white/70 hover:text-white transition-all duration-300 text-lg"
            >
              <Instagram size={24} className="transition-transform duration-300 group-hover:scale-125 group-hover:rotate-6" />
              <span>Instagram</span>
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <a
              href="https://wa.me/5511000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full transition-all duration-300 text-sm font-medium hover:scale-105 hover:shadow-lg"
            >
              <MessageCircle size={18} />
              <MapPin size={14} />
              <span>WhatsApp</span>
            </a>
          </div>

          <div className="border-t border-white/20 pt-6">
            <div className="mb-4">
              <Link to="/para-buffets" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm">
                <Building2 size={16} />
                <span>Tem um buffet? Conheça nossa plataforma de gestão</span>
              </Link>
            </div>
            <p className="text-sm text-white/50">Av. Mazzei, 692 — Zona Norte · São Paulo - SP</p>
            <p className="text-sm text-white/50 mt-1">© {new Date().getFullYear()} Planeta Divertido. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────
// FLOATING CTA
// ─────────────────────────────────────────────
function PlanetaFloatingCTA({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 2, type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 flex items-center gap-3 group"
      style={{ background: "linear-gradient(135deg, #8B5CF6, #F59E0B)" }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
        <MessageCircle className="w-7 h-7" />
      </motion.div>
      <span className="hidden sm:inline font-bold text-lg pr-2">Consultar datas disponíveis</span>
      <span className="absolute inset-0 rounded-full opacity-30 animate-ping" style={{ backgroundColor: "#8B5CF6" }} />
    </motion.button>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function PlanetaDivertidoLandingPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const openChat = () => setIsChatOpen(true);
  const closeChat = () => setIsChatOpen(false);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Planeta Divertido | Buffet Infantil na Zona Norte de São Paulo</title>
        <meta name="description" content="Buffet infantil na Zona Norte de São Paulo. Atendimento personalizado, buffet caseiro e espaço aconchegante para até 90 convidados. Agende uma visita sem compromisso." />
        <meta property="og:title" content="Planeta Divertido | Buffet Infantil · Zona Norte SP" />
        <meta property="og:description" content="Festas inesquecíveis com atendimento personalizado na Zona Norte de São Paulo." />
        <meta property="og:url" content="https://www.buffetplanetadivertido.online" />
        <meta property="og:image" content={PHOTOS[0]} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <header className="sticky top-0 z-40 backdrop-blur-md border-b border-white/10" style={{ backgroundColor: `${DARK_BG}e6` }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-sm font-bold tracking-wider uppercase text-amber-300">Planeta Divertido</span>
          <a
            href="#contato"
            onClick={(e) => { e.preventDefault(); openChat(); }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white shadow-md hover:scale-105 transition-transform"
            style={{ background: "linear-gradient(110deg, #8B5CF6, #F59E0B)" }}
          >
            Agendar visita →
          </a>
        </div>
      </header>

      <PlanetaHeroSection onCtaClick={openChat} />
      <PlanetaReviewsSection />
      <PlanetaBenefitsSection />

      <PlanetaVideoSection />
      <PlanetaGallerySection />
      <PlanetaFooter />

      <PlanetaFloatingCTA onClick={openChat} />

      <LeadChatbot
        isOpen={isChatOpen}
        onClose={closeChat}
        companyId={COMPANY_ID}
        companyName="Planeta Divertido"
        companyLogo={planetaLogoImg}
      />
    </div>
  );
}
