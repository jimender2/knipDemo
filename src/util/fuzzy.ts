export function levenshtein(a: string, b: string): number {
  const rows = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = rows[0]!;
    rows[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = rows[j]!;
      rows[j] = Math.min(
        rows[j]! + 1,
        rows[j - 1]! + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return rows[b.length]!;
}

export function suggest(input: string, candidates: readonly string[]): string | undefined {
  return candidates.find((candidate) => levenshtein(input, candidate) <= 2);
}
