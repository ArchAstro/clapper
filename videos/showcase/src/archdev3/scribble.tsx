/** The Scribble rig now lives in the framework; this module keeps the film's local names. */

export type {
  ScribblePose as SPose,
  ScribblePoseKey as SKey,
  ScribblePoseName as PoseName,
} from "@clapper/core/rigs";
export {
  SCRIBBLE_GREY,
  SCRIBBLE_INK,
  SCRIBBLE_PAPER,
  SCRIBBLE_POSES as POSES,
  Scribble,
  useScribblePose as usePose,
} from "@clapper/core/rigs";
