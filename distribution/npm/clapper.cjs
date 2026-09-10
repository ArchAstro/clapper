#!/usr/bin/env node
// npm/npx entrypoint: use the exact native launcher shipped as a download.
// Browser/runtime integrity, project pinning and caching have one implementation.
const { spawn } = require("node:child_process");
const path = require("node:path");

const metadata = require(path.join(__dirname, "..", "package.json"));
const platform = `${process.platform}-${process.arch}`;
const pkg = `@archastro/clapper-launcher-${platform}`;
if (!metadata.optionalDependencies?.[pkg]) {
  console.error(
    `clapper: this release does not include ${platform}. Supported: ${metadata.clapperPlatforms.join(", ")}`,
  );
  process.exit(1);
}
let executable;
try {
  executable = require.resolve(`${pkg}/bin/clapper`);
} catch {
  console.error(
    `clapper: ${pkg}@${metadata.version} is missing. Reinstall @archastro/clapper with optional dependencies enabled (npm install --include=optional).`,
  );
  process.exit(1);
}
const child = spawn(executable, process.argv.slice(2), { stdio: "inherit", env: process.env });
const handlers = new Map();
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  const forward = () => child.kill(signal);
  handlers.set(signal, forward);
  process.on(signal, forward);
}
child.on("error", (error) => {
  console.error(`clapper: cannot start ${pkg}: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  for (const [name, handler] of handlers) process.removeListener(name, handler);
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
