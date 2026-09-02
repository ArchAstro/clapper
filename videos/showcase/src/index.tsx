import { Composition, registerRoot } from "@agenticvids/core";
import "./fonts/fonts.css";
import "./theme.css";
import { Ledger, LEDGER_LEN } from "./ledger/ledger";
import { Orbit, ORBIT_LEN } from "./orbit/orbit";
import { Nimbus, NIMBUS_LEN } from "./nimbus/nimbus";
import { ArchDev, ARCHDEV_LEN } from "./archdev/archdev";
import { ArchDev2, ARCHDEV2_LEN } from "./archdev/archdev2";

/** Three made-up SaaS products, three visual systems, one framework. */
function Root() {
  return (
    <>
      <Composition id="ledger" component={Ledger} width={1920} height={1080} fps={30} durationInFrames={LEDGER_LEN} />
      <Composition id="orbit" component={Orbit} width={1920} height={1080} fps={30} durationInFrames={ORBIT_LEN} />
      <Composition id="nimbus" component={Nimbus} width={1920} height={1080} fps={30} durationInFrames={NIMBUS_LEN} />
      <Composition id="archdev" component={ArchDev} width={1920} height={1080} fps={30} durationInFrames={ARCHDEV_LEN} />
      <Composition id="archdev2" component={ArchDev2} width={1920} height={1080} fps={30} durationInFrames={ARCHDEV2_LEN} />
    </>
  );
}
registerRoot(Root);
