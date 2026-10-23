import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import compression from "compression";
import { createRequestHandler } from "@react-router/express";
import { createProxyMiddleware } from "http-proxy-middleware";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const normalizeUrl = (url) => (url ? url.replace(/\/+$/, "") : "");

const isAzure = Boolean(process.env.WEBSITE_INSTANCE_ID || process.env.WEBSITE_SITE_NAME);
const defaultTarget = isAzure || process.env.NODE_ENV === "production" ? "remote" : "local";
const isLocal = (process.env.VITE_BACKEND_TARGET || defaultTarget).toLowerCase() === "local";

const LOCAL_AUTH_DEFAULT = "http://127.0.0.1:5273";
const LOCAL_CORE_DEFAULT = "http://127.0.0.1:5206";
const LOCAL_NOTIFICATION_DEFAULT = "http://127.0.0.1:5147";
const REMOTE_AUTH_DEFAULT = "https://lobster-app-zhysf.ondigitalocean.app";
const REMOTE_CORE_DEFAULT = "https://octopus-app-bomx6.ondigitalocean.app";
const REMOTE_NOTIFICATION_DEFAULT = "https://websocket-fzc3fcb7cyh4hde9.swedencentral-01.azurewebsites.net";

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

const NOTIFICATION_SERVICE_URL = normalizeUrl(
  isLocal
    ? process.env.VITE_LOCAL_NOTIFICATION_URL || LOCAL_NOTIFICATION_DEFAULT
    : process.env.VITE_REMOTE_NOTIFICATION_URL || process.env.VITE_NOTIFICATION_API_URL || REMOTE_NOTIFICATION_DEFAULT
);

const app = express();
app.disable("x-powered-by");
app.use(compression());

// Proxy Notification WebSocket Hub (Sinko.Notification)
app.use(
  createProxyMiddleware({
    pathFilter: "/orderhub",
    target: NOTIFICATION_SERVICE_URL,
    ws: true,
    changeOrigin: true,
    secure: false,
  })
);

// Proxy Notification microservice APIs
app.use(
  createProxyMiddleware({
    pathFilter: (pathname) => /^\/api\/[Nn]otification(\/|$)/.test(pathname),
    target: NOTIFICATION_SERVICE_URL,
    changeOrigin: true,
    secure: false,
    followRedirects: true,
  })
);

// Proxy Auth Service APIs
app.use(
  createProxyMiddleware({
    pathFilter: (pathname) =>
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
    pathFilter: (pathname) =>
      pathname.startsWith("/api") &&
      !pathname.endsWith(".data") &&
      !pathname.startsWith("/api/categories") &&
      !pathname.startsWith("/api/regions"),
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
  console.log(`Backend Target: ${isLocal ? "LOCAL (C:\\Src\\Horeca)" : "REMOTE (DigitalOcean Cloud)"}`);
  console.log(`  Auth: ${AUTH_SERVICE_URL}`);
  console.log(`  Core: ${CORE_SERVICE_URL}`);
});
