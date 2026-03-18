#!/usr/bin/env node

/**
 * Imports term data from a ZIP archive (as produced by export-zip.js).
 *
 * Usage: node scripts/import-zip.js <file.zip>
 *
 * The ZIP should contain:
 *   {project}.csv or {project}.json  — term data
 *   descriptions/{code}_description_{lang}.md  — description files
 *
 * Imports CSV or JSON via the existing import scripts, then copies
 * description files back to the matching term folders.
 */

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { createRequire } from "module";

// Use archiver's underlying yauzl or just extract with unzip CLI
const ROOT = path.resolve(import.meta.dirname, "..");
const TERMS_DIR = path.join(ROOT, "terms");

const zipPath = process.argv[2];

if (!zipPath) {
  console.error("Usage: node scripts/import-zip.js <file.zip>");
  process.exit(1);
}

if (!fs.existsSync(zipPath)) {
  console.error(`File not found: ${zipPath}`);
  process.exit(1);
}

console.log(`Importing from ZIP: ${zipPath}\n`);

// Extract to temp dir
const tmpDir = fs.mkdtempSync(path.join(ROOT, ".tmp-zip-import-"));

try {
  execFileSync("unzip", ["-o", zipPath, "-d", tmpDir], { stdio: "pipe" });

  // Find JSON or CSV to import
  const files = fs.readdirSync(tmpDir);
  const jsonFile = files.find((f) => f.endsWith(".json"));
  const csvFile = files.find((f) => f.endsWith(".csv"));

  const node = process.execPath;

  if (jsonFile) {
    console.log(`Importing data from ${jsonFile}...`);
    execFileSync(
      node,
      [path.join(ROOT, "scripts/import-json.js"), path.join(tmpDir, jsonFile)],
      { stdio: "inherit" },
    );
  } else if (csvFile) {
    console.log(`Importing data from ${csvFile}...`);
    execFileSync(
      node,
      [path.join(ROOT, "scripts/import-csv.js"), path.join(tmpDir, csvFile)],
      { stdio: "inherit" },
    );
  } else {
    console.warn("No CSV or JSON file found in ZIP");
  }

  // Copy description files
  const descDir = path.join(tmpDir, "descriptions");
  if (fs.existsSync(descDir)) {
    const descFiles = fs.readdirSync(descDir).filter((f) => f.endsWith(".md"));
    let copied = 0;

    for (const descFile of descFiles) {
      // Parse {code}_description_{lang}.md
      const match = descFile.match(/^([a-z0-9]+)_description_([a-z]{2})\.md$/i);
      if (!match) continue;

      const code = match[1];

      // Find the term folder across all projects
      const projects = fs
        .readdirSync(TERMS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const project of projects) {
        const termDir = path.join(TERMS_DIR, project, code);
        if (fs.existsSync(termDir) && fs.statSync(termDir).isDirectory()) {
          const src = path.join(descDir, descFile);
          const dest = path.join(termDir, descFile);
          fs.copyFileSync(src, dest);
          copied++;
          break;
        }
      }
    }

    console.log(`\nCopied ${copied} description files.`);
  }
} finally {
  // Clean up temp dir
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

console.log("\nDone.");
