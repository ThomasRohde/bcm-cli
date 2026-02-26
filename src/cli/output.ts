import type { Envelope } from "../core/types.js";

let quietMode = false;
let verboseMode = false;

export function setDiagnosticMode(quiet: boolean, verbose: boolean): void {
  quietMode = quiet;
  verboseMode = verbose;
}

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
  if (quietMode) return;
  process.stderr.write(message + "\n");
}

export function writeStderrVerbose(message: string): void {
  if (!verboseMode) return;
  process.stderr.write(message + "\n");
}
