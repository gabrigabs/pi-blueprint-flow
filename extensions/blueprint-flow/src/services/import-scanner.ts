import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { isBlockedPath, MAX_SCAN_FILES } from "./path-validator.js";

export interface RepoStructure {
  totalFiles: number;
  directories: string[];
  topLevelFiles: string[];
  truncated: boolean;
}

/** Scans repository structure safely with depth and file limits */
export function scanRepoStructure(repoPath: string, maxDepth = 3): RepoStructure {
  const directories: string[] = [];
  const topLevelFiles: string[] = [];
  let totalFiles = 0;
  let truncated = false;

  function walk(dir: string, depth: number): void {
    if (depth > maxDepth || totalFiles >= MAX_SCAN_FILES) {
      truncated = true;
      return;
    }

    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (totalFiles >= MAX_SCAN_FILES) {
          truncated = true;
          return;
        }

        const fullPath = join(dir, entry.name);
        const relPath = relative(repoPath, fullPath);

        if (isBlockedPath(relPath)) continue;

        if (entry.isDirectory()) {
          directories.push(relPath);
          walk(fullPath, depth + 1);
        } else if (entry.isFile()) {
          totalFiles++;
          if (depth === 0) {
            topLevelFiles.push(entry.name);
          }
        }
      }
    } catch {
      // skip unreadable directories
    }
  }

  walk(repoPath, 0);

  return { totalFiles, directories, topLevelFiles, truncated };
}

/** Generates a project profile markdown from scan results */
export function generateProjectProfile(params: {
  name: string;
  repoPath: string;
  stack: { languages: string[]; frameworks: string[]; buildTools: string[]; testFrameworks: string[]; packageManagers: string[] };
  scripts: Record<string, string>;
  structure: RepoStructure;
  agenticFiles: { relativePath: string; type: string; extractedRules: string[] }[];
}): string {
  const { name, repoPath, stack, scripts, structure, agenticFiles } = params;

  const sections: string[] = [
    `# Project Profile: ${name}`,
    "",
    `**Repository:** ${repoPath}`,
    `**Scanned:** ${new Date().toISOString()}`,
    "",
    "## Stack",
    "",
    `- **Languages:** ${stack.languages.join(", ") || "none detected"}`,
    `- **Frameworks:** ${stack.frameworks.join(", ") || "none detected"}`,
    `- **Build Tools:** ${stack.buildTools.join(", ") || "none detected"}`,
    `- **Test Frameworks:** ${stack.testFrameworks.join(", ") || "none detected"}`,
    `- **Package Managers:** ${stack.packageManagers.join(", ") || "none detected"}`,
    "",
    "## Scripts",
    "",
  ];

  const scriptEntries = Object.entries(scripts);
  if (scriptEntries.length > 0) {
    for (const [key, value] of scriptEntries.slice(0, 20)) {
      sections.push(`- \`${key}\`: \`${value}\``);
    }
  } else {
    sections.push("No scripts detected.");
  }

  sections.push("", "## Structure", "");
  sections.push(`- **Total files:** ${structure.totalFiles}${structure.truncated ? " (truncated)" : ""}`);
  sections.push(`- **Directories:** ${structure.directories.length}`);

  if (structure.directories.length > 0) {
    sections.push("", "Key directories:");
    for (const dir of structure.directories.slice(0, 20)) {
      sections.push(`- \`${dir}/\``);
    }
  }

  sections.push("", "## Agentic Files", "");
  if (agenticFiles.length > 0) {
    for (const file of agenticFiles) {
      sections.push(`### ${file.relativePath} (${file.type})`);
      if (file.extractedRules.length > 0) {
        sections.push("");
        sections.push("Extracted rules:");
        for (const rule of file.extractedRules.slice(0, 10)) {
          sections.push(`- ${rule}`);
        }
      }
      sections.push("");
    }
  } else {
    sections.push("No agentic configuration files detected.");
  }

  sections.push("", "## Recommendations", "");
  sections.push("- Review detected stack and confirm accuracy");
  sections.push("- Check extracted rules for relevance");
  sections.push("- Consider consolidating agentic files into Blueprint format");

  return sections.join("\n");
}
