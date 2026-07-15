// Apply distractor patches produced by the rewrite-distractors workflow.
//
// Input: a JSON file shaped like the workflow result:
//   [ { fileBase, patches: [ { key, choices:[4], correct } ], expected:[...] }, ... ]
//
// For each patch, rewrite the matching q("key", CATEGORY, "text", [...], "label")
// call in prisma/data/<fileBase>.ts, replacing ONLY the choices array and the
// correct label. The question text and key are preserved.
//
//   npx tsx prisma/applyPatches.ts <patches.json>
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

// Index which data file each question key lives in (keys can be in topup files
// rather than the same-named category file).
const DATA_DIR = join("prisma", "data");
const fileCache = new Map<string, string>(); // path -> contents
const keyToFile = new Map<string, string>(); // key -> path
for (const f of readdirSync(DATA_DIR).filter((f) => f.endsWith(".ts"))) {
  const path = join(DATA_DIR, f);
  const src = readFileSync(path, "utf8");
  fileCache.set(path, src);
  for (const m of src.matchAll(/q\(\s*"([^"]+)"/g)) keyToFile.set(m[1], path);
}

interface Patch {
  key: string;
  choices: string[];
  correct: string;
}
interface FileResult {
  fileBase: string;
  patches: Patch[];
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("usage: tsx prisma/applyPatches.ts <patches.json>");
  process.exit(1);
}

const results: FileResult[] = JSON.parse(readFileSync(inputPath, "utf8"));

// Escape a string for embedding in a double-quoted TS string literal.
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

let applied = 0;
let missed = 0;
const dirty = new Set<string>();

for (const { patches } of results) {
  if (!patches?.length) continue;

  for (const p of patches) {
    if (!p.choices || p.choices.length !== 4) {
      missed++;
      continue;
    }
    const path = keyToFile.get(p.key);
    if (!path) {
      console.warn(`! key not found anywhere: ${p.key}`);
      missed++;
      continue;
    }
    let src = fileCache.get(path)!;

    const keyEsc = p.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // q("key", CATEGORY, "text", [ ...choices... ], "label")  — single- or multi-line
    const re = new RegExp(
      `(q\\(\\s*"${keyEsc}"\\s*,\\s*[^,]+,\\s*)("(?:[^"\\\\]|\\\\.)*")(\\s*,\\s*)\\[[\\s\\S]*?\\](\\s*,\\s*)"[กขคง]"(\\s*\\))`
    );
    const choicesLiteral =
      "[\n" + p.choices.map((c) => `    "${esc(c)}",`).join("\n") + "\n  ]";
    const replacement = `$1$2$3${choicesLiteral}$4"${p.correct}"$5`;
    if (re.test(src)) {
      src = src.replace(re, replacement);
      fileCache.set(path, src);
      dirty.add(path);
      applied++;
    } else {
      console.warn(`! could not match ${p.key} in ${path}`);
      missed++;
    }
  }
}

for (const path of dirty) writeFileSync(path, fileCache.get(path)!);
console.log(`Applied ${applied} patches, missed ${missed}.`);
