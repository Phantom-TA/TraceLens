/**
 * @file utils/slug.ts
 * @description URL and string slugification for deterministic file naming.
 */

/** Slugify a URL into a safe filename component */
export function slugifyUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname
      .replace(/^\//, "")
      .replace(/\/+$/, "")
      .replace(/\//g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "");
    return path ? `${host}-${path}` : host;
  } catch {
    return url
      .toLowerCase()
      .replace(/https?:\/\//g, "")
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
  }
}

/** Slugify any string to a CSS-safe identifier */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Generate a section anchor ID from a label */
export function sectionId(label: string): string {
  return `section-${slugify(label)}`;
}
