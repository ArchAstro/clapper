import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
export class BudgetExceeded extends Error {}
export class RunInterrupted extends Error {}
/** Trusted adapter argv, never a shell string. Stop the complete POSIX process group. */
export async function execute(
  command: string[],
  cwd: string,
  logFile: string,
  wallSeconds: number,
  envNames: string[] = [],
  extra: Record<string, string> = {},
) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    ...(command[0] === "docker"
      ? {
          DOCKER_HOST: process.env.DOCKER_HOST,
          DOCKER_CONTEXT: process.env.DOCKER_CONTEXT,
          DOCKER_CONFIG: process.env.DOCKER_CONFIG,
        }
      : {}),
    TMPDIR: process.env.TMPDIR,
    SYSTEMROOT: process.env.SYSTEMROOT,
    ...extra,
  };
  for (const name of envNames) {
    if (process.env[name] === undefined) throw new Error(`Adapter environment variable missing: ${name}`);
    env[name] = process.env[name];
  }
  const fd = fs.openSync(logFile, "a");
  const start = performance.now();
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(command[0], command.slice(1), {
        cwd,
        env,
        stdio: ["ignore", fd, fd],
        detached: process.platform !== "win32",
      });
      let expired = false,
        interrupted = false;
      const stop = (signal: NodeJS.Signals) => {
        if (child.pid)
          try {
            process.kill(process.platform === "win32" ? child.pid : -child.pid, signal);
          } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== "ESRCH") throw e;
          }
      };
      const kill = setTimeout(() => {
        expired = true;
        stop("SIGKILL");
      }, wallSeconds * 1000);
      const interrupt = () => {
        interrupted = true;
        stop("SIGKILL");
      };
      process.once("SIGINT", interrupt);
      process.once("SIGTERM", interrupt);
      const cleanup = () => {
        clearTimeout(kill);
        process.off("SIGINT", interrupt);
        process.off("SIGTERM", interrupt);
        stop("SIGKILL");
      };
      child.once("error", (e) => {
        cleanup();
        reject(e);
      });
      child.once("close", (code) => {
        cleanup();
        if (interrupted) reject(new RunInterrupted("Author process group stopped by user interruption"));
        else if (expired)
          reject(new BudgetExceeded(`Wall budget exceeded/interrupted after ${wallSeconds}s`));
        else if (code !== 0) reject(new Error(`Adapter exited ${code}; inspect ${path.basename(logFile)}`));
        else resolve();
      });
    });
  } finally {
    fs.closeSync(fd);
  }
  return (performance.now() - start) / 1000;
}
export function dockerCommand(
  image: string,
  name: string,
  input: string,
  work: string,
  argv: string[],
  network: "none" | "bridge",
  envNames: string[] = [],
): string[] {
  return [
    "docker",
    "run",
    "--rm",
    "--name",
    name,
    "--read-only",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--pids-limit=256",
    "--memory=4g",
    "--cpus=2",
    "--network",
    network,
    "--user",
    `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`,
    "--tmpfs",
    "/tmp:rw,nosuid,size=512m",
    "--mount",
    `type=bind,source=${input},target=/input,readonly`,
    "--mount",
    `type=bind,source=${work},target=/work`,
    "--workdir",
    "/work",
    ...envNames.flatMap((n) => ["--env", n]),
    image,
    ...argv,
  ];
}
