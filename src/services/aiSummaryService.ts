import { ComplianceViolation } from "../types/rules";
import { OpenAIProvider } from "../ai/openAIProvider";

export interface ScanSummaryResult {
  summary: string;
  riskLevel: string;
  topConcerns: string[];
}

function deriveRiskLevel(
  criticalCount: number,
  highCount: number
): string {
  if (criticalCount >= 5) {
    return "CRITICAL";
  }

  if (criticalCount > 0 || highCount >= 5) {
    return "HIGH";
  }

  if (highCount > 0) {
    return "MEDIUM";
  }

  return "LOW";
}

function extractTopConcerns(
  violations: ComplianceViolation[]
): string[] {
  const indicators = new Set<string>();

  for (const violation of violations) {
    if (violation.indicator) {
      indicators.add(violation.indicator);
    }
  }

  return Array.from(indicators).slice(0, 5);
}

export async function generateExecutiveSummary(
  violations: ComplianceViolation[],
  criticalCount: number,
  highCount: number
): Promise<ScanSummaryResult> {
  const riskLevel = deriveRiskLevel(
    criticalCount,
    highCount
  );

  const topConcerns = extractTopConcerns(violations);

  const provider = new OpenAIProvider();

  const prompt = `
You are a senior application security architect.

Analyze the following repository scan findings and provide:
1. Executive security summary
2. Main concerns
3. Overall repository risk posture

Findings:
${violations
  .map(
    (v) =>
      `- [${v.severity}] ${v.fileName}: ${v.message}`
  )
  .join("\n")}

Critical count: ${criticalCount}
High count: ${highCount}

Keep response concise and executive-friendly.
`;

  try {
    const summary = await provider.generateRemediation({
        violationType: "executive-summary",
        severity: riskLevel.toLowerCase(),
        message: prompt,
        indicator: "scan-summary"
      });

    return {
      summary,
      riskLevel,
      topConcerns
    };
  } catch {
    return {
      summary:
        "AI summary could not be generated. Manual review recommended.",
      riskLevel,
      topConcerns
    };
  }
}