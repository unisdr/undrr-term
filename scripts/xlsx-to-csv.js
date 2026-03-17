#!/usr/bin/env node

/**
 * Converts an Excel (.xlsx) file to CSV.
 *
 * Usage: node scripts/xlsx-to-csv.js <input.xlsx> [output.csv] [--sheet name]
 *
 * By default converts the first sheet and writes to the same path with .csv extension.
 * Requires the 'xlsx' package: yarn add xlsx
 */

let XLSX;
try {
  XLSX = await import("xlsx");
} catch {
  console.error("The 'xlsx' package is required for Excel conversion.");
  console.error("Install it with: yarn add xlsx");
  process.exit(1);
}

import fs from "fs";

const args = process.argv.slice(2);
let inputPath = null;
let outputPath = null;
let sheetName = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--sheet" && args[i + 1]) {
    sheetName = args[++i];
  } else if (!inputPath) {
    inputPath = args[i];
  } else if (!outputPath) {
    outputPath = args[i];
  }
}

if (!inputPath) {
  console.error(
    "Usage: node scripts/xlsx-to-csv.js <input.xlsx> [output.csv] [--sheet name]"
  );
  process.exit(1);
}

if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}

if (!outputPath) {
  outputPath = inputPath.replace(/\.xlsx?$/i, ".csv");
}

const workbook = XLSX.read(fs.readFileSync(inputPath));

const sheet = sheetName
  ? workbook.Sheets[sheetName]
  : workbook.Sheets[workbook.SheetNames[0]];

if (!sheet) {
  const available = workbook.SheetNames.join(", ");
  console.error(
    sheetName
      ? `Sheet '${sheetName}' not found. Available: ${available}`
      : "No sheets found in workbook"
  );
  process.exit(1);
}

const usedSheet = sheetName || workbook.SheetNames[0];
const csv = XLSX.utils.sheet_to_csv(sheet);

fs.writeFileSync(outputPath, csv);
console.log(`Converted sheet '${usedSheet}' -> ${outputPath}`);

if (workbook.SheetNames.length > 1) {
  console.log(
    `Note: workbook has ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(", ")}`
  );
  console.log("Use --sheet <name> to convert a specific sheet.");
}
