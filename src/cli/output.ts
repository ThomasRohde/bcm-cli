import type { Envelope } from "../core/types.js";

export function isAgentMode(): boolean {
  if (process.env.LLM === "true") return true;
  if (process.env.CI === "true") return true;
  if (!process.stdout.isTTY) return true;
  return false;
}

export function writeEnvelope<T>(envelope: Envelope<T>): void {
  process.stdout.write(JSON.stringify(envelope, null, 2) + "\n");
}

export function writeStderr(message: string): void {
  process.stderr.write(message + "\n");
}
