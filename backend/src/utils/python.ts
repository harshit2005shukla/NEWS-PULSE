import fs from "fs";
import path from "path";

export function resolvePythonExecutable(projectRoot: string): string {
  if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;

  const candidates = process.platform === "win32"
    ? [
        path.join(projectRoot, "scraper", ".venv", "Scripts", "python.exe"),
        path.join(projectRoot, ".venv", "Scripts", "python.exe"),
      ]
    : [
        path.join(projectRoot, "scraper", ".venv", "bin", "python"),
        path.join(projectRoot, "scraper", ".venv", "bin", "python3"),
        path.join(projectRoot, ".venv", "bin", "python"),
      ];

  const localPython = candidates.find((candidate) => fs.existsSync(candidate));
  if (localPython) return localPython;

  return process.platform === "win32" ? "python" : "python3";
}
