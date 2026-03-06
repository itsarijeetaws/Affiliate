import fs from "fs";
import path from "path";

const root = process.cwd();
const frontendNext = path.join(root, "frontend", ".next");
const rootNext = path.join(root, ".next");

if (!fs.existsSync(frontendNext)) {
  console.error("frontend/.next not found. Ensure frontend build completed.");
  process.exit(1);
}

if (fs.existsSync(rootNext)) {
  fs.rmSync(rootNext, { recursive: true, force: true });
}

fs.cpSync(frontendNext, rootNext, { recursive: true });
console.log("Prepared root .next output for Hostinger detection");
