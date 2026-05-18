import { ComplianceViolation } from "../types/rules";
import { OpenAIProvider } from "../ai/openAIProvider";

export interface AIReviewResult {
  summary: string;
  riskLevel: string;
}

function deriveRiskLevel(
  violations: ComplianceViolation[]
): string {
  const critical = violations.filter(
    (v) => v.severity === "critical"
  ).length;

  const high = violations.filter(
    (v) => v.severity === "high"
  ).length;

  if (critical >= 3) {
    return "CRITICAL";
  }

  if (critical > 0 || high >= 5) {
    return "HIGH";
  }

  if (high > 0) {
    return "MEDIUM";
  }

  return "LOW";
}

export async function generateAIReview(
  violations: ComplianceViolation[]
): Promise<AIReviewResult> {
  const riskLevel = deriveRiskLevel(violations);

  const provider = new OpenAIProvider();

  const findings = violations
    .slice(0, 20)
    .map(
      (v) =>
        `[${v.severity}] ${v.fileName}: ${v.message}`
    )
    .join("\n");

  const prompt = `
You are a senior application security reviewer.

Analyze the following pull request findings.

Provide:
1. Executive security summary
2. Main security concerns
3. Business/security impact
4. Remediation recommendations
5. Mention OWASP/compliance concerns if relevant

Findings:
${findings}

Keep the tone professional and concise.
`;

  try {
    const response =
      await provider.generateRemediation({
        violationType: "security-review",
        severity: riskLevel.toLowerCase(),
        indicator: "ai-review",
        message: prompt
      });

    return {
      summary: response,
      riskLevel
    };
  } catch {
    return {
      summary:
        "AI review could not be generated.",
      riskLevel
    };
  }
}