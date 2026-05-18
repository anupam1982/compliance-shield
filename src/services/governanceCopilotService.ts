import { ComplianceViolation } from "../types/rules";
import { OpenAIProvider } from "../ai/openAIProvider";

export async function generateGovernanceResponse(
  question: string,
  violations: ComplianceViolation[]
): Promise<string> {
  const provider = new OpenAIProvider();

  const findings = violations
    .slice(0, 20)
    .map(
      (v) =>
        `[${v.severity}] ${v.fileName}: ${v.message}`
    )
    .join("\n");

  const prompt = `
You are Compliance Shield Governance Copilot.

A developer is asking:

"${question}"

Repository findings:
${findings}

Provide:
- concise explanation
- business/security impact
- remediation guidance
- prioritization advice

Keep response concise and professional.
`;

  try {
    const response =
      await provider.generateRemediation({
        violationType: "governance-copilot",
        severity: "high",
        indicator: "copilot",
        message: prompt
      });

    return response;
  } catch {
    return "Governance Copilot could not generate a response.";
  }
}