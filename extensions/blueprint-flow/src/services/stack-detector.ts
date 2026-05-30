import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isFileSizeAllowed } from "./path-validator.js";

interface DetectedStack {
  languages: string[];
  frameworks: string[];
  buildTools: string[];
  testFrameworks: string[];
  packageManagers: string[];
}

interface DetectedScripts {
  [key: string]: string;
}

const PACKAGE_MANAGER_FILES: Record<string, string> = {
  "package-lock.json": "npm",
  "yarn.lock": "yarn",
  "pnpm-lock.yaml": "pnpm",
  "bun.lockb": "bun",
  "Cargo.lock": "cargo",
  "go.sum": "go modules",
  "Gemfile.lock": "bundler",
  "poetry.lock": "poetry",
  "Pipfile.lock": "pipenv",
  "composer.lock": "composer",
};

const FRAMEWORK_INDICATORS: Record<string, { file: string; check?: string }[]> = {
  "Next.js": [{ file: "next.config.js" }, { file: "next.config.mjs" }, { file: "next.config.ts" }],
  React: [{ file: "package.json", check: "react" }],
  Vue: [{ file: "package.json", check: "vue" }],
  Angular: [{ file: "angular.json" }],
  Svelte: [{ file: "svelte.config.js" }],
  Express: [{ file: "package.json", check: "express" }],
  Fastify: [{ file: "package.json", check: "fastify" }],
  NestJS: [{ file: "nest-cli.json" }],
  Django: [{ file: "manage.py" }],
  Rails: [{ file: "Gemfile", check: "rails" }],
  Laravel: [{ file: "artisan" }],
  Spring: [{ file: "pom.xml", check: "spring" }],
};

const LANGUAGE_FILES: Record<string, string> = {
  "tsconfig.json": "TypeScript",
  "package.json": "JavaScript",
  "Cargo.toml": "Rust",
  "go.mod": "Go",
  "pom.xml": "Java",
  "build.gradle": "Java/Kotlin",
  "Gemfile": "Ruby",
  "requirements.txt": "Python",
  "pyproject.toml": "Python",
  "composer.json": "PHP",
  "mix.exs": "Elixir",
};

export function detectStack(repoPath: string): DetectedStack {
  const stack: DetectedStack = {
    languages: [],
    frameworks: [],
    buildTools: [],
    testFrameworks: [],
    packageManagers: [],
  };

  for (const [file, lang] of Object.entries(LANGUAGE_FILES)) {
    if (existsSync(join(repoPath, file))) {
      if (!stack.languages.includes(lang)) {
        stack.languages.push(lang);
      }
    }
  }

  for (const [file, pm] of Object.entries(PACKAGE_MANAGER_FILES)) {
    if (existsSync(join(repoPath, file))) {
      stack.packageManagers.push(pm);
    }
  }

  const pkgPath = join(repoPath, "package.json");
  let pkgContent = "";
  if (existsSync(pkgPath) && isFileSizeAllowed(pkgPath)) {
    try {
      pkgContent = readFileSync(pkgPath, "utf-8");
    } catch {
      // ignore read errors
    }
  }

  for (const [framework, indicators] of Object.entries(FRAMEWORK_INDICATORS)) {
    for (const indicator of indicators) {
      if (indicator.check) {
        if (indicator.file === "package.json" && pkgContent.includes(`"${indicator.check}"`)) {
          if (!stack.frameworks.includes(framework)) {
            stack.frameworks.push(framework);
          }
        }
      } else if (existsSync(join(repoPath, indicator.file))) {
        if (!stack.frameworks.includes(framework)) {
          stack.frameworks.push(framework);
        }
      }
    }
  }

  if (pkgContent) {
    if (pkgContent.includes('"jest"') || pkgContent.includes('"@jest"')) stack.testFrameworks.push("jest");
    if (pkgContent.includes('"vitest"')) stack.testFrameworks.push("vitest");
    if (pkgContent.includes('"mocha"')) stack.testFrameworks.push("mocha");
    if (pkgContent.includes('"playwright"')) stack.testFrameworks.push("playwright");
    if (pkgContent.includes('"cypress"')) stack.testFrameworks.push("cypress");
    if (pkgContent.includes('"vite"')) stack.buildTools.push("vite");
    if (pkgContent.includes('"webpack"')) stack.buildTools.push("webpack");
    if (pkgContent.includes('"esbuild"')) stack.buildTools.push("esbuild");
    if (pkgContent.includes('"turbo"')) stack.buildTools.push("turborepo");
    if (pkgContent.includes('"tsup"')) stack.buildTools.push("tsup");
  }

  return stack;
}

export function detectScripts(repoPath: string): DetectedScripts {
  const scripts: DetectedScripts = {};
  const pkgPath = join(repoPath, "package.json");

  if (existsSync(pkgPath) && isFileSizeAllowed(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg.scripts && typeof pkg.scripts === "object") {
        Object.assign(scripts, pkg.scripts);
      }
    } catch {
      // ignore parse errors
    }
  }

  return scripts;
}
