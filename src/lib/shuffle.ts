// Deterministic shuffle so the SAME seed always produces the SAME order.
//
// Why deterministic (not Math.random)? A quiz round must keep a stable order:
// reloading the page mid-quiz should show the same questions in the same
// positions, not reshuffle and lose the user's place. A new round passes a new
// seed to get a fresh order.

// mulberry32 PRNG — small, fast, good enough for shuffling quiz order.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hash an arbitrary string seed into a 32-bit integer (FNV-1a).
export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Fisher–Yates shuffle driven by a seeded PRNG. Returns a new array.
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
