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
} from "lucide-react";
import type { LPTheme } from "@/types/landing-page";

interface DLPBenefitsProps {
  theme: LPTheme;
  companyName: string;
}

const defaultBenefits = [
  {
    icon: Castle,
    title: "Estrutura Completa",
    description: "Espaço amplo e climatizado com capacidade para até 150 convidados",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: Gamepad2,
    title: "Brinquedos Incríveis",
    description: "Pula-pula, piscina de bolinhas, playground e muito mais diversão",
    color: "from-green-500 to-green-600",
  },
  {
    icon: UtensilsCrossed,
    title: "Buffet Completo",
    description: "Cardápio delicioso para crianças e adultos com opções variadas",
    color: "from-orange-500 to-orange-600",
  },
  {
    icon: Users,
    title: "Monitores Profissionais",
    description: "Equipe treinada para cuidar da diversão e segurança das crianças",
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: Camera,
    title: "Espaço Instagramável",
    description: "Cenários decorados perfeitos para fotos memoráveis",
    color: "from-pink-500 to-pink-600",
  },
  {
    icon: Award,
    title: "+10 Anos na Cidade",
    description: "Milhares de festas realizadas com excelência e alegria",
    color: "from-yellow-500 to-yellow-600",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function DLPBenefits({ theme, companyName }: DLPBenefitsProps) {
  return (
    <section
      className="py-20"
      style={{ backgroundColor: theme.primary_color + "0a" }}
    >
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ color: theme.text_color, fontFamily: theme.font_heading }}
          >
            Por que escolher o{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {companyName}
            </span>
            ?
          </h2>
          <p
            className="text-xl max-w-2xl mx-auto"
            style={{ color: theme.text_color + "99", fontFamily: theme.font_body }}
          >
            Há mais de 10 anos transformando sonhos em realidade com festas inesquecíveis
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {defaultBenefits.map((benefit, index) => {
            const IconComponent = benefit.icon;
            return (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                className="relative p-6 text-center group cursor-default overflow-hidden rounded-2xl border shadow-lg"
                style={{
                  backgroundColor: theme.background_color,
                  borderColor: theme.text_color + "15",
                }}
              >
                {/* Background glow on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                />

                {/* Icon */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={`relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-5 shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
                >
                  <IconComponent className="w-10 h-10 text-white" strokeWidth={1.5} />
                </motion.div>

                <h3
                  className="text-xl font-bold mb-2 transition-colors"
                  style={{ color: theme.text_color, fontFamily: theme.font_heading }}
                >
                  {benefit.title}
                </h3>
                <p
                  className="relative z-10"
                  style={{ color: theme.text_color + "99", fontFamily: theme.font_body }}
                >
                  {benefit.description}
                </p>
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
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 px-6 py-3 rounded-full shadow-md border"
            style={{
              backgroundColor: theme.secondary_color + "15",
              borderColor: theme.secondary_color + "30",
            }}
          >
            <Star className="w-6 h-6" style={{ color: theme.secondary_color, fill: theme.secondary_color }} />
            <span className="font-bold" style={{ color: theme.text_color, fontFamily: theme.font_body }}>
              4.9/5 no Google
            </span>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 px-6 py-3 rounded-full shadow-md border"
            style={{
              backgroundColor: theme.primary_color + "10",
              borderColor: theme.primary_color + "25",
            }}
          >
            <PartyPopper className="w-6 h-6" style={{ color: theme.primary_color }} />
            <span className="font-bold" style={{ color: theme.text_color, fontFamily: theme.font_body }}>
              +5.000 festas realizadas
            </span>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 px-6 py-3 rounded-full shadow-md border"
            style={{
              backgroundColor: "#ef444415",
              borderColor: "#ef444430",
            }}
          >
            <Heart className="w-6 h-6" style={{ color: "#ef4444", fill: "#ef4444" }} />
            <span className="font-bold" style={{ color: theme.text_color, fontFamily: theme.font_body }}>
              98% de satisfação
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
