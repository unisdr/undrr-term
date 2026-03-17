#!/usr/bin/env node

/**
 * Imports term data from a CSV file into markdown frontmatter.
 *
 * Usage: node scripts/import-csv.js <file.csv>
 *
 * Expects the wide-format CSV produced by export-csv.js.
 * Updates existing terms or creates new term files.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  TERMS_DIR,
  TRANSLATABLE_FIELDS,
  readProjectConfig,
  findTermFile,
  parseAliases,
} from "./lib/terms.js";
import { parse } from "./lib/csv.js";

function importCsv(csvPath) {
  const text = fs.readFileSync(csvPath, "utf8");
  const rows = parse(text);

  if (rows.length < 2) {
    console.error("CSV file is empty or has no data rows");
    process.exit(1);
  }

  const header = rows[0];
  const colIndex = {};
  header.forEach((col, i) => {
    colIndex[col] = i;
  });

  if (!("code" in colIndex) || !("project" in colIndex)) {
    console.error("CSV must have 'code' and 'project' columns");
    process.exit(1);
  }

  // Detect language columns from header
  const langFieldPattern =
    /^([a-z]{2})_(term|definition|description|context|part_of_speech|aliases|source_text|source_url)$/;
  const langFields = {};
  for (const col of header) {
    const match = col.match(langFieldPattern);
    if (match) {
      const [, lang, field] = match;
      if (!langFields[lang]) langFields[lang] = [];
      langFields[lang].push(field);
    }
  }

  let created = 0;
  let updated = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || (row.length === 1 && row[0] === "")) continue;

    const code = row[colIndex["code"]];
    const project = row[colIndex["project"]];
    if (!code || !project) continue;

    const config = readProjectConfig(project);
    if (!config) {
      console.warn(
        `No _project.yml for project '${project}', skipping row ${r + 1}`
      );
      continue;
    }

    let filePath = findTermFile(project, code);
    let isNew = false;
    let data, content;

    if (filePath) {
      const raw = fs.readFileSync(filePath, "utf8");
      ({ data, content } = matter(raw));
    } else {
      isNew = true;
      const dir = path.join(TERMS_DIR, project);
      fs.mkdirSync(dir, { recursive: true });
      filePath = path.join(dir, `${code}.md`);
      data = {};
      content = "";
    }

    // Update metadata
    data.code = code;
    data.project = project;
    if (colIndex["id"] !== undefined && row[colIndex["id"]])
      data.id = row[colIndex["id"]];
    if (colIndex["status"] !== undefined && row[colIndex["status"]])
      data.status = row[colIndex["status"]];
    if (colIndex["category"] !== undefined && row[colIndex["category"]])
      data.category = row[colIndex["category"]];
    if (colIndex["domain"] !== undefined && row[colIndex["domain"]])
      data.domain = row[colIndex["domain"]];
    if (colIndex["related"] !== undefined && row[colIndex["related"]]) {
      data.related = row[colIndex["related"]]
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (!data.translations) data.translations = {};

    // Update translations per language
    for (const lang of Object.keys(langFields)) {
      if (!data.translations[lang]) data.translations[lang] = {};

      for (const field of langFields[lang]) {
        const col = `${lang}_${field}`;
        const value = row[colIndex[col]];
        if (value === undefined || value === "") continue;

        if (field === "source_text") {
          if (!data.translations[lang].source)
            data.translations[lang].source = {};
          if (typeof data.translations[lang].source === "string") {
            data.translations[lang].source = {
              text: data.translations[lang].source,
            };
          }
          data.translations[lang].source.text = value;
        } else if (field === "source_url") {
          if (!data.translations[lang].source)
            data.translations[lang].source = {};
          if (typeof data.translations[lang].source === "string") {
            data.translations[lang].source = {
              text: data.translations[lang].source,
            };
          }
          data.translations[lang].source.url = value;
        } else if (field === "aliases") {
          data.translations[lang].aliases = parseAliases(value);
        } else if (field === "description") {
          // Write to description_{lang}.md for folder-based terms
          const termDir = path.dirname(filePath);
          const descFilePath = path.join(termDir, `description_${lang}.md`);
          if (fs.existsSync(descFilePath)) {
            fs.writeFileSync(descFilePath, value.trim() + "\n");
            continue;
          }
          data.translations[lang].description = value;
        } else {
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
const csvPath = process.argv[2];

if (!csvPath) {
  console.error("Usage: node scripts/import-csv.js <file.csv>");
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error(`File not found: ${csvPath}`);
  process.exit(1);
}

console.log(`Importing from CSV: ${csvPath}\n`);
importCsv(csvPath);
console.log("\nDone.");
