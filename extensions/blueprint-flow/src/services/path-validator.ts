import { existsSync, realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";

const BLOCKED_PATTERNS = [
  /node_modules/,
  /\.git\//,
  /\.git$/,
  /dist\//,
  /coverage\//,
  /\.next\//,
  /\.env/,
  /\.pem$/,
  /\.key$/,
  /id_rsa/,
  /id_ed25519/,
];

const MAX_FILE_SIZE = 50 * 1024; // 50KB
const MAX_SCAN_FILES = 100;

export interface PathValidationResult {
  valid: boolean;
  resolvedPath: string;
  error?: string;
}

/** Validates a repo path is safe to read from */
export function validateRepoPath(inputPath: string): PathValidationResult {
  if (!inputPath || typeof inputPath !== "string") {
    return { valid: false, resolvedPath: "", error: "Path is required" };
  }

  const resolved = resolve(inputPath);

  if (resolved.includes("..")) {
    return { valid: false, resolvedPath: resolved, error: "Path traversal detected" };
  }

  if (!existsSync(resolved)) {
    return { valid: false, resolvedPath: resolved, error: "Path does not exist" };
  }

  let realPath: string;
  try {
    realPath = realpathSync(resolved);
  } catch {
    return { valid: false, resolvedPath: resolved, error: "Cannot resolve real path" };
  }

  try {
    const stat = statSync(realPath);
    if (!stat.isDirectory()) {
      return { valid: false, resolvedPath: realPath, error: "Path is not a directory" };
    }
  } catch {
    return { valid: false, resolvedPath: realPath, error: "Cannot stat path" };
  }

  return { valid: true, resolvedPath: realPath };
}

/** Checks if a file path should be skipped during scanning */
export function isBlockedPath(filePath: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(filePath));
}

/** Checks if a file is within size limits for reading */
export function isFileSizeAllowed(filePath: string): boolean {
  try {
    const stat = statSync(filePath);
    return stat.size <= MAX_FILE_SIZE;
  } catch {
    return false;
  }
}

export { MAX_FILE_SIZE, MAX_SCAN_FILES };
