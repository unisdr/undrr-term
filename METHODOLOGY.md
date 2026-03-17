# Methodology

How we arrived at the design of PreventionWeb Term, and what we drew on along the way.

## The problem

UNDRR maintains multilingual terminology across several programs: the Hazard Information Profiles, the Sendai Framework glossary, and others. This terminology exists in PDFs, spreadsheets, and databases that don't talk to each other. Translators, Drupal sites, and downstream UN systems all need this data in machine-readable form, and there's no single place to get it.

We needed something that could serve as a source of truth for translated terms, feed a translation management platform (Weblate), publish a browsable website, and let both technical and non-technical people contribute.

## Design principles

**Git as the backbone.** Version control gives us history, branching, review workflows, and collaboration for free. GitHub Actions handles the build pipeline. GitHub Pages handles hosting. No custom servers to maintain.

**Concept-oriented, not translation-oriented.** Following the model used by TBX (ISO 30042), IATE, UNTerm, and WIPO Pearl, each entry in the system represents one concept. All language variants of that concept live together in a single file. This is the opposite of how most localization tools work (one file per language), but it's the right model for terminology because translators and reviewers need to see all languages at once.

**Markdown with YAML frontmatter.** We wanted something that works in a text editor, renders nicely on GitHub, and can be parsed by scripts. YAML frontmatter gives us the structured fields (term, definition, part of speech, context, aliases) while the markdown body handles extended content like diagrams and notes. Definitions support inline markdown for light formatting (bold, italic, links).

**Compile to Weblate, not the other way around.** The markdown files are the source of truth. A build step compiles them into flat monolingual JSON that Weblate can consume. When translators submit work through Weblate, a separate script patches the translations back into the markdown. The round-trip is idempotent: compile, import, compile again, and you get the same output.

**Lightweight and static.** Eleventy generates the website. No database, no server-side rendering, no framework overhead. The site uses UNDRR's Mangrove CSS for styling and client-side search for filtering. The whole thing builds in under a second.

## What we studied

We looked at how other organizations solve similar problems before making any decisions.

### Terminology systems

**TBX (TermBase eXchange), ISO 30042.** The international standard for terminology data interchange. XML-based and concept-oriented: each `termEntry` holds language sets with terms, definitions, and metadata at multiple levels. We borrowed the concept-per-entry model but used YAML instead of XML for readability. TBX matters because Weblate supports it natively, so if we ever need to export to CAT tools like SDL MultiTerm or OmegaT, we have a path.

- https://www.tbxinfo.net/
- ISO 30042:2019

**IATE (Inter-Active Terminology for Europe).** The EU's inter-institutional terminology database covering 24 official languages. Concept-oriented, organized into 21 thematic fields, with reliability coding for each term. Their approach to domain classification and term reliability influenced our `domain` and `status` fields.

- https://iate.europa.eu/

**UNTerm.** The UN's own terminology database, covering 85,000+ terms in 6 official languages plus German and Portuguese. Maintained jointly by the UN Secretariat and specialized agencies. Organized by collections tied to UN bodies. As of 2025, no public API was available, but the data model (concept-oriented, multi-agency) validated our approach.

- https://unterm.un.org/

**WIPO Pearl.** The World Intellectual Property Organization's terminology portal. 265,000+ terms across 10 languages, all expert-validated. Notable for its rich per-term metadata: part of speech, gender, number, usage labels (standardized, recommended, proposed, obsolete), contextual definitions, reliability ratings, and 29,000 linked concept maps. We included `part_of_speech`, `context`, and `aliases` in our schema partly because of WIPO Pearl's example.

- https://wipopearl.wipo.int/
- WIPO Pearl User Guide: https://www.wipo.int/en/web/wipo-pearl/guide

### Git-based translation projects

**Glosario (The Carpentries).** A multilingual glossary for computing and data science terms, stored as a single `glossary.yml` file on GitHub with a Jekyll site. Contributors use the GitHub web interface directly. Simple and effective for a few hundred terms, but the single-file approach doesn't scale.

- https://github.com/carpentries/glosario

**MDN translated-content.** Mozilla's developer documentation translations. Each locale mirrors the English folder structure in its own directory. Community translators open PRs, and localization leads review. As of early 2025, they were using machine translation with human review for German. The folder mirroring creates duplication, but the PR-based review workflow is solid.

- https://github.com/mdn/translated-content

**Unicode CLDR.** The Common Locale Data Repository. XML-based, structured locale data for dates, times, numbers, currencies, and language/country names. Community contributions happen through the CLDR Survey Tool, open twice yearly. Far more infrastructure than we need, but the concept-oriented data model and survey-based contribution process are worth knowing about.

