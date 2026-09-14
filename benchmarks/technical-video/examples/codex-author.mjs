// Real Codex author adapter. ChatGPT subscription access; no synthetic film/usage.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const requestFile = path.resolve(process.argv[2]);
const request = JSON.parse(fs.readFileSync(requestFile, "utf8"));
const runtimeRoot = path.resolve(process.argv[3]);
const cli = path.join(runtimeRoot, "packages/cli/bin/clapper.mjs");
const workspace = process.cwd();
if (!fs.existsSync("node_modules"))
  fs.symlinkSync(path.join(runtimeRoot, "packages/cli/node_modules"), "node_modules", "dir");
const prompt = `You are the author in a development evaluation. Create the film requested by ${path.join(path.dirname(requestFile), request.case)}. Read ${requestFile} and the supplied skill ${path.join(path.dirname(requestFile), request.skill)} and relevant linked references. Follow that skill. Use only the public source pack for subject research. Do not read other runs, repository films, benchmark cases, grading keys, or another installed Clapper skill. Your writable project is ${workspace}. The working runtime is node ${cli}; inspect its core/music exports under ${runtimeRoot}/packages for API details as needed. Dependencies are already linked and the optional local voice model is installed. Do not install or upgrade dependencies. Do not edit runtime or input files. Do not use other agents, internet, or external applications. You may run local CLI commands and inspect your rendered output. Produce a complete film, not a plan or proof fixture. Finish within ${request.budget.wallSeconds - 180} seconds, reserving time for rendering by the runner. The runner renders and independently collects final evidence after you exit. Return submission.json with schema:1, entry:<relative TSX>, composition:<registered id>, plan:<relative JSON>, transcript:<relative plain text>, revisions:<ordered relative files>, usage:{tokens:0,costUSD:0,repairs:<actual number of critique-and-repair rounds>}. The adapter replaces token usage with actual CLI-reported usage. plan.json must contain schema:1, sourceIds:string[], journey:string, levels:{name:string,journey:string,zoomTarget:string}[], claims:{id:string,text:string,sourceId:string,sourceSpan:string}[]. For an essential missing input follow the request's clarification protocol; otherwise finish the requested submission. Do not claim listening review if you lack listening capability.`;
const args = [
  "exec",
  "--ignore-user-config",
  "--ephemeral",
  "--skip-git-repo-check",
  "-C",
  workspace,
  "-s",
  "danger-full-access",
  "-c",
  'approval_policy="never"',
  "-c",
  "project_doc_max_bytes=0",
  "-m",
  request.model.model,
  "-c",
  `model_reasoning_effort=${JSON.stringify(request.model.settings.reasoning ?? "high")}`,
  "--json",
  prompt,
];
const child = spawn("codex", args, { stdio: ["ignore", "pipe", "inherit"] });
let buffer = "",
  tokens = 0,
  usageSeen = false;
const events = fs.createWriteStream("author-events.jsonl");
child.stdout.on("data", (chunk) => {
  events.write(chunk);
  buffer += chunk;
  let p;
  while ((p = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, p);
    buffer = buffer.slice(p + 1);
    try {
      const e = JSON.parse(line);
      if (e.type === "turn.completed" && e.usage) {
        tokens += (e.usage.input_tokens ?? 0) + (e.usage.output_tokens ?? 0);
        usageSeen = true;
      }
      if (e.type === "error") console.error(line);
    } catch {}
  }
});
const code = await new Promise((r) => child.on("close", r));
events.end();
assert.equal(code, 0, "Codex author failed; inspect author-events.jsonl");
assert.ok(usageSeen, "Missing actual Codex usage receipt");
fs.writeFileSync(
  "adapter-usage.json",
  JSON.stringify(
    {
      tokens,
      costUSD: 0,
      costBasis:
        "ChatGPT subscription; incremental API charge not applicable; subscription/quota cost not measured",
    },
    null,
    2,
  ),
);
if (fs.existsSync("submission.json")) {
  const s = JSON.parse(fs.readFileSync("submission.json", "utf8"));
  s.usage = { ...s.usage, tokens, costUSD: 0 };
  fs.writeFileSync("submission.json", JSON.stringify(s, null, 2));
}
console.log(`Real author complete: ${tokens} reported input/output tokens.`);
