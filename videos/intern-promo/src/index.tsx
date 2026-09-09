import { Composition, registerRoot } from "@clapper/core";
import "./fonts/fonts.css";
import "./theme.css";
import { InternPromo, PROMO_FPS, PROMO_DURATION } from "./promo";
import { Smoke } from "./smoke";
import { InternFilm, INTERN_FILM_DURATION } from "./film";

function Root() {
  return (
    <>
      <Composition id="intern-promo" component={InternPromo} width={1920} height={1080} fps={PROMO_FPS} durationInFrames={PROMO_DURATION} />
      <Composition id="intern-film" component={InternFilm} width={1920} height={1080} fps={30} durationInFrames={INTERN_FILM_DURATION} />
      <Composition id="smoke" component={Smoke} width={1280} height={720} fps={30} durationInSeconds={3} />
    </>
  );
}

registerRoot(Root);
