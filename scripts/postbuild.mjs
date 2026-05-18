import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standaloneDir = join(root, ".next", "standalone");

if (!existsSync(standaloneDir)) {
  console.error(
    'Missing .next/standalone. Set output: "standalone" in next.config.ts, then rebuild.'
  );
  process.exit(1);
}

const staticDir = join(root, ".next", "static");
const publicDir = join(root, "public");

if (!existsSync(staticDir)) {
  console.error("Missing .next/static. Run `npm run build` first.");
  process.exit(1);
}

mkdirSync(join(standaloneDir, ".next"), { recursive: true });
cpSync(staticDir, join(standaloneDir, ".next", "static"), { recursive: true });

if (existsSync(publicDir)) {
  cpSync(publicDir, join(standaloneDir, "public"), { recursive: true });
}

console.log("Copied static assets into .next/standalone");
