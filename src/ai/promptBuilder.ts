import { AIRemediationRequest } from "./aiProvider";

export function buildRemediationPrompt(
  input: AIRemediationRequest
): string {
  return `
You are an expert DevSecOps and compliance reviewer.

Analyze the provided compliance violation information.

Provide:
1. Security/compliance risk explanation
2. Business impact
3. Recommended remediation
4. Suggested best practices

Violation Details:
- Type: ${input.violationType}
- Severity: ${input.severity}
- Indicator: ${input.indicator ?? "N/A"}

Details:
${input.message}

Keep the response concise, developer-friendly, and actionable.
`;
}