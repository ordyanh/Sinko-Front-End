import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function readEnvFile(filename) {
  const filePath = path.join(rootDir, filename);
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const deployEnv = {
  ...readEnvFile(".env"),
  ...readEnvFile(".env.deploy"),
  ...readEnvFile(".env.deploy.local"),
  ...process.env,
};

const DO_TOKEN =
  deployEnv.DO_API_TOKEN ||
  deployEnv.DIGITALOCEAN_TOKEN ||
  deployEnv.DO_TOKEN ||
  "";

let DO_APP_ID = deployEnv.DO_APP_ID || "";
let APP_NAME = deployEnv.APP_NAME || "synco-frontend";
let LIVE_URL = deployEnv.LIVE_URL || "";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("\n============================================================");
  console.log("  DigitalOcean App Platform Deployment Controller");
  console.log("============================================================");

  if (!DO_TOKEN) {
    console.log("\n[INFO] DO_API_TOKEN is not set.");
    console.log("       Git push has already triggered DigitalOcean's Auto-Deploy");
    console.log("       if your app is connected to GitHub.");
    console.log("\n[TIP]  To enable live terminal tracking and API-triggered deployments:");
    console.log("       1. Open: https://cloud.digitalocean.com/account/api/tokens");
    console.log("       2. Generate a Personal Access Token (Read + Write)");
    console.log("       3. Save it in .env.deploy as: DO_API_TOKEN=dop_v1_xxxx\n");

    if (LIVE_URL) {
      await checkHealth(LIVE_URL);
    }
    return;
  }

  // 1. Resolve APP_ID if not configured
  if (!DO_APP_ID) {
    console.log("\n[1/3] Auto-detecting App ID from DigitalOcean account...");
    try {
      const res = await fetch("https://api.digitalocean.com/v2/apps", {
        headers: {
          Authorization: `Bearer ${DO_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[ERROR] Failed to query DigitalOcean apps API (HTTP ${res.status}): ${errText}`);
        return;
      }

      const data = await res.json();
      const apps = data.apps || [];

      if (apps.length === 0) {
        console.log("[WARNING] No apps found on this DigitalOcean account.");
        return;
      }

      console.log(`Found ${apps.length} app(s) on DigitalOcean:`);
      apps.forEach((a) => {
        console.log(` - ${a.spec?.name || "unnamed"} (ID: ${a.id}) -> ${a.live_url || "no domain"}`);
      });

      // Find matching app
      const matched =
        apps.find((a) => a.spec?.name?.toLowerCase() === APP_NAME.toLowerCase()) ||
        apps.find((a) => a.spec?.name?.toLowerCase().includes("front") || a.spec?.name?.toLowerCase().includes("sinko") || a.spec?.name?.toLowerCase().includes("synco")) ||
        apps[0];

      if (matched) {
        DO_APP_ID = matched.id;
        APP_NAME = matched.spec?.name || APP_NAME;
        if (!LIVE_URL && matched.live_url) {
          LIVE_URL = matched.live_url;
        }
        console.log(`\n✔ Selected App: '${APP_NAME}' [ID: ${DO_APP_ID}]`);
        if (LIVE_URL) console.log(`✔ App Live URL: ${LIVE_URL}`);
      }
    } catch (err) {
      console.error("[ERROR] Failed to list DigitalOcean apps:", err.message);
      return;
    }
  }

  if (!DO_APP_ID) {
    console.error("[ERROR] Could not determine DO_APP_ID. Please specify DO_APP_ID in .env.deploy.");
    return;
  }

  // 2. Trigger deployment
  console.log(`\n[2/3] Triggering deployment on DigitalOcean App: ${APP_NAME} (${DO_APP_ID})...`);
  let deploymentId = null;
  try {
    const deployRes = await fetch(`https://api.digitalocean.com/v2/apps/${DO_APP_ID}/deployments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DO_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ force_build: true }),
    });

    if (!deployRes.ok) {
      const errText = await deployRes.text();
      console.error(`[ERROR] Deployment trigger failed (HTTP ${deployRes.status}): ${errText}`);
      return;
    }

    const deployData = await deployRes.json();
    deploymentId = deployData.deployment?.id;
    console.log(`✔ Deployment started! ID: ${deploymentId}`);
  } catch (err) {
    console.error("[ERROR] Deployment request failed:", err.message);
    return;
  }

  // 3. Monitor deployment progress
  if (deploymentId) {
    console.log("\n[3/3] Monitoring deployment progress in real-time...");
    let lastPhase = "";
    const startTime = Date.now();
    const maxWaitMs = 10 * 60 * 1000; // 10 minutes

    while (Date.now() - startTime < maxWaitMs) {
      await sleep(6000);

      try {
        const statusRes = await fetch(
          `https://api.digitalocean.com/v2/apps/${DO_APP_ID}/deployments/${deploymentId}`,
          {
            headers: {
              Authorization: `Bearer ${DO_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!statusRes.ok) {
          console.log(`[WARN] Status poll returned HTTP ${statusRes.status}. Retrying...`);
          continue;
        }

        const statusData = await statusRes.json();
        const deployment = statusData.deployment || {};
        const phase = deployment.phase || "UNKNOWN";
        const elapsedSec = Math.floor((Date.now() - startTime) / 1000);

        if (phase !== lastPhase) {
          lastPhase = phase;
          console.log(` -> Phase: [${phase}] (${elapsedSec}s elapsed)`);
        }

        if (phase === "ACTIVE") {
          console.log("\n============================================================");
          console.log("✔ Deployment finished successfully on DigitalOcean App Platform!");
          console.log("============================================================");
          break;
        }

        if (phase === "ERROR" || phase === "CANCELED") {
          console.error(`\n[ERROR] Deployment ended with status: ${phase}`);
          const cause = deployment.progress?.error_steps?.[0]?.reason || "Check DigitalOcean dashboard for logs.";
          console.error(`Reason: ${cause}`);
          break;
        }
      } catch (err) {
        console.log(`[WARN] Error checking status: ${err.message}. Retrying...`);
      }
    }
  }

  // 4. Live Health Check
  if (LIVE_URL) {
    await checkHealth(LIVE_URL);
  }
}

async function checkHealth(url) {
  console.log(`\nTesting site health: ${url}`);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    console.log(`✔ Site responded with HTTP ${res.status} ${res.statusText}`);
  } catch (err) {
    console.log(`Notice: Could not reach live URL yet (${err.message}). DigitalOcean routing may take a minute to finalize.`);
  }
}

main().catch((err) => {
  console.error("Unexpected error in deployment script:", err);
  process.exit(1);
});
