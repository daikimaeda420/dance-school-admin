// scripts/add-migrate-if-directurl.cjs
const { execSync } = require("child_process");

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

if (process.env.DIRECT_URL) {
  console.log("✅ DIRECT_URL found: running prisma migrate deploy");
  run("npx prisma migrate deploy");
} else {
  console.log("⚠️ DIRECT_URL not found: skip prisma migrate deploy");
}
