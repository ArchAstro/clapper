/** Beats are quarter-note beats; musical time never rounds to video frames. */
export type Pitch = string | number;
export interface Note {
  at: number;
  duration: number;
  pitch: Pitch;
  velocity?: number;
}
export interface Clip {
  at?: number;
  notes: Note[];
  repeat?: number;
  length?: number;
  transpose?: number;
}
export interface Control {
  at: number;
  cc: number;
  value: number;
}
export interface Bend {
  at: number;
  value: number;
}
export interface AutomationPoint {
  at: number;
  value: number;
}
export interface Track {
  id: string;
  instrument: string;
  clips: Clip[];
  program?: number;
  drums?: boolean;
  gain?: number;
  pan?: number;
  reverb?: number;
  drive?: number;
  preampDb?: number;
  mute?: boolean;
  solo?: boolean;
  controls?: Control[];
  bends?: Bend[];
  gainAutomation?: AutomationPoint[];
  humanize?: { timing?: number; velocity?: number };
  swing?: number;
}
export interface Score {
  title: string;
  tempo: number | { at: number; bpm: number }[];
  meter?: [number, number] | { at: number; meter: [number, number] }[];
  seed?: number;
  length?: number;
  tail?: number;
  tracks: Track[];
  markers?: { name: string; at: number }[];
}
export interface CompiledNote {
  tick: number;
  durationTicks: number;
  midi: number;
  velocity: number;
  seconds: number;
  durationSeconds: number;
}
export interface CompiledTrack extends Omit<Track, "clips"> {
  channel: number;
  notes: CompiledNote[];
}
export interface CompiledScore {
  schema: 1;
  title: string;
  ppq: number;
  seed: number;
  tempos: { tick: number; bpm: number }[];
  meters: { tick: number; numerator: number; denominator: number }[];
  tracks: CompiledTrack[];
  lengthTicks: number;
  musicSeconds: number;
  durationSeconds: number;
  markers: { name: string; tick: number; seconds: number }[];
}
