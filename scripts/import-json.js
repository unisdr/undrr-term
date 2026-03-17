#!/usr/bin/env node

/**
 * Imports term data from a structured JSON file into markdown frontmatter.
 *
 * Usage: node scripts/import-json.js <file.json>
 *
 * Expects the JSON format produced by export-json.js.
 * Updates existing terms or creates new term files.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  TERMS_DIR,
  readProjectConfig,
  findTermFile,
} from "./lib/terms.js";

function importJson(jsonPath) {
  const raw = fs.readFileSync(jsonPath, "utf8");
  const input = JSON.parse(raw);

  const projectSlug = input.project;
  if (!projectSlug) {
    console.error("JSON must have a 'project' field");
    process.exit(1);
  }

  const config = readProjectConfig(projectSlug);
  if (!config) {
    console.error(`No _project.yml for project '${projectSlug}'`);
    process.exit(1);
  }

  const terms = input.terms || [];
  let created = 0;
  let updated = 0;

  for (const term of terms) {
    if (!term.code) continue;

    let filePath = findTermFile(projectSlug, term.code);
    let isNew = false;
    let data, content;

    if (filePath) {
      const fileRaw = fs.readFileSync(filePath, "utf8");
      ({ data, content } = matter(fileRaw));
    } else {
      isNew = true;
      const dir = path.join(TERMS_DIR, projectSlug);
      fs.mkdirSync(dir, { recursive: true });
      filePath = path.join(dir, `${term.code}.md`);
      data = {};
      content = "";
    }

    // Update metadata
    data.code = term.code;
    if (term.id) data.id = term.id;
    if (term.slug) data.slug = term.slug;
    data.project = projectSlug;
    if (term.status) data.status = term.status;
    if (term.category) data.category = term.category;
    if (term.domain) data.domain = term.domain;
    if (term.related && term.related.length) data.related = term.related;

    // Update translations
    if (term.translations) {
      if (!data.translations) data.translations = {};

      for (const [lang, t] of Object.entries(term.translations)) {
        if (!data.translations[lang]) data.translations[lang] = {};

        for (const [field, value] of Object.entries(t)) {
          if (value === undefined || value === null) continue;

          // Write description files for folder-based terms
          if (field === "description") {
            const termDir = path.dirname(filePath);
            const descFilePath = path.join(termDir, `description_${lang}.md`);
            if (fs.existsSync(descFilePath)) {
              fs.writeFileSync(descFilePath, String(value).trim() + "\n");
              continue;
            }
          }

          data.translations[lang][field] = value;
        }
      }
    }

    const output = matter.stringify(content, data);
    fs.writeFileSync(filePath, output);

    if (isNew) created++;
    else updated++;
  }

  console.log(`Imported: ${updated} updated, ${created} created`);
}

// Main
const jsonPath = process.argv[2];

if (!jsonPath) {
  console.error("Usage: node scripts/import-json.js <file.json>");
  process.exit(1);
}

if (!fs.existsSync(jsonPath)) {
  console.error(`File not found: ${jsonPath}`);
  process.exit(1);
}

console.log(`Importing from JSON: ${jsonPath}\n`);
importJson(jsonPath);
console.log("\nDone.");
