import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Sparkles,
  PartyPopper,
  UtensilsCrossed,
  Users,
  CheckCircle2,
  ChevronDown,
  MapPin,
  Instagram,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LeadChatbot } from "@/components/landing/LeadChatbot";
import megamagicLogo from "@/assets/megamagic-logo-transparent.png";
import megamagicMascot from "@/assets/megamagic-mascot-transparent.png";

// ─── Constants ──────────────────────────────────────────────────────────────

const COMPANY_ID = "84f6a011-a1e1-4a2a-96f6-38da92a319ce";
const COMPANY_NAME = "Mega Magic";

const HERO_BG =
  "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/84f6a011-a1e1-4a2a-96f6-38da92a319ce/photos/1775611871035.jpeg";

const GALLERY = [
  "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/84f6a011-a1e1-4a2a-96f6-38da92a319ce/photos/1775611871035.jpeg",
  "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/84f6a011-a1e1-4a2a-96f6-38da92a319ce/photos/1775611872258.jpeg",
  "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/84f6a011-a1e1-4a2a-96f6-38da92a319ce/photos/1775611872562.jpeg",
  "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/84f6a011-a1e1-4a2a-96f6-38da92a319ce/photos/1775611872921.jpeg",
  "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/84f6a011-a1e1-4a2a-96f6-38da92a319ce/photos/1775611873242.jpeg",
  "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/84f6a011-a1e1-4a2a-96f6-38da92a319ce/photos/1775611873580.jpeg",
  "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/84f6a011-a1e1-4a2a-96f6-38da92a319ce/photos/1775611873945.jpeg",
  "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/84f6a011-a1e1-4a2a-96f6-38da92a319ce/photos/1775611993083.jpeg",
  "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/84f6a011-a1e1-4a2a-96f6-38da92a319ce/photos/1775612016244.jpeg",
  "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/sales-materials/megamegic/collections/1775847272015_0.jpg",
];

const MAGIC_COLORS = ["#7B2D8E", "#D4A017", "#9C4DBE", "#F5C518", "#B060D0", "#E8B800"];

const STATS = [
  { value: "500+", label: "festas realizadas" },
  { value: "10k+", label: "crianças felizes" },
  { value: "4,5 ★", label: "no Google" },
];

const BENEFITS = [
  {
    icon: PartyPopper,
    title: "Diversão Garantida",
    desc: "Brinquedos e atividades para todas as idades, do bebê ao adulto",
    bg: "bg-gradient-to-br from-purple-600 to-purple-800",
    text: "text-white",
    sub: "text-white/70",
    large: true,
  },
  {
    icon: UtensilsCrossed,
    title: "Cardápio Completo",
    desc: "Comida deliciosa para crianças e adultos incluída no pacote",
    bg: "bg-amber-400",
    text: "text-amber-950",
    sub: "text-amber-800/80",
    large: false,
  },
  {
    icon: Sparkles,
    title: "Ambiente Temático",
    desc: "Do Homem-Aranha à Frozen — o espaço abraça o tema favorito do seu filho",
    bg: "bg-gradient-to-br from-yellow-400 to-amber-500",
    text: "text-amber-950",
    sub: "text-amber-800/80",
    large: false,
  },
  {
    icon: Users,
    title: "Equipe Dedicada",
    desc: "Monitores e recreadores treinados para cuidar de tudo",
    bg: "bg-violet-600",
    text: "text-white",
    sub: "text-white/70",
    large: false,
  },
  {
    icon: CheckCircle2,
    title: "Tudo Incluído",
    desc: "Sem surpresas. Um pacote completo para você aproveitar o dia",
    bg: "bg-gray-900",
    text: "text-white",
    sub: "text-yellow-400/80",
    large: false,
  },
];

const TESTIMONIALS = [
  {
    name: "Ana Paula",
    text: "Festa maravilhosa! Meu filho amou cada segundo. Equipe super atenciosa e espaço incrível!",
    rating: 5,
    initial: "A",
    color: "#7B2D8E",
  },
  {
    name: "Carla Souza",
    text: "Melhor buffet que já fizemos festa! Organização impecável e as crianças se divertiram muito.",
    rating: 5,
    initial: "C",
    color: "#D4A017",
  },
  {
    name: "Marcos Silva",
    text: "Superou nossas expectativas! Decoração linda e comida deliciosa. Super recomendo!",
    rating: 5,
    initial: "M",
    color: "#9C4DBE",
  },
];

