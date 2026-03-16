# UNDRR.Term - Product requirements document

## Why this exists

UNDRR's multilingual terminology is scattered across PDFs, spreadsheets, databases, and websites. The Hazard Information Profiles live in one place, the Sendai Framework glossary in another, and ISO language codes in yet another. Translators, Drupal sites, and downstream UN systems all need this data, but there's no single machine-readable source.

UNDRR.Term is a GitHub repository that fixes this. It stores multilingual terms as markdown files, compiles them to JSON for Weblate, and publishes a browsable website on GitHub Pages. The whole thing runs on Node.js and GitHub Actions, nothing heavier.

## What we looked at first

We studied how other organizations handle this problem before designing anything:

- **Glosario** (The Carpentries) stores a multilingual computing glossary in a single YAML file on GitHub, published with Jekyll. Simple and contributor-friendly, but doesn't scale well past a few hundred terms.
- **MDN translated-content** mirrors English documentation into per-locale folders on GitHub. Community translators open PRs. Works at scale but the folder mirroring creates a lot of duplication.
- **Unicode CLDR** is the gold standard for structured locale data. XML-based, concept-oriented, with a survey tool for community input. Far more infrastructure than we need, but the data model is worth learning from.
- **iso-codes on Weblate** already translates ISO 639 language names into 163 languages. Proves the Weblate-plus-Git workflow works for terminology at this scale.
- **WIPO Pearl and UNTerm** both use concept-oriented models where one entry represents one idea across all languages, with metadata like definitions, aliases, and reliability ratings.
- **TBX (TermBase eXchange)**, ISO 30042, is the formal standard for terminology interchange. Concept-oriented XML. We won't use TBX directly, but our data model borrows its concept-per-entry principle.

The main takeaway: organize around concepts, not individual translations. One file per concept, all languages together. Compile to per-language files only when a tool (Weblate) requires it.

---

## 1. Translation sub-projects

Three projects to start. More can be added later by dropping a new folder with a config file.

| Project | Slug | What's in it | How many | Languages |
|---------|------|--------------|----------|-----------|
| Hazard Information Profiles | `hips` | Hazard definitions from the 2025 HIPs | ~281 terms | AR, ZH, EN, FR, RU, ES |
| Sendai Framework Terminology | `sendai` | DRR concepts and definitions | ~282+ terms | AR, ZH, EN, FR, RU, ES |
| ISO 639 Language Codes | `iso639` | Language names and codes | ~485 (639-2) | AR, ZH, EN, FR, RU, ES (expandable) |

---

## 2. Data model

### One markdown file per concept

Each term is a markdown file. All six languages live in the YAML frontmatter of that single file. The markdown body below the frontmatter is optional space for extended notes, images, or diagrams.

Fields split into two categories:

- **Concept-level metadata** (not translated): `domain`, `category`, `status`, `related`. These describe the concept itself and don't change across languages. Domain labels get translated in the site UI via `i18n.json`, but the frontmatter value stays as a fixed key.
- **Per-language fields** (translatable): `term`, `definition`, `context`, `part_of_speech`, `aliases`, `source`. These are language-specific. Part of speech varies by language. Context sentences are written in each target language.

```yaml
---
id: flood
code: mh0301             # source system identifier, used as filename
slug: flood              # human-readable, used in URLs
project: hips
status: published        # draft | review | published
category: hydrological
domain: natural-hazards/meteorological  # concept-level, not translated
related:
  - flash-flood
  - coastal-flood
translations:
  en:
    term: Flood
    definition: >
      The overflowing of the normal confines of a stream
      or other body of water, or the accumulation of water
      over areas not normally submerged.
    context: "The 2011 Thailand flood caused $45.7 billion in damages."
    part_of_speech: noun
    aliases:
      - Flooding
    source: "UNDRR, 2017"
  ar:
    term: فيضان
    definition: >
      تجاوز المياه لحدودها الطبيعية...
    context: "تسبب فيضان تايلاند عام 2011 في أضرار بقيمة 45.7 مليار دولار."
    part_of_speech: اسم
    source: "UNDRR, 2017"
  zh:
    term: 洪水
    definition: >
      河流溢出正常河道...
    part_of_speech: 名词
  fr:
    term: Inondation
    definition: >
      Le débordement des limites normales...
    context: "L'inondation de 2016 a touché plusieurs départements."
    part_of_speech: nom
    aliases:
      - Crue
    source: "UNDRR, 2017"
  ru:
    term: Наводнение
    definition: >
      Выход воды за пределы...
    part_of_speech: существительное
  es:
    term: Inundación
    definition: >
      El desbordamiento de los confines normales...
    part_of_speech: sustantivo
    aliases:
      - Crecida
---

## Additional notes

Extended content goes here. Images, diagrams, whatever the term needs.
```

### Naming: source codes as filenames, slugs for URLs

