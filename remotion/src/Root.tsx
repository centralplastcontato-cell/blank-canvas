import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 10 scenes: 150+200+200+210+200+200+200+180+250+180 = 1970
// 9 transitions: 20 frames each = 180 overlap
// Total ≈ 1790 frames ≈ 60 seconds at 30fps
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={1790}
    fps={30}
    width={1080}
    height={1920}
  />
);
