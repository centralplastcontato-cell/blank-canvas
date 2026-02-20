import { motion } from "framer-motion";
import {
  Castle,
  Gamepad2,
  UtensilsCrossed,
  Users,
  Camera,
  Award,
  Star,
  PartyPopper,
  Heart,
  Sparkles,
  MapPin,
  Settings,
  Home,
  Gift,
  type LucideIcon,
} from "lucide-react";
import type { LPTheme, LPBenefits as LPBenefitsType } from "@/types/landing-page";

interface DLPBenefitsProps {
  theme: LPTheme;
  companyName: string;
  benefits?: LPBenefitsType;
}

const iconMap: Record<string, LucideIcon> = {
  Castle, Gamepad2, UtensilsCrossed, Users, Camera, Award,
  Star, PartyPopper, Heart, Sparkles, MapPin, Settings, Home, Gift,
};

const defaultBenefits = [
  { icon: "Castle", title: "Estrutura Completa", description: "Espaço amplo e climatizado com capacidade para até 150 convidados", color: "from-blue-500 to-blue-600" },
  { icon: "Gamepad2", title: "Brinquedos Incríveis", description: "Pula-pula, piscina de bolinhas, playground e muito mais diversão", color: "from-green-500 to-green-600" },
  { icon: "UtensilsCrossed", title: "Buffet Completo", description: "Cardápio delicioso para crianças e adultos com opções variadas", color: "from-orange-500 to-orange-600" },
  { icon: "Users", title: "Monitores Profissionais", description: "Equipe treinada para cuidar da diversão e segurança das crianças", color: "from-purple-500 to-purple-600" },
  { icon: "Camera", title: "Espaço Instagramável", description: "Cenários decorados perfeitos para fotos memoráveis", color: "from-pink-500 to-pink-600" },
  { icon: "Award", title: "+10 Anos na Cidade", description: "Milhares de festas realizadas com excelência e alegria", color: "from-yellow-500 to-yellow-600" },
];

const defaultTrustBadges = [
  { icon: "Star", text: "4.9/5 no Google" },
  { icon: "PartyPopper", text: "+5.000 festas realizadas" },
  { icon: "Heart", text: "98% de satisfação" },
];

const colorPalette = [
  "from-blue-500 to-blue-600",
  "from-green-500 to-green-600",
  "from-orange-500 to-orange-600",
  "from-purple-500 to-purple-600",
  "from-pink-500 to-pink-600",
  "from-yellow-500 to-yellow-600",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function DLPBenefits({ theme, companyName, benefits }: DLPBenefitsProps) {
  const items = benefits?.items?.length ? benefits.items : defaultBenefits;
  const badges = benefits?.trust_badges?.length ? benefits.trust_badges : defaultTrustBadges;
  const subtitle = benefits?.subtitle || "Há mais de 10 anos transformando sonhos em realidade com festas inesquecíveis";

  return (
    <section className="py-20" style={{ backgroundColor: theme.primary_color + "0a" }}>
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: theme.text_color, fontFamily: theme.font_heading }}>
            {benefits?.title || (<>Por que escolher o{" "}
              <span style={{ background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {companyName}
              </span>?</>)}
          </h2>
          <p className="text-xl max-w-2xl mx-auto" style={{ color: theme.text_color + "99", fontFamily: theme.font_body }}>
            {subtitle}
          </p>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((benefit, index) => {
            const IconComponent = iconMap[benefit.icon] || Award;
            const color = "color" in benefit ? (benefit as any).color : colorPalette[index % colorPalette.length];
            return (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                className="relative p-6 text-center group cursor-default overflow-hidden rounded-2xl border shadow-lg"
                style={{ backgroundColor: theme.background_color, borderColor: theme.text_color + "15" }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={`relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-5 shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
                >
                  <IconComponent className="w-10 h-10 text-white" strokeWidth={1.5} />
                </motion.div>
                <h3 className="text-xl font-bold mb-2" style={{ color: theme.text_color, fontFamily: theme.font_heading }}>{benefit.title}</h3>
                <p className="relative z-10" style={{ color: theme.text_color + "99", fontFamily: theme.font_body }}>{benefit.description}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 flex flex-wrap justify-center items-center gap-4 md:gap-6"
        >
          {badges.map((badge, i) => {
            const BadgeIcon = iconMap[badge.icon] || Star;
            const badgeColor = i === 0 ? theme.secondary_color : i === 1 ? theme.primary_color : "#ef4444";
            return (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-3 px-6 py-3 rounded-full shadow-md border"
                style={{ backgroundColor: badgeColor + "15", borderColor: badgeColor + "30" }}
              >
                <BadgeIcon className="w-6 h-6" style={{ color: badgeColor, fill: i === 0 || i === 2 ? badgeColor : undefined }} />
                <span className="font-bold" style={{ color: theme.text_color, fontFamily: theme.font_body }}>{badge.text}</span>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
