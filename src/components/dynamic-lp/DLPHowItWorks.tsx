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
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${theme.background_color} 0%, ${theme.primary_color}08 40%, ${theme.secondary_color}06 70%, ${theme.background_color} 100%)`,
        }}
      />

      <div className="max-w-5xl mx-auto px-4 relative z-10">
        {howItWorks.title && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <h2
              className="text-3xl md:text-5xl font-bold mb-3"
              style={{ color: theme.text_color, fontFamily: theme.font_heading }}
            >
              {howItWorks.title}
            </h2>
            <p
              className="text-base md:text-lg max-w-lg mx-auto"
              style={{ color: theme.text_color + "80", fontFamily: theme.font_body }}
            >
              Simples, rápido e sem complicação
            </p>
          </motion.div>
        )}

        {/* Mobile: vertical timeline */}
        <div className="flex flex-col gap-0 md:hidden">
          {howItWorks.steps.map((step, i) => {
            const Icon = getIcon(step.icon);
            const isLast = i === howItWorks.steps.length - 1;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="flex items-start gap-4"
              >
                {/* Timeline column */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg relative"
                    style={{
                      background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                      boxShadow: `0 8px 24px ${theme.primary_color}30`,
                    }}
                  >
                    <Icon className="w-6 h-6 text-white" />
                    <span
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-md"
                      style={{ backgroundColor: theme.secondary_color }}
                    >
                      {i + 1}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className="w-0.5 h-10 my-1 rounded-full"
                      style={{
                        background: `linear-gradient(180deg, ${theme.primary_color}40, ${theme.secondary_color}20)`,
                      }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className={`pt-1 ${isLast ? "pb-0" : "pb-6"}`}>
                  <h3
                    className="text-base font-bold mb-1"
                    style={{ color: theme.text_color, fontFamily: theme.font_heading }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: theme.text_color + "90", fontFamily: theme.font_body }}
                  >
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Desktop: horizontal cards with connector */}
        <div className="hidden md:block">
          <div className="relative">
            {/* Connector line */}
            <div
              className="absolute top-10 left-[12%] right-[12%] h-0.5 rounded-full"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${theme.primary_color}30 20%, ${theme.secondary_color}30 80%, transparent 100%)`,
              }}
            />

            <div className="grid grid-cols-4 gap-8">
              {howItWorks.steps.map((step, i) => {
                const Icon = getIcon(step.icon);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.12, duration: 0.5 }}
                    className="text-center relative"
                  >
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl relative z-10"
                      style={{
                        background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                        boxShadow: `0 12px 32px ${theme.primary_color}25`,
                      }}
                    >
                      <Icon className="w-8 h-8 text-white" />
                      <span
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md"
                        style={{ backgroundColor: theme.secondary_color }}
                      >
                        {i + 1}
                      </span>
                    </div>
                    <h3
                      className="text-lg font-bold mb-2"
                      style={{ color: theme.text_color, fontFamily: theme.font_heading }}
                    >
                      {step.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed max-w-[200px] mx-auto"
                      style={{ color: theme.text_color + "80", fontFamily: theme.font_body }}
                    >
                      {step.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
