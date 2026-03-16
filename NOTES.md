# Research notes

Collected during initial design of UNDRR.Term, March 2026.

## Prior art worth revisiting

### Glosario (The Carpentries)
- github.com/carpentries/glosario
- Single `glossary.yml` file with all terms and translations
- Jekyll site on GitHub Pages
- Contributors use the GitHub web interface directly, no tooling needed
- Python and R packages let you query the glossary programmatically
- Limitation: a single YAML file stops scaling past a few hundred terms

### MDN translated-content
- github.com/mdn/translated-content
- 7 community-maintained translations (ES, FR, JA, KO, PT-BR, RU, ZH)
- Each locale mirrors the English folder structure
- PRs trigger review notifications to localization communities
- German translations use GPT-4o with human review (added 2025)
- Lesson: the mirrored folder structure creates a lot of file duplication, but it keeps things predictable

### Unicode CLDR
- cldr.unicode.org, github.com/unicode-org/cldr
- XML format using LDML (Unicode Locale Data Markup Language)
- Locale-specific data for dates, times, numbers, currencies, language names, country names
- Community contributions via the CLDR Survey Tool, open twice a year
- By far the most mature system, but way more infrastructure than we need

### iso-codes on Weblate
- hosted.weblate.org/projects/iso-codes/
- Translating ISO language names into 163 languages
- 15,638 strings, about 29% complete
- ISO 639-2 is a separate component within the project
- This is the closest precedent to what we're building

### WIPO Pearl
- wipopearl.wipo.int
- 265,000+ terms across 10 languages, all expert-validated
- Concept-oriented: one record per concept, 2-10 language equivalents minimum
- Rich metadata per term: part of speech, gender, number, usage labels, reliability ratings
- 29,000 linked concept maps showing broader/narrower relationships
- The metadata model is more than we need at first, but worth keeping in mind for later

### UNTerm
- unterm.un.org
- 85,000+ terms in 6 UN languages (plus German and Portuguese)
- Updated daily, organized by collections tied to UN bodies
- Shared between UN Secretariat and specialized agencies (IMO, UNESCO, WHO, WMO)
- No public API that we found

### TBX (TermBase eXchange)
- ISO 30042:2019
- The formal standard for terminology data interchange
- XML-based, concept-oriented: each `termEntry` has `langSet` children
- Supports metadata at concept, language, and term levels
- Weblate natively supports TBX import/export
- We won't use TBX as our primary format, but knowing it exists helps if we ever need to interoperate with tools like SDL MultiTerm or OmegaT

### Terminologue
- github.com/gaois/terminologue
- Open source terminology management tool from Foras na Gaeilge (Irish language body)
- Structured glossary management, worth looking at if we ever outgrow the git-based approach

### BaseTerm
- github.com/byutrg/baseterm
- Open source terminology management with native TBX-Basic support
- REST API, Symfony backend
- BYU Translation Research Group maintains 45+ TBX-related repos

### Markdown localization spec
- github.com/markdown-localization/mdlm-spec
- Formal spec for localizing markdown files using HTML comments for l10n metadata
- Partially automatable with mdlm-sh
- We're taking a different approach (YAML frontmatter), but this spec is worth knowing about

## Weblate format notes

Weblate supports many file formats. The ones relevant to us:

**JSON (our choice):** Flat monolingual key-value. Requires a base language file (English). Each component needs a file mask like `weblate/hips/*.json`. Simplest and most portable option.

**TBX:** Natively supported. Could be an export target later if we need to feed data into CAT tools.

**Markdown:** Weblate can extract translatable strings from markdown, but it's a one-way workflow where Weblate is the source of truth. That's the opposite of what we want (our markdown files are the source of truth), so we compile to JSON instead.

**Weblate project hierarchy:**
- Project (top-level container, e.g., "UNDRR HIPs")
- Category (optional grouping)
- Component (linked to a specific repo path, e.g., the `terms` component reading from `weblate/hips/*.json`)
- Translation files (auto-discovered by file mask)

**Weblate push modes:** Can push directly or via PRs. We use PR mode for safety. Can also be configured with webhooks for real-time sync.

## UNDRR content scope

### Hazard Information Profiles (HIPs)
- 2025 version: 281 hazards
- Organized into 8 hazard types, further divided by cluster
- 6 UN languages (AR, ZH, EN, FR, RU, ES)
- The 2009 version had additional languages: Bahasa, Cambodian, Dhivehi, Hindi, Malay, Nepali, Pashtun, Farsi, Tagalog
- New "open" numbering system allows adding hazards within clusters later

### Sendai Framework Terminology
- 282+ terms
- 6 UN languages
- Linked to the Sendai Framework, SDGs, and Paris Agreement
- Continuously updated, most recent changes in 2025
- Available at undrr.org/drr-glossary/terminology

### ISO 639-2
- About 485 language codes (three-letter)
- Each entry has: code, English name, French name, scope, language type
- SIL maintains the definitive dataset at iso639-3.sil.org (for 639-3; Library of Congress maintains 639-2)
- Tab-delimited UTF-8 download available
- The iso-codes project on Weblate is already translating these names into 163 languages at about 29% completion

## Data model decisions and why

**One file per concept vs. one file per language:** We chose one file per concept. This keeps the concept atomic: a contributor editing "flood" sees all six languages in one place. The trade-off is that we need a compile step to produce the per-language files Weblate expects. Worth it for the editing experience.

**YAML frontmatter vs. pure YAML or JSON:** Markdown with YAML frontmatter lets us have structured data (translations, metadata) and free-form content (extended notes, images) in one file. Pure YAML would work for the structured part but wouldn't handle rich content as naturally.

**Concept-level vs. per-language fields:** Some fields belong to the concept regardless of language (domain, category, status, related terms). Others are language-specific and need to live inside each language's translation block:
- `context` - Example sentences or usage notes, written in the target language
- `part_of_speech` - Grammatical category, varies by language (English "noun" vs. French "nom" vs. Arabic "اسم")
- `aliases` - Alternative names, language-specific
- `definition`, `term`, `source` - Obviously per-language

Domain labels like `natural-hazards/meteorological` stay as fixed keys in the frontmatter. The site translates them via `i18n.json` for display.

**Flat JSON vs. nested JSON for Weblate:** Flat key-value is the most portable Weblate format. Nested JSON can cause issues with some Weblate features. The keys use dot notation (`mh0301.term`, `mh0301.definition`, `mh0301.context`, `mh0301.part_of_speech`) which is readable enough.

**Source codes as filenames:** The whiteboard paths (`/hi3`, `/mh0301`, `/sfn_terms`) are real identifiers from the source systems. Using them as filenames preserves the link to source data. Human-readable slugs go in frontmatter and are used only for URL generation.

## Tools to evaluate during implementation

- **gray-matter** (npm): YAML frontmatter parser for Node.js. Well-maintained, handles edge cases.
- **js-yaml** (npm): YAML serializer. Need to ensure round-trip stability (parse then stringify produces identical output).
- **Fuse.js** vs **Lunr.js**: Both work for client-side search. Fuse.js is simpler (fuzzy matching, no index build step). Lunr.js is faster for large datasets but needs a pre-built index. With ~1,000 terms across HIPs and Sendai, either works. ISO 639 at 485 entries might push us toward Lunr if we want faster search.
- **csv-parse** (npm): For the CSV import scripts.
- **11ty i18n plugin**: Built-in since Eleventy 2.0. Handles locale-aware URL generation and language switching.
