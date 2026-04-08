import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Star, PartyPopper, Heart } from "lucide-react";
import type { LPSocialProof, LPTheme } from "@/types/landing-page";

interface DLPSocialProofProps {
  socialProof: LPSocialProof;
  theme: LPTheme;
}

const decorativeIcons = [Star, PartyPopper, Heart, Star, PartyPopper, Heart];

function AnimatedCounter({ value, isVisible }: { value: string; isVisible: boolean }) {
  // Match number with optional k/K/m/M suffix, e.g. "10k+", "500+", "1.5k", "5⭐"
  const numericMatch = value.match(/([\d.,]+)\s*(k|m)?/i);
  if (!numericMatch) return <span>{value}</span>;

  const rawNum = parseFloat(numericMatch[1].replace(/\./g, "").replace(",", "."));
  const multiplierChar = (numericMatch[2] || "").toLowerCase();
  const multiplier = multiplierChar === "k" ? 1000 : multiplierChar === "m" ? 1000000 : 1;
  const target = rawNum * multiplier;

  // Reconstruct prefix/suffix without the matched number+multiplier
  const matchStart = value.indexOf(numericMatch[0]);
  const matchEnd = matchStart + numericMatch[0].length;
  const prefix = value.slice(0, matchStart);
  const suffix = value.slice(matchEnd);

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    const duration = 1500;
    const steps = 40;
    const increment = target / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= steps) {
        setCurrent(target);
        clearInterval(interval);
      } else {
        setCurrent(increment * step);
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [isVisible, target]);

  const formatNumber = (n: number) => {
    if (multiplier >= 1000) {
      const display = n / multiplier;
      // Keep the k/m suffix as originally written
      const formatted = display % 1 === 0 ? Math.round(display).toString() : display.toFixed(1).replace(".", ",");
      return formatted + multiplierChar;
    }
    return Math.round(n).toLocaleString("pt-BR");
  };

  return (
    <span>
      {prefix}{formatNumber(current)}{suffix}
    </span>
  );
}

export function DLPSocialProof({ socialProof, theme }: DLPSocialProofProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  if (!socialProof?.enabled || !socialProof.items?.length) return null;

  return (
    <section
      ref={ref}
      className="py-16 md:py-20 relative overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${theme.primary_color}12, ${theme.primary_color}06, ${theme.primary_color}12)`,
      }}
    >
      {/* Decorative blurred circles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-20 -left-20 w-60 h-60 rounded-full blur-3xl"
          style={{ backgroundColor: theme.primary_color + "15" }}
        />
        <div
          className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full blur-3xl"
          style={{ backgroundColor: theme.secondary_color + "15" }}
        />
      </div>

      <div className="max-w-5xl mx-auto px-4 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
          {socialProof.items.map((item, i) => {
            const DecorIcon = decorativeIcons[i % decorativeIcons.length];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                whileHover={{ y: -4, scale: 1.03 }}
                className="text-center p-6 rounded-2xl shadow-lg relative overflow-hidden"
                style={{
                  backgroundColor: theme.background_color,
                  border: `2px solid ${theme.primary_color}25`,
                }}
              >
                {/* Subtle gradient overlay on card */}
                <div
                  className="absolute inset-0 opacity-[0.04]"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                  }}
                />
                {/* Decorative icon */}
                <DecorIcon
                  className="absolute top-2 right-2 w-5 h-5 opacity-20"
                  style={{ color: theme.primary_color }}
                />
                <div className="relative z-10">
                  <div
                    className="text-3xl md:text-5xl font-bold mb-2"
                    style={{ color: theme.primary_color, fontFamily: theme.font_heading }}
                  >
                    <AnimatedCounter value={item.value} isVisible={isVisible} />
                  </div>
                  <p
                    className="text-sm md:text-base font-medium opacity-80"
                    style={{ color: theme.text_color, fontFamily: theme.font_body }}
                  >
                    {item.label}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {socialProof.text && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={isVisible ? { opacity: 1 } : {}}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-center mt-8 text-base md:text-lg max-w-2xl mx-auto opacity-75"
            style={{ color: theme.text_color, fontFamily: theme.font_body }}
          >
            {socialProof.text}
          </motion.p>
        )}
      </div>
    </section>
  );
}
