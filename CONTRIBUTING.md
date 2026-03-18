# Contributing to PreventionWeb Term

We welcome corrections, translation improvements, and new term suggestions. There are a few ways to contribute depending on your comfort level with GitHub.

## Edit on GitHub

Every term page has an "Edit on GitHub" link. Clicking it opens the term's source file in the GitHub editor. You can make changes there and submit a pull request. GitHub will guide you through forking the repository if you don't have write access.

Term files are YAML frontmatter with translations grouped by language code. Edit the fields under the language you want to change:

```yaml
translations:
  fr:
    term: Inondation
    definition: >
      Le débordement des limites normales d'un cours d'eau...
    context: >-
      L'inondation de 2016 a touché plusieurs départements du centre de la France.
    part_of_speech: nom
    aliases:
      - Crue
    source:
      text: 'UNDRR, 2017'
      url: 'https://www.undrr.org/publication/...'
```

The key fields are:

- **`term`** — the term in this language
- **`definition`** — short definition (supports `*italic*`, `**bold**`, `[links](url)`)
- **`part_of_speech`** — grammatical category in the target language
- **`context`** — example sentence or usage note
- **`aliases`** — alternative names
- **`source.text`** and **`source.url`** — citation and link to source document

See the [frontmatter reference](https://github.com/unisdr/undrr-term/blob/main/README.md#frontmatter-reference) in the README for the full schema.

### Folder-based terms

Most terms are single `.md` files, but some use a folder structure when they have extended descriptions or assets:

```
terms/hips-2025/gh0101/
  gh0101_index.md              # frontmatter with short definitions
  gh0101_description_en.md     # extended narrative (English)
  gh0101_description_fr.md     # extended narrative (French)
```

Filenames are prefixed with the term code. The `{code}_description_{lang}.md` files contain full markdown and are editable the same way.

## Work with CSV or JSON exports

Every terminology project can be downloaded as CSV or JSON from the project page or any term page. You can use the language picker to download just the English source alongside a single target language — this keeps the file small and easier to review.

To contribute using exports:

1. Download the CSV or JSON for the project and language you want to work on (e.g., `unisdr-2009-fr.csv` for English + French)
2. Edit the file in a spreadsheet or text editor — add or correct translations, fill in missing definitions
3. Send the updated file back by [opening an issue](https://github.com/unisdr/undrr-term/issues) with the file attached, or import it directly if you have repository access:

```bash
yarn import:csv updated-terms.csv
yarn import:json updated-terms.json
```

The import scripts only update what you changed. Languages and fields not in your file are left alone.

## Translate through Weblate

For larger translation work, we use a self-hosted Weblate instance. Weblate provides a web interface for translating strings without needing to work with files directly. To request access, [open an issue](https://github.com/unisdr/undrr-term/issues) or contact the UNDRR web team.

## File an issue

If you spot an error but don't want to edit the file yourself, open an issue at [github.com/unisdr/undrr-term/issues](https://github.com/unisdr/undrr-term/issues) describing the problem and which term it affects.

## Things to keep in mind

**Do:**
- Translate terms and definitions, not source citations — keep `source.text` and `source.url` pointing to the original reference
- Use the correct grammatical category for the target language (`noun` in English might be `nom` in French, `اسم` in Arabic)
- Include aliases if a term has common alternative names in your language
- Add a context sentence showing how the term is used, when possible

**Don't:**
- Machine-translate definitions without review — if you use MT as a starting point, mark the confidence as 1 (Machine) or 2 (Draft) until a reviewer checks it
- Change the `code` or `id` fields — these are permanent identifiers used in URLs and cross-references
- Edit English source definitions unless there is a factual error — these come from official UNDRR publications
- Remove existing translations in other languages when updating your own

## What gets reviewed

All contributions go through pull request review by UNDRR terminology specialists before being merged. Source language (English) definitions come from authoritative UNDRR publications and are generally not changed through community edits unless there is a clear factual error.

## License

By contributing, you agree that your contributions will be licensed under the project's existing terms: Apache License 2.0 for code and Creative Commons Attribution 4.0 IGO for terminology content. See [LICENSE](https://github.com/unisdr/undrr-term/blob/main/LICENSE) for details.
