import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../data");
const settingsFile = path.join(dataDir, "settings.json");

function ensureStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(settingsFile)) {
    fs.writeFileSync(settingsFile, JSON.stringify({}, null, 2));
  }
}

export function getGuildSettings(guildId) {
  ensureStore();
  try {
    const all = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
    return all[guildId] ?? {};
  } catch (error) {
    console.error("Could not read settings.json:", error);
    return {};
  }
}

export function updateGuildSettings(guildId, updates) {
  ensureStore();
  let all = {};
  try {
    all = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
  } catch {
    all = {};
  }
  all[guildId] = { ...(all[guildId] ?? {}), ...updates };
  fs.writeFileSync(settingsFile, JSON.stringify(all, null, 2));
  return all[guildId];
}
