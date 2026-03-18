#!/usr/bin/env node

/**
 * Exports term data to CSV format (wide layout).
 *
 * Usage: node scripts/export-csv.js [project] [--output path] [--lang codes]
 *
 * One row per term, with columns for metadata and each language's fields.
 * Output goes to exports/{project}.csv by default.
 *
 * --lang filters to the source language (English) plus the specified target(s).
 * Example: --lang zh  →  exports only en + zh columns
 *          --lang zh,fr  →  exports en + zh + fr columns
 */

import fs from "fs";
import path from "path";
import {
  EXPORTS_DIR,
  TRANSLATABLE_FIELDS,
  getProjectDirs,
  readProjectConfig,
  getTermFiles,
  parseTerm,
  formatValue,
  filterLanguages,
} from "./lib/terms.js";

// Exclude description from CSV — multi-KB markdown with newlines/commas breaks spreadsheets.
// Descriptions are available in the JSON export and in the ZIP bundle.
const CSV_FIELDS = TRANSLATABLE_FIELDS.filter((f) => f !== "description");
import { stringify } from "./lib/csv.js";

function buildHeader(languages) {
  const meta = ["code", "id", "project", "status", "category", "domain", "related"];
  const langCols = [];
  for (const lang of languages) {
    for (const field of CSV_FIELDS) {
      langCols.push(`${lang}_${field}`);
    }
    langCols.push(`${lang}_source_text`);
    langCols.push(`${lang}_source_url`);
    langCols.push(`${lang}_confidence`);
  }
  return [...meta, ...langCols];
}

function termToRow(data, languages) {
  const meta = [
    data.code || "",
    data.id || "",
    data.project || "",
    data.status || "",
    data.category || "",
    data.domain || "",
    (data.related || []).join("|"),
  ];

  const langValues = [];
  const translations = data.translations || {};

  for (const lang of languages) {
    const t = translations[lang] || {};
    for (const field of CSV_FIELDS) {
      langValues.push(formatValue(t[field] ?? ""));
    }
    const source = t.source;
    if (source && typeof source === "object") {
      langValues.push(source.text || "");
      langValues.push(source.url || "");
    } else if (source) {
      langValues.push(String(source));
      langValues.push("");
    } else {
      langValues.push("");
      langValues.push("");
    }
    langValues.push(t.confidence != null ? String(t.confidence) : "");
  }

  return [...meta, ...langValues];
}

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

  const header = buildHeader(languages);
  const rows = [header];

  for (const filePath of termFiles) {
    const data = parseTerm(filePath);
    if (!data.code) continue;
    rows.push(termToRow(data, languages));
  }

  // Sort data rows by code (keep header first)
  const dataRows = rows.slice(1).sort((a, b) => a[0].localeCompare(b[0]));

  const csv = stringify([header, ...dataRows]);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, csv);
  console.log(`${projectSlug}: ${termFiles.length} terms -> ${outputPath}`);
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

console.log("Exporting terms to CSV...\n");

for (const project of projects) {
  const outPath = outputPath || path.join(EXPORTS_DIR, `${project}.csv`);
  exportProject(project, outPath, langFilter);
}

console.log("\nDone.");
