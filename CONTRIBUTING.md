# Contributing to PreventionWeb Term

We welcome corrections, translation improvements, and new term suggestions. There are a few ways to contribute depending on your comfort level with GitHub.

## Propose a revision on GitHub

Every term page has a "Propose a revision" button in the sidebar. Clicking it opens the term's source file in the GitHub editor. You can make changes there and submit a pull request. GitHub will guide you through forking the repository if you don't have write access.

Term files are YAML frontmatter with translations grouped by language code. Edit the fields under the language you want to change:

```yaml
translations:
  en:
    term: Flood
    definition: >
      The overflowing of the normal confines of a stream...
    source: "UNDRR, 2017"
```

## Translate through Weblate

For larger translation work, we use a self-hosted Weblate instance. Weblate provides a web interface for translating strings without needing to work with files directly. Contact the maintainers for access.

## File an issue

If you spot an error but don't want to edit the file yourself, open an issue at [github.com/unisdr/undrr-term/issues](https://github.com/unisdr/undrr-term/issues) describing the problem and which term it affects.

## What gets reviewed

All contributions go through pull request review by UNDRR terminology specialists before being merged. Source language (English) definitions come from authoritative UNDRR publications and are generally not changed through community edits unless there is a clear factual error.
