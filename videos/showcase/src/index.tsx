import { Composition, registerRoot } from "@clapper/core";
import "./fonts/fonts.css";
import "./theme.css";
import { Ledger, LEDGER_LEN } from "./ledger/ledger";
import { Orbit, ORBIT_LEN } from "./orbit/orbit";
import { Nimbus, NIMBUS_LEN } from "./nimbus/nimbus";
import { ArchDev, ARCHDEV_LEN } from "./archdev/archdev";
import { ArchDev2, SCENES as ARCHDEV2_SCENES } from "./archdev/archdev2";
import { ArchDev3, SCENES as ARCHDEV3_SCENES } from "./archdev3/archdev3";
import { ArchDev4, SCENES as ARCHDEV4_SCENES } from "./archdev4/archdev4";
import { ArchDev5, SCENES as ARCHDEV5_SCENES } from "./archdev5/archdev5";
import { ScribbleSheet } from "./archdev3/rigtest";

/** Three made-up SaaS products, three visual systems, one framework. */
function Root() {
  return (
    <>
      <Composition id="ledger" component={Ledger} width={1920} height={1080} fps={30} durationInFrames={LEDGER_LEN} />
      <Composition id="orbit" component={Orbit} width={1920} height={1080} fps={30} durationInFrames={ORBIT_LEN} />
      <Composition id="nimbus" component={Nimbus} width={1920} height={1080} fps={30} durationInFrames={NIMBUS_LEN} />
      <Composition id="archdev" component={ArchDev} width={1920} height={1080} fps={30} durationInFrames={ARCHDEV_LEN} />
      <Composition id="archdev2" component={ArchDev2} width={1920} height={1080} fps={30} scenes={ARCHDEV2_SCENES} />
      <Composition id="archdev3" component={ArchDev3} width={1920} height={1080} fps={30} scenes={ARCHDEV3_SCENES} />
      <Composition id="archdev4" component={ArchDev4} width={1920} height={1080} fps={30} scenes={ARCHDEV4_SCENES} />
      <Composition id="archdev5" component={ArchDev5} width={1920} height={1080} fps={30} scenes={ARCHDEV5_SCENES} />
      <Composition id="scribble-sheet" component={ScribbleSheet} width={1920} height={1080} fps={30} durationInFrames={90} />
    </>
  );
}
registerRoot(Root);
