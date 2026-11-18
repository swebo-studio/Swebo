/**
 * Settles once the site popups are out of the way — acknowledged, none to
 * show, or not shown on this page — so other popups (the newsletter offer)
 * don't open on top of, or under, a message the visitor must read first.
 */
let settle: () => void = () => {};
export const sitePopupsSettled: Promise<void> = new Promise((resolve) => { settle = resolve; });
export function settleSitePopups() { settle(); }
