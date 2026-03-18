#!/usr/bin/env node

/**
 * Bundles CSV, JSON, and description markdown files into a ZIP archive.
 *
 * Usage: node scripts/export-zip.js [project]
 *
 * Produces exports/{project}.zip containing:
 *   {project}.csv           — tabular data (no description column)
 *   {project}.json          — full data interchange format with descriptions
 *   descriptions/           — individual description markdown files
 */

import fs from "fs";
import path from "path";
import archiver from "archiver";
import {
  EXPORTS_DIR,
  TERMS_DIR,
  getProjectDirs,
  readProjectConfig,
  getTermFiles,
  parseTerm,
} from "./lib/terms.js";

function zipProject(projectSlug) {
  const config = readProjectConfig(projectSlug);
  if (!config) {
    console.warn(`No _project.yml found for ${projectSlug}, skipping`);
    return;
  }

  const csvPath = path.join(EXPORTS_DIR, `${projectSlug}.csv`);
  const jsonPath = path.join(EXPORTS_DIR, `${projectSlug}.json`);

  if (!fs.existsSync(csvPath) || !fs.existsSync(jsonPath)) {
    console.warn(`Missing CSV or JSON exports for ${projectSlug}, run export:csv and export:json first`);
    return;
  }

  const zipPath = path.join(EXPORTS_DIR, `${projectSlug}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on("close", () => {
      console.log(`${projectSlug}: ${archive.pointer()} bytes -> ${zipPath}`);
      resolve();
    });

    archive.on("error", reject);
    archive.pipe(output);

    // Add CSV and JSON
    archive.file(csvPath, { name: `${projectSlug}.csv` });
    archive.file(jsonPath, { name: `${projectSlug}.json` });

    // Add description files
    const termFiles = getTermFiles(projectSlug);
    for (const filePath of termFiles) {
      const data = parseTerm(filePath);
      const code = data.code;
      if (!code) continue;

      const termDir = path.dirname(filePath);
      const descPattern = new RegExp(`^${code}_description_[a-z]{2}\\.md$`);
      const descFiles = fs.readdirSync(termDir).filter((f) => descPattern.test(f));

      for (const descFile of descFiles) {
        const fullPath = path.join(termDir, descFile);
        // Skip placeholder-only files
        const content = fs.readFileSync(fullPath, "utf8").trim();
        const stripped = content.replace(/<!--[\s\S]*?-->/g, "").trim();
        if (!stripped) continue;

        archive.file(fullPath, { name: `descriptions/${descFile}` });
      }
    }

    archive.finalize();
  });
}

// Main
const args = process.argv.slice(2);
const projectFilter = args.find((a) => !a.startsWith("-"));
const projects = projectFilter ? [projectFilter] : getProjectDirs();

console.log("Bundling ZIP exports...\n");

for (const project of projects) {
  await zipProject(project);
}

console.log("\nDone.");
