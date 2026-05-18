import { ComplianceViolation } from "../types/rules";
import { OpenAIProvider } from "../ai/openAIProvider";

export interface AutofixSuggestion {
  fileName: string;
  severity: string;
  problem: string;
  suggestion: string;
}

export async function generateAutofixSuggestions(
  violations: ComplianceViolation[]
): Promise<AutofixSuggestion[]> {
  const provider = new OpenAIProvider();

  const topViolations = violations.slice(0, 5);

  const suggestions: AutofixSuggestion[] = [];

  for (const violation of topViolations) {
    const prompt = `
You are a senior security engineer.

Generate a secure remediation example for:

Severity: ${violation.severity}
File: ${violation.fileName}
Issue: ${violation.message}

Provide:
1. secure replacement code
2. explanation
3. best practices

Keep response concise.
`;

    try {
      const response =
        await provider.generateRemediation({
          violationType: "autofix",
          severity: violation.severity,
          indicator:
            violation.indicator ?? "security-issue",
          message: prompt
        });

      suggestions.push({
        fileName: violation.fileName,
        severity: violation.severity,
        problem: violation.message,
        suggestion: response
      });
    } catch {
      suggestions.push({
        fileName: violation.fileName,
        severity: violation.severity,
        problem: violation.message,
        suggestion:
          "AI remediation unavailable."
      });
    }
  }

  return suggestions;
}