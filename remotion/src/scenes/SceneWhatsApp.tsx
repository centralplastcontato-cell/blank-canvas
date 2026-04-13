import { AbsoluteFill, useCurrentFrame, spring, interpolate, Sequence } from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { MockWindow } from "../components/MockWindow";

const MESSAGES = [
  { from: "client", text: "Olá! Gostaria de fazer um orçamento para festa de 5 anos 🎂", time: "10:32" },
  { from: "ai", text: "Olá! 🎉 Que legal! Temos pacotes incríveis para festas de 5 anos. Qual data você prefere?", time: "10:32" },
  { from: "client", text: "Seria dia 15 de junho, sábado", time: "10:33" },
  { from: "ai", text: "Perfeito! Dia 15/06 está disponível ✅ Temos o pacote Premium com buffet completo. Envio a proposta?", time: "10:33" },
];

export const SceneWhatsApp: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <Sequence from={0} durationInFrames={140}>
        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)" }}>
          <AnimatedText text="💬 Central de Atendimento" fontSize={36} delay={0} color="rgba(255,255,255,0.9)" />
        </div>
      </Sequence>

      <MockWindow title="WhatsApp — Atendimento Inteligente" delay={10} width={1300} height={600}>
        <div style={{ display: "flex", height: "100%" }}>
          {/* Sidebar */}
          <div style={{ width: 300, borderRight: "1px solid rgba(255,255,255,0.08)", padding: 12 }}>
            {["Maria Silva 🔴", "João Santos", "Ana Costa", "Pedro Lima"].map((name, i) => {
              const sp = spring({ frame: frame - 20 - i * 4, fps: 30, config: { damping: 20 } });
              return (
                <div
                  key={i}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: i === 0 ? "rgba(59,130,246,0.15)" : "transparent",
                    opacity: interpolate(sp, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(sp, [0, 1], [-30, 0])}px)`,
                    marginBottom: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: `hsl(${200 + i * 40}, 60%, 50%)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 14, fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>
                    {name[0]}
                  </div>
                  <div>
                    <div style={{ color: "white", fontSize: 13, fontWeight: 600, fontFamily: "'Nunito', sans-serif" }}>{name}</div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "'Nunito', sans-serif" }}>Última msg: 10:33</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat */}
          <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            {MESSAGES.map((msg, i) => {
              const msgDelay = 30 + i * 15;
              const sp = spring({ frame: frame - msgDelay, fps: 30, config: { damping: 18 } });
              const opacity = interpolate(sp, [0, 1], [0, 1]);
              const scale = interpolate(sp, [0, 1], [0.9, 1]);
              const isAI = msg.from === "ai";

              return (
                <div key={i} style={{ display: "flex", justifyContent: isAI ? "flex-start" : "flex-end", opacity, transform: `scale(${scale})` }}>
                  <div
                    style={{
                      maxWidth: 420,
                      padding: "10px 16px",
                      borderRadius: isAI ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                      background: isAI ? "rgba(59,130,246,0.2)" : "rgba(34,197,94,0.15)",
                      color: "white",
                      fontSize: 13,
                      fontFamily: "'Nunito', sans-serif",
                      lineHeight: 1.5,
                    }}
                  >
                    {isAI && <div style={{ fontSize: 10, color: "#60a5fa", marginBottom: 4, fontWeight: 700 }}>🤖 IA Assistente</div>}
                    {msg.text}
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "right", marginTop: 4 }}>{msg.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </MockWindow>
    </AbsoluteFill>
  );
};
