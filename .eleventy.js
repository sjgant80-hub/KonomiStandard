const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");

module.exports = function(eleventyConfig) {
  // The reference site is served at /KonomiStandard/src/ (the landing at /KonomiStandard/ links ./src/index.html):
  // every absolute href and src in the output is rewritten under that prefix, so the stylesheet, the scripts and the
  // pages resolve on GitHub Pages.
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

  // Passthrough copy
  eleventyConfig.addPassthroughCopy("src/assets");
  // the token-savings measurement (the estate's, by Kar): its page, its sealed data, and the credit
  eleventyConfig.addPassthroughCopy({ "savings.html": "savings.html", "measure/data": "measure/data", "NOTICE": "NOTICE" });

  // Collections
  eleventyConfig.addCollection("standards", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/standards/*.njk");
  });

  eleventyConfig.addCollection("udts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/udts/*.njk");
  });

  // Filters
  eleventyConfig.addFilter("json", function(value) {
    return JSON.stringify(value, null, 2);
  });

  eleventyConfig.addFilter("slug", function(value) {
    if (!value) return '';
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  });

  eleventyConfig.addFilter("escape", function(value) {
    if (!value) return '';
    return value.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  });

  // Shortcodes
  eleventyConfig.addShortcode("udt", function(name) {
    if (!name) return '';
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `<a href="/udts/${slug}" class="text-konomi-accent hover:underline">${name}</a>`;
  });

  eleventyConfig.addShortcode("mermaid", function(code) {
    return `<div class="mermaid">${code}</div>`;
  });

  return {
    pathPrefix: "/KonomiStandard/src/",
    dir: {
      input: "src",
      output: "dist/src"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
