#!/usr/bin/env node

/**
 * Generates all export files for the build pipeline:
 * - Full exports: exports/{project}.csv and exports/{project}.json
 * - Per-language exports: exports/{project}-{lang}.csv and exports/{project}-{lang}.json
 *   (source language + one target language each)
 *
 * Usage: node scripts/export-all.js
 */

import path from "path";
import {
  EXPORTS_DIR,
  getProjectDirs,
  readProjectConfig,
} from "./lib/terms.js";

// Shell out to the individual export scripts.
import { execFileSync } from "child_process";

const node = process.execPath;
const csvScript = path.join(import.meta.dirname, "export-csv.js");
const jsonScript = path.join(import.meta.dirname, "export-json.js");
const zipScript = path.join(import.meta.dirname, "export-zip.js");

function run(script, args) {
  execFileSync(node, [script, ...args], { stdio: "inherit" });
}

const projects = getProjectDirs();

for (const project of projects) {
  const config = readProjectConfig(project);
  if (!config) continue;

  const sourceLang = config.source_language || "en";
  const languages = config.languages || [];

  // Full export (all languages)
  run(csvScript, [project, "--output", path.join(EXPORTS_DIR, `${project}.csv`)]);
  run(jsonScript, [project, "--output", path.join(EXPORTS_DIR, `${project}.json`)]);

  // ZIP bundle (CSV + JSON + description files)
  run(zipScript, [project]);

  // Per-language exports (source + one target)
  for (const lang of languages) {
    if (lang === sourceLang) continue;
    run(csvScript, [project, "--lang", lang, "--output", path.join(EXPORTS_DIR, `${project}-${lang}.csv`)]);
    run(jsonScript, [project, "--lang", lang, "--output", path.join(EXPORTS_DIR, `${project}-${lang}.json`)]);
  }
}

console.log("\nAll exports generated.");
