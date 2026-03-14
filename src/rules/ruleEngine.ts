import { ComplianceRuleSet, ComplianceViolation, SeverityLevel } from "../types/rules";

export interface PullRequestFileForScan {
  filename: string;
  patch?: string;
  fullContent?: string;
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

function findMatchingLineWithInlineIgnore(
  sourceText: string,
  matcher: (line: string) => boolean,
  inlineIgnoreComment: string,
  isPatch: boolean
): { line?: number; ignored: boolean } {
  const lines = sourceText.split("\n");
  let currentLine = 0;

  for (const line of lines) {
    if (isPatch) {
      if (line.startsWith("@@")) {
        const match = line.match(/\+(\d+)(?:,(\d+))?/);
        if (match) {
          currentLine = Number.parseInt(match[1], 10) - 1;
        }
        continue;
      }

      if (line.startsWith("+") && !line.startsWith("+++")) {
        currentLine += 1;
        const content = line.slice(1);

        if (matcher(content)) {
          return {
            line: currentLine,
            ignored: content.includes(inlineIgnoreComment)
          };
        }

        continue;
      }

      if (line.startsWith("-") && !line.startsWith("---")) {
        continue;
      }

      currentLine += 1;
      continue;
    }

    currentLine += 1;

    if (matcher(line)) {
      return {
        line: currentLine,
        ignored: line.includes(inlineIgnoreComment)
      };
    }
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

    const scanSource = file.fullContent ?? file.patch ?? "";
    const isPatchMode = !file.fullContent;

    for (const indicatorRule of rules.bannedContentIndicators) {
      if (shouldIgnoreIndicator(indicatorRule.value, rules.ignoreIndicators)) {
        continue;
      }

      if (scanSource.includes(indicatorRule.value)) {
        const matchResult = findMatchingLineWithInlineIgnore(
          scanSource,
          (contentLine) => contentLine.includes(indicatorRule.value),
          rules.inlineIgnoreComment,
          isPatchMode
        );

        if (matchResult.ignored) {
          continue;
        }

        violations.push({
          type: "content",
          fileName: file.filename,
          indicator: indicatorRule.value,
          severity: indicatorRule.severity,
          message: `Content contains banned indicator \`${indicatorRule.value}\`.`,
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
        const hasMatch = regex.test(scanSource);

        if (hasMatch) {
          const matchResult = findMatchingLineWithInlineIgnore(
            scanSource,
            (contentLine) => {
              const lineRegex = new RegExp(secretPattern.pattern);
              return lineRegex.test(contentLine);
            },
            rules.inlineIgnoreComment,
            isPatchMode
          );

          if (matchResult.ignored) {
            continue;
          }

          violations.push({
            type: "secret-pattern",
            fileName: file.filename,
            indicator: secretPattern.name,
            severity: secretPattern.severity,
            message: `Content matched secret pattern \`${secretPattern.name}\`.`,
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