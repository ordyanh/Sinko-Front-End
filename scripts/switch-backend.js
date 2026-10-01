import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env");

const LOCAL_AUTH = "http://localhost:5273/";
const LOCAL_CORE = "http://localhost:5206/";
const REMOTE_AUTH = "https://syncoauthservice-f0e9fkaqgyczegas.swedencentral-01.azurewebsites.net";
const REMOTE_CORE = "https://synco-h4etbseqg4h2ewcw.swedencentral-01.azurewebsites.net";

const targetArg = (process.argv[2] || "").toLowerCase().trim();

function readEnv() {
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

function writeEnv(target) {
  const isLocal = target === "local";
  const content = `# Synco Backend Target Configuration
# Values: "local" | "remote"
VITE_BACKEND_TARGET=${isLocal ? "local" : "remote"}

# Active URLs (used by SSR / direct client requests)
VITE_AUTH_API_URL=${isLocal ? LOCAL_AUTH : REMOTE_AUTH}
VITE_CORE_API_URL=${isLocal ? LOCAL_CORE : REMOTE_CORE}

# Local C:\\Src\\Horeca endpoints
VITE_LOCAL_AUTH_URL=${LOCAL_AUTH}
VITE_LOCAL_CORE_URL=${LOCAL_CORE}

# Remote Azure endpoints
VITE_REMOTE_AUTH_URL=${REMOTE_AUTH}
VITE_REMOTE_CORE_URL=${REMOTE_CORE}
`;

  fs.writeFileSync(envPath, content, "utf-8");
  console.log(`\n======================================================`);
  console.log(` Switched Synco Backend Target to: ${isLocal ? "LOCAL (C:\\Src\\Horeca)" : "REMOTE (Azure Cloud)"}`);
  console.log(`======================================================`);
  console.log(` Auth Service: ${isLocal ? LOCAL_AUTH : REMOTE_AUTH}`);
  console.log(` Core Service: ${isLocal ? LOCAL_CORE : REMOTE_CORE}`);
  console.log(`\nRestart or reload the dev server (npm run dev) to apply.\n`);
}

function showStatus() {
  const env = readEnv();
  const target = (env.VITE_BACKEND_TARGET || "local").toLowerCase();
  const isLocal = target === "local";
  console.log(`\n======================================================`);
  console.log(` Current Synco Backend Target: ${isLocal ? "LOCAL" : "REMOTE"}`);
  console.log(`======================================================`);
  console.log(` Target Mode : ${target}`);
  console.log(` Auth Service: ${env.VITE_AUTH_API_URL || (isLocal ? LOCAL_AUTH : REMOTE_AUTH)}`);
  console.log(` Core Service: ${env.VITE_CORE_API_URL || (isLocal ? LOCAL_CORE : REMOTE_CORE)}`);
  console.log(`\nTo switch:\n  npm run use:local   (switch to C:\\Src\\Horeca local backend)\n  npm run use:remote  (switch to Azure remote backend)\n`);
}

if (targetArg === "local" || targetArg === "remote") {
  writeEnv(targetArg);
} else if (targetArg === "toggle") {
  const env = readEnv();
  const current = (env.VITE_BACKEND_TARGET || "remote").toLowerCase();
  writeEnv(current === "local" ? "remote" : "local");
} else {
  showStatus();
}
