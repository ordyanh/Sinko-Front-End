import fs from "node:fs";
import path from "node:path";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

const normalizeUrl = (url: string) => url.replace(/\/+$/, "");

// Default URLs (using 127.0.0.1 to prevent Windows IPv6 ::1 lookup issues)
const LOCAL_AUTH_DEFAULT = "http://127.0.0.1:5273";
const LOCAL_CORE_DEFAULT = "http://127.0.0.1:5206";
const REMOTE_AUTH_DEFAULT = "https://lobster-app-zhysf.ondigitalocean.app";
const REMOTE_CORE_DEFAULT = "https://octopus-app-bomx6.ondigitalocean.app";

function getActiveTarget(cwd: string, mode: string) {
  if (process.env.VITE_BACKEND_TARGET) {
    return process.env.VITE_BACKEND_TARGET.trim().toLowerCase();
  }
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
  return mode === "production" ? "remote" : "local";
}

export default defineConfig(({ mode }) => {
  const cwd = process.cwd();
  const env = loadEnv(mode, cwd, "");
  const target = (env.VITE_BACKEND_TARGET || getActiveTarget(cwd, mode)).toLowerCase();
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
  console.log(`🚀 [Synco Dev Proxy] Active Target: ${isLocal ? "LOCAL" : "REMOTE (Cloud)"}`);
  console.log(`   Auth Service: ${authUrl}`);
  console.log(`   Core Service: ${coreUrl}`);
  console.log(`======================================================\n`);

  return {
    plugins: [tailwindcss(), reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      host: true,
      allowedHosts: true,
      watch: {
        ignored: [
          (file: string) => file.includes(".vs") || file.includes(".git"),
          /[\\/]\.vs([\\/]|$)/,
          /[\\/]\.git([\\/]|$)/,
          "**/.vs/**",
          "**/.git/**",
          "**/bin/**",
          "**/obj/**",
        ],
      },
      proxy: {
        "^/(api/([Aa]uth|[Cc]ompany|[Ee]mployee|verification-request|auth/complete-onboarding|[Ss]upplier/(register|verify|resend-code)|me)|me)": {
          target: authUrl,
          changeOrigin: true,
          secure: false,
          followRedirects: true,
          configure: (proxy) => {
            proxy.on("error", (err, _req, _res) => {
              console.error(`[Auth Proxy Error]: ${err.message} -> Target: ${authUrl}`);
            });
          },
        },
        "^/api/": {
          target: coreUrl,
          changeOrigin: true,
          secure: false,
          followRedirects: true,
          configure: (proxy) => {
            proxy.on("error", (err, _req, _res) => {
              console.error(`[Core Proxy Error]: ${err.message} -> Target: ${coreUrl}`);
            });
          },
        },
        "/orderhub": {
          target: "http://localhost:5147",
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});