Filenames use the source system code: `terms/hips/mh0301.md`. The frontmatter carries both the `code` (mh0301) and a human-readable `slug` (flood). The website uses the slug in URLs: `/en/hips/flood/`. Weblate JSON keys use the code: `"mh0301.term": "Flood"`.

This keeps the connection to source systems while giving humans readable URLs.

### When a term needs images or other assets

It becomes a folder instead of a file:

```
terms/hips/mh0301/
  index.md          # same frontmatter format
  diagram.png
```

The build pipeline treats both cases the same: it reads `index.md` from folders or `*.md` from files.

### Per-project config: `_project.yml`

```yaml
name: "Hazard Information Profiles"
slug: hips
description: "Hazard definitions from UNDRR"
languages: [ar, zh, en, fr, ru, es]
source_language: en
weblate:
  project: undrr-hips
  component: terms
```

---

## 3. Repository layout

```
undrr-term/
├── .github/
│   └── workflows/
│       ├── build.yml              # compile, build site, deploy
│       └── weblate-sync.yml       # import Weblate PRs back to markdown
├── terms/
│   ├── hips/
│   │   ├── _project.yml
│   │   ├── mh0301.md              # flood
│   │   ├── mh0302/                # earthquake (has assets)
│   │   │   ├── index.md
│   │   │   └── diagram.png
│   │   └── ...
│   ├── sendai/
│   │   ├── _project.yml
│   │   └── ...
│   └── iso639/
│       ├── _project.yml
│       └── ...
├── weblate/                       # CI-generated JSON, committed to repo
│   ├── hips/
│   │   ├── en.json
│   │   ├── ar.json
│   │   └── ...
│   ├── sendai/
│   │   └── ...
│   └── iso639/
│       └── ...
├── site/                          # 11ty static site
│   ├── package.json
│   ├── .eleventy.js
│   └── src/
│       ├── _includes/layouts/
│       │   └── base.njk           # Mangrove CSS
│       ├── _data/
│       │   └── i18n.json          # UI string translations
│       ├── assets/
│       │   ├── css/
│       │   └── js/
│       │       └── search.js      # client-side keyword search
│       └── index.njk
├── scripts/
│   ├── compile-to-json.js         # markdown to Weblate JSON
│   ├── import-from-weblate.js     # Weblate JSON back to markdown
│   ├── import-csv.js              # CSV source data to markdown terms
│   ├── import-json.js             # JSON source data to markdown terms
│   └── build-search-index.js      # generate search index for the site
├── weblate.yml                    # maps sub-projects to Weblate components
├── package.json
└── README.md
```

---

## 4. Weblate integration (self-hosted)

### JSON format

Flat monolingual key-value JSON. One file per language per project. Weblate's simplest and most reliable format.

`weblate/hips/en.json` (source):
```json
{
  "mh0301.term": "Flood",
  "mh0301.definition": "The overflowing of the normal confines of a stream...",
  "mh0301.context": "The 2011 Thailand flood caused $45.7 billion in damages.",
  "mh0301.part_of_speech": "noun",
  "mh0301.aliases": "Flooding",
  "mh0302.term": "Drought",
  "mh0302.definition": "An extended period of deficient rainfall...",
  "mh0302.part_of_speech": "noun"
}
```

Keys use dot notation: `{code}.{field}`. Empty strings in target language files tell Weblate a translation is missing.

### How data flows in both directions

**Markdown to JSON** (when someone pushes to main):
1. `compile-to-json.js` reads all term markdown files
2. Extracts translations from frontmatter, one per language
3. Writes flat JSON to `weblate/{project}/{lang}.json`
4. Commits the updated JSON; Weblate picks up changes via webhook

**JSON to markdown** (when a translator works in Weblate):
1. Weblate pushes its changes as a pull request (modifying JSON files)
2. The `weblate-sync.yml` workflow runs `import-from-weblate.js`
3. That script reads the changed JSON and patches the corresponding markdown frontmatter
4. It commits the markdown updates into the same PR
5. After merge, a compile run produces no diff (the round-trip is idempotent)

### Avoiding conflicts

- Weblate pushes PRs, never directly to main
- English is read-only in Weblate; source text is only edited in markdown
- The round-trip (compile then import then compile) always converges
- Lock Weblate during bulk manual edits using `wlc lock`

### Weblate project mapping: `weblate.yml`

```yaml
projects:
  - path: terms/hips
    weblate_project: undrr-hips
    weblate_component: terms
    file_mask: weblate/hips/*.json
    base_file: weblate/hips/en.json
    file_format: json
  - path: terms/sendai
    weblate_project: undrr-sendai
    weblate_component: terms
    file_mask: weblate/sendai/*.json
    base_file: weblate/sendai/en.json
    file_format: json
  - path: terms/iso639
    weblate_project: undrr-iso639
    weblate_component: codes
    file_mask: weblate/iso639/*.json
    base_file: weblate/iso639/en.json
    file_format: json
```

---

## 5. GitHub Pages site

