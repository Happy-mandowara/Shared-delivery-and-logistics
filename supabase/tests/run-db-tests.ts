import { execSync } from "child_process";
import path from "path";

const psqlPath = process.env.PSQL_PATH || path.join(process.env.USERPROFILE || "", "pgsql", "bin", "psql.exe");
const dbUrl = process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/nationx_delivery";

const testFiles = [
  "supabase/tests/rls_isolation.test.sql",
  "supabase/tests/state_transitions.test.sql",
  "supabase/tests/concurrency_idempotency.test.sql",
];

console.log("=== NationX PostgreSQL 16 Test Suite ===");
console.log(`Connecting to: ${dbUrl}`);

// Seed database first for a clean state
try {
  console.log("Seeding database with deterministic dataset...");
  execSync(`"${psqlPath}" -d "${dbUrl}" -v ON_ERROR_STOP=1 -f "supabase/seed.sql"`, {
    stdio: "pipe",
  });
} catch (e: any) {
  console.error("Failed to seed database:", e.message);
  process.exit(1);
}

let allPassed = true;

for (const testFile of testFiles) {
  console.log(`\n--> Running ${testFile}...`);
  try {
    const output = execSync(`"${psqlPath}" -d "${dbUrl}" -v ON_ERROR_STOP=1 -f "${testFile}"`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    console.log(output.trim());
    console.log(`[PASS] ${testFile}`);
  } catch (err: any) {
    console.error(`[FAIL] ${testFile}`);
    if (err.stdout) console.error(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    allPassed = false;
    break;
  }
}

if (!allPassed) {
  console.error("\n❌ Database tests failed.");
  process.exit(1);
} else {
  console.log("\n✅ All PostgreSQL RLS, State Machine, and Concurrency tests passed!");
}

