/**
 * Edition Formatter
 *
 * Converts extracted ProductMention[] into a formatted "Products in This Edition"
 * footer section for newsletters. Supports markdown and HTML, minimal and full styles.
 * affiliate_link may be null — rendered as plain name until ChatAds resolves it.
 */

import type { ProductMention } from "./types.js";

export type EditionFormat = "markdown" | "html";
export type EditionStyle = "minimal" | "full";

const STRENGTH_ORDER: Record<string, number> = {
  strong: 0,
  endorsed: 1,
  mentioned: 2,
  organic: 3,
};

const STRENGTH_LABEL: Record<string, string> = {
  strong: "⭐ Top Picks",
  endorsed: "👍 Endorsed",
  mentioned: "📍 Also Featured",
};

function formatLink(product: ProductMention, format: EditionFormat): string {
  const { name, affiliate_link: link } = product;
  if (format === "html") {
    return link ? `<a href="${link}">${name}</a>` : `<span>${name}</span>`;
  }
  return link ? `[${name}](${link})` : `**${name}**`;
}

/**
 * Generate a "Products in This Edition" section from extracted newsletter products.
 * @param products - ProductMention array from extract_newsletter_products
 * @param format - "markdown" (default) or "html"
 * @param style - "minimal" (name + category) or "full" (grouped by endorsement, with context)
 */
export function generateEditionSection(
  products: ProductMention[],
  format: EditionFormat,
  style: EditionStyle,
): string {
  const significant = products
    .filter(
      (p) =>
        (p.recommendation_strength !== "organic" && p.confidence >= 0.6) ||
        (p.recommendation_strength === "organic" && p.confidence >= 0.8),
    )
    .sort((a, b) => {
      const sa = STRENGTH_ORDER[a.recommendation_strength] ?? 9;
      const sb = STRENGTH_ORDER[b.recommendation_strength] ?? 9;
      return sa !== sb ? sa - sb : b.confidence - a.confidence;
    });

  if (significant.length === 0) {
    return format === "html"
      ? "<p><em>No product mentions found in this edition.</em></p>"
      : "_No product mentions found in this edition._";
  }

  return style === "minimal"
    ? generateMinimal(significant, format)
    : generateFull(significant, format);
}

function generateMinimal(products: ProductMention[], format: EditionFormat): string {
  if (format === "html") {
    const items = products
      .map(
        (p) =>
          `  <li>${formatLink(p, format)} <span class="category">${p.category.replace(/_/g, " ")}</span></li>`,
      )
      .join("\n");
    return `<h2>Products in This Edition</h2>\n<ul>\n${items}\n</ul>`;
  }
  const items = products
    .map((p) => `- ${formatLink(p, format)} — ${p.category.replace(/_/g, " ")}`)
    .join("\n");
  return `## Products in This Edition\n\n${items}`;
}

function generateFull(products: ProductMention[], format: EditionFormat): string {
  const groups: Record<string, ProductMention[]> = {};
  for (const p of products) {
    const key = p.recommendation_strength === "organic" ? "mentioned" : p.recommendation_strength;
    (groups[key] ??= []).push(p);
  }

  const cta = "Affiliate links help keep this newsletter free. Thank you.";

  if (format === "html") {
    const sections = Object.entries(groups).map(([strength, prods]) => {
      const label = STRENGTH_LABEL[strength] ?? strength;
      const items = prods
        .map((p) => {
          const ctx = p.mention_context
            ? ` — <em>${p.mention_context.slice(0, 100)}</em>`
            : "";
          return `    <li>${formatLink(p, format)}${ctx}</li>`;
        })
        .join("\n");
      return `  <h3>${label}</h3>\n  <ul>\n${items}\n  </ul>`;
    });
    return [
      "<h2>Products in This Edition</h2>",
      ...sections,
      `<p><em>${cta}</em></p>`,
    ].join("\n");
  }

  const sections = Object.entries(groups).map(([strength, prods]) => {
    const label = STRENGTH_LABEL[strength] ?? strength;
    const items = prods
      .map((p) => {
        const ctx = p.mention_context
          ? `\n  > *"${p.mention_context.slice(0, 100)}"*`
          : "";
        return `- ${formatLink(p, format)} — ${p.category.replace(/_/g, " ")}${ctx}`;
      })
      .join("\n");
    return `### ${label}\n\n${items}`;
  });

  return `## Products in This Edition\n\n${sections.join("\n\n")}\n\n---\n*${cta}*`;
}
