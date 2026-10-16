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
      "A gente integra o seu número e o atendimento automático começa a responder os leads.",
    iconBg: "from-[#FFC93C] to-[#FF8A3D]",
  },
  {
    number: "02",
    icon: LayoutDashboard,
    title: "Organize tudo no funil",
    description:
      "Cada lead entra sozinho no funil, com o histórico e o próximo passo à vista.",
    iconBg: "from-[#FF8A3D] to-[#F0457A]",
  },
  {
    number: "03",
    icon: PartyPopper,
    title: "Feche mais festas",
    description:
      "Follow-up automático e a IA apontando a hora de chamar: sua equipe só foca em fechar.",
    iconBg: "from-[#F0457A] to-[#8E3FD9]",
  },
];

export default function HubHowItWorks() {
  return (
    <section id="como-funciona" className="relative scroll-mt-16 bg-[#FFF9F3] py-14 sm:py-20">
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

        <div className="relative mt-10 grid gap-3 md:grid-cols-3 md:gap-6">
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-[3.25rem] hidden h-px border-t-2 border-dashed border-[#0F1222]/10 md:block" />

          {steps.map((step, idx) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: idx * 0.12 }}
              className="relative flex gap-4 rounded-3xl border border-[#0F1222]/[0.06] bg-white p-5 shadow-[0_20px_50px_-35px_rgba(15,18,34,0.4)] sm:p-7 md:block"
            >
              <div className="flex shrink-0 items-center justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${step.iconBg} shadow-[0_12px_24px_-10px_rgba(240,69,122,0.6)] md:h-14 md:w-14`}
                >
                  <step.icon className="h-6 w-6 text-white md:h-7 md:w-7" />
                </div>
                <span className="hidden font-grotesque text-5xl font-bold tracking-tight text-[#0F1222]/[0.07] md:inline">{step.number}</span>
              </div>
              <div>
                <h3 className="font-grotesque text-lg font-bold tracking-tight text-[#0F1222] md:mt-6 md:text-2xl">{step.title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-slate-600 md:mt-3 md:text-base">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
