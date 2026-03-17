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
  git checkout -- terms/
  echo "Restored terms/ from git."
fi
echo ""

echo "=== Testing --lang filter (CSV) ==="
node scripts/export-csv.js hips --lang zh --output "$TMPDIR/hips-zh.csv"
# Header should have en_* and zh_* columns but NOT fr_*, ar_*, ru_*, es_*
HEADER=$(head -1 "$TMPDIR/hips-zh.csv")
if echo "$HEADER" | grep -q "en_term" && echo "$HEADER" | grep -q "zh_term" && ! echo "$HEADER" | grep -q "fr_term"; then
  echo "--lang CSV column filter: PASS"
else
  echo "--lang CSV column filter: FAIL"
  echo "Header: $HEADER"
  exit 1
fi
# Import the filtered CSV — French translations must still be present
node scripts/import-csv.js "$TMPDIR/hips-zh.csv"
if grep -q "Wind" terms/hips/mh0301.md; then
  echo "--lang CSV import preserves data: PASS"
else
  echo "--lang CSV import preserves data: FAIL (term data missing)"
  exit 1
fi
git checkout -- terms/
echo ""

echo "=== Testing --lang filter (JSON) ==="
node scripts/export-json.js hips --lang zh --output "$TMPDIR/hips-zh.json"
# JSON should list only en and zh in languages array
LANG_COUNT=$(jq '.languages | length' "$TMPDIR/hips-zh.json")
if [ "$LANG_COUNT" -eq 2 ]; then
  echo "--lang JSON language filter: PASS (2 languages)"
else
  echo "--lang JSON language filter: FAIL (expected 2 languages, got $LANG_COUNT)"
  jq '.languages' "$TMPDIR/hips-zh.json"
  exit 1
fi
# Verify no French translations leaked into the filtered export
if ! jq -e '.terms[0].translations.fr' "$TMPDIR/hips-zh.json" > /dev/null 2>&1; then
  echo "--lang JSON translation filter: PASS (no fr in export)"
else
  echo "--lang JSON translation filter: FAIL (fr present in filtered export)"
  exit 1
fi
# Import the filtered JSON — French translations must still be present
node scripts/import-json.js "$TMPDIR/hips-zh.json"
if grep -q "Wind" terms/hips/mh0301.md; then
  echo "--lang JSON import preserves data: PASS"
else
  echo "--lang JSON import preserves data: FAIL (term data missing)"
  exit 1
fi
git checkout -- terms/
echo ""

echo "=== Testing auto-ID generation (CSV template) ==="
node scripts/import-csv.js tests/fixtures/template-new-terms.csv
# Verify drr001.md got auto-generated id and slug
if grep -q 'id: disaster-risk-reduction' terms/oewg-2016/drr001.md && \
   grep -q 'slug: disaster-risk-reduction' terms/oewg-2016/drr001.md && \
   grep -q 'status: draft' terms/oewg-2016/drr001.md; then
  echo "Auto-ID (CSV): PASS"
else
  echo "Auto-ID (CSV): FAIL"
  echo "Expected id: disaster-risk-reduction, slug: disaster-risk-reduction, status: draft in terms/oewg-2016/drr001.md"
  cat terms/oewg-2016/drr001.md
  exit 1
fi
# Clean up
rm -f terms/oewg-2016/drr001.md terms/oewg-2016/drr002.md terms/oewg-2016/drr003.md
echo ""

echo "=== Testing auto-ID generation (JSON template) ==="
node scripts/import-json.js tests/fixtures/template-new-terms.json
# Verify drr001.md got auto-generated id and slug
if grep -q 'id: disaster-risk-reduction' terms/oewg-2016/drr001.md && \
   grep -q 'slug: disaster-risk-reduction' terms/oewg-2016/drr001.md && \
   grep -q 'status: draft' terms/oewg-2016/drr001.md; then
  echo "Auto-ID (JSON): PASS"
else
  echo "Auto-ID (JSON): FAIL"
  echo "Expected id: disaster-risk-reduction, slug: disaster-risk-reduction, status: draft in terms/oewg-2016/drr001.md"
  cat terms/oewg-2016/drr001.md
  exit 1
fi
# Verify resilience and vulnerability too
if grep -q 'id: resilience' terms/oewg-2016/drr002.md && \
   grep -q 'id: vulnerability' terms/oewg-2016/drr003.md; then
  echo "Auto-ID (other terms): PASS"
else
  echo "Auto-ID (other terms): FAIL"
  exit 1
fi
# Clean up
rm -f terms/oewg-2016/drr001.md terms/oewg-2016/drr002.md terms/oewg-2016/drr003.md
echo ""

echo "=== Testing multi-project export ==="
node scripts/export-csv.js unisdr-2009 --output "$TMPDIR/unisdr-2009.csv"
node scripts/export-csv.js oewg-2016 --output "$TMPDIR/oewg-2016.csv"
UNISDR_COUNT=$(tail -n +2 "$TMPDIR/unisdr-2009.csv" | grep -c '.')
OEWG_COUNT=$(tail -n +2 "$TMPDIR/oewg-2016.csv" | grep -c '.')
if [ "$UNISDR_COUNT" -eq 53 ] && [ "$OEWG_COUNT" -eq 65 ]; then
  echo "Multi-project export: PASS (unisdr-2009: $UNISDR_COUNT, oewg-2016: $OEWG_COUNT)"
else
  echo "Multi-project export: FAIL (unisdr-2009: $UNISDR_COUNT expected 53, oewg-2016: $OEWG_COUNT expected 65)"
  exit 1
fi
echo ""

echo "All tests passed."