### Stack

- **Eleventy (11ty)**: Node.js, lightweight, reads markdown natively, has i18n support built in
- **Mangrove CSS**: UNDRR's design system, loaded from `https://assets.undrr.org/static/mangrove/1.3.3/css/style.css`
- **Client-side search**: Fuse.js or Lunr.js with a pre-built index per language

### URLs

```
/                              landing page with language selector
/{lang}/                       project listing
/{lang}/{project}/             term index with search
/{lang}/{project}/{slug}/      individual term page
/{lang}/search/                global search across all projects
```

### What the site does

- Switch between the 6 UN languages
- Browse terms by project with keyword filtering
- View individual terms with all their language variants side by side
- Follow cross-links to related terms
- Click "Edit on GitHub" to propose changes directly
- UI chrome (navigation, labels, buttons) is itself translated via `i18n.json`

### Base template

```html
<!DOCTYPE html>
<html lang="{{ lang }}">
<head>
  <link rel="stylesheet"
    href="https://assets.undrr.org/static/mangrove/1.3.3/css/style.css">
</head>
<body>
  <!-- UNDRR-branded header, nav, content, footer -->
</body>
</html>
```

---

## 6. CI/CD (GitHub Actions)

### `build.yml` runs on every push to main and on PRs

1. Checkout, set up Node.js, `npm ci`
2. Run `compile-to-json.js` (markdown to JSON)
3. If JSON files changed on main: commit them
4. Build the 11ty site
5. Build the search index
6. Deploy to GitHub Pages (main only)

### `weblate-sync.yml` runs on PRs from Weblate branches

1. Checkout, set up Node.js, `npm ci`
2. Run `import-from-weblate.js` (JSON to markdown)
3. If markdown changed: commit into the PR branch
4. Run `compile-to-json.js` to verify the round-trip produces no diff

---

## 7. How non-technical people contribute

### Now (MVP): "Edit on GitHub" links

Every term page links to the markdown file in the GitHub web editor. GitHub handles fork creation for people without write access. Low friction, zero custom code.

### Next: a submit-an-edit form on the site

An inline form on each term page with the current translations pre-filled. The user edits what they want to change and either:
- Downloads a JSON patch file they can email to a maintainer
- Authenticates with GitHub (OAuth) and the site creates a PR on their behalf

### Later: an intermediary app

A lightweight serverless function or GitHub App that accepts edit submissions from people without GitHub accounts. It creates PRs with a `community-contribution` label for moderation. This is the "application that makes feature branches" from the whiteboard sketch.

---

## 8. Downstream API

The CI pipeline also generates structured JSON for other systems to consume:

```
api/v1/
  manifest.json           # all projects, languages, term counts
  hips/all.json           # all HIPs terms, all languages, by concept
  sendai/all.json
  iso639/all.json
```

Drupal sites, Sendai Framework systems, and other consumers can fetch these from `https://{org}.github.io/undrr-term/api/v1/hips/all.json`.

---

## 9. Implementation phases

### Phase 1: foundation
- Repository structure (`terms/`, `scripts/`, `site/`, `.github/`)
- Term format with 5-10 sample HIPs entries
- `scripts/compile-to-json.js`
- `scripts/import-csv.js` and `scripts/import-json.js` for initial data loading
- Root `package.json`
- `build.yml` GitHub Action (compile step only)

### Phase 2: static site
- Initialize 11ty in `site/`
- Base layout using Mangrove CSS
- Data pipeline that reads `terms/` as 11ty data
- Term pages, index pages, language switcher
- Client-side search
- GitHub Pages deployment in CI

### Phase 3: Weblate integration
- Configure self-hosted Weblate projects/components pointing to the repo
- `scripts/import-from-weblate.js`
- `weblate-sync.yml` GitHub Action
- Test the full round-trip end to end

### Phase 4: content migration
- Import all 281 HIPs terms from JSON/CSV sources
- Import Sendai Framework terminology
- Import ISO 639-2 language codes (~485 entries)
- Verify everything renders

### Phase 5: contributor experience
- "Edit on GitHub" links on every term page
- Contributor docs
- Issue templates for suggesting new terms
- (Future) the submit-an-edit form

---

## 10. Decisions made

| Question | Answer |
|----------|--------|
| Term IDs | Source system code as filename (mh0301.md); human-readable slug in frontmatter for URLs |
| Weblate hosting | Self-hosted |
| ISO 639 scope | ISO 639-2, about 485 languages |
| Source data | Mix of JSON and CSV imports, no PDFs |
| Site styling | UNDRR Mangrove CSS |
| Static site generator | Eleventy (11ty) |
| Weblate format | Flat monolingual JSON, one file per language per project |
| Source language | English; read-only in Weblate |

## 11. Still open

- Should the system support languages beyond the 6 official UN languages from the start?
- How many HIPs terms will need associated images or diagrams?
- What are the exact code schemes for each source project?
