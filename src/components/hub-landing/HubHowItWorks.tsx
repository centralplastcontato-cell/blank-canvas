import { LayoutDashboard, MessageCircle, PartyPopper } from "lucide-react";
import { motion } from "framer-motion";
import { GRADIENT_TEXT } from "./lp-theme";
import { SectionHeading } from "./LpSection";

const steps = [
  {
    number: "01",
    icon: MessageCircle,
    title: "Conecte seu WhatsApp",
    description:
      "Em minutos seu número está integrado. O atendimento automático responde os leads, envia os materiais de venda e agenda visitas, sem você precisar fazer nada.",
    iconBg: "from-[#FFC93C] to-[#FF8A3D]",
  },
  {
    number: "02",
    icon: LayoutDashboard,
    title: "Organize tudo no funil",
    description:
      "Cada lead entra no funil sozinho. Você acompanha a temperatura, o histórico da conversa e o próximo passo num quadro visual e simples.",
    iconBg: "from-[#FF8A3D] to-[#F0457A]",
  },
  {
    number: "03",
    icon: PartyPopper,
    title: "Feche mais festas",
    description:
      "Com follow-up automático e a IA apontando a hora certa de chamar, sua equipe foca em fechar, não em correr atrás de quem sumiu.",
    iconBg: "from-[#F0457A] to-[#8E3FD9]",
  },
];

export default function HubHowItWorks() {
  return (
    <section id="como-funciona" className="relative scroll-mt-16 bg-[#FFF9F3] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Como funciona"
          title={
            <>
              Do primeiro “oi” ao contrato <span className={GRADIENT_TEXT}>em 3 passos</span>
            </>
          }
          description="A gente configura com você. Em até 48 horas o seu buffet já está atendendo no automático."
        />

        <div className="relative mt-16 grid gap-5 md:grid-cols-3 md:gap-6">
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-[3.25rem] hidden h-px border-t-2 border-dashed border-[#0F1222]/10 md:block" />

          {steps.map((step, idx) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: idx * 0.12 }}
              className="relative rounded-3xl border border-[#0F1222]/[0.06] bg-white p-7 shadow-[0_20px_50px_-35px_rgba(15,18,34,0.4)] sm:p-8"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${step.iconBg} shadow-[0_12px_24px_-10px_rgba(240,69,122,0.6)]`}
                >
                  <step.icon className="h-7 w-7 text-white" />
                </div>
                <span className="font-grotesque text-5xl font-bold tracking-tight text-[#0F1222]/[0.07]">{step.number}</span>
              </div>
              <h3 className="mt-6 font-grotesque text-2xl font-bold tracking-tight text-[#0F1222]">{step.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-600">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
