import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 50 seconds at 30fps = 1500 frames
// Transitions overlap: 6 transitions × 20 frames = 120 frames reduction
// So total = scene frames - 120
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={1500}
    fps={30}
    width={1080}
    height={1920}
  />
);
