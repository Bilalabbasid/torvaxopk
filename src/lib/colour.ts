/** "Glacier Blue" → "glacier-blue", for ?colour= in links. */
export function colourSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** True when a ?colour= value (slug or plain name, any case) means this colour. */
export function colourMatches(name: string, wanted: string | null | undefined): boolean {
  if (!wanted) return false;
  return colourSlug(name) === colourSlug(wanted);
}
