import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GridBackground } from "../components/GridBackground";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800", "900"], subsets: ["latin"] });

const features = [
  { icon: "📊", title: "Kanban Visual", desc: "Arraste leads entre etapas. Veja tudo num relance." },
  { icon: "🤖", title: "Bot WhatsApp 24/7", desc: "Atendimento automático que qualifica e agenda visitas." },
  { icon: "⭐", title: "Score Inteligente", desc: "IA que prioriza os leads com maior chance de fechar." },
  { icon: "📋", title: "Propostas Automáticas", desc: "Gere orçamentos personalizados em segundos." },
  { icon: "📈", title: "Funil de Vendas", desc: "Acompanhe cada etapa da jornada do lead até o fechamento." },
];

export const Scene2CRM = () => {
  const frame = useCurrentFrame();

  const badgeOpacity = interpolate(frame, [5, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [12, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [12, 30], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill style={{ padding: "0 60px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginTop: 200 }}>
          <p style={{
            fontFamily, fontWeight: 700, fontSize: 20, color: "#6366f1",
            letterSpacing: 4, textTransform: "uppercase", margin: "0 0 12px 0", opacity: badgeOpacity,
          }}>GESTÃO DE LEADS</p>
          <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
            <h2 style={{ fontFamily, fontWeight: 900, fontSize: 56, color: "white", margin: 0, lineHeight: 1.1 }}>
              Todos os leads em{" "}<span style={{ color: "#6366f1" }}>um só lugar</span>
            </h2>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 40 }}>
          {features.map((feat, i) => {
            const delay = 35 + i * 14;
            const cardOpacity = interpolate(frame, [delay, delay + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const cardY = interpolate(frame, [delay, delay + 18], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{
                opacity: cardOpacity, transform: `translateY(${cardY}px)`,
                background: "rgba(255,255,255,0.04)", borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.06)", borderLeft: "4px solid #6366f1",
                padding: "20px 28px", display: "flex", alignItems: "center", gap: 20,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, background: "rgba(99,102,241,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{ fontSize: 26 }}>{feat.icon}</span>
                </div>
                <div>
                  <p style={{ fontFamily, fontWeight: 800, fontSize: 26, color: "white", margin: "0 0 4px 0" }}>{feat.title}</p>
                  <p style={{ fontFamily, fontWeight: 400, fontSize: 19, color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.3 }}>{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
