import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 9 scenes: 130+120+140+145+135+130+125+130+200 = 1255
// 8 transitions: ~20 frames each = 160 overlap
// Total ≈ 1095 frames ≈ 36.5 seconds at 30fps
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={1100}
    fps={30}
    width={1080}
    height={1920}
  />
);
