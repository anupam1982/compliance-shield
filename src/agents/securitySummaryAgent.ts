import { ComplianceViolation } from "../types/rules";
import { OpenAIProvider } from "../ai/openAIProvider";
import { MockAIProvider } from "../ai/mockAIProvider";

function getProvider() {
  if (process.env.AI_ENABLED === "true" && process.env.OPENAI_API_KEY) {
    return new OpenAIProvider();
  }

  return new MockAIProvider();
}

export async function generateSecuritySummary(
  violations: ComplianceViolation[]
): Promise<string> {
  if (violations.length === 0) {
    return "No significant compliance or security concerns were identified.";
  }

  const provider = getProvider();

  const summaryInput = {
    violationType: "repository-summary",
    severity: "mixed",
    message: violations
      .map(
        (violation) =>
          `${violation.severity}: ${violation.message}`
      )
      .join("\n")
  };

  return provider.generateRemediation(summaryInput);
}