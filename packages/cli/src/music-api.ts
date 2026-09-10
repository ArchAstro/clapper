import fs from "node:fs";
import path from "node:path";
import { compileScore, scoreAsset } from "@archastro/clapper-music";
import type { Plugin } from "vite";
import { loadScore } from "./music-render.ts";

/** Read-only, same-origin studio endpoint for the configured score only. It
 * accepts no filesystem path from the request and never exposes other files. */
export function musicAPI(projectDir: string, scoreFile?: string): Plugin {
  return {
    name: "clapper-music-inspector",
    configureServer(server) {
      server.middlewares.use("/__clapper/music", async (req, res, next) => {
        if (req.url !== "/" && req.url !== "") return next();
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        if (req.method !== "GET") {
          res.statusCode = 405;
          res.setHeader("Allow", "GET");
          res.end(JSON.stringify({ error: "Read-only endpoint" }));
          return;
        }
        if (!scoreFile) {
          res.end("null");
          return;
        }
        try {
          const file = fs.realpathSync(scoreFile),
            root = fs.realpathSync(projectDir);
          if (!file.startsWith(root + path.sep)) throw new Error("Score file must be inside the project");
          const score = await loadScore(file);
          res.end(
            JSON.stringify({
              path: path.relative(root, file),
              source: fs.readFileSync(file, "utf8"),
              score: compileScore(score),
              asset: scoreAsset(score),
            }),
          );
        } catch (error) {
          res.statusCode = 422;
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
        }
      });
    },
  };
}