// ─── Header ──────────────────────────────────────────────────────────────────

function MMHeader({ onCta }: { onCta: () => void }) {
  return (
    <header className="sticky top-0 z-40 bg-[#1a0a2e]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <img src={megamagicLogo} alt="Mega Magic" className="h-8 w-auto" />
        <button
          onClick={onCta}
          className="text-sm font-bold px-5 py-2 rounded-full text-[#1a0a2e]"
          style={{ background: "linear-gradient(90deg, #D4A017, #F5C518)" }}
        >
          Solicitar Orçamento
        </button>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function MMHero({ onCta }: { onCta: () => void }) {
  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
      {/* Festive top bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 z-20 flex">
        {MAGIC_COLORS.map((c, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: c }} />
        ))}
      </div>

      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={HERO_BG}
          alt="Mega Magic"
          className="w-full h-full object-cover scale-105"
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0a2e]/70 via-[#1a0a2e]/40 to-[#1a0a2e]/75" />
      </div>

      {/* Floating sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {MAGIC_COLORS.map((c, i) => (
          <motion.div
            key={i}
            className="absolute w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: c, left: `${8 + i * 16}%`, top: `${20 + (i % 3) * 22}%`, opacity: 0.55 }}
            animate={{ y: [0, -24, 0], opacity: [0.35, 0.7, 0.35] }}
            transition={{ duration: 2.5 + i * 0.5, repeat: Infinity, delay: i * 0.35 }}
          />
        ))}
      </div>

      {/* Mascot — floating right */}
      <motion.img
        src={megamagicMascot}
        alt="Mascote Mega Magic"
        className="absolute z-10 w-32 sm:w-44 md:w-56 drop-shadow-2xl pointer-events-none"
        style={{ right: "2%", bottom: "12%" }}
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0, y: [0, -14, 0] }}
        transition={{
          opacity: { delay: 0.9, duration: 0.7 },
          x: { delay: 0.9, duration: 0.9, type: "spring" },
          y: { delay: 1.6, duration: 3.2, repeat: Infinity, ease: "easeInOut" },
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center py-24">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6"
        >
          <img
            src={megamagicLogo}
            alt="Mega Magic"
            className="w-44 sm:w-56 md:w-64 mx-auto drop-shadow-2xl"
          />

          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-white"
            style={{ textShadow: "0 2px 16px rgba(0,0,0,0.7)" }}
          >
            A Festa Mágica que{" "}
            <span
              className="block"
              style={{
                backgroundImage: "linear-gradient(90deg, #D4A017, #F5C518, #D4A017)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Seu Filho Sempre Sonhou
            </span>
          </h1>

          <p
            className="text-lg sm:text-xl text-white/80 max-w-xl mx-auto"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
          >
            Diversão, decoração temática e cardápio completo em São Paulo.
            Cada detalhe pensado para uma celebração inesquecível.
          </p>

          <motion.button
            onClick={onCta}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            className="inline-block px-10 py-4 text-lg font-bold rounded-full text-[#1a0a2e] shadow-2xl"
            style={{
              background: "linear-gradient(90deg, #D4A017, #F5C518)",
              boxShadow: "0 8px 32px rgba(212,160,23,0.45)",
            }}
          >
            ✨ Solicitar Orçamento Grátis
          </motion.button>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6"
        >
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 shadow-xl"
            >
              <span
                className="text-xl font-bold"
                style={{ color: "#F5C518", textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
              >
                {s.value}
              </span>
              <span className="text-sm text-white/70">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      >
        <ChevronDown className="w-7 h-7 text-white/40" />
      </motion.div>
    </section>
  );
}

// ─── Benefits ─────────────────────────────────────────────────────────────────

function MMBenefits({ onCta }: { onCta: () => void }) {
  return (
    <section className="py-20 md:py-28 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <p className="text-sm font-bold uppercase tracking-[0.22em] mb-3" style={{ color: "#7B2D8E" }}>
            Por que o Mega Magic?
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight max-w-lg">
            Tudo que uma festa perfeita precisa
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-md">
            Cada detalhe pensado para você e seu filho aproveitarem sem preocupação.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`${b.bg} ${b.large ? "col-span-2 md:col-span-1 md:row-span-2" : ""} rounded-2xl p-6 flex flex-col justify-between min-h-[140px] md:min-h-[160px]`}
              >
                <Icon className={`w-7 h-7 ${b.text} opacity-80`} />
                <div>
                  <p className={`font-bold text-base md:text-lg ${b.text}`}>{b.title}</p>
                  <p className={`text-sm mt-1 ${b.sub}`}>{b.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-10 text-center"
        >
          <button
            onClick={onCta}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-white shadow-lg hover:scale-105 transition-transform"
            style={{ background: "linear-gradient(135deg, #7B2D8E, #9C4DBE)" }}
          >
            Quero saber mais
          </button>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

function MMGallery() {
  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: "#1a0a2e" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <p className="text-sm font-bold uppercase tracking-[0.22em] mb-3" style={{ color: "#D4A017" }}>
            Galeria
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Conheça Nosso Espaço
          </h2>
          <p className="mt-3 text-white/50 max-w-md mx-auto">
            Um ambiente mágico preparado para encantar crianças e adultos.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
          {GALLERY.map((url, i) => (
            <motion.div
              key={url}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.45, delay: (i % 4) * 0.07 }}
              className={`overflow-hidden rounded-xl border border-white/10 ${i === 0 ? "col-span-2 row-span-2" : ""}`}
              style={{ aspectRatio: i === 0 ? "1/1" : "4/3" }}
            >
              <img
                src={url}
                alt={`Mega Magic foto ${i + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    number: "01",
    title: "Solicite um Orçamento",
    desc: "Preencha o formulário com os dados da festa — mês, número de convidados e tema.",
    color: "#7B2D8E",
  },
  {
    number: "02",
    title: "Escolha o Pacote",
    desc: "Nossa equipe apresenta as melhores opções para você e sua família.",
    color: "#D4A017",
  },
  {
    number: "03",
    title: "É só Celebrar!",
    desc: "Chegue no dia e aproveite cada momento. A gente cuida de tudo.",
    color: "#9C4DBE",
  },
];

function MMHowItWorks({ onCta }: { onCta: () => void }) {
  return (
    <section className="py-20 md:py-28 bg-[#FDFBF7]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-sm font-bold uppercase tracking-[0.22em] mb-3" style={{ color: "#7B2D8E" }}>
            Como Funciona
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            3 passos para a festa dos sonhos
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-10 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-purple-200 via-amber-300 to-purple-200" />

          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: i * 0.12 }}
              className="flex flex-col items-center text-center gap-4"
            >
              <div
                className="relative w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg z-10"
                style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}cc)` }}
              >
                {step.number}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-14 text-center"
        >
          <button
            onClick={onCta}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-full font-bold text-[#1a0a2e] shadow-xl hover:scale-105 transition-transform text-lg"
            style={{ background: "linear-gradient(90deg, #D4A017, #F5C518)" }}
          >
            ✨ Começar agora
          </button>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function MMTestimonials() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-sm font-bold uppercase tracking-[0.22em] mb-3" style={{ color: "#7B2D8E" }}>
            Depoimentos
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            O que dizem nossas famílias
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-[#FDFBF7] rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col gap-4"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed flex-1">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow"
                  style={{ backgroundColor: t.color }}
                >
                  {t.initial}
                </div>
                <span className="font-semibold text-gray-800 text-sm">{t.name}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Google badge */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-10 flex justify-center"
        >
          <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-full px-6 py-3 shadow-sm">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="font-bold text-gray-800">4,5</span>
            <span className="text-gray-400 text-sm">no Google · 337 avaliações</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Offer / CTA ──────────────────────────────────────────────────────────────

function MMOffer({ onCta }: { onCta: () => void }) {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, #4a1260 0%, #7B2D8E 50%, #9C4DBE 100%)" }}
      />
      {/* Decorative sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: i % 2 === 0 ? "#F5C518" : "#ffffff",
              left: `${10 + i * 11}%`,
              top: `${15 + (i % 3) * 30}%`,
              opacity: 0.4,
            }}
            animate={{ y: [0, -20, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7 }}
          className="space-y-6"
        >
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-yellow-300/80">
            Oferta
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
            Garanta a Festa Perfeita{" "}
            <span style={{ color: "#F5C518" }}>do Seu Filho</span>
          </h2>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Solicite um orçamento personalizado e descubra as condições especiais para a data da sua escolha.
          </p>

          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-5 py-2.5 text-sm text-yellow-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            Datas limitadas para os próximos meses!
          </div>

          <motion.button
            onClick={onCta}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            className="inline-block px-12 py-4 text-lg font-bold rounded-full text-[#1a0a2e] shadow-2xl"
            style={{
              background: "linear-gradient(90deg, #D4A017, #F5C518)",
              boxShadow: "0 8px 40px rgba(212,160,23,0.5)",
            }}
          >
            ✨ Quero Meu Orçamento
          </motion.button>

          <p className="text-white/40 text-sm">Sem compromisso · Orçamento imediato</p>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function MMFooter() {
  return (
    <footer style={{ backgroundColor: "#0d0618" }} className="py-12 border-t border-white/10">
      <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center sm:items-start gap-3">
          <img src={megamagicLogo} alt="Mega Magic" className="h-10 w-auto opacity-90" />
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <MapPin className="w-4 h-4" />
            <span>São Paulo - SP</span>
          </div>
        </div>

        <div className="text-center sm:text-right space-y-1">
          <p className="text-white/25 text-xs">
            © 2026 Buffet Mega Magic Premium. Todos os direitos reservados.
          </p>
          <p className="text-white/20 text-xs">
            Plataforma por{" "}
            <a href="https://celebrei.com.br" className="underline hover:text-white/40 transition-colors">
              Celebrei
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Floating CTA ─────────────────────────────────────────────────────────────

function MMFloatingCTA({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 2.5, type: "spring", stiffness: 280, damping: 22 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-3 pr-5 pl-4 py-3.5 rounded-full font-bold text-[#1a0a2e] shadow-2xl hover:scale-105 transition-transform"
      style={{
        background: "linear-gradient(90deg, #D4A017, #F5C518)",
        boxShadow: "0 6px 28px rgba(212,160,23,0.5)",
      }}
      whileHover={{ scale: 1.07 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <MessageCircle className="w-6 h-6" />
      </motion.div>
      <span className="hidden sm:inline text-base">Consultar datas</span>
      <span className="absolute inset-0 rounded-full bg-yellow-400/30 animate-ping" />
    </motion.button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MegaMagicLandingPage() {
  const [chatOpen, setChatOpen] = useState(false);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [lpBotConfig, setLpBotConfig] = useState<any>(null);

  useEffect(() => {
    async function fetchConfig() {
      const [{ data: onb }, { data: botArr }] = await Promise.all([
        supabase.rpc("get_onboarding_public_fields", { _company_id: COMPANY_ID }),
        supabase.rpc("get_lp_bot_settings_public", { _company_id: COMPANY_ID }),
      ]);
      const onbRow = Array.isArray(onb) ? onb[0] : onb;
      if (onbRow?.whatsapp_numbers?.length > 0) setWhatsapp(onbRow.whatsapp_numbers[0]);
      const bot = Array.isArray(botArr) ? botArr[0] : botArr;
      if (bot) setLpBotConfig(bot);
    }
    fetchConfig();
  }, []);

  const openChat = () => setChatOpen(true);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FDFBF7" }}>
      <Helmet>
        <title>Buffet Mega Magic | Festa Infantil em São Paulo</title>
        <meta
          name="description"
          content="O lugar perfeito para a festa dos sonhos do seu filho! Diversão garantida, decoração temática e cardápio completo em São Paulo."
        />
        <meta property="og:title" content="Buffet Mega Magic | Festa Infantil em São Paulo" />
        <meta property="og:description" content="500+ festas realizadas. 10k+ crianças felizes. 5,0⭐ no Google." />
        <meta property="og:image" content={HERO_BG} />
      </Helmet>

      <MMHeader onCta={openChat} />
      <MMHero onCta={openChat} />
      <MMBenefits onCta={openChat} />
      <MMGallery />
      <MMHowItWorks onCta={openChat} />
      <MMTestimonials />
      <MMOffer onCta={openChat} />
      <MMFooter />

      <MMFloatingCTA onClick={openChat} />

      <LeadChatbot
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        companyId={COMPANY_ID}
        companyName={COMPANY_NAME}
        companyLogo={megamagicLogo}
        companyWhatsApp={whatsapp ?? undefined}
        lpBotConfig={lpBotConfig}
      />
    </div>
  );
}
