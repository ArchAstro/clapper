import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { BudgetExceeded, dockerCommand, execute } from "../../src/eval/process.ts";

it("kills timed-out author processes and retains their output", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "clapper-process-"));
  try {
    await expect(
      execute(
        [process.execPath, "-e", "console.log('started');setInterval(()=>{},1000)"],
        root,
        path.join(root, "log"),
        0.15,
      ),
    ).rejects.toBeInstanceOf(BudgetExceeded);
    expect(fs.readFileSync(path.join(root, "log"), "utf8")).toContain("started");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
it("container argv mounts only public input and one work directory", () => {
  const argv = dockerCommand(
    "fixture@sha256:" + "a".repeat(64),
    "test",
    "/public",
    "/workdir",
    ["author", "--request", "/input/request.json"],
    "none",
  );
  expect(argv).toContain("--read-only");
  expect(argv).toContain("--cap-drop=ALL");
  expect(argv).toContain("type=bind,source=/public,target=/input,readonly");
  expect(argv).not.toContain("--privileged");
  expect(argv.join(" ")).not.toContain("docker.sock");
});
