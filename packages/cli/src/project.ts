import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface ProjectConfig {
  runtime: string;
  entry: string;
  composition: string;
  score?: string;
}

export function findConfig(start = process.cwd()): { dir: string; config: ProjectConfig } | undefined {
  let dir = path.resolve(start);
  while (true) {
    const file = path.join(dir, "clapper.json");
    if (fs.existsSync(file)) {
      const config = JSON.parse(fs.readFileSync(file, "utf8")) as ProjectConfig;
      if (
        !config ||
        typeof config.runtime !== "string" ||
        typeof config.entry !== "string" ||
        typeof config.composition !== "string" ||
        !config.entry ||
        !config.composition
      )
        throw new Error(`Invalid project config: ${file}`);
      const rel = path.relative(dir, path.resolve(dir, config.entry));
      if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(config.entry))
        throw new Error("clapper.json entry must be inside the project");
      return { dir, config };
    }
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

export function managedRuntime(): string {
  const dir = process.env.CLAPPER_RUNTIME;
  if (!dir)
    throw new Error(
      "This command needs the standalone launcher. Build it with node scripts/build-release.mjs, then run dist/clapper-<platform>.",
    );
  return dir;
}

export function linkRuntime(dir: string, runtime = managedRuntime()) {
  const scratch = path.join(dir, ".clapper");
  fs.mkdirSync(scratch, { recursive: true });
  const link = path.join(scratch, "runtime");
  let existing: fs.Stats | undefined;
  try {
    existing = fs.lstatSync(link);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  if (existing) {
    if (!existing.isSymbolicLink())
      throw new Error(`${link} must be a managed symlink; move the existing directory aside first`);
    if (path.resolve(scratch, fs.readlinkSync(link)) === runtime) return;
    fs.unlinkSync(link);
  }
  fs.symlinkSync(runtime, link, "dir");
}

export function npmCommand(dir: string, args: string[]) {
  const runtime = managedRuntime();
  const result = spawnSync(
    process.execPath,
    [path.join(runtime, "node/lib/node_modules/npm/bin/npm-cli.js"), ...args],
    {
      cwd: dir,
      stdio: "inherit",
      env: {
        ...process.env,
        npm_config_update_notifier: "false",
        npm_config_audit: "false",
        npm_config_fund: "false",
      },
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `Dependency installation failed (${result.status ?? result.signal}). Fix the reported error and run clapper install.`,
    );
}

export function installProject(dir: string, packages: string[] = [], allowScripts = false) {
  if (packages.some((p) => p.startsWith("-")))
    throw new Error("Pass package names, not npm flags, to clapper add");
  linkRuntime(dir);
  const args = packages.length
    ? ["install", "--save-exact", ...packages]
    : [fs.existsSync(path.join(dir, "package-lock.json")) ? "ci" : "install"];
  // Treat local bundled packages as packed dependencies, not linked development
  // workspaces (which would install their devDependencies into the runtime).
  npmCommand(dir, [...args, "--install-links", ...(allowScripts ? [] : ["--ignore-scripts"])]);
}

export function createProject(target: string, template = "basic") {
  if (!["basic", "comic"].includes(template))
    throw new Error(`Unknown template "${template}". Available: basic, comic`);
  const runtime = managedRuntime();
  const dest = path.resolve(target);
  if (fs.existsSync(dest)) throw new Error(`Refusing to overwrite existing path: ${dest}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.mkdirSync(dest);
  fs.cpSync(path.join(runtime, "templates", template, "src"), path.join(dest, "src"), { recursive: true });
  const bundled = JSON.parse(fs.readFileSync(path.join(runtime, "runtime.json"), "utf8"))
    .projectDependencies as Record<string, string>;
  if (!bundled || !bundled["@clapper/core"])
    throw new Error("Runtime is missing starter dependency metadata");
  const deps: Record<string, string> = {};
  const devDeps: Record<string, string> = {};
  for (const [pkg, location] of Object.entries(bundled)) {
    const dest = ["typescript", "@types/react", "@types/react-dom", "csstype"].includes(pkg) ? devDeps : deps;
    dest[pkg] = `file:.clapper/runtime/${location}`;
  }
  const writeJSON = (file: string, value: unknown) =>
    fs.writeFileSync(path.join(dest, file), JSON.stringify(value, null, 2) + "\n");
  writeJSON("package.json", {
    name: path
      .basename(dest)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-"),
    private: true,
    type: "module",
    scripts: {
      preview: "clapper preview",
      render: "clapper render",
      review: "clapper review",
      typecheck: "tsc --noEmit",
    },
    dependencies: deps,
    devDependencies: devDeps,
  });
  writeJSON("clapper.json", {
    runtime: process.env.CLAPPER_VERSION,
    entry: "src/index.tsx",
    composition: "spot",
  });
  writeJSON("tsconfig.json", {
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Bundler",
      jsx: "react-jsx",
      strict: true,
      skipLibCheck: true,
      esModuleInterop: true,
      noEmit: true,
      lib: ["ES2022", "DOM", "DOM.Iterable"],
    },
    include: ["src"],
  });
  fs.writeFileSync(path.join(dest, ".gitignore"), "node_modules/\n.clapper/\nout/\n");
  fs.writeFileSync(path.join(dest, ".npmrc"), "install-links=true\n");
  fs.writeFileSync(
    path.join(dest, "README.md"),
    `# ${path.basename(dest)}\n\nRun \`clapper preview\`, \`clapper render\`, or \`clapper review\` here.\nEdit src/index.tsx, src/data.ts and src/theme.css.\n\nUse \`clapper add <package>\` for libraries. Commit package.json, package-lock.json, clapper.json and sources. On another machine install the pinned Clapper launcher and run \`clapper install\`. The .clapper/runtime link is recreated locally; no checkout is required.\n`,
  );
  linkRuntime(dest, runtime);
  installProject(dest);
  console.log(
    `Created ${dest}\n\n  cd ${JSON.stringify(dest)}\n  clapper preview\n  clapper render\n  clapper review`,
  );
}
