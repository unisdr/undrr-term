#!/usr/bin/env bash
#
# Smoke test for import/export scripts.
# Verifies round-trip: export → import → re-export produces identical output.
#
# Usage: bash tests/test-import-export.sh

set -euo pipefail

cd "$(dirname "$0")/.."

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "=== Testing CSV export ==="
node scripts/export-csv.js hips --output "$TMPDIR/hips.csv"
echo ""

echo "=== Testing JSON export ==="
node scripts/export-json.js hips --output "$TMPDIR/hips.json"
echo ""

echo "=== Testing CSV round-trip (import then re-export) ==="
node scripts/import-csv.js "$TMPDIR/hips.csv"
node scripts/export-csv.js hips --output "$TMPDIR/hips-roundtrip.csv"
if diff -q "$TMPDIR/hips.csv" "$TMPDIR/hips-roundtrip.csv" > /dev/null; then
  echo "CSV round-trip: PASS (no diff)"
else
  echo "CSV round-trip: FAIL"
  diff "$TMPDIR/hips.csv" "$TMPDIR/hips-roundtrip.csv" || true
  exit 1
fi
echo ""

echo "=== Testing JSON round-trip (import then re-export) ==="
node scripts/import-json.js "$TMPDIR/hips.json"
node scripts/export-json.js hips --output "$TMPDIR/hips-roundtrip.json"
# Strip the "exported" timestamp before comparing (it changes each run)
jq 'del(.exported)' "$TMPDIR/hips.json" > "$TMPDIR/hips-stripped.json"
jq 'del(.exported)' "$TMPDIR/hips-roundtrip.json" > "$TMPDIR/hips-roundtrip-stripped.json"
if diff -q "$TMPDIR/hips-stripped.json" "$TMPDIR/hips-roundtrip-stripped.json" > /dev/null; then
  echo "JSON round-trip: PASS (no diff)"
else
  echo "JSON round-trip: FAIL"
  diff "$TMPDIR/hips-stripped.json" "$TMPDIR/hips-roundtrip-stripped.json" || true
  exit 1
fi
echo ""

echo "=== Testing fixture import (CSV) ==="
node scripts/import-csv.js tests/fixtures/sample-import.csv
echo ""

echo "=== Testing fixture import (JSON) ==="
node scripts/import-json.js tests/fixtures/sample-import.json
echo ""

echo "=== Verifying no changes to term files ==="
if git diff --quiet terms/; then
  echo "Clean: PASS (no changes to terms/)"
else
  echo "WARNING: terms/ was modified — fixture data may differ from source."
  echo "Run 'git checkout terms/' to restore."
fi
echo ""

echo "All tests passed."
