#!/usr/bin/env node

/**
 * Exports term data to structured JSON format.
 *
 * Usage: node scripts/export-json.js [project] [--output path] [--lang codes]
 *
 * Produces a hierarchical JSON file with full term metadata and translations.
 * Output goes to exports/{project}.json by default.
 *
 * --lang filters to the source language (English) plus the specified target(s).
 * Example: --lang zh  →  exports only en + zh translations
 *          --lang zh,fr  →  exports en + zh + fr translations
 */

import fs from "fs";
import path from "path";
import {
  EXPORTS_DIR,
  getProjectDirs,
  readProjectConfig,
  getTermFiles,
  parseTerm,
  filterLanguages,
} from "./lib/terms.js";

function exportProject(projectSlug, outputPath, langFilter) {
  const config = readProjectConfig(projectSlug);
  if (!config) {
    console.warn(`No _project.yml found for ${projectSlug}, skipping`);
    return;
  }

  const allLanguages = config.languages || [];
  const languages = langFilter
    ? filterLanguages(allLanguages, langFilter, config.source_language || "en")
    : allLanguages;

  const termFiles = getTermFiles(projectSlug);
  const terms = [];

  for (const filePath of termFiles) {
    const data = parseTerm(filePath);
    if (!data.code) continue;

    const allTranslations = data.translations || {};
    const translations = {};
    for (const lang of languages) {
      if (allTranslations[lang] && Object.keys(allTranslations[lang]).length)
        translations[lang] = allTranslations[lang];
    }

    terms.push({
      code: data.code,
      id: data.id || null,
      slug: data.slug || null,
      project: data.project || projectSlug,
      status: data.status || null,
      category: data.category || null,
      domain: data.domain || null,
      related: data.related || [],
      translations,
    });
  }

  terms.sort((a, b) => a.code.localeCompare(b.code));

  const output = {
    project: projectSlug,
    name: config.name || projectSlug,
    languages,
    source_language: config.source_language || "en",
    exported: new Date().toISOString(),
    term_count: terms.length,
    terms,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`${projectSlug}: ${terms.length} terms -> ${outputPath}`);
}

// Main
const args = process.argv.slice(2);
let projectFilter = null;
let outputPath = null;
let langFilter = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--output" && args[i + 1]) {
    outputPath = args[++i];
  } else if (args[i] === "--lang" && args[i + 1]) {
    langFilter = args[++i];
  } else if (!args[i].startsWith("-")) {
    projectFilter = args[i];
  }
}

const projects = projectFilter ? [projectFilter] : getProjectDirs();

console.log("Exporting terms to JSON...\n");

for (const project of projects) {
  const outPath = outputPath || path.join(EXPORTS_DIR, `${project}.json`);
  exportProject(project, outPath, langFilter);
}

console.log("\nDone.");
