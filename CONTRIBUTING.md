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

See the [frontmatter reference](README.md#frontmatter-reference) in the README for the full schema.

### Folder-based terms

Most terms are single `.md` files, but some use a folder structure when they have extended descriptions or assets:

```
terms/hips/gh0001/
  index.md              # frontmatter with short definitions
  description_en.md     # extended narrative (English)
  description_fr.md     # extended narrative (French)
  fault-mechanics.svg   # diagram referenced in descriptions
```

The `description_{lang}.md` files contain full markdown and are editable the same way.

## Translate through Weblate

For larger translation work, we use a self-hosted Weblate instance. Weblate provides a web interface for translating strings without needing to work with files directly. To request access, [open an issue](https://github.com/unisdr/undrr-term/issues) or contact the UNDRR web team.

## File an issue

If you spot an error but don't want to edit the file yourself, open an issue at [github.com/unisdr/undrr-term/issues](https://github.com/unisdr/undrr-term/issues) describing the problem and which term it affects.

## What gets reviewed

All contributions go through pull request review by UNDRR terminology specialists before being merged. Source language (English) definitions come from authoritative UNDRR publications and are generally not changed through community edits unless there is a clear factual error.

## License

By contributing, you agree that your contributions will be licensed under the project's existing terms: Apache License 2.0 for code and Creative Commons Attribution 4.0 IGO for terminology content. See [LICENSE](LICENSE) for details.
