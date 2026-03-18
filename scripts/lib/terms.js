/**
 * Shared utilities for reading and writing term files.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import yaml from "js-yaml";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const TERMS_DIR = path.join(ROOT, "terms");
export const WEBLATE_DIR = path.join(ROOT, "weblate");
export const EXPORTS_DIR = path.join(ROOT, "exports");

// Fields within each language's translation block.
// "source" is handled specially (structured object -> source_text + source_url).
// "confidence" is reviewer metadata, not translatable text — excluded from Weblate.
export const TRANSLATABLE_FIELDS = [
  "term",
  "definition",
  "description",
  "context",
  "part_of_speech",
  "aliases",
];

export const VALID_STATUSES = ["published", "draft", "retired"];
export const CONFIDENCE_LEVELS = [1, 2, 3, 4, 5];

export function getProjectDirs() {
  return fs
    .readdirSync(TERMS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

export function readProjectConfig(projectDir) {
  const configPath = path.join(TERMS_DIR, projectDir, "_project.yml");
  if (!fs.existsSync(configPath)) return null;
  return yaml.load(fs.readFileSync(configPath, "utf8"));
}

export function getTermFiles(projectDir) {
  const dir = path.join(TERMS_DIR, projectDir);
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith("_")) continue;

    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path.join(dir, entry.name));
    } else if (entry.isDirectory()) {
      const indexPath = path.join(dir, entry.name, `${entry.name}_index.md`);
      if (fs.existsSync(indexPath)) {
        files.push(indexPath);
      }
    }
  }

  return files;
}

export function parseTerm(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data } = matter(raw);
  const termDir = path.dirname(filePath);

  if (!data.translations) data.translations = {};

  // Read {code}_description_{lang}.md files in the same directory
  const code = data.code;
  const descPattern = code
    ? new RegExp(`^${code}_description_([a-z]{2})\\.md$`)
    : /^description_([a-z]{2})\.md$/;
  const descFiles = fs
    .readdirSync(termDir)
    .filter((f) => descPattern.test(f));

  for (const descFile of descFiles) {
    const lang = descFile.match(descPattern)[1];
    let content = fs.readFileSync(path.join(termDir, descFile), "utf8").trim();
    content = content.replace(/<!--[\s\S]*?-->/g, "").trim();
    if (!content) continue;
    if (!data.translations[lang]) data.translations[lang] = {};
    data.translations[lang].description = content;
  }

  return data;
}

export function findTermFile(projectDir, code) {
  const dir = path.join(TERMS_DIR, projectDir);

  const mdPath = path.join(dir, `${code}.md`);
  if (fs.existsSync(mdPath)) return mdPath;

  const indexPath = path.join(dir, code, `${code}_index.md`);
  if (fs.existsSync(indexPath)) return indexPath;

  return null;
}

export function formatValue(value) {
  if (Array.isArray(value)) return value.join("|");
  if (typeof value === "string") return value.trim();
  return String(value ?? "");
}

export function parseAliases(value) {
  if (!value || typeof value !== "string") return [];
  return value
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Filter a project's language list for --lang exports.
 * Always includes the source language (default "en") plus the requested targets.
 */
export function filterLanguages(projectLanguages, langArg, sourceLang = "en") {
  const requested = langArg
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const include = new Set([sourceLang, ...requested]);
  const filtered = projectLanguages.filter((l) => include.has(l));

  const unknown = requested.filter((l) => !projectLanguages.includes(l));
  if (unknown.length) {
    console.warn(`Warning: languages not in project config: ${unknown.join(", ")}`);
  }

  return filtered;
}

/**
 * Convert text to a URL-friendly slug.
 * NFD-normalize, strip diacritics, lowercase, collapse non-alphanum to hyphens.
 * Returns null if nothing Latin/numeric remains (e.g. pure Arabic/Chinese).
 */
export function slugify(text) {
  if (!text || typeof text !== "string") return null;
  const slug = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // collapse non-alphanum to hyphens
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
  return slug || null;
}

/**
 * Derive an id from the English term name, falling back to the code.
 */
export function deriveId(translations, code) {
  const enTerm = translations?.en?.term;
  return slugify(enTerm) || code;
}
