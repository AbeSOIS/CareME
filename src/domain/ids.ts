let counter = 0

/** Collision-resistant enough for a single-browser prototype. */
export function newId(prefix: string): string {
  counter = (counter + 1) % 1_000_000
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/** Ministry-style client code, e.g. "KLT-2026-0042". */
export function clientCode(districtPrefix: string, year: number, sequence: number): string {
  return `${districtPrefix}-${year}-${String(sequence).padStart(4, '0')}`
}
