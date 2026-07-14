import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const ignoredDirs = new Set(["node_modules", "dist", ".git", ".vercel"]);
const scannedExtensions = new Set([".js", ".mjs", ".html", ".css", ".json"]);
const legacyA = "fire" + "base";
const legacyB = "fire" + "store";
const forbiddenPattern = new RegExp(`\\b(${legacyA}|${legacyB})\\b`, "i");
const violations = [];

function getExtension(filePath) {
  const match = filePath.match(/\.[^.]+$/);
  return match ? match[0] : "";
}

function scanDir(dir) {
  for (const entry of readdirSync(dir)) {
    if (ignoredDirs.has(entry)) continue;

    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      scanDir(fullPath);
      continue;
    }

    if (!scannedExtensions.has(getExtension(entry))) continue;
    const content = readFileSync(fullPath, "utf8");
    if (forbiddenPattern.test(content)) {
      violations.push(relative(root, fullPath));
    }
  }
}

scanDir(root);

if (violations.length) {
  console.error(`Legacy persistence references found:\n${violations.join("\n")}`);
  process.exit(1);
}
