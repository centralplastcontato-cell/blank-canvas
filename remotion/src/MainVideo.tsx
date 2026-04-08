import { AbsoluteFill, Audio, staticFile, useVideoConfig, useCurrentFrame, interpolate } from "remotion";
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
import { SceneFinal } from "./scenes/SceneFinal";

const TRANSITION = 20;
const timing = springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION });

export const MainVideo = () => {
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* Trilha sonora */}
      <Audio
        src={staticFile("audio/trilha.mp3")}
        volume={(f) =>
          interpolate(
            f,
            [0, 2 * fps, durationInFrames - 3 * fps, durationInFrames],
            [0, 0.65, 0.65, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )
        }
      />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene1Logo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={200}>
          <SceneProblem />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={200}>
          <Scene2CRM />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={210}>
          <Scene3WhatsApp />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={200}>
          <Scene4Agenda />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={200}>
          <Scene5Intel />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={200}>
          <SceneFinanceiro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={180}>
          <Scene6Metrics />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={250}>
          <Scene7CTA />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={180}>
          <SceneFinal />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
