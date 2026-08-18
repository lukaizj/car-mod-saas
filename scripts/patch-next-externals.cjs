/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(process.cwd(), ".next", "server");
const aliases = [
  [/(@prisma\/adapter-better-sqlite3)-[0-9a-f]+/g, "$1"],
  [/(@prisma\/client)-[0-9a-f]+/g, "$1"],
  [/(better-sqlite3)-[0-9a-f]+/g, "$1"],
];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(filePath);
    else if (/\.(?:js|mjs|cjs|json|map)$/.test(entry.name)) {
      const original = fs.readFileSync(filePath, "utf8");
      let updated = original;
      for (const [pattern, replacement] of aliases) updated = updated.replace(pattern, replacement);
      if (updated !== original) fs.writeFileSync(filePath, updated);
    }
  }
}

if (!fs.existsSync(root)) throw new Error("Next server output not found: " + root);
visit(root);
console.log("patched Next external module aliases");
