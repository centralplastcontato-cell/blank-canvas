import { AbsoluteFill, useCurrentFrame, interpolate, staticFile, useVideoConfig, Audio } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { Scene1Logo } from "./scenes/Scene1Logo";
import { SceneProblem } from "./scenes/SceneProblem";
import { Scene2CRM } from "./scenes/Scene2CRM";
import { Scene3WhatsApp } from "./scenes/Scene3WhatsApp";
import { Scene4Agenda } from "./scenes/Scene4Agenda";
import { Scene5Intel } from "./scenes/Scene5Intel";
import { SceneFinanceiro } from "./scenes/SceneFinanceiro";
import { Scene6Metrics } from "./scenes/Scene6Metrics";
import { Scene7CTA } from "./scenes/Scene7CTA";

const TRANSITION = 20;
const timing = springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION });
const bouncyTiming = springTiming({ config: { damping: 15, stiffness: 150 }, durationInFrames: 25 });

export const MainVideo = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Persistent animated background
  const gradientAngle = 135 + Math.sin(frame * 0.006) * 15;

  return (
    <AbsoluteFill>
      {/* Animated gradient background */}
      <AbsoluteFill style={{
        background: `linear-gradient(${gradientAngle}deg, #080c18 0%, #0d1530 25%, #1a1040 55%, #0f0a25 100%)`,
      }} />

      {/* Floating orbs */}
      <div style={{
        position: "absolute", width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
        top: 150 + Math.sin(frame * 0.012) * 50,
        left: -150 + Math.cos(frame * 0.008) * 40,
        filter: "blur(60px)",
      }} />
      <div style={{
        position: "absolute", width: 450, height: 450, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(236,72,153,0.07) 0%, transparent 70%)",
        bottom: 200 + Math.cos(frame * 0.01) * 40,
        right: -100 + Math.sin(frame * 0.015) * 30,
        filter: "blur(50px)",
      }} />
      <div style={{
        position: "absolute", width: 350, height: 350, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(34,211,238,0.05) 0%, transparent 70%)",
        top: 800 + Math.sin(frame * 0.018) * 35,
        left: 350 + Math.cos(frame * 0.012) * 25,
        filter: "blur(40px)",
      }} />

      {/* Trilha sonora */}
      <Audio
        src={staticFile("audio/trilha.mp3")}
        volume={(f) =>
          interpolate(
            f,
            [0, 2 * fps, durationInFrames - 3 * fps, durationInFrames],
            [0, 0.7, 0.7, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )
        }
      />

      {/* Scenes */}
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={200}>
          <Scene1Logo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={200}>
          <SceneProblem />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={bouncyTiming} />

        <TransitionSeries.Sequence durationInFrames={220}>
          <Scene2CRM />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={230}>
          <Scene3WhatsApp />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={210}>
          <Scene4Agenda />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={200}>
          <Scene5Intel />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-left" })} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={200}>
          <SceneFinanceiro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={200}>
          <Scene6Metrics />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={bouncyTiming} />

        <TransitionSeries.Sequence durationInFrames={300}>
          <Scene7CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
