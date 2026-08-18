const fs = require("node:fs");
const path = require("node:path");

function ensureDatabase({ dataDirectory, templatePath }) {
  fs.mkdirSync(dataDirectory, { recursive: true });
  const databasePath = path.join(dataDirectory, "dev.db");
  if (!fs.existsSync(databasePath)) {
    fs.copyFileSync(templatePath, databasePath, fs.constants.COPYFILE_EXCL);
  }
  return databasePath;
}

module.exports = { ensureDatabase };
