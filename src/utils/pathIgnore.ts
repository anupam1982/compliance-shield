import { minimatch } from "minimatch";

export function shouldIgnoreFile(
  filePath: string,
  ignorePaths: string[] = []
): boolean {
  return ignorePaths.some((pattern) =>
    minimatch(filePath, pattern)
  );
}