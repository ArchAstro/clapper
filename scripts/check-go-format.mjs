import { execFileSync } from "node:child_process";

const files = execFileSync("gofmt", ["-l", "launcher"], { encoding: "utf8" }).trim();
if (files) {
  console.error(`Go files need formatting:\n${files}\nRun pnpm format.`);
  process.exitCode = 1;
}
