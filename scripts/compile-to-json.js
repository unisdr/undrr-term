#!/usr/bin/env node

/**
 * Compiles markdown term files into flat monolingual JSON for Weblate.
 *
 * For each sub-project in terms/, reads all .md files (or index.md in folders),
 * extracts YAML frontmatter translations, and writes one JSON file per language
 * to weblate/{project}/{lang}.json.
 *
 * Keys use dot notation: {code}.{field}
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import yaml from "js-yaml";

const ROOT = path.resolve(import.meta.dirname, "..");
const TERMS_DIR = path.join(ROOT, "terms");
const WEBLATE_DIR = path.join(ROOT, "weblate");

// Fields within each language's translation block that go to Weblate.
// "source" is handled specially (structured object → source_text + source_url).
const TRANSLATABLE_FIELDS = [
  "term",
  "definition",
  "description",
  "context",
  "part_of_speech",
  "aliases",
];

// Source is a structured field with text + url, flattened to two Weblate keys.
const SOURCE_SUBFIELDS = ["source_text", "source_url"];

function getProjectDirs() {
  return fs
    .readdirSync(TERMS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function readProjectConfig(projectDir) {
  const configPath = path.join(TERMS_DIR, projectDir, "_project.yml");
  if (!fs.existsSync(configPath)) {
    return null;
  }
  return yaml.load(fs.readFileSync(configPath, "utf8"));
}

function getTermFiles(projectDir) {
  const dir = path.join(TERMS_DIR, projectDir);
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith("_")) continue;

    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path.join(dir, entry.name));
    } else if (entry.isDirectory()) {
      const indexPath = path.join(dir, entry.name, "index.md");
      if (fs.existsSync(indexPath)) {
        files.push(indexPath);
      }
    }
  }

  return files;
}

function parseTerm(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data } = matter(raw);
  const termDir = path.dirname(filePath);

  // Check for description_{lang}.md files in the same directory.
  // These provide extended narrative content per language.
  if (!data.translations) data.translations = {};

  const descFiles = fs
    .readdirSync(termDir)
    .filter((f) => f.match(/^description_[a-z]{2}\.md$/));

  for (const descFile of descFiles) {
    const lang = descFile.replace("description_", "").replace(".md", "");
    const content = fs.readFileSync(path.join(termDir, descFile), "utf8").trim();
    if (!data.translations[lang]) data.translations[lang] = {};
    data.translations[lang].description = content;
  }

  return data;
}

function formatValue(value) {
  if (Array.isArray(value)) {
    return value.join("|");
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return String(value ?? "");
}

function compileProject(projectSlug) {
  const config = readProjectConfig(projectSlug);
  if (!config) {
    console.warn(`No _project.yml found for ${projectSlug}, skipping`);
    return;
  }

  const languages = config.languages || [];
  const termFiles = getTermFiles(projectSlug);

  // Initialize per-language JSON objects
  const jsonByLang = {};
  for (const lang of languages) {
    jsonByLang[lang] = {};
  }

  // Process each term file
  for (const filePath of termFiles) {
    const data = parseTerm(filePath);
    const code = data.code;

    if (!code) {
      console.warn(`No code field in ${filePath}, skipping`);
      continue;
    }

    const translations = data.translations || {};

    for (const lang of languages) {
      const t = translations[lang] || {};

      for (const field of TRANSLATABLE_FIELDS) {
        const value = t[field];
        if (value !== undefined && value !== null) {
          jsonByLang[lang][`${code}.${field}`] = formatValue(value);
        } else if (lang === config.source_language) {
          // Source language gets empty strings for missing fields
          // so Weblate knows the key exists
        } else {
          // Target languages: empty string signals untranslated
          const sourceHasField =
            translations[config.source_language]?.[field] !== undefined;
          if (sourceHasField) {
            jsonByLang[lang][`${code}.${field}`] = "";
          }
        }
      }

      // Handle structured source field (text + url)
      const source = t.source;
      if (source) {
        if (typeof source === "object") {
          if (source.text) jsonByLang[lang][`${code}.source_text`] = source.text.trim();
          if (source.url) jsonByLang[lang][`${code}.source_url`] = source.url.trim();
        } else {
          // Backward compat: plain string treated as text-only
          jsonByLang[lang][`${code}.source_text`] = String(source).trim();
        }
      } else if (lang !== config.source_language) {
        const srcSource = translations[config.source_language]?.source;
        if (srcSource) {
          jsonByLang[lang][`${code}.source_text`] = "";
          jsonByLang[lang][`${code}.source_url`] = "";
        }
      }
    }
  }

  // Write JSON files
  const outDir = path.join(WEBLATE_DIR, projectSlug);
  fs.mkdirSync(outDir, { recursive: true });

  for (const lang of languages) {
    const outPath = path.join(outDir, `${lang}.json`);
    // Sort keys for stable output
    const sorted = Object.keys(jsonByLang[lang])
      .sort()
      .reduce((acc, key) => {
        acc[key] = jsonByLang[lang][key];
        return acc;
      }, {});
    fs.writeFileSync(outPath, JSON.stringify(sorted, null, 2) + "\n");
  }

  const termCount = termFiles.length;
  console.log(
    `${projectSlug}: ${termCount} terms -> ${languages.length} language files`
  );
}

// Main
console.log("Compiling markdown terms to Weblate JSON...\n");

const projects = getProjectDirs();
for (const project of projects) {
  compileProject(project);
}

console.log("\nDone.");
