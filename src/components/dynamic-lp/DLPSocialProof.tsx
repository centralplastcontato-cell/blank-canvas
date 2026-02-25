import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { LPSocialProof, LPTheme } from "@/types/landing-page";

interface DLPSocialProofProps {
  socialProof: LPSocialProof;
  theme: LPTheme;
}

function AnimatedCounter({ value, isVisible }: { value: string; isVisible: boolean }) {
  const numericMatch = value.match(/[\d.,]+/);
  const prefix = numericMatch ? value.slice(0, value.indexOf(numericMatch[0])) : "";
  const suffix = numericMatch ? value.slice(value.indexOf(numericMatch[0]) + numericMatch[0].length) : "";
  const target = numericMatch ? parseFloat(numericMatch[0].replace(/\./g, "").replace(",", ".")) : 0;
  const hasDot = numericMatch ? numericMatch[0].includes(".") : false;

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!isVisible || !numericMatch) return;
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
  }, [isVisible, target, numericMatch]);

  if (!numericMatch) return <span>{value}</span>;

  const formatNumber = (n: number) => {
    if (hasDot) {
      return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
    }
    return Math.round(n).toString();
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
      className="py-16 md:py-20"
      style={{ backgroundColor: `${theme.primary_color}08` }}
    >
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
          {socialProof.items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="text-center p-6 rounded-2xl bg-white shadow-sm"
            >
              <div
                className="text-3xl md:text-5xl font-bold mb-2"
                style={{ color: theme.primary_color, fontFamily: theme.font_heading }}
              >
                <AnimatedCounter value={item.value} isVisible={isVisible} />
              </div>
              <p
                className="text-sm md:text-base opacity-80"
                style={{ color: theme.text_color, fontFamily: theme.font_body }}
              >
                {item.label}
              </p>
            </motion.div>
          ))}
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
