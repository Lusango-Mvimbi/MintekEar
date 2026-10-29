import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const flag = "--experimental-sqlite";
const current = (process.env.NODE_OPTIONS ?? "").split(/\s+/).filter(Boolean);
if (!current.includes(flag)) current.push(flag);
process.env.NODE_OPTIONS = current.join(" ");

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/with-sqlite.mjs next <args>");
  process.exit(1);
}

const nodeArgs = args[0] === "next" ? [require.resolve("next/dist/bin/next"), ...args.slice(1)] : args;
const child = spawn(process.execPath, nodeArgs, {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
