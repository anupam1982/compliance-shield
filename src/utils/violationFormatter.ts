import { ComplianceViolation } from "../types/rules";

export interface GroupedViolations {
  fileName: string;
  violations: ComplianceViolation[];
}

export function deduplicateViolations(
  violations: ComplianceViolation[]
): ComplianceViolation[] {
  const seen = new Set<string>();

  return violations.filter((violation) => {
    const key = [
      violation.fileName,
      violation.type,
      violation.indicator,
      violation.severity,
      violation.line ?? "no-line"
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function groupViolationsByFile(
  violations: ComplianceViolation[]
): GroupedViolations[] {
  const grouped = new Map<string, ComplianceViolation[]>();

  for (const violation of violations) {
    if (!grouped.has(violation.fileName)) {
      grouped.set(violation.fileName, []);
    }

    grouped.get(violation.fileName)?.push(violation);
  }

  return Array.from(grouped.entries()).map(([fileName, fileViolations]) => ({
    fileName,
    violations: fileViolations
  }));
}

export function formatViolationsForComment(
  violations: ComplianceViolation[]
): string {
  if (violations.length === 0) {
    return "✅ No compliance violations detected.";
  }

  const grouped = groupViolationsByFile(violations);

  return grouped
    .map((group) => {
      const items = group.violations
        .map((violation) => {
          const location = violation.line ? ` (line ${violation.line})` : "";
          return `- **${violation.severity.toUpperCase()}** **${violation.type.toUpperCase()}**${location} — ${violation.message}`;
        })
        .join("\n");

      return `#### \`${group.fileName}\`\n${items}`;
    })
    .join("\n\n");
}

export function formatViolationsForCheckSummary(
  violations: ComplianceViolation[],
  maxItems = 20
): string {
  if (violations.length === 0) {
    return "Compliance Shield scanned the changed files and found no violations.";
  }

  return violations
    .slice(0, maxItems)
    .map((violation, index) => {
      const location = violation.line ? `:${violation.line}` : "";
      return `${index + 1}. [${violation.severity.toUpperCase()}] ${violation.fileName}${location} — ${violation.message}`;
    })
    .join("\n");
}