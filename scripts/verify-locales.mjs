// One-off JSON validator for all locale files in assets/i18n/.
// Asserts each file parses, has a `record` object, and `record.ended` is present.
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "..", "assets", "i18n");
const files = readdirSync(dir).filter(f => f.endsWith(".json") && f !== "i18n.js");
let failed = 0;
for (const f of files) {
  const full = join(dir, f);
  try {
    const data = JSON.parse(readFileSync(full, "utf8"));
    if (!data.record) {
      console.error("FAIL  " + f + ": missing record object");
      failed++;
      continue;
    }
    if (!data.record.ended) {
      console.error("FAIL  " + f + ": missing record.ended");
      failed++;
      continue;
    }
    console.log("PASS  " + f + "  record.ended = \"" + data.record.ended + "\"");
  } catch (e) {
    console.error("FAIL  " + f + ": " + e.message);
    failed++;
  }
}
console.log("");
if (failed === 0) {
  console.log("All " + files.length + " locale files valid.");
  process.exit(0);
} else {
  console.log(failed + " file(s) failed.");
  process.exit(1);
}
