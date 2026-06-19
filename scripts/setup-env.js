const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const envLocalPath = path.join(rootDir, ".env.local");
const envExamplePath = path.join(rootDir, ".env.example");

if (!fs.existsSync(envLocalPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envLocalPath);
  console.log("Created .env.local from .env.example");
}