- https://cldr.unicode.org/
- https://github.com/unicode-org/cldr

**iso-codes on Weblate.** An existing project translating ISO 639 language names into 163 languages via Weblate's hosted instance. 15,638 strings at about 29% completion. This is the closest precedent to what we're building: terminology data in a git repo, translated through Weblate, with the git repo as the source of truth.

- https://hosted.weblate.org/projects/iso-codes/

### Translation platforms and tools

**Weblate.** The translation platform we're integrating with. Supports GitHub/GitLab integration, can push translations as PRs or direct commits, has built-in glossary management, and handles many file formats including JSON, TBX, and (experimentally) markdown. We chose flat monolingual JSON as our interchange format because it's the simplest and most reliable Weblate format.

- https://docs.weblate.org/

**Pontoon (Mozilla).** Mozilla's localization platform. Highlights glossary terms during translation and uses TBX for terminology management. Worth considering if we outgrow Weblate's built-in glossary features.

- https://github.com/mozilla/pontoon

**BaseTerm (BYU Translation Research Group).** Open-source terminology management system with native TBX-Basic support and a REST API. If we ever need a dedicated terminology management interface beyond what git and Weblate provide, BaseTerm is an option.

- https://github.com/byutrg/baseterm

### Markdown localization

**Markdown Localization Specification (mdlm).** A formal spec for localizing markdown files using HTML comments for localization metadata. We took a different path (structured YAML frontmatter) but the spec is worth knowing about for future reference.

- https://github.com/markdown-localization/mdlm-spec

## Key decisions and trade-offs

**All languages in one file vs. one file per language.** We chose one file per concept with all languages in the frontmatter. This keeps the concept atomic and makes it easy for humans to review and edit. The cost is a compile step to produce the per-language JSON files Weblate needs. The editing experience is the bottleneck, not build time.

**Source codes as filenames and in URLs.** The source systems already have identifiers for their terms (like `mh0301` for flood in the HIPs). We use these as both filenames and URL paths (`/en/hips/mh0301/`). Codes are immutable -- term names can change through translation, but the code never does. A human-readable `slug` field in frontmatter is available for display purposes but isn't used in routing.

**Concept-level vs. per-language metadata.** Some fields belong to the concept regardless of language: `domain`, `category`, `status`, `related`. Others vary by language: `term`, `definition`, `context`, `part_of_speech`, `aliases`, `source`. Part of speech varies because the same concept may be a noun in English but a different grammatical category in another language. Context sentences only make sense in the target language.

**Structured source attribution.** The `source` field is a structured object with `text` (the human-readable citation) and an optional `url` (link to the source document). Both are per-language because the same concept may cite a different language edition of a document, or a completely different source for a particular language's definition. In Weblate, source is flattened to two keys: `{code}.source_text` and `{code}.source_url`.

**Inline markdown in definitions.** Definitions support `*italic*`, `**bold**`, and `[links](url)` via markdown-it's inline renderer. This is a pragmatic middle ground: enough formatting for the occasional emphasis or cross-reference without turning the YAML frontmatter into full markdown documents. Weblate shows the raw markup to translators, but translators regularly work with inline formatting in strings.

**Folder-based terms for assets.** Most terms are single `.md` files. When a term needs diagrams, photos, or other assets, it becomes a folder with `index.md` plus the asset files. The build pipeline handles both cases identically.

**Per-language description files.** Short definitions stay in YAML frontmatter. Extended narrative content (diagrams, measurement details, background) lives in separate `description_{lang}.md` files within folder-based terms. This keeps the structured data clean while allowing full markdown for richer content. Not every term needs descriptions, and not every language needs one.

## How the Weblate sync works

The markdown files in `terms/` are the source of truth. Weblate never touches them directly.

**Markdown to Weblate** (on push to main):
1. `compile-to-json.js` reads all term files and description files
2. Extracts translations into flat key-value JSON, one file per language per project
3. Commits the JSON to `weblate/`; Weblate picks up changes via webhook

**Weblate to markdown** (when a translator submits work):
1. Weblate pushes a PR modifying the JSON files
2. `weblate-sync.yml` runs `import-from-weblate.js`
3. The script patches the markdown frontmatter (or description files) with the new translations
4. A verification step recompiles to confirm the round-trip produces no diff

English is read-only in Weblate. Source text is only edited in the markdown files.

## Contributor roadmap

**Current: "Edit on GitHub" links.** Every term page links to the markdown file in the GitHub web editor. GitHub handles fork creation for people without write access.

**Planned: submit-an-edit form.** An inline form on each term page with translations pre-filled. Users edit what they want and either download a patch file or authenticate with GitHub to create a PR directly.

