import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import compression from "compression";
import { createRequestHandler } from "@react-router/express";
import { createProxyMiddleware } from "http-proxy-middleware";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const normalizeUrl = (url) => (url ? url.replace(/\/+$/, "") : "");

const isLocal = (process.env.VITE_BACKEND_TARGET || "local").toLowerCase() === "local";

const LOCAL_AUTH_DEFAULT = "http://localhost:5273/";
const LOCAL_CORE_DEFAULT = "http://localhost:5206/";
const REMOTE_AUTH_DEFAULT = "https://syncoauthservice-f0e9fkaqgyczegas.swedencentral-01.azurewebsites.net";
const REMOTE_CORE_DEFAULT = "https://synco-h4etbseqg4h2ewcw.swedencentral-01.azurewebsites.net";

const AUTH_SERVICE_URL = normalizeUrl(
  isLocal
    ? process.env.VITE_LOCAL_AUTH_URL || LOCAL_AUTH_DEFAULT
    : process.env.VITE_REMOTE_AUTH_URL || process.env.VITE_AUTH_API_URL || REMOTE_AUTH_DEFAULT
);

const CORE_SERVICE_URL = normalizeUrl(
  isLocal
    ? process.env.VITE_LOCAL_CORE_URL || LOCAL_CORE_DEFAULT
    : process.env.VITE_REMOTE_CORE_URL || process.env.VITE_CORE_API_URL || REMOTE_CORE_DEFAULT
);

const app = express();
app.disable("x-powered-by");
app.use(compression());

// Proxy Auth Service APIs
app.use(
  createProxyMiddleware({
    filter: (pathname) =>
      /^\/(api\/(auth|company|employee|verification-request|auth\/complete-onboarding|supplier\/(register|verify|resend-code)|me)|me)/i.test(
        pathname
      ),
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    secure: false,
    followRedirects: true,
  })
);

// Proxy Core Service APIs
app.use(
  createProxyMiddleware({
    filter: (pathname) =>
      /^\/api\/(dictionary|products|orders|cart|promotions|customers|marketplace|notifications|subscription|admin|supplier|dashboard)/i.test(
        pathname
      ),
    target: CORE_SERVICE_URL,
    changeOrigin: true,
    secure: false,
    followRedirects: true,
  })
);

// 1. Serve static assets
app.use(
  "/assets",
  express.static(path.join(__dirname, "build/client/assets"), {
    immutable: true,
    maxAge: "1y",
  })
);
app.use(express.static(path.join(__dirname, "build/client")));
app.use(express.static(path.join(__dirname, "public"), { maxAge: "1h" }));

// 2. React Router SSR request handler
let requestHandler;

app.all("/{*splat}", async (req, res, next) => {
  try {
    if (!requestHandler) {
      const build = await import("./build/server/index.js");
      requestHandler = createRequestHandler({
        build,
        mode: process.env.NODE_ENV || "production",
      });
    }
    return requestHandler(req, res, next);
  } catch (err) {
    next(err);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Backend Target: ${isLocal ? "LOCAL (C:\\Src\\Horeca)" : "REMOTE (Azure Cloud)"}`);
  console.log(`  Auth: ${AUTH_SERVICE_URL}`);
  console.log(`  Core: ${CORE_SERVICE_URL}`);
});
