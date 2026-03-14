import { ComplianceRuleSet, ComplianceViolation, SeverityLevel } from "../types/rules";

export interface PullRequestFileForScan {
  filename: string;
  patch?: string;
}

export function getSeverityRank(severity: SeverityLevel): number {
  switch (severity) {
    case "low":
      return 1;
    case "medium":
      return 2;
    case "high":
      return 3;
    case "critical":
      return 4;
  }
}

export function hasBlockingViolations(
  violations: ComplianceViolation[],
  minimumSeverityToFail: SeverityLevel
): boolean {
  const threshold = getSeverityRank(minimumSeverityToFail);
  return violations.some((violation) => getSeverityRank(violation.severity) >= threshold);
}

function shouldIgnorePath(fileName: string, ignorePaths: string[]): boolean {
  return ignorePaths.some((ignorePath) => fileName.startsWith(ignorePath));
}

function shouldIgnoreIndicator(indicator: string, ignoreIndicators: string[]): boolean {
  return ignoreIndicators.includes(indicator);
}

function findMatchingLineNumber(
  patch: string,
  matcher: (line: string) => boolean
): { line?: number; ignored: boolean } {
  const lines = patch.split("\n");
  let currentNewLine = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      const match = line.match(/\+(\d+)(?:,(\d+))?/);
      if (match) {
        currentNewLine = Number.parseInt(match[1], 10) - 1;
      }
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      currentNewLine += 1;
      const content = line.slice(1);

      if (matcher(content)) {
        return {
          line: currentNewLine,
          ignored: false
        };
      }

      continue;
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      continue;
    }

    currentNewLine += 1;
  }

  return { ignored: false };
}

function findMatchingLineWithInlineIgnore(
  patch: string,
  matcher: (line: string) => boolean,
  inlineIgnoreComment: string
): { line?: number; ignored: boolean } {
  const lines = patch.split("\n");
  let currentNewLine = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      const match = line.match(/\+(\d+)(?:,(\d+))?/);
      if (match) {
        currentNewLine = Number.parseInt(match[1], 10) - 1;
      }
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      currentNewLine += 1;
      const content = line.slice(1);

      if (matcher(content)) {
        return {
          line: currentNewLine,
          ignored: content.includes(inlineIgnoreComment)
        };
      }

      continue;
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      continue;
    }

    currentNewLine += 1;
  }

  return { ignored: false };
}

export function runComplianceChecks(
  files: PullRequestFileForScan[],
  rules: ComplianceRuleSet
): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];

  for (const file of files) {
    if (shouldIgnorePath(file.filename, rules.ignorePaths)) {
      continue;
    }

    const lowerFileName = file.filename.toLowerCase();

    for (const indicatorRule of rules.bannedFileIndicators) {
      if (shouldIgnoreIndicator(indicatorRule.value, rules.ignoreIndicators)) {
        continue;
      }

      if (lowerFileName.includes(indicatorRule.value.toLowerCase())) {
        violations.push({
          type: "file",
          fileName: file.filename,
          indicator: indicatorRule.value,
          severity: indicatorRule.severity,
          message: `Filename contains banned indicator \`${indicatorRule.value}\`.`
        });
      }
    }

    const patchContent = file.patch ?? "";

    for (const indicatorRule of rules.bannedContentIndicators) {
      if (shouldIgnoreIndicator(indicatorRule.value, rules.ignoreIndicators)) {
        continue;
      }

      if (patchContent.includes(indicatorRule.value)) {
        const matchResult = findMatchingLineWithInlineIgnore(
          patchContent,
          (contentLine) => contentLine.includes(indicatorRule.value),
          rules.inlineIgnoreComment
        );

        if (matchResult.ignored) {
          continue;
        }

        violations.push({
          type: "content",
          fileName: file.filename,
          indicator: indicatorRule.value,
          severity: indicatorRule.severity,
          message: `Patch content contains banned indicator \`${indicatorRule.value}\`.`,
          line: matchResult.line
        });
      }
    }

    for (const secretPattern of rules.secretPatterns) {
      if (shouldIgnoreIndicator(secretPattern.name, rules.ignoreIndicators)) {
        continue;
      }

      try {
        const regex = new RegExp(secretPattern.pattern, "g");
        const matches = patchContent.match(regex);

        if (matches && matches.length > 0) {
          const matchResult = findMatchingLineWithInlineIgnore(
            patchContent,
            (contentLine) => {
              const lineRegex = new RegExp(secretPattern.pattern);
              return lineRegex.test(contentLine);
            },
            rules.inlineIgnoreComment
          );

          if (matchResult.ignored) {
            continue;
          }

          violations.push({
            type: "secret-pattern",
            fileName: file.filename,
            indicator: secretPattern.name,
            severity: secretPattern.severity,
            message: `Patch content matched secret pattern \`${secretPattern.name}\`.`,
            line: matchResult.line
          });
        }
      } catch {
        violations.push({
          type: "secret-pattern",
          fileName: file.filename,
          indicator: secretPattern.name,
          severity: "medium",
          message: `Invalid regex pattern configured for \`${secretPattern.name}\`.`
        });
      }
    }
  }

  return violations;
}