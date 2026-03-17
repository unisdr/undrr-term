# UNDRR.Term

> **Alpha proof of concept** as of 16 March 2026. Under active development and testing. Breaking changes will happen, and not all data is loaded yet.
>
> The live site is gated behind a preview PIN: **5498**. Enter it once per browser session to access the pages.

Multilingual terminology for the UN Office for Disaster Risk Reduction, managed as markdown files in git. Terms compile to JSON for Weblate translation workflows and get published as a static site.

![Whiteboard sketch of the UNDRR.Term architecture](site/src/assets/images/whiteboard.jpg)

## What it does

- One markdown file per concept. All six UN languages sit together in YAML frontmatter.
- Compiles to flat JSON for Weblate (self-hosted)
- Builds a static site with Eleventy and UNDRR's Mangrove design system
- Syncs both directions between markdown and Weblate, so you can edit in either place

## Term projects

| Project | Folder | Description |
|---------|--------|-------------|
| Hazard Information Profiles | `terms/hips/` | Hazard definitions from the 2025 HIPs (~281 terms) |
| Sendai Framework Terminology | `terms/sendai/` | DRR concepts and definitions (~282+ terms) |

Languages: Arabic, Chinese, English, French, Russian, Spanish.

## Getting started

```bash
yarn install
yarn compile          # markdown → JSON
yarn dev              # local dev server (Eleventy)
yarn build            # full build (compile + site)
```

### Other scripts

```bash
yarn import:weblate   # pull translations back from Weblate JSON into markdown
```

## How terms are structured

Each term is a markdown file in `terms/{project}/`. Filenames use the source system code (e.g., `mh0301.md` for flood). All translations live in the frontmatter. Definitions support inline markdown (bold, italic, links).

```yaml
---
id: flood
code: mh0301
slug: flood
project: hips
status: published
domain: natural-hazards/meteorological
translations:
  en:
    term: Flood
    definition: >
      The overflowing of the normal confines of a *stream*
      or other body of water...
    part_of_speech: noun
    context: "The 2011 Thailand flood caused $45.7 billion in damages."
    aliases:
      - Flooding
    source:
      text: "UNDRR, 2017"
      url: "https://www.undrr.org/publication/..."
  fr:
    term: Inondation
    definition: Le débordement des limites normales...
    part_of_speech: nom
    source:
      text: "UNDRR, 2017"
      url: "https://www.undrr.org/publication/..."
  # ... ar, zh, ru, es
---
```

When a term needs images or extended descriptions, it becomes a folder:

```
terms/hips/gh0001/
  index.md              # frontmatter with short definitions
  description_en.md     # extended narrative (English)
  description_fr.md     # extended narrative (French)
  fault-mechanics.svg   # diagram referenced in descriptions
```

See [METHODOLOGY.md](METHODOLOGY.md) for design rationale, prior art, and the Weblate sync workflow.

## Repository layout

```
terms/          Markdown term files, one per concept
weblate/        CI-generated JSON for Weblate (do not edit by hand)
scripts/        Build and import scripts
site/           Eleventy static site
```

## License

Code (scripts, templates, config) is Apache License 2.0. Content (terminology data) is Creative Commons Attribution 4.0 IGO. See [LICENSE](LICENSE).
