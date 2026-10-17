/**
 * A number and its noun, singular for one: `countOf(1, "file")` → "1 file",
 * `countOf(1407, "file")` → "1,407 files". Every count the interface shows goes through it.
 */
export function countOf(n: number, noun: string, pluralNoun = `${noun}s`): string {
  return `${n.toLocaleString("en")} ${n === 1 ? noun : pluralNoun}`;
}
