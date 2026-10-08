import fs from "node:fs";
import path from "node:path";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

const normalizeUrl = (url: string) => url.replace(/\/+$/, "");

const LOCAL_AUTH_DEFAULT = "http://localhost:5273";
const LOCAL_CORE_DEFAULT = "http://localhost:5206";
const REMOTE_AUTH_DEFAULT = "https://syncoauthservice-f0e9fkaqgyczegas.swedencentral-01.azurewebsites.net";
const REMOTE_CORE_DEFAULT = "https://synco-h4etbseqg4h2ewcw.swedencentral-01.azurewebsites.net";

function getActiveTarget(cwd: string) {
  try {
    const envPath = path.resolve(cwd, ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const match = content.match(/^VITE_BACKEND_TARGET\s*=\s*(.+)$/m);
      if (match) return match[1].trim().toLowerCase();
    }
  } catch {
    // fallback
  }
  return "local";
}

export default defineConfig(({ mode }) => {
  const cwd = process.cwd();
  const env = loadEnv(mode, cwd, "");
  const target = (getActiveTarget(cwd) || process.env.VITE_BACKEND_TARGET || "local").toLowerCase();
  const isLocal = target === "local";

  const authUrl = normalizeUrl(
    isLocal
      ? env.VITE_LOCAL_AUTH_URL || LOCAL_AUTH_DEFAULT
      : env.VITE_REMOTE_AUTH_URL || env.VITE_AUTH_API_URL || REMOTE_AUTH_DEFAULT
  );

  const coreUrl = normalizeUrl(
    isLocal
      ? env.VITE_LOCAL_CORE_URL || LOCAL_CORE_DEFAULT
      : env.VITE_REMOTE_CORE_URL || env.VITE_CORE_API_URL || REMOTE_CORE_DEFAULT
  );

  console.log(`\n======================================================`);
  console.log(`🚀 [Synco Dev Proxy] Active Target: ${isLocal ? "LOCAL (C:\\Src\\synco-app\\Horeca)" : "REMOTE (Azure Cloud)"}`);
  console.log(`   Auth Service: ${authUrl} (local: http://localhost:5273)`);
  console.log(`   Core Service: ${coreUrl} (local: http://localhost:5206)`);
  console.log(`   (Switch with: npm run use:local / npm run use:remote)`);
  console.log(`======================================================\n`);

  return {
    plugins: [tailwindcss(), reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      proxy: {
        "^/(api/([Aa]uth|[Cc]ompany|[Ee]mployee|verification-request|auth/complete-onboarding|[Ss]upplier/(register|verify|resend-code)|me)|me)": {
          target: authUrl,
          changeOrigin: true,
          secure: false,
          followRedirects: true,
        },
        "^/api/([Dd]ictionary|[Pp]roducts|[Oo]rders|[Cc]art|[Pp]romotions|[Cc]ustomers|[Mm]arketplace|[Nn]otifications|[Ss]ubscription|[Aa]dmin|[Ss]upplier|[Dd]ashboard)": {
          target: coreUrl,
          changeOrigin: true,
          secure: false,
          followRedirects: true,
        },
      },
    },
  };
});
