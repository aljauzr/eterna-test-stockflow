import { execSync } from "node:child_process";
import path from "node:path";

export const repoRoot = path.resolve(__dirname, "../../..");
export const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://localhost:3001/api";

export const demoUser = {
  email: "reviewer@stockflow.local",
  password: "Stockflow123!",
};

export function resetDemoData() {
  execSync("yarn seed", {
    cwd: repoRoot,
    stdio: "inherit",
  });
}
