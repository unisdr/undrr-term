#!/usr/bin/env node

/**
 * Enriches folder-based term description files with scopeNote data from the
 * PreventionWeb API.
 *
 * Usage:
 *   node scripts/enrich-descriptions.js <project> [code1 code2 ...]
 *
 * Uses the api_slug field from _project.yml to resolve the correct API endpoint
 * (e.g. api_slug: hips → /api/terms/hips/{code}).
 */

import fs from "fs";
import path from "path";
import {
  TERMS_DIR,
  readProjectConfig,
  getTermFiles,
  parseTerm,
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

async function fetchScopeNotes(apiSlug, code) {
  const url = `${API_BASE}/${apiSlug}/${code}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status !== 404) {
        console.warn(`  Warning: API returned ${res.status} for ${code}`);
      }
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

async function enrichTerm(projectSlug, apiSlug, code, sourceLang) {
  const termDir = path.join(TERMS_DIR, projectSlug, code);
  const descPath = path.join(termDir, `${code}_description_${sourceLang}.md`);

  if (!fs.existsSync(descPath)) {
    console.log(`  ${code}: no description file, skipping`);
    return false;
  }

  // Read existing description
  let existing = fs.readFileSync(descPath, "utf8").trim();
  existing = existing.replace(/<!--[\s\S]*?-->/g, "").trim();

  // Skip if already has scopeNote headings
  if (existing.includes("## Drivers") || existing.includes("## Impacts") || existing.includes("## Metrics")) {
    console.log(`  ${code}: already enriched, skipping`);
    return false;
  }

  // Fetch scopeNote data
  const scopeNotes = await fetchScopeNotes(apiSlug, code);
  if (scopeNotes.length === 0) {
    return false;
  }

  console.log(`  ${code}: got ${scopeNotes.length} scopeNote sections`);

  // Build enriched content
  const enriched = buildDescriptionContent(existing, scopeNotes);
  fs.writeFileSync(descPath, enriched);
  console.log(`  ${code}: enriched description written`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: node scripts/enrich-descriptions.js <project> [code1 code2 ...]");
    process.exit(1);
  }

  const projectSlug = args[0];
  const codes = args.slice(1);

  const config = readProjectConfig(projectSlug);
  if (!config) {
    console.error(`No _project.yml for project '${projectSlug}'`);
    process.exit(1);
  }

  const apiSlug = config.api_slug || projectSlug;
  const sourceLang = config.source_language || "en";

  console.log(`Project: ${config.name} (${projectSlug})`);
  console.log(`API slug: ${apiSlug}`);

  // Determine which codes to enrich
  let targetCodes = codes;

  if (targetCodes.length === 0) {
    const files = getTermFiles(projectSlug);
    targetCodes = files.map((f) => {
      const data = parseTerm(f);
      return data.code;
    }).filter(Boolean);
    console.log(`Enriching ${targetCodes.length} terms...\n`);
  } else {
    console.log(`Enriching ${targetCodes.length} term(s): ${targetCodes.join(", ")}\n`);
  }

  let enriched = 0;
  let skipped = 0;

  for (const code of targetCodes) {
    const ok = await enrichTerm(projectSlug, apiSlug, code, sourceLang);
    if (ok) enriched++;
    else skipped++;
  }

  console.log(`\nDone: ${enriched} enriched, ${skipped} skipped`);
}

main();
