import fs from "fs";
import path from "path";
import matter from "gray-matter";
import yaml from "js-yaml";
import markdownIt from "markdown-it";

const md = markdownIt({ html: false, linkify: true });

export default function (eleventyConfig) {
  const termsDir = path.resolve(import.meta.dirname, "..", "terms");

  // Load all terms from the terms/ directory as global data
  eleventyConfig.addGlobalData("terms", () => {
    const projects = fs
      .readdirSync(termsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    const allTerms = [];

    for (const projectDir of projects) {
      const projectPath = path.join(termsDir, projectDir.name);
      const configPath = path.join(projectPath, "_project.yml");
      if (!fs.existsSync(configPath)) continue;

      const projectConfig = yaml.load(fs.readFileSync(configPath, "utf8"));

      const entries = fs.readdirSync(projectPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith("_")) continue;

        let filePath;
        if (entry.isFile() && entry.name.endsWith(".md")) {
          filePath = path.join(projectPath, entry.name);
        } else if (entry.isDirectory()) {
          filePath = path.join(projectPath, entry.name, "index.md");
          if (!fs.existsSync(filePath)) continue;
        } else {
          continue;
        }

        const raw = fs.readFileSync(filePath, "utf8");
        const { data, content } = matter(raw);

        // Check for description_{lang}.md files (extended narrative content)
        if (!data.translations) data.translations = {};
        const termDir = path.dirname(filePath);
        const descFiles = fs
          .readdirSync(termDir)
          .filter((f) => f.match(/^description_[a-z]{2}\.md$/));
        for (const descFile of descFiles) {
          const lang = descFile.replace("description_", "").replace(".md", "");
          const descContent = fs.readFileSync(path.join(termDir, descFile), "utf8").trim();
          if (!data.translations[lang]) data.translations[lang] = {};
          data.translations[lang].description = descContent;
        }

        allTerms.push({
          ...data,
          body: content,
          projectConfig,
          sourcePath: path.relative(path.resolve(termsDir, ".."), filePath),
        });
      }
    }

    return allTerms;
  });

  // Load project configs
  eleventyConfig.addGlobalData("projects", () => {
    const projects = fs
      .readdirSync(termsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    const configs = [];
    for (const projectDir of projects) {
      const configPath = path.join(termsDir, projectDir.name, "_project.yml");
      if (!fs.existsSync(configPath)) continue;
      configs.push(yaml.load(fs.readFileSync(configPath, "utf8")));
    }
    return configs;
  });

  // Languages
  eleventyConfig.addGlobalData("languages", () => [
    { code: "ar", name: "العربية", dir: "rtl" },
    { code: "zh", name: "中文", dir: "ltr" },
    { code: "en", name: "English", dir: "ltr" },
    { code: "fr", name: "Français", dir: "ltr" },
    { code: "ru", name: "Русский", dir: "ltr" },
    { code: "es", name: "Español", dir: "ltr" },
  ]);

  // Load CONTRIBUTING.md as global data
  eleventyConfig.addGlobalData("contributing", () => {
    const filePath = path.resolve(import.meta.dirname, "..", "CONTRIBUTING.md");
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  });

  // Load METHODOLOGY.md as global data
  eleventyConfig.addGlobalData("methodology", () => {
    const filePath = path.resolve(import.meta.dirname, "..", "METHODOLOGY.md");
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  });

  // Pass through static assets
  eleventyConfig.addPassthroughCopy("src/assets");

  // Filter: render inline markdown (bold, italic, links) in strings
  eleventyConfig.addFilter("mdInline", (str) => {
    if (!str) return "";
    return md.renderInline(String(str));
  });

  // Filter: render full markdown (paragraphs, lists, etc.)
  eleventyConfig.addFilter("md", (str) => {
    if (!str) return "";
    return md.render(String(str));
  });

  // Filter: strip markdown to plain text (for JSON-LD descriptions)
  eleventyConfig.addFilter("plaintext", (str) => {
    if (!str) return "";
    return String(str)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) → text
      .replace(/[*_~`#]+/g, "")                 // bold, italic, strikethrough, code, headings
      .replace(/!\[[^\]]*\]\([^)]+\)/g, "")     // images
      .replace(/\n{2,}/g, " ")                  // collapse paragraph breaks
      .replace(/\n/g, " ")                      // collapse line breaks
      .trim();
  });

  // Filter: get terms for a specific project and language
  eleventyConfig.addFilter("termsForProject", (terms, projectSlug) => {
    return terms.filter((t) => t.project === projectSlug);
  });

  // Filter: get translated term name
  eleventyConfig.addFilter("termName", (term, lang) => {
    return term.translations?.[lang]?.term || term.translations?.en?.term || term.id;
  });

  // Filter: get translated definition
  eleventyConfig.addFilter("termDef", (term, lang) => {
    return term.translations?.[lang]?.definition || term.translations?.en?.definition || "";
  });

  return {
    pathPrefix: "/undrr-term/",
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
  };
}
