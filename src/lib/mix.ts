// Mixed-colour sets: a Set of Three where each case has its own colour.
// Pure helpers shared by the browser cart, the server quote and unit tests.

/** One case in the set and the colours it can be ordered in. */
export interface MixCase {
  label: string;
  colours: string[];
}

/** Identity of a cart line. Two sets with different colour choices are different lines. */
export function lineKey(variantId: string, mix?: string[] | null): string {
  return mix?.length ? `${variantId}|${mix.join('|')}` : variantId;
}

/** Check a requested colour per case against what exists. Returns the canonical names, or null if invalid. */
export function resolveMix(mix: unknown, cases: MixCase[]): string[] | null {
  if (!Array.isArray(mix) || !cases.length || mix.length !== cases.length) return null;
  const out: string[] = [];
  for (let i = 0; i < cases.length; i++) {
    const wanted = String(mix[i]).trim().toLowerCase();
    const found = cases[i].colours.find((c) => c.toLowerCase() === wanted);
    if (!found) return null;
    out.push(found);
  }
  return out;
}

export function isMatched(mix: string[]): boolean {
  return mix.every((c) => c === mix[0]);
}

/** "Cabin Black · Medium Graphite · Large Glacier Blue" */
export function mixLabel(mix: string[], cases: MixCase[]): string {
  return cases.map((c, i) => `${c.label} ${mix[i]}`).join(' · ');
}
