import { AbsoluteFill, Sequence, TransitionSeries } from "@agenticvids/core";
import { DeckScene, DECK_LEN } from "./scenes/deck";
import { TaglineScene, TAGLINE_LEN } from "./scenes/tagline";
import { PromptScene, PROMPT_LEN } from "./scenes/prompt";
import { SiteScene, SITE_LEN } from "./scenes/site";
import { FeaturesScene, FEATURES_LEN } from "./scenes/features";
import { ConnectScene, CONNECT_LEN } from "./scenes/connect";
import { PricingScene, PRICING_LEN } from "./scenes/pricing";
import { EndScene, END_LEN } from "./scenes/end";

export const PROMO_FPS = 30;
const T = 14; // transition overlap in frames
const SCENES = [DECK_LEN, TAGLINE_LEN, PROMPT_LEN, SITE_LEN, FEATURES_LEN, CONNECT_LEN, PRICING_LEN, END_LEN];
export const PROMO_DURATION = SCENES.reduce((a, b) => a + b, 0) - T * (SCENES.length - 1);

/**
 * tryintern.dev promo: "Send a site, not a deck".
 * 1920x1080 @ 30fps, ~55s. Every scene is a Sequence; transitions overlap by T frames.
 */
export function InternPromo() {
  return (
    <AbsoluteFill className="promo" style={{ background: "#15130c" }}>
      <TransitionSeries transition={{ type: "fade", duration: T }}>
        <TransitionSeries.Item durationInFrames={DECK_LEN} name="1 · decks">
          <DeckScene />
        </TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={TAGLINE_LEN} name="2 · tagline" transition={{ type: "wipe", duration: T + 6, direction: "up" }}>
          <TaglineScene />
        </TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={PROMPT_LEN} name="3 · prompt">
          <PromptScene />
        </TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={SITE_LEN} name="4 · the site" transition={{ type: "zoom", duration: T }}>
          <SiteScene />
        </TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={FEATURES_LEN} name="5 · features">
          <FeaturesScene />
        </TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={CONNECT_LEN} name="6 · connect" transition={{ type: "slide", duration: T + 4, direction: "left" }}>
          <ConnectScene />
        </TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={PRICING_LEN} name="7 · pricing">
          <PricingScene />
        </TransitionSeries.Item>
        <TransitionSeries.Item durationInFrames={END_LEN} name="8 · end card" transition={{ type: "wipe", duration: T + 6, direction: "up" }}>
          <EndScene />
        </TransitionSeries.Item>
      </TransitionSeries>
    </AbsoluteFill>
  );
}

export { Sequence };
