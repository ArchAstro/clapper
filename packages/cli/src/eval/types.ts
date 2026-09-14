export type Verdict = "PASS" | "FAIL" | "BLOCKED";
export type Modality = "text" | "image" | "motion" | "audio";
export type Split = "dev" | "validation" | "holdout";
export const AXES = ["intuition", "coherence", "mechanism", "clarity", "narration"] as const;
export type Axis = (typeof AXES)[number];
export interface SourceRef {
  id: string;
  file: string;
  sha256: string;
  url: string;
  revision: string;
}
export interface Constraint {
  id: string;
  description: string;
  modality: Modality;
  sourceId?: string;
  sourceSpan?: string;
}
export interface FilmCase {
  schema: 1;
  id: string;
  family: string;
  split: Split;
  title: string;
  brief: string;
  audience: string;
  durationSeconds: [number, number];
  size: [number, number];
  fps: number;
  audioRequired: boolean;
  sources: SourceRef[];
  requiredSourceIds: string[];
  constraints: Constraint[];
  eventFrames: number[];
  transferQuestions: string[];
  oracle?: { file: string; sha256: string };
  clarification?: { question: string; answer: string };
}
export interface Suite {
  schema: 1;
  id: string;
  cases: string[];
}
export interface CommandAdapter {
  command: string[];
  env?: string[];
}
export interface Candidate {
  schema: 1;
  id: string;
  author: CommandAdapter & { model: string; version: string; settings: Record<string, unknown> };
  skill: string;
  runtime: { command: string[]; version: string; identity: string; dependencyRoot?: string };
  isolation: { kind: "container"; image: string; network: "none" | "bridge" } | { kind: "host-dev" };
  budget: {
    wallSeconds: number;
    maxTokens: number;
    maxCostUSD: number;
    repairs: number;
    maxOutputBytes: number;
  };
}
export interface Plan {
  schema: 1;
  sourceIds: string[];
  journey: string;
  levels: { name: string; journey: string; zoomTarget: string }[];
  claims: { id: string; text: string; sourceId: string; sourceSpan: string }[];
}
export interface Submission {
  schema: 1;
  entry: string;
  composition: string;
  plan: string;
  transcript: string;
  revisions: string[];
  usage: { tokens: number; costUSD: number; repairs: number };
}
export interface FileHash {
  file: string;
  sha256: string;
  bytes: number;
}
export interface Attempt {
  id: string;
  status: "running" | "succeeded" | "failed" | "budget_exhausted" | "interrupted";
  startedAt: string;
  finishedAt?: string;
  elapsedSeconds?: number;
  error?: string;
}
export interface RunRecord {
  schema: 1;
  id: string;
  pairKey: string;
  caseId: string;
  family: string;
  split: Split;
  repeat: number;
  status: "pending" | "running" | "succeeded" | "failed" | "budget_exhausted" | "interrupted";
  caseHash: string;
  candidateHash: string;
  candidate: Candidate;
  skillHash: string;
  runtimeHash?: string;
  authorHash?: string;
  suiteHash: string;
  attempts: Attempt[];
  artifacts?: FileHash[];
  videoHash?: string;
  planChecks?: string[];
  usage?: Submission["usage"];
  usageAuthority: "adapter-reported";
  elapsedSeconds?: number;
  machine?: MachineEvidence;
}
export interface MachineEvidence {
  schema: 1;
  videoHash: string;
  verdict: Verdict;
  failures: string[];
  warnings: string[];
  durationSeconds: number;
  width: number;
  height: number;
  frames: number;
  audio: { present: boolean; rmsDb: number | null; peakDb: number | null };
  sampledFrames: number[];
  svgLabels: number;
  htmlLabels: number;
  seekDeterministic: boolean;
}
export interface Campaign {
  schema: 1;
  id: string;
  createdAt: string;
  suiteHash: string;
  candidateHash: string;
  skillHash: string;
  repeats: number;
  split: Split;
  runs: string[];
}
export interface JudgeProfile {
  schema: 1;
  id: string;
  version: string;
  kind: "human" | "model";
  capabilities: Modality[];
  adapter?: CommandAdapter;
  calibration?: string;
}
export interface EvidenceRef {
  file: string;
  sha256: string;
  startSeconds: number;
  endSeconds: number;
  sourceId?: string;
  sourceSpan?: string;
}
export interface Judgment {
  schema: 1;
  runId: string;
  judgeId: string;
  judgeVersion: string;
  videoHash: string;
  observed: Modality[];
  constraints: { id: string; verdict: Verdict; reason: string; evidence: EvidenceRef[] }[];
  ratings: Partial<Record<Axis, { value: number; reason: string; evidence: EvidenceRef[] }>>;
  verdict: Verdict;
  summary: string;
}
export interface StoredJudgment {
  schema: 1;
  importedAt: string;
  profileHash: string;
  profile: JudgeProfile;
  report: Judgment;
  verdict: Verdict;
  reasons: string[];
  calibrated: boolean;
}
export interface Ballot {
  schema: 1;
  comparisonId: string;
  pairId: string;
  reviewer: string;
  choice: "A" | "B" | "tie" | "blocked";
  reason: string;
  startSeconds: number;
  endSeconds: number;
  observed: Modality[];
  media: { A: string; B: string };
}
