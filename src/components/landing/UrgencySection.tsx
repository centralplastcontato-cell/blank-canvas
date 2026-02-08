import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, AlertTriangle, CalendarClock } from "lucide-react";
import { campaignConfig } from "@/config/campaignConfig";

interface UrgencySectionProps {
  onCtaClick: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function UrgencySection({ onCtaClick }: UrgencySectionProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const endDate = new Date(campaignConfig.urgency.endDate);
      const now = new Date();
      const difference = endDate.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-16 bg-gradient-to-br from-accent via-accent/90 to-accent/70 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-20 h-20 rounded-full bg-accent-foreground/10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="section-container relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="inline-flex items-center gap-2 bg-accent-foreground/20 backdrop-blur-sm text-accent-foreground px-6 py-3 rounded-full mb-6"
          >
            <AlertTriangle className="w-5 h-5" />
            <span className="font-bold text-lg">ATENÇÃO!</span>
          </motion.div>

          <h2 className="text-3xl md:text-5xl font-display font-bold text-accent-foreground mb-4">
            {campaignConfig.urgency.message}
          </h2>

          <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-8">
            {/* Vagas Restantes */}
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="bg-accent-foreground/20 backdrop-blur-sm rounded-2xl p-6 text-center min-w-[150px]"
            >
              <p className="text-5xl font-display font-bold text-accent-foreground">
                {campaignConfig.urgency.spotsLeft}
              </p>
              <p className="text-accent-foreground/80 font-medium">festas restantes</p>
            </motion.div>

            {/* Contagem Regressiva */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-accent-foreground/20 backdrop-blur-sm rounded-2xl p-4 md:p-6"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <CalendarClock className="w-5 h-5 text-accent-foreground" />
                <p className="text-sm font-medium text-accent-foreground/80">Promoção termina em:</p>
              </div>
              <div className="flex gap-2 md:gap-3">
                <div className="bg-accent-foreground/30 rounded-xl px-3 py-2 md:px-4 md:py-3 text-center min-w-[50px] md:min-w-[60px]">
                  <p className="text-2xl md:text-3xl font-display font-bold text-accent-foreground">
                    {String(timeLeft.days).padStart(2, '0')}
                  </p>
                  <p className="text-xs text-accent-foreground/70">dias</p>
                </div>
                <div className="bg-accent-foreground/30 rounded-xl px-3 py-2 md:px-4 md:py-3 text-center min-w-[50px] md:min-w-[60px]">
                  <p className="text-2xl md:text-3xl font-display font-bold text-accent-foreground">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </p>
                  <p className="text-xs text-accent-foreground/70">horas</p>
                </div>
                <div className="bg-accent-foreground/30 rounded-xl px-3 py-2 md:px-4 md:py-3 text-center min-w-[50px] md:min-w-[60px]">
                  <p className="text-2xl md:text-3xl font-display font-bold text-accent-foreground">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </p>
                  <p className="text-xs text-accent-foreground/70">min</p>
                </div>
                <div className="bg-accent-foreground/30 rounded-xl px-3 py-2 md:px-4 md:py-3 text-center min-w-[50px] md:min-w-[60px]">
                  <p className="text-2xl md:text-3xl font-display font-bold text-accent-foreground">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </p>
                  <p className="text-xs text-accent-foreground/70">seg</p>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.button
            onClick={onCtaClick}
            className="bg-secondary text-secondary-foreground font-bold py-4 px-10 rounded-full text-xl shadow-floating hover:scale-105 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            Garantir Minha Vaga Agora! 🚀
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
