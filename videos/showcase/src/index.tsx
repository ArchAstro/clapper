import { Composition, registerRoot } from "@archastro/clapper-core";
import "./fonts/fonts.css";
import "./theme.css";
import { LEDGER_LEN, Ledger } from "./ledger/ledger";
import { NIMBUS_LEN, Nimbus } from "./nimbus/nimbus";
import { ORBIT_LEN, Orbit } from "./orbit/orbit";

/** Three made-up SaaS products, three visual systems, one framework. */
function Root() {
  return (
    <>
      <Composition
        id="ledger"
        component={Ledger}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={LEDGER_LEN}
      />
      <Composition
        id="orbit"
        component={Orbit}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={ORBIT_LEN}
      />
      <Composition
        id="nimbus"
        component={Nimbus}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={NIMBUS_LEN}
      />
    </>
  );
}
registerRoot(Root);
