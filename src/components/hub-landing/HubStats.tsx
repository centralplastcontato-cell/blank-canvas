import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Clock, Heart, Target, TrendingUp } from "lucide-react";
import { GRADIENT_TEXT } from "./lp-theme";

const stats = [
  { value: "+40%", label: "mais conversões", icon: TrendingUp },
  { value: "24h", label: "atendimento ativo", icon: Clock },
  { value: "3x", label: "mais agilidade", icon: Target },
  { value: "Zero", label: "leads esquecidos", icon: Heart },
];

const benefits = [
  "Atendimento 24h pelo WhatsApp, no automático",
  "Aumento médio de 40% na taxa de conversão",
  "Materiais de venda enviados na hora certa",
  "Relatórios e métricas em tempo real",
  "Implantação guiada e suporte dedicado",
  "Integração completa com as suas campanhas",
];

export default function HubStats({ onOpenWizard }: { onOpenWizard: () => void }) {
  return (
    <section id="resultados" className="relative scroll-mt-16 overflow-hidden bg-[#0F1222] py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-[280px] -top-[120px]" style={{ width: 700, height: 700, background: "radial-gradient(closest-side, rgba(255,138,61,0.15) 45%, transparent 100%)" }} />
        <div className="absolute -right-[280px] -bottom-[120px]" style={{ width: 700, height: 700, background: "radial-gradient(closest-side, rgba(142,63,217,0.20) 45%, transparent 100%)" }} />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
              Resultados
            </span>
            <h2 className="mt-5 text-balance font-grotesque text-[2.15rem] font-bold leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl">
              Por que buffets escolhem a <span className={GRADIENT_TEXT}>Celebrei?</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-white/60">
              A Celebrei nasceu dentro de um buffet infantil. Cada recurso foi testado no dia a dia de quem atende pais,
              agenda visitas e faz festa todo fim de semana.
            </p>
            <ul className="mt-8 grid gap-3.5 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5 text-[15px] leading-snug text-white/80">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#FF8A3D]" />
                  {benefit}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onOpenWizard}
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-base font-semibold text-[#0F1222] shadow-[0_16px_40px_-14px_rgba(255,255,255,0.35)] transition-all [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:bg-white/90"
            >
              Quero ver funcionando
              <ArrowRight className="h-5 w-5" />
            </button>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.45 }}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm sm:p-8"
              >
                <stat.icon className="h-5 w-5 text-white/40" />
                <p className="mt-5">
                  <span className={`inline-block font-grotesque text-4xl font-bold tracking-tight sm:text-5xl ${GRADIENT_TEXT}`}>
                    {stat.value}
                  </span>
                </p>
                <p className="mt-1.5 text-sm text-white/55">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
