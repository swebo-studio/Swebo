/**
 * Checks for the free-form size label rules.
 *
 * Sizes stopped being a fixed XS–XXL list, so the label handling in lib/sizes.ts
 * is now what keeps a shop's typing from reaching the database as duplicates,
 * blanks or overlong strings — and what decides the order customers see. These
 * are the cases that mattered while building it, kept so a later edit cannot
 * quietly change them.
 *
 *   npx tsx scripts/checkSizes.ts
 */
import {
  dedupeSizeLabels,
  duplicateSizeLabels,
  hasBlankSizeLabel,
  MAX_SIZE_LABEL,
  normalizeSizeLabel,
  parseSizeLabels,
  parseSizePresets,
  sizeRowsAreValid,
  DEFAULT_SIZE_PRESETS,
} from "../lib/sizes";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) return console.log(`  ok    ${name}`);
  failures++;
  console.log(`  FAIL  ${name}\n          expected ${e}\n          got      ${a}`);
}

console.log("label normalising");
check("trims", normalizeSizeLabel("  42  "), "42");
check("collapses inner whitespace", normalizeSizeLabel("34 /  32"), "34 / 32");
check("caps length", normalizeSizeLabel("x".repeat(50)).length, MAX_SIZE_LABEL);
check("blank stays blank", normalizeSizeLabel("   "), "");
check("keeps non-latin labels", normalizeSizeLabel(" מידה אחת "), "מידה אחת");

console.log("\nlist parsing");
check("splits on commas", parseSizeLabels("40, 41,42"), ["40", "41", "42"]);
check("splits on newlines", parseSizeLabels("40\n41"), ["40", "41"]);
check("drops empties", parseSizeLabels("40,,  ,41"), ["40", "41"]);
check("keeps pants labels intact", parseSizeLabels("34/32, 36/34"), ["34/32", "36/34"]);
check("dedupes case-insensitively, first spelling wins", dedupeSizeLabels(["M", "m", "L"]), ["M", "L"]);

console.log("\nrow validation");
check("clean rows are valid", sizeRowsAreValid([{ size: "40" }, { size: "41" }]), true);
check("duplicates are not", sizeRowsAreValid([{ size: "40" }, { size: " 40" }]), false);
check("blank labels are not", sizeRowsAreValid([{ size: "40" }, { size: "" }]), false);
check("duplicate set is lower-cased", [...duplicateSizeLabels([{ size: "M" }, { size: "m" }])], ["m"]);
check("blank detection", hasBlankSizeLabel([{ size: "40" }, { size: "  " }]), true);

console.log("\npresets");
check("unset falls back to defaults", parseSizePresets(null).length, DEFAULT_SIZE_PRESETS.length);
check("unreadable falls back to defaults", parseSizePresets("{").length, DEFAULT_SIZE_PRESETS.length);
check("configured empty stays empty", parseSizePresets("[]"), []);
check("drops nameless presets", parseSizePresets('[{"name":"","sizes":["40"]}]'), []);
check("drops empty presets", parseSizePresets('[{"name":"נעליים","sizes":[]}]'), []);
check(
  "keeps a real preset",
  parseSizePresets('[{"name":"נעליים","sizes":["40"," 41 ","41"]}]'),
  [{ name: "נעליים", sizes: ["40", "41"] }]
);

console.log(failures === 0 ? "\nAll size label rules hold." : `\n${failures} failing check(s).`);
if (failures > 0) process.exit(1);
