// What Google shows for the store: the home page title and the description
// every page inherits unless it sets its own. Edited at /admin/config.

export const SEO_KEYS = { title: "seo.title", description: "seo.description" } as const;

// Used while the admin field is empty. Deliberately tied to no collection, so a
// forgotten field never leaves a past season advertised in search results.
export const SEO_DEFAULTS = {
  title: "SWEBO | BUILT ON UNIQUENESS",
  description: "SWEBO – BUILT ON UNIQUENESS. בגדים מעוצבים במידות S–XL, משלוח מהיר לכל הארץ, תשלום מאובטח.",
};

// Google cuts longer text off with an ellipsis; the admin shows these as guides.
export const SEO_TITLE_LIMIT = 60;
export const SEO_DESCRIPTION_LIMIT = 160;

export interface Seo { title: string; description: string }

export function parseSeo(config: Record<string, string | undefined>): Seo {
  return {
    title: config[SEO_KEYS.title]?.trim() || SEO_DEFAULTS.title,
    description: config[SEO_KEYS.description]?.trim() || SEO_DEFAULTS.description,
  };
}