**Future: intermediary application.** A lightweight GitHub App that accepts edit submissions from people without GitHub accounts and creates moderated PRs. This is the "application that makes feature branches" from the original whiteboard sketch.

## What we didn't do

**We didn't use TBX as the primary format.** TBX is the standard, but XML is harder to read and edit than YAML/markdown. We can always add a TBX export if interoperability with CAT tools becomes necessary.

**We didn't put the definitions in the markdown body.** It would give us full markdown rendering for free, but it would make the definitions harder to extract programmatically and break the Weblate compile pipeline, which depends on structured YAML fields.

**We didn't build a custom editing UI for non-technical users (yet).** The "Edit on GitHub" link and Weblate are enough for now. A dedicated submission form is planned for later.

## How terms are validated

Not all terms arrive at the same quality level. The validation process depends on where the term came from and what language it's in.

**English source terms** are taken directly from official UNDRR or UN publications. These are not community-editable — they reflect the language of the original document. If the source document has a definition, we use it verbatim. If it only has term names (as with some older publications), the definition field is left empty until an authoritative source is identified.

**Translations from official UN documents** (e.g., UNISDR 2009, OEWG 2016) were produced by UN language services and are treated as verified. They still go through a spot-check during import, but we don't rewrite them.

**New translations** contributed through Weblate, CSV import, or pull requests start at Draft (confidence 2) or Machine (confidence 1) depending on the method. They move up the scale through review:

1. A translator submits the work
2. A second linguist or domain specialist reviews it (confidence 3: Reviewed)
3. A terminologist verifies it against the source publication (confidence 4: Verified)
4. For official UN terminology, the translation may be endorsed through a formal process (confidence 5: Authoritative)

Not every term needs to reach level 5. For most working translations, level 3 (Reviewed) or 4 (Verified) is the practical target.

**What we check during review:**
- Does the translation match the source concept, not just the English words?
- Is the grammatical category correct for the target language?
- Are aliases and context sentences accurate and natural in the target language?
- Does the source citation point to the right document?

## Per-translation confidence (1–5 scale)

As of March 2026, we added a `confidence` field under each language's translation block. This records how reliable a given translation is, on a 1–5 integer scale:

| Level | Label | Meaning |
|-------|-------|---------|
| 1 | Machine | Machine-translated, no human review |
| 2 | Draft | Human-translated or post-edited, not yet reviewed |
| 3 | Reviewed | Reviewed by a second linguist or domain specialist |
| 4 | Verified | Verified against a published reference or standard |
| 5 | Authoritative | Official UN-endorsed translation (e.g., from a GA resolution) |

### Why per-translation, not per-term

Confidence varies by language. A term may have an authoritative English definition from a General Assembly resolution (level 5) while the Arabic translation is a first-pass machine output (level 1). Putting confidence at the concept level would lose this granularity.

This mirrors how IATE handles reliability codes and how WIPO Pearl tracks term status per language variant. In both systems, the quality signal is on the language-specific entry, not the concept.

### Why 1–5 integers instead of free-text labels

Integer levels are machine-sortable and language-neutral. The human-readable labels ("Machine", "Draft", etc.) are stored in `i18n.json` and localized into all six UN languages. Using integers in the data keeps the YAML clean and avoids spelling variations.

We considered a 3-level scale (low/medium/high) but it collapses important distinctions — "machine-translated" and "human draft" are both "low" confidence but require very different reviewer effort. The 5-level scale matches the typical terminology management pipeline: generate → draft → review → verify → endorse.

### Why confidence is excluded from Weblate

Confidence is reviewer metadata, not translator-editable text. Translators in Weblate should not be able to change the confidence rating of their own work — that's the reviewer's job. By excluding `confidence` from `TRANSLATABLE_FIELDS`, it never appears in the compiled Weblate JSON files. Reviewers set it by editing the YAML frontmatter directly or through CSV/JSON import.

### No migration required

Both `confidence` and the `retired` status value are optional and additive. Existing terms without confidence values display normally (no badge). Existing terms with `status: published` or `status: draft` are unaffected. The fields are populated incrementally during the terminological review process.

## Retired status

Terms can become obsolete when concepts are superseded, merged, or withdrawn. Rather than deleting these entries (which would break URLs, cross-references, and external links), we added `retired` as a third status value alongside `published` and `draft`.

Retired terms remain in the database and are accessible at their original URLs. The site shows a grey banner ("This term has been retired") and dims the card in project listings. This follows the pattern used by WIPO Pearl's "obsolete" label and ISO standards' withdrawal process — the record stays, clearly marked as no longer current.
