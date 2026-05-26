import { motion } from "framer-motion";
import { castleBenefits } from "@/config/campaignConfig";
import { Gamepad2, PartyPopper, UtensilsCrossed, Users, Sparkles } from "lucide-react";

const bentoConfig = [
  {
    icon: Gamepad2,
    bg: "bg-gradient-to-br from-pink-500 to-rose-600",
    text: "text-white",
    subtext: "text-white/75",
    large: true,
    iconColor: "text-white/80",
  },
  {
    icon: PartyPopper,
    bg: "bg-amber-400",
    text: "text-amber-950",
    subtext: "text-amber-800/80",
    large: false,
    iconColor: "text-amber-800",
  },
  {
    icon: UtensilsCrossed,
    bg: "bg-emerald-500",
    text: "text-white",
    subtext: "text-white/75",
    large: false,
    iconColor: "text-white",
  },
  {
    icon: Users,
    bg: "bg-violet-600",
    text: "text-white",
    subtext: "text-white/75",
    large: false,
    iconColor: "text-white",
  },
  {
    icon: Sparkles,
    bg: "bg-gray-900",
    text: "text-white",
    subtext: "text-white/55",
    large: false,
    iconColor: "text-yellow-400",
  },
];

const stats = [
  { value: "9", label: "anos de tradição" },
  { value: "+4.000", label: "festas realizadas" },
  { value: "4,7★", label: "reputação no Google" },
];

export function BenefitsSection() {
  return (
    <section className="py-20 md:py-28 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Left-aligned heading — breaks "everything centered" pattern */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <span className="block text-sm font-bold tracking-[0.3em] uppercase text-pink-500 mb-3">
            Por que escolher o Castelo
          </span>
          <h2 className="font-['Nunito'] text-4xl md:text-6xl font-extrabold text-gray-900 leading-[1.05]">
            Tudo que sua festa<br className="hidden md:block" /> precisa, num só lugar
          </h2>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {castleBenefits.map((benefit, index) => {
            const cfg = bentoConfig[index];
            const Icon = cfg.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className={`
                  ${cfg.bg}
                  ${cfg.large
                    ? "col-span-2 md:col-span-1 md:row-span-2 min-h-[260px] md:min-h-[0]"
                    : "min-h-[150px]"}
                  rounded-3xl p-6 md:p-7 flex flex-col justify-between cursor-default transition-shadow hover:shadow-xl
                `}
              >
                <Icon className={`w-9 h-9 ${cfg.iconColor} ${cfg.large ? "w-12 h-12" : ""}`} strokeWidth={1.5} />
                <div className="mt-4">
                  <h3 className={`font-['Nunito'] font-extrabold ${cfg.text} ${cfg.large ? "text-2xl md:text-3xl mb-2" : "text-lg mb-1"}`}>
                    {benefit.title}
                  </h3>
                  <p className={`${cfg.subtext} ${cfg.large ? "text-base" : "text-sm"} leading-snug`}>
                    {benefit.description}
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
          className="mt-6 grid grid-cols-3 gap-2 md:gap-4 bg-gradient-to-r from-pink-50 via-rose-50 to-amber-50 rounded-3xl p-6 md:p-8"
        >
          {stats.map((s, i) => (
            <div key={i} className={`text-center ${i !== 0 ? "border-l border-pink-200" : ""}`}>
              <div className="font-['Nunito'] text-2xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-none">
                {s.value}
              </div>
              <div className="mt-1.5 text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-400">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
