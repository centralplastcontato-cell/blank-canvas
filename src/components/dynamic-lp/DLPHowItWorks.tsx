import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import type { LPHowItWorks, LPTheme } from "@/types/landing-page";

interface DLPHowItWorksProps {
  howItWorks: LPHowItWorks;
  theme: LPTheme;
}

function getIcon(name: string) {
  const Icon = (LucideIcons as any)[name] || (LucideIcons as any).CircleDot;
  return Icon;
}

export function DLPHowItWorks({ howItWorks, theme }: DLPHowItWorksProps) {
  if (!howItWorks?.enabled || !howItWorks.steps?.length) return null;

  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: `${theme.primary_color}06` }}>
      <div className="max-w-6xl mx-auto px-4">
        {howItWorks.title && (
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-center mb-12"
            style={{ color: theme.text_color, fontFamily: theme.font_heading }}
          >
            {howItWorks.title}
          </motion.h2>
        )}

        <div className="relative">
          {/* Connector line (desktop) */}
          <div
            className="hidden md:block absolute top-16 left-[10%] right-[10%] h-0.5 opacity-20"
            style={{ backgroundColor: theme.primary_color }}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {howItWorks.steps.map((step, i) => {
              const Icon = getIcon(step.icon);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="text-center relative"
                >
                  <div
                    className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md relative z-10"
                    style={{ backgroundColor: theme.primary_color }}
                  >
                    <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                  </div>
                  <span
                    className="text-xs font-bold opacity-50 mb-1 block"
                    style={{ color: theme.primary_color, fontFamily: theme.font_body }}
                  >
                    Passo {i + 1}
                  </span>
                  <h3
                    className="text-sm md:text-base font-bold mb-1"
                    style={{ color: theme.text_color, fontFamily: theme.font_heading }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-xs md:text-sm opacity-70"
                    style={{ color: theme.text_color, fontFamily: theme.font_body }}
                  >
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
