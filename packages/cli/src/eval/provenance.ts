import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { digest, sha, tree } from "./io.ts";
import type { Candidate } from "./types.ts";

function commandFiles(command: string[]) {
  return command.map((arg, i) => {
    let file = arg;
    if (i === 0 && !path.isAbsolute(arg)) {
      file =
        (process.env.PATH ?? "")
          .split(path.delimiter)
          .map((dir) => path.join(dir, arg))
          .find((p) => fs.existsSync(p)) ?? arg;
    }
    if (fs.existsSync(file) && fs.statSync(file).isFile())
      return { argument: i, sha256: sha(fs.readFileSync(file)) };
    return { argument: i, value: arg };
  });
}
export function runtimeFingerprint(c: Candidate) {
  if (c.isolation.kind === "container") return digest({ image: c.isolation.image, runtime: c.runtime });
  if (c.runtime.command.includes("{clapper}")) {
    const cli = fileURLToPath(new URL("../../", import.meta.url)),
      packages = path.dirname(cli);
    return digest({
      command: commandFiles(
        c.runtime.command.map((a) =>
          a.replaceAll("{clapper}", fileURLToPath(new URL("../../bin/clapper.mjs", import.meta.url))),
        ),
      ),
      packages: ["cli", "core", "music"].map((pkg) => ({
        pkg,
        manifest: sha(fs.readFileSync(path.join(packages, pkg, "package.json"))),
        files: tree(path.join(packages, pkg, pkg === "music" ? "dist" : "src")),
      })),
    });
  }
  return digest({
    command: commandFiles(c.runtime.command),
    identity: c.runtime.identity,
    dependencies: c.runtime.dependencyRoot
      ? ["@archastro/clapper-core", "@archastro/clapper-music", "react", "react-dom"].map((name) => {
          const pkg = createRequire(path.join(c.runtime.dependencyRoot!, "__eval__.js")).resolve(
            `${name}/package.json`,
          );
          return {
            name,
            manifest: sha(fs.readFileSync(pkg)),
            files: tree(path.dirname(pkg), 1024 ** 3, new Set(["node_modules"])),
          };
        })
      : null,
  });
}
export const authorFingerprint = (c: Candidate) =>
  digest({ author: c.author, files: commandFiles(c.author.command) });
