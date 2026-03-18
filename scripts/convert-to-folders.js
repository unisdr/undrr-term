#!/usr/bin/env node

/**
 * Converts flat term .md files to folder-based structure.
 *
 * Usage:
 *   node scripts/convert-to-folders.js <project> [code1 code2 ...]
 *
 * Examples:
 *   node scripts/convert-to-folders.js hips-2025 gh0101 bi0104   # two terms
 *   node scripts/convert-to-folders.js hips-2025                  # all terms
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import yaml from "js-yaml";
import {
  TERMS_DIR,
  readProjectConfig,
  findTermFile,
  parseTerm,
  getTermFiles,
} from "./lib/terms.js";

const SCOPE_NOTE_SECTIONS = [
  { type: "drivers", heading: "Drivers" },
  { type: "impacts", heading: "Impacts" },
  { type: "metrics", heading: "Metrics" },
  { type: "multiHazardContext", heading: "Multi-Hazard Context" },
  { type: "riskManagement", heading: "Risk Management" },
  { type: "monitoringEarlyWarning", heading: "Monitoring and Early Warning" },
];

const API_BASE = "https://www.preventionweb.net/api/terms";

async function fetchScopeNotes(project, code) {
  const url = `${API_BASE}/${project}/${code}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  Warning: API returned ${res.status} for ${code}`);
      return [];
    }
    const json = await res.json();
    const concept = json["@graph"]?.[0];
    if (!concept) return [];

    const notes = concept["skos:scopeNote"];
    if (!notes) return [];

    return (Array.isArray(notes) ? notes : [notes]).map((note) => ({
      type: note["dct:type"],
      text: note["xkos:plainText"]?.[0]?.["@value"] || "",
    }));
  } catch (err) {
    console.warn(`  Warning: failed to fetch API for ${code}: ${err.message}`);
    return [];
  }
}

function buildDescriptionContent(existingDescription, scopeNotes) {
  const parts = [];

  if (existingDescription) {
    parts.push(existingDescription.trim());
  }

  for (const { type, heading } of SCOPE_NOTE_SECTIONS) {
    const note = scopeNotes.find((n) => n.type === type);
    if (note?.text) {
      parts.push(`## ${heading}\n\n${note.text.trim()}`);
    }
  }

  return parts.join("\n\n") + "\n";
}

function writeTermFolder(filePath, data, descriptionEn, languages, sourceLang) {
  const projectDir = path.dirname(filePath);
  const code = data.code;
  const folderPath = path.join(projectDir, code);

  fs.mkdirSync(folderPath, { recursive: true });

  // Build frontmatter data without description fields
  const indexData = structuredClone(data);
  if (indexData.translations) {
    for (const lang of Object.keys(indexData.translations)) {
      delete indexData.translations[lang].description;
    }
  }

  // Write {code}_index.md
  const indexContent = matter.stringify("", indexData);
  fs.writeFileSync(path.join(folderPath, `${code}_index.md`), indexContent);

  // Write {code}_description_{sourceLang}.md (populated)
  fs.writeFileSync(
    path.join(folderPath, `${code}_description_${sourceLang}.md`),
    descriptionEn,
  );

  // Write placeholder {code}_description_{lang}.md for other languages
  for (const lang of languages) {
    if (lang === sourceLang) continue;
    const descPath = path.join(folderPath, `${code}_description_${lang}.md`);
    fs.writeFileSync(descPath, "<!-- Translation pending / Traduction en attente -->\n");
  }

  return folderPath;
}

async function convertTerm(projectSlug, code, config) {
  const sourceLang = config.source_language || "en";
  const languages = config.languages || [sourceLang];

  // Find and read the flat file
  const filePath = findTermFile(projectSlug, code);
  if (!filePath) {
    console.error(`  Term file not found for ${code}`);
    return false;
  }

  // Skip if already folder-based
  if (filePath.endsWith("_index.md")) {
    console.log(`  ${code}: already folder-based, skipping`);
    return true;
  }

  console.log(`  ${code}: reading flat file...`);
  const data = parseTerm(filePath);
  const existingDescription =
    data.translations?.[sourceLang]?.description || "";

  // Fetch scopeNote data from API
  console.log(`  ${code}: fetching scopeNote data from API...`);
  const scopeNotes = await fetchScopeNotes(projectSlug, code);
  console.log(`  ${code}: got ${scopeNotes.length} scopeNote sections`);

  // Build description content
  const descriptionEn = buildDescriptionContent(
    existingDescription,
    scopeNotes,
  );

  // Write folder structure
  const projectDir = path.join(TERMS_DIR, projectSlug);
  const folderPath = writeTermFolder(
    path.join(projectDir, `${code}.md`),
    data,
    descriptionEn,
    languages,
    sourceLang,
  );
  console.log(`  ${code}: wrote folder at ${path.relative(TERMS_DIR, folderPath)}/`);

  // Delete original flat file
  fs.unlinkSync(filePath);
  console.log(`  ${code}: deleted flat file`);

  // Validate: re-read via parseTerm and check description round-trips
  const newIndexPath = path.join(folderPath, `${code}_index.md`);
  const reparsed = parseTerm(newIndexPath);

  const reparsedDesc = reparsed.translations?.[sourceLang]?.description || "";
  const expectedDesc = descriptionEn.trim();

  if (reparsedDesc !== expectedDesc) {
    console.error(`  ${code}: VALIDATION FAILED — description mismatch`);
    console.error(`    Expected length: ${expectedDesc.length}`);
    console.error(`    Got length: ${reparsedDesc.length}`);
    return false;
  }

  console.log(`  ${code}: validated OK`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(
      "Usage: node scripts/convert-to-folders.js <project> [code1 code2 ...]",
    );
    process.exit(1);
  }

  const projectSlug = args[0];
  const codes = args.slice(1);

  const config = readProjectConfig(projectSlug);
  if (!config) {
    console.error(`No _project.yml for project '${projectSlug}'`);
    process.exit(1);
  }

  console.log(`Project: ${config.name} (${projectSlug})`);
  console.log(
    `Languages: ${config.languages.join(", ")} (source: ${config.source_language || "en"})`,
  );

  // Determine which codes to convert
  let targetCodes = codes;

  if (targetCodes.length === 0) {
    // Convert all flat-file terms
    const files = getTermFiles(projectSlug);
    targetCodes = files
      .filter((f) => !f.endsWith("index.md")) // skip already folder-based
      .map((f) => path.basename(f, ".md"));
    console.log(`Converting all ${targetCodes.length} flat-file terms...`);
  } else {
    console.log(`Converting ${targetCodes.length} term(s): ${targetCodes.join(", ")}`);
  }

  let success = 0;
  let failed = 0;

  for (const code of targetCodes) {
    console.log(`\n--- ${code} ---`);
    const ok = await convertTerm(projectSlug, code, config);
    if (ok) success++;
    else failed++;
  }

  console.log(`\nDone: ${success} converted, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
