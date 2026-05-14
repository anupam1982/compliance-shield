import { AIRemediationRequest } from "./aiProvider";

export function buildRemediationPrompt(input: AIRemediationRequest): string {
  return `
You are a security remediation assistant for a GitHub compliance scanner.

Explain the issue clearly and provide safe remediation steps.

Violation:
- Type: ${input.violationType}
- Severity: ${input.severity}
- Indicator: ${input.indicator ?? "N/A"}
- Message: ${input.message}

Return a concise developer-friendly response with:
1. Risk
2. Why it matters
3. Recommended fix
`;
}