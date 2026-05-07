#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const outDir = path.join(rootDir, "output", "openclaw-whatsapp-login");
const logFile = path.join(outDir, "terminal-qr.log");
const resultFile = path.join(outDir, "terminal-qr-result.json");
const qrFile = path.join(outDir, "terminal-whatsapp-qr.png");

const args = new Set(process.argv.slice(2));
const forceRelink = !args.has("--reuse");
const accountId = readStringFlag("--account") ?? readStringFlag("--account-id");
const qrTimeoutMs = readNumberFlag("--qr-timeout-ms", 180_000);
const waitTimeoutMs = readNumberFlag("--wait-timeout-ms", 10 * 60 * 1000);

function readStringFlag(name) {
  const prefix = `${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  const value = raw?.slice(prefix.length).trim();
  return value || null;
}

function readNumberFlag(name, fallback) {
  const raw = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (!raw) return fallback;
  const value = Number(raw.slice(name.length + 1));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function resolveOpenClawDistDir() {
  const candidates = [];

  if (process.env.OPENCLAW_DIST_DIR) {
    candidates.push(process.env.OPENCLAW_DIST_DIR);
  }

  if (process.env.APPDATA) {
    candidates.push(path.join(process.env.APPDATA, "npm", "node_modules", "openclaw", "dist"));
  }

  candidates.push(path.join(os.homedir(), "AppData", "Roaming", "npm", "node_modules", "openclaw", "dist"));
  candidates.push(path.join(os.homedir(), ".openclaw", "tools", "node", "lib", "node_modules", "openclaw", "dist"));

  const openclawToolsDir = path.join(os.homedir(), ".openclaw", "tools");
  try {
    for (const entry of readdirSync(openclawToolsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith("node-")) {
        candidates.push(path.join(openclawToolsDir, entry.name, "lib", "node_modules", "openclaw", "dist"));
      }
    }
  } catch {}

  try {
    const npmRoot = execFileSync("npm", ["root", "-g"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    if (npmRoot) {
      candidates.push(path.join(npmRoot, "openclaw", "dist"));
    }
  } catch {}

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    [
      "Could not find the OpenClaw dist folder.",
      "Set OPENCLAW_DIST_DIR or install OpenClaw globally first.",
    ].join(" "),
  );
}

async function appendLog(message) {
  await fs.appendFile(logFile, `${new Date().toISOString()} ${message}\n`);
}

async function resolveLoginModuleUrl(openclawDistDir) {
  const candidates = [
    path.join(openclawDistDir, "extensions", "whatsapp", "login-qr-api.js"),
    path.join(openclawDistDir, "extensions", "whatsapp", "login-qr-runtime.js"),
    path.join(openclawDistDir, "login-qr-CgfxntEO.js"),
  ];

  const whatsappExtensionDir = path.join(openclawDistDir, "extensions", "whatsapp");
  try {
    const entries = await fs.readdir(whatsappExtensionDir);
    for (const entry of entries) {
      if (/^login-qr-.*\.js$/i.test(entry)) {
        candidates.push(path.join(whatsappExtensionDir, entry));
      }
    }
  } catch {}

  for (const candidate of candidates) {
    if (!candidate || !existsSync(candidate)) {
      continue;
    }

    try {
      const moduleUrl = pathToFileURL(candidate).href;
      const loginMod = await import(moduleUrl);
      if (
        typeof loginMod.startWebLoginWithQr === "function" &&
        typeof loginMod.waitForWebLogin === "function"
      ) {
        return { loginMod, modulePath: candidate };
      }
    } catch {}
  }

  throw new Error(`Could not find a compatible OpenClaw WhatsApp QR module in ${openclawDistDir}.`);
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(logFile, "");

  const openclawDistDir = resolveOpenClawDistDir();

  await appendLog(`using openclaw dist ${openclawDistDir}`);
  console.log("Starting native OpenClaw WhatsApp QR flow...");
  if (accountId) {
    console.log(`OpenClaw WhatsApp account: ${accountId}`);
  }

  const { loginMod, modulePath } = await resolveLoginModuleUrl(openclawDistDir);
  await appendLog(`imported login module ${modulePath}`);

  const result = await loginMod.startWebLoginWithQr({
    ...(accountId ? { accountId } : {}),
    timeoutMs: qrTimeoutMs,
    force: forceRelink,
  });

  await appendLog(`login returned ${JSON.stringify({ hasQr: Boolean(result?.qrDataUrl), message: result?.message })}`);

  const payload = { ...result, generatedAt: new Date().toISOString() };

  if (typeof result?.qrDataUrl === "string" && result.qrDataUrl.startsWith("data:image/png;base64,")) {
    const base64 = result.qrDataUrl.slice("data:image/png;base64,".length);
    await fs.writeFile(qrFile, Buffer.from(base64, "base64"));
    payload.qrFile = qrFile;
    await appendLog(`wrote qr ${qrFile}`);
  } else {
    throw new Error(result?.message || "OpenClaw did not return a QR image.");
  }

  await fs.writeFile(resultFile, JSON.stringify(payload, null, 2));
  await appendLog(`wrote result ${resultFile}`);

  console.log("");
  console.log("WhatsApp QR ready.");
  console.log(`QR image: ${qrFile}`);
  console.log(`Result JSON: ${resultFile}`);
  console.log("Open WhatsApp > Linked Devices and scan the QR.");

  console.log("");
  console.log("Waiting for WhatsApp to confirm the link...");
  await appendLog("waiting for scan");

  const waitResult = await loginMod.waitForWebLogin({
    ...(accountId ? { accountId } : {}),
    timeoutMs: waitTimeoutMs,
  });
  const finalPayload = { ...payload, waitResult, finishedAt: new Date().toISOString() };
  await fs.writeFile(resultFile, JSON.stringify(finalPayload, null, 2));
  await appendLog(`wait finished ${JSON.stringify(waitResult)}`);

  console.log(waitResult.message || "WhatsApp login finished.");

  if (!waitResult.connected) {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);

  try {
    await fs.mkdir(outDir, { recursive: true });
    await fs.appendFile(logFile, `${new Date().toISOString()} error ${message}\n`);
  } catch {}

  console.error(message);
  process.exitCode = 1;
});
