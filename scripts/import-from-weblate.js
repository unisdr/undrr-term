#!/usr/bin/env node

/**
 * Imports Weblate JSON translations back into markdown frontmatter.
 *
 * For each sub-project, reads the JSON files in weblate/{project}/,
 * groups keys by term code, and patches the corresponding markdown
 * frontmatter with updated translations.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import yaml from "js-yaml";

const ROOT = path.resolve(import.meta.dirname, "..");
const TERMS_DIR = path.join(ROOT, "terms");
const WEBLATE_DIR = path.join(ROOT, "weblate");

const TRANSLATABLE_FIELDS = [
  "term",
  "definition",
  "description",
  "context",
  "part_of_speech",
  "aliases",
];

function readProjectConfig(projectDir) {
  const configPath = path.join(TERMS_DIR, projectDir, "_project.yml");
  if (!fs.existsSync(configPath)) return null;
  return yaml.load(fs.readFileSync(configPath, "utf8"));
}

function findTermFile(projectDir, code) {
  const dir = path.join(TERMS_DIR, projectDir);

  // Check for direct .md file
  const mdPath = path.join(dir, `${code}.md`);
  if (fs.existsSync(mdPath)) return mdPath;

  // Check for folder with index.md
  const indexPath = path.join(dir, code, "index.md");
  if (fs.existsSync(indexPath)) return indexPath;

  return null;
}

function parseValue(field, value) {
  if (field === "aliases" && typeof value === "string") {
    return value
      ? value.split("|").map((s) => s.trim())
      : [];
  }
  return value;
}

function importProject(projectSlug) {
  const config = readProjectConfig(projectSlug);
  if (!config) return;

  const sourceLanguage = config.source_language || "en";
  const weblateDir = path.join(WEBLATE_DIR, projectSlug);
  if (!fs.existsSync(weblateDir)) return;

  // Read all language JSON files
  const langData = {};
  const jsonFiles = fs
    .readdirSync(weblateDir)
    .filter((f) => f.endsWith(".json"));

  for (const file of jsonFiles) {
    const lang = path.basename(file, ".json");
    const raw = fs.readFileSync(path.join(weblateDir, file), "utf8");
    langData[lang] = JSON.parse(raw);
  }

  // Group keys by term code
  const termCodes = new Set();
  for (const lang of Object.keys(langData)) {
    for (const key of Object.keys(langData[lang])) {
      const code = key.split(".")[0];
      termCodes.add(code);
    }
  }

  let updatedCount = 0;

  for (const code of termCodes) {
    const filePath = findTermFile(projectSlug, code);
    if (!filePath) {
      console.warn(`No term file found for code ${code} in ${projectSlug}`);
      continue;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(raw);

    if (!data.translations) {
      data.translations = {};
    }

    let changed = false;

    for (const lang of Object.keys(langData)) {
      // Skip patching source language from Weblate (source is read-only in Weblate)
      if (lang === sourceLanguage) continue;

      if (!data.translations[lang]) {
        data.translations[lang] = {};
      }

      for (const field of TRANSLATABLE_FIELDS) {
        const key = `${code}.${field}`;
        const weblateValue = langData[lang][key];

        if (weblateValue === undefined || weblateValue === "") continue;

        const parsed = parseValue(field, weblateValue);

        // If a description_{lang}.md file exists, write there instead of frontmatter
        if (field === "description") {
          const termDir = path.dirname(filePath);
          const descFilePath = path.join(termDir, `description_${lang}.md`);
          if (fs.existsSync(descFilePath)) {
            const currentDesc = fs.readFileSync(descFilePath, "utf8").trim();
            if (currentDesc !== String(parsed).trim()) {
              fs.writeFileSync(descFilePath, String(parsed).trim() + "\n");
              changed = true;
            }
            continue;
          }
        }

        const current = data.translations[lang][field];

        // Only update if the value actually changed
        const currentStr = JSON.stringify(current);
        const parsedStr = JSON.stringify(parsed);

        if (currentStr !== parsedStr) {
          data.translations[lang][field] = parsed;
          changed = true;
        }
      }

      // Reconstruct structured source from source_text + source_url keys
      const sourceText = langData[lang][`${code}.source_text`];
      const sourceUrl = langData[lang][`${code}.source_url`];
      if (sourceText) {
        const newSource = { text: sourceText.trim() };
        if (sourceUrl) newSource.url = sourceUrl.trim();
        const currentSource = data.translations[lang].source;
        if (JSON.stringify(currentSource) !== JSON.stringify(newSource)) {
          data.translations[lang].source = newSource;
          changed = true;
        }
      }
    }

    if (changed) {
      const output = matter.stringify(content, data);
      fs.writeFileSync(filePath, output);
      updatedCount++;
    }
  }

  console.log(
    `${projectSlug}: ${updatedCount} term files updated from Weblate`
  );
}

// Main
console.log("Importing Weblate JSON back to markdown...\n");

const projectDirs = fs
  .readdirSync(TERMS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const project of projectDirs) {
  importProject(project);
}

console.log("\nDone.");
